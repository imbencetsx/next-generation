import type { Metadata } from "next";
import { randomInt } from "node:crypto";
import { Suspense } from "react";
import { connection } from "next/server";
import LoginForm from "@/components/auth/login-form";
import LanguageSwitch from "@/components/language-switch";
import LoadingStatus from "@/components/loading-status";
import Logo from "@/components/logo";
import TopBar from "@/components/top-bar";
import { MESSAGES } from "@/i18n/messages";

export const metadata: Metadata = { title: "MineScript" };

/** A robot első mondatát a szerver sorsolja kérésenként; a kliens ugyanazt az indexet kapja, így nincs hidratálási eltérés. */
async function RandomLoginForm() {
  await connection();
  return <LoginForm initialPrompt={randomInt(MESSAGES.en.auth.signInPrompts.length)} />;
}

export default function LoginPage() {
  return (
    <div className="app-ui relative isolate flex min-h-dvh flex-col">
      <div className="login-background" aria-hidden />
      <TopBar brand={<Logo />}>
        <LanguageSwitch />
      </TopBar>
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 pt-8 pb-20 sm:pb-28">
        {/* A visszatérési címet (?next=) az URL-ből olvassuk, ezért kell a Suspense. */}
        <Suspense fallback={<LoadingStatus message="loading" fullScreen={false} />}>
          <RandomLoginForm />
        </Suspense>
      </main>
    </div>
  );
}
