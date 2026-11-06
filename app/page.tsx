import { Suspense } from "react";
import Workbench from "@/components/workbench";

export default function Home() {
  return (
    // Workbench reads ?code= / ?map= (sent by the docs), which needs a Suspense boundary.
    <Suspense fallback={<div className="flex h-dvh items-center justify-center text-sm text-[#65738a]">Loading editor…</div>}>
      <Workbench />
    </Suspense>
  );
}
