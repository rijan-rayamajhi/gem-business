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

export default function DashboardBoostAdsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const catalogueId = searchParams.get("catalogueId") ?? "";

  const [item, setItem] = useState<CatalogueItem | null>(null);
  const [loadState, setLoadState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; message: string }
  >({ status: "idle" });

  const [adsType, setAdsType] = useState<AdsType>("carousel");

  useEffect(() => {
    const token = (() => {
      try {
        return sessionStorage.getItem("gem_id_token");
      } catch {
        return null;
      }
    })();

    if (!catalogueId) {
      setLoadState({ status: "error", message: "Missing catalogue id." });
      return;
    }

    if (!token) {
      setLoadState({ status: "error", message: "Missing authentication token." });
      return;
    }

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
  }, [catalogueId]);

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
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-zinc-900/10 bg-white p-4 shadow-sm">
                  <input
                    type="radio"
                    name="adsType"
                    value="carousel"
                    checked={adsType === "carousel"}
                    onChange={() => setAdsType("carousel")}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-semibold text-zinc-950">Carousel Ads</div>
                    <div className="mt-0.5 text-xs text-zinc-600">
                      Show multiple images in a swipeable carousel.
                    </div>
                  </div>
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-zinc-900/10 bg-white p-4 shadow-sm">
                  <input
                    type="radio"
                    name="adsType"
                    value="scratch"
                    checked={adsType === "scratch"}
                    onChange={() => setAdsType("scratch")}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-semibold text-zinc-950">Scratch Ads</div>
                    <div className="mt-0.5 text-xs text-zinc-600">
                      Scratch-to-reveal style promotional ad.
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
