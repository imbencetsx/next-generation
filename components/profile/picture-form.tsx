"use client";

// Profilkép: kiválasztás után a böngészőben pixel avatarrá alakítjuk (prepare-picture.ts), megmutatjuk
// előnézetként, és csak a Mentés gombra töltjük fel.

import { useAction, useMutation } from "convex/react";
import { useEffect, useRef, useState } from "react";
import Avatar from "@/components/auth/avatar";
import { Upload } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { profileErrorKey } from "@/convex/profileRules";
import { useI18n } from "@/i18n/i18n-provider";
import Feedback, { type FeedbackState } from "./feedback";
import { ACCEPTED_TYPES, preparePicture } from "./prepare-picture";

type Draft = { blob: Blob; previewUrl: string };

export default function PictureForm({ name, imageUrl }: { name: string; imageUrl: string | null }) {
  const { t } = useI18n();
  const setPicture = useAction(api.users.setPicture);
  const removePicture = useMutation(api.users.removePicture);
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pending, setPending] = useState<"preparing" | "saving" | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>({});

  // Az előnézet ideiglenes URL-jét felszabadítjuk, amint lecseréljük vagy elmentjük.
  useEffect(
    () => () => {
      if (draft) URL.revokeObjectURL(draft.previewUrl);
    },
    [draft],
  );

  async function choose(file: File | undefined) {
    if (!file) return;
    setPending("preparing");
    setFeedback({});
    try {
      const blob = await preparePicture(file);
      setDraft({ blob, previewUrl: URL.createObjectURL(blob) });
    } catch {
      setFeedback({ error: "image" });
    } finally {
      setPending(null);
      if (input.current) input.current.value = "";
    }
  }

  async function save({ remove }: { remove: boolean }) {
    setPending("saving");
    setFeedback({});
    try {
      if (remove) await removePicture({});
      else if (draft) await setPicture({ image: await draft.blob.arrayBuffer() });
      setDraft(null);
      setFeedback({ success: remove ? "pictureRemoved" : "pictureSaved" });
    } catch (error) {
      setFeedback({ error: profileErrorKey(error) });
    } finally {
      setPending(null);
    }
  }

  const busy = pending !== null;

  return (
    <Card className="gap-5 p-6" role="region" aria-labelledby="picture-title">
      <h2 id="picture-title" className="panel-title">
        {t.profile.picture}
      </h2>
      <div className="flex flex-wrap items-center gap-5">
        <Avatar name={name} imageUrl={draft?.previewUrl ?? imageUrl} size={96} />
        <div className="min-w-0 flex-1 space-y-3">
          <p id="picture-hint" className="font-read text-sm text-muted-foreground">
            {t.profile.pictureHint}
          </p>
          <fieldset disabled={busy} className="flex flex-wrap gap-2" aria-busy={busy}>
            <Button variant="outline" onClick={() => input.current?.click()} aria-describedby="picture-hint">
              <Upload />
              {t.profile.choosePicture}
            </Button>
            <input
              ref={input}
              hidden
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              onChange={(event) => void choose(event.target.files?.[0])}
            />
            {draft && <Button onClick={() => void save({ remove: false })}>{t.profile.savePicture}</Button>}
            {(imageUrl || draft) && (
              <Button variant="ghost" onClick={() => void save({ remove: true })}>
                {t.profile.removePicture}
              </Button>
            )}
          </fieldset>
          {pending && (
            <p role="status" className="font-read text-sm text-muted-foreground">
              {pending === "preparing" ? t.profile.preparing : t.profile.saving}
            </p>
          )}
        </div>
      </div>
      <Feedback state={feedback} id="picture-feedback" />
    </Card>
  );
}
