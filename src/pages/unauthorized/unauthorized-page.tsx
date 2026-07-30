import { useLogout } from "@refinedev/core";
import { useEffect } from "react";
import { Link, useSearchParams } from "react-router";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";

export function UnauthorizedPage() {
  const [searchParams] = useSearchParams();
  const { mutate: logout, isPending } = useLogout();
  const inactiveMembership =
    searchParams.get("reason") === "inactive-membership";
  const missingPermission = searchParams.get("reason") === "permission";

  useEffect(() => {
    document.title = "Akses dibatasi - Amanah Sosial-Dakwah";
  }, []);

  return (
    <main className="system-page">
      <div className="system-page__inner">
        <span className="system-page__code">403</span>
        <h1>
          {inactiveMembership
            ? "Tidak ada membership organisasi yang aktif."
            : missingPermission
              ? "Permission belum tersedia untuk halaman ini."
              : "Akses untuk halaman ini dibatasi."}
        </h1>
        <p>
          {inactiveMembership
            ? "Sesi Anda valid, tetapi semua membership masih menunggu aktivasi, ditangguhkan, atau telah dicabut. Hubungi admin organisasi."
            : missingPermission
              ? "Akun dan membership organisasi Anda valid, tetapi permission untuk resource ini belum diberikan."
              : "Akun Anda aktif, tetapi belum memiliki kewenangan untuk membuka halaman ini. Hubungi admin lembaga bila akses tersebut diperlukan."}
        </p>
        <div className="system-page__actions">
          {inactiveMembership ? (
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() => logout({})}
            >
              Keluar
            </Button>
          ) : (
            <Link className={buttonVariants()} to="/">
              Kembali ke ruang kerja
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
