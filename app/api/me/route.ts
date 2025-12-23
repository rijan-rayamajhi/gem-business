import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { getUid } from "@/lib/requestAuth";

export const runtime = "nodejs";

type BusinessStatus = "draft" | "submitted" | "pending" | "verified" | "rejected";

function isBusinessStatus(value: unknown): value is BusinessStatus {
  return (
    value === "draft" ||
    value === "submitted" ||
    value === "pending" ||
    value === "verified" ||
    value === "rejected"
  );
}

export async function GET(request: Request) {
  const auth = await getUid(request);
  if (!auth.ok) return auth.response;

  const uid = auth.uid;

  const businessSnap = await adminDb.collection("business").doc(uid).get();
  const statusRaw = businessSnap.exists ? (businessSnap.data()?.status as unknown) : null;
  const businessStatus: BusinessStatus | null = isBusinessStatus(statusRaw)
    ? statusRaw
    : businessSnap.exists
      ? "submitted"
      : null;

  const hasBusiness =
    businessStatus === "submitted" ||
    businessStatus === "pending" ||
    businessStatus === "verified";

  return NextResponse.json(
    { ok: true, uid, hasBusiness, businessStatus },
    { status: 200 }
  );
}
