// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { PublishedMap } from "@/components/home/map-entry";
import { I18nProvider } from "@/i18n/i18n-provider";
import { MAP_PRESETS } from "@/lib/robot-map";
import { BuiltInMapsPage, PublishedMapsPage } from "./maps-page";

vi.mock("@/components/auth/user-menu", () => ({ default: () => null }));

const convex = vi.hoisted(() => ({
  results: [] as PublishedMap[],
  status: "Exhausted" as string,
  lastArgs: null as unknown,
  lastOptions: null as unknown,
  loadMore: vi.fn(),
}));
vi.mock("convex/react", () => ({
  usePaginatedQuery: (_query: unknown, args: unknown, options: unknown) => {
    convex.lastArgs = args;
    convex.lastOptions = options;
    return { results: convex.results, status: convex.status, loadMore: convex.loadMore };
  },
  useMutation: () => vi.fn(),
  useQuery: () => null,
}));

function map(index: number): PublishedMap {
  return {
    _id: `map${index}` as PublishedMap["_id"],
    _creationTime: Date.UTC(2026, 10, 7),
    name: `Map ${index}`,
    text: "3 10\n##########\n>.@..@.@.#\n##########",
    rows: 3,
    cols: 10,
    goldCount: 3,
    authorName: "other",
    isMine: false,
    likeCount: 0,
    likedByMe: false,
  };
}

beforeEach(() => {
  convex.results = [];
  convex.status = "Exhausted";
  convex.lastArgs = null;
  convex.loadMore.mockReset();
});
afterEach(() => cleanup());

function open(page: React.ReactNode, locale: "en" | "hu" = "en") {
  render(<I18nProvider initialLocale={locale}>{page}</I18nProvider>);
}

describe("built-in maps page", () => {
  test("lists every built-in map with its difficulty, under a page heading", () => {
    open(<BuiltInMapsPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Built-in maps" })).toBeTruthy();
    const list = screen.getByRole("list", { name: "Built-in maps" });
    expect(within(list).getAllByRole("article")).toHaveLength(MAP_PRESETS.length);
    expect(within(list).getByRole("article", { name: "Labyrinth" }).textContent).toContain("Difficulty: Hard");
    expect(screen.getByRole("link", { name: "Back to home" }).getAttribute("href")).toBe("/");
  });

  test("names the maps in Hungarian too", () => {
    open(<BuiltInMapsPage />, "hu");
    expect(screen.getByRole("heading", { level: 1, name: "Beépített pályák" })).toBeTruthy();
    expect(screen.getByRole("article", { name: "Labirintus" }).textContent).toContain("Nehézség: Nehéz");
  });
});

describe("published maps page", () => {
  test("shows every loaded map and loads more on request", () => {
    convex.results = Array.from({ length: 9 }, (_, index) => map(index));
    convex.status = "CanLoadMore";
    open(<PublishedMapsPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Published maps" })).toBeTruthy();
    expect(within(screen.getByRole("list", { name: "Published maps" })).getAllByRole("article")).toHaveLength(9);
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(convex.loadMore).toHaveBeenCalledWith(9);
  });

  test("the Mine filter asks only for the player's own maps and has its own empty message", () => {
    open(<PublishedMapsPage />);
    expect(screen.getByText("No one has published a map yet. Be the first!")).toBeTruthy();
    expect(convex.lastArgs).toEqual({ mine: false });
    fireEvent.click(screen.getByRole("button", { name: "Mine" }));
    expect(convex.lastArgs).toEqual({ mine: true });
    expect(screen.getByRole("button", { name: "Mine" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("You haven't published a map yet.")).toBeTruthy();
  });
});
