import { NextResponse } from "next/server";
import { FieldValue, adminAuth, adminDb, adminStorageBucket } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

type BusinessStatus = "draft" | "submitted" | "pending" | "verified" | "rejected";

type VerificationStatus = "pending" | "verified" | "rejected";

type KycStatus = "pending" | "verified" | "rejected";

async function getUid(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";

  if (!token) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, message: "Missing authentication token." },
        { status: 401 }
      ),
    };
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return { ok: true as const, uid: decoded.uid };
  } catch {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, message: "Invalid authentication token." },
        { status: 401 }
      ),
    };
  }
}

async function uploadVideoToStorage(params: { uid: string; file: File; folder: string }) {
  const { uid, file, folder } = params;
  const buffer = Buffer.from(await file.arrayBuffer());

  const safeName = (file.name || "video").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  const objectPath = `${folder}/${uid}/${Date.now()}_${safeName}`;

  const objectRef = adminStorageBucket.file(objectPath);
  await objectRef.save(buffer, {
    resumable: false,
    metadata: {
      contentType: file.type || "application/octet-stream",
      cacheControl: "public, max-age=31536000",
    },
  });

  await objectRef.makePublic();
  const publicUrl = objectRef.publicUrl();

  return { objectPath, publicUrl };
}

export async function GET(request: Request) {
  const auth = await getUid(request);
  if (!auth.ok) return auth.response;

  const kycSnap = await adminDb.collection("businessKyc").doc(auth.uid).get();
  if (!kycSnap.exists) {
    return NextResponse.json({ ok: true, kyc: null }, { status: 200 });
  }

  return NextResponse.json({ ok: true, kyc: kycSnap.data() ?? null }, { status: 200 });
}

export async function POST(request: Request) {
  const auth = await getUid(request);
  if (!auth.ok) return auth.response;

  const uid = auth.uid;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid form data." }, { status: 400 });
  }

  const scriptText = String(form.get("scriptText") ?? "").trim();
  const selfieVideo = form.get("selfieVideo");

  if (!(selfieVideo instanceof File)) {
    return NextResponse.json({ ok: false, message: "Self video is required." }, { status: 400 });
  }

  const maxBytes = 50 * 1024 * 1024;
  if (selfieVideo.size > maxBytes) {
    return NextResponse.json(
      { ok: false, message: "Self video must be under 50MB." },
      { status: 400 }
    );
  }

  if (!selfieVideo.type.startsWith("video/")) {
    return NextResponse.json(
      { ok: false, message: "Self video must be a video." },
      { status: 400 }
    );
  }

  const businessSnap = await adminDb.collection("business").doc(uid).get();
  if (!businessSnap.exists) {
    return NextResponse.json(
      { ok: false, message: "Business profile is missing." },
      { status: 400 }
    );
  }

  const businessData = businessSnap.data() ?? {};
  const existingStatusRaw = businessData.status as unknown;
  const existingStatus: BusinessStatus =
    existingStatusRaw === "draft" ||
    existingStatusRaw === "submitted" ||
    existingStatusRaw === "pending" ||
    existingStatusRaw === "verified" ||
    existingStatusRaw === "rejected"
      ? (existingStatusRaw as BusinessStatus)
      : "draft";

  if (existingStatus === "verified") {
    return NextResponse.json(
      { ok: false, message: "Business is already verified." },
      { status: 409 }
    );
  }

  if (existingStatus === "submitted" || existingStatus === "pending") {
    return NextResponse.json(
      { ok: false, message: "Business is already under review." },
      { status: 409 }
    );
  }

  if (existingStatus === "rejected") {
    return NextResponse.json(
      { ok: false, message: "Business is rejected. Please resubmit from registration." },
      { status: 400 }
    );
  }

  const businessType = typeof businessData.businessType === "string" ? businessData.businessType : "";
  const isOffline = businessType === "offline" || businessType === "both";

  const locationsSnap = await adminDb
    .collection("businessLocations")
    .where("businessId", "==", uid)
    .get();

  const locationDocs = locationsSnap.docs;
  const locationIds = locationDocs.map((doc) => doc.id);

  if (locationIds.length === 0) {
    return NextResponse.json(
      { ok: false, message: "Please add at least one business location." },
      { status: 400 }
    );
  }

  if (isOffline) {
    for (const locId of locationIds) {
      const video = form.get(`locationVideo_${locId}`);
      if (!(video instanceof File)) {
        return NextResponse.json(
          { ok: false, message: "Please upload shop proof video for each location." },
          { status: 400 }
        );
      }
      if (video.size > maxBytes) {
        return NextResponse.json(
          { ok: false, message: "Shop proof video must be under 50MB." },
          { status: 400 }
        );
      }
      if (!video.type.startsWith("video/")) {
        return NextResponse.json(
          { ok: false, message: "Shop proof must be a video." },
          { status: 400 }
        );
      }
    }
  }

  const selfieUpload = await uploadVideoToStorage({
    uid,
    file: selfieVideo,
    folder: "kyc/selfie",
  });

  const batch = adminDb.batch();

  const existingKycSnap = await adminDb.collection("businessKyc").doc(uid).get();

  const kycStatus: KycStatus = "pending";
  const kycRef = adminDb.collection("businessKyc").doc(uid);
  batch.set(
    kycRef,
    {
      businessId: uid,
      scriptText,
      status: kycStatus,
      selfieVideo: {
        url: selfieUpload.publicUrl,
        name: selfieVideo.name,
        type: selfieVideo.type,
        size: selfieVideo.size,
      },
      updatedAt: FieldValue.serverTimestamp(),
      ...(!existingKycSnap.exists ? { createdAt: FieldValue.serverTimestamp() } : {}),
    },
    { merge: true }
  );

  const locationVerificationStatus: VerificationStatus = "pending";

  for (const doc of locationDocs) {
    const locId = doc.id;
    const locRef = doc.ref;

    const update: Record<string, unknown> = {
      verificationStatus: locationVerificationStatus,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (isOffline) {
      const video = form.get(`locationVideo_${locId}`) as File;
      const upload = await uploadVideoToStorage({
        uid,
        file: video,
        folder: `kyc/location/${locId}`,
      });
      update.verificationVideo = {
        url: upload.publicUrl,
        name: video.name,
        type: video.type,
        size: video.size,
      };
    }

    batch.set(locRef, update, { merge: true });
  }

  const businessRef = adminDb.collection("business").doc(uid);
  const nextStatus: BusinessStatus = "submitted";
  batch.set(
    businessRef,
    {
      status: nextStatus,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await batch.commit();

  return NextResponse.json(
    { ok: true, message: "KYC submitted.", status: nextStatus },
    { status: 200 }
  );
}
