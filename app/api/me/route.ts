import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

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
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";

  if (!token) {
    return NextResponse.json(
      { ok: false, message: "Missing authentication token." },
      { status: 401 }
    );
  }

  let uid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid authentication token." },
      { status: 401 }
    );
  }

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
