"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { Logout } from "@/components/icons";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Avatar from "@/components/auth/avatar";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useI18n } from "@/i18n/i18n-provider";

export default function UserMenu() {
  const { t } = useI18n();
  const viewer = useQuery(api.users.viewer);
  const { signOut } = useAuthActions();
  const router = useRouter();

  async function leave() {
    await signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/profile" className="flex items-center gap-2 px-1 py-1.5 text-sm" title={t.profile.open} aria-label={t.profile.open}>
        <Avatar name={viewer?.name ?? "·"} imageUrl={viewer?.imageUrl ?? null} />
        <span className="sr-only">{t.auth.signedInAs}</span>
        <span className="font-read max-sm:sr-only">{viewer ? `@${viewer.name}` : "…"}</span>
      </Link>
      <Button variant="ghost" size="icon" onClick={leave} aria-label={t.auth.signOut} title={t.auth.signOut}>
        <Logout aria-hidden />
      </Button>
    </div>
  );
}
