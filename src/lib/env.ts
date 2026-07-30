import { z } from "zod";

const environmentSchema = z.object({
  VITE_APP_NAME: z.string().min(1).default("Amanah Sosial-Dakwah"),
});

const parsedEnvironment = environmentSchema.safeParse(import.meta.env);

if (!parsedEnvironment.success) {
  const missingVariables = parsedEnvironment.error.issues
    .map((issue) => issue.path.join("."))
    .join(", ");

  throw new Error(
    `Konfigurasi environment tidak valid: ${missingVariables}. Salin .env.example menjadi .env lalu isi konfigurasi Neon.`,
  );
}

export const env = parsedEnvironment.data;
