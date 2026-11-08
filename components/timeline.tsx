"use client";

// Az idővonal: a futás minden feldolgozott sora után egy pont, amit csúszkával, a visszalépés gombbal vagy a
// billentyűzettel (nyilak, Home/End, PageUp/PageDown) lehet bejárni. A sáv jelöli, hol bányászott aranyat a robot
// (arany), hol írt a konzolra (világos), és hol állt meg hibával (tégla). Visszanézés közben a térkép, az aktuális
// sor, a konzol és a változók is a kiválasztott pillanatot mutatják (use-simulation.ts, history).

import { useMemo, type CSSProperties } from "react";
import { StepBack } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { Simulation } from "@/components/use-simulation";
import { useI18n } from "@/i18n/i18n-provider";
import type { Snapshot } from "@/lib/interpreter";

type MarkKind = "gold" | "print" | "error";
type Mark = { index: number; kind: MarkKind };

/** A sáv jelölései: ahol az előző pillanathoz képest arany fogyott, kimenet jött, vagy a futás hibával állt meg. */
function timelineMarks(history: Snapshot[]): Mark[] {
  const marks: Mark[] = [];
  history.forEach((snapshot, index) => {
    const previous = history[index - 1];
    if (!previous) return;
    if (snapshot.mined > previous.mined) marks.push({ index, kind: "gold" });
    else if (snapshot.output.length > previous.output.length) marks.push({ index, kind: "print" });
    if (snapshot.status === "error") marks.push({ index, kind: "error" });
  });
  return marks;
}

export default function Timeline({ simulation }: { simulation: Simulation }) {
  const { t } = useI18n();
  const { history, index, reviewing, seek, stepBack, live } = simulation.timeline;
  const marks = useMemo(() => timelineMarks(history), [history]);
  const last = history.length - 1;
  if (last < 1) return null;

  const line = history[index].steps;
  const total = history[last].steps;
  const progress = (index / last) * 100;
  // A felolvasó a jelölést is hallja, ha épp azon a ponton áll a csúszka.
  const here = marks.filter((mark) => mark.index === index).map((mark) => t.sim.timelineMarks[mark.kind]);
  const valueText = [t.sim.timelineValue(line, total), ...here].join(", ");

  return (
    <div role="group" aria-label={t.sim.timeline} className="timeline flex items-center gap-2">
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={t.sim.stepBack}
        title={t.sim.stepBack}
        onClick={stepBack}
        disabled={index === 0}
      >
        <StepBack aria-hidden />
      </Button>
      <div className="relative min-w-0 flex-1" style={{ "--progress": `${progress}%` } as CSSProperties}>
        <div aria-hidden className="timeline-marks">
          {marks.map((mark) => (
            <i
              key={`${mark.kind}-${mark.index}`}
              data-kind={mark.kind}
              style={{ "--at": mark.index / last } as CSSProperties}
            />
          ))}
        </div>
        <input
          type="range"
          className="timeline-range"
          min={0}
          max={last}
          step={1}
          value={index}
          onChange={(event) => seek(Number(event.target.value))}
          aria-label={t.sim.timeline}
          aria-valuetext={valueText}
        />
      </div>
      {/* A számláló és az „élőhöz” gomb helye rögzített: ha húzás közben változna a szélességük, a csúszka is
          átméreteződne az ujj alatt, és a fogantyú ugrálna. A gomb élő állapotban csak rejtett, a helye megmarad. */}
      <span className="w-[9ch] shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums" aria-hidden>
        {t.sim.timelinePosition(line, total)}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={live}
        className={reviewing ? undefined : "invisible"}
        aria-hidden={!reviewing || undefined}
        tabIndex={reviewing ? undefined : -1}
      >
        {t.sim.live}
      </Button>
    </div>
  );
}
