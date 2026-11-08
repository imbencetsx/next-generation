// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import ProfilePage from "./profile-page";
import { I18nProvider } from "@/i18n/i18n-provider";
import { MESSAGES } from "@/i18n/messages";

vi.mock("convex/react", () => ({
  useQuery: () => ({ _id: "test-user", name: "miner", imageUrl: null, locale: null }),
  useAction: () => vi.fn(),
  useMutation: () => vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@convex-dev/auth/react", () => ({ useAuthActions: () => ({ signOut: vi.fn() }) }));

describe("profile page rendering", () => {
  for (const locale of ["en", "hu"] as const) {
    test(`renders the profile controls and navigation in ${locale}`, () => {
      const html = renderToStaticMarkup(
        <I18nProvider initialLocale={locale}>
          <ProfilePage />
        </I18nProvider>,
      );
      const t = MESSAGES[locale];
      for (const text of [
        t.profile.title,
        t.profile.picture,
        t.profile.robot,
        t.profile.saveRobot,
        t.robots.names.balazs,
        t.robots.names.levi,
        t.robots.names.bence,
        t.profile.username,
        t.profile.password,
        t.profile.language,
        t.profile.saveLanguage,
        t.profile.currentPassword,
        t.profile.newPassword,
        t.profile.confirmPassword,
        t.profile.back,
        t.profile.choosePicture,
      ]) {
        expect(html).toContain(text);
      }
      expect(html).toContain('href="/"');
      expect(html).toContain('href="/profile"');
      expect(html).toContain('autoComplete="current-password"');
      expect(html).toContain('autoComplete="new-password"');
      expect(html).toContain('aria-describedby="password-hint password-feedback"');
      expect(html).toContain('accept="image/png,image/jpeg,image/webp"');
      expect(html).toContain('value="miner"');
    });
  }
});
