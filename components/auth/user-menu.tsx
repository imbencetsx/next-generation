"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { Logout } from "@/components/icons";
import { useState } from "react";
import Link from "next/link";
import Avatar from "@/components/auth/avatar";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useI18n } from "@/i18n/i18n-provider";
import { ROUTES } from "@/lib/routes";

export default function UserMenu() {
  const { t } = useI18n();
  const viewer = useQuery(api.users.viewer);
  const { signOut } = useAuthActions();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function leave() {
    if (pending) return;
    setPending(true);
    setFailed(false);
    try {
      await signOut();
      // Új dokumentumot töltünk: ne maradjon meg a kliensoldalon félretett belépőűrlap.
      window.location.replace(ROUTES.login);
    } catch {
      setFailed(true);
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href={ROUTES.profile}
        className="flex items-center gap-2 px-1 py-1.5 text-sm"
        title={t.profile.open}
        aria-label={t.profile.open}
      >
        <Avatar name={viewer?.name ?? "·"} imageUrl={viewer?.imageUrl ?? null} />
        <span className="sr-only">{t.auth.signedInAs}</span>
        <span className="font-read max-sm:sr-only">{viewer ? `@${viewer.name}` : "…"}</span>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        onClick={leave}
        disabled={pending}
        aria-label={pending ? t.auth.signingOut : t.auth.signOut}
        title={t.auth.signOut}
      >
        <Logout aria-hidden />
      </Button>
      {failed && (
        <p role="alert" className="max-w-48 font-read text-xs text-brick-text">
          {t.auth.signOutFailed}
        </p>
      )}
    </div>
  );
}
