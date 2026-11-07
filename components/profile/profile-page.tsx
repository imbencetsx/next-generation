"use client";

import Link from "next/link";
import { useAction, useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "@/convex/_generated/api";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH, normalizeUsername, passwordProblem, usernameProblem } from "@/convex/credentials";
import { profileErrorKey, type ProfileErrorKey } from "@/convex/profileRules";
import { preparePicture } from "./prepare-picture";
import Avatar from "@/components/auth/avatar";
import UserMenu from "@/components/auth/user-menu";
import UsernameInput from "@/components/auth/username-input";
import { Alert, Check, ChevronLeft, Lock, Upload } from "@/components/icons";
import LanguageSwitch from "@/components/language-switch";
import LoadingStatus from "@/components/loading-status";
import Logo from "@/components/logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/i18n-provider";

type FeedbackState = { error?: ProfileErrorKey | "mismatch"; success?: "pictureSaved" | "pictureRemoved" | "usernameSaved" | "passwordSaved" };

function Feedback({ state, id }: { state: FeedbackState; id: string }) {
  const { t } = useI18n();
  return (
    <div id={id}>
      {state.error && <p role="alert" className="flex items-start gap-2 font-read text-sm text-brick-text"><Alert className="mt-0.5 shrink-0" size={16} />{t.profile.errors[state.error]}</p>}
      {state.success && <p role="status" className="flex items-start gap-2 font-read text-sm"><Check className="mt-0.5 shrink-0" size={16} />{t.profile[state.success]}</p>}
    </div>
  );
}

function PictureForm({ name, imageUrl }: { name: string; imageUrl: string | null }) {
  const { t } = useI18n();
  const setPicture = useAction(api.users.setPicture);
  const removePicture = useMutation(api.users.removePicture);
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<{ blob: Blob; url: string } | null>(null);
  const [pending, setPending] = useState<"preparing" | "saving" | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>({});
  useEffect(() => () => { if (draft) URL.revokeObjectURL(draft.url); }, [draft]);

  async function choose(file: File | undefined) {
    if (!file) return;
    setPending("preparing");
    setFeedback({});
    try {
      const blob = await preparePicture(file);
      setDraft({ blob, url: URL.createObjectURL(blob) });
    } catch {
      setFeedback({ error: "image" });
    } finally {
      setPending(null);
      if (input.current) input.current.value = "";
    }
  }

  async function save(remove = false) {
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

  return (
    <Card className="gap-5 p-6" role="region" aria-labelledby="picture-title">
      <h2 id="picture-title" className="panel-title">{t.profile.picture}</h2>
      <div className="flex flex-wrap items-center gap-5">
        <Avatar name={name} imageUrl={draft?.url ?? imageUrl} size={96} />
        <div className="min-w-0 flex-1 space-y-3">
          <p id="picture-hint" className="font-read text-sm text-muted-foreground">{t.profile.pictureHint}</p>
          <fieldset disabled={!!pending} className="flex flex-wrap gap-2" aria-busy={!!pending}>
            <Button variant="outline" onClick={() => input.current?.click()} aria-describedby="picture-hint"><Upload />{t.profile.choosePicture}</Button>
            <input ref={input} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { void choose(event.target.files?.[0]); }} />
            {draft && <Button onClick={() => { void save(); }}>{t.profile.savePicture}</Button>}
            {(imageUrl || draft) && <Button variant="ghost" onClick={() => { void save(true); }}>{t.profile.removePicture}</Button>}
          </fieldset>
          {pending && <p role="status" className="font-read text-sm text-muted-foreground">{pending === "preparing" ? t.profile.preparing : t.profile.saving}</p>}
        </div>
      </div>
      <Feedback state={feedback} id="picture-feedback" />
    </Card>
  );
}

