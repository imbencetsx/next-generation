// A munkamenetet a kérés sütijeiből olvassuk, ezért csak a bejelentkezést igénylő oldalak köré tesszük,
// Suspense-ben (cacheComponents mellett a sütik olvasása dinamikus). A dokumentáció így statikus marad.

import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import ConvexClientProvider from "@/components/convex-client-provider";

// A szolgáltató Date.now()-t hív; a connection() jelzi, hogy ez kérésidőben fut, nem előrendereléskor.
async function SessionProvider({ children }: { children: ReactNode }) {
  await connection();
  return (
    <ConvexAuthNextjsServerProvider>
      <ConvexClientProvider>{children}</ConvexClientProvider>
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
