"use client";

// A profil oldal (/profile): profilkép, felhasználónév és jelszó, egymástól független űrlapokon.

import Link from "next/link";
import { useQuery } from "convex/react";
import { ChevronLeft } from "@/components/icons";
import LoadingStatus from "@/components/loading-status";
import Logo from "@/components/logo";
import TopBar, { AccountActions } from "@/components/top-bar";
import { buttonVariants } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useI18n } from "@/i18n/i18n-provider";
import PasswordForm from "./password-form";
import PictureForm from "./picture-form";
import UsernameForm from "./username-form";
import { ROUTES } from "@/lib/routes";

/** Ide visz vissza a logó és a „Vissza” gomb. */
const BACK_HREF = ROUTES.home;

export default function ProfilePage() {
  const { t } = useI18n();
  const viewer = useQuery(api.users.viewer);

  return (
    <div className="app-ui min-h-dvh">
      <TopBar
        brand={
          <Link href={BACK_HREF} aria-label={t.profile.back}>
            <Logo />
          </Link>
        }
      >
        <AccountActions />
      </TopBar>

      <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6 sm:py-10">
        <Link
          href={BACK_HREF}
          data-slot="button"
          data-variant="ghost"
          className={buttonVariants({ variant: "ghost", className: "self-start" })}
        >
          <ChevronLeft />
          {t.profile.back}
        </Link>

        <div className="mb-2 space-y-2">
          <h1 className="display text-4xl sm:text-5xl">{t.profile.title}</h1>
          <p className="font-read text-sm text-muted-foreground">{t.profile.description}</p>
        </div>

        {viewer ? (
          <>
            <PictureForm name={viewer.name} imageUrl={viewer.imageUrl} />
            <UsernameForm name={viewer.name} />
            <PasswordForm name={viewer.name} />
          </>
        ) : (
          <LoadingStatus message="checkingSession" fullScreen={false} />
        )}
      </main>
    </div>
  );
}
