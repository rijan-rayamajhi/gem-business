import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { getUid } from "@/lib/requestAuth";

export const runtime = "nodejs";

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

export async function GET(request: Request) {
  const auth = await getUid(request);
  if (!auth.ok) return auth.response;

  try {
    const snap = await adminDb.collection("flashSale").get();
    const docs = snap.docs.map((d) => ({ id: d.id, data: (d.data() ?? {}) as Record<string, unknown> }));

    const active = pickActiveFlashSale(docs);
    if (!active) {
      return NextResponse.json({ ok: true, item: null }, { status: 200 });
    }

    return NextResponse.json({ ok: true, item: { id: active.id, ...active.data } }, { status: 200 });
  } catch (err) {
    console.error("/api/flash-sale GET failed", err);
    return NextResponse.json({ ok: false, message: "Failed to load flash sale." }, { status: 500 });
  }
}
