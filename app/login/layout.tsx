import AppProviders from "@/components/app-providers";

export default function LoginLayout({ children }: LayoutProps<"/login">) {
  return <AppProviders fallback={<main className="app-ui min-h-dvh" />}>{children}</AppProviders>;
}
