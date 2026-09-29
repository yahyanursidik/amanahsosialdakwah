import { useList } from "@refinedev/core";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Banknote, Package, Plus, Save, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";

import { ErrorState, FormSection, PageHeader } from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Label } from "@/components/ui/label";
import type { BeneficiaryListItem } from "@/features/beneficiaries/types";
import { formatRupiah, omitKey } from "@/features/field/task-format";
import type { FieldTaskType } from "@/features/field/types";
import {
  fieldTaskPriorityLabels,
  fieldTaskTypeHints,
  fieldTaskTypeLabels,
  labelOf,
  optionsOf,
  supportModeLabels,
} from "@/features/giving/labels";
import { useOrganization } from "@/features/organizations/organization-context";
import type { ProgramsDocument } from "@/generated/neon/models";
import { apiFetch } from "@/lib/neon/http";

import type { FieldMember } from "./field-task-list-page";

type Mode = "cash" | "in_kind";

/** Pratinjau ringkas ceklis yang akan dibuat server (lihat field-task-rules). */
function previewSteps(input: {
  cashAmount: string;
  customItems: string[];
  goodsPackageCount: string;
  goodsSummary: string;
  modes: Mode[];
  taskType: FieldTaskType;
}) {
  const steps: string[] = [];
  switch (input.taskType) {
    case "distribution":
      steps.push("Cek identitas penerima");
      if (input.modes.includes("cash")) {
        steps.push(`Serahkan dana ${input.cashAmount ? formatRupiah(input.cashAmount) : ""}`.trim());
      }
      if (input.modes.includes("in_kind")) {
        steps.push(
          `Serahkan ${input.goodsPackageCount ? `${input.goodsPackageCount} paket` : "barang"}${input.goodsSummary ? ` (${input.goodsSummary})` : ""}`,
        );
      }
      steps.push("Tanda terima", "Foto serah terima", "GPS (opsional)");
      break;
    case "verification":
      steps.push("Temui penerima", "Cocokkan KTP/KK", "Periksa kondisi rumah", "Konfirmasi RT (opsional)", "Foto rumah", "GPS (opsional)");
      break;
    case "delivery":
      steps.push("Ambil & cocokkan barang di gudang", "Catat berangkat", "Serahkan barang", "Tanda terima", "Foto serah terima");
      break;
    case "monitoring":
      steps.push("Kunjungi penerima", "Tanyakan pemanfaatan", "Catat kondisi", "Foto (opsional)");
      break;
    case "other":
      break;
  }
  steps.push(...input.customItems.map((item) => item.trim()).filter((item) => item.length >= 3));
  steps.push("Kirim laporan lapangan");
  return steps;
}

