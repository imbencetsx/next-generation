"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useMutation } from "convex/react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { profileErrorKey } from "@/convex/profileRules";
import { useI18n } from "@/i18n/i18n-provider";
import { DEFAULT_ROBOT, type RobotId } from "@/lib/robots";
import Feedback, { type FeedbackState } from "./feedback";
import RobotPicker from "./robot-picker";

export default function RobotOnboarding() {
  const { t, locale } = useI18n();
  const save = useMutation(api.users.setRobot);
  const [robot, setRobot] = useState<RobotId>(DEFAULT_ROBOT);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setFeedback({});
    try {
      await save({ robot });
      setDone(true);
    } catch (error) {
      setFeedback({ error: profileErrorKey(error) });
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog.Root open={!done} onOpenChange={(_open, details) => details.cancel()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/70" />
        <Dialog.Popup
          lang={locale}
          className="app-ui pixel-frame robot-onboarding fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 bg-card p-5 text-foreground outline-none sm:p-6"
        >
          <Dialog.Title className="display text-center text-3xl">{t.robots.welcome}</Dialog.Title>
          <Dialog.Description className="mt-2 mb-5 text-center font-read text-sm text-muted-foreground">
            {t.robots.onboardingHint}
          </Dialog.Description>
          <form onSubmit={submit} aria-busy={pending} className="space-y-4">
            <RobotPicker value={robot} onChange={setRobot} disabled={pending} />
            <Feedback state={feedback} id="robot-onboarding-feedback" />
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? t.profile.saving : t.robots.continue}
            </Button>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
