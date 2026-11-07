import { randomInt } from "node:crypto";
import { Suspense } from "react";
import LoadingStatus from "@/components/loading-status";
import { connection } from "next/server";
import RequireAuth from "@/components/auth/require-auth";
import HomePage from "@/components/home";
import { MESSAGES } from "@/i18n/messages";

/** A robot üdvözlését a szerver sorsolja kérésenként; a kliens ugyanazt az indexet kapja, így nincs hidratálási eltérés. */
async function RequestHome() {
  await connection();
  return (
    <RequireAuth>
      <HomePage greeting={randomInt(MESSAGES.en.home.greetings.length)} />
    </RequireAuth>
  );
}

export default function Home() {
  return (
    // Navigációkor a megosztott layout határa nem védi az oldal kérésfüggő tartalmát.
    <Suspense fallback={<LoadingStatus message="loading" />}>
      <RequestHome />
    </Suspense>
  );
}
