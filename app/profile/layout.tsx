import AppProviders from "@/components/app-providers";

export default function ProfileLayout({ children }: LayoutProps<"/profile">) {
  return <AppProviders fallback={<div aria-busy="true" className="app-ui min-h-dvh" />}>{children}</AppProviders>;
}
