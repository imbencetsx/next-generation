"use client";

// A kezdőlap (/): a bányajárat robotja köszönti a játékost, alatta a játékosok által közzétett térképek.
// Dobozok nélkül: a szerkezetet a vonalak és a térképek képei adják, a figyelmet a robot és a járat viszi.

import Logo from "@/components/logo";
import TopBar, { AccountActions } from "@/components/top-bar";
import { PublishedMapsHeader, PublishedMapsList, usePublishedMaps } from "./published-maps";
import RobotGreeting from "./robot-greeting";
import NewFileMenu from "./new-file-menu";

/** @param greeting A robot üdvözlő mondatának indexe (a szerver sorsolja). */
export default function HomePage({ greeting = 0 }: { greeting?: number }) {
  const maps = usePublishedMaps();
  return (
    <div className="app-ui min-h-dvh">
      <TopBar brand={<Logo />}>
        <NewFileMenu />
        <AccountActions withSeparator />
      </TopBar>

      <main>
        <div className="mx-auto max-w-6xl px-4 pt-12 pb-14 sm:pt-16">
          <RobotGreeting greeting={greeting} />
        </div>

        <section aria-labelledby="published-title" className="border-t border-border">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12">
            <PublishedMapsHeader maps={maps} />
            <PublishedMapsList maps={maps} />
          </div>
        </section>
      </main>
    </div>
  );
}
