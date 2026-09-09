import { z } from "zod";

export const targetBeneficiaryTypes = [
  "individual",
  "family",
  "institution",
  "community",
  "disaster_area",
  "mosque",
  "school",
] as const;

export const fundTypes = [
  "zakat",
  "infaq",
  "sedekah",
  "waqf",
  "humanitarian",
  "education",
  "health",
  "general",
] as const;

export const programSupportModes = ["cash", "in_kind", "logistics"] as const;

export const programSupportModeLabels = {
  cash: "Dana",
  in_kind: "Barang langsung",
  logistics: "Logistik & pengiriman",
} as const;

/**
 * Data program historis atau respons yang masih tersimpan di cache dapat belum
 * membawa kolom support_modes. Database mewajibkan kolom ini; fallback hanya
 * menjaga UI tetap dapat dirender saat membaca respons tersebut.
 */
export function resolveProgramSupportModes(
  value: unknown,
): Array<(typeof programSupportModes)[number]> {
  if (!Array.isArray(value)) {
    return ["cash"];
  }

  const modes = value.filter(
    (mode): mode is (typeof programSupportModes)[number] =>
      typeof mode === "string" &&
      programSupportModes.includes(mode as (typeof programSupportModes)[number]),
  );

  return modes.length > 0 ? modes : ["cash"];
}

export function sumProgramSupportBudget(input: {
  cash_budget_amount: number;
  goods_budget_amount: number;
  logistics_budget_amount: number;
}): number {
  return (
    input.cash_budget_amount +
    input.goods_budget_amount +
    input.logistics_budget_amount
  );
}

export const programStatuses = [
  "draft",
  "active",
  "paused",
  "completed",
  "archived",
] as const;

export const programFormSchema = z
  .object({
    code: z
      .string()
      .min(3, "Kode program minimal 3 karakter.")
      .max(50, "Kode program maksimal 50 karakter.")
      .regex(
        /^[A-Za-z0-9_-]+$/,
        "Kode program hanya boleh berisi huruf, angka, strip (-), dan garis bawah (_).",
      ),
    name: z
      .string()
      .min(3, "Nama program minimal 3 karakter.")
      .max(200, "Nama program maksimal 200 karakter."),
    category_id: z.string().min(1, "Kategori program wajib dipilih."),
    description: z
      .string()
      .max(4000, "Deskripsi maksimal 4000 karakter.")
      .optional(),
    objective: z
      .string()
      .max(1000, "Tujuan program maksimal 1000 karakter.")
      .optional(),
    target_beneficiary_type: z.enum(targetBeneficiaryTypes, {
      message: "Tipe penerima manfaat tidak valid.",
    }),
    target_beneficiary_count: z.coerce
      .number({ message: "Jumlah penerima harus berupa angka." })
      .min(0, "Jumlah penerima tidak boleh negatif."),
    support_modes: z
      .array(z.enum(programSupportModes))
      .min(1, "Pilih minimal satu bentuk dukungan program.")
      .refine((modes) => new Set(modes).size === modes.length, {
        message: "Bentuk dukungan tidak boleh dipilih lebih dari sekali.",
      }),
    cash_budget_amount: z.coerce
      .number({ message: "Rencana dana harus berupa angka." })
      .min(0, "Rencana dana tidak boleh negatif."),
    goods_budget_amount: z.coerce
      .number({ message: "Valuasi barang harus berupa angka." })
      .min(0, "Valuasi barang tidak boleh negatif."),
    logistics_budget_amount: z.coerce
      .number({ message: "Biaya logistik harus berupa angka." })
      .min(0, "Biaya logistik tidak boleh negatif."),
    budget_amount: z.coerce
      .number({ message: "Anggaran harus berupa angka." })
      .min(0, "Target anggaran tidak boleh negatif."),
    fund_type: z.enum(fundTypes, {
      message: "Jenis dana tidak valid.",
    }),
    starts_at: z.string().optional(),
    ends_at: z.string().optional(),
    owner_id: z.string().optional(),
  })
  .superRefine((data, context) => {
    const modeBudgetPairs = [
      ["cash", data.cash_budget_amount, "cash_budget_amount"],
      ["in_kind", data.goods_budget_amount, "goods_budget_amount"],
      ["logistics", data.logistics_budget_amount, "logistics_budget_amount"],
    ] as const;

    modeBudgetPairs.forEach(([mode, amount, path]) => {
      if (amount > 0 && !data.support_modes.includes(mode)) {
        context.addIssue({
          code: "custom",
          message: "Tambahkan bentuk dukungan yang sesuai sebelum mengisi nilainya.",
          path: [path],
        });
      }
    });
  })
  .refine(
    (data) => {
      if (data.starts_at && data.ends_at) {
        return new Date(data.ends_at) >= new Date(data.starts_at);
      }
      return true;
    },
    {
      message: "Tanggal selesai harus sama atau setelah tanggal mulai.",
      path: ["ends_at"],
    },
  );

export type ProgramFormValues = z.infer<typeof programFormSchema>;

export const controlledEditFormSchema = z.object({
  reason: z
    .string()
    .min(5, "Alasan penyesuaian minimal 5 karakter untuk keperluan audit.")
    .max(1000, "Alasan penyesuaian maksimal 1000 karakter."),
  description: z
    .string()
    .max(4000, "Deskripsi maksimal 4000 karakter.")
    .optional(),
  objective: z
    .string()
    .max(1000, "Tujuan program maksimal 1000 karakter.")
    .optional(),
  target_beneficiary_count: z.coerce
    .number()
    .min(0, "Jumlah penerima tidak boleh negatif.")
    .optional(),
  ends_at: z.string().optional(),
});

export type ControlledEditFormValues = z.infer<typeof controlledEditFormSchema>;
