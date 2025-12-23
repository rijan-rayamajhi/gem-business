"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

type BusinessStatus = "draft" | "submitted" | "pending" | "verified" | "rejected";

function asBusinessStatus(value: unknown): BusinessStatus | null {
  return value === "draft" ||
    value === "submitted" ||
    value === "pending" ||
    value === "verified" ||
    value === "rejected"
    ? value
    : null;
}

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

type BusinessLocation = {
  id: string;
  fullAddress: string;
  geo: { lat: number; lng: number } | null;
  contactNumber: string;
  shopImageUrl?: string;
  businessHours?: unknown;
};

type BusinessDraftResponse = {
  ok?: boolean;
  business?:
    | {
        status?: string;
        businessType?: string;
        businessLocations?: BusinessLocation[];
        primaryBusinessLocationId?: string;
        primaryShopImage?: unknown;
      }
    | null;
};

declare global {
  interface Window {
    google?: unknown;
  }
}

type GoogleLatLngLiteral = { lat: number; lng: number };

type GoogleLatLngObject = {
  lat: () => number;
  lng: () => number;
};

type GoogleMapClickEvent = {
  latLng?: GoogleLatLngObject;
};

type GoogleMapInstance = {
  addListener?: (eventName: string, handler: (event: GoogleMapClickEvent) => void) => void;
  setCenter?: (latlng: GoogleLatLngLiteral) => void;
};

type GoogleMarkerInstance = {
  addListener?: (eventName: string, handler: () => void) => void;
  getPosition?: () => GoogleLatLngObject | null;
  setPosition?: (latlng: GoogleLatLngLiteral) => void;
};

type GoogleApi = {
  maps?: {
    Map: new (node: HTMLElement, opts: Record<string, unknown>) => GoogleMapInstance;
    Marker: new (opts: Record<string, unknown>) => GoogleMarkerInstance;
    Geocoder: new () => { geocode: (req: Record<string, unknown>) => Promise<unknown> };
    event?: { clearInstanceListeners?: (instance: unknown) => void };
  };
};

function extractLatLngFromUnknown(value: unknown): GoogleLatLngLiteral | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;

  const lat =
    typeof rec.lat === "number"
      ? rec.lat
      : typeof rec.latitude === "number"
        ? rec.latitude
        : typeof rec._latitude === "number"
          ? rec._latitude
          : null;
  const lng =
    typeof rec.lng === "number"
      ? rec.lng
      : typeof rec.longitude === "number"
        ? rec.longitude
        : typeof rec._longitude === "number"
          ? rec._longitude
          : null;

  if (lat === null || lng === null) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

let googleMapsScriptPromise: Promise<void> | null = null;

function loadGoogleMapsScript(apiKey: string) {
  if (typeof window === "undefined") return Promise.resolve();
  const google = window.google as GoogleApi | undefined;
  if (google?.maps?.Map) return Promise.resolve();

  if (googleMapsScriptPromise) return googleMapsScriptPromise;

  googleMapsScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-gem-google-maps="true"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Maps")));
      return;
    }

    const script = document.createElement("script");
    script.dataset.gemGoogleMaps = "true";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });

  return googleMapsScriptPromise;
}

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function createEmptyLocation(): BusinessLocation {
  return {
    id: makeId(),
    fullAddress: "",
    geo: null,
    contactNumber: "",
    shopImageUrl: "",
    businessHours: null,
  };
}

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

type BusinessHours = {
  enabled: boolean;
  timezone: string;
  days: Record<DayKey, { open: boolean; from: string; to: string }>;
};

const DAY_LABELS: Array<{ key: DayKey; label: string }> = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

function createDefaultBusinessHours(): BusinessHours {
  return {
    enabled: true,
    timezone:
      typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : "Asia/Kathmandu",
    days: {
      mon: { open: true, from: "09:00", to: "17:30" },
      tue: { open: true, from: "09:00", to: "17:30" },
      wed: { open: true, from: "09:00", to: "17:30" },
      thu: { open: true, from: "09:00", to: "17:30" },
      fri: { open: true, from: "09:00", to: "17:30" },
      sat: { open: false, from: "09:00", to: "17:30" },
      sun: { open: false, from: "09:00", to: "17:30" },
    },
  };
}

