// Szerveroldali védelem (Next.js 16-ban a korábbi middleware.ts neve proxy.ts).
// A kezdőlapot, a munkafelületet, a térképszerkesztőt, a térképoldalakat és a profil oldalt csak érvényes
// munkamenettel szolgáljuk ki. A Convex Auth itt kezeli a
// httpOnly sütiket, a token frissítését és az /api/auth végpontot (bejelentkezés/kijelentkezés a Next
// szerveren át, így a refresh token sosem jut el a böngésző JavaScriptjéhez).

import { convexAuthNextjsMiddleware, createRouteMatcher } from "@convex-dev/auth/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { restoreRedirect } from "@/lib/auth-redirect-fix";
import { ROUTES } from "@/lib/routes";

const isProtected = createRouteMatcher([
  ROUTES.home,
  `${ROUTES.workbench}(.*)`,
  `${ROUTES.profile}(.*)`,
  `${ROUTES.mapEditor}(.*)`,
  `${ROUTES.maps}(.*)`,
]);
const isLogin = createRouteMatcher([ROUTES.login]);

const convexAuthProxy = convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  // Kijelentkezve: a bejelentkezésre küldjük, és megjegyezzük, hová akart menni (?next=).
  if (isProtected(request) && !(await convexAuth.isAuthenticated())) {
    const login = new URL(ROUTES.login, request.url);
    login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  }
  // Bejelentkezve nincs mit keresni a bejelentkező oldalon.
  if (isLogin(request) && (await convexAuth.isAuthenticated())) {
    return NextResponse.redirect(new URL(ROUTES.home, request.url));
  }
});

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  const response = await convexAuthProxy(request, event);
  return response ? restoreRedirect(response, request) : response;
}

export const config = {
  // A dokumentáció és a statikus fájlok kimaradnak; csak ezeknél kell a munkamenet.
  // Szó szerinti érték kell (a Next.js statikusan olvassa), ezért nem a ROUTES-ból jön;
  // a tests/tooling/routes.test.ts ellenőrzi, hogy a kettő egyezzen.
  matcher: ["/", "/workbench/:path*", "/profile/:path*", "/map-editor/:path*", "/maps/:path*", "/login", "/api/auth"],
};
