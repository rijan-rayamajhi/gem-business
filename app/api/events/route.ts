import { NextResponse } from "next/server";
import { FieldValue, adminDb, adminStorageBucket } from "@/lib/firebaseAdmin";
import { getUid } from "@/lib/requestAuth";

export const runtime = "nodejs";

type EventStatus = "draft" | "pending" | "rejected" | "verified";

function asEventStatus(value: unknown): EventStatus | null {
  return value === "draft" || value === "pending" || value === "rejected" || value === "verified"
    ? value
    : null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (!isNonEmptyString(value)) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

type FaqInput = {
  question: string;
  answer: string;
};

function normalizeFaq(raw: unknown): FaqInput | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const question = typeof obj.question === "string" ? obj.question.trim() : "";
  const answer = typeof obj.answer === "string" ? obj.answer.trim() : "";
  if (!question && !answer) return null;
  return { question, answer };
}

type HostInput = {
  name: string;
  show: boolean;
  url: string;
  hasImage: boolean;
};

function normalizeHost(raw: unknown): HostInput | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const name = typeof obj.name === "string" ? obj.name.trim() : "";
  const url = typeof obj.url === "string" ? obj.url.trim() : "";
  const show = typeof obj.show === "boolean" ? obj.show : obj.show !== false;
  const hasImage = typeof obj.hasImage === "boolean" ? obj.hasImage : Boolean(obj.hasImage);
  if (!name && !url && !hasImage) return null;
  return { name, url, show: Boolean(show), hasImage };
}

async function uploadImageToStorage(params: { uid: string; file: File; folder: string }) {
  const { uid, file, folder } = params;
  const buffer = Buffer.from(await file.arrayBuffer());

  const safeName = (file.name || "image").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
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

type TicketInput = {
  title: string;
  description: string;
  price: number;
  discountPercent?: number;
  quantity: number;
  couponCode?: string;
};

function normalizeTicket(raw: unknown): TicketInput | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const title = typeof obj.title === "string" ? obj.title.trim() : "";
  const description = typeof obj.description === "string" ? obj.description.trim() : "";
  const price = typeof obj.price === "number" ? obj.price : Number(obj.price);
  const discountPercent =
    typeof obj.discountPercent === "number" ? obj.discountPercent : Number(obj.discountPercent);
  const quantity = typeof obj.quantity === "number" ? obj.quantity : Number(obj.quantity);
  const couponCode = typeof obj.couponCode === "string" ? obj.couponCode.trim() : "";

  if (!title) return null;
  if (!description) return null;
  if (!Number.isFinite(price) || price < 0) return null;
  if (!Number.isFinite(quantity) || quantity < 0) return null;

  const normalized: TicketInput = {
    title,
    description,
    price,
    quantity,
    ...(Number.isFinite(discountPercent) && discountPercent > 0
      ? { discountPercent: Math.min(100, Math.max(0, discountPercent)) }
      : {}),
    ...(couponCode ? { couponCode } : {}),
  };

  return normalized;
}

