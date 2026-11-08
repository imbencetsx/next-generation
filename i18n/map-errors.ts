import type { Locale } from "./locale";
import { MESSAGES } from "./messages";

/** Csak a megjelenítés fordít; a térképolvasó eredeti diagnosztikája változatlan. */
export function localizedMapError(error: string, locale: Locale): string {
  if (locale === "en") return error;
  const t = MESSAGES[locale].mapDiagnostics;
  if (error.startsWith("Line 1 must")) return t.header;
  const dimensions = error.match(/found (\d+) rows and (\d+) columns/);
  if (dimensions) return t.dimensions(dimensions[1], dimensions[2]);
  const rows = error.match(/declares (\d+) rows?, but the file contains (\d+) map lines?/);
  if (rows) return t.rows(rows[1], rows[2]);
  const columns = error.match(/Line (\d+) has (\d+) characters but the header declares (\d+) columns/);
  if (columns) return t.columns(columns[1], columns[3], columns[2]);
  if (error.includes("a second robot")) return t.secondRobot;
  if (error.includes("no robot")) return t.robot;
  return t.symbol;
}
