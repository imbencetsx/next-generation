// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { EditorView } from "@codemirror/view";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { I18nProvider } from "@/i18n/i18n-provider";
import Workbench from "@/components/workbench";
import MapEditor from "./index";

const navigation = vi.hoisted(() => ({ query: "" }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(navigation.query) }));
vi.mock("@/components/auth/user-menu", () => ({ default: () => null }));
// A közzététel a Convex mutációt hívja; a teszt a hívást és a válaszát figyeli.
const convex = vi.hoisted(() => ({ publish: vi.fn() }));
vi.mock("convex/react", () => ({ useMutation: () => convex.publish }));

beforeEach(() => {
  navigation.query = new URLSearchParams({ map: "1 2\n>.", code: "print true", filename: "test.mine" }).toString();
  convex.publish.mockReset();
  vi.stubGlobal(
    "URL",
    class extends URL {
      static createObjectURL = vi.fn(() => "blob:map-export");
      static revokeObjectURL = vi.fn();
    },
  );
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function open(locale: "en" | "hu" = "en") {
  render(
    <I18nProvider initialLocale={locale}>
      <MapEditor />
    </I18nProvider>,
  );
}
function editor() {
  const content = document.querySelector<HTMLElement>(".cm-content");
  const view = content && EditorView.findFromDOM(content);
  if (!view) throw new Error("CodeMirror was not mounted");
  return view;
}
function setSource(source: string) {
  const view = editor();
  act(() => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: source } }));
}

