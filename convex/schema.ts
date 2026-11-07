import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  users: defineTable({
    ...authTables.users.validator.fields,
    avatarId: v.optional(v.id("_storage")),
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),
  // Közzétett térképek. Közzététel után nem változnak, hogy a (tervezett) ranglista eredményei mindig
  // pontosan arra a térképre vonatkozzanak, amelyiken született; módosításhoz újra kell közzétenni.
  maps: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    /** A térképfájl normalizált szövege (formatMap), a parseMap által elfogadva. */
    text: v.string(),
    rows: v.number(),
    cols: v.number(),
    goldCount: v.number(),
  }).index("by_ownerId", ["ownerId"]),
  // Játékosonként és térképenként a legjobb eredmény (kiírás 3.5). A szerver számolja: a programot újra
  // lefuttatja a tárolt térképen. Csak jobb eredmény írja felül (több arany, vagy ugyanannyi kevesebb lépésből).
  results: defineTable({
    mapId: v.id("maps"),
    userId: v.id("users"),
    gold: v.number(),
    /** Feldolgozott programsorok száma. */
    steps: v.number(),
    /** A ranglista rendezési kulcsa (lib/scoring.ts: scoreRank); csökkenő sorrendben a legjobb elöl. */
    rank: v.number(),
    /** Ha a futás hibával állt meg (pl. E_BEDROCK_HIT), annak kódja; különben null. */
    errorCode: v.union(v.string(), v.null()),
    /** A legjobb eredményt adó program, hogy az eredmény visszakereshető legyen. */
    code: v.string(),
  })
    .index("by_mapId_and_userId", ["mapId", "userId"])
    .index("by_mapId_and_rank", ["mapId", "rank"]),
});
