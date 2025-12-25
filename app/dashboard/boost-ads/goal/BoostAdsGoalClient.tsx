"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type BusinessType = "online" | "offline" | "both";

type CatalogueItem = {
  id: string;
  imageUrls?: string[];
  title?: string;
};

type RegisterResponse = {
  ok?: boolean;
  business?: {
    businessType?: string;
    website?: string;
  } | null;
};

type GoalType = "shop_visit" | "website_visit";

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string };

function isSafeImgUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const v = value.trim();
  return v.startsWith("https://") || v.startsWith("http://");
}

function asBusinessType(value: unknown): BusinessType | null {
  return value === "online" || value === "offline" || value === "both" ? value : null;
}

export default function BoostAdsGoalClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const catalogueId = searchParams.get("catalogueId") ?? "";
  const adsType = searchParams.get("adsType") ?? "";

  const token = useMemo(() => {
    try {
      return sessionStorage.getItem("gem_id_token");
    } catch {
      return null;
    }
  }, []);

  const [item, setItem] = useState<CatalogueItem | null>(null);
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);
  const [goal, setGoal] = useState<GoalType | null>(null);

  const [catalogueLoadState, setCatalogueLoadState] = useState<LoadState>(() => {
    if (!catalogueId) return { status: "error", message: "Missing catalogue id." };
    if (!token) return { status: "error", message: "Missing authentication token." };
    return { status: "idle" };
  });

  const [businessLoadState, setBusinessLoadState] = useState<LoadState>(() => {
    if (!token) return { status: "error", message: "Missing authentication token." };
    return { status: "idle" };
  });

  useEffect(() => {
    if (!catalogueId || !token) return;

    const controller = new AbortController();
    const run = async () => {
      setCatalogueLoadState({ status: "loading" });
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
          setCatalogueLoadState({
            status: "error",
            message: data?.message || "Failed to load catalogue.",
          });
          return;
        }

        const obj = data.item as Record<string, unknown>;
        const id = typeof obj.id === "string" ? obj.id : catalogueId;
        const title = typeof obj.title === "string" ? obj.title : "";
        const imageUrls = Array.isArray(obj.imageUrls) ? obj.imageUrls.filter(isSafeImgUrl) : [];

        setItem({
          id,
          ...(title ? { title } : {}),
          ...(imageUrls.length ? { imageUrls } : {}),
        });
        setCatalogueLoadState({ status: "idle" });
      } catch {
        setCatalogueLoadState({ status: "error", message: "Failed to load catalogue." });
      }
    };

    void run();
    return () => controller.abort();
  }, [catalogueId, token]);

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();
    const run = async () => {
      setBusinessLoadState({ status: "loading" });
      try {
        const res = await fetch("/api/register", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        const data = (await res.json().catch(() => null)) as RegisterResponse | null;
        if (!res.ok || !data?.ok) {
          setBusinessLoadState({ status: "error", message: "Failed to load business." });
          return;
        }

        const resolvedType = asBusinessType(data.business?.businessType);
        setBusinessType(resolvedType);

        setBusinessLoadState({ status: "idle" });
      } catch {
        setBusinessLoadState({ status: "error", message: "Failed to load business." });
      }
    };

    void run();
    return () => controller.abort();
  }, [token]);

  const primaryImage = useMemo(() => {
    const urls = Array.isArray(item?.imageUrls) ? item?.imageUrls ?? [] : [];
    return urls.length ? urls[0] : "";
  }, [item]);

  const availableGoals = useMemo(() => {
    if (businessType === "offline") {
      return [
        {
          key: "shop_visit" as const,
          title: "Shop visit",
          description: "Drive customers to your physical location.",
        },
      ];
    }

    if (businessType === "online") {
      return [
        {
          key: "website_visit" as const,
          title: "Website visit",
          description: "Send customers to your website.",
        },
      ];
    }

    if (businessType === "both") {
      return [
        {
          key: "shop_visit" as const,
          title: "Shop visit",
          description: "Drive customers to your physical location.",
        },
        {
          key: "website_visit" as const,
          title: "Website visit",
          description: "Send customers to your website.",
        },
      ];
    }

    return [];
  }, [businessType]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Boost Ads</h1>
          <p className="mt-1 text-sm text-zinc-600">What are you goal ?</p>
        </div>

        <button
          type="button"
          className="h-10 rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50"
          onClick={() => router.back()}
        >
          Back
        </button>
      </div>

      {adsType ? (
        <div className="mt-4 text-xs text-zinc-500">
          Selected ads type: <span className="font-semibold text-zinc-700">{adsType}</span>
        </div>
      ) : null}

      {catalogueLoadState.status === "loading" || businessLoadState.status === "loading" ? (
        <div className="mt-6 rounded-2xl border border-zinc-900/10 bg-white/60 px-4 py-3 text-sm text-zinc-600 shadow-sm">
          Loading…
        </div>
      ) : null}

      {catalogueLoadState.status === "error" ? (
        <div className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 shadow-sm">
          {catalogueLoadState.message}
        </div>
      ) : null}

      {businessLoadState.status === "error" ? (
        <div className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 shadow-sm">
          {businessLoadState.message}
        </div>
      ) : null}

      {catalogueLoadState.status === "idle" && item ? (
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
              <div className="text-sm font-semibold text-zinc-950">Select goal</div>

              {availableGoals.length === 0 ? (
                <div className="mt-2 text-sm text-zinc-600">
                  Please complete your business profile first.
                </div>
              ) : (
                <div className="mt-3 grid gap-3">
                  {availableGoals.map((opt) => {
                    const active = goal === opt.key;
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
                          name="goal"
                          checked={active}
                          onChange={() => setGoal(opt.key)}
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
              )}

            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
