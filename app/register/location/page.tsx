"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

type BusinessLocation = {
  id: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  landmark: string;
  contactNumber: string;
  shopImageUrl?: string;
  businessHours?: unknown;
};

type BusinessDraftResponse = {
  ok?: boolean;
  business?:
    | {
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

type GoogleAddressComponent = { long_name: string; short_name: string; types: string[] };
type GooglePlaceResult = {
  address_components?: GoogleAddressComponent[];
  formatted_address?: string;
  name?: string;
};

type GoogleAutocompleteInstance = {
  addListener: (eventName: string, handler: () => void) => void;
  getPlace?: () => GooglePlaceResult;
};

type GoogleMapsPlaces = {
  Autocomplete: new (
    node: HTMLInputElement,
    opts: { fields: string[]; types: string[] }
  ) => GoogleAutocompleteInstance;
};

type GoogleMapsEvent = {
  clearInstanceListeners?: (instance: unknown) => void;
};

type GoogleMaps = {
  places?: GoogleMapsPlaces;
  event?: GoogleMapsEvent;
};

type GoogleApi = {
  maps?: GoogleMaps;
};

let googleMapsScriptPromise: Promise<void> | null = null;

function loadGoogleMapsScript(apiKey: string) {
  if (typeof window === "undefined") return Promise.resolve();
  const google = window.google as GoogleApi | undefined;
  if (google?.maps?.places) return Promise.resolve();

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
    )}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });

  return googleMapsScriptPromise;
}

