import HomeGate from "./HomeGate";
import AppOnly from "./AppOnly";

export default function Home() {
  const business = {
    name: "GEM Business",
    headline: "Premium services that help your business grow",
    subheadline:
      "A modern team built for speed, quality, and measurable results—delivered with a premium customer experience.",
    primaryCta: { label: "Register", href: "/register" },
    secondaryCta: { label: "View Services", href: "#services" },
    phone: "+1 (555) 000-0000",
    email: "hello@example.com",
    location: "Your City",
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <HomeGate>
        <div className="relative isolate overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-zinc-950/20 via-zinc-700/10 to-zinc-200/15 blur-3xl" />
            <div className="absolute -bottom-40 right-0 h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-zinc-950/0 via-zinc-700/10 to-zinc-950/0 blur-3xl" />
          </div>

          <main>
            <section className="mx-auto w-full max-w-6xl px-4 pb-10 pt-12 sm:px-6 sm:pb-14 sm:pt-20">
              <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 rounded-full border border-zinc-900/10 bg-white px-3 py-1 text-xs font-medium text-zinc-700 shadow-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Available for new projects
                  </div>

                  <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
                    {business.headline}
                  </h1>
                  <p className="max-w-xl text-pretty text-base leading-7 text-zinc-600 sm:text-lg sm:leading-8">
                    {business.subheadline}
                  </p>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <AppOnly>
                      <a
                        className="inline-flex h-12 items-center justify-center rounded-xl bg-zinc-950 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-900"
                        href={business.primaryCta.href}
                      >
                        {business.primaryCta.label}
                      </a>
                    </AppOnly>
                    <a
                      className="inline-flex h-12 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-6 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50"
                      href={business.secondaryCta.href}
                    >
                      {business.secondaryCta.label}
                    </a>
                  </div>

                <div className="grid grid-cols-3 gap-3 pt-4">
                  <div className="rounded-2xl border border-zinc-900/10 bg-white p-4 shadow-sm">
                    <div className="text-lg font-semibold tracking-tight">48h</div>
                    <div className="text-xs text-zinc-600">
                      Typical kickoff
                    </div>
                  </div>
                  <div className="rounded-2xl border border-zinc-900/10 bg-white p-4 shadow-sm">
                    <div className="text-lg font-semibold tracking-tight">Premium</div>
                    <div className="text-xs text-zinc-600">
                      Quality delivery
                    </div>
                  </div>
                  <div className="rounded-2xl border border-zinc-900/10 bg-white p-4 shadow-sm">
                    <div className="text-lg font-semibold tracking-tight">Mobile</div>
                    <div className="text-xs text-zinc-600">
                      First experience
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-zinc-950/10 via-zinc-700/5 to-zinc-200/10 blur-2xl" />
                <div className="overflow-hidden rounded-3xl border border-zinc-900/10 bg-white shadow-xl">
                  <div className="flex items-center justify-between border-b border-zinc-900/10 px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-rose-400" />
                      <span className="h-2 w-2 rounded-full bg-amber-300" />
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    </div>
                    <div className="text-xs font-medium text-zinc-500">
                      Fast · Clean · Premium
                    </div>
                  </div>

                  <div className="p-6 sm:p-8">
                    <div className="grid gap-4">
                      <div className="rounded-2xl border border-zinc-900/10 bg-zinc-50 p-4">
                        <div className="text-sm font-semibold">What you get</div>
                        <div className="mt-2 grid gap-2 text-sm text-zinc-600">
                          <div className="flex items-start gap-2">
                            <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            A premium landing page designed for conversions
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Mobile-first layout, fast load, clear CTA
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Trust-building sections: proof, reviews, FAQ
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-zinc-900/10 bg-white p-4">
                          <div className="text-xs text-zinc-500">
                            Response time
                          </div>
                          <div className="mt-1 text-lg font-semibold tracking-tight">
                            Same day
                          </div>
                        </div>
                        <div className="rounded-2xl border border-zinc-900/10 bg-white p-4">
                          <div className="text-xs text-zinc-500">
                            Satisfaction
                          </div>
                          <div className="mt-1 text-lg font-semibold tracking-tight">
                            High-touch
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 rounded-2xl border border-zinc-900/10 bg-white p-4">
                        <div className="text-sm font-semibold">Trusted by</div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                          <span className="rounded-full border border-zinc-900/10 bg-zinc-50 px-3 py-1">
                            Local brands
                          </span>
                          <span className="rounded-full border border-zinc-900/10 bg-zinc-50 px-3 py-1">
                            Startups
                          </span>
                          <span className="rounded-full border border-zinc-900/10 bg-zinc-50 px-3 py-1">
                            Service businesses
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="services" className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Services
              </p>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Everything you need for a premium presence
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-zinc-600 sm:text-base">
                Choose what you need today—scale later. Designed to look premium on
                mobile and feel effortless on desktop.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Brand-ready landing pages",
                  desc: "High-conversion layouts with premium typography, spacing, and CTAs.",
                },
                {
                  title: "Business websites",
                  desc: "Fast, SEO-friendly pages built for trust and clarity.",
                },
                {
                  title: "Growth & optimization",
                  desc: "Improve conversions with better messaging, sections, and mobile UX.",
                },
                {
                  title: "Content & visuals",
                  desc: "Refined copy structure and visuals that match a premium brand.",
                },
                {
                  title: "Ongoing support",
                  desc: "Updates, improvements, and quick iterations when you need them.",
                },
                {
                  title: "Consulting",
                  desc: "Clear plans and recommendations tailored to your business goals.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="group rounded-3xl border border-zinc-900/10 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold tracking-tight">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-zinc-600">
                        {item.desc}
                      </p>
                    </div>
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-zinc-950 text-white shadow-sm transition group-hover:bg-zinc-900">
                      <span className="text-sm">→</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="features" className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
            <div className="grid gap-10 lg:grid-cols-2">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Why us
                </p>
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Premium feel, built for mobile conversions
                </h2>
                <p className="max-w-2xl text-sm leading-7 text-zinc-600 sm:text-base">
                  Mobile-first typography, high-contrast CTAs, and trust signals
                  that help people decide quickly.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  {
                    title: "Mobile-first layout",
                    desc: "Big tap targets, readable text, and clean spacing.",
                  },
                  {
                    title: "Premium visuals",
                    desc: "Modern gradients, soft shadows, and polished cards.",
                  },
                  {
                    title: "Fast & lightweight",
                    desc: "Built with Next.js + Tailwind for performance.",
                  },
                  {
                    title: "Clear messaging",
                    desc: "Simple structure that guides visitors to your CTA.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-3xl border border-zinc-900/10 bg-white p-6 shadow-sm"
                  >
                    <h3 className="text-base font-semibold tracking-tight">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-zinc-600">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="testimonials" className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
            <div className="flex items-end justify-between gap-6">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Results
                </p>
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  What clients say
                </h2>
                <p className="max-w-2xl text-sm leading-7 text-zinc-600 sm:text-base">
                  Replace these with real reviews when you have them—this section
                  boosts trust dramatically.
                </p>
              </div>
            </div>

            <div className="mt-8 overflow-x-auto pb-2">
              <div className="flex min-w-full gap-4 snap-x snap-mandatory">
                {[
                  {
                    quote:
                      "Super smooth process. The site looks premium and works perfectly on mobile.",
                    name: "Client Name",
                    role: "Business Owner",
                  },
                  {
                    quote:
                      "Clear communication, fast delivery, and a design that feels high-end.",
                    name: "Client Name",
                    role: "Founder",
                  },
                  {
                    quote:
                      "We started getting better leads almost immediately after launch.",
                    name: "Client Name",
                    role: "Director",
                  },
                ].map((t) => (
                  <div
                    key={t.quote}
                    className="w-[85%] shrink-0 snap-start rounded-3xl border border-zinc-900/10 bg-white p-6 shadow-sm sm:w-[48%] lg:w-[32%]"
                  >
                    <div className="text-sm leading-7 text-zinc-700">
                      “{t.quote}”
                    </div>
                    <div className="mt-5 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold tracking-tight">
                          {t.name}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {t.role}
                        </div>
                      </div>
                      <div className="text-xs font-semibold text-amber-500">
                        ★★★★★
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="faq" className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                FAQ
              </p>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Quick answers
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-zinc-600 sm:text-base">
                Everything here works without extra JavaScript—great for mobile
                performance.
              </p>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              {[
                {
                  q: "How quickly can we start?",
                  a: "Typically within 48 hours after we confirm the scope and content.",
                },
                {
                  q: "Is this optimized for mobile?",
                  a: "Yes—layout, typography, and tap targets are designed mobile-first.",
                },
                {
                  q: "Can I edit text and services later?",
                  a: "Absolutely. You can update the business details directly in page.tsx, or we can connect a CMS.",
                },
                {
                  q: "Do you provide ongoing support?",
                  a: "Yes. We can do monthly maintenance, updates, and conversion improvements.",
                },
              ].map((item) => (
                <details
                  key={item.q}
                  className="group rounded-3xl border border-zinc-900/10 bg-white p-6 shadow-sm open:shadow-md"
                >
                  <summary className="cursor-pointer list-none text-sm font-semibold tracking-tight">
                    <span className="mr-2 inline-block text-zinc-400 transition group-open:rotate-90">
                      ▸
                    </span>
                    {item.q}
                  </summary>
                  <p className="mt-3 text-sm leading-7 text-zinc-600">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </section>
        </main>

        <footer className="border-t border-zinc-900/5 bg-zinc-50 py-10">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-zinc-900 text-zinc-50">
                <span className="text-sm font-semibold">G</span>
              </div>
              <div>
                <div className="text-sm font-semibold tracking-tight">
                  {business.name}
                </div>
                <div className="text-xs text-zinc-600">
                  © {new Date().getFullYear()} · All rights reserved
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-sm text-zinc-600">
              <a className="hover:text-zinc-950" href="#services">
                Services
              </a>
              <a className="hover:text-zinc-950" href="#features">
                Why us
              </a>
            </div>
          </div>
        </footer>
        </div>
      </HomeGate>
    </div>
  );
}
