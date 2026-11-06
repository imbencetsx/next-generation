"use client";

// A játék csak bejelentkezés után használható (PDF 3.1). Kijelentkezett látogatót a /login oldalra küldünk,
// és utána visszahozzuk ugyanide (a dokumentációból érkező kóddal együtt).

import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import LoadingStatus from "@/components/loading-status";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || isAuthenticated) return;
    const next = window.location.pathname + window.location.search;
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [isLoading, isAuthenticated, router]);

  if (!isAuthenticated) {
    return <LoadingStatus message={isLoading ? "checkingSession" : "redirectingToSignIn"} />;
  }
  return children;
}
