type QuantityDisplayProps = {
  maximumFractionDigits?: number;
  unit?: string;
  value: number | null | undefined;
};

export function QuantityDisplay({
  maximumFractionDigits = 2,
  unit,
  value,
}: QuantityDisplayProps) {
  if (value === null || value === undefined) {
    return <span className="numeric-display numeric-display--muted">-</span>;
  }

  const formatted = new Intl.NumberFormat("id-ID", {
    maximumFractionDigits,
  }).format(value);

  return (
    <span className="numeric-display">
      {formatted}
      {unit ? <span className="numeric-display__unit"> {unit}</span> : null}
    </span>
  );
}
