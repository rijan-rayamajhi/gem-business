import { NextResponse } from "next/server";
import { FieldValue, adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidUrl(value: string) {
  try {
    const parsed = new URL(value);
    void parsed;
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
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

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid form data." },
      { status: 400 }
    );
  }

  const businessName = String(form.get("businessName") ?? "").trim();
  const businessDescription = String(
    form.get("businessDescription") ?? ""
  ).trim();
  const businessType = String(form.get("businessType") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const website = String(form.get("website") ?? "").trim();
  const businessRole = String(form.get("businessRole") ?? "").trim();
  const name = String(form.get("name") ?? "").trim();
  const contactNo = String(form.get("contactNo") ?? "").trim();
  const whatsappNo = String(form.get("whatsappNo") ?? "").trim();
  const businessLogo = form.get("businessLogo");

  if (!businessName) {
    return NextResponse.json(
      { ok: false, message: "Business name is required." },
      { status: 400 }
    );
  }

  if (!businessDescription) {
    return NextResponse.json(
      { ok: false, message: "Business description is required." },
      { status: 400 }
    );
  }

  if (!businessType || !["online", "offline", "both"].includes(businessType)) {
    return NextResponse.json(
      { ok: false, message: "Business type must be online, offline, or both." },
      { status: 400 }
    );
  }

  if (!email || !isValidEmail(email)) {
    return NextResponse.json(
      { ok: false, message: "A valid email is required." },
      { status: 400 }
    );
  }

  if (website && !isValidUrl(website)) {
    return NextResponse.json(
      { ok: false, message: "Please provide a valid website URL." },
      { status: 400 }
    );
  }

  if (!businessRole || !["owner", "manager", "employee"].includes(businessRole)) {
    return NextResponse.json(
      { ok: false, message: "Business role must be owner, manager, or employee." },
      { status: 400 }
    );
  }

  if (!name) {
    return NextResponse.json(
      { ok: false, message: "Name is required." },
      { status: 400 }
    );
  }

  if (!contactNo) {
    return NextResponse.json(
      { ok: false, message: "Contact number is required." },
      { status: 400 }
    );
  }

  if (!whatsappNo) {
    return NextResponse.json(
      { ok: false, message: "WhatsApp number is required." },
      { status: 400 }
    );
  }

  if (businessLogo instanceof File) {
    const maxBytes = 5 * 1024 * 1024;
    if (businessLogo.size > maxBytes) {
      return NextResponse.json(
        { ok: false, message: "Business logo must be under 5MB." },
        { status: 400 }
      );
    }
    if (!businessLogo.type.startsWith("image/")) {
      return NextResponse.json(
        { ok: false, message: "Business logo must be an image." },
        { status: 400 }
      );
    }
  }

  const userRef = adminDb.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    return NextResponse.json(
      { ok: false, message: "User profile not found." },
      { status: 400 }
    );
  }

  const businessRef = adminDb.collection("business").doc(uid);
  const existingBusiness = await businessRef.get();
  if (existingBusiness.exists) {
    return NextResponse.json(
      { ok: false, message: "Business already registered for this user." },
      { status: 409 }
    );
  }

  await businessRef.set({
    user_id: uid,
    businessName,
    businessDescription,
    businessType,
    email,
    website,
    businessRole,
    name,
    contactNo,
    whatsappNo,
    businessLogo: businessLogo instanceof File
      ? {
          name: businessLogo.name,
          type: businessLogo.type,
          size: businessLogo.size,
        }
      : null,
    createdAt: FieldValue.serverTimestamp(),
  });

  await userRef.set({ hasBusiness: true }, { merge: true });

  return NextResponse.json(
    {
      ok: true,
      message: "Business registration saved.",
    },
    { status: 200 }
  );
}
