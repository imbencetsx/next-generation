import { Suspense } from "react";
import RequireAuth from "@/components/auth/require-auth";
import LoadingStatus from "@/components/loading-status";
import Workbench from "@/components/workbench";

export default function TestPage() {
  return (
    // A dokumentációból érkező kódot és térképet az URL-ből olvassuk, ezért kell a Suspense.
    <Suspense fallback={<LoadingStatus message="loadingEditor" />}>
      <RequireAuth>
        <Workbench />
      </RequireAuth>
    </Suspense>
  );
}
