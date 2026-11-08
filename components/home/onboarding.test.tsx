// @vitest-environment happy-dom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import AccountI18nProvider from "@/components/account-i18n-provider";
import HomePage from "./index";

const mocks = vi.hoisted(() => ({
  status: "LoadingFirstPage",
  viewer: { _id: "miner", name: "miner", imageUrl: null, locale: "en", robot: "balazs", robotSetupPending: true },
}));
vi.mock("@/components/auth/user-menu", () => ({ default: () => null }));
vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: true }),
  useQuery: () => mocks.viewer,
  useMutation: () => vi.fn(),
  usePaginatedQuery: () => ({ results: [], status: mocks.status, loadMore: vi.fn() }),
}));

let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;
const originalFonts = Object.getOwnPropertyDescriptor(document, "fonts");
beforeEach(() => {
  mocks.status = "LoadingFirstPage";
  mocks.viewer.robotSetupPending = true;
  frames = new Map();
  nextFrame = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  if (originalFonts) Object.defineProperty(document, "fonts", originalFonts);
  else Reflect.deleteProperty(document, "fonts");
});

function home() {
  return (
    <AccountI18nProvider initialLocale="en">
      <HomePage />
    </AccountI18nProvider>
  );
}
function paint() {
  const callbacks = [...frames.values()];
  frames.clear();
  act(() => callbacks.forEach((callback) => callback(0)));
}

describe("home onboarding timing", () => {
  test("waits for home data, window load, image decoding and a painted home frame", async () => {
    vi.spyOn(document, "readyState", "get").mockReturnValue("loading");
    let finishImages!: () => void;
    const images = new Promise<void>((resolve) => {
      finishImages = resolve;
    });
    let finishFonts!: () => void;
    const fonts = new Promise<void>((resolve) => {
      finishFonts = resolve;
    });
    Object.defineProperty(document, "fonts", { configurable: true, value: { ready: fonts } });
    const loadSprite = vi.fn(() => images);
    vi.spyOn(HTMLImageElement.prototype, "decode").mockImplementation(function (this: HTMLImageElement) {
      return this.getAttribute("src")?.startsWith("/sprites/") ? loadSprite() : Promise.resolve();
    });
    const view = render(home());
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(loadSprite).not.toHaveBeenCalled();
    mocks.status = "Exhausted";
    view.rerender(home());
    expect(screen.getByRole("heading", { level: 1, name: "Welcome back, miner!" })).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(loadSprite).not.toHaveBeenCalled();
    act(() => window.dispatchEvent(new Event("load")));
    expect(loadSprite).toHaveBeenCalled();
    expect(frames.size).toBe(0);
    await act(async () => finishImages());
    expect(frames.size).toBe(0);
    await act(async () => finishFonts());
    paint();
    expect(screen.queryByRole("dialog")).toBeNull();
    paint();
    expect(screen.getByRole("dialog", { name: "Choose your robot" })).toBeTruthy();
  });

  test("never opens on login or another screen just because the account has signed in", () => {
    render(
      <AccountI18nProvider initialLocale="en">
        <h1>Login screen</h1>
      </AccountI18nProvider>,
    );
    paint();
    paint();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("client navigation works when the document is already loaded and a failed image does not block the picker", async () => {
    mocks.status = "Exhausted";
    vi.spyOn(document, "readyState", "get").mockReturnValue("complete");
    vi.spyOn(HTMLImageElement.prototype, "decode").mockRejectedValue(new Error("Image unavailable"));
    await act(async () => {
      render(home());
    });
    paint();
    expect(screen.queryByRole("dialog")).toBeNull();
    paint();
    expect(screen.getByRole("dialog", { name: "Choose your robot" })).toBeTruthy();
  });

  test("leaving home before its assets finish loading cancels opening the dialog", async () => {
    mocks.status = "Exhausted";
    vi.spyOn(document, "readyState", "get").mockReturnValue("complete");
    let finishImages!: () => void;
    vi.spyOn(HTMLImageElement.prototype, "decode").mockReturnValue(
      new Promise<void>((resolve) => {
        finishImages = resolve;
      }),
    );
    const view = render(home());
    view.rerender(
      <AccountI18nProvider initialLocale="en">
        <h1>Another screen</h1>
      </AccountI18nProvider>,
    );
    await act(async () => finishImages());
    expect(frames.size).toBe(0);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("returning accounts do not queue onboarding after home has loaded", async () => {
    mocks.status = "Exhausted";
    mocks.viewer.robotSetupPending = false;
    const loadSprite = vi.fn(async () => {});
    vi.spyOn(HTMLImageElement.prototype, "decode").mockImplementation(function (this: HTMLImageElement) {
      return this.getAttribute("src")?.startsWith("/sprites/") ? loadSprite() : Promise.resolve();
    });
    render(home());
    paint();
    paint();
    expect(loadSprite).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
