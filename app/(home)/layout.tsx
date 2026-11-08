import AppProviders from "@/components/app-providers";

// A kezdőlap is bejelentkezéshez kötött (PDF 3.1), ezért ugyanazok a szolgáltatók veszik körül, mint a többi
// alkalmazásoldalt. Útvonalcsoportban van, hogy a gyökér-layout (és vele a dokumentáció) statikus maradjon.
export default function HomeLayout({ children }: LayoutProps<"/">) {
  return <AppProviders fallback={<div aria-busy="true" className="app-ui min-h-dvh" />}>{children}</AppProviders>;
}
