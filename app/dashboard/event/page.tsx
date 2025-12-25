"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AddSquare, Calendar } from "iconsax-react";
import type { EventItem, EventStatus } from "./types";

function asEventStatus(value: unknown): EventStatus | null {
  return value === "draft" || value === "pending" || value === "rejected" || value === "verified"
    ? value
    : null;
}

function badgeClass(status: EventStatus) {
  if (status === "draft") return "border-zinc-900/10 bg-zinc-100 text-zinc-700";
  if (status === "pending") return "border-yellow-500/20 bg-yellow-500/10 text-yellow-700";
  if (status === "rejected") return "border-rose-500/20 bg-rose-500/10 text-rose-700";
  return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700";
}

function formatDate(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  });
}

function EventCard(props: { item: EventItem; onDelete: (id: string) => void }) {
  const { item, onDelete } = props;

  const status = asEventStatus(item.status) ?? "draft";
  const tags = Array.isArray(item.tags) ? item.tags : [];
  const bannerUrl = typeof item.bannerUrl === "string" ? item.bannerUrl : "";

  const [imgFailed, setImgFailed] = useState(false);

  const canDelete = status === "draft" || status === "rejected";

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-900/10 bg-white text-left shadow-sm transition hover:bg-zinc-50">
      <div className="relative aspect-[16/10] w-full bg-zinc-100">
        {bannerUrl && !imgFailed ? (
          <img
            src={bannerUrl}
            alt={item.title || "Event"}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-tr from-zinc-950/10 via-zinc-700/5 to-zinc-200/10" />
        )}

        <div className="absolute left-3 top-3">
          <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass(status)}`}>
            {status}
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="text-sm font-semibold text-zinc-950 line-clamp-2">{item.title || "Untitled"}</div>

        <div className="mt-2 grid gap-1 text-xs text-zinc-600">
          <div>
            <span className="font-medium text-zinc-900">Dates:</span> {formatDate(item.startDate)}
            {item.endDate ? ` - ${formatDate(item.endDate)}` : ""}
          </div>
          {item.timeText ? (
            <div>
              <span className="font-medium text-zinc-900">Time:</span> {item.timeText}
            </div>
          ) : null}
          {item.location?.address ? (
            <div className="line-clamp-2">
              <span className="font-medium text-zinc-900">Location:</span> {item.location.address}
            </div>
          ) : null}
        </div>

        {tags.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.slice(0, 5).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full border border-zinc-900/10 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-700"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-end">
          {canDelete ? (
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-3 text-xs font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50"
              onClick={() => onDelete(item.id)}
            >
              Delete
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function DashboardEventPage() {
  const router = useRouter();
  const [items, setItems] = useState<EventItem[]>([]);
  const [loadState, setLoadState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; message: string }
  >({ status: "idle" });

  const [tokenCheck, setTokenCheck] = useState<{ status: "checking" } | { status: "ready"; token: string | null }>(
    { status: "checking" }
  );

  const [filter, setFilter] = useState<"all" | EventStatus>("all");

  useEffect(() => {
    const token = (() => {
      try {
        return sessionStorage.getItem("gem_id_token");
      } catch {
        return null;
      }
    })();

    setTokenCheck({ status: "ready", token });
  }, []);

  const showMissingToken = tokenCheck.status === "ready" && !tokenCheck.token;

  useEffect(() => {
    if (tokenCheck.status !== "ready") return;
    const token = tokenCheck.token;
    if (!token) return;

    const controller = new AbortController();
    const run = async () => {
      setLoadState({ status: "loading" });

      try {
        const url = filter === "all" ? "/api/events" : `/api/events?status=${filter}`;
        const res = await fetch(url, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        const data = (await res.json().catch(() => null)) as
          | { ok?: boolean; events?: unknown; message?: string }
          | null;

        if (!res.ok || !data?.ok || !Array.isArray(data.events)) {
          setLoadState({
            status: "error",
            message: data?.message || "Failed to load events.",
          });
          return;
        }

        const nextItems = data.events
          .filter((e) => e && typeof e === "object")
          .map((e) => {
            const obj = e as Record<string, unknown>;
            const id = typeof obj.id === "string" ? obj.id : "";
            const title = typeof obj.title === "string" ? obj.title : "";
            const description = typeof obj.description === "string" ? obj.description : "";
            const startDate = typeof obj.startDate === "string" ? obj.startDate : "";
            const endDate = typeof obj.endDate === "string" ? obj.endDate : "";
            const timeText = typeof obj.timeText === "string" ? obj.timeText : "";
            const bannerUrl = typeof obj.bannerUrl === "string" ? obj.bannerUrl : "";
            const status = typeof obj.status === "string" ? obj.status : "";

            const tags = Array.isArray(obj.tags) ? obj.tags.filter((t) => typeof t === "string") : [];
            const location = obj.location && typeof obj.location === "object" ? (obj.location as Record<string, unknown>) : null;
            const address = location && typeof location.address === "string" ? location.address : "";

            return {
              id,
              ...(title ? { title } : {}),
              ...(description ? { description } : {}),
              ...(startDate ? { startDate } : {}),
              ...(endDate ? { endDate } : {}),
              ...(timeText ? { timeText } : {}),
              ...(bannerUrl ? { bannerUrl } : {}),
              ...(tags.length ? { tags } : {}),
              ...(address ? { location: { address } } : {}),
              ...(status ? { status } : {}),
            } satisfies EventItem;
          })
          .filter((it) => Boolean(it.id));

        setItems(nextItems);
        setLoadState({ status: "idle" });
      } catch {
        setLoadState({ status: "error", message: "Failed to load events." });
      }
    };

    void run();
    return () => controller.abort();
  }, [filter, tokenCheck]);

  const filteredItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((it) => it.status === filter);
  }, [filter, items]);

  const hasItems = items.length > 0;
  const showEmptyEvents = loadState.status === "idle" && items.length === 0;
  const showEmptyFiltered = loadState.status === "idle" && items.length > 0 && filteredItems.length === 0;

  async function onDelete(id: string) {
    const token = (() => {
      try {
        return sessionStorage.getItem("gem_id_token");
      } catch {
        return null;
      }
    })();

    if (!token) return;

    try {
      const res = await fetch(`/api/events/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return;
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch {
      // ignore
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Event</h1>
          <p className="mt-1 text-sm text-zinc-600">Create and manage events for your business.</p>
        </div>

        {hasItems ? (
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-900"
            onClick={() => router.push("/dashboard/event/create")}
          >
            <AddSquare size={18} variant="Linear" color="#ffffff" aria-hidden="true" />
            Add Event
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
                const s = asEventStatus(v);
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

      {tokenCheck.status === "checking" ? (
        <div className="mt-6 rounded-2xl border border-zinc-900/10 bg-white/60 px-4 py-3 text-sm text-zinc-600 shadow-sm">
          Loading…
        </div>
      ) : null}

      {showMissingToken ? (
        <div className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 shadow-sm">
          Missing authentication token.
        </div>
      ) : null}

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

      {showEmptyEvents ? (
        <div className="mt-8">
          <div className="relative overflow-hidden rounded-3xl border border-zinc-900/10 bg-white shadow-sm">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-36 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-zinc-950/10 via-zinc-700/5 to-zinc-200/10 blur-3xl" />
            </div>

            <div className="relative grid gap-6 px-6 py-10 sm:px-10 sm:py-12">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-900/10 bg-white px-3 py-1 text-xs font-medium text-zinc-700 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                Events
              </div>

              <div className="grid gap-2">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-zinc-950 text-white shadow-sm">
                    <Calendar size={22} variant="Linear" color="#ffffff" aria-hidden="true" />
                  </span>
                  <div>
                    <div className="text-lg font-semibold tracking-tight">No events yet</div>
                    <div className="mt-0.5 text-sm text-zinc-600">
                      Add your first event to start promoting.
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-900"
                  onClick={() => router.push("/dashboard/event/create")}
                >
                  <AddSquare size={18} variant="Linear" color="#ffffff" aria-hidden="true" />
                  Add Event
                </button>
                <div className="text-xs text-zinc-500">Tip: you can save as draft and publish later.</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showEmptyFiltered ? (
        <div className="mt-6 rounded-2xl border border-zinc-900/10 bg-white/60 px-4 py-3 text-sm text-zinc-600 shadow-sm">
          No events found.
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredItems.map((item) => (
          <EventCard key={`${item.id}_${item.status ?? ""}`} item={item} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}
