import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

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

  const userSnap = await adminDb.collection("users").doc(uid).get();
  const hasBusiness = Boolean(userSnap.exists && userSnap.data()?.hasBusiness);

  return NextResponse.json({ ok: true, uid, hasBusiness }, { status: 200 });
}
