/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as credentials from "../credentials.js";
import type * as errors from "../errors.js";
import type * as http from "../http.js";
import type * as mapRules from "../mapRules.js";
import type * as maps from "../maps.js";
import type * as png from "../png.js";
import type * as profileRules from "../profileRules.js";
import type * as resultRules from "../resultRules.js";
import type * as results from "../results.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  credentials: typeof credentials;
  errors: typeof errors;
  http: typeof http;
  mapRules: typeof mapRules;
  maps: typeof maps;
  png: typeof png;
  profileRules: typeof profileRules;
  resultRules: typeof resultRules;
  results: typeof results;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
