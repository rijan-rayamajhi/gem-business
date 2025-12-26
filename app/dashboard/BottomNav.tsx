"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AddSquare,
  Calendar,
  Flash,
  Home2,
  Microphone,
  Shop,
  type IconProps,
} from "iconsax-react";

type LinkNavItem = {
  kind: "link";
  href: string;
  label: string;
  icon: React.ComponentType<IconProps>;
};

type ActionNavItem = {
  kind: "action";
  key: string;
  label: string;
  icon: React.ComponentType<IconProps>;
};

type NavItem = LinkNavItem | ActionNavItem;

const navItems: NavItem[] = [
  { kind: "link", href: "/dashboard/catalogue", label: "Dashboard", icon: Home2 },
  { kind: "link", href: "/dashboard/ads", label: "Ads", icon: Microphone },
  { kind: "action", key: "create", label: "", icon: AddSquare },
  { kind: "link", href: "/dashboard/event", label: "Event", icon: Calendar },
  { kind: "link", href: "/dashboard/flash-sale", label: "Flash Sale", icon: Flash },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function BottomNav() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  const shouldHide =
    (pathname.startsWith("/dashboard/catalogue/") && pathname !== "/dashboard/catalogue") ||
    pathname.startsWith("/dashboard/boost-ads") ||
    pathname.startsWith("/dashboard/event/create") ||
    pathname.startsWith("/dashboard/business");

  useEffect(() => {
    if (!createOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCreateOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [createOpen]);

  if (shouldHide) {
    return null;
  }

  return (
    <>
      {createOpen ? (
        <div className="fixed inset-0 z-[60]">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/40"
            onClick={() => setCreateOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-3xl"
          >
            <div className="rounded-t-3xl border border-zinc-200 bg-white px-4 pb-6 pt-3 shadow-2xl">
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-zinc-200" />

              <div className="grid gap-2">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-2xl border border-zinc-900/10 bg-white px-4 py-3 text-left text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50"
                  onClick={() => {
                    setCreateOpen(false);
                    router.push("/dashboard/catalogue/create");
                  }}
                >
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-zinc-950 text-white">
                    <Home2 size={20} variant="Linear" color="#ffffff" aria-hidden="true" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span>Add Catalogue</span>
                    <span className="text-xs font-medium text-zinc-500">Create a new catalogue</span>
                  </span>
                </button>

                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-2xl border border-zinc-900/10 bg-white px-4 py-3 text-left text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50"
                  onClick={() => {
                    setCreateOpen(false);
                    window.alert("Add Product: route not configured yet.");
                  }}
                >
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-zinc-950 text-white">
                    <Shop size={20} variant="Linear" color="#ffffff" aria-hidden="true" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span>Add Product</span>
                    <span className="text-xs font-medium text-zinc-500">Create a new product</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <nav
        aria-label="Dashboard"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70"
      >
        <div className="mx-auto grid w-full max-w-3xl grid-cols-5">
          {navItems.map((item) => {
            if (item.kind === "action") {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  aria-label="Create"
                  className="flex h-14 flex-col items-center justify-center gap-0.5 px-1 text-center text-[11px] font-medium text-zinc-500 transition-colors hover:text-zinc-900"
                  onClick={() => setCreateOpen(true)}
                >
                  <span className="h-1 w-8 rounded-full bg-transparent" />
                  <span className="grid place-items-center">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-zinc-950 shadow-sm">
                      <Icon
                        size={22}
                        variant="Linear"
                        color="#ffffff"
                        className="transition-colors"
                        aria-hidden="true"
                      />
                    </span>
                  </span>
                  <span className="leading-none">{item.label}</span>
                </button>
              );
            }

            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            const iconColor = active ? "#09090b" : "#71717a";
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={
                  "flex h-14 flex-col items-center justify-center gap-0.5 px-1 text-center text-[11px] font-medium transition-colors" +
                  (active
                    ? " text-zinc-950"
                    : " text-zinc-500 hover:text-zinc-900")
                }
              >
                <span
                  className={
                    "h-1 w-8 rounded-full transition-colors" +
                    (active ? " bg-zinc-950" : " bg-transparent")
                  }
                />
                <span className="grid place-items-center">
                  <Icon
                    size={20}
                    variant="Linear"
                    color={iconColor}
                    className="transition-colors"
                    aria-hidden="true"
                  />
                </span>
                <span className="leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
