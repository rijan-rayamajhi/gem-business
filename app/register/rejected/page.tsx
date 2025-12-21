"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type LoadState =
  | { status: "loading" }
  | { status: "ready" }
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

export default function RegisterRejectedPage() {
  const router = useRouter();
  const [state, setState] = useState<LoadState>(() => {
    const token = (() => {
      try {
        return sessionStorage.getItem("gem_id_token");
      } catch {
        return null;
      }
    })();

    if (!token) return { status: "error", message: "Please open this page from the mobile app." };
    return { status: "loading" };
  });
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });

  useEffect(() => {
    if (state.status !== "loading") return;

    const token = (() => {
      try {
        return sessionStorage.getItem("gem_id_token");
      } catch {
        return null;
      }
    })();

    if (!token) {
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

        const data = (await res.json().catch(() => null)) as
          | { ok?: boolean; business?: { status?: unknown } | null }
          | null;

        if (!res.ok || !data?.ok) {
          setState({ status: "error", message: "Failed to load status. Please try again." });
          return;
        }

        const status = asBusinessStatus(data.business?.status);
        if (status === "verified") {
          router.replace("/dashboard");
          return;
        }
        if (status === "submitted" || status === "pending") {
          router.replace("/register/verification");
          return;
        }
        if (status === "draft") {
          router.replace("/register");
          return;
        }

        setState({ status: "ready" });
      } catch {
        setState({ status: "error", message: "Network error. Please try again." });
      }
    };

    void run();
    return () => controller.abort();
  }, [router]);

  const canResubmit = useMemo(() => submitState.status !== "submitting", [submitState.status]);

  async function onResubmit() {
    if (!canResubmit) return;

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
      payload.append("status", "draft");

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

      if (!res.ok || !data?.ok) {
        setSubmitState({
          status: "error",
          message: data?.message || "Failed to restart. Please try again.",
        });
        return;
      }

      router.replace("/register");
    } catch {
      setSubmitState({ status: "error", message: "Network error. Please try again." });
    }
  }

  if (state.status === "loading") {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-950">
        <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="rounded-3xl border border-zinc-900/10 bg-white/70 p-6 shadow-sm sm:p-10">
            <div className="text-sm text-zinc-600">Loading…</div>
          </div>
        </main>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-950">
        <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-700 shadow-sm sm:p-10">
            {state.message}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-zinc-950/20 via-zinc-700/10 to-zinc-200/15 blur-3xl" />
          <div className="absolute -bottom-40 right-0 h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-zinc-950/0 via-zinc-700/10 to-zinc-950/0 blur-3xl" />
        </div>

        <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="rounded-3xl border border-zinc-900/10 bg-white/70 p-6 shadow-sm sm:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-700">
              Rejected
            </div>

            <h1 className="mt-4 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
              Your business was rejected
            </h1>
            <p className="mt-3 text-pretty text-sm leading-7 text-zinc-600">
              Your submitted details did not pass verification. Please resubmit with the correct
              information.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={onResubmit}
                disabled={!canResubmit}
              >
                {submitState.status === "submitting" ? "Restarting…" : "Resubmit"}
              </button>
            </div>

            {submitState.status === "error" ? (
              <div
                className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-700 shadow-sm"
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
