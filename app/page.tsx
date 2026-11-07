import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

// A kezdőlap a munkafelületre (szerkesztő + szimulátor) irányít. Az bejelentkezéshez kötött (proxy.ts),
// így kijelentkezve onnan a bejelentkező oldalra jutunk.
export default function Home() {
  redirect(ROUTES.workbench);
}
