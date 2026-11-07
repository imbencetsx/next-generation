// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { I18nProvider } from "@/i18n/i18n-provider";
import Workbench from "./index";

const navigation = vi.hoisted(() => ({ query: "" }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(navigation.query) }));
vi.mock("@/components/auth/user-menu", () => ({ default: () => null }));

// A letöltött fájl neve és tartalma (a downloadText egy <a download> kattintással ment).
let downloads: { filename: string; blob: Blob }[] = [];

beforeEach(() => {
  navigation.query = "";
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
