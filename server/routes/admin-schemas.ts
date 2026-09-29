import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

export const adminIdParamsSchema = z.object({ id: z.string().uuid() });

export const organizationProfileSchema = z.object({
  legal_name: optionalText(250),
  name: z.string().trim().min(3, "Nama organisasi minimal 3 karakter.").max(200),
});

export const addMemberSchema = z.object({
  email: z.string().trim().email("Email tidak valid.").max(200),
  role_ids: z.array(z.string().uuid()).min(1, "Pilih minimal satu peran.").max(10),
});

export const updateMemberSchema = z.object({
  role_ids: z.array(z.string().uuid()).min(1, "Anggota harus memiliki minimal satu peran.").max(10),
  status: z.enum(["active", "inactive", "suspended"]),
});

export const roleSchema = z.object({
  description: optionalText(500),
  name: z.string().trim().min(3, "Nama peran minimal 3 karakter.").max(80),
  permission_keys: z.array(z.string().trim().min(3).max(120)).min(1, "Pilih minimal satu hak akses.").max(400),
});

export type OrganizationProfileInput = z.infer<typeof organizationProfileSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type RoleInput = z.infer<typeof roleSchema>;
