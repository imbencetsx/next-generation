// @vitest-environment happy-dom
// Kis képernyőn a térképszerkesztő fülekre bomlik (Rajz, Szöveg, Hibák); a matchMedia-t telefonméretre állítjuk.
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { I18nProvider } from "@/i18n/i18n-provider";
import MapEditor from "./index";

const navigation = vi.hoisted(() => ({ query: "" }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(navigation.query) }));
vi.mock("@/components/auth/user-menu", () => ({ default: () => null }));
vi.mock("convex/react", () => ({ useMutation: () => vi.fn(), useAction: () => vi.fn() }));

beforeEach(() => {
  localStorage.clear();
  navigation.query = new URLSearchParams({ map: "1 2\n>." }).toString();
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        matches: query.includes("max-width"),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function open() {
  render(
    <I18nProvider initialLocale="en">
      <MapEditor />
    </I18nProvider>,
  );
}

const panel = (name: string) => document.getElementById(`map-editor-panel-${name}`)!;

describe("map editor on a small screen", () => {
  test("starts on the drawing, with the text and the problems one tab away", () => {
    open();
    const tabs = within(screen.getByRole("tablist", { name: "Map editor views" })).getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual(["Draw", "Text", "Problems"]);
    expect(panel("draw").hidden).toBe(false);
    expect(panel("text").hidden).toBe(true);
    fireEvent.click(screen.getByRole("tab", { name: "Text" }));
    expect(panel("text").hidden).toBe(false);
    expect(panel("draw").hidden).toBe(true);
  });

  test("an invalid map shows a count on the Problems tab", () => {
    navigation.query = new URLSearchParams({ map: "1 2\n.." }).toString();
    open();
    expect(screen.getByRole("tab", { name: "Problems, 1" })).toBeTruthy();
  });
});
