// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { getFunctionName, type FunctionReference } from "convex/server";
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
  toggleLike: vi.fn(),
  /** A kedvelők névsora térképenként (likes:likers). */
  likers: {} as Record<string, unknown>,
  /** A ranglista-lekérdezés válasza térképenként (undefined: még tölt). */
  leaderboards: {} as Record<string, unknown>,
  viewer: { _id: "user1", name: "miner", imageUrl: null } as unknown,
}));
vi.mock("convex/react", () => ({
  usePaginatedQuery: (_query: unknown, args: unknown) => {
    convex.lastArgs = args;
    return { results: convex.results, status: convex.status, loadMore: convex.loadMore };
  },
  useMutation: (mutation: FunctionReference<"mutation">) =>
    getFunctionName(mutation) === "likes:toggle" ? convex.toggleLike : convex.remove,
  // A térképes lekérdezések térképazonosítót kapnak, a bejelentkezett játékos lekérdezése nem.
  useQuery: (query: FunctionReference<"query">, args?: { mapId?: string }) => {
    if (!args?.mapId) return convex.viewer;
    if (getFunctionName(query) === "likes:likers") return convex.likers[args.mapId];
    return convex.leaderboards[args.mapId] ?? [];
  },
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
    likeCount: 0,
    likedByMe: false,
    ...overrides,
  };
}

beforeEach(() => {
  convex.results = [];
  convex.status = "Exhausted";
  convex.lastArgs = null;
  convex.loadMore.mockReset();
  convex.remove.mockReset();
  convex.toggleLike.mockReset();
  convex.likers = {};
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
      expect(
        new URL(within(menu).getByRole("menuitem", { name: t.home.newMap }).getAttribute("href")!, "http://x").pathname,
      ).toBe("/map-editor");
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

  test("gold shines on the mine strip, while map previews stay completely still", () => {
    convex.results = [map({})];
    open();
    const card = screen.getByRole("article", { name: "Corridor run" });
    // A Corridor pályán három arany van: az előnézetben álló sprite-ok, csillogás nélkül.
    expect(card.querySelectorAll(".gold-sprite")).toHaveLength(3);
    expect(card.querySelectorAll(".gold-sparkle")).toHaveLength(0);
    expect(document.querySelectorAll(".gold-sparkle").length).toBeGreaterThan(0);
  });

  test("a map card's Leaderboard button opens the map's own page", () => {
    convex.results = [map({})];
    open("hu");
    const card = screen.getByRole("article", { name: "Corridor run" });
    expect(within(card).getByRole("link", { name: "Ranglista" }).getAttribute("href")).toBe("/maps/map1");
    expect(within(card).queryByRole("table")).toBeNull();
  });

  test("the home page shows a few built-in maps above the newest published ones, each with a link to all", () => {
    convex.results = Array.from({ length: 8 }, (_, index) =>
      map({ _id: `map${index}` as PublishedMap["_id"], name: `Map ${index}` }),
    );
    convex.status = "CanLoadMore";
    open();
    // A kezdőlap csak az első néhány közzétett térképet kéri, és nem lapoz, nem szűr.
    expect(convex.lastArgs).toEqual({ mine: false });
    expect(screen.queryByRole("button", { name: "Mine" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();

    const builtIn = screen.getByRole("list", { name: "Built-in maps" });
    const published = screen.getByRole("list", { name: "Published maps" });
    expect(within(builtIn).getAllByRole("article")).toHaveLength(3);
    expect(within(published).getAllByRole("article")).toHaveLength(6);
    // A beépített pályák vannak elöl.
    expect(builtIn.compareDocumentPosition(published) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    expect(screen.getByRole("link", { name: "All built-in maps" }).getAttribute("href")).toBe("/maps/built-in");
    expect(screen.getByRole("link", { name: "All published maps" }).getAttribute("href")).toBe("/maps");
  });

  test("a built-in map opens in the workbench or as an editable copy, with its difficulty", () => {
    open();
    const card = screen.getByRole("article", { name: "Corridor" });
    expect(card.textContent).toContain("by MineScript");
    expect(card.textContent).toContain("Difficulty: Easy");
    const program = new URL(
      within(card).getByRole("link", { name: "Write a program" }).getAttribute("href")!,
      "http://x",
    );
    expect(program.pathname).toBe("/workbench");
    expect(program.searchParams.get("map")).toContain(">.@..@.@.#");
    expect(program.searchParams.get("mapId")).toBeNull();
    const copy = new URL(within(card).getByRole("link", { name: "Edit a copy" }).getAttribute("href")!, "http://x");
    expect(copy.pathname).toBe("/map-editor");
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

  test("any map can be liked with the heart button, which shows the count and the liked state", async () => {
    convex.results = [
      map({ likeCount: 4 }),
      map({ _id: "map2" as PublishedMap["_id"], name: "Liked", likedByMe: true }),
    ];
    convex.toggleLike.mockResolvedValue(true);
    open();
    const card = screen.getByRole("article", { name: "Corridor run" });
    const heart = within(card).getByRole("button", { name: "Like “Corridor run”, 4 likes" });
    expect(heart.getAttribute("aria-pressed")).toBe("false");
    expect(heart.textContent).toBe("4");
    // Más térképén nincs kedvelőlista.
    expect(within(card).queryByRole("button", { name: "Who liked “Corridor run”" })).toBeNull();
    fireEvent.click(heart);
    await waitFor(() => expect(convex.toggleLike).toHaveBeenCalledWith({ mapId: "map1" }));

    const liked = screen.getByRole("article", { name: "Liked" });
    expect(within(liked).getByRole("button", { name: "Like “Liked”, 0 likes" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
  });

  test("a failed like is announced next to the heart", async () => {
    convex.results = [map({})];
    convex.toggleLike.mockRejectedValue(new Error("offline"));
    open("hu");
    fireEvent.click(screen.getByRole("button", { name: "„Corridor run” kedvelése, 0 kedvelés" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Nem sikerült menteni a kedvelést.");
  });

  test("on an own map the author can open the list of who liked it", async () => {
    convex.results = [map({ isMine: true, likeCount: 2 })];
    convex.likers = {
      map1: [
        { name: "digger", imageUrl: null, likedAt: Date.UTC(2026, 10, 8), isMe: false },
        { name: "miner", imageUrl: null, likedAt: Date.UTC(2026, 10, 7), isMe: true },
      ],
    };
    open();
    fireEvent.click(screen.getByRole("button", { name: "Who liked “Corridor run”" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Who liked “Corridor run”" });
    const names = within(dialog)
      .getAllByRole("listitem")
      .map((item) => item.textContent);
    expect(names[0]).toContain("digger");
    // A saját kedvelésen „you” címke van; profilkép híján a név kezdőbetűje áll a pixeles körben.
    expect(names[1]).toContain("miner");
    expect(names[1]).toContain("you");
    expect(names[0]).not.toContain("you");
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
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

  test("the page is in Hungarian too", () => {
    convex.results = [map({})];
    open("hu");
    expect(screen.getByRole("heading", { level: 1, name: "Üdv vissza, miner!" })).toBeTruthy();
    expect(screen.getByText("Közzétett térképek")).toBeTruthy();
    expect(screen.getByText("Beépített pályák")).toBeTruthy();
    expect(screen.getByRole("article", { name: "Folyosó" })).toBeTruthy();
  });
});
