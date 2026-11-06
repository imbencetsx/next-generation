// A munkamenetet a kérés sütijeiből olvassuk, ezért csak a bejelentkezést igénylő oldalak köré tesszük,
// Suspense-ben (cacheComponents mellett a sütik olvasása dinamikus). A dokumentáció így statikus marad.

import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { cookies, headers } from "next/headers";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import ConvexClientProvider from "@/components/convex-client-provider";
import { I18nProvider } from "@/i18n/i18n-provider";
import { LOCALE_COOKIE, resolveLocale } from "@/i18n/locale";

// A szolgáltató Date.now()-t hív; a connection() jelzi, hogy ez kérésidőben fut, nem előrendereléskor.
async function SessionProvider({ children }: { children: ReactNode }) {
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

export default function AuthProviders({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  return (
    <Suspense fallback={fallback}>
      <SessionProvider>{children}</SessionProvider>
    </Suspense>
  );
}