describe("map editor / React and CodeMirror integration", () => {
  test("paints cells and moves the one robot while keeping source and simulator link synchronized", () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "Gold" }));
    fireEvent.click(screen.getByRole("button", { name: "Row 1, column 2: Empty chamber" }));
    expect(editor().state.doc.toString()).toBe("1 2\n>@");
    fireEvent.click(screen.getByRole("button", { name: "Robot" }));
    fireEvent.click(screen.getByRole("button", { name: "Row 1, column 2: Gold" }));
    expect(editor().state.doc.toString()).toBe("1 2\n.>");
    const link = screen.getByRole("link", { name: "Use in simulator" }).getAttribute("href")!;
    const params = new URL(link, "http://localhost").searchParams;
    expect(params.get("map")).toBe("1 2\n.>");
    expect(params.get("code")).toBe("print true");
    expect(params.get("filename")).toBe("test.mine");
  });

  test("invalid text keeps the preview but blocks visual editing and export until fixed", () => {
    open();
    setSource("1 2\n@@");
    expect(screen.getByRole("button", { name: "Export" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Row 1, column 1: Robot, east" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByText(/Showing the last valid map/)).toBeTruthy();
    setSource("1 1\n^");
    expect(screen.getByRole("button", { name: "Export" }).hasAttribute("disabled")).toBe(false);
    expect(screen.getByRole("button", { name: "Row 1, column 1: Robot, north" })).toBeTruthy();
  });

  test("bad file import leaves source and filename untouched, valid import can be exported", async () => {
    open();
    const fileInput = screen.getByLabelText("Import", { selector: "input" });
    fireEvent.change(fileInput, { target: { files: [new File(["1 1\n@"], "broken.map", { type: "text/plain" })] } });
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("no robot"));
    expect(editor().state.doc.toString()).toBe("1 2\n>.");
    expect((screen.getByLabelText("Map filename") as HTMLInputElement).value).toBe("untitled");
    fireEvent.change(fileInput, { target: { files: [new File(["1 2\n^@"], "gold.map", { type: "text/plain" })] } });
    await waitFor(() => expect(editor().state.doc.toString()).toBe("1 2\n^@"));
    expect((screen.getByLabelText("Map filename") as HTMLInputElement).value).toBe("gold");
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob;
    expect(await blob.text()).toBe("1 2\n^@");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:map-export");
  });

  test("resizes, changes direction, resets to a new valid file and navigates cells by keyboard", () => {
    open();
    fireEvent.change(screen.getByLabelText("Rows"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Columns"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Resize" }));
    expect(editor().state.doc.toString()).toBe("2 3\n>..\n...");
    fireEvent.change(screen.getByLabelText("Starting direction"), { target: { value: "1" } });
    expect(editor().state.doc.toString()).toBe("2 3\n<..\n...");
    const start = screen.getByRole("button", { name: "Row 1, column 1: Robot, west" });
    fireEvent.keyDown(start, { key: "ArrowRight" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Row 1, column 2: Empty chamber" }));
    fireEvent.click(screen.getByRole("button", { name: "New" }));
    expect(editor().state.doc.toString().split("\n")[0]).toBe("8 8");
    expect(screen.getAllByRole("gridcell")).toHaveLength(64);
    expect(screen.getByRole("button", { name: "Export" }).hasAttribute("disabled")).toBe(false);
  });

  test("renders Hungarian controls and shows why a robot cell cannot be painted over", () => {
    open("hu");
    expect(screen.getByRole("heading", { name: "Térképszerkesztő" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Exportálás" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "1. sor, 1. oszlop: Robot, kelet" }));
    expect(screen.getByText(/Előbb helyezd át a robotot/)).toBeTruthy();
    expect(editor().state.doc.toString()).toBe("1 2\n>.");
  });

  test("the map name is edited without its fixed .map extension and exported as <name>.map", () => {
    open();
    const name = screen.getByLabelText("Map filename") as HTMLInputElement;
    expect(screen.getByText(".map")).toBeTruthy();
    fireEvent.change(name, { target: { value: "cave.map" } });
    expect(name.value).toBe("cave");
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    const anchor = vi.mocked(HTMLAnchorElement.prototype.click).mock.contexts[0] as HTMLAnchorElement;
    expect(anchor.download).toBe("cave.map");
    fireEvent.change(screen.getByLabelText("Load example…"), { target: { value: "2" } });
    expect(name.value).toBe("open-field");
  });

  test("the map and program name fields are the same component and size", () => {
    open();
    const mapField = screen.getByLabelText("Map filename");
    cleanup();
    render(
      <I18nProvider initialLocale="en">
        <Workbench />
      </I18nProvider>,
    );
    const programField = screen.getByLabelText("Program name");
    expect(programField.className).toBe(mapField.className);
    expect(programField.nextElementSibling?.textContent).toBe(".mine");
  });

  test("publishes the valid map under the file name and shows the result", async () => {
    convex.publish.mockResolvedValue("map-id");
    open();
    fireEvent.change(screen.getByLabelText("Map filename"), { target: { value: "tiny" } });
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    expect(await screen.findByText(/Published as “tiny”/)).toBeTruthy();
    expect(convex.publish).toHaveBeenCalledWith({ name: "tiny", text: "1 2\n>." });
    expect(screen.getByRole("link", { name: "Open the home page" }).getAttribute("href")).toBe("/");
  });

  test("an invalid map cannot be published, and a server error is shown in the user's language", async () => {
    open("hu");
    setSource("1 2\n@@");
    expect(screen.getByRole("button", { name: "Közzététel" }).hasAttribute("disabled")).toBe(true);
    setSource("1 1\n>");
    convex.publish.mockRejectedValue(new Error('Uncaught ConvexError: {"code":"MAP_name"}'));
    fireEvent.click(screen.getByRole("button", { name: "Közzététel" }));
    await waitFor(() => expect(screen.getByText("Adj a térképnek 1–60 karakteres nevet.")).toBeTruthy());
  });

  test("a map name from the link becomes the file name and travels back to the simulator", () => {
    navigation.query = new URLSearchParams({ map: "1 1\n>", mapName: "Cave of Gold" }).toString();
    open();
    expect((screen.getByLabelText("Map filename") as HTMLInputElement).value).toBe("Cave of Gold");
    const link = screen.getByRole("link", { name: "Use in simulator" }).getAttribute("href")!;
    expect(new URL(link, "http://localhost").searchParams.get("mapName")).toBe("Cave of Gold");
  });
});
