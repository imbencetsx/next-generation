"use client";

// A választó csak a kezdőlapon nyílik meg, a fiók, a térképek és a megjelenítés betöltése után.
import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import RobotOnboarding from "@/components/profile/robot-onboarding";
import { TILES } from "@/components/sprites";
import { api } from "@/convex/_generated/api";

const HOME_SPRITES = [...Object.values(TILES), "robot_sheet", "gold_sparkle_chips"];

export default function HomeOnboarding({ ready }: { ready: boolean }) {
  const viewer = useQuery(api.users.viewer);
  return ready && viewer?.robotSetupPending ? <AfterHomeLoaded key={viewer._id} /> : null;
}

function AfterHomeLoaded() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let firstFrame = 0;
    let secondFrame = 0;

    async function prepare() {
      const sprites = HOME_SPRITES.map((name) => {
        const image = new Image();
        image.src = `/sprites/${name}.png`;
        return image.decode();
      });
      // Kliensoldali navigációnál a window.load már megtörténhetett; a kezdőlap új képeit is megvárjuk.
      await Promise.allSettled([
        document.fonts?.ready,
        ...sprites,
        ...Array.from(document.querySelectorAll<HTMLImageElement>("img"), (image) => image.decode()),
      ]);
      if (cancelled) return;
      // A kezdőlap legalább egy képkockán át látszódjon, mielőtt a portál elsötétíti.
      firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => {
          if (!cancelled) setReady(true);
        });
      });
    }

    if (document.readyState === "complete") void prepare();
    else window.addEventListener("load", prepare, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", prepare);
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, []);

  return ready ? <RobotOnboarding /> : null;
}
