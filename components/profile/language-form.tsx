"use client";

import { useMutation } from "convex/react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { api } from "@/convex/_generated/api";
import { profileErrorKey } from "@/convex/profileRules";
import { useI18n } from "@/i18n/i18n-provider";
import type { Locale } from "@/i18n/locale";
import Feedback, { type FeedbackState } from "./feedback";

export default function LanguageForm({ savedLocale }: { savedLocale: Locale | null }) {
  const { t, locale, setLocale } = useI18n();
  const saveLocale = useMutation(api.users.setLocale);
  const [draft, setDraft] = useState<Locale | null>(null);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>({});
  const value = draft ?? locale;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFeedback({});
    try {
      await saveLocale({ locale: value });
      setLocale(value);
      setDraft(null);
      setFeedback({ success: "languageSaved" });
    } catch (error) {
      setFeedback({ error: profileErrorKey(error) });
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="gap-4 p-6" role="region" aria-labelledby="language-title">
      <h2 id="language-title" className="panel-title">
        {t.profile.language}
      </h2>
      <p id="language-hint" className="font-read text-sm text-muted-foreground">
        {t.profile.languageHint}
      </p>
      <form onSubmit={submit} aria-busy={pending}>
        <fieldset disabled={pending} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-language">{t.profile.language}</Label>
            <NativeSelect
              id="profile-language"
              value={value}
              aria-describedby="language-hint language-feedback"
              onChange={(event) => {
                setDraft(event.target.value as Locale);
                setFeedback({});
              }}
            >
              <NativeSelectOption value="en" lang="en">
                {t.profile.english}
              </NativeSelectOption>
              <NativeSelectOption value="hu" lang="hu">
                {t.profile.hungarian}
              </NativeSelectOption>
            </NativeSelect>
          </div>
          <Button type="submit" disabled={value === savedLocale}>
            {pending ? t.profile.saving : t.profile.saveLanguage}
          </Button>
        </fieldset>
      </form>
      <Feedback state={feedback} id="language-feedback" />
    </Card>
  );
}
