import { NextResponse } from "next/server";
import { FieldValue, adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

type BusinessStatus = "draft" | "submitted" | "pending" | "verified" | "rejected";

const BUSINESS_CATEGORIES = [
  "Battery Shop",
  "Key Maker Shop",
  "Lubricants Shop",
  "Machanic Shop",
  "Puncture Shop",
  "Spare parts shop",
  "Towing Van",
  "Tyre Shop",
  "Others",
] as const;

type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number];

const VEHICLE_CATEGORIES = new Set<BusinessCategory>([
  "Key Maker Shop",
  "Puncture Shop",
  "Towing Van",
  "Others",
]);

const VEHICLE_TYPES = [
  "two-wheeler",
  "four-wheeler",
  "two-wheeler electric",
  "four-wheeler electric",
] as const;

const SHOP_TYPES = ["authorised shop", "local shop"] as const;

const BRANDS = [
  { id: "amaron", name: "Amaron" },
  { id: "exide", name: "Exide" },
  { id: "bosch", name: "Bosch" },
  { id: "castrol", name: "Castrol" },
  { id: "mobil", name: "Mobil" },
  { id: "shell", name: "Shell" },
  { id: "bridgestone", name: "Bridgestone" },
  { id: "michelin", name: "Michelin" },
  { id: "mrf", name: "MRF" },
  { id: "ceat", name: "CEAT" },
  { id: "goodyear", name: "Goodyear" },
  { id: "others", name: "Other" },
] as const;

function isBusinessStatus(value: unknown): value is BusinessStatus {
  return (
    value === "draft" ||
    value === "submitted" ||
    value === "pending" ||
    value === "verified" ||
    value === "rejected"
  );
}

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

type BusinessLocation = {
  id: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  landmark: string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeBusinessLocations(value: unknown): BusinessLocation[] {
  if (!Array.isArray(value)) return [];

  const locations: BusinessLocation[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;

    const id = isNonEmptyString(obj.id) ? obj.id.trim() : "";
    const addressLine1 = typeof obj.addressLine1 === "string" ? obj.addressLine1.trim() : "";
    const addressLine2 = typeof obj.addressLine2 === "string" ? obj.addressLine2.trim() : "";
    const city = typeof obj.city === "string" ? obj.city.trim() : "";
    const state = typeof obj.state === "string" ? obj.state.trim() : "";
    const pincode = typeof obj.pincode === "string" ? obj.pincode.trim() : "";
    const landmark = typeof obj.landmark === "string" ? obj.landmark.trim() : "";

    if (!id) continue;

    locations.push({
      id,
      addressLine1,
      addressLine2,
      city,
      state,
      pincode,
      landmark,
    });
  }

  return locations;
}

async function getUid(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";

  if (!token) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, message: "Missing authentication token." },
        { status: 401 }
      ),
    };
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return { ok: true as const, uid: decoded.uid };
  } catch {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, message: "Invalid authentication token." },
        { status: 401 }
      ),
    };
  }
}

export async function GET(request: Request) {
  const auth = await getUid(request);
  if (!auth.ok) return auth.response;

  const uid = auth.uid;
  const businessSnap = await adminDb.collection("business").doc(uid).get();

  if (!businessSnap.exists) {
    return NextResponse.json({ ok: true, uid, business: null }, { status: 200 });
  }

  const data = businessSnap.data() ?? {};
  const status = isBusinessStatus(data.status) ? data.status : "draft";

  return NextResponse.json(
    {
      ok: true,
      uid,
      business: {
        status,
        businessName: typeof data.businessName === "string" ? data.businessName : "",
        businessDescription:
          typeof data.businessDescription === "string" ? data.businessDescription : "",
        businessCategory:
          typeof data.businessCategory === "string" ? data.businessCategory : "",
        otherCategoryName:
          typeof data.otherCategoryName === "string" ? data.otherCategoryName : "",
        vehicleTypes: Array.isArray(data.vehicleTypes)
          ? (data.vehicleTypes.filter((value: unknown) => typeof value === "string") as string[])
          : [],
        shopType: typeof data.shopType === "string" ? data.shopType : "",
        brands: Array.isArray(data.brands)
          ? (data.brands.filter((value: unknown) => typeof value === "string") as string[])
          : [],
        businessType: typeof data.businessType === "string" ? data.businessType : "",
        email: typeof data.email === "string" ? data.email : "",
        website: typeof data.website === "string" ? data.website : "",
        businessRole: typeof data.businessRole === "string" ? data.businessRole : "",
        name: typeof data.name === "string" ? data.name : "",
        contactNo: typeof data.contactNo === "string" ? data.contactNo : "",
        whatsappNo: typeof data.whatsappNo === "string" ? data.whatsappNo : "",
        businessLogo: data.businessLogo ?? null,
        businessLocations: Array.isArray(data.businessLocations)
          ? (data.businessLocations as unknown[])
              .filter((value) => value && typeof value === "object")
              .map((value) => {
                const obj = value as Record<string, unknown>;
                return {
                  id: typeof obj.id === "string" ? obj.id : "",
                  addressLine1: typeof obj.addressLine1 === "string" ? obj.addressLine1 : "",
                  addressLine2: typeof obj.addressLine2 === "string" ? obj.addressLine2 : "",
                  city: typeof obj.city === "string" ? obj.city : "",
                  state: typeof obj.state === "string" ? obj.state : "",
                  pincode: typeof obj.pincode === "string" ? obj.pincode : "",
                  landmark: typeof obj.landmark === "string" ? obj.landmark : "",
                };
              })
          : [],
        primaryBusinessLocationId:
          typeof data.primaryBusinessLocationId === "string" ? data.primaryBusinessLocationId : "",
        primaryShopImage: data.primaryShopImage ?? null,
      },
    },
    { status: 200 }
  );
}

