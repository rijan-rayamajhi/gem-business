import type { ReactNode } from "react";
import BottomNav from "./BottomNav";

export default function DashboardLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <main className="pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
