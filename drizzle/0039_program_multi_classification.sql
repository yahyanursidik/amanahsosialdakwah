-- Program dapat memiliki beberapa klasifikasi amanah (mis. zakat + sedekah)
-- dan beberapa tipe penerima (mis. keluarga + lembaga). Kolom tunggal lama
-- tetap dipertahankan sebagai klasifikasi/tipe utama agar laporan dan
-- integrasi yang sudah ada tidak berubah.

ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS fund_types text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS target_beneficiary_types text[] NOT NULL DEFAULT '{}'::text[];
--> statement-breakpoint

UPDATE public.programs
SET fund_types = ARRAY[fund_type]
WHERE cardinality(fund_types) = 0;

UPDATE public.programs
SET target_beneficiary_types = ARRAY[target_beneficiary_type]
WHERE cardinality(target_beneficiary_types) = 0;
--> statement-breakpoint

-- Kolom utama selalu termasuk dalam daftar: klien lama yang hanya mengirim
-- kolom tunggal tetap valid karena nilainya ditambahkan ke daftar.
CREATE OR REPLACE FUNCTION private.sync_program_classification()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.fund_types IS NULL OR cardinality(NEW.fund_types) = 0 THEN
    NEW.fund_types := ARRAY[NEW.fund_type];
  ELSIF NOT (NEW.fund_type = ANY (NEW.fund_types)) THEN
    NEW.fund_types := array_prepend(NEW.fund_type, NEW.fund_types);
  END IF;
  IF NEW.target_beneficiary_types IS NULL OR cardinality(NEW.target_beneficiary_types) = 0 THEN
    NEW.target_beneficiary_types := ARRAY[NEW.target_beneficiary_type];
  ELSIF NOT (NEW.target_beneficiary_type = ANY (NEW.target_beneficiary_types)) THEN
    NEW.target_beneficiary_types := array_prepend(NEW.target_beneficiary_type, NEW.target_beneficiary_types);
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_programs_sync_classification ON public.programs;
CREATE TRIGGER trg_programs_sync_classification
  BEFORE INSERT OR UPDATE OF fund_type, fund_types, target_beneficiary_type, target_beneficiary_types
  ON public.programs
  FOR EACH ROW EXECUTE FUNCTION private.sync_program_classification();
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'programs_fund_types_check') THEN
    ALTER TABLE public.programs ADD CONSTRAINT programs_fund_types_check CHECK (
      cardinality(fund_types) BETWEEN 1 AND 8
      AND fund_types <@ ARRAY['zakat','infaq','sedekah','waqf','humanitarian','education','health','general']::text[]
      AND fund_type = ANY (fund_types)
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'programs_target_types_check') THEN
    ALTER TABLE public.programs ADD CONSTRAINT programs_target_types_check CHECK (
      cardinality(target_beneficiary_types) BETWEEN 1 AND 7
      AND target_beneficiary_types <@ ARRAY['individual','family','institution','community','disaster_area','mosque','school']::text[]
      AND target_beneficiary_type = ANY (target_beneficiary_types)
    );
  END IF;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_programs_fund_types ON public.programs USING gin (fund_types);
