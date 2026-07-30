import { zodResolver } from "@hookform/resolvers/zod";
import { useUpdatePassword } from "@refinedev/core";
import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UpdatePasswordVariables } from "@/providers/auth-provider";

const passwordSchema = z
  .object({
    oldPassword: z.string().optional(),
    password: z.string().min(8, "Gunakan minimal 8 karakter."),
    passwordConfirmation: z.string(),
  })
  .refine((value) => value.password === value.passwordConfirmation, {
    message: "Konfirmasi kata sandi tidak cocok.",
    path: ["passwordConfirmation"],
  });

type PasswordForm = z.infer<typeof passwordSchema>;

type UpdatePasswordPageProps = {
  mode: "recovery" | "session";
};

export function UpdatePasswordPage({ mode }: UpdatePasswordPageProps) {
  const [recovery] = useState(() => {
    const query = new URLSearchParams(window.location.search);
    return {
      secret: query.get("secret"),
      token: query.get("token"),
      userId: query.get("userId"),
    };
  });
  const {
    mutate: updatePassword,
    error,
    isPending,
  } = useUpdatePassword<UpdatePasswordVariables>();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordForm>({
    resolver: zodResolver(
      mode === "session"
        ? passwordSchema.refine((value) => Boolean(value.oldPassword), {
            message: "Kata sandi saat ini wajib diisi.",
            path: ["oldPassword"],
          })
        : passwordSchema,
    ),
    defaultValues: {
      oldPassword: "",
      password: "",
      passwordConfirmation: "",
    },
    mode: "onBlur",
  });
  const recoveryLinkIsValid =
    mode === "session" || Boolean(recovery.token ?? recovery.secret);

  useEffect(() => {
    document.title = "Perbarui kata sandi · Amanah Sosial-Dakwah";

    if (mode === "recovery" && (recovery.token || recovery.secret)) {
      window.history.replaceState({}, "", "/update-password");
    }
  }, [mode, recovery.secret, recovery.token]);

  const submit = handleSubmit((values) => {
    updatePassword({
      password: values.password,
      ...(mode === "session" && values.oldPassword
        ? { oldPassword: values.oldPassword }
        : {}),
      ...(recovery.secret ? { secret: recovery.secret } : {}),
      ...(recovery.token ? { token: recovery.token } : {}),
      ...(recovery.userId ? { userId: recovery.userId } : {}),
    });
  });

  return (
    <main className="auth-shell auth-shell--single">
      <section className="auth-panel" aria-labelledby="update-password-title">
        <div className="auth-panel__inner">
          <span className="auth-brand">
            <span className="auth-brand__mark" aria-hidden="true">
              AS
            </span>
            <span>Amanah Sosial-Dakwah</span>
          </span>

          <div className="auth-heading">
            <h1 id="update-password-title">Perbarui kata sandi</h1>
            <p>
              {mode === "recovery"
                ? "Tetapkan kata sandi baru untuk menyelesaikan pemulihan akun."
                : "Konfirmasikan kata sandi saat ini sebelum membuat yang baru."}
            </p>
          </div>

          {!recoveryLinkIsValid ? (
            <div className="auth-error" role="alert">
              Tautan pemulihan tidak lengkap. Minta tautan baru dari halaman
              pemulihan kata sandi.
            </div>
          ) : (
            <form className="auth-form" onSubmit={submit} noValidate>
              {error ? (
                <p className="auth-error" role="alert">
                  {error.message}
                </p>
              ) : null}

              {mode === "session" ? (
                <div className="auth-field">
                  <Label htmlFor="old-password">Kata sandi saat ini</Label>
                  <Input
                    id="old-password"
                    type="password"
                    autoComplete="current-password"
                    disabled={isPending}
                    aria-invalid={Boolean(errors.oldPassword)}
                    {...register("oldPassword")}
                  />
                  <p
                    className="auth-field__message"
                    data-tone={errors.oldPassword ? "error" : "neutral"}
                  >
                    {errors.oldPassword?.message ?? " "}
                  </p>
                </div>
              ) : null}

              <div className="auth-field">
                <Label htmlFor="new-password">Kata sandi baru</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  disabled={isPending}
                  aria-invalid={Boolean(errors.password)}
                  {...register("password")}
                />
                <p
                  className="auth-field__message"
                  data-tone={errors.password ? "error" : "neutral"}
                >
                  {errors.password?.message ?? "Minimal 8 karakter."}
                </p>
              </div>

              <div className="auth-field">
                <Label htmlFor="password-confirmation">
                  Ulangi kata sandi baru
                </Label>
                <Input
                  id="password-confirmation"
                  type="password"
                  autoComplete="new-password"
                  disabled={isPending}
                  aria-invalid={Boolean(errors.passwordConfirmation)}
                  {...register("passwordConfirmation")}
                />
                <p
                  className="auth-field__message"
                  data-tone={errors.passwordConfirmation ? "error" : "neutral"}
                >
                  {errors.passwordConfirmation?.message ?? " "}
                </p>
              </div>

              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" aria-hidden />
                    Menyimpan…
                  </>
                ) : (
                  "Simpan kata sandi baru"
                )}
              </Button>
            </form>
          )}

          {mode === "recovery" ? (
            <Link className="auth-link" to="/forgot-password">
              Minta tautan pemulihan baru
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}
