"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AddSquare, Home2 } from "iconsax-react";

type CatalogueStatus = "draft" | "pending" | "rejected" | "verified";

type CatalogueItem = {
  id: string;
  title?: string;
  description?: string;
  offerDetails?: string;
  imageUrls?: string[];
  status?: string;
};

function CatalogueCard(props: { item: CatalogueItem; onOpen: (id: string) => void }) {
  const { item, onOpen } = props;
  const status = asCatalogueStatus(item.status) ?? "draft";
  const images = Array.isArray(item.imageUrls) ? item.imageUrls : [];
  const [index, setIndex] = useState(0);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(() => new Set());

  const cover = images[index] ?? images[0] ?? "";
  const hasCarousel = images.length > 1;

  useEffect(() => {
    setIndex(0);
    setFailedUrls(new Set());
  }, [item.id]);

  return (
    <div
      role="button"
      tabIndex={0}
      className="overflow-hidden rounded-2xl border border-zinc-900/10 bg-white text-left shadow-sm transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
      onClick={() => onOpen(item.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(item.id);
        }
      }}
    >
      <div className="relative aspect-[16/10] w-full bg-zinc-100">
        {cover && !failedUrls.has(cover) ? (
          <img
            key={cover}
            src={cover}
            alt={item.title || "Catalogue"}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => {
              setFailedUrls((prev) => {
                const next = new Set(prev);
                next.add(cover);
                return next;
              });
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-tr from-zinc-950/10 via-zinc-700/5 to-zinc-200/10" />
        )}

        <div className="absolute left-3 top-3">
          <div
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass(status)}`}
          >
            {status}
          </div>
        </div>

        {hasCarousel ? (
          <>
            <button
              type="button"
              aria-label="Previous image"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-sm font-semibold text-zinc-900 shadow-sm ring-1 ring-zinc-900/10 transition hover:bg-white"
              onClick={(e) => {
                e.stopPropagation();
                setIndex((prev) => (prev - 1 + images.length) % images.length);
              }}
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Next image"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-sm font-semibold text-zinc-900 shadow-sm ring-1 ring-zinc-900/10 transition hover:bg-white"
              onClick={(e) => {
                e.stopPropagation();
                setIndex((prev) => (prev + 1) % images.length);
              }}
            >
              ›
            </button>

            <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to image ${i + 1}`}
                  className={`h-1.5 rounded-full transition ${
                    i === index ? "w-5 bg-white" : "w-1.5 bg-white/60"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIndex(i);
                  }}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      <div className="p-4">
        <div className="text-sm font-semibold text-zinc-950">{item.title || "Untitled"}</div>
        <div className="mt-1 line-clamp-2 text-sm text-zinc-600">{item.description || ""}</div>
      </div>
    </div>
  );
}

function asCatalogueStatus(value: unknown): CatalogueStatus | null {
  return value === "draft" || value === "pending" || value === "rejected" || value === "verified"
    ? value
    : null;
}

function badgeClass(status: CatalogueStatus) {
  if (status === "draft") return "border-zinc-900/10 bg-zinc-100 text-zinc-700";
  if (status === "pending") return "border-yellow-500/20 bg-yellow-500/10 text-yellow-700";
  if (status === "rejected") return "border-rose-500/20 bg-rose-500/10 text-rose-700";
  return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700";
}

export default function DashboardCataloguePage() {
  const router = useRouter();
  const [items, setItems] = useState<CatalogueItem[]>([]);
  const [loadState, setLoadState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; message: string }
  >({ status: "idle" });

  const [filter, setFilter] = useState<"all" | CatalogueStatus>("all");

  useEffect(() => {
    const token = (() => {
      try {
        return sessionStorage.getItem("gem_id_token");
      } catch {
        return null;
      }
    })();

    if (!token) {
      setLoadState({ status: "error", message: "Missing authentication token." });
      return;
    }

    const controller = new AbortController();
    const run = async () => {
      setLoadState({ status: "loading" });

      try {
        const url = filter === "all" ? "/api/catalogue" : `/api/catalogue?status=${filter}`;
        const res = await fetch(url, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        const data = (await res.json().catch(() => null)) as
          | { ok?: boolean; catalogue?: unknown; message?: string }
          | null;

        if (!res.ok || !data?.ok || !Array.isArray(data.catalogue)) {
          setLoadState({
            status: "error",
            message: data?.message || "Failed to load catalogue.",
          });
          return;
        }

        const nextItems = data.catalogue
          .filter((c) => c && typeof c === "object")
          .map((c) => {
            const obj = c as Record<string, unknown>;
            const id = typeof obj.id === "string" ? obj.id : "";
            const title = typeof obj.title === "string" ? obj.title : "";
            const description = typeof obj.description === "string" ? obj.description : "";
            const status = typeof obj.status === "string" ? obj.status : "";
            const imageUrls = Array.isArray(obj.imageUrls)
              ? obj.imageUrls.filter((v) => typeof v === "string")
              : [];

            return {
              id,
              ...(title ? { title } : {}),
              ...(description ? { description } : {}),
              ...(imageUrls.length ? { imageUrls } : {}),
              ...(status ? { status } : {}),
            } satisfies CatalogueItem;
          })
          .filter((c) => Boolean(c.id));

        setItems(nextItems);
        setLoadState({ status: "idle" });
      } catch {
        setLoadState({ status: "error", message: "Failed to load catalogue." });
      }
    };

    void run();
    return () => controller.abort();
  }, [filter]);

  const filteredItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((it) => it.status === filter);
  }, [filter, items]);

  const hasItems = items.length > 0;
  const showEmptyCatalogue = loadState.status === "idle" && items.length === 0;
  const showEmptyFiltered = loadState.status === "idle" && items.length > 0 && filteredItems.length === 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Catalogue</h1>
          <p className="mt-1 text-sm text-zinc-600">Your created catalogues.</p>
        </div>

        {hasItems ? (
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-900"
            onClick={() => router.push("/catalogue/create")}
          >
            <AddSquare size={18} variant="Linear" color="#ffffff" aria-hidden="true" />
            Add Catalogue
          </button>
        ) : null}

        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-zinc-700">Filter</div>
          <select
            className="h-10 rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm"
            value={filter}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "all") setFilter("all");
              else {
                const s = asCatalogueStatus(v);
                if (s) setFilter(s);
              }
            }}
          >
            <option value="all">All</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
            <option value="verified">Verified</option>
          </select>
        </div>
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

      {showEmptyCatalogue ? (
        <div className="mt-8">
          <div className="relative overflow-hidden rounded-3xl border border-zinc-900/10 bg-white shadow-sm">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-36 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-zinc-950/10 via-zinc-700/5 to-zinc-200/10 blur-3xl" />
            </div>

            <div className="relative grid gap-6 px-6 py-10 sm:px-10 sm:py-12">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-900/10 bg-white px-3 py-1 text-xs font-medium text-zinc-700 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                Catalogue
              </div>

              <div className="grid gap-2">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-zinc-950 text-white shadow-sm">
                    <Home2 size={22} variant="Linear" color="#ffffff" aria-hidden="true" />
                  </span>
                  <div>
                    <div className="text-lg font-semibold tracking-tight">No catalogue yet</div>
                    <div className="mt-0.5 text-sm text-zinc-600">
                      Add your first catalogue to start promoting.
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-900"
                  onClick={() => router.push("/catalogue/create")}
                >
                  <AddSquare size={18} variant="Linear" color="#ffffff" aria-hidden="true" />
                  Add Catalogue
                </button>
                <div className="text-xs text-zinc-500">
                  Tip: you can save as draft and publish later.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showEmptyFiltered ? (
        <div className="mt-6 rounded-2xl border border-zinc-900/10 bg-white/60 px-4 py-3 text-sm text-zinc-600 shadow-sm">
          No catalogue found.
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredItems.map((item) => {
          return (
            <CatalogueCard
              key={item.id}
              item={item}
              onOpen={(id) => router.push(`/dashboard/catalogue/${encodeURIComponent(id)}`)}
            />
          );
        })}
      </div>
    </div>
  );
}