export async function GET(request: Request) {
  const auth = await getUid(request);
  if (!auth.ok) return auth.response;

  const uid = auth.uid;

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");
  const statusFilter = asEventStatus(statusParam) ?? null;

  try {
    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = adminDb
      .collection("events")
      .where("userId", "==", uid);

    if (statusFilter) query = query.where("status", "==", statusFilter);

    try {
      const orderedSnap = await query.orderBy("createdAt", "desc").get();
      const events = orderedSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() ?? {}) }));
      return NextResponse.json({ ok: true, events }, { status: 200 });
    } catch (err) {
      const fallbackSnap = await query.get();
      const events = fallbackSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() ?? {}) }));
      console.error("/api/events GET ordered query failed; returned unordered fallback", err);
      return NextResponse.json({ ok: true, events }, { status: 200 });
    }
  } catch (err) {
    console.error("/api/events GET failed", err);
    return NextResponse.json({ ok: false, message: "Failed to load events." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await getUid(request);
  if (!auth.ok) return auth.response;

  const uid = auth.uid;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid form data." }, { status: 400 });
  }

  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const launchDateTime = String(form.get("launchDateTime") ?? "").trim();
  const startDateTime = String(form.get("startDateTime") ?? "").trim();
  const endDateTime = String(form.get("endDateTime") ?? "").trim();
  const locationAddress = String(form.get("locationAddress") ?? "").trim();
  const locationName = String(form.get("locationName") ?? "").trim();
  const locationShowRaw = String(form.get("locationShow") ?? "true").trim().toLowerCase();
  const locationShow = locationShowRaw !== "false";
  const locationRadiusKmRaw = String(form.get("locationRadiusKm") ?? "").trim();
  const locationPlaceId = String(form.get("locationPlaceId") ?? "").trim();
  const locationLatRaw = String(form.get("locationLat") ?? "").trim();
  const locationLngRaw = String(form.get("locationLng") ?? "").trim();

  const unlockQrAtVenueRaw = String(form.get("unlockQrAtVenue") ?? "false").trim().toLowerCase();
  const groupsEnabledRaw = String(form.get("groupsEnabled") ?? "false").trim().toLowerCase();
  const vehicleVerifiedRaw = String(form.get("vehicleVerified") ?? "false").trim().toLowerCase();
  const unlockQrAtVenue = unlockQrAtVenueRaw === "true";
  const groupsEnabled = groupsEnabledRaw === "true";
  const vehicleVerified = vehicleVerifiedRaw === "true";

  const tagsRaw = form.get("tags");
  const termsHtml = String(form.get("termsHtml") ?? "");
  const aboutHtml = String(form.get("aboutHtml") ?? "");
  const thingsToKnow = String(form.get("thingsToKnow") ?? "");
  const amenities = String(form.get("amenities") ?? "");
  const buttonText = String(form.get("buttonText") ?? "");
  const faqsRaw = form.get("faqs");
  const hostsRaw = form.get("hosts");

  const organiserName = String(form.get("organiserName") ?? "").trim();

  const statusRaw = String(form.get("status") ?? "draft").trim();
  const status: EventStatus = asEventStatus(statusRaw) ?? "draft";

  const banner = form.get("banner");
  if (!(banner instanceof File)) {
    return NextResponse.json({ ok: false, message: "Event banner is required." }, { status: 400 });
  }

  if (!title) {
    return NextResponse.json({ ok: false, message: "Event title is required." }, { status: 400 });
  }

  if (!description) {
    return NextResponse.json(
      { ok: false, message: "Event description is required." },
      { status: 400 }
    );
  }

  if (!launchDateTime || !startDateTime || !endDateTime) {
    return NextResponse.json(
      { ok: false, message: "Launch date/time, start date/time and end date/time are required." },
      { status: 400 }
    );
  }

  const startMs = new Date(startDateTime).getTime();
  const endMs = new Date(endDateTime).getTime();
  if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs < startMs) {
    return NextResponse.json(
      { ok: false, message: "End date/time must be after start date/time." },
      { status: 400 }
    );
  }

  if (!locationAddress) {
    return NextResponse.json({ ok: false, message: "Event location is required." }, { status: 400 });
  }

  if (!organiserName) {
    return NextResponse.json(
      { ok: false, message: "Event organiser name is required." },
      { status: 400 }
    );
  }

  const tags = parseJson<unknown[]>(tagsRaw, [])
    .filter((t) => typeof t === "string")
    .map((t) => (t as string).trim())
    .filter(Boolean)
    .slice(0, 5);

  if (tags.length < 1) {
    return NextResponse.json(
      { ok: false, message: "Please add at least 1 tag (max 5)." },
      { status: 400 }
    );
  }

  const ticketsRaw = form.get("tickets");
  const ticketObjs = parseJson<unknown[]>(ticketsRaw, []);
  const tickets = ticketObjs.map(normalizeTicket).filter((t): t is TicketInput => Boolean(t));

  const faqObjs = parseJson<unknown[]>(faqsRaw, []);
  const faqs = faqObjs.map(normalizeFaq).filter((f): f is FaqInput => Boolean(f));

  const hostObjs = parseJson<unknown[]>(hostsRaw, []);
  const hostsInput = hostObjs.map(normalizeHost).filter((h): h is HostInput => Boolean(h));

  if (tickets.length < 1) {
    return NextResponse.json(
      { ok: false, message: "Please add at least 1 ticket." },
      { status: 400 }
    );
  }

  const sponsorNames = parseJson<unknown[]>(form.get("sponsorNames"), [])
    .filter((v) => typeof v === "string")
    .map((v) => (v as string).trim())
    .filter(Boolean);

  const partnerNames = parseJson<unknown[]>(form.get("partnerNames"), [])
    .filter((v) => typeof v === "string")
    .map((v) => (v as string).trim())
    .filter(Boolean);

  const sponsorLogos = form
    .getAll("sponsorLogos")
    .filter((value): value is File => value instanceof File);

  const partnerLogos = form
    .getAll("partnerLogos")
    .filter((value): value is File => value instanceof File);

  const gallery = form.getAll("gallery").filter((value): value is File => value instanceof File);

  const hostImages = form
    .getAll("hostImages")
    .filter((value): value is File => value instanceof File);

  const organiserLogo = form.get("organiserLogo");

  const maxImageBytes = 5 * 1024 * 1024;
  for (const img of [banner, ...sponsorLogos, ...partnerLogos, ...gallery, ...hostImages]) {
    if (img.size > maxImageBytes) {
      return NextResponse.json(
        { ok: false, message: "Each image must be under 5MB." },
        { status: 400 }
      );
    }
    if (!img.type.startsWith("image/")) {
      return NextResponse.json(
        { ok: false, message: "All uploads must be images." },
        { status: 400 }
      );
    }
  }

  if (organiserLogo instanceof File) {
    if (organiserLogo.size > maxImageBytes) {
      return NextResponse.json(
        { ok: false, message: "Organiser logo must be under 5MB." },
        { status: 400 }
      );
    }
    if (!organiserLogo.type.startsWith("image/")) {
      return NextResponse.json(
        { ok: false, message: "Organiser logo must be an image." },
        { status: 400 }
      );
    }
  }

  try {
    const bannerUpload = await uploadImageToStorage({ uid, file: banner, folder: "eventBanners" });

    const organiserLogoUrl =
      organiserLogo instanceof File
        ? (
            await uploadImageToStorage({
              uid,
              file: organiserLogo,
              folder: "eventOrganiserLogos",
            })
          ).publicUrl
        : "";

    const sponsorLogoUrls: string[] = [];
    for (const logo of sponsorLogos) {
      const upload = await uploadImageToStorage({ uid, file: logo, folder: "eventSponsorLogos" });
      sponsorLogoUrls.push(upload.publicUrl);
    }

    const partnerLogoUrls: string[] = [];
    for (const logo of partnerLogos) {
      const upload = await uploadImageToStorage({ uid, file: logo, folder: "eventPartnerLogos" });
      partnerLogoUrls.push(upload.publicUrl);
    }

    const galleryUrls: string[] = [];
    for (const img of gallery) {
      const upload = await uploadImageToStorage({ uid, file: img, folder: "eventGallery" });
      galleryUrls.push(upload.publicUrl);
    }

    const hostImageUrls: string[] = [];
    for (const img of hostImages) {
      const upload = await uploadImageToStorage({ uid, file: img, folder: "eventHostImages" });
      hostImageUrls.push(upload.publicUrl);
    }

    let hostImageIdx = 0;
    const hosts = hostsInput.map((h) => {
      const next = {
        ...(h.name ? { name: h.name } : { name: "" }),
        ...(h.url ? { url: h.url } : {}),
        ...(h.show === false ? { show: false } : {}),
      } as { name: string; url?: string; show?: boolean; imageUrl?: string };
      if (h.hasImage) {
        const imageUrl = hostImageUrls[hostImageIdx] || "";
        hostImageIdx++;
        if (imageUrl) next.imageUrl = imageUrl;
      }
      return next;
    });

    const sponsors = sponsorNames.map((name, idx) => ({
      name,
      ...(sponsorLogoUrls[idx] ? { logoUrl: sponsorLogoUrls[idx] } : {}),
    }));

    const partners = partnerNames.map((name, idx) => ({
      name,
      ...(partnerLogoUrls[idx] ? { logoUrl: partnerLogoUrls[idx] } : {}),
    }));

    const locationLat = locationLatRaw ? Number(locationLatRaw) : NaN;
    const locationLng = locationLngRaw ? Number(locationLngRaw) : NaN;
    const locationRadiusKm = locationRadiusKmRaw ? Number(locationRadiusKmRaw) : NaN;

    const docRef = await adminDb.collection("events").add({
      userId: uid,
      title,
      description,
      launchDateTime,
      startDateTime,
      endDateTime,
      startDate: startDateTime,
      endDate: endDateTime,
      location: {
        address: locationAddress,
        ...(locationName ? { name: locationName } : {}),
        ...(locationShow === false ? { show: false } : {}),
        ...(Number.isFinite(locationRadiusKm) ? { radiusKm: locationRadiusKm } : {}),
        ...(locationPlaceId ? { placeId: locationPlaceId } : {}),
        ...(Number.isFinite(locationLat) ? { lat: locationLat } : {}),
        ...(Number.isFinite(locationLng) ? { lng: locationLng } : {}),
      },
      bannerUrl: bannerUpload.publicUrl,
      tags,
      ...(termsHtml ? { termsHtml } : {}),
      ...(aboutHtml ? { aboutHtml } : {}),
      ...(thingsToKnow ? { thingsToKnow } : {}),
      ...(amenities ? { amenities } : {}),
      ...(buttonText ? { buttonText } : {}),
      ...(faqs.length ? { faqs } : {}),
      ...(hosts.length ? { hosts } : {}),
      ...(unlockQrAtVenue ? { unlockQrAtVenue } : {}),
      ...(groupsEnabled ? { groupsEnabled } : {}),
      ...(vehicleVerified ? { vehicleVerified } : {}),
      organiser: {
        name: organiserName,
        ...(organiserLogoUrl ? { logoUrl: organiserLogoUrl } : {}),
      },
      ...(sponsors.length ? { sponsors } : {}),
      ...(partners.length ? { partners } : {}),
      ...(galleryUrls.length ? { galleryUrls } : {}),
      tickets,
      status,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json(
      {
        ok: true,
        id: docRef.id,
        status,
        message: status === "pending" ? "Event submitted for verification." : "Event draft saved.",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("/api/events POST failed", err);
    return NextResponse.json(
      { ok: false, message: "Failed to create event." },
      { status: 500 }
    );
  }
}
