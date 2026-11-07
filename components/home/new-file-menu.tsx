"use client";

import { Menu } from "@base-ui/react/menu";
import Link from "next/link";
import { Code, MapIcon, NewFile } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/i18n-provider";
import { DEFAULT_FILE_NAME } from "@/lib/file-names";
import { ROUTES } from "@/lib/routes";

const ITEM_CLASS =
  "flex items-center gap-3 px-3 py-2 text-sm outline-none data-highlighted:bg-foreground data-highlighted:text-background [&_svg]:size-5";

export default function NewFileMenu() {
  const { t, locale } = useI18n();
  return (
    <Menu.Root>
      <Menu.Trigger render={<Button variant="ghost" />}>
        <NewFile aria-hidden />
        {t.home.newFile}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={8} className="z-50">
          <Menu.Popup
            lang={locale}
            className="app-ui pixel-frame min-w-52 bg-popover p-2 text-popover-foreground outline-none"
            aria-label={t.home.newFile}
          >
            <Menu.LinkItem
              render={<Link href={{ pathname: ROUTES.workbench, query: { code: "", filename: DEFAULT_FILE_NAME } }} />}
              closeOnClick
              className={ITEM_CLASS}
            >
              <Code aria-hidden />
              {t.home.newProgram}
            </Menu.LinkItem>
            <Menu.LinkItem render={<Link href={ROUTES.mapEditor} />} closeOnClick className={ITEM_CLASS}>
              <MapIcon aria-hidden />
              {t.home.newMap}
            </Menu.LinkItem>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
