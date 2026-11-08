import RequireAuth from "@/components/auth/require-auth";
import { PublishedMapsPage } from "@/components/maps/maps-page";

// Az összes közzétett térkép, lapozva és szűrhetően (a kezdőlap csak a legújabbakat mutatja).
export default function PublishedMapsRoute() {
  return (
    <RequireAuth>
      <PublishedMapsPage />
    </RequireAuth>
  );
}
