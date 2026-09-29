import { useList } from "@refinedev/core";
import { useQuery } from "@tanstack/react-query";
import { Archive, ArrowDown, ArrowLeft, ArrowUp, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";

import { ErrorState, FormSection, LoadingSkeleton, PageHeader, StatusBadge } from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Label } from "@/components/ui/label";
import { expandTemplate, type TemplateItem } from "@/features/field/checklist-rules";
import type { FieldTaskType } from "@/features/field/types";
import {
  checklistAppliesLabels,
  checklistKindLabels,
  fieldTaskTypeLabels,
  optionsOf,
} from "@/features/giving/labels";
import { useOrganization } from "@/features/organizations/organization-context";
import type { ProgramsDocument } from "@/generated/neon/models";
import { apiFetch } from "@/lib/neon/http";

type EditableItem = TemplateItem & { key: string };

type TemplateDetail = {
  description: string | null;
  id: string;
  is_default: boolean;
  items: TemplateItem[];
  name: string;
  program_id: string | null;
  status: "active" | "archived";
  task_type: FieldTaskType;
};

type Draft = {
  description: string;
  is_default: boolean;
  items: EditableItem[];
  name: string;
  program_id: string;
  task_type: FieldTaskType;
};

let keySeed = 0;
const withKeys = (items: TemplateItem[]): EditableItem[] =>
  items.map((item) => ({ ...item, hint: item.hint ?? "", key: `item-${(keySeed += 1)}` }));

const placeholders = [
  { code: "{nominal}", text: "nominal dana per penerima, mis. Rp300.000" },
  { code: "{paket}", text: "jumlah paket, mis. 2 paket" },
  { code: "{barang}", text: "rincian barang, mis. beras 5 kg, minyak 2 L" },
  { code: "{penerima}", text: "nama penerima" },
];

export function FieldTemplateFormPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { activeOrganization } = useOrganization();
  const organizationId = activeOrganization?.organization.$id ?? "";
  const taskType = (params.get("type") ?? "distribution") as FieldTaskType;

  const existing = useQuery({
    enabled: Boolean(organizationId && id),
    queryFn: () => apiFetch<{ data: TemplateDetail }>(`/api/v1/field/templates/${id}`),
    queryKey: ["field", "template", organizationId, id],
  });
  const builtin = useQuery({
    enabled: Boolean(organizationId && !id),
    queryFn: () => apiFetch<{ data: { items: TemplateItem[] } }>(`/api/v1/field/templates/builtin/${taskType}`),
    queryKey: ["field", "template-builtin", taskType],
  });

  const source = id ? existing : builtin;
  if (source.isLoading) {
    return (
      <section className="workspace-page">
        <LoadingSkeleton lines={8} />
      </section>
    );
  }
  if (source.isError || !source.data) {
    return (
      <section className="workspace-page">
        <ErrorState title="Template belum dapat dimuat" onRetry={() => source.refetch()} />
      </section>
    );
  }
  const detail = existing.data?.data;
  const initial: Draft = detail
    ? {
        description: detail.description ?? "",
        is_default: detail.is_default,
        items: withKeys(detail.items),
        name: detail.name,
        program_id: detail.program_id ?? "",
        task_type: detail.task_type,
      }
    : {
        description: "",
        is_default: params.get("default") === "1",
        items: withKeys(builtin.data?.data.items ?? []),
        name: params.get("default") === "1" ? `Ceklis ${fieldTaskTypeLabels[taskType]?.toLowerCase()}` : "",
        program_id: "",
        task_type: taskType,
      };
  return <TemplateForm archived={detail?.status === "archived"} initial={initial} key={id ?? taskType} templateId={id} />;
}

