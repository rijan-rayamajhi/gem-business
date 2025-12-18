"use client";

import { useEffect } from "react";

type GemAuthMessage = {
  type: "GEM_AUTH";
  token: string;
};

export default function AuthBridge() {
  useEffect(() => {
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
