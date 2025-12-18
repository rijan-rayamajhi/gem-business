"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";

type Props = {
  children: ReactNode;
};

type GateState = "checking" | "show";

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
          | { ok?: boolean; hasBusiness?: boolean }
          | null;

        if (data?.ok && data.hasBusiness) {
          router.replace("/dashboard");
          return;
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
      <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
