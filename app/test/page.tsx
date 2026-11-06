import { Suspense } from "react";
import RequireAuth from "@/components/auth/require-auth";
import Workbench from "@/components/workbench";

export default function TestPage() {
  return (
    // A dokumentációból érkező kódot és térképet az URL-ből olvassuk, ezért kell a Suspense.
    <Suspense fallback={<div className="app-ui flex h-dvh items-center justify-center text-sm text-muted-foreground">Loading editor…</div>}>
      <RequireAuth>
        <Workbench />
      </RequireAuth>
    </Suspense>
  );
}
