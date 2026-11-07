import RequireAuth from "@/components/auth/require-auth";
import HomePage from "@/components/home";

export default function Home() {
  return (
    <RequireAuth>
      <HomePage />
    </RequireAuth>
  );
}
