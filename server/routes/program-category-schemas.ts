import { z } from "zod";

export const programCategorySchema = z.object({
  code: z
    .string()
    .trim()
    .max(30)
    .regex(/^[A-Za-z0-9_-]*$/, "Kode hanya boleh huruf, angka, strip, dan garis bawah.")
    .optional()
    .transform((value) => (value ? value : undefined)),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => (value ? value : undefined)),
  name: z.string().trim().min(3, "Nama kategori minimal 3 karakter.").max(120),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const programCategoryParamsSchema = z.object({ id: z.string().uuid() });

export type ProgramCategoryInput = z.infer<typeof programCategorySchema>;
