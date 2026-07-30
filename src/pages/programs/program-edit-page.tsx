import { useState, useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreate, useNavigation, useOne, useUpdate } from "@refinedev/core";
import { useParams } from "react-router";
import { AlertTriangle, ArrowLeft, Save, ShieldAlert } from "lucide-react";

import { ErrorState, PageHeader } from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrganization } from "@/features/organizations/organization-context";
import { ProgramControlledEditDialog } from "@/features/programs/components/program-controlled-edit-dialog";
import { ProgramStatusBadge } from "@/features/programs/components/program-status-badge";
import {
  canFreeEditProgram,
  canPerformControlledEdit,
  buildControlledEditDiff,
} from "@/features/programs/program-service";
import {
  fundTypes,
  programFormSchema,
  targetBeneficiaryTypes,
  type ControlledEditFormValues,
  type ProgramFormValues,
} from "@/features/programs/schemas";
import type {
  ProgramsDocument,
  ProgramRevisionsDocument,
} from "@/generated/neon/models";

export function ProgramEditPage() {
  const { id } = useParams<{ id: string }>();
  const { show } = useNavigation();
  const { activeOrganization, user } = useOrganization();
  const activeOrgId = activeOrganization?.organization.$id;

  const [isControlledDialogOpen, setIsControlledDialogOpen] = useState(false);

  const { query, result: program } = useOne<ProgramsDocument>({
    resource: "programs",
    id: id!,
    queryOptions: {
      enabled: !!id,
    },
  });

  const { mutate: updateProgram, mutation: updateMutation } =
    useUpdate<ProgramsDocument>();
  const { mutate: createRevision } = useCreate<ProgramRevisionsDocument>();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProgramFormValues>({
    resolver: zodResolver(programFormSchema),
  });

  useEffect(() => {
    if (program) {
      reset({
        code: program.code,
        name: program.name,
        category_id: program.category_id,
        description: program.description ?? "",
        objective: program.objective ?? "",
        target_beneficiary_type: program.target_beneficiary_type,
        target_beneficiary_count: program.target_beneficiary_count ?? 0,
        budget_amount: program.budget_amount,
        fund_type: program.fund_type,
        starts_at: program.starts_at ? program.starts_at.slice(0, 10) : "",
        ends_at: program.ends_at ? program.ends_at.slice(0, 10) : "",
        owner_id: program.owner_id ?? "",
      });
    }
  }, [program, reset]);

  if (query.isLoading) {
    return (
      <section className="workspace-page">
        <PageHeader eyebrow="Modul Program" title="Edit Program" />
        <div className="text-muted-foreground p-8 text-center text-sm">
          Memuat data program...
        </div>
      </section>
    );
  }

  if (query.isError || !program) {
    return (
      <section className="workspace-page">
        <PageHeader eyebrow="Modul Program" title="Edit Program" />
        <ErrorState
          title="Program Tidak Ditemukan"
          description="Gagal memuat data program yang hendak disunting."
          onRetry={() => query.refetch()}
        />
      </section>
    );
  }

  const isFreeEditAllowed = canFreeEditProgram(program);
  const isControlledEditAllowed = canPerformControlledEdit(program);
  const isUpdating = updateMutation?.isPending ?? false;

  const onSubmitDraft: SubmitHandler<ProgramFormValues> = (values) => {
    if (!id || !activeOrgId) return;

    updateProgram(
      {
        resource: "programs",
        id,
        values: {
          ...values,
        },
      },
      {
        onSuccess: () => {
          createRevision({
            resource: "program_revisions",
            values: {
              organization_id: activeOrgId,
              program_id: id,
              action_type: "draft_updated",
              change_summary: `Draft program ${values.code} diperbarui`,
              performed_by: user?.$id ?? "user",
              performed_at: new Date().toISOString(),
            },
          });
          show("programs", id);
        },
      },
    );
  };

  const handleControlledSubmit = async (values: ControlledEditFormValues) => {
    if (!id || !activeOrgId || !program) return;

    const diff = buildControlledEditDiff(program, {
      reason: values.reason,
      description: values.description,
      objective: values.objective,
      target_beneficiary_count: values.target_beneficiary_count,
      ends_at: values.ends_at,
    });

    updateProgram(
      {
        resource: "programs",
        id,
        values: {
          description: values.description,
          objective: values.objective,
          target_beneficiary_count: values.target_beneficiary_count,
          ends_at: values.ends_at || program.ends_at,
        },
      },
      {
        onSuccess: () => {
          createRevision({
            resource: "program_revisions",
            values: {
              organization_id: activeOrgId,
              program_id: id,
              action_type: "controlled_edit",
              change_summary: diff.changeSummary,
              reason: values.reason,
              previous_values: JSON.stringify(diff.previousValues),
              new_values: JSON.stringify(diff.newValues),
              performed_by: user?.$id ?? "user",
              performed_at: new Date().toISOString(),
            },
          });
          show("programs", id);
        },
      },
    );
  };

  return (
    <section className="workspace-page" aria-labelledby="program-edit-title">
      <PageHeader
        eyebrow="Modul Program"
        title={`Edit Program — ${program.name}`}
        meta={
          <ProgramStatusBadge
            status={program.status}
            isArchived={program.is_archived}
          />
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => show("programs", program.$id)}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Batal & Kembali
          </Button>
        }
      />

      {program.is_archived && (
        <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-3 rounded-xl border p-4 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <strong>Program Diarsipkan:</strong> Program ini sudah diarsipkan
            dan seluruh penyuntingan diblokir.
          </div>
        </div>
      )}

      {!isFreeEditAllowed &&
        !program.is_archived &&
        isControlledEditAllowed && (
          <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div>
                <strong>Penyuntingan Bebas Diblokir (Program Aktif):</strong>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Sesuai aturan bisnis governance, program yang sudah{" "}
                  <strong>Aktif</strong> tidak dapat diubah atribut dasarnya
                  secara langsung untuk menjaga transparansi dan integritas
                  dana. Anda dapat melakukan penyesuaian terkontrol (deskripsi,
                  target, tenggat) melalui Aksi Terkontrol dengan mencatat
                  alasan revisi.
                </p>
              </div>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsControlledDialogOpen(true)}
              className="w-full sm:w-auto"
            >
              <ShieldAlert className="mr-1 h-4 w-4" />
              Buka Form Aksi Terkontrol
            </Button>
          </div>
        )}

      {isFreeEditAllowed && (
        <form
          onSubmit={handleSubmit(onSubmitDraft)}
          className="border-border bg-card max-w-3xl space-y-6 rounded-xl border p-6 shadow-2xs"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="code" className="required">
                Kode Program
              </Label>
              <Input id="code" {...register("code")} />
              {errors.code && (
                <p className="text-destructive text-xs">
                  {errors.code.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="name" className="required">
                Nama Program
              </Label>
              <Input id="name" {...register("name")} />
              {errors.name && (
                <p className="text-destructive text-xs">
                  {errors.name.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="fund_type" className="required">
                Jenis Dana
              </Label>
              <select
                id="fund_type"
                {...register("fund_type")}
                className="border-input bg-background focus-visible:ring-ring h-9 w-full rounded-md border px-3 text-sm shadow-2xs focus-visible:ring-1 focus-visible:outline-hidden"
              >
                {fundTypes.map((ft) => (
                  <option key={ft} value={ft} className="capitalize">
                    {ft}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="budget_amount" className="required">
                Target Anggaran (Rp)
              </Label>
              <Input
                id="budget_amount"
                type="number"
                min={0}
                {...register("budget_amount")}
              />
              {errors.budget_amount && (
                <p className="text-destructive text-xs">
                  {errors.budget_amount.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="target_beneficiary_type" className="required">
                Tipe Penerima
              </Label>
              <select
                id="target_beneficiary_type"
                {...register("target_beneficiary_type")}
                className="border-input bg-background focus-visible:ring-ring h-9 w-full rounded-md border px-3 text-sm shadow-2xs focus-visible:ring-1 focus-visible:outline-hidden"
              >
                {targetBeneficiaryTypes.map((tbt) => (
                  <option key={tbt} value={tbt} className="capitalize">
                    {tbt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="target_beneficiary_count">
                Jumlah Target Penerima
              </Label>
              <Input
                id="target_beneficiary_count"
                type="number"
                min={0}
                {...register("target_beneficiary_count")}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="starts_at">Tanggal Mulai</Label>
              <Input id="starts_at" type="date" {...register("starts_at")} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="ends_at">Tanggal Selesai</Label>
              <Input id="ends_at" type="date" {...register("ends_at")} />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">Deskripsi Lengkap Program</Label>
            <textarea
              id="description"
              rows={4}
              {...register("description")}
              className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm shadow-2xs focus-visible:ring-1 focus-visible:outline-hidden"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="objective">Tujuan & Indikator Dampak</Label>
            <textarea
              id="objective"
              rows={2}
              {...register("objective")}
              className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm shadow-2xs focus-visible:ring-1 focus-visible:outline-hidden"
            />
          </div>

          <div className="border-border flex justify-end gap-3 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => show("programs", program.$id)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isUpdating}>
              <Save className="mr-1 h-4 w-4" />
              {isUpdating ? "Menyimpan..." : "Simpan Perubahan Draft"}
            </Button>
          </div>
        </form>
      )}

      {program && (
        <ProgramControlledEditDialog
          isOpen={isControlledDialogOpen}
          program={program}
          onClose={() => setIsControlledDialogOpen(false)}
          onSubmit={handleControlledSubmit}
          isLoading={isUpdating}
        />
      )}
    </section>
  );
}
