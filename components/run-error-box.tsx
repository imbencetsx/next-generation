"use client";
import DiagnosticDetails from "@/components/diagnostic-details";
import { localizedDiagnostic } from "@/i18n/diagnostics";
import { Alert } from "@/components/icons";
import { useI18n } from "@/i18n/i18n-provider";
import type { RunError } from "@/lib/interpreter";

/** A futásidejű hiba: kód és hely, üzenet, javaslat, valamint ugrás a hibás és a kapcsolódó sorokra. */
export default function RunErrorBox({
  error: original,
  onJump,
}: {
  error: RunError;
  onJump: (line: number, column?: number) => void;
}) {
  const { t, locale } = useI18n();
  const error = localizedDiagnostic(original, locale);
  return (
    <div role="alert" className="pixel-frame bg-brick/15 p-3 text-sm" data-tone="danger">
      <p className="flex items-center gap-2 font-mono text-xs text-brick-text">
        <Alert size={14} aria-hidden />
        {t.sim.errorAt(error.code, error.line, error.column)}
      </p>
      <p className="mt-1 font-read">{error.message}</p>
      {error.hint && (
        <p className="mt-1 whitespace-pre-line font-read text-[13px] text-muted-foreground">
          <span className="text-foreground">{t.editor.hint}</span> {error.hint}
        </p>
      )}
      <div className="mt-1.5 flex flex-wrap gap-x-3">
        <button
          type="button"
          className="text-xs underline underline-offset-4"
          onClick={() => onJump(error.line, error.column)}
        >
          {t.sim.goToLine(error.line)}
        </button>
        {error.related?.map((item) => (
          <button
            type="button"
            key={item.line + item.message}
            className="text-xs underline underline-offset-4"
            onClick={() => onJump(item.line)}
          >
            {t.editor.relatedLine(item.line)} {item.message}
          </button>
        ))}
      </div>
      <DiagnosticDetails diagnostic={original} />
    </div>
  );
}
