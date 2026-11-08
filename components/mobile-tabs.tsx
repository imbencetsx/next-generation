"use client";

// Kis képernyőn a munkafelületek alján álló fülsor (mint egy mobilalkalmazásé): ikon és felirat, a kiválasztott fül
// arany. A WAI-ARIA fül-mintát követi: a nyilakkal (és Home/End) lehet lépni, a fül a hozzá tartozó panelt vezérli
// (`<prefix>-panel-<id>`). A panelek mind betöltve maradnak, csak a nem kiválasztottak rejtettek, így a szerkesztő és
// a szimulátor állapota fülváltáskor megmarad.

import { useRef, type ComponentType, type KeyboardEvent } from "react";
import type { IconProps } from "@/components/icons";

export type MobileTab<Id extends string> = {
  id: Id;
  label: string;
  icon: ComponentType<IconProps>;
  /** Kis szám a fülön (pl. a hibák száma); 0 vagy hiány esetén nincs. */
  count?: number;
  /** A szám hibát jelez (téglaszín). */
  alert?: boolean;
};

type Props<Id extends string> = {
  tabs: MobileTab<Id>[];
  active: Id;
  onChange: (id: Id) => void;
  label: string;
  /** A fülek és panelek azonosítóinak előtagja. */
  idPrefix: string;
};

export const tabId = (prefix: string, id: string) => `${prefix}-tab-${id}`;
export const panelId = (prefix: string, id: string) => `${prefix}-panel-${id}`;

export default function MobileTabs<Id extends string>({ tabs, active, onChange, label, idPrefix }: Props<Id>) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: KeyboardEvent, index: number) {
    const last = tabs.length - 1;
    const next = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: last }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const target = (next + tabs.length) % tabs.length;
    onChange(tabs[target].id);
    buttons.current[target]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className="mobile-tabs"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}
    >
      {tabs.map((tab, index) => {
        const selected = tab.id === active;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            ref={(element) => {
              buttons.current[index] = element;
            }}
            type="button"
            role="tab"
            id={tabId(idPrefix, tab.id)}
            aria-selected={selected}
            aria-controls={panelId(idPrefix, tab.id)}
            // A felolvasó a számot a név után hallja („Hibák, 2”); a látható jelvény díszítés.
            aria-label={tab.count ? `${tab.label}, ${tab.count}` : tab.label}
            tabIndex={selected ? 0 : -1}
            className="mobile-tab"
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            <span className="relative">
              <Icon size={20} aria-hidden />
              {!!tab.count && (
                <span aria-hidden className="mobile-tab-count" data-alert={tab.alert || undefined}>
                  {tab.count}
                </span>
              )}
            </span>
            <span className="mobile-tab-label">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Egy fülhöz tartozó panel kis képernyőn; a nem kiválasztott rejtett, de betöltve marad. */
export function TabPanel({
  idPrefix,
  id,
  active,
  className = "",
  children,
}: {
  idPrefix: string;
  id: string;
  active: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="tabpanel"
      id={panelId(idPrefix, id)}
      aria-labelledby={tabId(idPrefix, id)}
      hidden={!active}
      className={`min-h-0 flex-1 flex-col ${active ? "flex" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
