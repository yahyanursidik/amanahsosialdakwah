import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

type ErrorStateProps = {
  description?: React.ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  title?: string;
};

export function ErrorState({
  description = "Permintaan belum dapat diproses. Coba beberapa saat lagi.",
  onRetry,
  retryLabel = "Coba lagi",
  title = "Data belum dapat dimuat",
}: ErrorStateProps) {
  return (
    <div className="error-state" role="alert">
      <AlertTriangle aria-hidden="true" size={28} />
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
