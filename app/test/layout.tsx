import AuthProviders from "@/components/auth/auth-providers";

export default function TestLayout({ children }: LayoutProps<"/test">) {
  return (
    <AuthProviders fallback={<div aria-busy="true" className="app-ui h-dvh" />}>
      {children}
    </AuthProviders>
  );
}
