import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { robotValidator } from "./robotRules";

export default defineSchema({
  ...authTables,
  users: defineTable({
    ...authTables.users.validator.fields,
    avatarId: v.optional(v.id("_storage")),
    /** A felület nyelve, ha a felhasználó beállította (a profil oldalon); különben a böngészőé dönt. */
    locale: v.optional(v.union(v.literal("en"), v.literal("hu"))),
    robot: v.optional(robotValidator),
    /** Csak az új fiókoknál kérünk robotot; a régi fiókok az eredeti kinézetet kapják. */
    robotSetupPending: v.optional(v.boolean()),
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
    /** A kedvelések száma (a likes táblával együtt frissül); a régebbi térképeknél hiányozhat, akkor 0. */
    likeCount: v.optional(v.number()),
  }).index("by_ownerId", ["ownerId"]),
  // Kedvelések: játékosonként és térképenként legfeljebb egy sor. A saját térképet is lehet kedvelni.
  likes: defineTable({
    mapId: v.id("maps"),
    userId: v.id("users"),
  })
    .index("by_mapId", ["mapId"])
    .index("by_mapId_and_userId", ["mapId", "userId"]),
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
