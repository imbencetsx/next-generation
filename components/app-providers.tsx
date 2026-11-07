// Az alkalmazás oldalainak (kezdőlap, munkafelület, bejelentkezés, profil…) közös szolgáltatói: munkamenet
// (Convex Auth), Convex kliens és felületi nyelv (i18n). Mindhárom a kérés sütijeiből olvas, ezért csak ezek köré
// tesszük, Suspense-ben (cacheComponents mellett a sütik olvasása dinamikus). A dokumentáció így statikus
// maradhat; az szándékosan csak magyar, ezért nincs szüksége a nyelvi szolgáltatóra.
//
// A nyelv sorrendje: a fiókhoz mentett nyelv (profil oldal), ennek híján a süti (bejelentkezés előtti választás),
// végül a böngésző nyelve. Már a szerver így renderel, így nincs nyelvváltó villanás betöltéskor.

import { ConvexAuthNextjsServerProvider, convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { cookies, headers } from "next/headers";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import ConvexClientProvider from "@/components/convex-client-provider";
import AccountI18nProvider from "@/components/account-i18n-provider";
import { api } from "@/convex/_generated/api";
import { LOCALE_COOKIE, resolveLocale, type Locale } from "@/i18n/locale";

/** A bejelentkezett felhasználó fiókjához mentett nyelv, vagy null (kijelentkezve, nincs mentve, vagy hiba). */
async function accountLocale(): Promise<Locale | null> {
  const token = await convexAuthNextjsToken();
  if (!token) return null;
  try {
    return (await fetchQuery(api.users.viewer, {}, { token }))?.locale ?? null;
  } catch {
    // A nyelv nem ér annyit, hogy miatta ne töltsön be a lap: hiba esetén a süti dönt.
    return null;
  }
}

// A szolgáltató Date.now()-t hív; a connection() jelzi, hogy ez kérésidőben fut, nem előrendereléskor.
async function RequestScopedProviders({ children }: { children: ReactNode }) {
  await connection();
  const locale =
    (await accountLocale()) ??
    resolveLocale((await cookies()).get(LOCALE_COOKIE)?.value, (await headers()).get("accept-language"));
  return (
    <ConvexAuthNextjsServerProvider>
      <ConvexClientProvider>
        <AccountI18nProvider initialLocale={locale}>{children}</AccountI18nProvider>
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
