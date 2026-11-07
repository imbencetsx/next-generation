// @vitest-environment node
import type { ReactNode } from "react";
import { renderToReadableStream } from "react-dom/server";
import { expect, test, vi } from "vitest";
import HomeRoute from "@/app/(home)/page";
import { I18nProvider } from "@/i18n/i18n-provider";
import { MESSAGES } from "@/i18n/messages";

const request = vi.hoisted(() => ({ connection: vi.fn() }));
vi.mock("next/server", () => ({ connection: request.connection }));
vi.mock("@/components/auth/require-auth", () => ({ default: ({ children }: { children: ReactNode }) => children }));
vi.mock("@/components/home", () => ({ default: ({ greeting }: { greeting: number }) => <p>Greeting {greeting}</p> }));

test("the home route can stream a loading shell when request-time data is unavailable", async () => {
  // A megosztott layout nélkül is legyen tartalék a kérésfüggő tartalomhoz.
  request.connection.mockRejectedValueOnce(new Error("Request data unavailable during prerendering"));
  const stream = await renderToReadableStream(
    <I18nProvider initialLocale="en">
      <HomeRoute />
    </I18nProvider>,
    { onError: () => {} },
  );
  const html = await new Response(stream).text();
  expect(html).toContain('role="status"');
  expect(html).toContain(MESSAGES.en.loading);
});
