import RequireAuth from "@/components/auth/require-auth";
import { BuiltInMapsPage } from "@/components/maps/maps-page";

// Az összes beépített pálya (lib/robot-map.ts, MAP_PRESETS). Statikus szakasz: elsőbbséget kap a /maps/[mapId] előtt.
export default function BuiltInMapsRoute() {
  return (
    <RequireAuth>
      <BuiltInMapsPage />
    </RequireAuth>
  );
}
