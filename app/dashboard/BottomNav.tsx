"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AddSquare,
  Calendar,
  Flash,
  Home2,
  Speaker,
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
  { kind: "link", href: "/dashboard/catalogue", label: "Catalogue", icon: Home2 },
  { kind: "link", href: "/dashboard/ads", label: "Ads", icon: Speaker },
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
  const [open, setOpen] = useState(false);

  const shouldHide = pathname.startsWith("/dashboard/catalogue/") && pathname !== "/dashboard/catalogue";

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (shouldHide) {
    return null;
  }

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-[60]">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white shadow-2xl">
            <div className="mx-auto w-full max-w-3xl px-4 py-4">
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-zinc-200" />
              <div className="grid gap-2">
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-2xl border border-zinc-900/10 bg-white px-4 py-4 text-left text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50"
                  onClick={() => {
                    setOpen(false);
                    router.push("/catalogue/create");
                  }}
                >
                  <span>Create Catalogue</span>
                  <span className="text-xs font-medium text-zinc-500">Open</span>
                </button>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-2xl border border-zinc-900/10 bg-white px-4 py-4 text-left text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50"
                  onClick={() => {
                    setOpen(false);
                    router.push("/dashboard/event");
                  }}
                >
                  <span>Create Event</span>
                  <span className="text-xs font-medium text-zinc-500">Open</span>
                </button>
              </div>
              <div className="h-4" />
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
                  onClick={() => setOpen(true)}
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
