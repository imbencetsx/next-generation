import { Suspense } from "react";
import RequireAuth from "@/components/auth/require-auth";
import LoadingStatus from "@/components/loading-status";
import MapPage from "@/components/map-page";

// A térkép azonosítója futáskor derül ki (a közzétett térképek nem ismertek építéskor), ezért a paramétert egy
// Suspense mögötti komponens olvassa ki; a lap váza így előre elkészülhet.
export default function MapRoute({ params }: PageProps<"/maps/[mapId]">) {
  return (
    <Suspense fallback={<LoadingStatus message="loading" />}>
      <MapFromParams params={params} />
    </Suspense>
  );
}

async function MapFromParams({ params }: Pick<PageProps<"/maps/[mapId]">, "params">) {
  const { mapId } = await params;
  return (
    <RequireAuth>
      <MapPage mapId={mapId} />
    </RequireAuth>
  );
}
