import AuthProviders from "@/components/auth/auth-providers";

export default function TestLayout({ children }: LayoutProps<"/test">) {
  return (
    <AuthProviders fallback={<div role="status" className="app-ui flex h-dvh items-center justify-center text-sm text-muted-foreground">Checking your session…</div>}>
      {children}
    </AuthProviders>
  );
}
