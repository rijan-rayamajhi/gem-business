import { Suspense } from "react";
import BoostAdsGoalClient from "./BoostAdsGoalClient";

export default function DashboardBoostAdsGoalPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="mt-6 rounded-2xl border border-zinc-900/10 bg-white/60 px-4 py-3 text-sm text-zinc-600 shadow-sm">
            Loading…
          </div>
        </div>
      }
    >
      <BoostAdsGoalClient />
    </Suspense>
  );
}
