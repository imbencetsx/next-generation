// Az alkalmazás útvonalai egy helyen. A proxy.ts `config.matcher` listája kivétel: a Next.js ott
// szó szerinti értéket követel, ezért azt kézzel kell ezzel összhangban tartani.

export const ROUTES = {
  /** Kezdőlap: program írása, térkép készítése és a közzétett térképek (bejelentkezéshez kötött). */
  home: "/",
  /** A fő munkafelület: kódszerkesztő és szimulátor (bejelentkezéshez kötött). */
  workbench: "/workbench",
  login: "/login",
  profile: "/profile",
  mapEditor: "/map-editor",
  docs: "/docs",
} as const;

/**
 * Egy térkép átadása a munkafelületnek vagy a térképszerkesztőnek az URL-ben: `map` a térképfájl szövege,
 * `mapName` a neve, `mapId` a közzétett térkép azonosítója (ezzel rögzül a futások eredménye).
 * A munkafelület `code` és `filename` paramétere a programot hozza magával.
 */
export const withMap = (pathname: string, map: string, mapName: string, mapId?: string) => ({
  pathname,
  query: mapId ? { map, mapName, mapId } : { map, mapName },
});

/** Egy dokumentációs oldal címe a slug alapján (lib/docs/nav.ts). */
export const docPath = (slug: string) => `${ROUTES.docs}/${slug}`;
