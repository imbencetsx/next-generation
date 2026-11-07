// A @convex-dev/auth 0.0.96 egy hibájának kerülőútja a proxy.ts számára. Külön fájlban van, hogy a
// proxy olvasható maradjon, és a csomag frissítésekor egy helyen lehessen eldönteni, kell-e még.

import { NextResponse, type NextRequest } from "next/server";

/**
 * Kerülőút a @convex-dev/auth 0.0.96 hibájára: ha a kérés közben sütit is frissít vagy töröl, az
 * átirányításunkat NextResponse.next()-be csomagolja, így 200-as válasz menne ki a védett oldallal.
 * Ilyenkor a Location fejlécből valódi átirányítást készítünk, a sütiket pedig átmásoljuk.
 *
 * Eltávolítható, ha egy újabb @convex-dev/auth verziónál a kijelentkezett /workbench kérés lejárt
 * munkamenet-sütivel is 307-es átirányítást ad e függvény nélkül.
 */
export function restoreRedirect(response: Response, request: NextRequest): Response {
  const location = response.headers.get("location");
  if (!location || response.status >= 300) return response;

  const redirect = NextResponse.redirect(new URL(location, request.url));
  for (const cookie of response.headers.getSetCookie()) redirect.headers.append("set-cookie", cookie);
  return redirect;
}
