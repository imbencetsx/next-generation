import { Suspense } from "react";
import RequireAuth from "@/components/auth/require-auth";
import LoadingStatus from "@/components/loading-status";
import MapEditor from "@/components/map-editor";

export default function MapEditorPage() {
  return (
    <Suspense fallback={<LoadingStatus message="loadingEditor" />}>
      <RequireAuth>
        <MapEditor />
      </RequireAuth>
    </Suspense>
  );
}
