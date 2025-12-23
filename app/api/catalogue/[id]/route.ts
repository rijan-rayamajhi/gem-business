import { NextResponse } from "next/server";
import { FieldValue, adminDb } from "@/lib/firebaseAdmin";
import { getUid } from "@/lib/requestAuth";

export const runtime = "nodejs";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

type CatalogueStatus = "draft" | "pending" | "rejected" | "verified";

function asCatalogueStatus(value: unknown): CatalogueStatus | null {
  return value === "draft" || value === "pending" || value === "rejected" || value === "verified"
    ? value
    : null;
}

function isLockedCatalogueStatus(status: unknown) {
  const s = asCatalogueStatus(status);
  return s === "pending" || s === "verified";
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getUid(request);
  if (!auth.ok) return auth.response;

  const uid = auth.uid;

  const params = await context.params;
  const id = isNonEmptyString(params?.id) ? params.id.trim() : "";

  if (!id) {
    return NextResponse.json({ ok: false, message: "Missing catalogue id." }, { status: 400 });
  }

  try {
    const docRef = adminDb.collection("catalogue").doc(id);
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json(
        { ok: false, message: "Catalogue not found." },
        { status: 404 }
      );
    }

    const data = (snap.data() ?? {}) as Record<string, unknown>;
    const userId = typeof data.userId === "string" ? data.userId : "";

    if (!userId || userId !== uid) {
      return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
    }

    return NextResponse.json({ ok: true, item: { id: snap.id, ...data } }, { status: 200 });
  } catch (err) {
    console.error("/api/catalogue/[id] GET failed", err);
    return NextResponse.json(
      { ok: false, message: "Failed to load catalogue." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getUid(request);
  if (!auth.ok) return auth.response;

  const uid = auth.uid;

  const params = await context.params;
  const id = isNonEmptyString(params?.id) ? params.id.trim() : "";

  if (!id) {
    return NextResponse.json({ ok: false, message: "Missing catalogue id." }, { status: 400 });
  }

  try {
    const docRef = adminDb.collection("catalogue").doc(id);
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json({ ok: false, message: "Catalogue not found." }, { status: 404 });
    }

    const existing = (snap.data() ?? {}) as Record<string, unknown>;
    const userId = typeof existing.userId === "string" ? existing.userId : "";

    if (!userId || userId !== uid) {
      return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
    }

    if (isLockedCatalogueStatus(existing.status)) {
      return NextResponse.json(
        { ok: false, message: "Catalogue cannot be deleted while pending or verified." },
        { status: 409 }
      );
    }

    await docRef.delete();
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("/api/catalogue/[id] DELETE failed", err);
    return NextResponse.json(
      { ok: false, message: "Failed to delete catalogue." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getUid(request);
  if (!auth.ok) return auth.response;

  const uid = auth.uid;

  const params = await context.params;
  const id = isNonEmptyString(params?.id) ? params.id.trim() : "";

  if (!id) {
    return NextResponse.json({ ok: false, message: "Missing catalogue id." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Invalid request body." }, { status: 400 });
  }

  const obj = body as Record<string, unknown>;
  const title = typeof obj.title === "string" ? obj.title.trim() : "";
  const description = typeof obj.description === "string" ? obj.description.trim() : "";
  const offerDetails = typeof obj.offerDetails === "string" ? obj.offerDetails : "";
  const status = asCatalogueStatus(obj.status);

  try {
    const docRef = adminDb.collection("catalogue").doc(id);
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json({ ok: false, message: "Catalogue not found." }, { status: 404 });
    }

    const existing = (snap.data() ?? {}) as Record<string, unknown>;
    const userId = typeof existing.userId === "string" ? existing.userId : "";

    if (!userId || userId !== uid) {
      return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
    }

    if (isLockedCatalogueStatus(existing.status)) {
      return NextResponse.json(
        { ok: false, message: "Catalogue cannot be edited while pending or verified." },
        { status: 409 }
      );
    }

    const update: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if ("title" in obj) update.title = title;
    if ("description" in obj) update.description = description;
    if ("offerDetails" in obj) update.offerDetails = offerDetails;
    if ("status" in obj) {
      if (!status) {
        return NextResponse.json({ ok: false, message: "Invalid status." }, { status: 400 });
      }
      update.status = status;
    }

    await docRef.set(update, { merge: true });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("/api/catalogue/[id] PATCH failed", err);
    return NextResponse.json(
      { ok: false, message: "Failed to update catalogue." },
      { status: 500 }
    );
  }
}
