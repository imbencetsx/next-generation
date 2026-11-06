"use client";

// Convex kliens a Next.js-es Convex Auth-tal: a hozzáférési tokent a szerver adja (httpOnly sütiből),
// a frissítés az /api/auth végponton át történik.

import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

// A NEXT_PUBLIC_ változó build időben kerül a csomagba, ezért hiányát azonnal jelezzük.
const url = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set. Run `bunx convex dev` (dev) or build with `bun run build:prod`.");
const convex = new ConvexReactClient(url);

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexAuthNextjsProvider client={convex}>{children}</ConvexAuthNextjsProvider>;
}
