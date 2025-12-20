"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";

type Props = {
  children: ReactNode;
};

type GateState = "checking" | "show";

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

export default function HomeGate({ children }: Props) {
  const router = useRouter();
  const [state, setState] = useState<GateState>("checking");
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clearShowTimer = () => {
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }
    };

    const getToken = () => {
      try {
        return sessionStorage.getItem("gem_id_token");
      } catch {
        return null;
      }
    };

    const run = async (signal?: AbortSignal) => {
      const token = getToken();

      if (!token) {
        const isApp = (() => {
          try {
            return new URLSearchParams(window.location.search).get("app") === "1";
          } catch {
            return false;
          }
        })();

        clearShowTimer();
        if (!isApp) {
          setState("show");
          return;
        }

        showTimerRef.current = setTimeout(() => {
          setState("show");
        }, 5000);
        return;
      }

      clearShowTimer();

      try {
        const res = await fetch("/api/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal,
        });

        if (!res.ok) {
          setState("show");
          return;
        }

        const data = (await res.json().catch(() => null)) as
          | { ok?: boolean; hasBusiness?: boolean; businessStatus?: unknown }
          | null;

        if (data?.ok) {
          const status = asBusinessStatus(data.businessStatus);
          if (status === "verified") {
            router.replace("/dashboard");
            return;
          }
          if (status === "submitted" || status === "pending") {
            router.replace("/register/verification");
            return;
          }
          if (status === "rejected") {
            router.replace("/register/rejected");
            return;
          }
        }

        setState("show");
      } catch {
        setState("show");
      }
    };

    const controller = new AbortController();
    void run(controller.signal);

    const onAuth = () => {
      setState("checking");
      void run();
    };

    window.addEventListener("gem-auth", onAuth);
    return () => {
      controller.abort();
      clearShowTimer();
      window.removeEventListener("gem-auth", onAuth);
    };
  }, [router]);

  if (state !== "show") {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-950">
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="relative">
            <div className="pointer-events-none absolute -inset-8 -z-10 rounded-full bg-gradient-to-tr from-zinc-950/15 via-zinc-700/10 to-zinc-200/15 blur-2xl" />
            <div className="w-[min(22rem,calc(100vw-3rem))] rounded-3xl border border-zinc-900/10 bg-white/80 p-5 shadow-xl backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-tr from-zinc-950/80 via-zinc-700/60 to-zinc-300/60 p-[1px]">
                  <div className="grid h-full w-full place-items-center rounded-2xl bg-white text-zinc-950">
                    <span className="text-sm font-semibold">G</span>
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="text-sm font-semibold tracking-tight text-zinc-900">
                    Preparing your dashboard
                  </div>
                  <div className="mt-1 text-xs text-zinc-600">
                    Securing session & syncing profile
                  </div>
                </div>

                <svg
                  className="ml-auto h-8 w-8 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="gemSpinner" x1="0" y1="0" x2="24" y2="24">
                      <stop stopColor="#09090b" stopOpacity="0.95" />
                      <stop offset="0.5" stopColor="#52525b" stopOpacity="0.85" />
                      <stop offset="1" stopColor="#a1a1aa" stopOpacity="0.9" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M12 3a9 9 0 1 0 9 9"
                    stroke="url(#gemSpinner)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <div className="mt-4 grid gap-2">
                <div className="h-2 w-full animate-pulse rounded-full bg-zinc-900/5" />
                <div className="h-2 w-4/5 animate-pulse rounded-full bg-zinc-900/5 [animation-delay:120ms]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
