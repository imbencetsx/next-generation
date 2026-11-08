import { afterEach, describe, expect, test, vi } from "vitest";
import {
  checkMapNameWithAI,
  hasBlockedMapName,
  MODERATION_TIMEOUT_MS,
  normalizedModerationName,
} from "./mapModeration";
import { publishedMapName } from "./mapRules";
import { commitPublication, reservePublishAttempt } from "./maps";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("bilingual map-name word filter", () => {
  test.each([
    "fuck",
    "FUCKING mine",
    "f u c k",
    "f.u.c.k",
    "f-u-c-k",
    "fuuuck",
    "ＦＵＣＫ",
    "f\u200buck",
    "sh1t",
    "b1tch",
    "baszd meg",
    "baszdmeg",
    "BÁZDMEG",
    "b4szdmeg",
    "kurva",
    "faszfej",
    "geci",
    "kÖcsÖg",
    "buzi",
    "nigger",
    "faggot",
  ])("rejects %s", (name) => {
    // Az összetartozó magyar káromkodás külön szóközzel is felismerendő.
    expect(hasBlockedMapName(name)).toBe(true);
  });
  test.each([
    "Aranybánya",
    "Ősi üreg",
    "Scunthorpe",
    "Homok és sziklák",
    "Passage",
    "Classic mine",
    "Assassin cave",
    "Cigány legendák",
    "Stone castle",
    "Basszusgitár",
  ])("does not block harmless substrings in %s", (name) => {
    expect(hasBlockedMapName(name)).toBe(false);
  });
  test("normalization preserves Hungarian display names and removes invisible-only names", () => {
    expect(publishedMapName("  Ősi aranybánya.map  ")).toBe("Ősi aranybánya");
    expect(publishedMapName("\u200b\u200d")).toBeNull();
    expect(normalizedModerationName("Ősi Aranybánya")).toBe("osi aranybanya");
  });
  test("the database-writing and attempt-reservation functions are internal", () => {
    expect(commitPublication.isInternal).toBe(true);
    expect(reservePublishAttempt.isInternal).toBe(true);
  });
});

test("moderation requests time out instead of approving or hanging indefinitely", async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    vi.fn(
      (_url, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new Error("Aborted")), { once: true });
        }),
    ),
  );
  const rejected = expect(checkMapNameWithAI("Gold mine", "test-key")).rejects.toThrow("MAP_moderationUnavailable");
  await vi.advanceTimersByTimeAsync(MODERATION_TIMEOUT_MS);
  await rejected;
});
