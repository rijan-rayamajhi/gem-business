"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardCatalogueCreatePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/catalogue/create");
  }, [router]);

  return null;
}
