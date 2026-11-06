"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";

export default function UserMenu() {
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
        <span className="sr-only">Signed in as</span>
        <span className="max-sm:sr-only">{viewer?.name ?? "…"}</span>
      </span>
      <Button variant="ghost" size="icon" onClick={leave} aria-label="Sign out" title="Sign out">
        <LogOut aria-hidden />
      </Button>
    </div>
  );
}
