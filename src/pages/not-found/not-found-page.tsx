import { useEffect } from "react";
import { Link } from "react-router";

import { buttonVariants } from "@/components/ui/button-variants";

export function NotFoundPage() {
  useEffect(() => {
    document.title = "Halaman tidak ditemukan · Amanah Sosial-Dakwah";
  }, []);

  return (
    <main className="system-page">
      <div className="system-page__inner">
        <span className="system-page__code">404</span>
        <h1>Halaman yang dicari tidak ditemukan.</h1>
        <p>
          Alamat mungkin berubah atau tidak tersedia. Periksa kembali alamat
          halaman, atau kembali ke ruang kerja.
        </p>
        <div className="system-page__actions">
          <Link className={buttonVariants()} to="/">
            Kembali ke ruang kerja
          </Link>
        </div>
      </div>
    </main>
  );
}
