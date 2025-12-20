"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const SUPPORT_PHONE = process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "";
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "";
const SUPPORT_WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "";

export default function RegisterVerificationPage() {
  const [supportOpen, setSupportOpen] = useState(false);

  const whatsappHref = useMemo(() => {
    const raw = SUPPORT_WHATSAPP.trim();
    if (!raw) return "";

    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;

    const digits = raw.replace(/[^\d]/g, "");
    return digits ? `https://wa.me/${digits}` : "";
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-indigo-500/30 via-fuchsia-500/20 to-emerald-500/20 blur-3xl" />
          <div className="absolute -bottom-40 right-0 h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-zinc-900/0 via-indigo-500/15 to-zinc-900/0 blur-3xl dark:from-zinc-950/0 dark:via-indigo-500/15 dark:to-zinc-950/0" />
        </div>

        <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="rounded-3xl border border-zinc-900/10 bg-white/70 p-6 shadow-sm sm:p-10 dark:border-white/10 dark:bg-zinc-950/40">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              Submitted
            </div>

            <h1 className="mt-4 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
              Your business is waiting for verification
            </h1>
            <p className="mt-3 text-pretty text-sm leading-7 text-zinc-600 dark:text-zinc-300">
              We’ve received your business details. Our team will verify your information and
              activate your profile.
            </p>

            <div className="mt-6 grid gap-3 rounded-2xl border border-zinc-900/10 bg-white/60 p-4 text-sm text-zinc-700 shadow-sm dark:border-white/10 dark:bg-zinc-950/30 dark:text-zinc-200">
              <div className="font-semibold">What happens next?</div>
              <div className="text-sm text-zinc-600 dark:text-zinc-300">
                - Verification typically takes some time.
                <br />- You may be contacted if we need more details.
                <br />- Once approved, your business will be visible to customers.
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-900 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                onClick={() => setSupportOpen((prev) => !prev)}
                aria-expanded={supportOpen}
              >
                Verify now
              </button>
              <Link
                href="/register/preview"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-5 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
              >
                View submitted details
              </Link>
            </div>

            {supportOpen && (
              <div className="mt-4 grid gap-2 rounded-2xl border border-zinc-900/10 bg-white/60 p-4 text-sm shadow-sm dark:border-white/10 dark:bg-zinc-950/30">
                <div className="text-sm font-semibold">Contact support</div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {SUPPORT_PHONE ? (
                    <a
                      href={`tel:${SUPPORT_PHONE}`}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
                    >
                      Call Support
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 opacity-60 shadow-sm dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-50"
                    >
                      Call Support
                    </button>
                  )}

                  {SUPPORT_EMAIL ? (
                    <a
                      href={`mailto:${SUPPORT_EMAIL}`}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
                    >
                      Email Support
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 opacity-60 shadow-sm dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-50"
                    >
                      Email Support
                    </button>
                  )}

                  {whatsappHref ? (
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
                    >
                      WhatsApp Support
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 opacity-60 shadow-sm dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-50"
                    >
                      WhatsApp Support
                    </button>
                  )}
                </div>

                {(!SUPPORT_PHONE || !SUPPORT_EMAIL || !SUPPORT_WHATSAPP) && (
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
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
