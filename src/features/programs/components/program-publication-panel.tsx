import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ExternalLink, Globe2, Send } from "lucide-react";
import { Link } from "react-router";

import { CanAccess } from "@/components/access-control/can-access";
import { DetailSection } from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/neon/http";

type Publication = {
  impact_headline: string | null;
  public_slug: string;
  public_summary: string;
  public_title: string;
  report_narrative: string;
  report_period_end: string | null;
  report_period_start: string | null;
  report_title: string;
  reported_beneficiary_count: number;
  reported_cash_amount: string | number | null;
  reported_goods_value: string | number | null;
  reported_logistics_amount: string | number | null;
  status: "draft" | "published" | "superseded" | "revoked";
  version_number: number;
};

type Envelope<T> = { data: T };
type PublicationForm = Omit<Publication, "status" | "version_number">;

function defaultForm(slug: string): PublicationForm {
  return { impact_headline: "", public_slug: slug, public_summary: "", public_title: "", report_narrative: "", report_period_end: "", report_period_start: "", report_title: "", reported_beneficiary_count: 0, reported_cash_amount: null, reported_goods_value: null, reported_logistics_amount: null };
}

export function ProgramPublicationPanel({ initialSlug, programId }: { initialSlug: string; programId: string }) {
  const publication = useQuery({ queryKey: ["program-publication", programId], queryFn: () => apiFetch<Envelope<Publication | null>>(`/api/v1/programs/${programId}/publication`) });
  const [form, setForm] = useState<PublicationForm>(() => defaultForm(initialSlug));

  useEffect(() => {
    if (publication.data?.data) {
      const item = publication.data.data;
      setForm({ ...item, impact_headline: item.impact_headline ?? "", report_period_end: item.report_period_end ?? "", report_period_start: item.report_period_start ?? "" });
    }
  }, [publication.data]);

  const save = useMutation({
    mutationFn: () => apiFetch<Envelope<Publication>>(`/api/v1/programs/${programId}/publication/draft`, { body: JSON.stringify(form), method: "PUT" }),
    onSuccess: () => void publication.refetch(),
  });
  const publish = useMutation({
    mutationFn: () => apiFetch<Envelope<Publication>>(`/api/v1/programs/${programId}/publication/publish`, { method: "POST" }),
    onSuccess: () => void publication.refetch(),
  });
  const update = <K extends keyof PublicationForm>(key: K, value: PublicationForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const current = publication.data?.data;
  const mutationError = save.error ?? publish.error;

  return (
    <DetailSection title="Landing page & laporan publik" description="Hanya snapshot yang diterbitkan tersedia tanpa login. Identitas penerima dan data internal tidak ikut dipublikasikan.">
      {current?.status === "published" ? <div className="border-primary/25 bg-primary/5 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm"><span><Globe2 aria-hidden="true" className="mr-2 inline h-4 w-4" />Versi {current.version_number} sedang publik.</span><Link className="text-primary inline-flex items-center gap-1 font-semibold hover:underline" target="_blank" to={`/p/${current.public_slug}`}><ExternalLink className="h-4 w-4" />Lihat halaman</Link></div> : <p className="text-muted-foreground mt-4 text-sm">Belum ada laporan publik yang diterbitkan.</p>}
      <CanAccess action="manage" resource="programs">
        <details className="border-border mt-4 rounded-lg border p-4">
          <summary className="cursor-pointer font-semibold">Siapkan publikasi program</summary>
          <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
            <div className="space-y-1"><Label htmlFor="publication_slug">Slug URL</Label><Input id="publication_slug" value={form.public_slug} onChange={(event) => update("public_slug", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} /><p className="text-muted-foreground text-xs">/p/{form.public_slug || "nama-program"}</p></div>
            <div className="space-y-1"><Label htmlFor="publication_title">Judul publik</Label><Input id="publication_title" value={form.public_title} onChange={(event) => update("public_title", event.target.value)} /></div>
            <div className="space-y-1 sm:col-span-2"><Label htmlFor="publication_summary">Ringkasan</Label><textarea className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm" id="publication_summary" rows={3} value={form.public_summary} onChange={(event) => update("public_summary", event.target.value)} /></div>
            <div className="space-y-1 sm:col-span-2"><Label htmlFor="publication_impact">Sorotan dampak</Label><Input id="publication_impact" value={form.impact_headline ?? ""} onChange={(event) => update("impact_headline", event.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="publication_report_title">Judul laporan</Label><Input id="publication_report_title" value={form.report_title} onChange={(event) => update("report_title", event.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="publication_beneficiaries">Penerima manfaat (agregat)</Label><Input id="publication_beneficiaries" min={0} type="number" value={form.reported_beneficiary_count} onChange={(event) => update("reported_beneficiary_count", Number(event.target.value))} /></div>
            <div className="space-y-1"><Label htmlFor="publication_start">Periode awal</Label><Input id="publication_start" type="date" value={form.report_period_start ?? ""} onChange={(event) => update("report_period_start", event.target.value || null)} /></div>
            <div className="space-y-1"><Label htmlFor="publication_end">Periode akhir</Label><Input id="publication_end" type="date" value={form.report_period_end ?? ""} onChange={(event) => update("report_period_end", event.target.value || null)} /></div>
            <div className="space-y-1"><Label htmlFor="publication_cash">Dana kas dilaporkan</Label><Input id="publication_cash" min={0} type="number" value={form.reported_cash_amount ?? ""} onChange={(event) => update("reported_cash_amount", event.target.value ? Number(event.target.value) : null)} /></div>
            <div className="space-y-1"><Label htmlFor="publication_goods">Nilai barang dilaporkan</Label><Input id="publication_goods" min={0} type="number" value={form.reported_goods_value ?? ""} onChange={(event) => update("reported_goods_value", event.target.value ? Number(event.target.value) : null)} /></div>
            <div className="space-y-1"><Label htmlFor="publication_logistics">Biaya logistik dilaporkan</Label><Input id="publication_logistics" min={0} type="number" value={form.reported_logistics_amount ?? ""} onChange={(event) => update("reported_logistics_amount", event.target.value ? Number(event.target.value) : null)} /></div>
            <div className="space-y-1 sm:col-span-2"><Label htmlFor="publication_narrative">Narasi laporan publik</Label><textarea className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm" id="publication_narrative" rows={6} value={form.report_narrative} onChange={(event) => update("report_narrative", event.target.value)} /></div>
            {save.isError || publish.isError ? <p className="text-destructive text-sm sm:col-span-2">{mutationError instanceof Error ? mutationError.message : "Publikasi tidak dapat disimpan."}</p> : null}
            <div className="flex flex-wrap gap-2 sm:col-span-2"><Button disabled={save.isPending} type="submit">{save.isPending ? "Menyimpan…" : "Simpan draft"}</Button><Button disabled={publish.isPending || !current || current.status !== "draft"} onClick={() => publish.mutate()} type="button" variant="outline"><Send className="h-4 w-4" />Terbitkan draft</Button></div>
          </form>
        </details>
      </CanAccess>
    </DetailSection>
  );
}
