// Szerveroldali védelem: a /test oldalt csak érvényes munkamenettel szolgáljuk ki.
// A Convex Auth itt kezeli a httpOnly sütiket, a token frissítését és az /api/auth végpontot
// (bejelentkezés/kijelentkezés a Next szerveren át, így a refresh token sosem jut el a böngésző JS-éhez).

import { convexAuthNextjsMiddleware, createRouteMatcher } from "@convex-dev/auth/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

const isProtected = createRouteMatcher(["/test(.*)", "/profile(.*)"]);
const isLogin = createRouteMatcher(["/login"]);

const convexAuthProxy = convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (isProtected(request) && !(await convexAuth.isAuthenticated())) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  }
  if (isLogin(request) && (await convexAuth.isAuthenticated())) {
    return NextResponse.redirect(new URL("/test", request.url));
  }
});

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  const response = await convexAuthProxy(request, event);
  // @convex-dev/auth 0.0.96 hibája: ha közben sütit is frissít vagy töröl, az átirányításunkat
  // NextResponse.next()-be csomagolja, így 200-as válasz menne ki a védett oldallal. Visszaállítjuk.
  const location = response?.headers.get("location");
  if (response && location && response.status < 300) {
    const redirect = NextResponse.redirect(new URL(location, request.url));
    for (const cookie of response.headers.getSetCookie()) redirect.headers.append("set-cookie", cookie);
    return redirect;
  }
  return response;
}

export const config = {
  // A dokumentáció és a statikus fájlok kimaradnak; csak ezeknél kell a munkamenet.
  matcher: ["/test/:path*", "/profile/:path*", "/login", "/api/auth"],
};
