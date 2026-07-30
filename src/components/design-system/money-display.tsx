type MoneyDisplayProps = {
  amount: number | string | null | undefined;
  currency?: string;
  locale?: string;
  mutedZero?: boolean;
};

export function MoneyDisplay({
  amount,
  currency = "IDR",
  locale = "id-ID",
  mutedZero = true,
}: MoneyDisplayProps) {
  if (amount === null || amount === undefined) {
    return <span className="numeric-display numeric-display--muted">-</span>;
  }

  const numericAmount = typeof amount === "string" ? Number(amount) : amount;
  const formatted = new Intl.NumberFormat(locale, {
    currency,
    maximumFractionDigits: currency === "IDR" ? 0 : 2,
    style: "currency",
  }).format(numericAmount);

  return (
    <span
      className="numeric-display"
      data-muted={mutedZero && numericAmount === 0 ? "true" : undefined}
    >
      {formatted}
    </span>
  );
}
