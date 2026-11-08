"use client";

// A futás vezérlői a kódszerkesztő fejlécében, a fájlműveletek alatt: Futtatás/Szünet, Lépés, Visszaállítás,
// Sebesség, alattuk külön sorban az állapot. Hibás programnál az indítás az első hibára ugrik.
// Kis képernyőn (compact) ugyanez egy sorban, a fülsor fölött: a Lépés és a Visszaállítás csak ikon (a nevük a
// címkéjükben), az állapot mellettük.

import { Alert, Check, Idle, Pause, Play, Reset, Running, StepForward } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { SPEEDS, type Simulation, type SpeedId } from "@/components/use-simulation";
import { useI18n } from "@/i18n/i18n-provider";
import type { Messages } from "@/i18n/messages";

/** Az állapotsor felirata; futó gépnél megkülönbözteti a lejátszást, a szünetet és a még el nem indultat. */
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
  /** Futtatás vagy lépés indításakor (kis képernyőn ilyenkor a térkép fülére váltunk). */
  onStart?: () => void;
  compact?: boolean;
};

export default function PlaybackBar({ simulation, showFirstIssue, onStart, compact = false }: Props) {
  const { t } = useI18n();
  const { snapshot } = simulation;
  const finished = snapshot.status === "done" || snapshot.status === "error";
  let runLabel = t.sim.run;
  if (finished) runLabel = t.sim.runAgain;
  else if (simulation.started) runLabel = t.sim.resume;

  // Indítás előtt az első hibára ugrunk: hibás programnál így rögtön látszik, mit kell javítani.
  function start(action: () => void) {
    showFirstIssue();
    onStart?.();
    action();
  }

  let StatusIcon = simulation.playing ? Running : Idle;
  if (snapshot.status === "error") StatusIcon = Alert;
  else if (snapshot.status === "done") StatusIcon = Check;

  const status = (
    <p
      role="status"
      className={`flex items-center justify-center gap-1.5 px-1 ${compact ? "text-xs" : "mt-2 text-sm"} ${snapshot.status === "error" ? "text-brick-text" : "text-foreground"}`}
    >
      <StatusIcon size={16} aria-hidden /> {statusLabel(simulation, t.sim.status)}
    </p>
  );
  const blocked = simulation.blockedBy !== null && (
    <p role="alert" className="mt-2 flex items-center justify-center gap-2 px-1 font-read text-sm text-brick-text">
      <Alert size={14} aria-hidden /> {t.sim.fixBeforeRunning(simulation.blockedBy)}
    </p>
  );

  if (compact) {
    return (
      <div role="group" aria-label={t.sim.playback} className="px-2 pt-2">
        <div className="flex items-center gap-1.5">
          {simulation.playing ? (
            <Button variant="outline" onClick={simulation.pause}>
              <Pause aria-hidden /> {t.sim.pause}
            </Button>
          ) : (
            <Button onClick={() => start(simulation.run)}>
              <Play aria-hidden /> {runLabel}
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            aria-label={t.sim.step}
            title={t.sim.step}
            onClick={() => start(simulation.step)}
            disabled={simulation.playing}
          >
            <StepForward aria-hidden />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={t.sim.reset}
            title={t.sim.reset}
            onClick={simulation.reset}
            disabled={!simulation.started}
          >
            <Reset aria-hidden />
          </Button>
          <label className="ml-auto flex items-center">
            <span className="sr-only">{t.sim.speed}</span>
            <NativeSelect
              value={simulation.speed}
              onChange={(event) => simulation.setSpeed(event.target.value as SpeedId)}
            >
              {SPEEDS.map(({ id }) => (
                <NativeSelectOption key={id} value={id}>
                  {t.sim.speeds[id]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
        </div>
        <div className="mt-1.5">{status}</div>
        {blocked}
      </div>
    );
  }

  return (
    <div role="group" aria-label={t.sim.playback}>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {simulation.playing ? (
          <Button variant="outline" onClick={simulation.pause}>
            <Pause aria-hidden /> {t.sim.pause}
          </Button>
        ) : (
          <Button onClick={() => start(simulation.run)}>
            <Play aria-hidden /> {runLabel}
          </Button>
        )}
        <Button variant="outline" onClick={() => start(simulation.step)} disabled={simulation.playing}>
          <StepForward aria-hidden /> {t.sim.step}
        </Button>
        <Button variant="outline" onClick={simulation.reset} disabled={!simulation.started}>
          <Reset aria-hidden /> {t.sim.reset}
        </Button>
        <label className="ml-1 flex items-center gap-2 text-sm text-foreground">
          {t.sim.speed}
          <NativeSelect
            value={simulation.speed}
            onChange={(event) => simulation.setSpeed(event.target.value as SpeedId)}
          >
            {SPEEDS.map(({ id }) => (
              <NativeSelectOption key={id} value={id}>
                {t.sim.speeds[id]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
      </div>
      {/* Az állapot mindig külön sorban, középen: nem ugrál a gombok közé, ha a felirat épp elfér. */}
      {status}
      {blocked}
    </div>
  );
}
