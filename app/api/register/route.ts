import { NextResponse } from "next/server";
import { GeoPoint } from "firebase-admin/firestore";
import { FieldValue, adminDb, adminStorageBucket } from "@/lib/firebaseAdmin";
import { getUid } from "@/lib/requestAuth";

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
]);

const VEHICLE_TYPES = [
  "two-wheeler",
  "four-wheeler",
  "two-wheeler electric",
  "four-wheeler electric",
] as const;

const SHOP_TYPES = ["authorised shop", "local shop"] as const;

async function areSelectedBrandsValid(params: {
  businessCategory: string;
  brands: string[];
}) {
  const { businessCategory, brands } = params;
  if (brands.length === 0) return true;

  if (businessCategory === "Machanic Shop") {
    const refs = brands.map((id) => adminDb.collection("vehicleBrands").doc(id));
    const docs = await adminDb.getAll(...refs);
    for (const doc of docs) {
      if (!doc.exists) return false;
      const data = doc.data() ?? {};
      if (data.isActive !== true) return false;
    }
    return true;
  }

  const refs = brands.map((id) => adminDb.collection("brands").doc(id));
  const docs = await adminDb.getAll(...refs);
  for (const doc of docs) {
    if (!doc.exists) return false;
    const data = doc.data() ?? {};
    if (data.status !== "ACTIVE") return false;
  }
  return true;
}

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
  fullAddress: string;
  contactNumber?: string;
  shopImageUrl?: string;
  geo?: GeoPoint;
  businessHours?: unknown;
};

