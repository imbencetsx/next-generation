"use client";

// Felhasználónév módosítása. A szabályt a kliens is ellenőrzi, de a döntő ellenőrzés a szerveren van
// (convex/users.ts: updateUsername), ahol a foglalt név is kiderül.

import { useMutation } from "convex/react";
import { useState, type FormEvent } from "react";
import UsernameInput from "@/components/auth/username-input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import { MIN_USERNAME_LENGTH, normalizeUsername, isValidUsername } from "@/convex/credentials";
import { profileErrorKey } from "@/convex/profileRules";
import { useI18n } from "@/i18n/i18n-provider";
import Feedback, { type FeedbackState } from "./feedback";

export default function UsernameForm({ name }: { name: string }) {
  const { t } = useI18n();
  const updateUsername = useMutation(api.users.updateUsername);
  // null: a felhasználó még nem írt bele, a mező a jelenlegi nevet mutatja.
  const [draft, setDraft] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>({});
  const value = draft ?? name;
  const unchanged = normalizeUsername(value) === name;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const username = normalizeUsername(value);
    if (!isValidUsername(username)) return setFeedback({ error: "username" });

    setPending(true);
    setFeedback({});
    try {
      await updateUsername({ username });
      setDraft(null);
      setFeedback({ success: "usernameSaved" });
    } catch (error) {
      setFeedback({ error: profileErrorKey(error) });
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="gap-4 p-6" role="region" aria-labelledby="username-title">
      <h2 id="username-title" className="panel-title">
        {t.profile.username}
      </h2>
      <p className="font-read text-sm text-muted-foreground">{t.profile.usernameHint}</p>
      <form onSubmit={submit} aria-busy={pending}>
        <fieldset disabled={pending} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-username">{t.auth.username}</Label>
            <UsernameInput
              id="profile-username"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              minLength={MIN_USERNAME_LENGTH}
              value={value}
              onChange={(event) => {
                setDraft(event.target.value);
                setFeedback({});
              }}
              aria-invalid={!!feedback.error}
              aria-describedby="profile-username-rule username-feedback"
              className="h-10"
            />
            <p id="profile-username-rule" className="font-read text-sm text-muted-foreground">
              {t.auth.usernameRule}
            </p>
          </div>
          <Button type="submit" disabled={unchanged}>
            {pending ? t.profile.saving : t.profile.saveUsername}
          </Button>
        </fieldset>
      </form>
      <Feedback state={feedback} id="username-feedback" />
    </Card>
  );
}
