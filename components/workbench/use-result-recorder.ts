"use client";

// Befejezett futások eredményének rögzítése közzétett térképen (convex/results.ts). A szerver újra lefuttatja
// a programot, és csak a jobb eredményt tartja meg; ez a hook a legutóbbi rögzítés állapotát adja a felületnek.

import { useMutation } from "convex/react";
import { useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { resultErrorKey, type ResultErrorKey } from "@/convex/resultRules";

export type RecordState =
  | { status: "saving"; mapId: string }
  | { status: "saved"; mapId: string; gold: number; steps: number; improved: boolean }
  | { status: "error"; mapId: string; error: ResultErrorKey };

export function useResultRecorder() {
  const record = useMutation(api.results.record);
  const [state, setState] = useState<RecordState | null>(null);
  // Gyors egymás utáni futásoknál csak a legutóbbi rögzítés válasza jelenhet meg.
  const latest = useRef(0);

  async function recordRun(mapId: string, code: string) {
    const id = ++latest.current;
    setState({ status: "saving", mapId });
    try {
      const result = await record({ mapId: mapId as Id<"maps">, code });
      if (id !== latest.current) return;
      setState({ status: "saved", mapId, gold: result.run.gold, steps: result.run.steps, improved: result.improved });
    } catch (error) {
      if (id === latest.current) setState({ status: "error", mapId, error: resultErrorKey(error) });
    }
  }

  return { state, recordRun };
}
