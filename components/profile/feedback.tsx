"use client";

// Egy profilűrlap visszajelzése: hiba (role="alert") vagy siker (role="status"), ikonnal és szöveggel.

import { Alert, Check } from "@/components/icons";
import type { ProfileErrorKey } from "@/convex/profileRules";
import { useI18n } from "@/i18n/i18n-provider";

export type FeedbackState = {
  /** A „mismatch” csak a kliensen fordulhat elő (a két új jelszó eltér). */
  error?: ProfileErrorKey | "mismatch";
  success?: "pictureSaved" | "pictureRemoved" | "usernameSaved" | "passwordSaved" | "languageSaved" | "robotSaved";
};

/** Az `id` az űrlap mezőinek aria-describedby hivatkozásához kell. */
export default function Feedback({ state, id }: { state: FeedbackState; id: string }) {
  const { t } = useI18n();
  return (
    <div id={id}>
      {state.error && (
        <p role="alert" className="flex items-start gap-2 font-read text-sm text-brick-text">
          <Alert className="mt-0.5 shrink-0" size={16} />
          {t.profile.errors[state.error]}
        </p>
      )}
      {state.success && (
        <p role="status" className="flex items-start gap-2 font-read text-sm">
          <Check className="mt-0.5 shrink-0" size={16} />
          {t.profile[state.success]}
        </p>
      )}
    </div>
  );
}
