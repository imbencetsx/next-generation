// Az alkalmazás oldalainak (munkafelület, bejelentkezés, profil) közös szolgáltatói: munkamenet (Convex Auth),
// Convex kliens és felületi nyelv (i18n). Mindhárom a kérés sütijeiből olvas, ezért csak ezek köré tesszük,
// Suspense-ben (cacheComponents mellett a sütik olvasása dinamikus). A dokumentáció így statikus maradhat;
// az szándékosan csak magyar, ezért nincs szüksége a nyelvi szolgáltatóra.

import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { cookies, headers } from "next/headers";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import ConvexClientProvider from "@/components/convex-client-provider";
import { I18nProvider } from "@/i18n/i18n-provider";
import { LOCALE_COOKIE, resolveLocale } from "@/i18n/locale";

// A szolgáltató Date.now()-t hív; a connection() jelzi, hogy ez kérésidőben fut, nem előrendereléskor.
async function RequestScopedProviders({ children }: { children: ReactNode }) {
  await connection();
  const locale = resolveLocale((await cookies()).get(LOCALE_COOKIE)?.value, (await headers()).get("accept-language"));
  return (
    <ConvexAuthNextjsServerProvider>
      <ConvexClientProvider>
        <I18nProvider initialLocale={locale}>{children}</I18nProvider>
      </ConvexClientProvider>
    </ConvexAuthNextjsServerProvider>
  );
}

/** @param fallback Ez látszik, amíg a kérés sütijei beolvasódnak. */
export default function AppProviders({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  return (
    <Suspense fallback={fallback}>
      <RequestScopedProviders>{children}</RequestScopedProviders>
    </Suspense>
  );
}
