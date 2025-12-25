import HomeGate from "./HomeGate";

export default function Home() {
  const brand = {
    name: "GEM Business",
    headline: "Fuel Your Growth with GEM Business",
    subheadline:
      "Tap into a high-intent mobility network and list your services in minutes.",
    primaryCta: { label: "Register Now", href: "/register" },
  };

  const stats = [
    { value: "100%", label: "Vehicle Owners" },
    { value: "25K+", label: "Daily Commuters" },
    { value: "1", label: "City" },
  ];

  const categories = [
    "Mechanic",
    "Tyre",
    "Battery",
    "Accessories",
    "Puncture",
    "Key maker",
    "Lubricants",
    "Spareparts",
    "Towing",
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <HomeGate>
        <div className="relative isolate overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.06)_1px,transparent_1px)] bg-[size:28px_28px]" />
            <div className="absolute -top-48 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-slate-900/25 via-indigo-600/10 to-slate-200/10 blur-3xl" />
            <div className="absolute -bottom-52 right-0 h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-slate-900/0 via-slate-700/10 to-slate-900/0 blur-3xl" />
          </div>

          <main>
            <section className="mx-auto w-full max-w-6xl px-4 pb-10 pt-12 sm:px-6 sm:pb-14 sm:pt-20">
              <div className="grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-900/10 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                    Premium business listing
                  </div>

                  <h1 className="text-balance text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                    {brand.headline}
                  </h1>
                  <p className="max-w-xl text-pretty text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                    {brand.subheadline}
                  </p>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <a
                      className="inline-flex h-12 items-center justify-center rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                      href={brand.primaryCta.href}
                    >
                      {brand.primaryCta.label}
                    </a>
                    <a
                      className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-900/10 bg-white/80 px-6 text-sm font-semibold text-slate-900 shadow-sm backdrop-blur transition hover:bg-white"
                      href="#why"
                    >
                      Why {brand.name}?
                    </a>
                  </div>
                </div>

                <div className="overflow-hidden rounded-3xl border border-slate-900/10 bg-white/80 shadow-xl backdrop-blur">
                  <div className="border-b border-slate-900/10 px-5 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-rose-400" />
                        <span className="h-2 w-2 rounded-full bg-amber-300" />
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      </div>
                      <div className="text-xs font-semibold text-slate-500">
                        Premium · Fast · Verified
                      </div>
                    </div>
                  </div>

                  <div className="p-6 sm:p-7">
                    <div className="grid gap-3">
                      <div className="rounded-2xl border border-slate-900/10 bg-slate-50 p-4">
                        <div className="text-sm font-semibold text-slate-900">
                          Built for growth
                        </div>
                        <div className="mt-2 grid gap-2 text-sm text-slate-600">
                          <div className="flex items-start gap-2">
                            <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-indigo-600" />
                            Customers can find you quickly by category & location
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-indigo-600" />
                            Premium profile that builds trust at first glance
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-indigo-600" />
                            Designed mobile-first for more calls & visits
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        {stats.map((s) => (
                          <div
                            key={s.label}
                            className="rounded-2xl border border-slate-900/10 bg-white p-4 text-center shadow-sm"
                          >
                            <div className="text-lg font-semibold tracking-tight text-slate-900">
                              {s.value}
                            </div>
                            <div className="mt-1 text-xs font-medium text-slate-600">
                              {s.label}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section id="why" className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  Why {brand.name}?
                </h2>
                <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                  A clean premium experience that helps customers choose you faster.
                </p>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    title: "Premium listing",
                    desc: "Polished cards, clear details, and a profile that feels trustworthy.",
                  },
                  {
                    title: "High-intent discovery",
                    desc: "Customers find you by the exact service they need.",
                  },
                  {
                    title: "Fast onboarding",
                    desc: "Register in minutes and start getting visibility.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-3xl border border-slate-900/10 bg-white/80 p-6 shadow-sm backdrop-blur"
                  >
                    <div className="text-base font-semibold tracking-tight text-slate-900">
                      {item.title}
                    </div>
                    <div className="mt-2 text-sm leading-7 text-slate-600">
                      {item.desc}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section id="categories" className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  List your business
                </h2>
                <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                  Pick your category and start getting discovered by customers nearby.
                </p>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {categories.map((name) => (
                  <a
                    key={name}
                    href={brand.primaryCta.href}
                    className="group overflow-hidden rounded-3xl border border-slate-900/10 bg-white/80 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/10 via-indigo-600/10 to-slate-200/10" />
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.18),transparent_55%)]" />
                      <div className="absolute bottom-3 left-3 rounded-2xl border border-slate-900/10 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
                        {name}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {name}
                        </div>
                        <div className="mt-1 text-xs text-slate-600">Tap to register</div>
                      </div>
                      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-900 text-white shadow-sm transition group-hover:bg-slate-800">
                        <span className="text-sm">→</span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </section>

            <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-2 sm:px-6 sm:pb-24">
              <div className="overflow-hidden rounded-3xl border border-slate-900/10 bg-white/80 shadow-xl backdrop-blur">
                <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="space-y-3">
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                      Ready to get listed?
                    </h2>
                    <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                      Join {brand.name} and let customers find you when they need you most.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                    <button
                      type="button"
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <path
                          d="M16.7 13.2c0-2.2 1.8-3.2 1.8-3.2-1-1.5-2.6-1.7-3.1-1.7-1.3-.1-2.6.8-3.2.8-.7 0-1.8-.8-3-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.7-.4 6.7 1.1 8.9.7 1.1 1.6 2.3 2.8 2.2 1.1 0 1.6-.7 3-.7s1.8.7 3.1.7c1.3 0 2.1-1.1 2.8-2.2.8-1.2 1.1-2.4 1.1-2.4-.1 0-2.7-1-2.7-3.8Z"
                          fill="currentColor"
                          opacity="0.9"
                        />
                        <path
                          d="M14.7 6.6c.6-.8 1.1-2 1-3.1-1 .1-2.2.7-2.9 1.5-.6.7-1.1 1.9-1 3 1.1.1 2.2-.6 2.9-1.4Z"
                          fill="currentColor"
                          opacity="0.9"
                        />
                      </svg>
                      App Store
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-900/10 bg-white px-5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <path
                          d="M3.6 2.7c-.4.3-.6.8-.6 1.4v15.8c0 .6.2 1.1.6 1.4l.1.1L13 12 3.7 2.6l-.1.1Z"
                          fill="currentColor"
                          opacity="0.9"
                        />
                        <path
                          d="M16.5 15.5 13 12l3.5-3.5 4.2 2.4c.6.4.6 1.3 0 1.6l-4.2 2.4Z"
                          fill="currentColor"
                          opacity="0.9"
                        />
                        <path
                          d="M3.7 21.4 13 12l3.5 3.5-8.4 4.9c-.7.4-1.6.6-2.4.5Z"
                          fill="currentColor"
                          opacity="0.65"
                        />
                        <path
                          d="M16.5 8.5 13 12 3.7 2.6c.8-.1 1.7.1 2.4.5l8.4 4.9Z"
                          fill="currentColor"
                          opacity="0.65"
                        />
                      </svg>
                      Google Play
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </main>

          <footer className="border-t border-slate-900/10 bg-slate-50 py-10">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-white">
                  <span className="text-sm font-semibold">G</span>
                </div>
                <div>
                  <div className="text-sm font-semibold tracking-tight text-slate-900">
                    {brand.name}
                  </div>
                  <div className="text-xs text-slate-600">
                    {new Date().getFullYear()} · All rights reserved
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                <a className="hover:text-slate-900" href="#why">
                  Why
                </a>
                <a className="hover:text-slate-900" href="#categories">
                  Categories
                </a>
                <a className="hover:text-slate-900" href={brand.primaryCta.href}>
                  Register
                </a>
              </div>
            </div>
          </footer>
        </div>
      </HomeGate>
    </div>
  );
}
