import AppProviders from "@/components/app-providers";

export default function MapEditorLayout({ children }: LayoutProps<"/map-editor">) {
  return <AppProviders fallback={<div aria-busy="true" className="app-ui h-dvh" />}>{children}</AppProviders>;
}
