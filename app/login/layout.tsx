import AuthProviders from "@/components/auth/auth-providers";

export default function LoginLayout({ children }: LayoutProps<"/login">) {
  return <AuthProviders fallback={<main className="app-ui min-h-dvh" />}>{children}</AuthProviders>;
}
