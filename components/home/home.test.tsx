// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { I18nProvider } from "@/i18n/i18n-provider";
import type { PublishedMap } from "./map-card";
import HomePage from "./index";

vi.mock("@/components/auth/user-menu", () => ({ default: () => null }));

const convex = vi.hoisted(() => ({
  results: [] as PublishedMap[],
  status: "Exhausted" as string,
  lastArgs: null as unknown,
  loadMore: vi.fn(),
  remove: vi.fn(),
  /** A ranglista-lekérdezés válasza térképenként (undefined: még tölt). */
  leaderboards: {} as Record<string, unknown>,
}));
vi.mock("convex/react", () => ({
  usePaginatedQuery: (_query: unknown, args: unknown) => {
    convex.lastArgs = args;
    return { results: convex.results, status: convex.status, loadMore: convex.loadMore };
  },
  useMutation: () => convex.remove,
  useQuery: (_query: unknown, args: { mapId: string }) => convex.leaderboards[args.mapId] ?? [],
}));

function map(overrides: Partial<PublishedMap>): PublishedMap {
  return {
    _id: "map1" as PublishedMap["_id"],
    _creationTime: Date.UTC(2026, 10, 7),
    name: "Corridor run",
    text: "3 10\n##########\n>.@..@.@.#\n##########",
    rows: 3,
    cols: 10,
    goldCount: 3,
    authorName: "other",
    isMine: false,
    ...overrides,
  };
}

beforeEach(() => {
  convex.results = [];
  convex.status = "Exhausted";
  convex.lastArgs = null;
  convex.loadMore.mockReset();
  convex.remove.mockReset();
  convex.leaderboards = {};
});
afterEach(() => cleanup());

function open(locale: "en" | "hu" = "en") {
  render(
    <I18nProvider initialLocale={locale}>
      <HomePage />
    </I18nProvider>,
  );
}

describe("home page", () => {
  test("offers writing a program and making a map", () => {
    open();
    expect(screen.getByRole("heading", { level: 1, name: "Mine for gold with code" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open the code editor" }).getAttribute("href")).toBe("/workbench");
    expect(screen.getByRole("link", { name: "Open the map editor" }).getAttribute("href")).toBe("/map-editor");
  });

  test("lists a published map with its preview, author and details, and links it to both editors", () => {
    convex.results = [map({})];
    open();
    const card = screen.getByRole("article", { name: "Corridor run" });
    expect(within(card).getByRole("img", { name: "Map “Corridor run”, 3 rows by 10 columns" })).toBeTruthy();
    expect(card.textContent).toContain("by other");
    expect(card.textContent).toContain("3 × 10 · 3 gold");
    const program = new URL(
      within(card).getByRole("link", { name: "Write a program" }).getAttribute("href")!,
      "http://x",
    );
    expect(program.pathname).toBe("/workbench");
    expect(program.searchParams.get("map")).toBe(map({}).text);
    expect(program.searchParams.get("mapName")).toBe("Corridor run");
    expect(program.searchParams.get("mapId")).toBe("map1");
    expect(card.textContent).toContain("No one has completed this map yet.");
    expect(card.textContent).not.toContain("Your best");
    // A kártyán csak a programírás link van (és saját térképnél a törlés).
    expect(within(card).getAllByRole("link")).toHaveLength(1);
    expect(within(card).queryByRole("button", { name: "Delete" })).toBeNull();
  });

  test("a map card shows the top 5 players with places, gold and steps, marking the player's own row", () => {
    convex.results = [map({})];
    convex.leaderboards = {
      map1: [
        { place: 1, name: "ada", gold: 3, steps: 60, isMe: false },
        { place: 2, name: "miner", gold: 3, steps: 64, isMe: true },
        { place: 2, name: "bob", gold: 3, steps: 64, isMe: false },
      ],
    };
    open("hu");
    const card = screen.getByRole("article", { name: "Corridor run" });
    const table = within(card).getByRole("table", { name: "Legjobb 5" });
    const rows = within(table)
      .getAllByRole("row")
      .map((row) => row.textContent);
    expect(rows).toEqual(["#JátékosAranyLépés", "1.ada360", "2.miner (te)364", "2.bob364"]);
    expect(screen.getByRole("heading", { name: "Szabad program írása" })).toBeTruthy();
  });

  test("the Mine filter asks only for the player's own maps and has its own empty message", () => {
    open();
    expect(screen.getByText("No one has published a map yet. Be the first!")).toBeTruthy();
    expect(convex.lastArgs).toEqual({ mine: false });
    fireEvent.click(screen.getByRole("button", { name: "Mine" }));
    expect(convex.lastArgs).toEqual({ mine: true });
    expect(screen.getByRole("button", { name: "Mine" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("You haven't published a map yet.")).toBeTruthy();
  });

  test("an own map can be deleted after confirming", async () => {
    convex.results = [map({ isMine: true })];
    convex.remove.mockResolvedValue(null);
    open();
    const card = screen.getByRole("article", { name: "Corridor run" });
    expect(card.textContent).toContain("by you");
    fireEvent.click(within(card).getByRole("button", { name: "Delete" }));
    expect(convex.remove).not.toHaveBeenCalled();
    fireEvent.click(within(card).getByRole("button", { name: "Cancel" }));
    fireEvent.click(within(card).getByRole("button", { name: "Delete" }));
    const confirm = within(card).getByRole("group", { name: "Delete this map for everyone?" });
    fireEvent.click(within(confirm).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(convex.remove).toHaveBeenCalledWith({ mapId: "map1" }));
  });

  test("more maps can be loaded, and the page is in Hungarian too", () => {
    convex.results = [map({})];
    convex.status = "CanLoadMore";
    open("hu");
    fireEvent.click(screen.getByRole("button", { name: "Továbbiak" }));
    expect(convex.loadMore).toHaveBeenCalledWith(9);
    expect(screen.getByRole("heading", { level: 1, name: "Bányássz aranyat kóddal" })).toBeTruthy();
    expect(screen.getByText("Közzétett térképek")).toBeTruthy();
  });
});
