"use client";

import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import { DEFAULT_ROBOT, type RobotId } from "@/lib/robots";
import { cn } from "@/lib/utils";

const RobotContext = createContext<RobotId>(DEFAULT_ROBOT);

export function RobotProvider({ robot, children }: { robot: RobotId; children: ReactNode }) {
  return <RobotContext value={robot}>{children}</RobotContext>;
}

/** Ugyanazok a járásképkockák, fiókhoz választott színvilággal; a dokumentáció alapértéke B4LÁZ5. */
export default function RobotSprite({
  robot,
  className,
  style,
}: {
  robot?: RobotId;
  className?: string;
  style?: CSSProperties;
}) {
  const selected = useContext(RobotContext);
  return (
    <span
      aria-hidden
      data-robot={robot ?? selected}
      className={cn("pixel-robot-sprite block", className)}
      style={style}
    />
  );
}
