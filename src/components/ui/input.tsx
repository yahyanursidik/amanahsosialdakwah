import * as React from "react";

import { cn } from "@/lib/utils";

export function Input({
  className,
  type,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "border-input bg-background text-foreground placeholder:text-muted-foreground hover:bg-secondary focus-visible:border-foreground focus-visible:outline-ring aria-invalid:border-destructive aria-invalid:outline-destructive flex min-h-11 w-full rounded-md border px-3 py-2 text-base outline-2 outline-offset-1 outline-transparent transition-[background-color,color] duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-55 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}
