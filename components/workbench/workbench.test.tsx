// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
  localStorage.clear();
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

  test("loads an incoming file name and keeps the top bar free of editor shortcuts", () => {
    navigation.query = new URLSearchParams({ code: "print true", filename: "from-map.mine" }).toString();
    open();
    expect(nameInput().value).toBe("from-map");
    fireEvent.change(nameInput(), { target: { value: "renamed" } });
    expect(nameInput().value).toBe("renamed");
    const header = within(screen.getByRole("banner"));
    expect(header.getByRole("link", { name: "Home" }).getAttribute("href")).toBe("/");
    expect(header.queryByRole("link", { name: "Map editor" })).toBeNull();
    expect(header.queryByRole("link", { name: "Language documentation" })).toBeNull();
    expect(header.queryByRole("button", { name: "New file…" })).toBeNull();
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

// A piszkozatot tényleges szerkesztőtranzakcióval módosítjuk, majd új komponenspéldányból olvassuk vissza.
describe("workbench / protecting drafts and reporting errors", () => {
  test("restores code and filename after remounting the same document", async () => {
    open();
    const { EditorView } = await import("@codemirror/view");
    const view = EditorView.findFromDOM(document.querySelector(".cm-editor")!)!;
    act(() => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: "print 42" } }));
    fireEvent.change(nameInput(), { target: { value: "saved-draft" } });
    cleanup();
    open();
    expect(nameInput().value).toBe("saved-draft");
    expect(EditorView.findFromDOM(document.querySelector(".cm-editor")!)!.state.doc.toString()).toBe("print 42");
  });

  test("New requires confirmation for edited work and Cancel preserves it", async () => {
    open();
    fireEvent.change(nameInput(), { target: { value: "keep-this" } });
    fireEvent.click(screen.getByRole("button", { name: "New" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Replace your work?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(nameInput().value).toBe("keep-this");
    fireEvent.click(screen.getByRole("button", { name: "New" }));
    fireEvent.click(screen.getByRole("button", { name: "Replace draft" }));
    await waitFor(() => expect(nameInput().value).toBe("untitled"));
  });

  test("an empty filename becomes untitled on blur", () => {
    open();
    fireEvent.change(nameInput(), { target: { value: "   " } });
    fireEvent.blur(nameInput());
    expect(nameInput().value).toBe("untitled");
  });

  test("custom maps called Corridor keep their own name and runtime errors live in Problems in Hungarian", () => {
    navigation.query = new URLSearchParams({ code: "mine here", map: "1 1\n>", mapName: "Corridor" }).toString();
    open("hu");
    const mapSelect = screen.getByRole("combobox", { name: "Térkép" }) as HTMLSelectElement;
    expect(mapSelect.selectedOptions[0].textContent).toBe("Corridor");
    fireEvent.click(screen.getByRole("button", { name: "Lépés" }));
    const problems = screen.getByRole("region", { name: /^Hibák/ });
    const error = within(problems).getByRole("alert");
    expect(error.textContent).toContain("E_NO_GOLD");
    expect(error.textContent).toContain("A robot mezőjén nincs bányászható arany.");
    expect(within(problems).queryByText("Nincs szintaktikai hiba.")).toBeNull();
    const mapPanel = screen.getByRole("region", { name: "Térkép" });
    expect(within(mapPanel).queryByRole("alert")).toBeNull();
  });
});

test("a new document link does not load an unrelated saved draft", () => {
  open();
  fireEvent.change(nameInput(), { target: { value: "previous-draft" } });
  cleanup();
  navigation.query = new URLSearchParams({ code: "", filename: "untitled", draft: "fresh-document" }).toString();
  open();
  expect(nameInput().value).toBe("untitled");
});

test("blocked browser storage does not break editing and warns before leaving", () => {
  open();
  const save = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
    throw new Error("Storage blocked");
  });
  fireEvent.change(nameInput(), { target: { value: "not-saved" } });
  expect(nameInput().value).toBe("not-saved");
  expect(save).toHaveBeenCalled();
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
});

test("importing a program asks before replacing an edited draft", async () => {
  open();
  fireEvent.change(nameInput(), { target: { value: "keep-this" } });
  const input = document.querySelector<HTMLInputElement>('input[type="file"][accept^=".mine"]')!;
  const file = new File(["print 7"], "imported.mine", { type: "text/plain" });
  fireEvent.change(input, { target: { files: [file] } });
  let dialog = await screen.findByRole("alertdialog");
  expect(nameInput().value).toBe("keep-this");
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  fireEvent.change(input, { target: { files: [file] } });
  dialog = await screen.findByRole("alertdialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Replace draft" }));
  expect(nameInput().value).toBe("imported");
});

test("a slow import cannot overwrite edits made while the file is being read", async () => {
  open();
  const file = new File([], "slow.mine");
  let resolve!: (value: string) => void;
  vi.spyOn(file, "text").mockImplementation(
    () =>
      new Promise<string>((done) => {
        resolve = done;
      }),
  );
  fireEvent.change(document.querySelector<HTMLInputElement>('input[type="file"][accept^=".mine"]')!, {
    target: { files: [file] },
  });
  fireEvent.change(nameInput(), { target: { value: "latest-work" } });
  await act(async () => {
    resolve("print 99");
  });
  expect(nameInput().value).toBe("latest-work");
  expect(screen.queryByRole("alertdialog")).toBeNull();
});
