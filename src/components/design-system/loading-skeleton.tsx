import { cn } from "@/lib/utils";

type LoadingSkeletonProps = {
  lines?: number;
  variant?: "page" | "table" | "detail";
};

export function LoadingSkeleton({
  lines = 4,
  variant = "page",
}: LoadingSkeletonProps) {
  return (
    <div
      className={cn("loading-skeleton", `loading-skeleton--${variant}`)}
      aria-busy="true"
      aria-label="Memuat data"
      role="status"
    >
      {Array.from({ length: lines }).map((_, index) => (
        <span key={index} className="loading-skeleton__line" />
      ))}
    </div>
  );
}
