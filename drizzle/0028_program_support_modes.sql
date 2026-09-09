-- Memisahkan klasifikasi amanah dari bentuk dukungan yang direncanakan.
-- Nilai barang adalah valuasi rencana; stok aktual tetap berasal dari Inventory/Aid Packages.

ALTER TABLE public.programs
  ADD COLUMN support_modes text[] NOT NULL DEFAULT ARRAY['cash']::text[],
  ADD COLUMN cash_budget_amount numeric(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN goods_budget_amount numeric(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN logistics_budget_amount numeric(18, 2) NOT NULL DEFAULT 0;
--> statement-breakpoint

-- Program lama sebelumnya hanya mengenal satu target anggaran berbentuk dana.
UPDATE public.programs
SET cash_budget_amount = budget_amount
WHERE cash_budget_amount = 0
  AND goods_budget_amount = 0
  AND logistics_budget_amount = 0;
--> statement-breakpoint

ALTER TABLE public.programs
  ADD CONSTRAINT programs_support_modes_check CHECK (
    cardinality(support_modes) BETWEEN 1 AND 3
    AND support_modes <@ ARRAY['cash', 'in_kind', 'logistics']::text[]
  ),
  ADD CONSTRAINT programs_support_budget_nonnegative_check CHECK (
    cash_budget_amount >= 0
    AND goods_budget_amount >= 0
    AND logistics_budget_amount >= 0
  ),
  ADD CONSTRAINT programs_support_budget_mode_check CHECK (
    (cash_budget_amount = 0 OR 'cash' = ANY(support_modes))
    AND (goods_budget_amount = 0 OR 'in_kind' = ANY(support_modes))
    AND (logistics_budget_amount = 0 OR 'logistics' = ANY(support_modes))
  ),
  ADD CONSTRAINT programs_budget_amount_composition_check CHECK (
    budget_amount = cash_budget_amount + goods_budget_amount + logistics_budget_amount
  );
