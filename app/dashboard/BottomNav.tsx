"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AddSquare,
  Calendar,
  Flash,
  Home2,
  Speaker,
  type IconProps,
} from "iconsax-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<IconProps>;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home2 },
  { href: "/dashboard/ads", label: "Ads", icon: Speaker },
  { href: "/dashboard/catalogue", label: "Create Catalogue", icon: AddSquare },
  { href: "/dashboard/event", label: "Event", icon: Calendar },
  { href: "/dashboard/flash-sale", label: "Flash Sale", icon: Flash },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function BottomNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="Dashboard"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70"
    >
      <div className="mx-auto grid w-full max-w-3xl grid-cols-5">
        {navItems.map((item) => {
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
  );
}
