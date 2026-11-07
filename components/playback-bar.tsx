"use client";

// A futás vezérlői a kódszerkesztő fejlécében, a fájlműveletek alatt: Futtatás/Szünet, Lépés, Visszaállítás,
// Sebesség, alattuk külön sorban az állapot. Hibás programnál az indítás az első hibára ugrik.

import { Alert, Check, Idle, Pause, Play, Reset, Running, StepForward } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { SPEEDS, type Simulation } from "@/components/use-simulation";
import { useI18n } from "@/i18n/i18n-provider";
import type { Messages } from "@/i18n/messages";

function statusLabel(simulation: Simulation, labels: Messages["sim"]["status"]) {
  const { status, steps } = simulation.snapshot;
  if (status === "running") {
    if (simulation.playing) return labels.running;
    return steps > 0 ? labels.paused : labels.ready;
  }
  return { idle: labels.ready, done: labels.finished, error: labels.error }[status];
}

type Props = {
  simulation: Simulation;
  /** Az első szintaktikai hibára ugrik (ha van); indítás előtt hívjuk. */
  showFirstIssue: () => void;
};

export default function PlaybackBar({ simulation, showFirstIssue }: Props) {
  const { t } = useI18n();
  const { snapshot } = simulation;
  const finished = snapshot.status === "done" || snapshot.status === "error";
  let runLabel = t.sim.run;
  if (finished) runLabel = t.sim.runAgain;
  else if (simulation.started) runLabel = t.sim.resume;

  function start(action: () => void) {
    showFirstIssue();
    action();
  }

  const StatusIcon = snapshot.status === "error" ? Alert : snapshot.status === "done" ? Check : simulation.playing ? Running : Idle;

  return (
    <div role="group" aria-label={t.sim.playback}>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {simulation.playing ? (
          <Button variant="outline" onClick={simulation.pause}><Pause aria-hidden /> {t.sim.pause}</Button>
        ) : (
          <Button onClick={() => start(simulation.run)}><Play aria-hidden /> {runLabel}</Button>
        )}
        <Button variant="outline" onClick={() => start(simulation.step)} disabled={simulation.playing}>
          <StepForward aria-hidden /> {t.sim.step}
        </Button>
        <Button variant="outline" onClick={simulation.reset} disabled={!simulation.started}>
          <Reset aria-hidden /> {t.sim.reset}
        </Button>
        <label className="ml-1 flex items-center gap-2 text-sm text-muted-foreground">
          {t.sim.speed}
          <NativeSelect value={simulation.speed} onChange={(event) => simulation.setSpeed(Number(event.target.value))}>
            {SPEEDS.map((speed, index) => <NativeSelectOption key={speed.delay} value={index}>{t.sim.speeds[index]}</NativeSelectOption>)}
          </NativeSelect>
        </label>
      </div>
      {/* Az állapot mindig külön sorban, középen: nem ugrál a gombok közé, ha a felirat épp elfér. */}
      <p role="status" className={`mt-2 flex items-center justify-center gap-1.5 px-1 text-sm ${snapshot.status === "error" ? "text-brick-text" : "text-foreground"}`}>
        <StatusIcon size={16} aria-hidden /> {statusLabel(simulation, t.sim.status)}
      </p>
      {simulation.blockedBy !== null && (
        <p role="alert" className="mt-2 flex items-center justify-center gap-2 px-1 font-read text-sm text-brick-text">
          <Alert size={14} aria-hidden /> {t.sim.fixBeforeRunning(simulation.blockedBy)}
        </p>
      )}
    </div>
  );
}
