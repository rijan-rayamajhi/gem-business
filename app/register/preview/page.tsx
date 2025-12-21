"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type BusinessLocation = {
  id: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  landmark: string;
  contactNumber?: string;
  shopImageUrl?: string;
  businessHours?: unknown;
};

type BusinessDraft = {
  status?: string;
  businessName?: string;
  businessDescription?: string;
  businessType?: string;
  email?: string;
  website?: string;
  gstNumber?: string;
  gstDocumentUrl?: string;
  businessRole?: string;
  name?: string;
  contactNo?: string;
  whatsappNo?: string;
  businessLogoUrl?: string;
  businessCategory?: string;
  otherCategoryName?: string;
  vehicleTypes?: string[];
  shopType?: string;
  brands?: string[];
  businessLocations?: BusinessLocation[];
  primaryBusinessLocationId?: string;
  primaryShopImage?: unknown;
};

type BusinessDraftResponse = {
  ok?: boolean;
  business?: BusinessDraft | null;
};

type LoadState =
  | { status: "loading" }
  | { status: "ready"; business: BusinessDraft | null }
  | { status: "error"; message: string };

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; message: string };

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

function formatAddress(loc: BusinessLocation) {
  const parts = [loc.addressLine1, loc.addressLine2, loc.landmark, loc.city, loc.state, loc.pincode]
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);
  return parts.join(", ");
}