export default function RegisterLocationPage() {
  const router = useRouter();

  const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const [googleReady, setGoogleReady] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const mapNodeByIdRef = useRef<Record<string, HTMLDivElement | null>>({});
  const mapInstanceByIdRef = useRef<Record<string, GoogleMapInstance>>({});
  const markerByIdRef = useRef<Record<string, GoogleMarkerInstance>>({});
  const geocoderRef = useRef<unknown>(null);
  const browserGeoPromiseRef = useRef<Promise<GoogleLatLngLiteral | null> | null>(null);

  const [geoLocateStatusByLocationId, setGeoLocateStatusByLocationId] = useState<
    Record<string, "idle" | "loading" | "error">
  >({});
  const [geoLocateErrorByLocationId, setGeoLocateErrorByLocationId] = useState<Record<string, string>>({});

  const [businessType, setBusinessType] = useState<"online" | "offline" | "both" | "">("");
  const [locations, setLocations] = useState<BusinessLocation[]>([createEmptyLocation()]);
  const [primaryLocationId, setPrimaryLocationId] = useState<string>(locations[0]?.id ?? "");
  const [shopImageFilesByLocationId, setShopImageFilesByLocationId] = useState<Record<string, File | null>>({});
  const [existingShopImageLocationId, setExistingShopImageLocationId] = useState<string>("");
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const shopImagePreviewUrlsByLocationId = useMemo(() => {
    const next: Record<string, string> = {};
    for (const [locId, file] of Object.entries(shopImageFilesByLocationId)) {
      if (!file) continue;
      next[locId] = URL.createObjectURL(file);
    }
    return next;
  }, [shopImageFilesByLocationId]);

  useEffect(() => {
    return () => {
      for (const url of Object.values(shopImagePreviewUrlsByLocationId)) {
        URL.revokeObjectURL(url);
      }
    };
  }, [shopImagePreviewUrlsByLocationId]);

  const needsShopImage = businessType === "offline" || businessType === "both";
  const hasExistingPrimaryShopImage =
    Boolean(existingShopImageLocationId) && existingShopImageLocationId === primaryLocationId;

  useEffect(() => {
    let cancelled = false;
    if (!googleMapsKey) {
      queueMicrotask(() => {
        if (cancelled) return;
        setGoogleReady(false);
        setGoogleError(null);
      });
      return;
    }

    void loadGoogleMapsScript(googleMapsKey)
      .then(() => {
        if (cancelled) return;
        const google = window.google as GoogleApi | undefined;
        if (!google?.maps?.Map) {
          setGoogleError("Google Maps is unavailable.");
          setGoogleReady(false);
          return;
        }
        setGoogleError(null);
        setGoogleReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setGoogleError("Failed to load Google Maps.");
        setGoogleReady(false);
      });

    return () => {
      cancelled = true;
    };
  }, [googleMapsKey]);

  async function getBrowserGeoOnce(): Promise<GoogleLatLngLiteral | null> {
    if (browserGeoPromiseRef.current) return browserGeoPromiseRef.current;
    browserGeoPromiseRef.current = new Promise<GoogleLatLngLiteral | null>((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });

    return browserGeoPromiseRef.current;
  }

  async function reverseGeocode(latlng: GoogleLatLngLiteral): Promise<string> {
    if (!googleReady) return "";
    const google = window.google as GoogleApi | undefined;
    if (!google?.maps?.Geocoder) return "";

    const geocoder = (geocoderRef.current ?? new google.maps.Geocoder()) as {
      geocode: (req: Record<string, unknown>) => Promise<unknown>;
    };
    geocoderRef.current = geocoder;

    const res = (await geocoder
      .geocode({ location: latlng })
      .catch(() => null)) as { results?: Array<{ formatted_address?: string }> } | null;

    const formatted = res?.results?.[0]?.formatted_address;
    return typeof formatted === "string" ? formatted : "";
  }

  async function setLocationFromLatLng(locationId: string, latlng: GoogleLatLngLiteral) {
    const address = await reverseGeocode(latlng);
    setLocations((prev) =>
      prev.map((loc) =>
        loc.id === locationId
          ? {
              ...loc,
              geo: latlng,
              fullAddress: address || loc.fullAddress,
            }
          : loc
      )
    );
    setSubmitState({ status: "idle" });
  }

  function ensureMapForLocation(locationId: string) {
    if (!googleReady) return;
    const node = mapNodeByIdRef.current[locationId];
    if (!node) return;
    if (mapInstanceByIdRef.current[locationId]) return;

    const google = window.google as GoogleApi | undefined;
    if (!google?.maps?.Map || !google?.maps?.Marker) return;

    const loc = locations.find((l) => l.id === locationId);
    const center = loc?.geo ?? { lat: 27.7172, lng: 85.324 };

    const map = new google.maps.Map(node, {
      center,
      zoom: loc?.geo ? 16 : 12,
      disableDefaultUI: true,
      clickableIcons: false,
    });

    const marker = new google.maps.Marker({
      map,
      position: center,
      draggable: true,
    });

    map.addListener?.("click", async (event) => {
      const latLng = event.latLng;
      if (!latLng) return;
      const lat = latLng.lat();
      const lng = latLng.lng();
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      marker.setPosition?.({ lat, lng });
      await setLocationFromLatLng(locationId, { lat, lng });
    });

    marker.addListener?.("dragend", async () => {
      const pos = marker.getPosition?.();
      if (!pos) return;
      const lat = pos.lat();
      const lng = pos.lng();
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      await setLocationFromLatLng(locationId, { lat, lng });
    });

    mapInstanceByIdRef.current[locationId] = map;
    markerByIdRef.current[locationId] = marker;
  }

  useEffect(() => {
    if (!googleReady) return;

    const existingIds = new Set(locations.map((loc) => loc.id));
    for (const id of Object.keys(mapInstanceByIdRef.current)) {
      if (existingIds.has(id)) continue;
      delete mapInstanceByIdRef.current[id];
      delete markerByIdRef.current[id];
      delete mapNodeByIdRef.current[id];
    }

    for (const loc of locations) {
      ensureMapForLocation(loc.id);
    }
  }, [googleReady, locations]);

  useEffect(() => {
    if (!googleReady) return;

    for (const loc of locations) {
      const marker = markerByIdRef.current[loc.id];
      const map = mapInstanceByIdRef.current[loc.id];
      if (!marker || !map) continue;
      if (!loc.geo) continue;
      marker.setPosition?.(loc.geo);
      map.setCenter?.(loc.geo);
    }
  }, [googleReady, locations]);

  useEffect(() => {
    if (!googleReady) return;

    void (async () => {
      const base = await getBrowserGeoOnce();
      if (!base) return;

      for (const loc of locations) {
        if (loc.geo) continue;
        await setLocationFromLatLng(loc.id, base);
        const marker = markerByIdRef.current[loc.id];
        const map = mapInstanceByIdRef.current[loc.id];
        marker?.setPosition?.(base);
        map?.setCenter?.(base);
      }
    })();
  }, [googleReady, locations]);

  const primaryLocation = useMemo(() => {
    return locations.find((loc) => loc.id === primaryLocationId) ?? locations[0] ?? null;
  }, [locations, primaryLocationId]);

  const validationError = useMemo(() => {
    if (!businessType) return "Please complete business registration first.";
    if (!locations.length) return "Please add at least one business location.";

    for (const [index, loc] of locations.entries()) {
      if (!loc.geo) return `Location ${index + 1}: Please pin your location on the map.`;
    }

    if (!primaryLocationId) return "Please select a primary location.";
    if (!locations.some((loc) => loc.id === primaryLocationId)) {
      return "Primary location is invalid.";
    }

    if (needsShopImage) {
      const hasPrimaryFile = Boolean(shopImageFilesByLocationId[primaryLocationId]);
      const primaryLoc = locations.find((loc) => loc.id === primaryLocationId);
      const hasPrimaryUrl = Boolean(primaryLoc?.shopImageUrl);
      if (!hasPrimaryFile && !hasPrimaryUrl && !hasExistingPrimaryShopImage) {
        return "Please upload a shop image for your primary location.";
      }
    }

    return null;
  }, [businessType, hasExistingPrimaryShopImage, locations, needsShopImage, primaryLocationId, shopImageFilesByLocationId]);

  useEffect(() => {
    const token = (() => {
      try {
        return sessionStorage.getItem("gem_id_token");
      } catch {
        return null;
      }
    })();

    if (!token) return;

    const controller = new AbortController();
    const run = async () => {
      try {
        const res = await fetch("/api/register", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        if (!res.ok) return;

        const data = (await res.json().catch(() => null)) as BusinessDraftResponse | null;
        if (!data?.ok || !data.business) return;

        const status = asBusinessStatus(data.business?.status);
        if (status === "submitted" || status === "pending") {
          router.replace("/register/verification");
          return;
        }
        if (status === "verified") {
          router.replace("/dashboard/catalogue");
          return;
        }
        if (status === "rejected") {
          router.replace("/register/rejected");
          return;
        }

        const nextBusinessType = (data.business.businessType ?? "") as
          | "online"
          | "offline"
          | "both"
          | "";

        setBusinessType(["online", "offline", "both"].includes(nextBusinessType) ? nextBusinessType : "");

        const nextLocations = Array.isArray(data.business.businessLocations)
          ? data.business.businessLocations
          : [];

        if (nextLocations.length) {
          setLocations(
            nextLocations.map((loc) => {
              const record = loc as unknown as Record<string, unknown>;
              const hours = record.businessHours;
              const fullAddressRaw = typeof record.fullAddress === "string" ? record.fullAddress : "";
              return {
                id: typeof loc.id === "string" && loc.id ? loc.id : makeId(),
                fullAddress: fullAddressRaw,
                geo: extractLatLngFromUnknown(record.geo),
                contactNumber:
                  typeof record.contactNumber === "string" ? record.contactNumber : "",
                shopImageUrl: typeof record.shopImageUrl === "string" ? record.shopImageUrl : "",
                businessHours:
                  hours && typeof hours === "object" ? hours : createDefaultBusinessHours(),
              };
            })
          );
        } else {
          const next = createEmptyLocation();
          setLocations([next]);
          setPrimaryLocationId(next.id);
        }

        const nextPrimaryId =
          typeof data.business.primaryBusinessLocationId === "string"
            ? data.business.primaryBusinessLocationId
            : "";

        if (nextPrimaryId) setPrimaryLocationId(nextPrimaryId);

        const primaryShopImageObj =
          data.business.primaryShopImage && typeof data.business.primaryShopImage === "object"
            ? (data.business.primaryShopImage as Record<string, unknown>)
            : null;
        const nextShopImageLocationId =
          primaryShopImageObj && typeof primaryShopImageObj.locationId === "string"
            ? primaryShopImageObj.locationId
            : "";
        setExistingShopImageLocationId(nextShopImageLocationId);

        if (primaryShopImageObj && typeof primaryShopImageObj.url === "string") {
          const url = primaryShopImageObj.url;
          if (nextShopImageLocationId) {
            setLocations((prev) =>
              prev.map((loc) =>
                loc.id === nextShopImageLocationId && !loc.shopImageUrl
                  ? { ...loc, shopImageUrl: url }
                  : loc
              )
            );
          }
        }
      } catch {
        // ignore
      }
    };

    void run();
    return () => controller.abort();
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (validationError) {
      setSubmitState({ status: "error", message: validationError });
      return;
    }

    const token = (() => {
      try {
        return sessionStorage.getItem("gem_id_token");
      } catch {
        return null;
      }
    })();

    if (!token) {
      setSubmitState({ status: "error", message: "Please open this page from the mobile app." });
      return;
    }

    setSubmitState({ status: "submitting" });

    try {
      const normalizedLocations = locations.map((loc) => {
        if (loc.businessHours && typeof loc.businessHours === "object") return loc;
        return { ...loc, businessHours: createDefaultBusinessHours() };
      });
      const payload = new FormData();
      payload.append("businessLocations", JSON.stringify(normalizedLocations));
      payload.append("primaryBusinessLocationId", primaryLocationId);

      for (const [locId, file] of Object.entries(shopImageFilesByLocationId)) {
        if (!file) continue;
        payload.append(`shopImage_${locId}`, file);
      }

      const primaryFile = shopImageFilesByLocationId[primaryLocationId];
      if (primaryFile) {
        payload.append("shopImage", primaryFile);
        payload.append("shopImageLocationId", primaryLocationId);
      }

      const res = await fetch("/api/register", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: payload,
      });

      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; message?: string }
        | null;

      if (!res.ok) {
        setSubmitState({
          status: "error",
          message: data?.message || "Failed to save. Please try again.",
        });
        return;
      }

      setSubmitState({ status: "success", message: data?.message || "Draft saved." });
      router.push("/register/preview");
    } catch {
      setSubmitState({ status: "error", message: "Network error. Please try again." });
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-zinc-950/20 via-zinc-700/10 to-zinc-200/15 blur-3xl" />
          <div className="absolute -bottom-40 right-0 h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-zinc-950/0 via-zinc-700/10 to-zinc-950/0 blur-3xl" />
        </div>

        <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-12">
          {businessType !== "online" &&
            (() => {
              const selected = primaryLocation;
              const preview = selected ? shopImagePreviewUrlsByLocationId[selected.id] : "";
              const imageUrl = preview || selected?.shopImageUrl || "";
              const title = "Primary location";
              const subtitle = selected?.fullAddress?.trim() || "";

              return (
                <div className="mb-5">
                  <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-zinc-100">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt="Shop image"
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 768px"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-tr from-zinc-950/10 via-zinc-700/5 to-zinc-200/10" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/70 via-zinc-950/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                      <div className="text-sm font-semibold tracking-tight text-white">{title}</div>
                      <div className="mt-1 text-xs text-zinc-200">
                        {subtitle || (needsShopImage ? "Upload a shop image for this location" : "")}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          <div className="grid gap-2">
            <div>
              <div className="text-lg font-semibold tracking-tight">Business location</div>
              <div className="mt-1 text-sm text-zinc-600">
                Add one or more locations and choose a primary address.
              </div>
            </div>

            <form className="grid gap-4 sm:gap-5" onSubmit={onSubmit}>

              <div className="grid gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium">Locations</div>
                  <button
                    type="button"
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50"
                    onClick={() => {
                      setLocations((prev) => {
                        const next = [...prev, createEmptyLocation()];
                        if (!primaryLocationId) setPrimaryLocationId(next[0]?.id ?? "");
                        setCollapsedIds((c) => {
                          const copy = new Set(c);
                          copy.delete(next[next.length - 1].id);
                          return copy;
                        });
                        return next;
                      });
                      setSubmitState({ status: "idle" });
                    }}
                  >
                    Add location
                  </button>
                </div>

                <div className="grid gap-3 sm:gap-4">
                  {locations.map((loc, index) => {
                    const isPrimary = loc.id === primaryLocationId;
                    const isCollapsed = collapsedIds.has(loc.id);
                    const previewUrl = shopImagePreviewUrlsByLocationId[loc.id] ?? "";
                    const effectiveImageUrl = previewUrl || loc.shopImageUrl || "";
                    const hours = (loc.businessHours && typeof loc.businessHours === "object"
                      ? (loc.businessHours as BusinessHours)
                      : null) ?? createDefaultBusinessHours();
                    const geoLocateStatus = geoLocateStatusByLocationId[loc.id] ?? "idle";
                    const geoLocateError = geoLocateErrorByLocationId[loc.id] ?? "";
                    return (
                      <div
                        key={loc.id}
                        className={`relative border-b border-zinc-900/10 p-4 transition last:border-b-0 sm:p-5 ${
                          isPrimary ? "border-l-2 border-l-emerald-500" : ""
                        }`}
                      >
                        <div className="absolute right-4 top-4">
                          <button
                            type="button"
                            className="grid h-9 w-9 place-items-center rounded-full border border-zinc-900/10 bg-white text-zinc-700 shadow-sm transition hover:bg-zinc-50 active:scale-95"
                            aria-expanded={!isCollapsed}
                            aria-controls={`${loc.id}-fields`}
                            onClick={() => {
                              setCollapsedIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(loc.id)) next.delete(loc.id);
                                else next.add(loc.id);
                                return next;
                              });
                            }}
                            title={isCollapsed ? "Expand" : "Collapse"}
                          >
                            <span
                              className={`inline-block text-lg transition-transform ${
                                isCollapsed ? "rotate-180" : ""
                              }`}
                              aria-hidden="true"
                            >
                              ▾
                            </span>
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pr-14 sm:gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold tracking-tight">
                              Location {index + 1}
                            </div>
                            <div className="text-xs text-zinc-500">
                              {isPrimary ? "Primary" : "Secondary"}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              className={`inline-flex h-9 items-center justify-center rounded-xl px-3 text-xs font-semibold shadow-sm transition sm:h-10 sm:px-4 sm:text-sm ${
                                isPrimary
                                  ? "bg-emerald-600 text-white hover:bg-emerald-500"
                                  : "border border-zinc-900/10 bg-white text-zinc-950 hover:bg-zinc-50"
                              }`}
                              onClick={() => {
                                setPrimaryLocationId(loc.id);
                                setSubmitState({ status: "idle" });
                              }}
                            >
                              {isPrimary ? "Primary" : "Make primary"}
                            </button>

                            <button
                              type="button"
                              className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-3 text-xs font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:px-4 sm:text-sm"
                              disabled={locations.length === 1}
                              onClick={() => {
                                setLocations((prev) => {
                                  const next = prev.filter((item) => item.id !== loc.id);
                                  if (next.length === 0) {
                                    const created = createEmptyLocation();
                                    setPrimaryLocationId(created.id);
                                    return [created];
                                  }

                                  if (primaryLocationId === loc.id) {
                                    setPrimaryLocationId(next[0].id);
                                  }
                                  return next;
                                });
                                setCollapsedIds((prev) => {
                                  const next = new Set(prev);
                                  next.delete(loc.id);
                                  return next;
                                });
                                setSubmitState({ status: "idle" });
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        <div
                          id={`${loc.id}-fields`}
                          className={`mt-4 grid gap-3 overflow-hidden transition-all duration-300 sm:gap-4 ${
                            isCollapsed ? "max-h-0 opacity-0 -translate-y-2" : "max-h-[5000px] opacity-100 translate-y-0"
                          }`}
                          aria-hidden={isCollapsed}
                        >
                          <div className="grid gap-2">
                            {needsShopImage ? (
                              <>
                                <div className="flex items-center justify-between gap-3">
                                  <div className="text-sm font-medium">Shop image</div>
                                  <label className="relative inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50">
                                    Upload
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="absolute h-px w-px opacity-0"
                                      onChange={(e) => {
                                        const nextFile = e.target.files?.[0] ?? null;
                                        setShopImageFilesByLocationId((prev) => ({
                                          ...prev,
                                          [loc.id]: nextFile,
                                        }));
                                        setSubmitState({ status: "idle" });
                                      }}
                                    />
                                  </label>
                                </div>

                                <div className="overflow-hidden rounded-2xl border border-zinc-900/10 bg-white/60">
                                  <div className="relative aspect-video w-full bg-zinc-100">
                                    {effectiveImageUrl ? (
                                      <Image
                                        src={effectiveImageUrl}
                                        alt="Shop image preview"
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 768px) 100vw, 768px"
                                        unoptimized
                                      />
                                    ) : (
                                      <div className="absolute inset-0 grid place-items-center bg-gradient-to-tr from-zinc-950/10 via-zinc-700/5 to-zinc-200/10 text-xs font-semibold text-zinc-600">
                                        16:9 shop image
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="text-xs text-zinc-500">
                                  This image is saved for this specific location.
                                </div>
                              </>
                            ) : null}
                          </div>

                          <div className="grid gap-2">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-medium">Location on Google Maps</div>
                              <button
                                type="button"
                                className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-3 text-xs font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:px-4 sm:text-sm"
                                disabled={geoLocateStatus === "loading"}
                                onClick={() => {
                                  void (async () => {
                                    setGeoLocateStatusByLocationId((prev) => ({ ...prev, [loc.id]: "loading" }));
                                    setGeoLocateErrorByLocationId((prev) => {
                                      const next = { ...prev };
                                      delete next[loc.id];
                                      return next;
                                    });

                                    const base = await getBrowserGeoOnce();
                                    if (!base) {
                                      setGeoLocateStatusByLocationId((prev) => ({ ...prev, [loc.id]: "error" }));
                                      setGeoLocateErrorByLocationId((prev) => ({
                                        ...prev,
                                        [loc.id]: "Unable to access your current location. Please allow location permission and try again.",
                                      }));
                                      return;
                                    }

                                    await setLocationFromLatLng(loc.id, base);
                                    const marker = markerByIdRef.current[loc.id];
                                    const map = mapInstanceByIdRef.current[loc.id];
                                    marker?.setPosition?.(base);
                                    map?.setCenter?.(base);
                                    setGeoLocateStatusByLocationId((prev) => ({ ...prev, [loc.id]: "idle" }));
                                  })();
                                }}
                              >
                                {geoLocateStatus === "loading" ? "Locating…" : "Use current location"}
                              </button>
                            </div>
                            <div className="overflow-hidden rounded-2xl border border-zinc-900/10 bg-white/60">
                              <div
                                className="h-64 w-full bg-zinc-100"
                                ref={(node) => {
                                  mapNodeByIdRef.current[loc.id] = node;
                                }}
                              />
                            </div>
                            {googleError ? (
                              <div className="text-xs text-rose-600">{googleError}</div>
                            ) : geoLocateError ? (
                              <div className="text-xs text-rose-600">{geoLocateError}</div>
                            ) : (
                              <div className="text-xs text-zinc-600">
                                {loc.fullAddress?.trim()
                                  ? loc.fullAddress
                                  : "Move the pin to select your address."}
                              </div>
                            )}
                          </div>

                          <div className="grid gap-2">
                            <label className="text-sm font-medium" htmlFor={`${loc.id}-contactNumber`}>
                              Contact number
                            </label>
                            <input
                              id={`${loc.id}-contactNumber`}
                              inputMode="tel"
                              className="h-11 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none ring-0 transition focus:border-zinc-900/20 focus:bg-zinc-50"
                              value={loc.contactNumber ?? ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                setLocations((prev) =>
                                  prev.map((item) =>
                                    item.id === loc.id
                                      ? { ...item, contactNumber: value }
                                      : item
                                  )
                                );
                                setSubmitState({ status: "idle" });
                              }}
                              placeholder="e.g. 98XXXXXXXX"
                            />
                          </div>

                          <div className="grid gap-3 pt-2">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold tracking-tight">Business hours</div>
                                <div className="mt-1 text-xs text-zinc-500">
                                  Set opening hours for this location.
                                </div>
                              </div>

                              <button
                                type="button"
                                className={`inline-flex h-9 items-center justify-center rounded-xl px-3 text-xs font-semibold shadow-sm transition sm:h-10 sm:px-4 sm:text-sm ${
                                  hours.enabled
                                    ? "bg-zinc-950 text-white hover:bg-zinc-900"
                                    : "border border-zinc-900/10 bg-white text-zinc-950 hover:bg-zinc-50"
                                }`}
                                onClick={() => {
                                  const next = { ...hours, enabled: !hours.enabled };
                                  setLocations((prev) =>
                                    prev.map((item) =>
                                      item.id === loc.id ? { ...item, businessHours: next } : item
                                    )
                                  );
                                  setSubmitState({ status: "idle" });
                                }}
                              >
                                {hours.enabled ? "Enabled" : "Disabled"}
                              </button>
                            </div>

                            {hours.enabled && (
                              <>
                                <div className="grid gap-2 sm:gap-3">
                                  {DAY_LABELS.map(({ key, label }) => {
                                    const day = hours.days[key];
                                    return (
                                      <div
                                        key={key}
                                        className="grid gap-2 border-b border-zinc-900/10 py-3 last:border-b-0"
                                      >
                                        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                                          <div className="text-sm font-semibold">{label}</div>
                                          <button
                                            type="button"
                                            className={`inline-flex h-8 items-center justify-center rounded-xl px-3 text-xs font-semibold shadow-sm transition sm:h-9 ${
                                              day.open
                                                ? "bg-emerald-600 text-white hover:bg-emerald-500"
                                                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                                            }`}
                                            onClick={() => {
                                              const next = {
                                                ...hours,
                                                days: {
                                                  ...hours.days,
                                                  [key]: { ...day, open: !day.open },
                                                },
                                              };
                                              setLocations((prev) =>
                                                prev.map((item) =>
                                                  item.id === loc.id
                                                    ? { ...item, businessHours: next }
                                                    : item
                                                )
                                              );
                                              setSubmitState({ status: "idle" });
                                            }}
                                          >
                                            {day.open ? "Open" : "Closed"}
                                          </button>
                                        </div>

                                        {day.open ? (
                                          <div className="grid min-w-0 gap-2 sm:grid-cols-2 sm:gap-3">
                                            <div className="grid min-w-0 gap-1">
                                              <div className="text-xs font-medium text-zinc-600">From</div>
                                              <input
                                                type="time"
                                                className="h-10 w-full min-w-0 max-w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none ring-0 transition focus:border-zinc-900/20 focus:bg-zinc-50 sm:h-11"
                                                value={day.from}
                                                onChange={(e) => {
                                                  const next = {
                                                    ...hours,
                                                    days: {
                                                      ...hours.days,
                                                      [key]: { ...day, from: e.target.value },
                                                    },
                                                  };
                                                  setLocations((prev) =>
                                                    prev.map((item) =>
                                                      item.id === loc.id
                                                        ? { ...item, businessHours: next }
                                                        : item
                                                    )
                                                  );
                                                  setSubmitState({ status: "idle" });
                                                }}
                                              />
                                            </div>
                                            <div className="grid min-w-0 gap-1">
                                              <div className="text-xs font-medium text-zinc-600">To</div>
                                              <input
                                                type="time"
                                                className="h-10 w-full min-w-0 max-w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none ring-0 transition focus:border-zinc-900/20 focus:bg-zinc-50 sm:h-11"
                                                value={day.to}
                                                onChange={(e) => {
                                                  const next = {
                                                    ...hours,
                                                    days: {
                                                      ...hours.days,
                                                      [key]: { ...day, to: e.target.value },
                                                    },
                                                  };
                                                  setLocations((prev) =>
                                                    prev.map((item) =>
                                                      item.id === loc.id
                                                        ? { ...item, businessHours: next }
                                                        : item
                                                    )
                                                  );
                                                  setSubmitState({ status: "idle" });
                                                }}
                                              />
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="text-xs text-zinc-500">Closed</div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {(submitState.status === "error" || submitState.status === "success") && (
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${
                    submitState.status === "success"
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                      : "border-rose-500/20 bg-rose-500/10 text-rose-700"
                  }`}
                  role="status"
                >
                  {submitState.message}
                </div>
              )}

              <button
                type="submit"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-zinc-950 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={submitState.status === "submitting"}
              >
                {submitState.status === "submitting" ? "Saving…" : "Continue"}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
