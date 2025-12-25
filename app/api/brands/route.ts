import { NextResponse } from "next/server";
import { FieldValue, adminDb, adminStorageBucket } from "@/lib/firebaseAdmin";
import { getUid } from "@/lib/requestAuth";

export const runtime = "nodejs";

const VEHICLE_TYPES = [
  "two-wheeler",
  "four-wheeler",
  "two-wheeler electric",
  "four-wheeler electric",
] as const;

type VehicleType = (typeof VEHICLE_TYPES)[number];

function asVehicleType(value: unknown): VehicleType | null {
  return typeof value === "string" && (VEHICLE_TYPES as readonly string[]).includes(value)
    ? (value as VehicleType)
    : null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function GET(request: Request) {
  const auth = await getUid(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const source = url.searchParams.get("source") ?? "";
  const category = url.searchParams.get("category") ?? "";

  if (source !== "brands" && source !== "vehicleBrands") {
    return NextResponse.json({ ok: false, message: "Invalid source." }, { status: 400 });
  }

  try {
    if (source === "brands") {
      let query = adminDb.collection("brands").where("status", "==", "ACTIVE");
      if (category) query = query.where("category", "==", category);

      const snap = await query.get();
      const brands = snap.docs
        .map((doc) => ({ id: doc.id, ...(doc.data() ?? {}) }))
        .map((raw) => {
          const obj = raw as Record<string, unknown>;
          const name = isNonEmptyString(obj.name) ? obj.name.trim() : "";
          const logoUrl = isNonEmptyString(obj.logoUrl) ? obj.logoUrl.trim() : "";
          const brandCategory = isNonEmptyString(obj.category) ? obj.category.trim() : "";
          const status = isNonEmptyString(obj.status) ? obj.status.trim() : "";

          return {
            id: isNonEmptyString(obj.id) ? obj.id : "",
            name,
            ...(logoUrl ? { logoUrl } : {}),
            ...(brandCategory ? { category: brandCategory } : {}),
            ...(status ? { status } : {}),
          };
        })
        .filter((b) => Boolean(b.id) && Boolean(b.name));

      return NextResponse.json({ ok: true, brands }, { status: 200 });
    }

    const snap = await adminDb.collection("vehicleBrands").where("isActive", "==", true).get();
    const brands = snap.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() ?? {}) }))
      .map((raw) => {
        const obj = raw as Record<string, unknown>;
        const name = isNonEmptyString(obj.name) ? obj.name.trim() : "";
        const logoUrl = isNonEmptyString(obj.logoUrl) ? obj.logoUrl.trim() : "";
        const vehicleType = asVehicleType(obj.vehicleType) ?? asVehicleType(obj.category);

        return {
          id: isNonEmptyString(obj.id) ? obj.id : "",
          name,
          ...(logoUrl ? { logoUrl } : {}),
          ...(vehicleType ? { vehicleType } : {}),
        };
      })
      .filter((b) => Boolean(b.id) && Boolean(b.name));

    return NextResponse.json({ ok: true, brands }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, message: "Failed to load brands." }, { status: 500 });
  }
}

function normalizeSuggestionContext(value: unknown) {
  if (!value || typeof value !== "object") return {};
  const obj = value as Record<string, unknown>;

  const businessCategory = isNonEmptyString(obj.businessCategory) ? obj.businessCategory.trim() : "";
  const shopType = isNonEmptyString(obj.shopType) ? obj.shopType.trim() : "";
  const source = isNonEmptyString(obj.source) ? obj.source.trim() : "";

  return {
    ...(businessCategory ? { businessCategory } : {}),
    ...(shopType ? { shopType } : {}),
    ...(source ? { source } : {}),
  };
}

async function uploadBrandSuggestionLogo(params: { uid: string; file: File }) {
  const { uid, file } = params;
  const buffer = Buffer.from(await file.arrayBuffer());

  const safeName = (file.name || "logo")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120);
  const objectPath = `brandSuggestionLogos/${uid}/${Date.now()}_${safeName}`;

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

function normalizeLogoUrl(value: unknown) {
  if (!isNonEmptyString(value)) return "";
  const raw = value.trim();
  try {
    const parsed = new URL(raw);
    return parsed.toString();
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  const auth = await getUid(request);
  if (!auth.ok) return auth.response;

  const contentType = request.headers.get("content-type") ?? "";

  const parsed = await (async () => {
    if (contentType.includes("application/json")) {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return { ok: false as const, response: NextResponse.json({ ok: false, message: "Invalid request body." }, { status: 400 }) };
      }

      if (!body || typeof body !== "object") {
        return { ok: false as const, response: NextResponse.json({ ok: false, message: "Invalid request body." }, { status: 400 }) };
      }

      const obj = body as Record<string, unknown>;
      const name = isNonEmptyString(obj.name) ? obj.name.trim() : "";
      const logoUrl = normalizeLogoUrl(obj.logoUrl);

      return { ok: true as const, name, logoUrl, context: obj.context };
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return { ok: false as const, response: NextResponse.json({ ok: false, message: "Invalid form data." }, { status: 400 }) };
    }

    const name = String(form.get("name") ?? "").trim();
    const logo = form.get("logo");
    const contextRaw = form.get("context");
    const context = (() => {
      if (typeof contextRaw !== "string" || !contextRaw.trim()) return null;
      try {
        return JSON.parse(contextRaw);
      } catch {
        return null;
      }
    })();

    if (!(logo instanceof File)) {
      return { ok: true as const, name, logoUrl: "", logoFile: null as File | null, context };
    }

    return { ok: true as const, name, logoUrl: "", logoFile: logo, context };
  })();

  if (!parsed.ok) return parsed.response;

  const name = parsed.name.trim();
  if (!name) {
    return NextResponse.json({ ok: false, message: "Brand name is required." }, { status: 400 });
  }
  if (name.length > 80) {
    return NextResponse.json(
      { ok: false, message: "Brand name must be 80 characters or less." },
      { status: 400 }
    );
  }

  let logoUrl = parsed.logoUrl;
  const logoFile = "logoFile" in parsed ? parsed.logoFile : null;

  if (!logoUrl && logoFile instanceof File) {
    const maxBytes = 2 * 1024 * 1024;
    if (logoFile.size > maxBytes) {
      return NextResponse.json(
        { ok: false, message: "Logo must be under 2MB." },
        { status: 400 }
      );
    }
    if (!logoFile.type.startsWith("image/")) {
      return NextResponse.json(
        { ok: false, message: "Logo must be an image." },
        { status: 400 }
      );
    }

    try {
      const upload = await uploadBrandSuggestionLogo({ uid: auth.uid, file: logoFile });
      logoUrl = upload.publicUrl;
    } catch {
      return NextResponse.json(
        { ok: false, message: "Failed to upload logo. Please try again." },
        { status: 500 }
      );
    }
  }

  if (!logoUrl) {
    return NextResponse.json({ ok: false, message: "Brand logo is required." }, { status: 400 });
  }

  try {
    await adminDb.collection("brandSuggestions").add({
      name,
      logoUrl,
      userId: auth.uid,
      createdAt: FieldValue.serverTimestamp(),
      ...normalizeSuggestionContext(parsed.context),
    });

    return NextResponse.json(
      { ok: true, message: "Suggestion received.", logoUrl },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { ok: false, message: "Failed to submit suggestion. Please try again." },
      { status: 500 }
    );
  }
}
