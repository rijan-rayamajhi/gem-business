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

 function asNonEmptyString(value: unknown) {
   return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
 }

 function dateToMs(value: unknown): number | null {
   if (!value) return null;

   if (value instanceof Date) {
     const ms = value.getTime();
     return Number.isFinite(ms) ? ms : null;
   }

   if (typeof value === "string") {
     const ms = new Date(value).getTime();
     return Number.isFinite(ms) ? ms : null;
   }

   if (typeof value === "number") {
     return Number.isFinite(value) ? value : null;
   }

   if (typeof value === "object") {
     const obj = value as Record<string, unknown>;

     const maybeToDate = obj && (obj as { toDate?: unknown }).toDate;
     if (typeof maybeToDate === "function") {
       try {
         const d = (maybeToDate as () => Date)();
         const ms = d.getTime();
         return Number.isFinite(ms) ? ms : null;
       } catch {
         return null;
       }
     }

     const seconds = typeof obj.seconds === "number" ? obj.seconds : NaN;
     const nanos = typeof obj.nanoseconds === "number" ? obj.nanoseconds : NaN;
     if (Number.isFinite(seconds)) {
       const ms = seconds * 1000 + (Number.isFinite(nanos) ? Math.floor(nanos / 1e6) : 0);
       return Number.isFinite(ms) ? ms : null;
     }
   }

   return null;
 }

 function pickActiveFlashSale(
   docs: Array<{ id: string; data: Record<string, unknown> }>
 ): { id: string; data: Record<string, unknown> } | null {
   const now = Date.now();

   const candidates = docs.filter((d) => {
     const status = asNonEmptyString(d.data.status).toLowerCase();
     if (status !== "active") return false;

     const campaign =
       d.data.campaign && typeof d.data.campaign === "object"
         ? (d.data.campaign as Record<string, unknown>)
         : null;
     const startsAtMs = dateToMs(campaign?.startsAt);
     const endsAtMs = dateToMs(campaign?.endsAt);

     if (startsAtMs === null || endsAtMs === null) return false;
     return now >= startsAtMs && now <= endsAtMs;
   });

   if (!candidates.length) return null;

   candidates.sort((a, b) => {
     const aCampaign =
       a.data.campaign && typeof a.data.campaign === "object"
         ? (a.data.campaign as Record<string, unknown>)
         : null;
     const bCampaign =
       b.data.campaign && typeof b.data.campaign === "object"
         ? (b.data.campaign as Record<string, unknown>)
         : null;

     const aStart = dateToMs(aCampaign?.startsAt) ?? 0;
     const bStart = dateToMs(bCampaign?.startsAt) ?? 0;
     return bStart - aStart;
   });

   return candidates[0] ?? null;
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

  try {
    const flashSnap = await adminDb.collection("flashSale").get();
    const flashDocs = flashSnap.docs.map((d) => ({
      id: d.id,
      data: (d.data() ?? {}) as Record<string, unknown>,
    }));

    const active = pickActiveFlashSale(flashDocs);
    if (active) {
      const businessObj =
        active.data.business && typeof active.data.business === "object"
          ? (active.data.business as Record<string, unknown>)
          : null;

      const cutoffAtMs =
        dateToMs(businessObj?.cutoffAt) ??
        dateToMs(active.data.cutoffAt);

      if (cutoffAtMs !== null && Date.now() > cutoffAtMs) {
        return NextResponse.json(
          { ok: false, message: "Catalogue cannot be added after the flash sale cutoff." },
          { status: 403 }
        );
      }
    }
  } catch (err) {
    console.error("/api/catalogue POST flash sale cutoff check failed", err);
  }

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
