import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
  variant?: "color" | "symbol" | "white";
};

const logoSources = {
  color: "/brand/amanah-logo-horizontal-color.svg",
  symbol: "/brand/amanah-symbol-color.svg",
  white: "/brand/amanah-logo-horizontal-white.svg",
} as const;

export function BrandLogo({
  className,
  priority = false,
  variant = "color",
}: BrandLogoProps) {
  const isSymbol = variant === "symbol";

  return (
    <img
      alt="Amanah Platform"
      className={cn("brand-logo", className)}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      height={isSymbol ? 108 : 108}
      src={logoSources[variant]}
      width={isSymbol ? 120 : 400}
    />
  );
}
