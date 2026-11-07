"use client";

import { useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MAX_USERNAME_LENGTH } from "@/convex/credentials";

// A @ a mező része, de nem kerül a fiók nevébe; bemásolt teljes nevet is elfogadunk.
export default function UsernameInput({
  value,
  defaultValue,
  onChange,
  className,
  ...props
}: Omit<ComponentProps<typeof Input>, "type" | "maxLength">) {
  const [local, setLocal] = useState(String(defaultValue ?? ""));
  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center font-read text-muted-foreground"
      >
        @
      </span>
      <Input
        {...props}
        type="text"
        value={value ?? local}
        // Egy karakterrel több fér el, hogy egy bemásolt „@név” se vágódjon le a @ levétele előtt.
        maxLength={MAX_USERNAME_LENGTH + 1}
        className={cn("pl-8", className)}
        onChange={(event) => {
          const username = event.currentTarget.value.replace(/^@+/, "").slice(0, MAX_USERNAME_LENGTH);
          event.currentTarget.value = username;
          if (value === undefined) setLocal(username);
          onChange?.(event);
        }}
      />
    </div>
  );
}
