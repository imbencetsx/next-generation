// @vitest-environment happy-dom
// Időutazás és szellem a munkafelületen: az idővonalon visszanézett állapot és az 1. helyezett útja.
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { getFunctionName, type FunctionReference } from "convex/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { I18nProvider } from "@/i18n/i18n-provider";
import { encodeRobot } from "@/lib/scoring";
import Workbench from "./index";

const navigation = vi.hoisted(() => ({ query: "" }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(navigation.query) }));
vi.mock("@/components/auth/user-menu", () => ({ default: () => null }));
const convex = vi.hoisted(() => ({
  ghost: null as { name: string; isMe: boolean; gold: number; steps: number; trace: number[] } | null,
}));
vi.mock("convex/react", () => ({
  useMutation: () => vi.fn(async () => ({ run: { gold: 0, steps: 0, errorCode: null }, best: null, improved: false })),
  useQuery: (query: FunctionReference<"query">, args: unknown) => {
    if (args === "skip") return undefined;
    return getFunctionName(query) === "results:ghost" ? convex.ghost : null;
  },
}));

const CORRIDOR = "3 10\n##########\n>.@..@.@.#\n##########";

beforeEach(() => {
  localStorage.clear();
  convex.ghost = null;
});
afterEach(() => cleanup());

function open(query: Record<string, string>) {
  navigation.query = new URLSearchParams({ map: CORRIDOR, ...query }).toString();
  render(
    <I18nProvider initialLocale="en">
      <Workbench />
    </I18nProvider>,
  );
}

const step = () => fireEvent.click(screen.getByRole("button", { name: "Step" }));
// A konzol sorai „> ” előtaggal jelennek meg.
const consoleLines = () =>
  within(screen.getByRole("log"))
    .queryAllByText(/\d+$/)
    .map((line) => line.textContent?.replace(/^>\s*/, ""));
const slider = () => screen.getByRole("slider", { name: "Timeline" }) as HTMLInputElement;

describe("time travel", () => {
  test("the timeline appears after the first step and covers every processed line", () => {
    open({ code: "print 1\nprint 2\nprint 3" });
    expect(screen.queryByRole("slider", { name: "Timeline" })).toBeNull();
    step();
    step();
    step();
    expect(slider().max).toBe("3");
    expect(slider().value).toBe("3");
    expect(slider().getAttribute("aria-valuetext")).toBe("After 3 of 3 processed lines, printed");
  });

  test("seeking back shows that moment's console and status, and Step moves forward through the history", () => {
    open({ code: "print 1\nprint 2\nprint 3" });
    step();
    step();
    step();
    fireEvent.change(slider(), { target: { value: "1" } });
    expect(consoleLines()).toEqual(["1"]);
    expect(screen.getByText("Reviewing an earlier moment")).toBeTruthy();

    // A lépés visszanézés közben az idővonalon halad, a gépet nem lépteti (a vége a 3 sor marad).
    step();
    expect(consoleLines()).toEqual(["1", "2"]);
    expect(slider().max).toBe("3");

    fireEvent.click(screen.getByRole("button", { name: "Step back" }));
    expect(consoleLines()).toEqual(["1"]);
    fireEvent.click(screen.getByRole("button", { name: "Back to live" }));
    expect(consoleLines()).toEqual(["1", "2", "3"]);
    expect(screen.queryByText("Reviewing an earlier moment")).toBeNull();
  });

  test("Reset clears the timeline", () => {
    open({ code: "print 1" });
    step();
    expect(slider()).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.queryByRole("slider", { name: "Timeline" })).toBeNull();
  });
});

describe("ghost of the #1 run", () => {
  const at = (x: number) => encodeRobot({ x, y: 1, dir: 3 }, 10);

  test("is off by default, then follows the player's line count on a published map and can be hidden", () => {
    convex.ghost = { name: "digger", isMe: false, gold: 2, steps: 3, trace: [at(0), at(2), at(2), at(5)] };
    open({ code: "print 1\nprint 2", map: CORRIDOR, mapId: "map1", mapName: "Corridor run" });
    const toggle = screen.getByRole("button", { name: "Ghost" });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    expect(screen.queryByText(/^Ghost: the #1 run/)).toBeNull();
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Ghost: the #1 run by digger (2 gold, 3 steps), line by line.")).toBeTruthy();
    // Futás előtt nem látszik; egy sor után a szellem is egy sornál (a 3. oszlopban) jár.
    expect(document.querySelector(".pixel-ghost")).toBeNull();
    step();
    const ghost = document.querySelector<HTMLElement>(".pixel-ghost")!;
    expect(ghost.textContent).toBe("#1");
    // Mérés nélkül a mező 32 px: a 3. oszlop (x = 2) és a 2. sor (y = 1).
    expect(ghost.style.transform).toBe("translate(64px, 32px)");

    fireEvent.click(toggle);
    expect(document.querySelector(".pixel-ghost")).toBeNull();
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
  });

  test("is not offered on a map without a published leaderboard", () => {
    open({ code: "print 1", map: CORRIDOR });
    expect(screen.queryByRole("button", { name: "Ghost" })).toBeNull();
  });
});
