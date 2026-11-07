import RequireAuth from "@/components/auth/require-auth";
import ProfilePage from "@/components/profile/profile-page";

export default function Page() {
  return (
    <RequireAuth>
      <ProfilePage />
    </RequireAuth>
  );
}
