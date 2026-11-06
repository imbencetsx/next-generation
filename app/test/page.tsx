import { Suspense } from "react";
import Workbench from "@/components/workbench";

export default function TestPage() {
  return (
    // A dokumentációból érkező kódot és térképet az URL-ből olvassuk, ezért kell a Suspense.
    <Suspense fallback={<div className="flex h-dvh items-center justify-center text-sm text-[#65738a]">Loading editor…</div>}>
      <Workbench />
    </Suspense>
  );
}
