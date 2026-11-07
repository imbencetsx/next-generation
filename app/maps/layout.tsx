import AppProviders from "@/components/app-providers";

export default function MapsLayout({ children }: LayoutProps<"/maps">) {
  return <AppProviders fallback={<div aria-busy="true" className="app-ui min-h-dvh" />}>{children}</AppProviders>;
}