function UsernameForm({ name }: { name: string }) {
  const { t } = useI18n();
  const updateUsername = useMutation(api.users.updateUsername);
  const [draft, setDraft] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>({});
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const username = normalizeUsername(draft ?? name);
    if (usernameProblem(username)) return setFeedback({ error: "username" });
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
      <h2 id="username-title" className="panel-title">{t.profile.username}</h2>
      <p className="font-read text-sm text-muted-foreground">{t.profile.usernameHint}</p>
      <form onSubmit={submit} aria-busy={pending}>
        <fieldset disabled={pending} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-username">{t.auth.username}</Label>
            <UsernameInput id="profile-username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required minLength={3} value={draft ?? name} onChange={(event) => { setDraft(event.target.value); setFeedback({}); }} aria-invalid={!!feedback.error} aria-describedby="profile-username-rule username-feedback" className="h-10" />
            <p id="profile-username-rule" className="font-read text-sm text-muted-foreground">{t.auth.usernameRule}</p>
          </div>
          <Button type="submit" disabled={normalizeUsername(draft ?? name) === name}>{pending ? t.profile.saving : t.profile.saveUsername}</Button>
        </fieldset>
      </form>
      <Feedback state={feedback} id="username-feedback" />
    </Card>
  );
}

function PasswordForm({ name }: { name: string }) {
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
    if (passwordProblem(newPassword)) return setFeedback({ error: "password" });
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
  return (
    <Card className="gap-4 p-6" role="region" aria-labelledby="password-title">
      <h2 id="password-title" className="panel-title flex items-center gap-2"><Lock size={20} />{t.profile.password}</h2>
      <p id="password-hint" className="font-read text-sm text-muted-foreground">{t.profile.passwordHint}</p>
      <form onSubmit={submit} aria-busy={pending}>
        <input type="text" name="username" value={name} autoComplete="username" hidden readOnly />
        <fieldset disabled={pending} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">{t.profile.currentPassword}</Label>
            <Input id="current-password" name="currentPassword" type="password" autoComplete="current-password" required maxLength={MAX_PASSWORD_LENGTH} aria-invalid={feedback.error === "currentPassword"} aria-describedby="password-hint password-feedback" className="h-10" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-password">{t.profile.newPassword}</Label>
              <Input id="new-password" name="newPassword" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} maxLength={MAX_PASSWORD_LENGTH} aria-describedby="password-rule password-feedback" aria-invalid={feedback.error === "password"} className="h-10" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">{t.profile.confirmPassword}</Label>
              <Input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} maxLength={MAX_PASSWORD_LENGTH} aria-describedby="password-feedback" aria-invalid={feedback.error === "mismatch"} className="h-10" />
            </div>
          </div>
          <p id="password-rule" className="font-read text-sm text-muted-foreground">{t.auth.passwordRule}</p>
          <Button type="submit">{pending ? t.profile.saving : t.profile.savePassword}</Button>
        </fieldset>
      </form>
      <Feedback state={feedback} id="password-feedback" />
    </Card>
  );
}

export default function ProfilePage() {
  const { t } = useI18n();
  const viewer = useQuery(api.users.viewer);
  return (
    <div className="app-ui min-h-dvh">
      <header className="topbar">
        <div className="flex min-h-[68px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-1.5">
          <Link href="/test" aria-label={t.profile.back}><Logo /></Link>
          <div className="ml-auto flex items-center gap-2"><LanguageSwitch /><span className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden /><UserMenu /></div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6 sm:py-10">
        <Link href="/test" data-slot="button" data-variant="ghost" className={buttonVariants({ variant: "ghost", className: "self-start" })}><ChevronLeft />{t.profile.back}</Link>
        <div className="mb-2 space-y-2"><h1 className="display text-4xl sm:text-5xl">{t.profile.title}</h1><p className="font-read text-sm text-muted-foreground">{t.profile.description}</p></div>
        {viewer ? <><PictureForm name={viewer.name} imageUrl={viewer.imageUrl} /><UsernameForm name={viewer.name} /><PasswordForm name={viewer.name} /></> : <LoadingStatus message="checkingSession" fullScreen={false} />}
      </main>
    </div>
  );
}
