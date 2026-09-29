import { useQuery } from "@tanstack/react-query";
import { Building2, KeyRound, Save, UsersRound } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { CanAccess } from "@/components/access-control/can-access";
import { ErrorState, FormSection, LoadingSkeleton, PageHeader } from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrganization } from "@/features/organizations/organization-context";
import { apiFetch } from "@/lib/neon/http";

type OrganizationProfile = {
  code: string;
  id: string;
  legal_name: string | null;
  name: string;
  stats: { active_members: number; contacts: number; custom_roles: number; programs: number };
  status: string;
  type: string;
  updated_at: string;
};

const typeLabels: Record<string, string> = {
  distribution_partner: "Mitra penyalur",
  grantor: "Pemberi hibah",
  institution: "Lembaga",
  internal: "Internal",
  manager: "Pengelola program",
};

function ProfileForm({ organization, onSaved }: { onSaved: () => void; organization: OrganizationProfile }) {
  const [name, setName] = useState(organization.name);
  const [legalName, setLegalName] = useState(organization.legal_name ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      await apiFetch("/api/v1/admin/organization", {
        body: JSON.stringify({ legal_name: legalName || undefined, name }),
        method: "PUT",
      });
      setMessage("Profil organisasi tersimpan.");
      onSaved();
    } catch (failure) {
      setMessage(failure instanceof Error ? failure.message : "Profil belum tersimpan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormSection
      title="Profil organisasi"
      description="Nama ini tampil di aplikasi, laporan, dan halaman publik program."
      footer={
        <CanAccess action="manage" resource="organizations">
          <div className="settings-footer">
            <span role="status">{message}</span>
            <Button disabled={saving || name.trim().length < 3} onClick={() => void save()}>
              <Save aria-hidden size={16} /> {saving ? "Menyimpan…" : "Simpan profil"}
            </Button>
          </div>
        </CanAccess>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="org-name">Nama tampilan</Label>
          <Input id="org-name" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="org-legal">Nama resmi / badan hukum</Label>
          <Input id="org-legal" placeholder="Mis. Yayasan Ihsanul Adab" value={legalName} onChange={(event) => setLegalName(event.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Kode organisasi</Label>
          <p className="admin-readonly">{organization.code}</p>
        </div>
        <div className="space-y-1">
          <Label>Jenis</Label>
          <p className="admin-readonly">{typeLabels[organization.type] ?? organization.type}</p>
        </div>
      </div>
    </FormSection>
  );
}

export function OrganizationSettingsPage() {
  const { activeOrganization } = useOrganization();
  const organizationId = activeOrganization?.organization.$id ?? "";
  const query = useQuery({
    enabled: Boolean(organizationId),
    queryFn: () => apiFetch<{ data: OrganizationProfile }>("/api/v1/admin/organization"),
    queryKey: ["admin", "organization", organizationId],
  });
  const organization = query.data?.data;

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow="Tata kelola"
        title="Organisasi"
        description="Profil lembaga, anggota tim, dan hak akses. Semua perubahan tercatat di jejak audit."
      />
      {query.isLoading ? <LoadingSkeleton lines={6} /> : null}
      {query.isError ? <ErrorState title="Profil organisasi belum dapat dimuat" onRetry={() => query.refetch()} /> : null}
      {organization ? (
        <>
          <div className="report-metric-grid">
            <article className="report-metric"><UsersRound aria-hidden size={18} /><span>Anggota aktif</span><strong>{organization.stats.active_members}</strong></article>
            <article className="report-metric"><Building2 aria-hidden size={18} /><span>Program</span><strong>{organization.stats.programs}</strong></article>
            <article className="report-metric"><UsersRound aria-hidden size={18} /><span>Kontak</span><strong>{organization.stats.contacts}</strong></article>
            <article className="report-metric"><KeyRound aria-hidden size={18} /><span>Peran khusus</span><strong>{organization.stats.custom_roles}</strong></article>
          </div>
          <ProfileForm key={organization.updated_at} organization={organization} onSaved={() => void query.refetch()} />
          <div className="admin-links">
            <Link className={buttonVariants({ variant: "outline" })} to="/memberships">
              <UsersRound aria-hidden size={16} /> Kelola anggota & peran
            </Link>
            <Link className={buttonVariants({ variant: "outline" })} to="/roles">
              <KeyRound aria-hidden size={16} /> Hak akses per peran
            </Link>
          </div>
        </>
      ) : null}
    </section>
  );
}
