"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { Logout } from "@/components/icons";
import { useRouter } from "next/navigation";
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
      <span className="flex items-center gap-2 text-sm">
        <span className="pixel-frame display grid size-7 place-items-center bg-accent text-sm" aria-hidden>
          {viewer?.name.charAt(0).toUpperCase() ?? "·"}
        </span>
        <span className="sr-only">{t.auth.signedInAs}</span>
        <span className="max-sm:sr-only">{viewer?.name ?? "…"}</span>
      </span>
      <Button variant="ghost" size="icon" onClick={leave} aria-label={t.auth.signOut} title={t.auth.signOut}>
        <Logout aria-hidden />
      </Button>
    </div>
  );
}
