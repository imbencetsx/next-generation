"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useI18n } from "@/i18n/i18n-provider";

export function useReplaceConfirmation(dirty: boolean) {
  const { t } = useI18n();
  const [action, setAction] = useState<(() => void) | null>(null);
  function request(next: () => void) {
    if (dirty) setAction(() => next);
    else next();
  }
  const dialog = (
    <AlertDialog
      open={action !== null}
      onOpenChange={(open) => {
        if (!open) setAction(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogTitle>{t.editor.replaceTitle}</AlertDialogTitle>
        <AlertDialogDescription>{t.editor.replaceDescription}</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>{t.home.cancel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              const next = action;
              setAction(null);
              next?.();
            }}
          >
            {t.editor.replaceConfirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
  return { request, dialog };
}
