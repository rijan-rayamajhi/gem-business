import { NextResponse } from "next/server";
import { FieldValue, adminDb } from "@/lib/firebaseAdmin";
import { getUid } from "@/lib/requestAuth";

export const runtime = "nodejs";

type EventStatus = "draft" | "pending" | "rejected" | "verified";

function asEventStatus(value: unknown): EventStatus | null {
  return value === "draft" || value === "pending" || value === "rejected" || value === "verified"
    ? value
    : null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isLockedEventStatus(status: unknown) {
  const s = asEventStatus(status);
  return s === "pending" || s === "verified";
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getUid(request);
  if (!auth.ok) return auth.response;

  const uid = auth.uid;

  const params = await context.params;
  const id = isNonEmptyString(params?.id) ? params.id.trim() : "";

  if (!id) {
    return NextResponse.json({ ok: false, message: "Missing event id." }, { status: 400 });
  }

  try {
    const docRef = adminDb.collection("events").doc(id);
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json({ ok: false, message: "Event not found." }, { status: 404 });
    }

    const data = (snap.data() ?? {}) as Record<string, unknown>;
    const userId = typeof data.userId === "string" ? data.userId : "";

    if (!userId || userId !== uid) {
      return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
    }

    return NextResponse.json({ ok: true, item: { id: snap.id, ...data } }, { status: 200 });
  } catch (err) {
    console.error("/api/events/[id] GET failed", err);
    return NextResponse.json({ ok: false, message: "Failed to load event." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getUid(request);
  if (!auth.ok) return auth.response;

  const uid = auth.uid;

  const params = await context.params;
  const id = isNonEmptyString(params?.id) ? params.id.trim() : "";

  if (!id) {
    return NextResponse.json({ ok: false, message: "Missing event id." }, { status: 400 });
  }

  try {
    const docRef = adminDb.collection("events").doc(id);
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json({ ok: false, message: "Event not found." }, { status: 404 });
    }

    const existing = (snap.data() ?? {}) as Record<string, unknown>;
    const userId = typeof existing.userId === "string" ? existing.userId : "";

    if (!userId || userId !== uid) {
      return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
    }

    if (isLockedEventStatus(existing.status)) {
      return NextResponse.json(
        { ok: false, message: "Event cannot be deleted while pending or verified." },
        { status: 409 }
      );
    }

    await docRef.delete();
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("/api/events/[id] DELETE failed", err);
    return NextResponse.json({ ok: false, message: "Failed to delete event." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getUid(request);
  if (!auth.ok) return auth.response;

  const uid = auth.uid;

  const params = await context.params;
  const id = isNonEmptyString(params?.id) ? params.id.trim() : "";

  if (!id) {
    return NextResponse.json({ ok: false, message: "Missing event id." }, { status: 400 });
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
  const nextStatus = asEventStatus(obj.status);

  if (!nextStatus) {
    return NextResponse.json({ ok: false, message: "Invalid status." }, { status: 400 });
  }

  try {
    const docRef = adminDb.collection("events").doc(id);
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json({ ok: false, message: "Event not found." }, { status: 404 });
    }

    const existing = (snap.data() ?? {}) as Record<string, unknown>;
    const userId = typeof existing.userId === "string" ? existing.userId : "";

    if (!userId || userId !== uid) {
      return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
    }

    if (isLockedEventStatus(existing.status)) {
      return NextResponse.json(
        { ok: false, message: "Event cannot be updated while pending or verified." },
        { status: 409 }
      );
    }

    await docRef.set(
      {
        status: nextStatus,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("/api/events/[id] PATCH failed", err);
    return NextResponse.json({ ok: false, message: "Failed to update event." }, { status: 500 });
  }
}
