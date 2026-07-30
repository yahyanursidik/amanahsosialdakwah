import { zodResolver } from "@hookform/resolvers/zod";
import { useLogin } from "@refinedev/core";
import { Eye, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { z } from "zod";

import { BrandLogo } from "@/components/brand/brand-logo";
import { TrustFlowIllustration } from "@/components/brand/trust-flow-illustration";
import { AppFooter } from "@/components/layout/app-footer";
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
  const [showPassword, setShowPassword] = useState(false);
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
    document.title = "Masuk · Amanah Platform";
  }, []);

  const submitLogin = handleSubmit((credentials) => {
    login(credentials);
  });

  return (
    <main className="auth-shell">
      <section className="auth-context" aria-label="Perjalanan amanah">
        <BrandLogo className="auth-context__logo" priority variant="white" />
        <div className="auth-context__copy auth-reveal">
          <h1 className="auth-context__statement">
            Setiap amanah punya perjalanan yang jelas.
          </h1>
          <p>
            Terima, kelola, salurkan, dan pertanggungjawabkan dalam satu ruang
            kerja yang dapat ditelusuri.
          </p>
        </div>
        <TrustFlowIllustration />
        <p className="auth-context__note">
          Akses dibatasi berdasarkan organisasi, membership, dan permission.
        </p>
      </section>

      <section className="auth-panel" aria-labelledby="login-title">
        <div className="auth-panel__inner auth-reveal">
          <BrandLogo className="auth-panel__logo" priority />

          <div className="auth-heading">
            <h1 id="login-title">Masuk ke ruang kerja</h1>
            <p>Gunakan akun yang telah terhubung dengan organisasi Anda.</p>
          </div>

          <form
            aria-busy={isPending}
            className="auth-form"
            onSubmit={submitLogin}
            noValidate
          >
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
              <div className="auth-field__label-row">
                <Label htmlFor="password">Kata sandi</Label>
                <Link
                  className="auth-link auth-link--inline"
                  to="/forgot-password"
                >
                  Lupa kata sandi?
                </Link>
              </div>
              <div className="auth-password">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby="password-message"
                  disabled={isPending}
                  {...register("password")}
                />
                <button
                  aria-label={
                    showPassword
                      ? "Sembunyikan kata sandi"
                      : "Tampilkan kata sandi"
                  }
                  className="auth-password__toggle"
                  disabled={isPending}
                  onClick={() => setShowPassword((visible) => !visible)}
                  type="button"
                >
                  {showPassword ? (
                    <EyeOff aria-hidden className="size-4" />
                  ) : (
                    <Eye aria-hidden className="size-4" />
                  )}
                </button>
              </div>
              <p
                id="password-message"
                className="auth-field__message"
                data-tone={errors.password ? "error" : "neutral"}
              >
                {errors.password?.message ?? " "}
              </p>
            </div>

            <Button className="auth-submit" type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" aria-hidden />
                  Memeriksa akun…
                </>
              ) : (
                <>
                  <LockKeyhole aria-hidden className="size-4" />
                  Masuk dengan aman
                </>
              )}
            </Button>
          </form>
          <AppFooter compact />
        </div>
      </section>
    </main>
  );
}
