"use client";

import { useId } from "react";
import { Check } from "@/components/icons";
import RobotSprite from "@/components/robot-sprite";
import { robotSpriteStyle } from "@/components/sprites";
import { useI18n } from "@/i18n/i18n-provider";
import { ROBOT_IDS, type RobotId } from "@/lib/robots";

export default function RobotPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: RobotId;
  onChange: (robot: RobotId) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const name = useId();
  return (
    <fieldset disabled={disabled} aria-describedby={`${name}-description`}>
      <legend className="sr-only">{t.profile.robot}</legend>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {ROBOT_IDS.map((robot) => (
          <label key={robot} className="robot-choice pixel-frame" data-tone={value === robot ? "light" : undefined}>
            <input
              type="radio"
              name={name}
              value={robot}
              checked={value === robot}
              disabled={disabled}
              onChange={() => onChange(robot)}
              className="sr-only"
              aria-label={t.robots.names[robot]}
            />
            <span className="robot-choice-stage" aria-hidden>
              <RobotSprite robot={robot} className="size-16" style={robotSpriteStyle(2)} />
            </span>
            <span className="flex items-center justify-center gap-1 text-sm sm:text-base">
              <Check aria-hidden size={12} className={value === robot ? "shrink-0" : "invisible shrink-0"} />
              {t.robots.names[robot]}
            </span>
          </label>
        ))}
      </div>
      <p id={`${name}-description`} className="mt-3 min-h-5 text-center font-read text-sm text-muted-foreground">
        {t.robots.descriptions[value]}
      </p>
    </fieldset>
  );
}
