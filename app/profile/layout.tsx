import type { ReactNode } from "react";
import AuthProviders from "@/components/auth/auth-providers";

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return <AuthProviders fallback={<div aria-busy="true" className="app-ui min-h-dvh" />}>{children}</AuthProviders>;
}
