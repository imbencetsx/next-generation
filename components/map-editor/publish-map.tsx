"use client";

// A közzététel előtt külön nevet adhatunk a térképnek, és megnézhetjük a kezdőlapi kártyáját.
import { Dialog } from "@base-ui/react/dialog";
import Link from "next/link";
import { useMutation } from "convex/react";
import { useState, type FormEvent } from "react";
import MapCard from "@/components/map-card";
import { Alert, Check, Share } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import { MAX_PUBLISHED_NAME_LENGTH, publishedMapName, mapErrorKey, type MapErrorKey } from "@/convex/mapRules";
import { useI18n } from "@/i18n/i18n-provider";
import { DEFAULT_FILE_NAME } from "@/lib/file-names";
import { ROUTES } from "@/lib/routes";

type Props = { name: string; text: string | null };

export default function PublishMap({ name, text }: Props) {
  const { t, locale } = useI18n();
  const publish = useMutation(api.maps.publish);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [source, setSource] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<MapErrorKey | null>(null);
  const [published, setPublished] = useState<string | null>(null);
  const publishedName = publishedMapName(draft);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!publishedName || pending) return;
    setPending(true);
    setError(null);
    try {
      await publish({ name: publishedName, text: source });
      setPublished(publishedName);
      setOpen(false);
    } catch (caught) {
      setError(mapErrorKey(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Dialog.Root
        open={open}
        onOpenChange={(next, details) => {
          if (pending) return details.cancel();
          if (next) {
            if (text === null) return details.cancel();
            setDraft(name.trim() || DEFAULT_FILE_NAME);
            setSource(text);
            setError(null);
            setPublished(null);
          }
          setOpen(next);
        }}
      >
        <Dialog.Trigger
          render={<Button variant="outline" disabled={text === null} aria-describedby="map-publish-hint" />}
        >
          <Share aria-hidden />
          {t.mapEditor.publish}
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
          <Dialog.Popup
            lang={locale}
            className="app-ui pixel-frame fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-1rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto bg-card p-2 text-foreground outline-none transition-[opacity,scale] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none sm:p-6"
          >
            <div className="space-y-2 p-2 sm:p-0">
              <Dialog.Title className="panel-title">{t.mapEditor.publishTitle}</Dialog.Title>
              <Dialog.Description className="max-w-prose font-read text-sm text-muted-foreground">
                {t.mapEditor.publishHint}
              </Dialog.Description>
            </div>
            <form onSubmit={submit} aria-busy={pending} className="mt-5 space-y-5">
              <div className="grid items-start gap-5 md:grid-cols-2">
                <div className="space-y-2 p-2 sm:p-0">
                  <Label htmlFor="publish-map-name">{t.mapEditor.publishName}</Label>
                  <Input
                    id="publish-map-name"
                    value={draft}
                    maxLength={MAX_PUBLISHED_NAME_LENGTH}
                    required
                    disabled={pending}
                    onChange={(event) => {
                      setDraft(event.target.value);
                      setError(null);
                    }}
                    aria-invalid={!publishedName || error === "name"}
                    aria-describedby="publish-name-hint publish-map-error"
                  />
                  <p id="publish-name-hint" className="font-read text-sm text-muted-foreground">
                    {t.mapEditor.publishNameHint}
                  </p>
                </div>
                <section className="min-w-0 space-y-2" aria-label={t.mapEditor.publishPreview}>
                  <h2 className="px-2 text-sm sm:px-0">{t.mapEditor.publishPreview}</h2>
                  <MapCard name={publishedName ?? t.mapEditor.publishName} text={source} author={t.home.you} />
                </section>
              </div>
              <div id="publish-map-error">
                {error && (
                  <p role="alert" className="flex items-center gap-2 font-read text-sm text-brick-text">
                    <Alert size={16} aria-hidden />
                    {t.maps.errors[error]}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap justify-end gap-2 border-t border-border p-2 pt-4 sm:px-0 sm:pb-0">
                <Dialog.Close render={<Button variant="outline" disabled={pending} />}>{t.home.cancel}</Dialog.Close>
                <Button type="submit" disabled={!publishedName || pending}>
                  <Share aria-hidden />
                  {pending ? t.mapEditor.publishing : t.mapEditor.publish}
                </Button>
              </div>
            </form>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
      {published && (
        <p role="status" className="flex basis-full flex-wrap items-center gap-2 font-read text-sm">
          <Check size={16} aria-hidden />
          {t.mapEditor.published(published)}
          <Link href={ROUTES.home} className="underline underline-offset-4">
            {t.mapEditor.openHome}
          </Link>
        </p>
      )}
    </>
  );
}
