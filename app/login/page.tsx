import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "@/components/auth/login-form";
import Logo from "@/components/logo";

export const metadata: Metadata = { title: "Sign in · MineScript" };

export default function LoginPage() {
  return (
    <div className="app-ui flex min-h-dvh flex-col">
      <header className="topbar">
        <div className="flex min-h-[68px] items-center px-4 py-1.5">
          <Logo />
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-10">
        {/* A visszatérési címet (?next=) az URL-ből olvassuk, ezért kell a Suspense. */}
        <Suspense fallback={<p role="status" className="text-sm text-muted-foreground">Loading…</p>}>
          <LoginForm />
        </Suspense>
      </main>
    </div>
  );
}
