"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

type BusinessDraftResponse = {
  ok?: boolean;
  business?:
    | {
        businessCategory?: string;
        otherCategoryName?: string;
        vehicleTypes?: string[];
        shopType?: string;
        brands?: string[];
      }
    | null;
};

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

type VehicleType = (typeof VEHICLE_TYPES)[number];

const SHOP_TYPES = ["authorised shop", "local shop"] as const;

type ShopType = (typeof SHOP_TYPES)[number];

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

type BrandId = (typeof BRANDS)[number]["id"];

export default function RegisterCategoryPage() {
  const router = useRouter();
  const [businessCategory, setBusinessCategory] = useState<BusinessCategory | "">("");
  const [otherCategoryName, setOtherCategoryName] = useState("");
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [shopType, setShopType] = useState<ShopType | "">("");
  const [brands, setBrands] = useState<BrandId[]>([]);
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });

  const needsVehicleTypes = useMemo(() => {
    if (!businessCategory) return false;
    return VEHICLE_CATEGORIES.has(businessCategory);
  }, [businessCategory]);

  const validationError = useMemo(() => {
    if (!businessCategory) return "Please select your business category.";
    if (businessCategory === "Others" && !otherCategoryName.trim())
      return "Please enter category name.";
    if (needsVehicleTypes && vehicleTypes.length === 0)
      return "Please select at least one vehicle type.";
    if (!needsVehicleTypes && !shopType) return "Please select your shop type.";

    if (!needsVehicleTypes && shopType === "authorised shop" && brands.length !== 1) {
      return "Please select exactly one brand.";
    }

    if (!needsVehicleTypes && shopType === "local shop") {
      if (brands.length === 0) return "Please select at least one brand.";
      if (brands.length > 5) return "You can select up to 5 brands.";
    }
    return null;
  }, [
    brands.length,
    businessCategory,
    needsVehicleTypes,
    otherCategoryName,
    shopType,
    vehicleTypes.length,
  ]);

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

        const nextCategory = (data.business.businessCategory ?? "") as
          | BusinessCategory
          | "";
        const nextOtherCategoryName =
          typeof data.business.otherCategoryName === "string" ? data.business.otherCategoryName : "";
        const nextShopType = (data.business.shopType ?? "") as ShopType | "";
        const nextVehicleTypes = Array.isArray(data.business.vehicleTypes)
          ? (data.business.vehicleTypes as VehicleType[])
          : [];
        const nextBrands = Array.isArray(data.business.brands)
          ? (data.business.brands as BrandId[])
          : [];

        setBusinessCategory(
          (BUSINESS_CATEGORIES as readonly string[]).includes(nextCategory)
            ? nextCategory
            : ""
        );
        setOtherCategoryName(nextOtherCategoryName);

        setShopType((SHOP_TYPES as readonly string[]).includes(nextShopType) ? nextShopType : "");
        setVehicleTypes(
          nextVehicleTypes.filter((value) =>
            (VEHICLE_TYPES as readonly string[]).includes(value)
          )
        );
        setBrands(
          nextBrands.filter((value) =>
            (BRANDS as readonly { id: string; name: string }[]).some(
              (brand) => brand.id === value
            )
          )
        );
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
      payload.append("businessCategory", businessCategory);
      if (businessCategory === "Others") {
        payload.append("otherCategoryName", otherCategoryName.trim());
      } else {
        payload.append("otherCategoryName", "");
      }

      if (needsVehicleTypes) {
        for (const type of vehicleTypes) payload.append("vehicleTypes", type);
        payload.append("shopType", "");
        payload.append("brands", "");
      } else {
        payload.append("shopType", shopType);
        payload.append("vehicleTypes", "");

        for (const brand of brands) payload.append("brands", brand);
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

      setSubmitState({
        status: "success",
        message: data?.message || "Draft saved.",
      });

      router.push("/register/location");
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
                href="/register"
              >
                Back
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="overflow-hidden rounded-3xl border border-zinc-900/10 bg-white shadow-xl dark:border-white/10 dark:bg-zinc-900">
            <div className="border-b border-zinc-900/10 px-6 py-5 dark:border-white/10">
              <div className="text-lg font-semibold tracking-tight">Business category</div>
              <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                Help us understand what type of business you run.
              </div>
            </div>

            <form className="grid gap-4 p-6 sm:p-8" onSubmit={onSubmit}>
              <div className="grid gap-2">
                <div className="text-sm font-medium">Category</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {BUSINESS_CATEGORIES.map((category) => {
                    const active = businessCategory === category;
                    return (
                      <label
                        key={category}
                        className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium shadow-sm transition active:scale-[0.99] ${
                          active
                            ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                            : "border-zinc-900/10 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
                        }`}
                      >
                        <span className="min-w-0 truncate">{category}</span>
                        <input
                          type="radio"
                          name="businessCategory"
                          checked={active}
                          onChange={() => {
                            setBusinessCategory(category);
                            if (category !== "Others") setOtherCategoryName("");
                            setVehicleTypes([]);
                            setShopType("");
                            setBrands([]);
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

              {businessCategory === "Others" && (
                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="otherCategoryName">
                    Category name
                  </label>
                  <input
                    id="otherCategoryName"
                    className="h-11 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none ring-0 transition focus:border-zinc-900/20 focus:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:focus:border-white/20 dark:focus:bg-zinc-950"
                    value={otherCategoryName}
                    onChange={(e) => {
                      setOtherCategoryName(e.target.value);
                      setSubmitState({ status: "idle" });
                    }}
                    placeholder="Enter your category"
                  />
                </div>
              )}

              {businessCategory && needsVehicleTypes && (
                <div className="grid gap-2">
                  <div className="text-sm font-medium">Vehicle type</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {VEHICLE_TYPES.map((type) => {
                      const checked = vehicleTypes.includes(type);
                      return (
                        <label
                          key={type}
                          className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium shadow-sm transition active:scale-[0.99] ${
                            checked
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : "border-zinc-900/10 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
                          }`}
                        >
                          <span className="min-w-0 truncate">{type}</span>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setVehicleTypes((prev) =>
                                checked
                                  ? prev.filter((value) => value !== type)
                                  : [...prev, type]
                              );
                              setSubmitState({ status: "idle" });
                            }}
                            className="peer sr-only"
                          />
                          <span
                            className="relative h-6 w-6 flex-none rounded-lg border border-zinc-900/20 bg-white shadow-sm transition peer-checked:border-emerald-600 peer-checked:bg-emerald-600 dark:border-white/15 dark:bg-zinc-950 after:absolute after:left-[8px] after:top-[4px] after:h-[12px] after:w-[6px] after:rotate-45 after:border-b-2 after:border-r-2 after:border-white after:opacity-0 after:transition peer-checked:after:opacity-100"
                            aria-hidden="true"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {businessCategory && !needsVehicleTypes && (
                <div className="grid gap-2">
                  <div className="text-sm font-medium">Shop type</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {SHOP_TYPES.map((type) => {
                      const active = shopType === type;
                      return (
                        <label
                          key={type}
                          className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium shadow-sm transition active:scale-[0.99] ${
                            active
                              ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                              : "border-zinc-900/10 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
                          }`}
                        >
                          <span className="min-w-0 truncate">{type}</span>
                          <input
                            type="radio"
                            name="shopType"
                            checked={active}
                            onChange={() => {
                              setShopType(type);
                              setBrands([]);
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
              )}

              {businessCategory && !needsVehicleTypes && shopType && (
                <div className="grid gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium">Brands</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {shopType === "authorised shop"
                        ? "Select 1"
                        : `Select up to 5 (${brands.length}/5)`}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {BRANDS.map((brand) => {
                      const active = brands.includes(brand.id);
                      const limitReached = shopType === "local shop" && !active && brands.length >= 5;
                      const disabled = shopType === "local shop" ? limitReached : false;

                      return (
                        <label
                          key={brand.id}
                          className={`relative flex w-full flex-col items-center justify-center gap-2 rounded-2xl border px-3 py-4 text-center shadow-sm transition active:scale-[0.99] ${
                            active
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : "border-zinc-900/10 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
                          } ${
                            disabled
                              ? "cursor-not-allowed opacity-60"
                              : "cursor-pointer"
                          }`}
                          aria-disabled={disabled}
                        >
                          <span
                            className="grid h-14 w-14 place-items-center rounded-3xl border border-zinc-900/10 bg-white text-sm font-semibold text-zinc-700 shadow-sm dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-200"
                            aria-hidden="true"
                          >
                            {brand.name.slice(0, 2).toUpperCase()}
                          </span>
                          <span className="w-full truncate text-xs font-semibold leading-tight">
                            {brand.name}
                          </span>
                          <input
                            type={shopType === "authorised shop" ? "radio" : "checkbox"}
                            name={shopType === "authorised shop" ? "brand" : undefined}
                            checked={active}
                            disabled={disabled}
                            onChange={() => {
                              setSubmitState({ status: "idle" });

                              if (shopType === "authorised shop") {
                                setBrands([brand.id]);
                                return;
                              }

                              setBrands((prev) =>
                                prev.includes(brand.id)
                                  ? prev.filter((id) => id !== brand.id)
                                  : [...prev, brand.id]
                              );
                            }}
                            className="peer sr-only"
                            aria-label={brand.name}
                          />

                          <span
                            className={`absolute right-2 top-2 h-7 w-7 rounded-xl border bg-white shadow-sm transition dark:bg-zinc-950 ${
                              shopType === "authorised shop"
                                ? "peer-checked:border-emerald-600"
                                : "peer-checked:border-emerald-600 peer-checked:bg-emerald-600"
                            } border-zinc-900/15 dark:border-white/15 ${
                              shopType === "authorised shop"
                                ? "after:absolute after:left-1/2 after:top-1/2 after:h-3 after:w-3 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:bg-emerald-600 after:opacity-0 after:transition peer-checked:after:opacity-100"
                                : "after:absolute after:left-[10px] after:top-[6px] after:h-[12px] after:w-[6px] after:rotate-45 after:border-b-2 after:border-r-2 after:border-white after:opacity-0 after:transition peer-checked:after:opacity-100"
                            }`}
                            aria-hidden="true"
                          />
                        </label>
                      );
                    })}
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
