import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
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
