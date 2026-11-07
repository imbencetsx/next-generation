import AppProviders from "@/components/app-providers";

export default function WorkbenchLayout({ children }: LayoutProps<"/workbench">) {
  return <AppProviders fallback={<div aria-busy="true" className="app-ui h-dvh" />}>{children}</AppProviders>;
}
