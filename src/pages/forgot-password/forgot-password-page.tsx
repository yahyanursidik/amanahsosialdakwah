import { zodResolver } from "@hookform/resolvers/zod";
import { useForgotPassword } from "@refinedev/core";
import { LoaderCircle } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ForgotPasswordVariables } from "@/providers/auth-provider";

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Alamat email wajib diisi.")
    .email("Gunakan alamat email yang valid."),
});

export function ForgotPasswordPage() {
  const {
    mutate: forgotPassword,
    data,
    error,
    isPending,
  } = useForgotPassword<ForgotPasswordVariables>();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordVariables>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
    mode: "onBlur",
  });

  useEffect(() => {
    document.title = "Pulihkan kata sandi · Amanah Sosial-Dakwah";
  }, []);

  return (
    <main className="auth-shell auth-shell--single">
      <section className="auth-panel" aria-labelledby="forgot-password-title">
        <div className="auth-panel__inner">
          <span className="auth-brand">
            <span className="auth-brand__mark" aria-hidden="true">
              AS
            </span>
            <span>Amanah Sosial-Dakwah</span>
          </span>

          <div className="auth-heading">
            <h1 id="forgot-password-title">Pulihkan kata sandi</h1>
            <p>
              Masukkan email akun. Jika akun ditemukan, Neon Auth akan
              mengirimkan tautan pemulihan.
            </p>
          </div>

          {data?.success ? (
            <div className="auth-success" role="status">
              Periksa kotak masuk dan folder spam Anda. Pesan yang sama
              ditampilkan untuk setiap alamat demi menjaga privasi akun.
            </div>
          ) : (
            <form
              className="auth-form"
              onSubmit={handleSubmit((values) => forgotPassword(values))}
              noValidate
            >
              {error ? (
                <p className="auth-error" role="alert">
                  {error.message}
                </p>
              ) : null}

              <div className="auth-field">
                <Label htmlFor="recovery-email">Alamat email</Label>
                <Input
                  id="recovery-email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby="recovery-email-message"
                  disabled={isPending}
                  {...register("email")}
                />
                <p
                  id="recovery-email-message"
                  className="auth-field__message"
                  data-tone={errors.email ? "error" : "neutral"}
                >
                  {errors.email?.message ?? " "}
                </p>
              </div>

              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" aria-hidden />
                    Mengirim…
                  </>
                ) : (
                  "Kirim tautan pemulihan"
                )}
              </Button>
            </form>
          )}

          <Link className="auth-link" to="/login">
            Kembali ke halaman masuk
          </Link>
        </div>
      </section>
    </main>
  );
}
