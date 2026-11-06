"use client";

// Bejelentkezés és regisztráció egy űrlapon. A szabályokat a szerver is ellenőrzi (convex/credentials.ts).

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { AlertCircle, LogIn, UserPlus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LoginScene from "@/components/auth/login-scene";
import {
  AUTH_PROVIDER,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  authMessageFrom,
  normalizeUsername,
  passwordProblem,
  usernameProblem,
} from "@/convex/credentials";

type Flow = "signIn" | "signUp";

// Csak saját oldalra irányítunk vissza; a böngésző a „/\” kezdetet is külső címnek veszi.
function safeNext(value: string | null) {
  return value && /^\/(?![/\\])/.test(value) ? value : "/test";
}

export default function LoginForm() {
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [flow, setFlow] = useState<Flow>("signIn");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (isAuthenticated) router.replace(next);
  }, [isAuthenticated, next, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const username = normalizeUsername(form.get("username"));
    const password = String(form.get("password") ?? "");

    if (flow === "signUp") {
      const problem = usernameProblem(username) ?? passwordProblem(password);
      if (problem) return setError(problem);
    }

    setPending(true);
    setError(null);
    try {
      await signIn(AUTH_PROVIDER, { flow, username, password });
      // A süti már beállt; a szerver (proxy) ezzel engedi be a védett oldalra.
      router.replace(next);
      router.refresh();
    } catch (caught) {
      setError(authMessageFrom(caught));
      setPending(false);
    }
  }

  const signingUp = flow === "signUp";

  function switchFlow() {
    setFlow(signingUp ? "signIn" : "signUp");
    setError(null);
  }

  return (
    <>
    <LoginScene message={signingUp ? "Create an account so the gold you dig counts on the leaderboard :)" : "Sign in to send me back into the mine :)"} />
    <Card role="region" aria-labelledby="auth-title" className="w-full max-w-[400px] gap-0 p-7">
      {/* A buborék mondja ki, mit kell tenni; a cím a képernyőolvasóknak marad. */}
      <h1 id="auth-title" className="sr-only">{signingUp ? "Create account" : "Sign in"}</h1>

      <form className="flex flex-col gap-4" onSubmit={submit} aria-busy={pending}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            name="username"
            required
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={20}
            aria-describedby={signingUp ? "username-rule" : undefined}
            className="h-10 text-base"
          />
          {signingUp && <p id="username-rule" className="font-read text-sm text-muted-foreground">3 to 20 characters: letters, digits or underscores.</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            maxLength={MAX_PASSWORD_LENGTH}
            autoComplete={signingUp ? "new-password" : "current-password"}
            aria-describedby={signingUp ? "password-rule" : undefined}
            className="h-10 text-base"
          />
          {signingUp && <p id="password-rule" className="font-read text-sm text-muted-foreground">{MIN_PASSWORD_LENGTH} to {MAX_PASSWORD_LENGTH} characters.</p>}
        </div>

        {error && (
          <p role="alert" className="pixel-frame flex items-start gap-2 bg-brick/15 px-3 py-2 font-read text-sm text-brick-text" data-tone="danger">
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden /> {error}
          </p>
        )}

        <Button type="submit" size="lg" className="mt-2 h-10 w-full text-base" disabled={pending}>
          {signingUp ? <UserPlus aria-hidden /> : <LogIn aria-hidden />}
          {pending ? (signingUp ? "Creating account…" : "Signing in…") : signingUp ? "Create account" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 border-t border-border pt-5 text-sm text-muted-foreground">
        {signingUp ? "Already have an account?" : "New here?"}{" "}
        <button type="button" className="text-foreground underline underline-offset-4 hover:no-underline" onClick={switchFlow}>
          {signingUp ? "Sign in" : "Create an account"}
        </button>
      </p>
    </Card>
    </>
  );
}
