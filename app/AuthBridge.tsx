"use client";

import { useEffect } from "react";

type GemAuthMessage = {
  type: "GEM_AUTH";
  token: string;
};

export default function AuthBridge() {
  useEffect(() => {
    const canRegisterSw =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      window.isSecureContext &&
      process.env.NODE_ENV === "production";

    if (canRegisterSw) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          registration.update().catch(() => null);

          if (registration.waiting) {
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
          }

          registration.addEventListener("updatefound", () => {
            const installing = registration.installing;
            if (!installing) return;

            installing.addEventListener("statechange", () => {
              if (installing.state !== "installed") return;
              if (!navigator.serviceWorker.controller) return;
              window.location.reload();
            });
          });
        })
        .catch(() => null);
    }

    const isDevBypassEnabled =
      process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "1";

    if (isDevBypassEnabled) {
      const token = process.env.NEXT_PUBLIC_DEV_BYPASS_TOKEN?.trim() || "dev";
      try {
        sessionStorage.setItem("gem_id_token", token);
      } catch {
        // ignore
      }
      window.dispatchEvent(new Event("gem-auth"));
    }

    const handler = (event: MessageEvent) => {
      const raw = event.data;

      let data: unknown = raw;
      if (typeof raw === "string") {
        try {
          data = JSON.parse(raw) as unknown;
        } catch {
          return;
        }
      }

      const msg = data as Partial<GemAuthMessage> | null;
      if (!msg || msg.type !== "GEM_AUTH") return;
      if (typeof msg.token !== "string" || !msg.token.trim()) return;

      try {
        sessionStorage.setItem("gem_id_token", msg.token);
      } catch {
        return;
      }

      window.dispatchEvent(new Event("gem-auth"));
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  return null;
}