export async function POST(request: Request) {
  const auth = await getUid(request);
  if (!auth.ok) return auth.response;

  const uid = auth.uid;

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
  const businessDescription = String(form.get("businessDescription") ?? "").trim();
  const businessCategory = String(form.get("businessCategory") ?? "").trim();
  const otherCategoryName = String(form.get("otherCategoryName") ?? "").trim();
  const vehicleTypesRaw = form.getAll("vehicleTypes");
  const vehicleTypes = vehicleTypesRaw
    .map((value) => String(value).trim())
    .filter(Boolean);
  const shopType = String(form.get("shopType") ?? "").trim();
  const brandsRaw = form.getAll("brands");
  const brands = brandsRaw
    .map((value) => String(value).trim())
    .filter(Boolean);
  const businessType = String(form.get("businessType") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const website = String(form.get("website") ?? "").trim();
  const businessRole = String(form.get("businessRole") ?? "").trim();
  const name = String(form.get("name") ?? "").trim();
  const contactNo = String(form.get("contactNo") ?? "").trim();
  const whatsappNo = String(form.get("whatsappNo") ?? "").trim();
  const businessLogo = form.get("businessLogo");

  const businessLocationsRaw = form.get("businessLocations");
  const primaryBusinessLocationId = String(form.get("primaryBusinessLocationId") ?? "").trim();
  const shopImage = form.get("shopImage");
  const shopImageLocationId = String(form.get("shopImageLocationId") ?? "").trim();

  let businessLocations: BusinessLocation[] = [];
  if (typeof businessLocationsRaw === "string" && businessLocationsRaw.trim()) {
    try {
      businessLocations = normalizeBusinessLocations(JSON.parse(businessLocationsRaw));
    } catch {
      return NextResponse.json(
        { ok: false, message: "Invalid business locations." },
        { status: 400 }
      );
    }
  }

  if (businessType && !["online", "offline", "both"].includes(businessType)) {
    return NextResponse.json(
      { ok: false, message: "Business type must be online, offline, or both." },
      { status: 400 }
    );
  }

  if (email && !isValidEmail(email)) {
    return NextResponse.json(
      { ok: false, message: "Please enter a valid email." },
      { status: 400 }
    );
  }

  if (website && !isValidUrl(website)) {
    return NextResponse.json(
      { ok: false, message: "Please provide a valid website URL." },
      { status: 400 }
    );
  }

  if (businessRole && !["owner", "manager", "employee"].includes(businessRole)) {
    return NextResponse.json(
      { ok: false, message: "Business role must be owner, manager, or employee." },
      { status: 400 }
    );
  }

  if (businessCategory) {
    const isAllowedCategory = (BUSINESS_CATEGORIES as readonly string[]).includes(
      businessCategory
    );

    if (!isAllowedCategory) {
      return NextResponse.json(
        { ok: false, message: "Invalid business category." },
        { status: 400 }
      );
    }

    const needsVehicleTypes = VEHICLE_CATEGORIES.has(businessCategory as BusinessCategory);

    if (businessCategory === "Others" && !otherCategoryName) {
      return NextResponse.json(
        { ok: false, message: "Please enter category name." },
        { status: 400 }
      );
    }

    if (needsVehicleTypes && vehicleTypes.length === 0) {
      return NextResponse.json(
        { ok: false, message: "Please select at least one vehicle type." },
        { status: 400 }
      );
    }

    const allowedVehicleTypes = new Set<string>(VEHICLE_TYPES);
    for (const vehicleType of vehicleTypes) {
      if (!allowedVehicleTypes.has(vehicleType)) {
        return NextResponse.json(
          { ok: false, message: "Invalid vehicle type." },
          { status: 400 }
        );
      }
    }

    if (!needsVehicleTypes) {
      if (!shopType) {
        return NextResponse.json(
          { ok: false, message: "Please select your shop type." },
          { status: 400 }
        );
      }

      if (!(SHOP_TYPES as readonly string[]).includes(shopType)) {
        return NextResponse.json(
          { ok: false, message: "Invalid shop type." },
          { status: 400 }
        );
      }

      const allowedBrands = new Set<string>(BRANDS.map((b) => b.id));
      for (const brand of brands) {
        if (!allowedBrands.has(brand)) {
          return NextResponse.json(
            { ok: false, message: "Invalid brand selection." },
            { status: 400 }
          );
        }
      }

      if (shopType === "authorised shop") {
        if (brands.length !== 1) {
          return NextResponse.json(
            { ok: false, message: "Please select exactly one brand." },
            { status: 400 }
          );
        }
      }

      if (shopType === "local shop") {
        if (brands.length === 0) {
          return NextResponse.json(
            { ok: false, message: "Please select at least one brand." },
            { status: 400 }
          );
        }
        if (brands.length > 5) {
          return NextResponse.json(
            { ok: false, message: "You can select up to 5 brands." },
            { status: 400 }
          );
        }
      }
    }
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

  if (form.has("businessLocations")) {
    if (businessLocations.length === 0) {
      return NextResponse.json(
        { ok: false, message: "Please add at least one business location." },
        { status: 400 }
      );
    }
    for (const loc of businessLocations) {
      if (!loc.addressLine1) {
        return NextResponse.json(
          { ok: false, message: "Please enter address for each location." },
          { status: 400 }
        );
      }
      if (!loc.city) {
        return NextResponse.json(
          { ok: false, message: "Please enter city for each location." },
          { status: 400 }
        );
      }
      if (!loc.state) {
        return NextResponse.json(
          { ok: false, message: "Please enter state for each location." },
          { status: 400 }
        );
      }
      if (!loc.pincode) {
        return NextResponse.json(
          { ok: false, message: "Please enter pincode for each location." },
          { status: 400 }
        );
      }
    }

    if (!primaryBusinessLocationId) {
      return NextResponse.json(
        { ok: false, message: "Please select a primary location." },
        { status: 400 }
      );
    }

    if (!businessLocations.some((loc) => loc.id === primaryBusinessLocationId)) {
      return NextResponse.json(
        { ok: false, message: "Primary location is invalid." },
        { status: 400 }
      );
    }
  }

  if (shopImage instanceof File) {
    const maxBytes = 5 * 1024 * 1024;
    if (shopImage.size > maxBytes) {
      return NextResponse.json(
        { ok: false, message: "Shop image must be under 5MB." },
        { status: 400 }
      );
    }
    if (!shopImage.type.startsWith("image/")) {
      return NextResponse.json(
        { ok: false, message: "Shop image must be an image." },
        { status: 400 }
      );
    }
    if (!shopImageLocationId) {
      return NextResponse.json(
        { ok: false, message: "Shop image location is missing." },
        { status: 400 }
      );
    }
  }

  const businessRef = adminDb.collection("business").doc(uid);
  const existingBusiness = await businessRef.get();
  const existingStatusRaw = existingBusiness.exists
    ? (existingBusiness.data()?.status as unknown)
    : undefined;

  const nextStatus: BusinessStatus =
    isBusinessStatus(existingStatusRaw) && existingStatusRaw !== "draft"
      ? existingStatusRaw
      : "draft";

  const payload: Record<string, unknown> = {
    user_id: uid,
    status: nextStatus,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (!existingBusiness.exists) {
    payload.createdAt = FieldValue.serverTimestamp();
  }

  if (businessName) payload.businessName = businessName;
  if (businessDescription) payload.businessDescription = businessDescription;
  if (businessCategory) payload.businessCategory = businessCategory;
  if (form.has("otherCategoryName")) {
    payload.otherCategoryName = otherCategoryName;
  }
  if (form.has("vehicleTypes")) {
    payload.vehicleTypes = vehicleTypes;
  }
  if (form.has("shopType")) {
    payload.shopType = shopType;
  }
  if (form.has("brands")) {
    payload.brands = brands;
  }
  if (businessType) payload.businessType = businessType;
  if (email) payload.email = email.toLowerCase();
  if (website) payload.website = website;
  if (businessRole) payload.businessRole = businessRole;
  if (name) payload.name = name;
  if (contactNo) payload.contactNo = contactNo;
  if (whatsappNo) payload.whatsappNo = whatsappNo;
  if (businessLogo instanceof File) {
    payload.businessLogo = {
      name: businessLogo.name,
      type: businessLogo.type,
      size: businessLogo.size,
    };
  }

  if (form.has("businessLocations")) {
    payload.businessLocations = businessLocations;
    payload.primaryBusinessLocationId = primaryBusinessLocationId;
  }

  if (shopImage instanceof File) {
    payload.primaryShopImage = {
      name: shopImage.name,
      type: shopImage.type,
      size: shopImage.size,
      locationId: shopImageLocationId,
    };
  }

  await businessRef.set(payload, { merge: true });

  return NextResponse.json(
    {
      ok: true,
      status: nextStatus,
      message: "Draft saved.",
    },
    { status: 200 }
  );
}
