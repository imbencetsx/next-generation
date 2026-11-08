// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { I18nProvider, useI18n } from "@/i18n/i18n-provider";
import AccountI18nProvider from "@/components/account-i18n-provider";
import LanguageForm from "./language-form";

const mocks = vi.hoisted(() => ({ save: vi.fn(), authenticated: true, locale: null as "hu" | "en" | null }));
vi.mock("convex/react", () => ({
  useMutation: () => mocks.save,
  useConvexAuth: () => ({ isAuthenticated: mocks.authenticated }),
  useQuery: (_query: unknown, args: unknown) => (args === "skip" ? undefined : { locale: mocks.locale }),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.authenticated = true;
  mocks.locale = null;
});

function CurrentLanguage() {
  const { locale } = useI18n();
  return <output aria-label="Current language">{locale}</output>;
}

describe("account language", () => {
  test("saves the selected language before changing the interface and cookie", async () => {
    mocks.save.mockResolvedValue(null);
    render(
      <I18nProvider initialLocale="en">
        <LanguageForm savedLocale="en" />
        <CurrentLanguage />
      </I18nProvider>,
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Language" }), { target: { value: "hu" } });
    expect(screen.getByLabelText("Current language").textContent).toBe("en");
    fireEvent.click(screen.getByRole("button", { name: "Save language" }));
    await waitFor(() => expect(screen.getByText("Nyelv frissítve.")).toBeTruthy());
    expect(mocks.save).toHaveBeenCalledWith({ locale: "hu" });
    expect(screen.getByLabelText("Current language").textContent).toBe("hu");
    expect(document.cookie).toContain("lang=hu");
  });

  test("a failed save keeps the current language and allows retrying", async () => {
    mocks.save.mockRejectedValue(new Error("offline"));
    render(
      <I18nProvider initialLocale="en">
        <LanguageForm savedLocale="en" />
      </I18nProvider>,
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Language" }), { target: { value: "hu" } });
    fireEvent.click(screen.getByRole("button", { name: "Save language" }));
    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "Save language" }).hasAttribute("disabled")).toBe(false);
    expect(document.cookie).toContain("lang=en");
  });

  test("sign-in and remote changes follow the account preference without remounting children", () => {
    mocks.authenticated = false;
    const view = render(
      <AccountI18nProvider initialLocale="en">
        <CurrentLanguage />
        <input aria-label="Draft" />
      </AccountI18nProvider>,
    );
    fireEvent.change(screen.getByLabelText("Draft"), { target: { value: "keep my work" } });
    mocks.authenticated = true;
    mocks.locale = "hu";
    view.rerender(
      <AccountI18nProvider initialLocale="en">
        <CurrentLanguage />
        <input aria-label="Draft" />
      </AccountI18nProvider>,
    );
    expect(screen.getByLabelText("Current language").textContent).toBe("hu");
    expect((screen.getByLabelText("Draft") as HTMLInputElement).value).toBe("keep my work");
    mocks.locale = "en";
    view.rerender(
      <AccountI18nProvider initialLocale="en">
        <CurrentLanguage />
        <input aria-label="Draft" />
      </AccountI18nProvider>,
    );
    expect(screen.getByLabelText("Current language").textContent).toBe("en");
  });
});