function pickAddressComponent(
  components: Array<{ long_name: string; short_name: string; types: string[] }> | undefined,
  type: string
) {
  if (!components) return "";
  const found = components.find((c) => c.types.includes(type));
  return found?.long_name ?? "";
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
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    landmark: "",
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
  const autocompleteByIdRef = useRef<Record<string, unknown>>({});

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
        if (!google?.maps?.places) {
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

  useEffect(() => {
    const existingIds = new Set(locations.map((loc) => loc.id));
    for (const [id, instance] of Object.entries(autocompleteByIdRef.current)) {
      if (existingIds.has(id)) continue;
      try {
        const google = window.google as GoogleApi | undefined;
        google?.maps?.event?.clearInstanceListeners?.(instance);
      } catch {
        // ignore
      }
      delete autocompleteByIdRef.current[id];
    }
  }, [locations]);

  function attachAutocomplete(node: HTMLInputElement | null, locationId: string) {
    if (!node) return;
    if (!googleReady) return;
    if (autocompleteByIdRef.current[locationId]) return;
    const google = window.google as GoogleApi | undefined;
    if (!google?.maps?.places?.Autocomplete) return;

    const instance = new google.maps.places.Autocomplete(node, {
      fields: ["address_components", "formatted_address", "name"],
      types: ["geocode"],
    });

    instance.addListener("place_changed", () => {
      const place = instance.getPlace?.();
      const components = place?.address_components;

      const city =
        pickAddressComponent(components, "locality") ||
        pickAddressComponent(components, "postal_town") ||
        pickAddressComponent(components, "administrative_area_level_2");
      const state = pickAddressComponent(components, "administrative_area_level_1");
      const pincode = pickAddressComponent(components, "postal_code");

      const formattedAddress =
        typeof place?.formatted_address === "string" ? place.formatted_address : "";
      const name = typeof place?.name === "string" ? place.name : "";

      setLocations((prev) =>
        prev.map((loc) => {
          if (loc.id !== locationId) return loc;
          return {
            ...loc,
            addressLine1: formattedAddress || loc.addressLine1,
            city: city || loc.city,
            state: state || loc.state,
            pincode: pincode || loc.pincode,
            landmark: loc.landmark || name,
          };
        })
      );
      setSubmitState({ status: "idle" });
    });

    autocompleteByIdRef.current[locationId] = instance;
  }

  const primaryLocation = useMemo(() => {
    return locations.find((loc) => loc.id === primaryLocationId) ?? locations[0] ?? null;
  }, [locations, primaryLocationId]);

  const validationError = useMemo(() => {
    if (!businessType) return "Please complete business registration first.";
    if (!locations.length) return "Please add at least one business location.";

    for (const [index, loc] of locations.entries()) {
      if (!loc.addressLine1.trim()) return `Location ${index + 1}: Please enter address.`;
      if (!loc.city.trim()) return `Location ${index + 1}: Please enter city.`;
      if (!loc.state.trim()) return `Location ${index + 1}: Please enter state.`;
      if (!loc.pincode.trim()) return `Location ${index + 1}: Please enter pincode.`;
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
              return {
                id: typeof loc.id === "string" && loc.id ? loc.id : makeId(),
                addressLine1: typeof loc.addressLine1 === "string" ? loc.addressLine1 : "",
                addressLine2: typeof loc.addressLine2 === "string" ? loc.addressLine2 : "",
                city: typeof loc.city === "string" ? loc.city : "",
                state: typeof loc.state === "string" ? loc.state : "",
                pincode: typeof loc.pincode === "string" ? loc.pincode : "",
                landmark: typeof loc.landmark === "string" ? loc.landmark : "",
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
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-indigo-500/30 via-fuchsia-500/20 to-emerald-500/20 blur-3xl" />
          <div className="absolute -bottom-40 right-0 h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-zinc-900/0 via-indigo-500/15 to-zinc-900/0 blur-3xl dark:from-zinc-950/0 dark:via-indigo-500/15 dark:to-zinc-950/0" />
        </div>

        <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-12">
          {(() => {
            const selected = primaryLocation;
            const preview = selected ? shopImagePreviewUrlsByLocationId[selected.id] : "";
            const imageUrl = preview || selected?.shopImageUrl || "";
            const title = selected?.landmark?.trim() || "Primary location";
            const subtitleParts = [selected?.city, selected?.state].filter(Boolean);
            const subtitle = subtitleParts.join(", ");

            return (
              <div className="mb-5">
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-950">
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
                    <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 via-fuchsia-500/10 to-emerald-500/15" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/70 via-zinc-950/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                    <div className="text-sm font-semibold tracking-tight text-white">
                      {title}
                    </div>
                    <div className="mt-1 text-xs text-zinc-200">
                      {subtitle || "Upload a shop image for this location"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
          <div className="grid gap-2">
            <div>
              <div className="text-lg font-semibold tracking-tight">Business location</div>
              <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                Add one or more locations and choose a primary address.
              </div>
            </div>

            <form className="grid gap-4 sm:gap-5" onSubmit={onSubmit}>

              <div className="grid gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium">Locations</div>
                  <button
                    type="button"
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
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
                    return (
                      <div
                        key={loc.id}
                        className={`relative border-b border-zinc-900/10 p-4 transition last:border-b-0 sm:p-5 dark:border-white/10 ${
                          isPrimary ? "border-l-2 border-l-emerald-500" : ""
                        }`}
                      >
                        <div className="absolute right-4 top-4">
                          <button
                            type="button"
                            className="grid h-9 w-9 place-items-center rounded-full border border-zinc-900/10 bg-white text-zinc-700 shadow-sm transition hover:bg-zinc-50 active:scale-95 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
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
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                              {isPrimary ? "Primary" : "Secondary"}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              className={`inline-flex h-9 items-center justify-center rounded-xl px-3 text-xs font-semibold shadow-sm transition sm:h-10 sm:px-4 sm:text-sm ${
                                isPrimary
                                  ? "bg-emerald-600 text-white hover:bg-emerald-500"
                                  : "border border-zinc-900/10 bg-white text-zinc-950 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
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
                              className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-3 text-xs font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:px-4 sm:text-sm dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
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
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-medium">Shop image</div>
                              <label className="relative inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800">
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

                            <div className="overflow-hidden rounded-2xl border border-zinc-900/10 bg-white/60 dark:border-white/10 dark:bg-zinc-950/30">
                              <div className="relative aspect-video w-full bg-zinc-100 dark:bg-zinc-950">
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
                                  <div className="absolute inset-0 grid place-items-center bg-gradient-to-tr from-indigo-500/15 via-fuchsia-500/10 to-emerald-500/10 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                                    16:9 shop image
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                              This image is saved for this specific location.
                            </div>
                          </div>

                          <div className="grid gap-2">
                            <label className="text-sm font-medium" htmlFor={`${loc.id}-gsearch`}>
                              Search on Google Maps
                            </label>
                            <input
                              id={`${loc.id}-gsearch`}
                              ref={(node) => attachAutocomplete(node, loc.id)}
                              className="h-11 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none ring-0 transition focus:border-zinc-900/20 focus:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-zinc-900 dark:focus:border-white/20 dark:focus:bg-zinc-900"
                              placeholder={
                                googleMapsKey
                                  ? "Start typing an address…"
                                  : "Google Maps not configured — enter address manually"
                              }
                              disabled={!googleMapsKey || Boolean(googleError)}
                              onChange={() => {
                                setSubmitState({ status: "idle" });
                              }}
                            />
                            {googleError && (
                              <div className="text-xs text-rose-600 dark:text-rose-300">
                                {googleError}
                              </div>
                            )}
                          </div>

                          <div className="grid gap-2">
                            <label className="text-sm font-medium" htmlFor={`${loc.id}-address1`}>
                              Address line 1
                            </label>
                            <input
                              id={`${loc.id}-address1`}
                              className="h-11 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none ring-0 transition focus:border-zinc-900/20 focus:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:focus:border-white/20 dark:focus:bg-zinc-900"
                              value={loc.addressLine1}
                              onChange={(e) => {
                                const value = e.target.value;
                                setLocations((prev) =>
                                  prev.map((item) =>
                                    item.id === loc.id ? { ...item, addressLine1: value } : item
                                  )
                                );
                                setSubmitState({ status: "idle" });
                              }}
                              placeholder="Street / area"
                            />
                          </div>

                          <div className="grid gap-2">
                            <label className="text-sm font-medium" htmlFor={`${loc.id}-address2`}>
                              Address line 2
                            </label>
                            <input
                              id={`${loc.id}-address2`}
                              className="h-11 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none ring-0 transition focus:border-zinc-900/20 focus:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:focus:border-white/20 dark:focus:bg-zinc-900"
                              value={loc.addressLine2}
                              onChange={(e) => {
                                const value = e.target.value;
                                setLocations((prev) =>
                                  prev.map((item) =>
                                    item.id === loc.id ? { ...item, addressLine2: value } : item
                                  )
                                );
                                setSubmitState({ status: "idle" });
                              }}
                              placeholder="Building / floor (optional)"
                            />
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="grid gap-2">
                              <label className="text-sm font-medium" htmlFor={`${loc.id}-city`}>
                                City
                              </label>
                              <input
                                id={`${loc.id}-city`}
                                className="h-11 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none ring-0 transition focus:border-zinc-900/20 focus:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:focus:border-white/20 dark:focus:bg-zinc-900"
                                value={loc.city}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setLocations((prev) =>
                                    prev.map((item) =>
                                      item.id === loc.id ? { ...item, city: value } : item
                                    )
                                  );
                                  setSubmitState({ status: "idle" });
                                }}
                              />
                            </div>

                            <div className="grid gap-2">
                              <label className="text-sm font-medium" htmlFor={`${loc.id}-state`}>
                                State
                              </label>
                              <input
                                id={`${loc.id}-state`}
                                className="h-11 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none ring-0 transition focus:border-zinc-900/20 focus:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:focus:border-white/20 dark:focus:bg-zinc-900"
                                value={loc.state}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setLocations((prev) =>
                                    prev.map((item) =>
                                      item.id === loc.id ? { ...item, state: value } : item
                                    )
                                  );
                                  setSubmitState({ status: "idle" });
                                }}
                              />
                            </div>

                            <div className="grid gap-2">
                              <label className="text-sm font-medium" htmlFor={`${loc.id}-pincode`}>
                                Pincode
                              </label>
                              <input
                                id={`${loc.id}-pincode`}
                                inputMode="numeric"
                                className="h-11 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none ring-0 transition focus:border-zinc-900/20 focus:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:focus:border-white/20 dark:focus:bg-zinc-900"
                                value={loc.pincode}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setLocations((prev) =>
                                    prev.map((item) =>
                                      item.id === loc.id ? { ...item, pincode: value } : item
                                    )
                                  );
                                  setSubmitState({ status: "idle" });
                                }}
                              />
                            </div>

                            <div className="grid gap-2">
                              <label className="text-sm font-medium" htmlFor={`${loc.id}-landmark`}>
                                Landmark
                              </label>
                              <input
                                id={`${loc.id}-landmark`}
                                className="h-11 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none ring-0 transition focus:border-zinc-900/20 focus:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:focus:border-white/20 dark:focus:bg-zinc-900"
                                value={loc.landmark}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setLocations((prev) =>
                                    prev.map((item) =>
                                      item.id === loc.id ? { ...item, landmark: value } : item
                                    )
                                  );
                                  setSubmitState({ status: "idle" });
                                }}
                              />
                            </div>
                          </div>

                          <div className="grid gap-2">
                            <label className="text-sm font-medium" htmlFor={`${loc.id}-contactNumber`}>
                              Contact number
                            </label>
                            <input
                              id={`${loc.id}-contactNumber`}
                              inputMode="tel"
                              className="h-11 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none ring-0 transition focus:border-zinc-900/20 focus:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:focus:border-white/20 dark:focus:bg-zinc-900"
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
                                <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                  Set opening hours for this location.
                                </div>
                              </div>

                              <button
                                type="button"
                                className={`inline-flex h-9 items-center justify-center rounded-xl px-3 text-xs font-semibold shadow-sm transition sm:h-10 sm:px-4 sm:text-sm ${
                                  hours.enabled
                                    ? "bg-indigo-600 text-white hover:bg-indigo-500"
                                    : "border border-zinc-900/10 bg-white text-zinc-950 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
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

                            <div className="grid gap-2">
                              <label className="text-sm font-medium" htmlFor={`${loc.id}-timezone`}>
                                Timezone
                              </label>
                              <input
                                id={`${loc.id}-timezone`}
                                className="h-10 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none ring-0 transition focus:border-zinc-900/20 focus:bg-zinc-50 sm:h-11 dark:border-white/10 dark:bg-zinc-900 dark:focus:border-white/20 dark:focus:bg-zinc-900"
                                value={hours.timezone}
                                onChange={(e) => {
                                  const next = { ...hours, timezone: e.target.value };
                                  setLocations((prev) =>
                                    prev.map((item) =>
                                      item.id === loc.id ? { ...item, businessHours: next } : item
                                    )
                                  );
                                  setSubmitState({ status: "idle" });
                                }}
                                placeholder="Asia/Kathmandu"
                              />
                            </div>

                            <div className="grid gap-2 sm:gap-3">
                              {DAY_LABELS.map(({ key, label }) => {
                                const day = hours.days[key];
                                return (
                                  <div
                                    key={key}
                                    className="grid gap-2 border-b border-zinc-900/10 py-3 last:border-b-0 dark:border-white/10"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                                      <div className="text-sm font-semibold">{label}</div>
                                      <button
                                        type="button"
                                        className={`inline-flex h-8 items-center justify-center rounded-xl px-3 text-xs font-semibold shadow-sm transition sm:h-9 ${
                                          day.open
                                            ? "bg-emerald-600 text-white hover:bg-emerald-500"
                                            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
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
                                              item.id === loc.id ? { ...item, businessHours: next } : item
                                            )
                                          );
                                          setSubmitState({ status: "idle" });
                                        }}
                                      >
                                        {day.open ? "Open" : "Closed"}
                                      </button>
                                    </div>

                                    {day.open ? (
                                      <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                                        <div className="grid gap-1">
                                          <div className="text-xs font-medium text-zinc-600 dark:text-zinc-300">From</div>
                                          <input
                                            type="time"
                                            className="h-10 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none ring-0 transition focus:border-zinc-900/20 focus:bg-zinc-50 sm:h-11 dark:border-white/10 dark:bg-zinc-950 dark:focus:border-white/20"
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
                                                  item.id === loc.id ? { ...item, businessHours: next } : item
                                                )
                                              );
                                              setSubmitState({ status: "idle" });
                                            }}
                                          />
                                        </div>
                                        <div className="grid gap-1">
                                          <div className="text-xs font-medium text-zinc-600 dark:text-zinc-300">To</div>
                                          <input
                                            type="time"
                                            className="h-10 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none ring-0 transition focus:border-zinc-900/20 focus:bg-zinc-50 sm:h-11 dark:border-white/10 dark:bg-zinc-950 dark:focus:border-white/20"
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
                                                  item.id === loc.id ? { ...item, businessHours: next } : item
                                                )
                                              );
                                              setSubmitState({ status: "idle" });
                                            }}
                                          />
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-xs text-zinc-500 dark:text-zinc-400">Closed</div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
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
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                  }`}
                  role="status"
                >
                  {submitState.message}
                </div>
              )}

              <button
                type="submit"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-zinc-950 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
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
