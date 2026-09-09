import { ExternalLink, Globe2, LockKeyhole } from "lucide-react";
import { Link } from "react-router";

import { DetailSection } from "@/components/design-system";

export function ProgramPublicLinkPanel({
  programId,
  programStatus,
}: {
  programId: string;
  programStatus: string;
}) {
  const isPublic = programStatus === "active";

  return (
    <DetailSection
      title="Halaman publik otomatis"
      description="Dibentuk langsung dari data aman Program aktif. Tidak ada pengaturan, draft, atau proses publish manual."
    >
      <div className="border-primary/25 bg-primary/5 mt-4 rounded-lg border p-4 text-sm">
        {isPublic ? (
          <>
            <div className="flex items-start gap-2">
              <Globe2 aria-hidden="true" className="text-primary mt-0.5 h-4 w-4" />
              <p>
                Tautan publik aktif. Data penerima individual, pengajuan,
                asesmen, approval, PIC mitra, dan audit tetap bersifat privat.
              </p>
            </div>
            <Link
              className="text-primary mt-3 inline-flex items-center gap-1 font-semibold hover:underline"
              target="_blank"
              to={`/p/${programId}`}
            >
              <ExternalLink className="h-4 w-4" />
              Buka halaman publik
            </Link>
          </>
        ) : (
          <div className="flex items-start gap-2">
            <LockKeyhole aria-hidden="true" className="text-muted-foreground mt-0.5 h-4 w-4" />
            <p>Halaman publik akan tersedia otomatis setelah Program berstatus aktif.</p>
          </div>
        )}
      </div>
    </DetailSection>
  );
}
