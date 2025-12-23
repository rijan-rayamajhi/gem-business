import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";

type AuthOk = { ok: true; uid: string };

type AuthError = { ok: false; response: NextResponse };

type AuthResult = AuthOk | AuthError;

function isDevBypassEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.DEV_BYPASS_AUTH === "1";
}

export async function getUid(request: Request): Promise<AuthResult> {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";

  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, message: "Missing authentication token." }, { status: 401 }),
    };
  }

  if (isDevBypassEnabled() && token === "dev") {
    const uid = (process.env.DEV_BYPASS_UID || "dev_uid").trim() || "dev_uid";
    return { ok: true, uid };
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return { ok: true, uid: decoded.uid };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, message: "Invalid authentication token." }, { status: 401 }),
    };
  }
}
