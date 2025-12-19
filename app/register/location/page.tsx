"use client";

import Image from "next/image";
import Link from "next/link";
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
    google?: any;
  }
}

let googleMapsScriptPromise: Promise<void> | null = null;

function loadGoogleMapsScript(apiKey: string) {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps?.places) return Promise.resolve();

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
  };
}

export default function RegisterLocationPage() {
  const router = useRouter();

  const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const [googleReady, setGoogleReady] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const autocompleteByIdRef = useRef<Record<string, any>>({});

  const [businessType, setBusinessType] = useState<"online" | "offline" | "both" | "">("");
  const [locations, setLocations] = useState<BusinessLocation[]>([createEmptyLocation()]);
  const [primaryLocationId, setPrimaryLocationId] = useState<string>(locations[0]?.id ?? "");
  const [shopImageFile, setShopImageFile] = useState<File | null>(null);
  const [shopImagePreviewUrl, setShopImagePreviewUrl] = useState<string | null>(null);
  const [existingShopImageLocationId, setExistingShopImageLocationId] = useState<string>("");
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const needsShopImage = businessType === "offline" || businessType === "both";
  const hasExistingPrimaryShopImage =
    Boolean(existingShopImageLocationId) && existingShopImageLocationId === primaryLocationId;

  useEffect(() => {
    let cancelled = false;
    if (!googleMapsKey) {
      setGoogleReady(false);
      setGoogleError(null);
      return;
    }

    void loadGoogleMapsScript(googleMapsKey)
      .then(() => {
        if (cancelled) return;
        if (!window.google?.maps?.places) {
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
        window.google?.maps?.event?.clearInstanceListeners?.(instance);
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
    if (!window.google?.maps?.places?.Autocomplete) return;

    const instance = new window.google.maps.places.Autocomplete(node, {
      fields: ["address_components", "formatted_address", "name"],
      types: ["geocode"],
    });

    instance.addListener("place_changed", () => {
      const place = instance.getPlace?.();
      const components = place?.address_components as
        | Array<{ long_name: string; short_name: string; types: string[] }>
        | undefined;

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

  useEffect(() => {
    setPrimaryLocationId((prev) => {
      if (prev && locations.some((loc) => loc.id === prev)) return prev;
      return locations[0]?.id ?? "";
    });
  }, [locations]);

  useEffect(() => {
    if (!shopImageFile) {
      setShopImagePreviewUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(shopImageFile);
    setShopImagePreviewUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [shopImageFile]);

  const validationError = useMemo(() => {
    if (!businessType) return "Please select your business type.";
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

    if (needsShopImage && !shopImageFile && !hasExistingPrimaryShopImage) {
      return "Please upload a shop image.";
    }

    return null;
  }, [businessType, hasExistingPrimaryShopImage, locations, needsShopImage, primaryLocationId, shopImageFile]);

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
            nextLocations.map((loc) => ({
              id: typeof loc.id === "string" && loc.id ? loc.id : makeId(),
              addressLine1: typeof loc.addressLine1 === "string" ? loc.addressLine1 : "",
              addressLine2: typeof loc.addressLine2 === "string" ? loc.addressLine2 : "",
              city: typeof loc.city === "string" ? loc.city : "",
              state: typeof loc.state === "string" ? loc.state : "",
              pincode: typeof loc.pincode === "string" ? loc.pincode : "",
              landmark: typeof loc.landmark === "string" ? loc.landmark : "",
            }))
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
      const payload = new FormData();
      payload.append("businessType", businessType);
      payload.append("businessLocations", JSON.stringify(locations));
      payload.append("primaryBusinessLocationId", primaryLocationId);

      if (shopImageFile) {
        payload.append("shopImage", shopImageFile);
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
      router.refresh();
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

        <header className="sticky top-0 z-30 border-b border-zinc-900/5 bg-zinc-50/70 backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/60">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-semibold tracking-tight">GEM Business</div>
              <div className="truncate text-xs text-zinc-600 dark:text-zinc-400">
                Business registration
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
                href="/register/category"
              >
                Back
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="overflow-hidden rounded-3xl border border-zinc-900/10 bg-white shadow-xl dark:border-white/10 dark:bg-zinc-900">
            <div className="border-b border-zinc-900/10 px-6 py-5 dark:border-white/10">
              <div className="text-lg font-semibold tracking-tight">Business location</div>
              <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                Add one or more locations and choose a primary address.
              </div>
            </div>

            <form className="grid gap-5 p-6 sm:p-8" onSubmit={onSubmit}>
              <div className="grid gap-2">
                <div className="text-sm font-medium">Business type</div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {([
                    { value: "offline", label: "Offline" },
                    { value: "online", label: "Online" },
                    { value: "both", label: "Both" },
                  ] as const).map((option) => {
                    const active = businessType === option.value;
                    return (
                      <label
                        key={option.value}
                        className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium shadow-sm transition active:scale-[0.99] ${
                          active
                            ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                            : "border-zinc-900/10 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
                        }`}
                      >
                        <span className="min-w-0 truncate">{option.label}</span>
                        <input
                          type="radio"
                          name="businessType"
                          checked={active}
                          onChange={() => {
                            setBusinessType(option.value);
                            setSubmitState({ status: "idle" });
                          }}
                          className="peer sr-only"
                        />
                        <span
                          className="relative h-6 w-6 flex-none rounded-full border border-zinc-900/20 bg-white shadow-sm transition peer-checked:border-indigo-600 dark:border-white/15 dark:bg-zinc-950 after:absolute after:left-1/2 after:top-1/2 after:h-3 after:w-3 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:bg-indigo-600 after:opacity-0 after:transition peer-checked:after:opacity-100"
                          aria-hidden="true"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

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

                <div className="grid gap-3">
                  {locations.map((loc, index) => {
                    const isPrimary = loc.id === primaryLocationId;
                    const isCollapsed = collapsedIds.has(loc.id);
                    return (
                      <div
                        key={loc.id}
                        className={`relative rounded-3xl border p-5 shadow-sm transition dark:bg-zinc-950 ${
                          isPrimary
                            ? "border-emerald-500/25 bg-emerald-500/5"
                            : "border-zinc-900/10 bg-white dark:border-white/10"
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

                        <div className="flex flex-wrap items-center justify-between gap-3 pr-14">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold tracking-tight">
                              Location {index + 1}
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                              {isPrimary ? "Primary" : "Secondary"}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className={`inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold shadow-sm transition ${
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
                              className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
                              disabled={locations.length === 1}
                              onClick={() => {
                                setLocations((prev) => {
                                  const next = prev.filter((item) => item.id !== loc.id);
                                  return next.length ? next : [createEmptyLocation()];
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
                          className={`mt-4 grid gap-3 overflow-hidden transition-all duration-300 ${
                            isCollapsed ? "max-h-0 opacity-0 -translate-y-2" : "max-h-[1600px] opacity-100 translate-y-0"
                          }`}
                          aria-hidden={isCollapsed}
                        >
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
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {needsShopImage && (
                <div className="grid gap-3">
                  <div className="text-sm font-medium">Shop image (for offline business)</div>

                  <div className="flex flex-col gap-4 rounded-3xl border border-zinc-900/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-950">
                    <div className="flex items-center gap-4">
                      <div className="rounded-3xl bg-gradient-to-tr from-indigo-500/60 via-fuchsia-500/40 to-emerald-500/40 p-[1px] shadow-sm">
                        <div className="grid h-20 w-24 place-items-center overflow-hidden rounded-3xl bg-white text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                          {shopImagePreviewUrl ? (
                            <Image
                              src={shopImagePreviewUrl}
                              alt="Shop image preview"
                              width={96}
                              height={80}
                              className="h-full w-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <span className="text-xs font-semibold">
                              {hasExistingPrimaryShopImage ? "Uploaded" : "Image"}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <label className="relative inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800">
                          Choose from gallery
                          <input
                            type="file"
                            accept="image/*"
                            className="absolute h-px w-px opacity-0"
                            onChange={(e) => {
                              const nextFile = e.target.files?.[0] ?? null;
                              setShopImageFile(nextFile);
                              setSubmitState({ status: "idle" });
                            }}
                          />
                        </label>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          This will be saved for your primary location.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
