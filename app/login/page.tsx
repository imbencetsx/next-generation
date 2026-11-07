import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "@/components/auth/login-form";
import LanguageSwitch from "@/components/language-switch";
import LoadingStatus from "@/components/loading-status";
import Logo from "@/components/logo";

export const metadata: Metadata = { title: "MineScript" };

export default function LoginPage() {
  return (
    <div className="app-ui relative isolate flex min-h-dvh flex-col">
      <div className="login-background" aria-hidden />
      <header className="topbar">
        <div className="flex min-h-[68px] items-center justify-between px-4 py-1.5">
          <Logo />
          <LanguageSwitch />
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 pt-8 pb-20 sm:pb-28">
        {/* A visszatérési címet (?next=) az URL-ből olvassuk, ezért kell a Suspense. */}
        <Suspense fallback={<LoadingStatus message="loading" fullScreen={false} />}>
          <LoginForm />
        </Suspense>
      </main>
    </div>
  );
}