async function uploadImageToStorage(params: {
  uid: string;
  file: File;
  folder: string;
}) {
  const { uid, file, folder } = params;
  const buffer = Buffer.from(await file.arrayBuffer());

  const safeName = (file.name || "image")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120);
  const objectPath = `${folder}/${uid}/${Date.now()}_${safeName}`;

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
    const fullAddress = typeof obj.fullAddress === "string" ? obj.fullAddress.trim() : "";
    const contactNumber = typeof obj.contactNumber === "string" ? obj.contactNumber.trim() : "";
    const shopImageUrlRaw = typeof obj.shopImageUrl === "string" ? obj.shopImageUrl.trim() : "";
    const shopImageUrl = shopImageUrlRaw && isValidUrl(shopImageUrlRaw) ? shopImageUrlRaw : "";
    const geoRaw = obj.geo;
    const geo = (() => {
      if (!geoRaw || typeof geoRaw !== "object") return null;
      const record = geoRaw as Record<string, unknown>;
      const lat = typeof record.lat === "number" ? record.lat : null;
      const lng = typeof record.lng === "number" ? record.lng : null;
      if (lat === null || lng === null) return null;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return new GeoPoint(lat, lng);
    })();
    const businessHours = obj.businessHours;

    if (!id) continue;

    locations.push({
      id,
      fullAddress,
      ...(contactNumber ? { contactNumber } : {}),
      ...(shopImageUrl ? { shopImageUrl } : {}),
      ...(geo ? { geo } : {}),
      ...(businessHours ? { businessHours } : {}),
    });
  }

  return locations;
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
  const businessLocationsQuerySnap = await adminDb
    .collection("businessLocations")
    .where("businessId", "==", uid)
    .get();

  const locationDocs = businessLocationsQuerySnap.docs;
  const primaryLocationDoc =
    locationDocs.find((doc) => Boolean(doc.data()?.isPrimary)) ?? locationDocs[0] ?? null;
  const primaryBusinessLocationId = primaryLocationDoc?.id ?? "";
  const primaryShopImage = primaryLocationDoc?.data()?.primaryShopImage ?? null;

  const businessLocations = locationDocs
    .map((doc) => ({ id: doc.id, ...(doc.data() ?? {}) }))
    .filter((value) => value && typeof value === "object")
    .map((value) => {
      const obj = value as Record<string, unknown>;
      const shopImageUrl = typeof obj.shopImageUrl === "string" ? obj.shopImageUrl : "";
      const contactNumber = typeof obj.contactNumber === "string" ? obj.contactNumber : "";
      const fullAddress = typeof obj.fullAddress === "string" ? obj.fullAddress : "";
      const businessHours = obj.businessHours ?? null;
      const geo = (() => {
        const maybeGeo = obj.geo;
        if (!maybeGeo || typeof maybeGeo !== "object") return null;
        const rec = maybeGeo as Record<string, unknown>;
        const lat =
          typeof rec.latitude === "number"
            ? rec.latitude
            : typeof rec._latitude === "number"
              ? rec._latitude
              : null;
        const lng =
          typeof rec.longitude === "number"
            ? rec.longitude
            : typeof rec._longitude === "number"
              ? rec._longitude
              : null;
        if (lat === null || lng === null) return null;
        return { lat, lng };
      })();

      return {
        id: typeof obj.id === "string" ? obj.id : "",
        fullAddress,
        ...(contactNumber ? { contactNumber } : {}),
        ...(shopImageUrl ? { shopImageUrl } : {}),
        ...(geo ? { geo } : {}),
        ...(businessHours ? { businessHours } : {}),
      };
    })
    .filter((loc) => typeof loc.id === "string" && loc.id);

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
        suggestedBrandName:
          typeof data.suggestedBrandName === "string" ? data.suggestedBrandName : "",
        suggestedBrandLogoUrl:
          typeof data.suggestedBrandLogoUrl === "string" ? data.suggestedBrandLogoUrl : "",
        businessType: typeof data.businessType === "string" ? data.businessType : "",
        email: typeof data.email === "string" ? data.email : "",
        website: typeof data.website === "string" ? data.website : "",
        gstNumber: typeof data.gstNumber === "string" ? data.gstNumber : "",
        gstDocumentUrl: typeof data.gstDocumentUrl === "string" ? data.gstDocumentUrl : "",
        businessRole: typeof data.businessRole === "string" ? data.businessRole : "",
        name: typeof data.name === "string" ? data.name : "",
        contactNo: typeof data.contactNo === "string" ? data.contactNo : "",
        whatsappNo: typeof data.whatsappNo === "string" ? data.whatsappNo : "",
        businessLogoUrl: typeof data.businessLogoUrl === "string" ? data.businessLogoUrl : "",
        businessLocations,
        primaryBusinessLocationId,
        primaryShopImage,
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

  const requestedStatus = String(form.get("status") ?? "").trim();
  const wantsSubmit = requestedStatus === "submitted";
  const wantsResetToDraft = requestedStatus === "draft";

  const shopImagesByLocationId = new Map<string, File>();
  for (const [key, value] of form.entries()) {
    if (!key.startsWith("shopImage_")) continue;
    const locId = key.slice("shopImage_".length).trim();
    if (!locId) continue;
    if (!(value instanceof File)) continue;
    const maxBytes = 5 * 1024 * 1024;
    if (value.size > maxBytes) {
      return NextResponse.json(
        { ok: false, message: "Shop image must be under 5MB." },
        { status: 400 }
      );
    }
    if (!value.type.startsWith("image/")) {
      return NextResponse.json(
        { ok: false, message: "Shop image must be an image." },
        { status: 400 }
      );
    }
    shopImagesByLocationId.set(locId, value);
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
  const suggestedBrandName = String(form.get("suggestedBrandName") ?? "").trim();
  const suggestedBrandLogoUrl = String(form.get("suggestedBrandLogoUrl") ?? "").trim();
  const businessType = String(form.get("businessType") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const website = String(form.get("website") ?? "").trim();
  const gstNumber = String(form.get("gstNumber") ?? "").trim();
  const gstDocument = form.get("gstDocument");
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

  if (form.has("businessName") && !businessName) {
    return NextResponse.json(
      { ok: false, message: "Business name is required." },
      { status: 400 }
    );
  }

  if (form.has("businessDescription") && !businessDescription) {
    return NextResponse.json(
      { ok: false, message: "Business description is required." },
      { status: 400 }
    );
  }

  if (form.has("businessType") && !businessType) {
    return NextResponse.json(
      { ok: false, message: "Business type is required." },
      { status: 400 }
    );
  }

  if (form.has("email") && !email) {
    return NextResponse.json(
      { ok: false, message: "Email is required." },
      { status: 400 }
    );
  }

  if (email && !isValidEmail(email)) {
    return NextResponse.json(
      { ok: false, message: "Please enter a valid email." },
      { status: 400 }
    );
  }

  if (form.has("website") && !website) {
    return NextResponse.json(
      { ok: false, message: "Website is required." },
      { status: 400 }
    );
  }

  if (website && !isValidUrl(website)) {
    return NextResponse.json(
      { ok: false, message: "Please provide a valid website URL." },
      { status: 400 }
    );
  }

  if (form.has("gstNumber") && !gstNumber) {
    return NextResponse.json(
      { ok: false, message: "GST number is required." },
      { status: 400 }
    );
  }

  if (form.has("businessRole") && !businessRole) {
    return NextResponse.json(
      { ok: false, message: "Business role is required." },
      { status: 400 }
    );
  }

  if (businessRole && !["owner", "manager", "employee"].includes(businessRole)) {
    return NextResponse.json(
      { ok: false, message: "Business role must be owner, manager, or employee." },
      { status: 400 }
    );
  }

  if (form.has("name") && !name) {
    return NextResponse.json(
      { ok: false, message: "Name is required." },
      { status: 400 }
    );
  }

  if (form.has("contactNo") && !contactNo) {
    return NextResponse.json(
      { ok: false, message: "Contact number is required." },
      { status: 400 }
    );
  }

  if (form.has("whatsappNo") && !whatsappNo) {
    return NextResponse.json(
      { ok: false, message: "WhatsApp number is required." },
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

      const hasSuggestedBrand = Boolean(suggestedBrandName);
      const hasSuggestedBrandLogo = Boolean(suggestedBrandLogoUrl);

      if (hasSuggestedBrand !== hasSuggestedBrandLogo) {
        return NextResponse.json(
          { ok: false, message: "Please provide both suggested brand name and logo." },
          { status: 400 }
        );
      }

      if (hasSuggestedBrandLogo && !isValidUrl(suggestedBrandLogoUrl)) {
        return NextResponse.json(
          { ok: false, message: "Suggested brand logo URL is invalid." },
          { status: 400 }
        );
      }

      if (shopType === "authorised shop") {
        if (brands.length !== 1 && !(hasSuggestedBrand && hasSuggestedBrandLogo)) {
          return NextResponse.json(
            { ok: false, message: "Please select exactly one brand." },
            { status: 400 }
          );
        }
      }

      if (shopType === "local shop") {
        if (brands.length === 0 && !(hasSuggestedBrand && hasSuggestedBrandLogo)) {
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

      const validBrands = await areSelectedBrandsValid({ businessCategory, brands });
      if (!validBrands) {
        return NextResponse.json(
          { ok: false, message: "Invalid brand selection." },
          { status: 400 }
        );
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

  if (form.has("businessLogo") && !(businessLogo instanceof File)) {
    return NextResponse.json(
      { ok: false, message: "Business logo is required." },
      { status: 400 }
    );
  }

  if (gstDocument instanceof File) {
    const maxBytes = 5 * 1024 * 1024;
    if (gstDocument.size > maxBytes) {
      return NextResponse.json(
        { ok: false, message: "GST document must be under 5MB." },
        { status: 400 }
      );
    }

    const isPdf = gstDocument.type === "application/pdf";
    const isImage = gstDocument.type.startsWith("image/");
    if (!isPdf && !isImage) {
      return NextResponse.json(
        { ok: false, message: "GST document must be a PDF or an image." },
        { status: 400 }
      );
    }
  }

  if (form.has("gstDocument") && !(gstDocument instanceof File)) {
    return NextResponse.json(
      { ok: false, message: "GST document is required." },
      { status: 400 }
    );
  }

  if (form.has("businessLocations")) {
    if (businessLocations.length === 0) {
      return NextResponse.json(
        { ok: false, message: "Please add at least one business location." },
        { status: 400 }
      );
    }
    for (const loc of businessLocations) {
      if (!loc.geo) {
        return NextResponse.json(
          { ok: false, message: "Please pin your location on the map." },
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

  const nextStatus: BusinessStatus = (() => {
    if (isBusinessStatus(existingStatusRaw)) {
      if (existingStatusRaw === "rejected" && wantsResetToDraft) return "draft";
      if (existingStatusRaw !== "draft") return existingStatusRaw;
    }

    return wantsSubmit ? "submitted" : "draft";
  })();

  const payload: Record<string, unknown> = {
    userId: uid,
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
  if (form.has("suggestedBrandName")) {
    payload.suggestedBrandName = suggestedBrandName;
  }
  if (form.has("suggestedBrandLogoUrl")) {
    payload.suggestedBrandLogoUrl = suggestedBrandLogoUrl;
  }
  if (businessType) payload.businessType = businessType;
  if (email) payload.email = email.toLowerCase();
  if (website) payload.website = website;
  if (form.has("gstNumber")) payload.gstNumber = gstNumber;
  if (businessRole) payload.businessRole = businessRole;
  if (name) payload.name = name;
  if (contactNo) payload.contactNo = contactNo;
  if (whatsappNo) payload.whatsappNo = whatsappNo;
  if (businessLogo instanceof File) {
    const upload = await uploadImageToStorage({
      uid,
      file: businessLogo,
      folder: "businessLogos",
    });
    payload.businessLogoUrl = upload.publicUrl;
  }

  if (gstDocument instanceof File) {
    const upload = await uploadImageToStorage({
      uid,
      file: gstDocument,
      folder: "gstDocuments",
    });
    payload.gstDocumentUrl = upload.publicUrl;
  }

  let resolvedLocationsForSave = businessLocations;
  if (form.has("businessLocations") && shopImagesByLocationId.size > 0) {
    const nextLocations: BusinessLocation[] = [];
    for (const loc of businessLocations) {
      const file = shopImagesByLocationId.get(loc.id);
      if (!file) {
        nextLocations.push(loc);
        continue;
      }
      const upload = await uploadImageToStorage({
        uid,
        file,
        folder: "shopImages",
      });
      nextLocations.push({
        ...loc,
        shopImageUrl: upload.publicUrl,
      });
    }
    resolvedLocationsForSave = nextLocations;
  }

  const resolvedPrimaryShopImage =
    shopImage instanceof File
      ? {
          name: shopImage.name,
          type: shopImage.type,
          size: shopImage.size,
          locationId: shopImageLocationId,
          url: (await uploadImageToStorage({
            uid,
            file: shopImage,
            folder: "shopImages",
          })).publicUrl,
        }
      : null;

  await businessRef.set(payload, { merge: true });

  if (form.has("businessLocations")) {
    const businessSnap = await businessRef.get();
    const businessData = businessSnap.data() ?? {};

    const resolvedBusinessName =
      typeof businessData.businessName === "string" ? businessData.businessName : "";
    const resolvedBusinessLogoUrl =
      typeof businessData.businessLogoUrl === "string" ? businessData.businessLogoUrl : "";
    const resolvedBusinessCategory =
      typeof businessData.businessCategory === "string" ? businessData.businessCategory : "";

    const existingLocationsSnap = await adminDb
      .collection("businessLocations")
      .where("businessId", "==", uid)
      .get();

    const existingIds = new Set<string>(existingLocationsSnap.docs.map((doc) => doc.id));
    const incomingIds = new Set<string>(resolvedLocationsForSave.map((loc) => loc.id));

    const batch = adminDb.batch();

    for (const doc of existingLocationsSnap.docs) {
      if (incomingIds.has(doc.id)) continue;
      batch.delete(doc.ref);
    }

    for (const loc of resolvedLocationsForSave) {
      const locRef = adminDb.collection("businessLocations").doc(loc.id);
      const isPrimary = loc.id === primaryBusinessLocationId;
      const locationPayload: Record<string, unknown> = {
        businessId: uid,
        businessName: resolvedBusinessName,
        businessLogoUrl: resolvedBusinessLogoUrl,
        businessCategory: resolvedBusinessCategory,
        id: loc.id,
        fullAddress: loc.fullAddress,
        contactNumber: loc.contactNumber ?? "",
        shopImageUrl: loc.shopImageUrl ?? "",
        ...(loc.geo ? { geo: loc.geo } : {}),
        ...(loc.businessHours ? { businessHours: loc.businessHours } : {}),
        isPrimary,
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (!existingIds.has(loc.id)) {
        locationPayload.createdAt = FieldValue.serverTimestamp();
      }

      if (isPrimary && resolvedPrimaryShopImage) {
        locationPayload.primaryShopImage = resolvedPrimaryShopImage;
      }

      batch.set(locRef, locationPayload, { merge: true });
    }

    await batch.commit();
  }

  return NextResponse.json(
    {
      ok: true,
      status: nextStatus,
      message: wantsSubmit ? "Submitted." : wantsResetToDraft ? "Draft started." : "Draft saved.",
    },
    { status: 200 }
  );
}
