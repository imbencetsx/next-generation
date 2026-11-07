// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { I18nProvider } from "@/i18n/i18n-provider";
import Workbench from "./index";

const navigation = vi.hoisted(() => ({ query: "" }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(navigation.query) }));
vi.mock("@/components/auth/user-menu", () => ({ default: () => null }));
// Közzétett térképen a futás végén a rögzítő mutáció hívódik; a legjobb eredményt a lekérdezés adja.
const convex = vi.hoisted(() => ({ record: vi.fn(), best: null as { gold: number; steps: number } | null }));
vi.mock("convex/react", () => ({ useMutation: () => convex.record, useQuery: () => convex.best }));

// A letöltött fájl neve és tartalma (a downloadText egy <a download> kattintással ment).
let downloads: { filename: string; blob: Blob }[] = [];

beforeEach(() => {
  navigation.query = "";
  convex.record.mockReset();
  convex.best = null;
  downloads = [];
  const blobs = new Map<string, Blob>();
  vi.stubGlobal(
    "URL",
    class extends URL {
      static createObjectURL = vi.fn((blob: Blob) => {
        const url = `blob:${blobs.size}`;
        blobs.set(url, blob);
        return url;
      });
      static revokeObjectURL = vi.fn();
    },
  );
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push({ filename: this.download, blob: blobs.get(this.getAttribute("href")!)! });
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function open(locale: "en" | "hu" = "en") {
  render(
    <I18nProvider initialLocale={locale}>
      <Workbench />
    </I18nProvider>,
  );
}
const nameInput = () => screen.getByLabelText("Program name") as HTMLInputElement;

describe("workbench / program name", () => {
  test("shows the example's name without the fixed .mine extension", () => {
    open();
    expect(nameInput().value).toBe("collect-gold");
    expect(screen.getByText(".mine")).toBeTruthy();
  });

  test("a renamed program is exported as <name>.mine with its code", async () => {
    open();
    fireEvent.change(nameInput(), { target: { value: "my-robot" } });
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    expect(downloads).toHaveLength(1);
    expect(downloads[0].filename).toBe("my-robot.mine");
    expect(await downloads[0].blob.text()).toContain("set count to 0");
  });

  test("typing an extension or forbidden characters still yields a clean .mine file name", () => {
    open();
    fireEvent.change(nameInput(), { target: { value: "a/b:c.mine" } });
    expect(nameInput().value).toBe("abc");
    fireEvent.change(nameInput(), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    expect(downloads[0].filename).toBe("untitled.mine");
  });

  test("New, examples and imports set the name; a .txt import is saved as .mine", async () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "New" }));
    expect(nameInput().value).toBe("untitled");
    fireEvent.change(screen.getByLabelText("Load example…"), { target: { value: "first-steps.mine" } });
    expect(nameInput().value).toBe("first-steps");
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"][accept^=".mine"]')!;
    fireEvent.change(fileInput, { target: { files: [new File(["print 1"], "notes.txt", { type: "text/plain" })] } });
    await waitFor(() => expect(nameInput().value).toBe("notes"));
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    expect(downloads[0].filename).toBe("notes.mine");
  });

  test("the name travels to the map editor and comes back from it", () => {
    navigation.query = new URLSearchParams({ code: "print true", filename: "from-map.mine" }).toString();
    open();
    expect(nameInput().value).toBe("from-map");
    fireEvent.change(nameInput(), { target: { value: "renamed" } });
    const link = screen.getByRole("link", { name: "Map editor" }).getAttribute("href")!;
    expect(new URL(link, "http://localhost").searchParams.get("filename")).toBe("renamed.mine");
  });

  test("the field has a Hungarian label", () => {
    open("hu");
    expect((screen.getByLabelText("Program neve") as HTMLInputElement).value).toBe("collect-gold");
  });
});

describe("workbench / results on published maps", () => {
  const CORRIDOR = "3 10\n##########\n>.@..@.@.#\n##########";
  const PROGRAM = "step forward 2\nmine here";

  function openPublished(extra: Record<string, string> = {}) {
    navigation.query = new URLSearchParams({
      map: CORRIDOR,
      mapName: "Corridor run",
      mapId: "map1",
      code: PROGRAM,
      ...extra,
    }).toString();
    open();
  }
  const step = () => fireEvent.click(screen.getByRole("button", { name: "Step" }));

  test("a run that reaches its end on a published map is recorded once, with the program that ran", async () => {
    convex.record.mockResolvedValue({
      run: { gold: 1, steps: 2, errorCode: null },
      best: { gold: 1, steps: 2 },
      improved: true,
    });
    openPublished();
    expect(screen.getByText("No result yet on this map.")).toBeTruthy();
    step();
    expect(convex.record).not.toHaveBeenCalled();
    step();
    await waitFor(() => expect(screen.getByText("Recorded: 1 gold · 2 steps — a new best!")).toBeTruthy());
    expect(convex.record).toHaveBeenCalledTimes(1);
    expect(convex.record).toHaveBeenCalledWith({ mapId: "map1", code: PROGRAM });
  });

  test("a run ending with a runtime error is recorded too, and an unchanged best is reported", async () => {
    convex.best = { gold: 2, steps: 4 };
    convex.record.mockResolvedValue({
      run: { gold: 1, steps: 3, errorCode: "E_NO_GOLD" },
      best: { gold: 2, steps: 4 },
      improved: false,
    });
    openPublished({ code: "step forward 2\nmine here\nmine here" });
    expect(screen.getByText("Your best: 2 gold · 4 steps")).toBeTruthy();
    step();
    step();
    step();
    await waitFor(() => expect(screen.getByText("Recorded: 1 gold · 3 steps. Your best is unchanged.")).toBeTruthy());
    expect(convex.record).toHaveBeenCalledTimes(1);
  });

  test("a run stopped with Reset is not recorded", () => {
    openPublished();
    step();
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(convex.record).not.toHaveBeenCalled();
  });

  test("nothing is recorded on built-in maps, or after switching away from the published map", () => {
    open();
    step();
    step();
    expect(convex.record).not.toHaveBeenCalled();
    cleanup();
    openPublished();
    fireEvent.change(screen.getByRole("combobox", { name: "Map" }), { target: { value: "Corridor" } });
    step();
    step();
    expect(convex.record).not.toHaveBeenCalled();
    expect(screen.queryByText(/Published map/)).toBeNull();
  });

  test("a failed recording is shown in the player's language", async () => {
    convex.record.mockRejectedValue(new Error('ConvexError: {"code":"RESULT_notFound"}'));
    navigation.query = new URLSearchParams({ map: CORRIDOR, mapId: "map1", code: PROGRAM }).toString();
    open("hu");
    fireEvent.click(screen.getByRole("button", { name: "Lépés" }));
    fireEvent.click(screen.getByRole("button", { name: "Lépés" }));
    await waitFor(() =>
      expect(screen.getByText("Ezt a pályát közben törölték, ezért az eredmény nem rögzült.")).toBeTruthy(),
    );
  });
});
