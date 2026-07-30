import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "focus-visible:outline-ring aria-invalid:border-destructive inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md border text-sm font-semibold whitespace-nowrap outline-2 outline-offset-2 outline-transparent transition-[background-color,color,transform] duration-150 ease-out disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border-primary bg-primary text-primary-foreground hover:bg-[var(--color-accent-hover)] active:translate-y-px",
        outline:
          "border-border bg-background text-foreground hover:bg-secondary active:translate-y-px",
        ghost:
          "text-foreground hover:bg-secondary border-transparent bg-transparent active:translate-y-px",
      },
      size: {
        default: "px-4",
        sm: "min-h-9 px-3",
        lg: "min-h-12 px-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
