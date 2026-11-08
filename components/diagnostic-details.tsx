"use client";
import type { Diagnostic } from "@/lib/diagnostics";
import { useI18n } from "@/i18n/i18n-provider";

export default function DiagnosticDetails({ diagnostic }: { diagnostic: Diagnostic }) {
  const { t, locale } = useI18n();
  if (locale !== "hu") return null;
  return (
    <details className="mt-2 font-read text-xs text-muted-foreground">
      <summary className="cursor-pointer">{t.editor.technicalDetails}</summary>
      <div lang="en" className="mt-1 space-y-1 whitespace-pre-line">
        <p>{diagnostic.message}</p>
        {diagnostic.hint && <p>{diagnostic.hint}</p>}
        {diagnostic.related?.map((item) => (
          <p key={item.line}>
            {item.line}: {item.message}
          </p>
        ))}
      </div>
    </details>
  );
}
