// @vitest-environment happy-dom
import { cleanup, render, screen, within } from "@testing-library/react";
import { getFunctionName, type FunctionReference } from "convex/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { I18nProvider } from "@/i18n/i18n-provider";
import MapPage from "./index";

vi.mock("@/components/auth/user-menu", () => ({ default: () => null }));

// A lekérdezések válaszai függvénynév szerint (maps:get, results:leaderboard); undefined: még tölt.
const convex = vi.hoisted(() => ({ answers: {} as Record<string, unknown> }));
vi.mock("convex/react", () => ({
  useQuery: (query: FunctionReference<"query">) => convex.answers[getFunctionName(query)],
  useMutation: () => vi.fn(),
}));

const CORRIDOR = "3 10\n##########\n>.@..@.@.#\n##########";
const MAP = {
  _id: "map1",
  _creationTime: Date.UTC(2026, 10, 7),
  name: "Corridor run",
  text: CORRIDOR,
  rows: 3,
  cols: 10,
  goldCount: 3,
  authorName: "other",
  isMine: false,
  likeCount: 0,
  likedByMe: false,
};

beforeEach(() => {
  convex.answers = { "maps:get": MAP, "results:leaderboard": [] };
});
afterEach(() => cleanup());

function open(locale: "en" | "hu" = "en") {
  render(
    <I18nProvider initialLocale={locale}>
      <MapPage mapId="map1" />
    </I18nProvider>,
  );
}

describe("map page", () => {
  test("shows the map large with its details and a button to write a program for it", () => {
    open();
    expect(screen.getByRole("heading", { level: 1, name: "Corridor run" })).toBeTruthy();
    const preview = screen.getByRole("img", { name: "Map “Corridor run”, 3 rows by 10 columns" });
    // Az előnézet teljesen áll: három arany, csillogás nélkül.
    expect(preview.querySelectorAll(".gold-sprite")).toHaveLength(3);
    expect(preview.querySelectorAll(".gold-sparkle")).toHaveLength(0);
    expect(screen.getByText("3 × 10 cells, 3 gold")).toBeTruthy();
    const program = new URL(screen.getByRole("link", { name: "Write a program" }).getAttribute("href")!, "http://x");
    expect(program.pathname).toBe("/workbench");
    expect(program.searchParams.get("mapId")).toBe("map1");
    expect(screen.getByRole("link", { name: "Back to home" }).getAttribute("href")).toBe("/");
  });

  test("lists the leaderboard with places, gold and steps, marking the player's own row", () => {
    convex.answers["results:leaderboard"] = [
      { place: 1, name: "ada", gold: 3, steps: 60, isMe: false },
      { place: 2, name: "miner", gold: 3, steps: 64, isMe: true },
      { place: 2, name: "bob", gold: 3, steps: 64, isMe: false },
      { place: 4, name: "cy", gold: 2, steps: 10, isMe: false },
    ];
    open("hu");
    const table = screen.getByRole("table", { name: "Ranglista" });
    const [, ...rows] = within(table).getAllByRole("row");
    const cells = rows.map((row) => within(row).getAllByRole("cell"));
    // Az első három helyen érem van (díszítés, a felolvasó a rejtett „1.” szöveget kapja), utána sima szám.
    const medalColor = (cell: HTMLElement) =>
      cell.querySelector<HTMLElement>(".pixel-avatar-face")?.style.background ?? null;
    expect(cells.map(([place]) => medalColor(place))).toEqual([
      "var(--medal-gold)",
      "var(--medal-silver)",
      "var(--medal-silver)",
      null,
    ]);
    expect(cells.map(([place]) => place.querySelector(".sr-only")?.textContent ?? place.textContent)).toEqual([
      "1.",
      "2.",
      "2.",
      "4.",
    ]);
    expect(cells.map(([, name, gold, steps]) => [name.textContent, gold.textContent, steps.textContent])).toEqual([
      ["ada", "3", "60"],
      ["miner (te)", "3", "64"],
      ["bob", "3", "64"],
      ["cy", "2", "10"],
    ]);
    // Csak a saját sor kiemelt.
    expect(rows.map((row) => row.className.includes("bg-accent"))).toEqual([false, true, false, false]);
    expect(screen.getByText(/Azonos aranynál a kevesebb lépés nyer/)).toBeTruthy();
  });

  test("the heart is on every map page, but only the author sees who liked the map", () => {
    open();
    expect(screen.getByRole("button", { name: "Like “Corridor run”, 0 likes" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Liked by" })).toBeNull();
    cleanup();

    convex.answers["maps:get"] = { ...MAP, isMine: true, likeCount: 1 };
    convex.answers["likes:likers"] = [{ name: "digger", imageUrl: null, likedAt: Date.UTC(2026, 10, 8), isMe: false }];
    open();
    expect(screen.getByRole("heading", { level: 2, name: "Liked by" })).toBeTruthy();
    expect(screen.getByRole("list", { name: "Liked by" }).textContent).toContain("digger");
  });

  test("an empty leaderboard invites the player instead of showing an empty table", () => {
    open();
    expect(screen.getByText("No one has completed this map yet.")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  test("a deleted or unknown map shows a clear message", () => {
    convex.answers["maps:get"] = null;
    open("hu");
    expect(screen.getByRole("heading", { level: 1, name: "Nincs ilyen térkép" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Program írása" })).toBeNull();
  });

  test("while loading, it says so", () => {
    convex.answers["maps:get"] = undefined;
    open();
    expect(screen.getByRole("status").textContent).toContain("Loading");
  });
});
