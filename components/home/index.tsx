"use client";

// A kezdőlap (/): a bányajárat robotja köszönti a játékost a csillagos, parázsló bányaég alatt, alatta néhány
// beépített pálya, majd a legújabb közzétett térképek; mindkettőnek „összes” linkje a saját oldalára (/maps/built-in,
// /maps). Dobozok nélkül: a szerkezetet a vonalak és a térképek képei adják, a figyelmet a robot és a járat viszi.

import Logo from "@/components/logo";
import BuiltInMaps from "@/components/maps/built-in-maps";
import SectionHeader, { SeeAllLink } from "@/components/maps/section-header";
import Embers from "@/components/scene/embers";
import StarField from "@/components/scene/star-field";
import TopBar, { AccountActions } from "@/components/top-bar";
import { useI18n } from "@/i18n/i18n-provider";
import { ROUTES } from "@/lib/routes";
import { HOME_PUBLISHED_COUNT, PublishedMapsHeader, PublishedMapsList, usePublishedMaps } from "./published-maps";
import RobotGreeting from "./robot-greeting";
import NewFileMenu from "./new-file-menu";

/** A kezdőlapon ennyi beépített pálya látszik (egy sor). */
const HOME_BUILT_IN_COUNT = 3;

/** @param greeting A robot üdvözlő mondatának indexe (a szerver sorsolja). */
export default function HomePage({ greeting = 0 }: { greeting?: number }) {
  const { t } = useI18n();
  const maps = usePublishedMaps(HOME_PUBLISHED_COUNT);
  return (
    <div className="app-ui min-h-dvh">
      <TopBar brand={<Logo />}>
        <NewFileMenu />
        <AccountActions withSeparator />
      </TopBar>

      <main>
        <div className="home-hero">
          <StarField />
          <Embers />
          <div className="relative mx-auto max-w-6xl px-4 pt-12 pb-14 sm:pt-16">
            <RobotGreeting greeting={greeting} />
          </div>
        </div>

        <section aria-labelledby="built-in-title" className="border-t border-border">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12">
            <SectionHeader id="built-in-title" title={t.home.builtInTitle} intro={t.home.builtInIntro}>
              <SeeAllLink href={ROUTES.builtInMaps} label={t.home.allBuiltIn} />
            </SectionHeader>
            <BuiltInMaps limit={HOME_BUILT_IN_COUNT} />
          </div>
        </section>

        <section aria-labelledby="published-title" className="border-t border-border">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12">
            <PublishedMapsHeader maps={maps} />
            <PublishedMapsList maps={maps} limit={HOME_PUBLISHED_COUNT} />
          </div>
        </section>
      </main>
    </div>
  );
}
