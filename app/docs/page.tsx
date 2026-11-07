import { redirect } from "next/navigation";
import { DOC_PAGES } from "@/lib/docs/nav";
import { docPath } from "@/lib/routes";

// A dokumentáció kezdőlapja az első fejezet.
export default function DocsIndex() {
  redirect(docPath(DOC_PAGES[0].slug));
}
