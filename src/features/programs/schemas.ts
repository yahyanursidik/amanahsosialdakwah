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
