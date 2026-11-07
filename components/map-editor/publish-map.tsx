"use client";

// A térkép közzététele a fájlnév-mezőben megadott néven. A szerver újra ellenőrzi a térképet és a nevet
// (convex/maps.ts); a visszajelzés a gomb alatt jelenik meg, sikernél a kezdőlapra mutató linkkel.

import Link from "next/link";
import { useMutation } from "convex/react";
import { useState } from "react";
import { Alert, Check, Share } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { mapErrorKey, type MapErrorKey } from "@/convex/mapRules";
import { useI18n } from "@/i18n/i18n-provider";
import { DEFAULT_FILE_NAME } from "@/lib/file-names";
import { ROUTES } from "@/lib/routes";

type Props = {
  /** A térkép neve kiterjesztés nélkül (a fájlnév-mezőből). */
  name: string;
  /** Az érvényes térkép szövege; null, ha a térkép most hibás. */
  text: string | null;
};

type Result = { published: string } | { error: MapErrorKey } | null;

export default function PublishMap({ name, text }: Props) {
  const { t } = useI18n();
  const publish = useMutation(api.maps.publish);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Result>(null);

  async function submit() {
    if (text === null) return;
    const publishedName = name.trim() || DEFAULT_FILE_NAME;
    setPending(true);
    setResult(null);
    try {
      await publish({ name: publishedName, text });
      setResult({ published: publishedName });
    } catch (error) {
      setResult({ error: mapErrorKey(error) });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        disabled={text === null || pending}
        aria-busy={pending}
        aria-describedby="map-publish-hint"
        onClick={() => void submit()}
      >
        <Share aria-hidden />
        {pending ? t.mapEditor.publishing : t.mapEditor.publish}
      </Button>
      {result && (
        // A fejléc sorát elhagyva, teljes szélességben jelenik meg a gombok alatt.
        <div className="basis-full font-read text-sm">
          {"published" in result ? (
            <p role="status" className="flex flex-wrap items-center gap-2">
              <Check size={16} aria-hidden />
              {t.mapEditor.published(result.published)}
              <Link href={ROUTES.home} className="underline underline-offset-4">
                {t.mapEditor.openHome}
              </Link>
            </p>
          ) : (
            <p role="alert" className="flex items-center gap-2 text-brick-text">
              <Alert size={16} aria-hidden />
              {t.maps.errors[result.error]}
            </p>
          )}
        </div>
      )}
    </>
  );
}