export default function RegisterPreviewPage() {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });

  useEffect(() => {
    const token = (() => {
      try {
        return sessionStorage.getItem("gem_id_token");
      } catch {
        return null;
      }
    })();

    if (!token) {
      queueMicrotask(() => {
        setState({ status: "error", message: "Please open this page from the mobile app." });
      });
      return;
    }

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

        if (!res.ok) {
          setState({ status: "error", message: "Failed to load preview. Please try again." });
          return;
        }

        const data = (await res.json().catch(() => null)) as BusinessDraftResponse | null;
        if (!data?.ok) {
          setState({ status: "error", message: "Failed to load preview. Please try again." });
          return;
        }

        setState({ status: "ready", business: data.business ?? null });
      } catch {
        setState({ status: "error", message: "Network error. Please try again." });
      }
    };

    void run();
    return () => controller.abort();
  }, []);

  const primaryLocation = useMemo(() => {
    if (state.status !== "ready") return null;
    const business = state.business;
    const locations = Array.isArray(business?.businessLocations) ? business?.businessLocations : [];
    const primaryId = typeof business?.primaryBusinessLocationId === "string" ? business.primaryBusinessLocationId : "";
    return locations.find((loc) => loc.id === primaryId) ?? locations[0] ?? null;
  }, [state]);

  const primaryShopImageUrl = useMemo(() => {
    if (state.status !== "ready") return "";
    const business = state.business;
    const primaryShopImageObj =
      business?.primaryShopImage && typeof business.primaryShopImage === "object"
        ? (business.primaryShopImage as Record<string, unknown>)
        : null;
    const url = primaryShopImageObj && typeof primaryShopImageObj.url === "string" ? primaryShopImageObj.url : "";
    return url || primaryLocation?.shopImageUrl || "";
  }, [primaryLocation, state]);

  if (state.status === "loading") {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-950">
        <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
          <div className="rounded-2xl border border-zinc-900/10 bg-white/60 p-6 text-sm text-zinc-600 shadow-sm">
            Loading preview…
          </div>
        </main>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-950">
        <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-700 shadow-sm">
            {state.message}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-900"
              onClick={() => router.push("/register/location")}
            >
              Back
            </button>
          </div>
        </main>
      </div>
    );
  }

  const business = state.business;
  const locations = Array.isArray(business?.businessLocations) ? business.businessLocations : [];
  const category = (business?.businessCategory ?? "").trim();
  const otherCategoryName = (business?.otherCategoryName ?? "").trim();
  const businessType = (business?.businessType ?? "").trim();

  const businessStatus = asBusinessStatus(business?.status);
  const isLocked = businessStatus === "submitted" || businessStatus === "pending" || businessStatus === "verified";

  const canSubmit = submitState.status !== "submitting" && !isLocked;

  async function onSubmit() {
    if (!canSubmit) return;

    router.push("/register/kyc");
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-zinc-950/20 via-zinc-700/10 to-zinc-200/15 blur-3xl" />
          <div className="absolute -bottom-40 right-0 h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-zinc-950/0 via-zinc-700/10 to-zinc-950/0 blur-3xl" />
        </div>

        <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-12">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-lg font-semibold tracking-tight">Preview your business details</div>
              <div className="mt-1 text-sm text-zinc-600">
                Please review everything before submitting.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {!isLocked ? (
                <>
                  <Link
                    href="/register"
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50"
                  >
                    Edit basic info
                  </Link>
                  <Link
                    href="/register/category"
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50"
                  >
                    Edit category
                  </Link>
                  <Link
                    href="/register/location"
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50"
                  >
                    Edit location
                  </Link>
                </>
              ) : (
                <Link
                  href="/register/verification"
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50"
                >
                  View verification status
                </Link>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-5">
            {businessType !== "online" ? (
              <div className="overflow-hidden rounded-2xl border border-zinc-900/10 bg-white/60 shadow-sm">
                <div className="relative aspect-video w-full bg-zinc-100">
                  {primaryShopImageUrl ? (
                    <Image
                      src={primaryShopImageUrl}
                      alt="Primary shop image"
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
                    <div className="text-sm font-semibold tracking-tight text-white">
                      {primaryLocation?.landmark?.trim() || "Primary location"}
                    </div>
                    <div className="mt-1 text-xs text-zinc-200">
                      {primaryLocation ? formatAddress(primaryLocation) : "Add a location to continue"}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-zinc-900/10 bg-white/60 p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">Business</div>
                  {business?.businessLogoUrl ? (
                    <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-zinc-900/10 bg-white">
                      <Image
                        src={business.businessLogoUrl}
                        alt="Business logo"
                        fill
                        className="object-cover"
                        sizes="40px"
                        unoptimized
                      />
                    </div>
                  ) : null}
                </div>

                <div className="mt-3 grid gap-2 text-sm">
                  <div className="grid gap-1">
                    <div className="text-xs font-medium text-zinc-500">Business name</div>
                    <div className="font-semibold">{(business?.businessName ?? "-") || "-"}</div>
                  </div>
                  <div className="grid gap-1">
                    <div className="text-xs font-medium text-zinc-500">Description</div>
                    <div className="text-zinc-700">
                      {(business?.businessDescription ?? "-") || "-"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-900/10 bg-white/60 p-5 shadow-sm">
                <div className="text-sm font-semibold">Category & type</div>

                <div className="mt-3 grid gap-2 text-sm">
                  <div className="grid gap-1">
                    <div className="text-xs font-medium text-zinc-500">Category</div>
                    <div className="font-semibold">
                      {category || "-"}
                      {category === "Others" && otherCategoryName ? ` (${otherCategoryName})` : ""}
                    </div>
                  </div>

                  <div className="grid gap-1">
                    <div className="text-xs font-medium text-zinc-500">Business type</div>
                    <div className="font-semibold">{(business?.businessType ?? "-") || "-"}</div>
                  </div>

                  <div className="grid gap-1">
                    <div className="text-xs font-medium text-zinc-500">Shop type</div>
                    <div className="font-semibold">{(business?.shopType ?? "-") || "-"}</div>
                  </div>

                  <div className="grid gap-1">
                    <div className="text-xs font-medium text-zinc-500">Vehicle types</div>
                    <div className="text-zinc-700">
                      {Array.isArray(business?.vehicleTypes) && business.vehicleTypes.length
                        ? business.vehicleTypes.join(", ")
                        : "-"}
                    </div>
                  </div>

                  <div className="grid gap-1">
                    <div className="text-xs font-medium text-zinc-500">Brands</div>
                    <div className="text-zinc-700">
                      {Array.isArray(business?.brands) && business.brands.length ? business.brands.join(", ") : "-"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-900/10 bg-white/60 p-5 shadow-sm">
                <div className="text-sm font-semibold">Contact</div>
                <div className="mt-3 grid gap-2 text-sm">
                  <div className="grid gap-1">
                    <div className="text-xs font-medium text-zinc-500">Your name</div>
                    <div className="font-semibold">{(business?.name ?? "-") || "-"}</div>
                  </div>
                  <div className="grid gap-1">
                    <div className="text-xs font-medium text-zinc-500">Role</div>
                    <div className="font-semibold">{(business?.businessRole ?? "-") || "-"}</div>
                  </div>
                  <div className="grid gap-1">
                    <div className="text-xs font-medium text-zinc-500">Contact number</div>
                    <div className="font-semibold">{(business?.contactNo ?? "-") || "-"}</div>
                  </div>
                  <div className="grid gap-1">
                    <div className="text-xs font-medium text-zinc-500">WhatsApp number</div>
                    <div className="font-semibold">{(business?.whatsappNo ?? "-") || "-"}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-900/10 bg-white/60 p-5 shadow-sm">
                <div className="text-sm font-semibold">Business details</div>
                <div className="mt-3 grid gap-2 text-sm">
                  <div className="grid gap-1">
                    <div className="text-xs font-medium text-zinc-500">Email</div>
                    <div className="font-semibold">{(business?.email ?? "-") || "-"}</div>
                  </div>
                  <div className="grid gap-1">
                    <div className="text-xs font-medium text-zinc-500">Website</div>
                    <div className="font-semibold">{(business?.website ?? "-") || "-"}</div>
                  </div>
                  <div className="grid gap-1">
                    <div className="text-xs font-medium text-zinc-500">GST number</div>
                    <div className="font-semibold">{(business?.gstNumber ?? "-") || "-"}</div>
                  </div>
                  <div className="grid gap-1">
                    <div className="text-xs font-medium text-zinc-500">GST document</div>
                    {business?.gstDocumentUrl ? (
                      <a
                        href={business.gstDocumentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex w-fit items-center rounded-xl border border-zinc-900/10 bg-white px-3 py-2 text-xs font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50"
                      >
                        View document
                      </a>
                    ) : (
                      <div className="text-zinc-700">-</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-900/10 bg-white/60 p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Locations</div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {locations.length ? `${locations.length} location(s)` : "No locations added yet"}
                  </div>
                </div>
              </div>

              {locations.length ? (
                <div className="mt-4 grid gap-3">
                  {locations.map((loc, index) => {
                    const isPrimary = loc.id === business?.primaryBusinessLocationId;
                    return (
                      <div
                        key={loc.id || index}
                        className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${
                          isPrimary
                            ? "border-emerald-500/20 bg-emerald-500/10"
                            : "border-zinc-900/10 bg-white/60"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-semibold">
                            Location {index + 1}
                            {isPrimary ? " (Primary)" : ""}
                          </div>
                          {loc.shopImageUrl ? (
                            <a
                              href={loc.shopImageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-semibold text-zinc-950 hover:underline"
                            >
                              View image
                            </a>
                          ) : null}
                        </div>
                        <div className="mt-1 text-xs text-zinc-600">
                          {formatAddress(loc) || "-"}
                        </div>
                        {loc.contactNumber ? (
                          <div className="mt-2 text-xs text-zinc-600">
                            Contact: {loc.contactNumber}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-900"
                onClick={onSubmit}
                disabled={!canSubmit}
              >
                {submitState.status === "submitting" ? "Submitting…" : isLocked ? "Submitted" : "Submit"}
              </button>
            </div>

            {submitState.status === "error" ? (
              <div
                className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-700 shadow-sm"
                role="status"
              >
                {submitState.message}
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
