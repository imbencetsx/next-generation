// Az alkalmazás útvonalai egy helyen. A proxy.ts `config.matcher` listája kivétel: a Next.js ott
// szó szerinti értéket követel, ezért azt kézzel kell ezzel összhangban tartani.

export const ROUTES = {
  /** A fő munkafelület: kódszerkesztő és szimulátor (bejelentkezéshez kötött). */
  workbench: "/workbench",
  login: "/login",
  profile: "/profile",
  mapEditor: "/map-editor",
  docs: "/docs",
} as const;

/** Egy dokumentációs oldal címe a slug alapján (lib/docs/nav.ts). */
export const docPath = (slug: string) => `${ROUTES.docs}/${slug}`;
