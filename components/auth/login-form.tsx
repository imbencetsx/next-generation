"use client";

// Bejelentkezés és regisztráció egy űrlapon. A szabályokat a szerver is ellenőrzi (convex/credentials.ts).

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { Alert, Login, UserPlus } from "@/components/icons";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LoginScene from "@/components/auth/login-scene";
import UsernameInput from "@/components/auth/username-input";
import { useI18n } from "@/i18n/i18n-provider";
import {
  AUTH_PROVIDER,
  MAX_PASSWORD_LENGTH,
  authErrorKey,
  type AuthErrorKey,
  normalizeUsername,
  isValidPassword,
  isValidUsername,
} from "@/convex/credentials";
import { ROUTES } from "@/lib/routes";

type Flow = "signIn" | "signUp";

/** Ide lépünk tovább bejelentkezés után, ha a ?next= paraméter hiányzik vagy nem biztonságos. */
const DEFAULT_AFTER_LOGIN = ROUTES.home;

/**
 * Nyílt átirányítás elleni védelem: csak a saját oldalunkon belüli útvonalra (egy „/” jellel kezdődőre)
 * lépünk tovább. A „//pelda.hu” és a „/\pelda.hu” alakot a böngésző külső címnek venné, ezért azokat elutasítjuk.
 */
function safeNext(value: string | null) {
  const isLocalPath = value !== null && /^\/(?![/\\])/.test(value);
  return isLocalPath ? value : DEFAULT_AFTER_LOGIN;
}

/** @param initialPrompt A robot első mondatának indexe (a szerver sorsolja, hogy ne legyen hidratálási eltérés). */
export default function LoginForm({ initialPrompt = 0 }: { initialPrompt?: number }) {
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [flow, setFlow] = useState<Flow>("signIn");
  const { t } = useI18n();
  const [error, setError] = useState<AuthErrorKey | null>(null);
  const [pending, setPending] = useState(false);
  const [promptIndex, setPromptIndex] = useState(initialPrompt);

  useEffect(() => {
    if (isAuthenticated) router.replace(next);
  }, [isAuthenticated, next, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    // A név elé gépelt „@” jeleket elhagyjuk (sokan így írják a felhasználónevet).
    const username = normalizeUsername(String(form.get("username") ?? "").replace(/^@+/, ""));
    const password = String(form.get("password") ?? "");

    if (flow === "signUp") {
      if (!isValidUsername(username)) return setError("username");
      if (!isValidPassword(password)) return setError("password");
    }

    setPending(true);
    setError(null);
    try {
      await signIn(AUTH_PROVIDER, { flow, username, password });
      // A süti már beállt; a szerver (proxy) ezzel engedi be a védett oldalra.
      router.replace(next);
      router.refresh();
    } catch (caught) {
      setError(authErrorKey(caught));
      setPending(false);
    }
  }

  const signingUp = flow === "signUp";
  const prompts = signingUp ? t.auth.signUpPrompts : t.auth.signInPrompts;

  function switchFlow() {
    // Váltáskor mindig másik mondat jön: a jelenlegin kívüli indexek közül sorsolunk.
    const nextPrompts = signingUp ? t.auth.signInPrompts : t.auth.signUpPrompts;
    const offset = 1 + Math.floor(Math.random() * (nextPrompts.length - 1));
    setPromptIndex((promptIndex + offset) % nextPrompts.length);
    setFlow(signingUp ? "signIn" : "signUp");
    setError(null);
  }

  let submitLabel = signingUp ? t.auth.createAccount : t.auth.signIn;
  if (pending) submitLabel = signingUp ? t.auth.creatingAccount : t.auth.signingIn;

  return (
    <>
      <LoginScene message={prompts[promptIndex]} />
      <Card role="region" aria-labelledby="auth-title" className="w-full max-w-[400px] gap-0 p-7">
        {/* A buborék mondja ki, mit kell tenni; a cím a képernyőolvasóknak marad. */}
        <h1 id="auth-title" className="sr-only">
          {signingUp ? t.auth.createAccount : t.auth.signIn}
        </h1>

        <form className="flex flex-col gap-4" onSubmit={submit} aria-busy={pending}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="username">{t.auth.username}</Label>
            <UsernameInput
              id="username"
              name="username"
              required
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              aria-describedby={signingUp ? "username-rule" : undefined}
              className="h-10 text-base"
            />
            {signingUp && (
              <p id="username-rule" className="font-read text-sm text-muted-foreground">
                {t.auth.usernameRule}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">{t.auth.password}</Label>
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
            {signingUp && (
              <p id="password-rule" className="font-read text-sm text-muted-foreground">
                {t.auth.passwordRule}
              </p>
            )}
          </div>

          {error && (
            <p
              role="alert"
              className="pixel-frame flex items-start gap-2 bg-brick/15 px-3 py-2 font-read text-sm text-brick-text"
              data-tone="danger"
            >
              <Alert size={16} className="mt-0.5 shrink-0" aria-hidden /> {t.auth.errors[error]}
            </p>
          )}

          <Button type="submit" size="lg" className="mt-2 h-10 w-full text-base" disabled={pending}>
            {signingUp ? <UserPlus aria-hidden /> : <Login aria-hidden />}
            {submitLabel}
          </Button>
        </form>

        <p className="mt-6 border-t border-border pt-5 text-sm text-muted-foreground">
          {signingUp ? t.auth.haveAccount : t.auth.newHere}{" "}
          <button
            type="button"
            className="text-foreground underline underline-offset-4 hover:no-underline"
            onClick={switchFlow}
          >
            {signingUp ? t.auth.signIn : t.auth.createAnAccount}
          </button>
        </p>
      </Card>
    </>
  );
}
