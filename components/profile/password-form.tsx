"use client";

// Jelszócsere a jelenlegi jelszó megadásával. Sikeres csere után a szerver a többi munkamenetet
// kilépteti (convex/users.ts: changePassword).

import { useAction } from "convex/react";
import { useState, type FormEvent } from "react";
import { Lock } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH, isValidPassword } from "@/convex/credentials";
import { profileErrorKey } from "@/convex/profileRules";
import { useI18n } from "@/i18n/i18n-provider";
import Feedback, { type FeedbackState } from "./feedback";

export default function PasswordForm({ name }: { name: string }) {
  const { t } = useI18n();
  const changePassword = useAction(api.users.changePassword);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const currentPassword = String(data.get("currentPassword") ?? "");
    const newPassword = String(data.get("newPassword") ?? "");
    if (!isValidPassword(newPassword)) return setFeedback({ error: "password" });
    if (newPassword !== data.get("confirmPassword")) return setFeedback({ error: "mismatch" });

    setPending(true);
    setFeedback({});
    try {
      await changePassword({ currentPassword, newPassword });
      form.reset();
      setFeedback({ success: "passwordSaved" });
    } catch (error) {
      setFeedback({ error: profileErrorKey(error) });
    } finally {
      setPending(false);
    }
  }

  const newPasswordLimits = { minLength: MIN_PASSWORD_LENGTH, maxLength: MAX_PASSWORD_LENGTH };

  return (
    <Card className="gap-4 p-6" role="region" aria-labelledby="password-title">
      <h2 id="password-title" className="panel-title flex items-center gap-2">
        <Lock size={20} />
        {t.profile.password}
      </h2>
      <p id="password-hint" className="font-read text-sm text-muted-foreground">
        {t.profile.passwordHint}
      </p>
      <form onSubmit={submit} aria-busy={pending}>
        {/* Rejtett felhasználónév, hogy a jelszókezelő tudja, melyik fiókhoz tartozik a jelszó. */}
        <input type="text" name="username" value={name} autoComplete="username" hidden readOnly />
        <fieldset disabled={pending} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">{t.profile.currentPassword}</Label>
            <Input
              id="current-password"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              maxLength={MAX_PASSWORD_LENGTH}
              aria-invalid={feedback.error === "currentPassword"}
              aria-describedby="password-hint password-feedback"
              className="h-10"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-password">{t.profile.newPassword}</Label>
              <Input
                id="new-password"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                {...newPasswordLimits}
                aria-describedby="password-rule password-feedback"
                aria-invalid={feedback.error === "password"}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">{t.profile.confirmPassword}</Label>
              <Input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                {...newPasswordLimits}
                aria-describedby="password-feedback"
                aria-invalid={feedback.error === "mismatch"}
                className="h-10"
              />
            </div>
          </div>
          <p id="password-rule" className="font-read text-sm text-muted-foreground">
            {t.auth.passwordRule}
          </p>
          <Button type="submit">{pending ? t.profile.saving : t.profile.savePassword}</Button>
        </fieldset>
      </form>
      <Feedback state={feedback} id="password-feedback" />
    </Card>
  );
}
