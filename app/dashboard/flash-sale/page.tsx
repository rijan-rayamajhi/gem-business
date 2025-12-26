"use client";

import { useEffect, useMemo, useState } from "react";

type LoadState =
  | { status: "checking" }
  | { status: "ready"; token: string | null }
  | { status: "error"; message: string };

type FlashSaleItem = {
  id: string;
  status?: string;
  bannerImageUrl?: string;
  campaign?: {
    startsAt?: unknown;
    endsAt?: unknown;
  };
  sale?: {
    startsAt?: unknown;
    endsAt?: unknown;
  };
  business?: {
    cutoffAt?: unknown;
  };
};

function dateToText(value: unknown): string {
  if (!value) return "";

  if (value instanceof Date) {
    const ms = value.getTime();
    if (!Number.isFinite(ms)) return "";
    return value.toLocaleString();
  }

  if (typeof value === "string") {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString();
  }

  if (typeof value === "number") {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString();
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const maybeToDate = obj && (obj as { toDate?: unknown }).toDate;
    if (typeof maybeToDate === "function") {
      try {
        const d = (maybeToDate as () => Date)();
        if (Number.isNaN(d.getTime())) return "";
        return d.toLocaleString();
      } catch {
        return "";
      }
    }

    const seconds = typeof obj.seconds === "number" ? obj.seconds : NaN;
    const nanos = typeof obj.nanoseconds === "number" ? obj.nanoseconds : NaN;
    if (Number.isFinite(seconds)) {
      const ms = seconds * 1000 + (Number.isFinite(nanos) ? Math.floor(nanos / 1e6) : 0);
      const d = new Date(ms);
      if (Number.isNaN(d.getTime())) return "";
      return d.toLocaleString();
    }
  }

  return "";
}

export default function DashboardFlashSalePage() {
  const [tokenState, setTokenState] = useState<LoadState>({ status: "checking" });
  const [loadState, setLoadState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; message: string }
  >({ status: "idle" });
  const [item, setItem] = useState<FlashSaleItem | null>(null);

  useEffect(() => {
    const token = (() => {
      try {
        return sessionStorage.getItem("gem_id_token");
      } catch {
        return null;
      }
    })();
    setTokenState({ status: "ready", token });
  }, []);

  useEffect(() => {
    if (tokenState.status !== "ready") return;
    if (!tokenState.token) return;

    const controller = new AbortController();
    const run = async () => {
      setLoadState({ status: "loading" });
      try {
        const res = await fetch("/api/flash-sale", {
          method: "GET",
          headers: { Authorization: `Bearer ${tokenState.token}` },
          signal: controller.signal,
        });

        const data = (await res.json().catch(() => null)) as
          | { ok: true; item: FlashSaleItem | null }
          | { ok: false; message?: string }
          | null;

        if (!res.ok || !data || data.ok !== true) {
          const message = data && "message" in data && typeof data.message === "string"
            ? data.message
            : "Failed to load flash sale.";
          setLoadState({ status: "error", message });
          return;
        }

        setItem(data.item);
        setLoadState({ status: "idle" });
      } catch {
        setLoadState({ status: "error", message: "Failed to load flash sale." });
      }
    };

    void run();
    return () => controller.abort();
  }, [tokenState]);

  const campaignWindow = useMemo(() => {
    if (!item?.campaign) return "";
    const s = dateToText(item.campaign.startsAt);
    const e = dateToText(item.campaign.endsAt);
    if (!s || !e) return "";
    return `${s} - ${e}`;
  }, [item]);

  const saleWindow = useMemo(() => {
    if (!item?.sale) return "";
    const s = dateToText(item.sale.startsAt);
    const e = dateToText(item.sale.endsAt);
    if (!s || !e) return "";
    return `${s} - ${e}`;
  }, [item]);

  const cutoffText = useMemo(() => {
    const t = dateToText(item?.business?.cutoffAt);
    return t;
  }, [item]);

  const showMissingToken = tokenState.status === "ready" && !tokenState.token;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Flash Sale</h1>
          <p className="mt-1 text-sm text-zinc-600">Active flash sale details.</p>
        </div>
      </div>

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

      {loadState.status === "idle" && tokenState.status === "ready" && tokenState.token && !item ? (
        <div className="mt-6 rounded-2xl border border-zinc-900/10 bg-white px-4 py-4 text-sm text-zinc-700 shadow-sm">
          No active flash sale right now.
        </div>
      ) : null}

      {item ? (
        <div className="mt-6 overflow-hidden rounded-3xl border border-zinc-900/10 bg-white shadow-sm">
          <div className="relative aspect-[16/6] w-full bg-zinc-100">
            {typeof item.bannerImageUrl === "string" && item.bannerImageUrl ? (
              <img
                src={item.bannerImageUrl}
                alt="Flash sale banner"
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-tr from-zinc-950/10 via-zinc-700/5 to-zinc-200/10" />
            )}
          </div>

          <div className="grid gap-2 p-5 sm:p-6">
            <div className="text-sm font-semibold text-zinc-950">Status: {item.status || ""}</div>
            {campaignWindow ? (
              <div className="text-sm text-zinc-700">
                <span className="font-medium text-zinc-900">Campaign window:</span> {campaignWindow}
              </div>
            ) : null}
            {saleWindow ? (
              <div className="text-sm text-zinc-700">
                <span className="font-medium text-zinc-900">Sale window:</span> {saleWindow}
              </div>
            ) : null}
            {cutoffText ? (
              <div className="text-sm text-zinc-700">
                <span className="font-medium text-zinc-900">Business cutoff:</span> {cutoffText}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
