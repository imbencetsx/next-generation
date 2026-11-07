"use client";

// Betöltési állapot a választott nyelven (a nyelvi kontextuson belüli Suspense-tartalékokhoz).

import { useI18n } from "@/i18n/i18n-provider";
import type { Messages } from "@/i18n/messages";

type Key = "loading" | "loadingEditor" | "checkingSession" | "redirectingToSignIn";

export default function LoadingStatus({ message, fullScreen = true }: { message: Key; fullScreen?: boolean }) {
  const { t } = useI18n();
  return (
    <div
      role="status"
      className={`flex items-center justify-center text-sm text-muted-foreground ${fullScreen ? "app-ui h-dvh" : ""}`}
    >
      {(t as Messages)[message]}
    </div>
  );
}
