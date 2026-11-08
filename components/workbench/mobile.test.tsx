// @vitest-environment happy-dom
// Kis képernyőn a munkafelület fülekre bomlik; a matchMedia-t telefonméretre állítjuk.
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { I18nProvider } from "@/i18n/i18n-provider";
import Workbench from "./index";

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("") }));
vi.mock("@/components/auth/user-menu", () => ({ default: () => null }));
vi.mock("convex/react", () => ({ useMutation: () => vi.fn(), useQuery: () => null }));

beforeEach(() => {
  localStorage.clear();
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
      <Workbench />
    </I18nProvider>,
  );
}

const panel = (name: string) => document.getElementById(`workbench-panel-${name}`)!;

describe("workbench on a small screen", () => {
  test("shows one view at a time behind a tab bar, starting with the code", () => {
    open();
    const tabs = within(screen.getByRole("tablist", { name: "Workbench views" })).getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual(["Code", "Map", "Console", "Problems"]);
    expect(screen.getByRole("tab", { name: "Code" }).getAttribute("aria-selected")).toBe("true");
    expect(panel("code").hidden).toBe(false);
    expect(panel("map").hidden).toBe(true);

    fireEvent.click(screen.getByRole("tab", { name: "Map" }));
    expect(panel("map").hidden).toBe(false);
    expect(panel("code").hidden).toBe(true);
    // A rejtett panelek betöltve maradnak (a szerkesztő állapota megmarad).
    expect(within(panel("code")).getByLabelText("Program name")).toBeTruthy();
  });

  test("arrow keys move between the tabs", () => {
    open();
    const code = screen.getByRole("tab", { name: "Code" });
    fireEvent.keyDown(code, { key: "ArrowLeft" });
    expect(screen.getByRole("tab", { name: "Problems" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(screen.getByRole("tab", { name: "Problems" }), { key: "Home" });
    expect(code.getAttribute("aria-selected")).toBe("true");
  });

  test("the run controls stay above the tabs, and importing a map enables running and switches to the map", async () => {
    open();
    // Egyetlen vezérlősor van, a dokkban: a lépés és a visszaállítás ikongomb.
    expect(screen.getAllByRole("group", { name: "Playback" })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Step" }).textContent).toBe("");
    expect(screen.getByRole("button", { name: "Run" }).hasAttribute("disabled")).toBe(true);
    fireEvent.change(document.querySelector<HTMLInputElement>('input[type="file"][accept^=".txt"]')!, {
      target: { files: [new File(["1 1\n>"], "tiny.map")] },
    });
    await waitFor(() => expect(screen.getByRole("button", { name: "Run" }).hasAttribute("disabled")).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "Run" }));
    expect(screen.getByRole("tab", { name: "Map" }).getAttribute("aria-selected")).toBe("true");
  });
});
