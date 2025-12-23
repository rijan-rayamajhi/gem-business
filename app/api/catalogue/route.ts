import { NextResponse } from "next/server";
import { FieldValue, adminDb, adminStorageBucket } from "@/lib/firebaseAdmin";
import { getUid } from "@/lib/requestAuth";

export const runtime = "nodejs";

type CatalogueStatus = "draft" | "pending" | "rejected" | "verified";

function asCatalogueStatus(value: unknown): CatalogueStatus | null {
  return value === "draft" || value === "pending" || value === "rejected" || value === "verified"
    ? value
    : null;
}

async function uploadImageToStorage(params: {
  uid: string;
  file: File;
  folder: string;
}) {
  const { uid, file, folder } = params;
  const buffer = Buffer.from(await file.arrayBuffer());

  const safeName = (file.name || "image")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120);
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

  const uid = auth.uid;

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");
  const statusFilter = asCatalogueStatus(statusParam) ?? null;

  try {
    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = adminDb
      .collection("catalogue")
      .where("userId", "==", uid);

    if (statusFilter) query = query.where("status", "==", statusFilter);

    try {
      const orderedSnap = await query.orderBy("createdAt", "desc").get();
      const catalogue = orderedSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() ?? {}) }));
      return NextResponse.json({ ok: true, catalogue }, { status: 200 });
    } catch (err) {
      const fallbackSnap = await query.get();
      const catalogue = fallbackSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() ?? {}) }));
      console.error("/api/catalogue GET ordered query failed; returned unordered fallback", err);
      return NextResponse.json({ ok: true, catalogue }, { status: 200 });
    }
  } catch (err) {
    console.error("/api/catalogue GET failed", err);
    return NextResponse.json({ ok: false, message: "Failed to load catalogue." }, { status: 500 });
  }
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

  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const offerDetails = String(form.get("offerDetails") ?? "").trim();

  if (!title) {
    return NextResponse.json({ ok: false, message: "Title is required." }, { status: 400 });
  }

  if (!description) {
    return NextResponse.json(
      { ok: false, message: "Description is required." },
      { status: 400 }
    );
  }

  if (!offerDetails) {
    return NextResponse.json(
      { ok: false, message: "Offer details is required." },
      { status: 400 }
    );
  }

  const images = form
    .getAll("images")
    .filter((value): value is File => value instanceof File);

  if (images.length < 1) {
    return NextResponse.json(
      { ok: false, message: "Please add at least 1 image." },
      { status: 400 }
    );
  }

  if (images.length > 5) {
    return NextResponse.json(
      { ok: false, message: "You can upload maximum 5 images." },
      { status: 400 }
    );
  }

  for (const image of images) {
    const maxBytes = 5 * 1024 * 1024;
    if (image.size > maxBytes) {
      return NextResponse.json(
        { ok: false, message: "Each image must be under 5MB." },
        { status: 400 }
      );
    }
    if (!image.type.startsWith("image/")) {
      return NextResponse.json(
        { ok: false, message: "All uploads must be images." },
        { status: 400 }
      );
    }
  }

  const imageUploads: string[] = [];
  for (const image of images) {
    const upload = await uploadImageToStorage({ uid, file: image, folder: "catalogueImages" });
    imageUploads.push(upload.publicUrl);
  }

  const status: CatalogueStatus = "draft";

  const docRef = await adminDb.collection("catalogue").add({
    userId: uid,
    title,
    description,
    offerDetails,
    imageUrls: imageUploads,
    status,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json(
    { ok: true, id: docRef.id, status, message: "Catalogue draft saved." },
    { status: 200 }
  );
}
