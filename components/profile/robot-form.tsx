"use client";

import { useMutation } from "convex/react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { profileErrorKey } from "@/convex/profileRules";
import { useI18n } from "@/i18n/i18n-provider";
import { DEFAULT_ROBOT, type RobotId } from "@/lib/robots";
import Feedback, { type FeedbackState } from "./feedback";
import RobotPicker from "./robot-picker";

export default function RobotForm({ savedRobot = DEFAULT_ROBOT }: { savedRobot?: RobotId }) {
  const { t } = useI18n();
  const save = useMutation(api.users.setRobot);
  const [draft, setDraft] = useState<RobotId | null>(null);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>({});
  const value = draft ?? savedRobot;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || value === savedRobot) return;
    setPending(true);
    setFeedback({});
    try {
      await save({ robot: value });
      setDraft(null);
      setFeedback({ success: "robotSaved" });
    } catch (error) {
      setFeedback({ error: profileErrorKey(error) });
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="gap-4 p-4 sm:p-6" role="region" aria-labelledby="robot-title">
      <div className="space-y-2">
        <h2 id="robot-title" className="panel-title">
          {t.profile.robot}
        </h2>
        <p className="font-read text-sm text-muted-foreground">{t.profile.robotHint}</p>
      </div>
      <form onSubmit={submit} aria-busy={pending} className="space-y-4">
        <RobotPicker
          value={value}
          disabled={pending}
          onChange={(robot) => {
            setDraft(robot);
            setFeedback({});
          }}
        />
        <Button type="submit" disabled={pending || value === savedRobot}>
          {pending ? t.profile.saving : t.profile.saveRobot}
        </Button>
      </form>
      <Feedback state={feedback} id="robot-feedback" />
    </Card>
  );
}