function TemplateForm({ archived, initial, templateId }: { archived: boolean; initial: Draft; templateId: string | undefined }) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft>(initial);
  const [preview, setPreview] = useState({ cash: true, goods: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (patch: Partial<Draft>) => setDraft((value) => ({ ...value, ...patch }));
  const programs = useList<ProgramsDocument>({
    resource: "programs",
    filters: [{ field: "is_archived", operator: "eq", value: false }],
    pagination: { currentPage: 1, pageSize: 100, mode: "server" },
  });

  const updateItem = (key: string, patch: Partial<EditableItem>) =>
    set({ items: draft.items.map((item) => (item.key === key ? { ...item, ...patch } : item)) });
  const move = (index: number, delta: number) => {
    const items = [...draft.items];
    const [moved] = items.splice(index, 1);
    if (!moved) return;
    items.splice(index + delta, 0, moved);
    set({ items });
  };
  const loadBuiltin = async () => {
    if (!window.confirm("Ganti semua langkah dengan ceklis bawaan sistem untuk jenis tugas ini?")) return;
    const response = await apiFetch<{ data: { items: TemplateItem[] } }>(`/api/v1/field/templates/builtin/${draft.task_type}`);
    set({ items: withKeys(response.data.items) });
  };

  const modes: Array<"cash" | "in_kind"> = [
    ...(preview.cash ? (["cash"] as const) : []),
    ...(preview.goods ? (["in_kind"] as const) : []),
  ];
  const previewItems = expandTemplate(
    draft.items.filter((item) => item.label.trim().length >= 3),
    {
      beneficiaryName: "Ibu Siti Aminah",
      cashAmount: "300000",
      goodsPackageCount: 2,
      goodsSummary: "beras 5 kg, minyak 2 L",
      supportModes: draft.task_type === "distribution" ? modes : [],
      taskType: draft.task_type,
    },
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const body = JSON.stringify({
      description: draft.description || undefined,
      is_default: draft.is_default,
      items: draft.items.map((item) => ({
        applies_to: draft.task_type === "distribution" ? item.applies_to : "always",
        hint: item.hint || undefined,
        is_required: item.is_required,
        item_kind: item.item_kind,
        label: item.label,
      })),
      name: draft.name,
      program_id: draft.program_id || null,
      task_type: draft.task_type,
    });
    try {
      await apiFetch(templateId ? `/api/v1/field/templates/${templateId}` : "/api/v1/field/templates", {
        body,
        method: templateId ? "PUT" : "POST",
      });
      navigate("/field/settings");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Template belum tersimpan.");
      setSaving(false);
    }
  };

  const archive = async () => {
    if (!templateId || !window.confirm("Arsipkan template ini? Tugas yang sudah dibuat tidak berubah.")) return;
    await apiFetch(`/api/v1/field/templates/${templateId}/archive`, { body: "{}", method: "POST" });
    navigate("/field/settings");
  };

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow="Pengaturan lapangan"
        title={templateId ? `Ubah template: ${initial.name}` : "Template ceklis baru"}
        description="Susun langkah yang harus dikerjakan petugas. Langkah dana/barang hanya muncul bila tugas memang menyalurkan bentuk tersebut."
        actions={
          <Link className={buttonVariants({ variant: "outline" })} to="/field/settings">
            <ArrowLeft aria-hidden size={16} /> Pengaturan
          </Link>
        }
      />
      {archived ? <StatusBadge tone="warning">Template ini diarsipkan — simpan untuk mengaktifkan kembali.</StatusBadge> : null}
      {error ? <ErrorState title="Template belum tersimpan" description={error} /> : null}

      <form className="template-editor" onSubmit={submit}>
        <div className="template-editor__main">
          <FormSection title="Identitas template">
            <div className="form-grid">
              <div className="auth-field">
                <Label htmlFor="name">Nama template *</Label>
                <input id="name" maxLength={120} minLength={3} required value={draft.name} onChange={(event) => set({ name: event.target.value })} placeholder="Mis. Penyaluran sembako Ramadhan" />
              </div>
              <div className="auth-field">
                <Label htmlFor="task_type">Jenis tugas</Label>
                <select id="task_type" value={draft.task_type} onChange={(event) => set({ task_type: event.target.value as FieldTaskType })}>
                  {optionsOf(fieldTaskTypeLabels).map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="auth-field">
                <Label htmlFor="program">Khusus program (opsional)</Label>
                <select id="program" value={draft.program_id} onChange={(event) => set({ program_id: event.target.value })}>
                  <option value="">Semua program</option>
                  {(programs.result?.data ?? []).map((program) => (
                    <option key={program.$id} value={program.$id}>{program.name}</option>
                  ))}
                </select>
              </div>
              <div className="auth-field">
                <Label>
                  <input checked={draft.is_default} className="mr-2" type="checkbox" onChange={(event) => set({ is_default: event.target.checked })} />
                  Jadikan bawaan
                </Label>
                <span className="auth-field__message">
                  Dipakai otomatis untuk {fieldTaskTypeLabels[draft.task_type]?.toLowerCase()}
                  {draft.program_id ? " pada program ini" : ""}. Bawaan sebelumnya otomatis dinonaktifkan.
                </span>
              </div>
              <div className="auth-field auth-field--wide">
                <Label htmlFor="description">Keterangan</Label>
                <input id="description" maxLength={500} value={draft.description} onChange={(event) => set({ description: event.target.value })} />
              </div>
            </div>
          </FormSection>

          <FormSection
            title={`Langkah (${draft.items.length})`}
            description="Langkah jenis Foto, GPS, dan Kirim laporan punya tombol khusus di HP petugas."
          >
            <ol className="template-steps">
              {draft.items.map((item, index) => (
                <li key={item.key}>
                  <span className="template-steps__number">{index + 1}</span>
                  <div className="template-steps__body">
                    <input aria-label={`Langkah ${index + 1}`} maxLength={200} required value={item.label} onChange={(event) => updateItem(item.key, { label: event.target.value })} placeholder="Tulis langkah, mis. Serahkan dana {nominal}" />
                    <div className="template-steps__meta">
                      <select aria-label="Jenis langkah" value={item.item_kind} onChange={(event) => updateItem(item.key, { item_kind: event.target.value as TemplateItem["item_kind"] })}>
                        {optionsOf(checklistKindLabels).map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      {draft.task_type === "distribution" ? (
                        <select aria-label="Muncul bila" value={item.applies_to} onChange={(event) => updateItem(item.key, { applies_to: event.target.value as TemplateItem["applies_to"] })}>
                          {optionsOf(checklistAppliesLabels).map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      ) : null}
                      <label className="template-steps__required">
                        <input checked={item.is_required} type="checkbox" onChange={(event) => updateItem(item.key, { is_required: event.target.checked })} />
                        Wajib
                      </label>
                    </div>
                    <input aria-label={`Petunjuk langkah ${index + 1}`} className="template-steps__hint" maxLength={300} value={item.hint ?? ""} onChange={(event) => updateItem(item.key, { hint: event.target.value })} placeholder="Petunjuk untuk petugas (opsional)" />
                  </div>
                  <div className="template-steps__tools">
                    <Button aria-label="Naikkan" disabled={index === 0} size="sm" type="button" variant="ghost" onClick={() => move(index, -1)}><ArrowUp aria-hidden size={14} /></Button>
                    <Button aria-label="Turunkan" disabled={index === draft.items.length - 1} size="sm" type="button" variant="ghost" onClick={() => move(index, 1)}><ArrowDown aria-hidden size={14} /></Button>
                    <Button aria-label="Hapus langkah" size="sm" type="button" variant="ghost" onClick={() => set({ items: draft.items.filter((entry) => entry.key !== item.key) })}><Trash2 aria-hidden size={14} /></Button>
                  </div>
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={draft.items.length >= 30}
                size="sm"
                type="button"
                variant="outline"
                onClick={() => set({ items: [...draft.items, ...withKeys([{ applies_to: "always", hint: "", is_required: true, item_kind: "check", label: "" }])] })}
              >
                <Plus aria-hidden size={14} /> Tambah langkah
              </Button>
              <Button size="sm" type="button" variant="ghost" onClick={() => void loadBuiltin()}>
                <RotateCcw aria-hidden size={14} /> Muat ceklis bawaan
              </Button>
            </div>
            <details className="template-placeholders">
              <summary>Kode isian otomatis</summary>
              <ul>
                {placeholders.map((item) => (
                  <li key={item.code}><code>{item.code}</code> — {item.text}</li>
                ))}
              </ul>
            </details>
          </FormSection>
        </div>

        <aside className="template-editor__preview" aria-label="Pratinjau di HP petugas">
          <strong>Pratinjau di HP petugas</strong>
          {draft.task_type === "distribution" ? (
            <div className="mode-toggle">
              <button aria-pressed={preview.cash} type="button" onClick={() => setPreview((value) => ({ ...value, cash: !value.cash }))}>Dana</button>
              <button aria-pressed={preview.goods} type="button" onClick={() => setPreview((value) => ({ ...value, goods: !value.goods }))}>Barang</button>
            </div>
          ) : null}
          <small>Contoh: Ibu Siti Aminah, Rp300.000, 2 paket beras & minyak.</small>
          <ol className="task-checklist">
            {previewItems.map((item, index) => (
              <li className="task-item" key={`${item.label}-${index}`}>
                <span className="task-item__box" aria-hidden />
                <div className="task-item__body">
                  <span className="task-item__label">
                    {item.label}
                    {item.is_required ? null : <em> (opsional)</em>}
                  </span>
                  {item.hint ? <small>{item.hint}</small> : null}
                </div>
              </li>
            ))}
          </ol>
          <small>&ldquo;Kirim laporan lapangan&rdquo; ditambahkan otomatis bila aturan organisasi mewajibkannya.</small>
        </aside>

        <div className="form-actions template-editor__actions">
          {templateId && !archived ? (
            <Button type="button" variant="ghost" onClick={() => void archive()}>
              <Archive aria-hidden size={16} /> Arsipkan
            </Button>
          ) : null}
          <Button disabled={saving || draft.items.length === 0} type="submit">
            <Save aria-hidden size={16} /> {saving ? "Menyimpan…" : "Simpan template"}
          </Button>
        </div>
      </form>
    </section>
  );
}
