"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const SUPPORT_PHONE = process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "";
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "";
const SUPPORT_WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "";

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

export default function RegisterVerificationPage() {
  const router = useRouter();
  const [supportOpen, setSupportOpen] = useState(false);

  useEffect(() => {
    const handler = () => {
      router.replace("/register/verification");
    };

    try {
      window.history.pushState(null, "", window.location.href);
      window.addEventListener("popstate", handler);
    } catch {
      // ignore
    }

    return () => {
      try {
        window.removeEventListener("popstate", handler);
      } catch {
        // ignore
      }
    };
  }, [router]);

  useEffect(() => {
    const token = (() => {
      try {
        return sessionStorage.getItem("gem_id_token");
      } catch {
        return null;
      }
    })();

    if (!token) return;

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

        if (!res.ok || !data?.ok) return;

        const status = asBusinessStatus(data.business?.status);
        if (status === "verified") {
          router.replace("/dashboard");
          return;
        }
        if (status === "rejected") {
          router.replace("/register/rejected");
          return;
        }
        if (status === "draft") {
          router.replace("/register");
        }
      } catch {
        // ignore
      }
    };

    void run();
    return () => controller.abort();
  }, [router]);

  const whatsappHref = useMemo(() => {
    const raw = SUPPORT_WHATSAPP.trim();
    if (!raw) return "";

    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;

    const digits = raw.replace(/[^\d]/g, "");
    return digits ? `https://wa.me/${digits}` : "";
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-zinc-950/20 via-zinc-700/10 to-zinc-200/15 blur-3xl" />
          <div className="absolute -bottom-40 right-0 h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-zinc-950/0 via-zinc-700/10 to-zinc-950/0 blur-3xl" />
        </div>

        <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="rounded-3xl border border-zinc-900/10 bg-white/70 p-6 shadow-sm sm:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700">
              Submitted
            </div>

            <h1 className="mt-4 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
              Your business is waiting for verification
            </h1>
            <p className="mt-3 text-pretty text-sm leading-7 text-zinc-600">
              We’ve received your business details. Our team will verify your information and
              activate your profile.
            </p>

            <div className="mt-6 grid gap-3 rounded-2xl border border-zinc-900/10 bg-white/60 p-4 text-sm text-zinc-700 shadow-sm">
              <div className="font-semibold">What happens next?</div>
              <div className="text-sm text-zinc-600">
                - Verification typically takes some time.
                <br />- You may be contacted if we need more details.
                <br />- Once approved, your business will be visible to customers.
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-900"
                onClick={() => setSupportOpen((prev) => !prev)}
                aria-expanded={supportOpen}
              >
                Verify now
              </button>
              <Link
                href="/register/preview"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-5 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50"
              >
                View submitted details
              </Link>
            </div>

            {supportOpen && (
              <div className="mt-4 grid gap-2 rounded-2xl border border-zinc-900/10 bg-white/60 p-4 text-sm shadow-sm">
                <div className="text-sm font-semibold">Contact support</div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {SUPPORT_PHONE ? (
                    <a
                      href={`tel:${SUPPORT_PHONE}`}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50"
                    >
                      Call Support
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 opacity-60 shadow-sm"
                    >
                      Call Support
                    </button>
                  )}

                  {SUPPORT_EMAIL ? (
                    <a
                      href={`mailto:${SUPPORT_EMAIL}`}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50"
                    >
                      Email Support
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 opacity-60 shadow-sm"
                    >
                      Email Support
                    </button>
                  )}

                  {whatsappHref ? (
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50"
                    >
                      WhatsApp Support
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 opacity-60 shadow-sm"
                    >
                      WhatsApp Support
                    </button>
                  )}
                </div>

                {(!SUPPORT_PHONE || !SUPPORT_EMAIL || !SUPPORT_WHATSAPP) && (
                  <div className="text-xs text-zinc-500">
                    Support details are not fully configured.
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
