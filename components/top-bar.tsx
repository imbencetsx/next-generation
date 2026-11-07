// Az alkalmazás felső sávja: balra a logó (vagy egy rá épülő link/cím), jobbra az oldal műveletei.
// Szerverkomponensből is használható; a kliensoldali részek (nyelvváltó, felhasználói menü) gyerekként jönnek.

import type { ReactNode } from "react";
import UserMenu from "@/components/auth/user-menu";
import LanguageSwitch from "@/components/language-switch";

type Props = {
  /** A bal oldali márkajelzés, pl. `<Logo />` egy címsorban vagy egy linkben. */
  brand: ReactNode;
  children?: ReactNode;
};

export default function TopBar({ brand, children }: Props) {
  return (
    <header className="topbar">
      <div className="flex min-h-[68px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-1.5">
        {brand}
        <div className="ml-auto flex items-center gap-2">{children}</div>
      </div>
    </header>
  );
}

/** Bejelentkezett oldalak jobb széle: nyelvváltó, elválasztó, felhasználói menü. */
export function AccountActions() {
  return (
    <>
      <LanguageSwitch />
      <span className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden />
      <UserMenu />
    </>
  );
}
