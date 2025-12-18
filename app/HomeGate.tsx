"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomeGate() {
  const router = useRouter();

  useEffect(() => {
    const run = async (signal?: AbortSignal) => {
      const token = (() => {
        try {
          return sessionStorage.getItem("gem_id_token");
        } catch {
          return null;
        }
      })();

      if (!token) return;

      try {
        const res = await fetch("/api/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal,
        });

        if (!res.ok) return;

        const data = (await res.json().catch(() => null)) as
          | { ok?: boolean; hasBusiness?: boolean }
          | null;

        if (data?.ok && data.hasBusiness) {
          router.replace("/dashboard");
        }
      } catch {
        return;
      }
    };

    const controller = new AbortController();
    void run(controller.signal);

    const onAuth = () => {
      void run();
    };

    window.addEventListener("gem-auth", onAuth);
    return () => {
      controller.abort();
      window.removeEventListener("gem-auth", onAuth);
    };
  }, [router]);

  return null;
}
