// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { I18nProvider } from "@/i18n/i18n-provider";
import type { PublishedMap } from "./map-entry";
import { MESSAGES } from "@/i18n/messages";
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
  viewer: { _id: "user1", name: "miner", imageUrl: null } as unknown,
}));
vi.mock("convex/react", () => ({
  usePaginatedQuery: (_query: unknown, args: unknown) => {
    convex.lastArgs = args;
    return { results: convex.results, status: convex.status, loadMore: convex.loadMore };
  },
  useMutation: () => convex.remove,
  // A ranglista-lekérdezés térképazonosítót kap, a bejelentkezett játékos lekérdezése nem.
  useQuery: (_query: unknown, args?: { mapId?: string }) =>
    args?.mapId ? (convex.leaderboards[args.mapId] ?? []) : convex.viewer,
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
  convex.viewer = { _id: "user1", name: "miner", imageUrl: null };
});
afterEach(() => cleanup());

function open(locale: "en" | "hu" = "en", greeting = 0) {
  render(
    <I18nProvider initialLocale={locale}>
      <HomePage greeting={greeting} />
    </I18nProvider>,
  );
}

describe("home page", () => {
  for (const locale of ["en", "hu"] as const) {
    test(`the new-file menu offers an empty program and a new map in ${locale}`, async () => {
      open(locale);
      const t = MESSAGES[locale];
      const trigger = screen.getByRole("button", { name: t.home.newFile });
      expect(trigger.querySelector("svg")).toBeTruthy();
      expect(screen.queryByRole("link", { name: t.editor.docs })).toBeNull();
      fireEvent.click(trigger);
      const menu = await screen.findByRole("menu", { name: t.home.newFile });
      const program = new URL(
        within(menu).getByRole("menuitem", { name: t.home.newProgram }).getAttribute("href")!,
        "http://x",
      );
      expect(program.pathname).toBe("/workbench");
      expect(program.searchParams.get("code")).toBe("");
      expect(program.searchParams.get("filename")).toBe("untitled");
      expect(within(menu).getByRole("menuitem", { name: t.home.newMap }).getAttribute("href")).toBe("/map-editor");
      fireEvent.keyDown(menu, { key: "Escape" });
      await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    });
  }

  test("the robot greets the player by name with the line the server picked, in either language", () => {
    open("hu", 0);
    expect(screen.getByRole("heading", { level: 1, name: "Üdv vissza, miner!" })).toBeTruthy();
    cleanup();
    open("en", 4);
    expect(screen.getByRole("heading", { level: 1, name: "Pickaxe up, miner!" })).toBeTruthy();
    // Az ideiglenesen eltávolított belépési pontok nincsenek a lapon.
    expect(screen.queryByRole("link", { name: "Open the code editor" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Open the map editor" })).toBeNull();
  });

  test("before the player's name loads, the greeting stays empty instead of showing a broken line", () => {
    convex.viewer = undefined;
    open();
    expect(screen.getByRole("heading", { level: 1 }).textContent?.trim()).toBe("");
  });

  test("both languages have the same greetings, so switching language keeps the same line", () => {
    expect(MESSAGES.hu.home.greetings).toHaveLength(MESSAGES.en.home.greetings.length);
  });

  test("lists a published map with its preview, author and details, and links it to both editors", () => {
    convex.results = [map({})];
    open();
    const card = screen.getByRole("article", { name: "Corridor run" });
    expect(within(card).getByRole("img", { name: "Map “Corridor run”, 3 rows by 10 columns" })).toBeTruthy();
    expect(card.textContent).toContain("by other");
    expect(card.textContent).toContain("3 × 10 cells, 3 gold");
    const program = new URL(
      within(card).getByRole("link", { name: "Write a program" }).getAttribute("href")!,
      "http://x",
    );
    expect(program.pathname).toBe("/workbench");
    expect(program.searchParams.get("map")).toBe(map({}).text);
    expect(program.searchParams.get("mapName")).toBe("Corridor run");
    expect(program.searchParams.get("mapId")).toBe("map1");
    expect(card.textContent).not.toContain("Your best");
    // A kártyán a programírás és a ranglista link van (és saját térképnél a törlés).
    expect(within(card).getAllByRole("link")).toHaveLength(2);
    expect(within(card).queryByRole("button", { name: "Delete map" })).toBeNull();
  });

  test("gold shines on the mine strip and in every map preview", () => {
    convex.results = [map({})];
    open();
    const card = screen.getByRole("article", { name: "Corridor run" });
    // A Corridor pályán három arany van; mindegyik a szimulátoréval azonos csillogó sprite.
    expect(card.querySelectorAll(".gold-sparkle")).toHaveLength(3);
    expect(document.querySelectorAll(".gold-sparkle").length).toBeGreaterThan(3);
  });

  test("a map card's Leaderboard button opens the map's own page", () => {
    convex.results = [map({})];
    open("hu");
    const card = screen.getByRole("article", { name: "Corridor run" });
    expect(within(card).getByRole("link", { name: "Ranglista" }).getAttribute("href")).toBe("/maps/map1");
    expect(within(card).queryByRole("table")).toBeNull();
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

  test("an own map is deleted with an icon-only button, only after confirming in a dialog", async () => {
    convex.results = [map({ isMine: true })];
    convex.remove.mockResolvedValue(null);
    open();
    const card = screen.getByRole("article", { name: "Corridor run" });
    expect(card.textContent).toContain("by you");
    const trash = within(card).getByRole("button", { name: "Delete map" });
    // Csak ikon: a gomb neve az akadálymentes címkéből jön, látható szöveg nincs benne.
    expect(trash.textContent).toBe("");
    // Pixeles gomb marad (keret és perem a data-slot="button" jelre kerül), akkor is, ha a párbeszéd nyitja.
    expect(trash.dataset.slot).toBe("button");
    expect(trash.dataset.variant).toBe("destructive");

    fireEvent.click(trash);
    const dialog = await screen.findByRole("alertdialog", { name: "Delete “Corridor run”?" });
    expect(dialog.textContent).toContain("This can't be undone.");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(convex.remove).not.toHaveBeenCalled();

    fireEvent.click(trash);
    const again = await screen.findByRole("alertdialog");
    for (const name of ["Cancel", "Delete"]) {
      expect(within(again).getByRole("button", { name }).dataset.slot).toBe("button");
    }
    fireEvent.click(within(again).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(convex.remove).toHaveBeenCalledWith({ mapId: "map1" }));
  });

  test("a failed delete is explained inside the dialog", async () => {
    convex.results = [map({ isMine: true })];
    convex.remove.mockRejectedValue(new Error('ConvexError: {"code":"MAP_forbidden"}'));
    open("hu");
    fireEvent.click(screen.getByRole("button", { name: "Térkép törlése" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Törlöd: „Corridor run”?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Törlés" }));
    expect(await within(dialog).findByText("Csak a saját térképedet törölheted.")).toBeTruthy();
  });

  test("more maps can be loaded, and the page is in Hungarian too", () => {
    convex.results = [map({})];
    convex.status = "CanLoadMore";
    open("hu");
    fireEvent.click(screen.getByRole("button", { name: "Továbbiak" }));
    expect(convex.loadMore).toHaveBeenCalledWith(9);
    expect(screen.getByRole("heading", { level: 1, name: "Üdv vissza, miner!" })).toBeTruthy();
    expect(screen.getByText("Közzétett térképek")).toBeTruthy();
  });
});
