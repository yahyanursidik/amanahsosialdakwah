import { zodResolver } from "@hookform/resolvers/zod";
import { useLogin } from "@refinedev/core";
import { LoaderCircle } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LoginCredentials } from "@/providers/auth-provider";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Alamat email wajib diisi.")
    .email("Gunakan alamat email yang valid."),
  password: z.string().min(1, "Kata sandi wajib diisi."),
});

export function LoginPage() {
  const {
    mutate: login,
    error: loginError,
    isPending,
  } = useLogin<LoginCredentials>();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  useEffect(() => {
    document.title = "Masuk · Amanah Sosial-Dakwah";
  }, []);

  const submitLogin = handleSubmit((credentials) => {
    login(credentials);
  });

  return (
    <main className="auth-shell">
      <section className="auth-context" aria-label="Prinsip sistem">
        <span className="auth-brand">
          <span className="auth-brand__mark" aria-hidden="true">
            AS
          </span>
          <span>Amanah Sosial-Dakwah</span>
        </span>

        <h1 className="auth-context__statement">
          Amanah tercatat. Proses dapat ditelusuri.
        </h1>

        <p className="auth-context__note">
          Ruang kerja untuk tim yang menerima, mengelola, menyalurkan, dan
          mempertanggungjawabkan amanah.
        </p>
      </section>

      <section className="auth-panel" aria-labelledby="login-title">
        <div className="auth-panel__inner">
          <span className="auth-brand lg:hidden">
            <span className="auth-brand__mark" aria-hidden="true">
              AS
            </span>
            <span>Amanah Sosial-Dakwah</span>
          </span>

          <div className="auth-heading">
            <h1 id="login-title">Masuk ke ruang kerja</h1>
            <p>Gunakan akun yang telah diundang oleh lembaga Anda.</p>
          </div>

          <form className="auth-form" onSubmit={submitLogin} noValidate>
            {loginError ? (
              <p className="auth-error" role="alert">
                {loginError.message}
              </p>
            ) : null}

            <div className="auth-field">
              <Label htmlFor="email">Alamat email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                aria-invalid={Boolean(errors.email)}
                aria-describedby="email-message"
                disabled={isPending}
                {...register("email")}
              />
              <p
                id="email-message"
                className="auth-field__message"
                data-tone={errors.email ? "error" : "neutral"}
              >
                {errors.email?.message ?? " "}
              </p>
            </div>

            <div className="auth-field">
              <Label htmlFor="password">Kata sandi</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby="password-message"
                disabled={isPending}
                {...register("password")}
              />
              <p
                id="password-message"
                className="auth-field__message"
                data-tone={errors.password ? "error" : "neutral"}
              >
                {errors.password?.message ?? " "}
              </p>
            </div>

            <Link className="auth-link auth-link--inline" to="/forgot-password">
              Lupa kata sandi?
            </Link>

            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" aria-hidden />
                  Memeriksa akun…
                </>
              ) : (
                "Masuk"
              )}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