export function FieldTaskFormPage() {
  const navigate = useNavigate();
  const { activeOrganization } = useOrganization();
  const organizationId = activeOrganization?.organization.$id ?? "";
  const [taskType, setTaskType] = useState<FieldTaskType>("distribution");
  const [programId, setProgramId] = useState("");
  const [modes, setModes] = useState<Mode[]>(["in_kind"]);
  const [cashAmount, setCashAmount] = useState("");
  const [goodsPackageCount, setGoodsPackageCount] = useState("1");
  const [goodsSummary, setGoodsSummary] = useState("");
  const [search, setSearch] = useState("");
  const [onlyProgram, setOnlyProgram] = useState(true);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("normal");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [customItems, setCustomItems] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const programs = useList<ProgramsDocument>({
    resource: "programs",
    filters: [{ field: "is_archived", operator: "eq", value: false }],
    pagination: { currentPage: 1, pageSize: 100, mode: "server" },
  });
  const programOptions = programs.result?.data ?? [];
  const program = programOptions.find((item) => item.$id === programId);
  const programModes = (program?.support_modes ?? []).filter((mode): mode is Mode => mode === "cash" || mode === "in_kind");

  const beneficiaries = useList<BeneficiaryListItem>({
    resource: "beneficiaries",
    filters: [
      { field: "q", operator: "eq", value: search },
      { field: "program_id", operator: "eq", value: onlyProgram ? programId : "" },
    ],
    pagination: { currentPage: 1, pageSize: 50, mode: "server" },
  });
  const beneficiaryOptions = beneficiaries.result?.data ?? [];

  const members = useQuery({
    enabled: Boolean(organizationId),
    queryFn: () => apiFetch<{ data: FieldMember[] }>("/api/v1/field/members"),
    queryKey: ["field", "members", organizationId],
  });
  const memberOptions = [...(members.data?.data ?? [])].sort(
    (left, right) => Number(right.roles.includes("field_officer")) - Number(left.roles.includes("field_officer")),
  );

  const chooseProgram = (id: string) => {
    setProgramId(id);
    const next = programOptions.find((item) => item.$id === id);
    const nextModes = (next?.support_modes ?? []).filter((mode): mode is Mode => mode === "cash" || mode === "in_kind");
    if (nextModes.length > 0) setModes(nextModes);
  };

  const toggleMode = (mode: Mode) =>
    setModes((current) => (current.includes(mode) ? current.filter((item) => item !== mode) : [...current, mode]));

  const selectedIds = Object.keys(selected);
  const isDistribution = taskType === "distribution";
  const steps = previewSteps({ cashAmount, customItems, goodsPackageCount, goodsSummary, modes: isDistribution ? modes : [], taskType });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (isDistribution && modes.length === 0) {
      setError("Pilih bentuk bantuan: dana, barang, atau keduanya.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await apiFetch<{ data: { created: number; ids: string[] } }>("/api/v1/field/tasks", {
        body: JSON.stringify({
          assigned_profile_id: assignee,
          beneficiary_contact_ids: selectedIds,
          cash_amount: isDistribution && modes.includes("cash") ? cashAmount : null,
          custom_items: customItems.filter((item) => item.trim().length >= 3),
          due_date: dueDate || null,
          goods_package_count:
            isDistribution && modes.includes("in_kind") && goodsPackageCount ? Number(goodsPackageCount) : null,
          goods_summary: (isDistribution && modes.includes("in_kind")) || taskType === "delivery" ? goodsSummary : undefined,
          instructions: instructions || undefined,
          priority,
          program_id: programId || null,
          support_modes: isDistribution ? modes : [],
          task_type: taskType,
          title: title || undefined,
        }),
        method: "POST",
      });
      const { created, ids } = response.data;
      navigate(created === 1 && ids[0] ? `/field/tasks/${ids[0]}` : "/field/tasks");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Tugas belum tersimpan.");
      setSubmitting(false);
    }
  };

  return (
    <section className="workspace-page field-page">
      <PageHeader
        eyebrow="Lapangan"
        title="Buat tugas lapangan"
        description="Satu tugas per penerima, lengkap dengan ceklis langkah kerja. Petugas melihatnya di menu Tugas lapangan pada HP."
        actions={
          <Link className={buttonVariants({ variant: "outline" })} to="/field/tasks">
            <ArrowLeft aria-hidden size={16} /> Daftar tugas
          </Link>
        }
      />
      {error ? <ErrorState title="Tugas belum tersimpan" description={error} /> : null}

      <form onSubmit={submit}>
        <FormSection title="1. Jenis tugas" description={fieldTaskTypeHints[taskType]}>
          <div className="choice-grid choice-grid--compact">
            {optionsOf(fieldTaskTypeLabels).map((option) => (
              <label className="choice-card" data-selected={taskType === option.value} key={option.value}>
                <input checked={taskType === option.value} name="task_type" type="radio" onChange={() => setTaskType(option.value as FieldTaskType)} />
                <strong>{option.label}</strong>
              </label>
            ))}
          </div>
        </FormSection>

        <FormSection
          title="2. Program & bentuk bantuan"
          description="Satu program bisa menyalurkan dana, barang, atau keduanya sekaligus dalam satu kunjungan."
        >
          <div className="form-grid">
            <div className="auth-field auth-field--wide">
              <Label htmlFor="program">Program</Label>
              <select id="program" value={programId} onChange={(event) => chooseProgram(event.target.value)}>
                <option value="">Tanpa program</option>
                {programOptions.map((item) => (
                  <option key={item.$id} value={item.$id}>
                    {item.name}
                    {item.support_modes?.length ? ` — ${item.support_modes.map((mode) => labelOf(supportModeLabels, mode)).join(" + ")}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {isDistribution ? (
              <div className="auth-field auth-field--wide">
                <Label>Yang diserahkan ke setiap penerima</Label>
                <div className="mode-toggle">
                  <button aria-pressed={modes.includes("cash")} type="button" onClick={() => toggleMode("cash")}>
                    <Banknote aria-hidden size={18} /> Dana
                  </button>
                  <button aria-pressed={modes.includes("in_kind")} type="button" onClick={() => toggleMode("in_kind")}>
                    <Package aria-hidden size={18} /> Barang
                  </button>
                </div>
                <span className="auth-field__message">
                  {modes.length === 2
                    ? "Dana dan barang diserahkan dalam satu kunjungan."
                    : modes.length === 0
                      ? "Pilih minimal satu."
                      : `Hanya ${labelOf(supportModeLabels, modes[0]).toLowerCase()}.`}
                  {program && programModes.length > 0 && modes.some((mode) => !programModes.includes(mode))
                    ? " Catatan: program ini belum mencantumkan bentuk tersebut."
                    : ""}
                </span>
              </div>
            ) : null}

            {isDistribution && modes.includes("cash") ? (
              <div className="auth-field">
                <Label htmlFor="cash">Dana per penerima (Rp) *</Label>
                <input id="cash" inputMode="numeric" pattern="\d+(\.\d{1,2})?" required value={cashAmount} onChange={(event) => setCashAmount(event.target.value.replace(/[^\d.]/g, ""))} placeholder="500000" />
                {cashAmount ? <span className="auth-field__message">{formatRupiah(cashAmount)}</span> : null}
              </div>
            ) : null}
            {isDistribution && modes.includes("in_kind") ? (
              <div className="auth-field">
                <Label htmlFor="packages">Jumlah paket per penerima</Label>
                <input id="packages" inputMode="numeric" min={1} type="number" value={goodsPackageCount} onChange={(event) => setGoodsPackageCount(event.target.value)} />
              </div>
            ) : null}
            {(isDistribution && modes.includes("in_kind")) || taskType === "delivery" ? (
              <div className="auth-field auth-field--wide">
                <Label htmlFor="goods">Rincian barang</Label>
                <input id="goods" maxLength={300} placeholder="Mis. beras 5 kg, minyak 2 L, gula 1 kg" value={goodsSummary} onChange={(event) => setGoodsSummary(event.target.value)} />
              </div>
            ) : null}
          </div>
        </FormSection>

        <FormSection
          title={`3. Penerima (${selectedIds.length} dipilih)`}
          description="Setiap penerima yang dipilih menjadi satu tugas. Kosongkan untuk tugas umum (mis. antar ke mitra)."
        >
          <div className="form-grid">
            <div className="auth-field">
              <Label htmlFor="beneficiary-search">Cari penerima</Label>
              <input id="beneficiary-search" placeholder="Nama, telepon, atau kota" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            {programId ? (
              <div className="auth-field">
                <Label>
                  <input checked={onlyProgram} className="mr-2" type="checkbox" onChange={(event) => setOnlyProgram(event.target.checked)} />
                  Hanya penerima program ini
                </Label>
              </div>
            ) : null}
          </div>
          {selectedIds.length > 0 ? (
            <div className="task-selected">
              {Object.entries(selected).map(([id, name]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() =>
                    setSelected((current) => omitKey(current, id))
                  }
                >
                  {name} ×
                </button>
              ))}
            </div>
          ) : null}
          <div className="task-pick-list">
            {beneficiaryOptions.length === 0 ? (
              <small>{beneficiaries.query.isLoading ? "Memuat…" : "Tidak ada penerima yang cocok."}</small>
            ) : (
              beneficiaryOptions.map((item) => (
                <label key={item.id}>
                  <input
                    checked={Boolean(selected[item.id])}
                    type="checkbox"
                    onChange={(event) =>
                      setSelected((current) => 
                        event.target.checked ? { ...current, [item.id]: item.display_name } : omitKey(current, item.id)
                      )
                    }
                  />
                  <span>
                    <strong>{item.display_name}</strong>
                    <small>{[item.city, item.primary_phone].filter(Boolean).join(" · ") || "—"}</small>
                  </span>
                </label>
              ))
            )}
          </div>
        </FormSection>

        <FormSection title="4. Petugas & jadwal">
          <div className="form-grid">
            <div className="auth-field">
              <Label htmlFor="assignee">Petugas lapangan *</Label>
              <select id="assignee" required value={assignee} onChange={(event) => setAssignee(event.target.value)}>
                <option value="">Pilih petugas</option>
                {memberOptions.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.display_name}
                    {member.roles.includes("field_officer") ? " (petugas lapangan)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="auth-field">
              <Label htmlFor="due">Tenggat</Label>
              <input id="due" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </div>
            <div className="auth-field">
              <Label htmlFor="priority">Prioritas</Label>
              <select id="priority" value={priority} onChange={(event) => setPriority(event.target.value)}>
                {optionsOf(fieldTaskPriorityLabels).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="auth-field auth-field--wide">
              <Label htmlFor="title">Judul{taskType === "other" ? " *" : " (opsional)"}</Label>
              <input
                id="title"
                maxLength={200}
                minLength={taskType === "other" ? 5 : undefined}
                placeholder={selectedIds.length > 1 ? "Kosongkan: judul dibuat otomatis per penerima" : "Kosongkan untuk judul otomatis"}
                required={taskType === "other"}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="auth-field auth-field--wide">
              <Label htmlFor="instructions">Arahan untuk petugas</Label>
              <textarea id="instructions" maxLength={2000} placeholder="Mis. temui ketua RT dulu; penerima lansia, serahkan di rumah." rows={3} value={instructions} onChange={(event) => setInstructions(event.target.value)} />
            </div>
          </div>
        </FormSection>

        <FormSection title="5. Ceklis" description="Langkah standar dibuat otomatis. Tambahkan langkah khusus bila perlu.">
          <ol className="task-preview">
            {steps.map((step, index) => (
              <li key={`${step}-${index}`}>{step}</li>
            ))}
          </ol>
          <div className="task-custom-items">
            {customItems.map((item, index) => (
              <div key={index}>
                <input
                  aria-label={`Langkah tambahan ${index + 1}`}
                  maxLength={200}
                  placeholder="Mis. bawa formulir tanda terima"
                  value={item}
                  onChange={(event) => setCustomItems((current) => current.map((value, itemIndex) => (itemIndex === index ? event.target.value : value)))}
                />
                <Button aria-label="Hapus langkah" size="sm" type="button" variant="ghost" onClick={() => setCustomItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                  <Trash2 aria-hidden size={14} />
                </Button>
              </div>
            ))}
            {customItems.length < 15 ? (
              <Button size="sm" type="button" variant="outline" onClick={() => setCustomItems((current) => [...current, ""])}>
                <Plus aria-hidden size={14} /> Tambah langkah
              </Button>
            ) : null}
          </div>
        </FormSection>

        <div className="form-actions field-submit">
          <Button disabled={submitting || !assignee} type="submit">
            <Save aria-hidden size={16} />
            {submitting
              ? "Menyimpan…"
              : selectedIds.length > 1
                ? `Buat ${selectedIds.length} tugas`
                : "Buat tugas"}
          </Button>
        </div>
      </form>
    </section>
  );
}
