// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { I18nProvider } from "@/i18n/i18n-provider";
import LoginForm from "./login-form";
import UserMenu from "./user-menu";

const mocks = vi.hoisted(() => ({ signIn: vi.fn(), signOut: vi.fn(), replace: vi.fn(), refresh: vi.fn(), query: "" }));
vi.mock("@convex-dev/auth/react", () => ({ useAuthActions: () => ({ signIn: mocks.signIn, signOut: mocks.signOut }) }));
vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: false }),
  useQuery: () => ({ name: "miner", imageUrl: null }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
  useSearchParams: () => new URLSearchParams(mocks.query),
}));
vi.mock("./login-scene", () => ({ default: ({ message }: { message: string }) => <p>{message}</p> }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.signIn.mockReset();
  mocks.signOut.mockReset();
  mocks.query = "";
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const username = () => screen.getByLabelText("Username") as HTMLInputElement;
const password = () => screen.getByLabelText("Password") as HTMLInputElement;

describe("fresh sign-in form", () => {
  test.each(["signIn", "signUp"])(
    "successful %s clears both fields and returns the form to sign-in mode",
    async (flow) => {
      mocks.signIn.mockResolvedValue({ signingIn: true });
      render(
        <I18nProvider initialLocale="en">
          <LoginForm />
        </I18nProvider>,
      );
      if (flow === "signUp") fireEvent.click(screen.getByRole("button", { name: "Create an account" }));
      fireEvent.change(username(), { target: { value: "former_miner" } });
      fireEvent.change(password(), { target: { value: "test-password" } });
      fireEvent.click(screen.getByRole("button", { name: flow === "signUp" ? "Create account" : "Sign in" }));
      await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/"));
      expect(mocks.signIn).toHaveBeenCalledWith("username", {
        flow,
        username: "former_miner",
        password: "test-password",
      });
      expect(username().value).toBe("");
      expect(password().value).toBe("");
      expect(screen.getByRole("heading", { name: "Sign in" })).toBeTruthy();
      expect(screen.queryByText("8 to 128 characters.")).toBeNull();
      expect(screen.queryByRole("alert")).toBeNull();
    },
  );

  test("failed sign-in preserves entered values for correction", async () => {
    mocks.signIn.mockRejectedValue(new Error("Invalid credentials"));
    render(
      <I18nProvider initialLocale="en">
        <LoginForm />
      </I18nProvider>,
    );
    fireEvent.change(username(), { target: { value: "miner" } });
    fireEvent.change(password(), { target: { value: "wrong-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await screen.findByRole("alert");
    expect(username().value).toBe("miner");
    expect(password().value).toBe("wrong-password");
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});

describe("sign-out navigation", () => {
  test("waits for sign-out then replaces the document with a clean login URL instead of cached client navigation", async () => {
    const replace = vi.spyOn(window.location, "replace").mockImplementation(() => {});
    let finish!: () => void;
    mocks.signOut.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    render(
      <I18nProvider initialLocale="en">
        <UserMenu />
      </I18nProvider>,
    );
    const button = screen.getByRole("button", { name: "Sign out" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Signing out…" }).hasAttribute("disabled")).toBe(true);
    await act(async () => finish());
    expect(replace).toHaveBeenCalledExactlyOnceWith("/login");
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  test("a failed sign-out stays on the current page and allows retrying", async () => {
    const replace = vi.spyOn(window.location, "replace").mockImplementation(() => {});
    mocks.signOut.mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce(null);
    render(
      <I18nProvider initialLocale="hu">
        <UserMenu />
      </I18nProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Kijelentkezés" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Nem sikerült kijelentkezni. Próbáld újra.");
    expect(replace).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Kijelentkezés" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
  });
});
