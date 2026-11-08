// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import AccountI18nProvider from "@/components/account-i18n-provider";
import RobotSprite from "@/components/robot-sprite";
import { I18nProvider } from "@/i18n/i18n-provider";
import type { RobotId } from "@/lib/robots";
import RobotForm from "./robot-form";
import HomeOnboarding from "@/components/home/onboarding";

const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  authenticated: true,
  viewer: { _id: "miner", locale: "en", robot: "balazs" as RobotId, robotSetupPending: false },
}));
vi.mock("convex/react", () => ({
  useMutation: () => mocks.save,
  useConvexAuth: () => ({ isAuthenticated: mocks.authenticated }),
  useQuery: (_query: unknown, args: unknown) => (args === "skip" ? undefined : mocks.viewer),
}));
beforeEach(() => {
  mocks.save.mockReset();
  mocks.authenticated = true;
  mocks.viewer = { _id: "miner", locale: "en", robot: "balazs", robotSetupPending: false };
});
afterEach(cleanup);

describe("robot selection", () => {
  test.each(["en", "hu"] as const)("offers all three named robots in %s with the original selected", (locale) => {
    render(
      <I18nProvider initialLocale={locale}>
        <RobotForm />
      </I18nProvider>,
    );
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect((screen.getByRole("radio", { name: "B4LÁZ5" }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByRole("radio", { name: "L3V1" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "B3NC3" })).toBeTruthy();
  });

  test("a failed profile save keeps the selection for retry; a successful save reports completion", async () => {
    mocks.save.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(null);
    render(
      <I18nProvider initialLocale="en">
        <RobotForm />
      </I18nProvider>,
    );
    fireEvent.click(screen.getByRole("radio", { name: "B3NC3" }));
    fireEvent.click(screen.getByRole("button", { name: "Save robot" }));
    await screen.findByRole("alert");
    expect((screen.getByRole("radio", { name: "B3NC3" }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Save robot" }));
    await screen.findByText("Robot updated.");
    expect(mocks.save).toHaveBeenLastCalledWith({ robot: "bence" });
  });

  test("onboarding appears only for a pending signed-in account, retries failures and closes after saving", async () => {
    mocks.viewer.robotSetupPending = true;
    mocks.save.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(null);
    render(
      <AccountI18nProvider initialLocale="en">
        <span>Mine</span>
        <HomeOnboarding ready />
      </AccountI18nProvider>,
    );
    await screen.findByRole("dialog", { name: "Choose your robot" });
    fireEvent.click(screen.getByRole("radio", { name: "L3V1" }));
    fireEvent.click(screen.getByRole("button", { name: "Let’s dig" }));
    await screen.findByRole("alert");
    expect((screen.getByRole("radio", { name: "L3V1" }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Let’s dig" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(mocks.save).toHaveBeenLastCalledWith({ robot: "levi" });
  });

  test("onboarding can keep the default and disables duplicate submissions while saving", async () => {
    mocks.viewer.robotSetupPending = true;
    let resolve!: () => void;
    mocks.save.mockImplementation(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    render(
      <AccountI18nProvider initialLocale="en">
        <span>Mine</span>
        <HomeOnboarding ready />
      </AccountI18nProvider>,
    );
    fireEvent.click(await screen.findByRole("button", { name: "Let’s dig" }));
    expect(mocks.save).toHaveBeenCalledExactlyOnceWith({ robot: "balazs" });
    expect(screen.getByRole("button", { name: "Saving…" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getAllByRole("radio").every((radio) => radio.matches(":disabled"))).toBe(true);
    await act(async () => resolve());
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  test("existing accounts skip onboarding and their robot follows remote updates without losing drafts", () => {
    const tree = (
      <AccountI18nProvider initialLocale="en">
        <input aria-label="Draft" />
        <RobotSprite className="test-sprite" />
      </AccountI18nProvider>
    );
    const view = render(tree);
    fireEvent.change(screen.getByRole("textbox", { name: "Draft" }), { target: { value: "print 1" } });
    expect(document.querySelector(".test-sprite")?.getAttribute("data-robot")).toBe("balazs");
    mocks.viewer.robot = "bence";
    view.rerender(
      <AccountI18nProvider initialLocale="en">
        <input aria-label="Draft" />
        <RobotSprite className="test-sprite" />
      </AccountI18nProvider>,
    );
    expect(document.querySelector(".test-sprite")?.getAttribute("data-robot")).toBe("bence");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect((screen.getByRole("textbox", { name: "Draft" }) as HTMLInputElement).value).toBe("print 1");
  });

  test("signed-out visitors never see onboarding", () => {
    mocks.authenticated = false;
    mocks.viewer.robotSetupPending = true;
    render(
      <AccountI18nProvider initialLocale="en">
        <RobotSprite className="test-sprite" />
      </AccountI18nProvider>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.querySelector(".test-sprite")?.getAttribute("data-robot")).toBe("balazs");
  });
});
