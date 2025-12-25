"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type CatalogueItem = {
  id: string;
  imageUrls?: string[];
  title?: string;
  status?: string;
};

type AdsType = "carousel" | "scratch";

function isSafeImgUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const v = value.trim();
  return v.startsWith("https://") || v.startsWith("http://");
}

export default function BoostAdsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const catalogueId = searchParams.get("catalogueId") ?? "";

  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const [item, setItem] = useState<CatalogueItem | null>(null);
  const [loadState, setLoadState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; message: string }
  >(() => {
    if (!catalogueId) return { status: "error", message: "Missing catalogue id." };
    return { status: "idle" };
  });

  const [adsType, setAdsType] = useState<AdsType | null>(null);
  const [touchedAdsType, setTouchedAdsType] = useState(false);

  useEffect(() => {
    setHydrated(true);
    try {
      setToken(sessionStorage.getItem("gem_id_token"));
    } catch {
      setToken(null);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (catalogueId && !token) {
      setLoadState({ status: "error", message: "Missing authentication token." });
    }
  }, [catalogueId, hydrated, token]);

  useEffect(() => {
    if (!catalogueId || !token) return;

    const controller = new AbortController();
    const run = async () => {
      setLoadState({ status: "loading" });
      try {
        const res = await fetch(`/api/catalogue/${encodeURIComponent(catalogueId)}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        const data = (await res.json().catch(() => null)) as
          | { ok?: boolean; item?: unknown; message?: string }
          | null;

        if (!res.ok || !data?.ok || !data.item || typeof data.item !== "object") {
          setLoadState({
            status: "error",
            message: data?.message || "Failed to load catalogue.",
          });
          return;
        }

        const obj = data.item as Record<string, unknown>;
        const id = typeof obj.id === "string" ? obj.id : catalogueId;
        const title = typeof obj.title === "string" ? obj.title : "";
        const status = typeof obj.status === "string" ? obj.status : "";
        const imageUrls = Array.isArray(obj.imageUrls) ? obj.imageUrls.filter(isSafeImgUrl) : [];

        setItem({
          id,
          ...(title ? { title } : {}),
          ...(status ? { status } : {}),
          ...(imageUrls.length ? { imageUrls } : {}),
        });
        setLoadState({ status: "idle" });
      } catch {
        setLoadState({ status: "error", message: "Failed to load catalogue." });
      }
    };

    void run();
    return () => controller.abort();
  }, [catalogueId, token]);

  const primaryImage = useMemo(() => {
    const urls = Array.isArray(item?.imageUrls) ? item?.imageUrls ?? [] : [];
    return urls.length ? urls[0] : "";
  }, [item]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Boost Ads</h1>
          <p className="mt-1 text-sm text-zinc-600">Choose how you want to promote your catalogue.</p>
        </div>

        <button
          type="button"
          className="h-10 rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50"
          onClick={() => router.back()}
        >
          Back
        </button>
      </div>

      {loadState.status === "loading" ? (
        <div className="mt-6 rounded-2xl border border-zinc-900/10 bg-white/60 px-4 py-3 text-sm text-zinc-600 shadow-sm">
          Loading…
        </div>
      ) : null}

      {loadState.status === "error" ? (
        <div className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 shadow-sm">
          {loadState.message}
        </div>
      ) : null}

      {loadState.status === "idle" && item ? (
        <div className="mt-6 grid gap-4">
          <div className="overflow-hidden rounded-2xl border border-zinc-900/10 bg-white shadow-sm">
            <div className="border-b border-zinc-900/10 p-4 sm:p-6">
              <div className="text-sm font-semibold text-zinc-950">Catalogue image</div>
              {primaryImage ? (
                <div className="mt-3 overflow-hidden rounded-xl border border-zinc-900/10 bg-zinc-100">
                  <img
                    src={primaryImage}
                    alt={item.title || "Catalogue"}
                    className="h-56 w-full object-cover"
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="mt-2 text-sm text-zinc-600">No image available.</div>
              )}
            </div>

            <div className="p-4 sm:p-6">
              <div className="text-sm font-semibold text-zinc-950">Select ads type</div>

              <div className="mt-3 grid gap-3">
                {([
                  {
                    key: "carousel" as const,
                    title: "Carousel Ads",
                    description: "Show multiple images in a swipeable carousel.",
                  },
                  {
                    key: "scratch" as const,
                    title: "Scratch Ads",
                    description: "Scratch-to-reveal style promotional ad.",
                  },
                ] as const).map((opt) => {
                  const active = adsType === opt.key;
                  return (
                    <label
                      key={opt.key}
                      className={
                        "flex w-full cursor-pointer items-start justify-between gap-3 rounded-2xl border px-4 py-4 text-left text-sm font-medium transition " +
                        (active
                          ? "border-zinc-950/20 bg-zinc-950/5 text-zinc-950"
                          : "border-zinc-900/10 bg-white text-zinc-900 hover:bg-zinc-50")
                      }
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-zinc-950">{opt.title}</div>
                        <div className="mt-0.5 text-xs text-zinc-600">{opt.description}</div>
                      </div>

                      <input
                        type="radio"
                        name="adsType"
                        checked={active}
                        onChange={() => {
                          setAdsType(opt.key);
                          setTouchedAdsType(true);
                        }}
                        className="peer sr-only"
                      />
                      <span
                        className="relative mt-0.5 h-6 w-6 flex-none rounded-full border border-zinc-900/20 bg-white shadow-sm transition peer-checked:border-zinc-950 after:absolute after:left-1/2 after:top-1/2 after:h-3 after:w-3 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:bg-zinc-950 after:opacity-0 after:transition peer-checked:after:opacity-100"
                        aria-hidden="true"
                      />
                    </label>
                  );
                })}
              </div>

              {touchedAdsType ? (
                <div className="mt-6">
                  <button
                    type="button"
                    className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-zinc-950 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-900"
                    onClick={() => {
                      if (!catalogueId) return;
                      if (!adsType) return;
                      const qs = new URLSearchParams({ catalogueId, adsType });
                      router.push(`/dashboard/boost-ads/goal?${qs.toString()}`);
                    }}
                  >
                    Continue
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
