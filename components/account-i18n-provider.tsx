"use client";

// A fiók nyelve bejelentkezéskor és másik eszközön végzett módosításkor is frissül.
import { useConvexAuth, useQuery } from "convex/react";
import type { ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import { I18nProvider } from "@/i18n/i18n-provider";
import type { Locale } from "@/i18n/locale";

export default function AccountI18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const { isAuthenticated } = useConvexAuth();
  const viewer = useQuery(api.users.viewer, isAuthenticated ? {} : "skip");
  return (
    <I18nProvider initialLocale={initialLocale} accountLocale={viewer?.locale}>
      {children}
    </I18nProvider>
  );
}
