"use client";

import { type ReactNode, useEffect, useState } from "react";

type Props = {
  children: ReactNode;
};

function hasToken() {
  try {
    return Boolean(sessionStorage.getItem("gem_id_token"));
  } catch {
    return false;
  }
}

export default function AppOnly({ children }: Props) {
  const [enabled, setEnabled] = useState(() => hasToken());

  useEffect(() => {
    const onAuth = () => setEnabled(hasToken());
    window.addEventListener("gem-auth", onAuth);
    return () => window.removeEventListener("gem-auth", onAuth);
  }, []);

  if (!enabled) return null;
  return <>{children}</>;
}
