import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreate, useList, useNavigation } from "@refinedev/core";
import { ArrowLeft, Save } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrganization } from "@/features/organizations/organization-context";
import {
  fundTypes,
  programFormSchema,
  targetBeneficiaryTypes,
  type ProgramFormValues,
} from "@/features/programs/schemas";
import type {
  ProgramCategoriesDocument,
  ProgramsDocument,
  ProgramRevisionsDocument,
} from "@/generated/neon/models";

export function ProgramCreatePage() {
  const [defaultCode] = useState(
    () =>
      `PRG-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
  );
  const { activeOrganization, user } = useOrganization();
  const { list, show } = useNavigation();
  const activeOrgId = activeOrganization?.organization.$id;

  const { mutate: createProgram, mutation: createProgramMutation } =
    useCreate<ProgramsDocument>();
  const { mutate: createRevision } = useCreate<ProgramRevisionsDocument>();

  const { result: categoryResult, query: categoryQuery } =
    useList<ProgramCategoriesDocument>({
      resource: "program_categories",
    });
  const categories = categoryResult?.data ?? [];

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProgramFormValues>({
    resolver: zodResolver(programFormSchema),
    defaultValues: {
      code: defaultCode,
      name: "",
      category_id: "",
      target_beneficiary_type: "individual",
      target_beneficiary_count: 0,
      budget_amount: 0,
      fund_type: "general",
      description: "",
      objective: "",
      starts_at: "",
      ends_at: "",
    },
  });

  const onSubmit: SubmitHandler<ProgramFormValues> = (values) => {
    if (!activeOrgId) {
      alert("Organisasi aktif tidak ditemukan.");
      return;
    }

    const payload = {
      ...values,
      organization_id: activeOrgId,
      status: "draft",
      allocated_amount: 0,
      disbursed_amount: 0,
      is_archived: false,
    };

    createProgram(
      {
        resource: "programs",
        values: payload,
      },
      {
        onSuccess: (data) => {
          const createdId = data.data.$id;
          createRevision({
            resource: "program_revisions",
            values: {
              organization_id: activeOrgId,
              program_id: createdId,
              action_type: "created",
              change_summary: `Program dibuat dalam status draft dengan kode ${values.code}`,
              performed_by: user?.$id ?? "user",
              performed_at: new Date().toISOString(),
            },
          });
          show("programs", createdId);
        },
      },
    );
  };

  const isCreating = createProgramMutation?.isPending ?? false;

  return (
    <section className="workspace-page" aria-labelledby="program-create-title">
      <PageHeader
        eyebrow="Modul Program"
        title="Buat Program Baru"
        description="Isi informasi awal program sosial-dakwah. Program baru akan disimpan dalam status Draft."
        actions={
          <Button variant="outline" size="sm" onClick={() => list("programs")}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Kembali ke Daftar
          </Button>
        }
      />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="border-border bg-card max-w-3xl space-y-6 rounded-xl border p-6 shadow-2xs"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="code" className="required">
              Kode Program
            </Label>
            <Input id="code" {...register("code")} placeholder="PRG-2026-001" />
            {errors.code && (
              <p className="text-destructive text-xs">{errors.code.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="category_id" className="required">
              Kategori Program
            </Label>
            <select
              id="category_id"
              {...register("category_id")}
              className="border-input bg-background focus-visible:ring-ring h-9 w-full rounded-md border px-3 text-sm shadow-2xs focus-visible:ring-1 focus-visible:outline-hidden"
              disabled={categoryQuery.isLoading}
            >
              <option value="">-- Pilih Kategori --</option>
              {categories.map((cat) => (
                <option key={cat.$id} value={cat.$id}>
                  {cat.name} ({cat.code})
                </option>
              ))}
              {categories.length === 0 && (
                <>
                  <option value="cat-pangan">Bantuan Pangan & Sembako</option>
                  <option value="cat-kesehatan">Kesehatan & Medis</option>
                  <option value="cat-pendidikan">Pendidikan & Beasiswa</option>
                  <option value="cat-dakwah">
                    Sarana & Operasional Dakwah
                  </option>
                  <option value="cat-bencana">
                    Tanggap Bencana & Kemanusiaan
                  </option>
                  <option value="cat-wakaf">Wakaf Produktif & Sarana</option>
                </>
              )}
            </select>
            {errors.category_id && (
              <p className="text-destructive text-xs">
                {errors.category_id.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="name" className="required">
            Nama Program
          </Label>
          <Input
            id="name"
            {...register("name")}
            placeholder="Contoh: Program Sembako Ramadhan 1447 H"
          />
          {errors.name && (
            <p className="text-destructive text-xs">{errors.name.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="fund_type" className="required">
              Jenis Dana Amanah
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
            {errors.fund_type && (
              <p className="text-destructive text-xs">
                {errors.fund_type.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="budget_amount" className="required">
              Target Anggaran (Rp)
            </Label>
            <Input
              id="budget_amount"
              type="number"
              min={0}
              step={10000}
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
            {errors.target_beneficiary_type && (
              <p className="text-destructive text-xs">
                {errors.target_beneficiary_type.message}
              </p>
            )}
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
            {errors.target_beneficiary_count && (
              <p className="text-destructive text-xs">
                {errors.target_beneficiary_count.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="starts_at">Tanggal Mulai</Label>
            <Input id="starts_at" type="date" {...register("starts_at")} />
            {errors.starts_at && (
              <p className="text-destructive text-xs">
                {errors.starts_at.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="ends_at">Tanggal Selesai</Label>
            <Input id="ends_at" type="date" {...register("ends_at")} />
            {errors.ends_at && (
              <p className="text-destructive text-xs">
                {errors.ends_at.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="description">Deskripsi Lengkap Program</Label>
          <textarea
            id="description"
            rows={4}
            {...register("description")}
            className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm shadow-2xs focus-visible:ring-1 focus-visible:outline-hidden"
            placeholder="Jelaskan latar belakang, mekanisme penyaluran, dan rincian program..."
          />
          {errors.description && (
            <p className="text-destructive text-xs">
              {errors.description.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="objective">Tujuan & Indikator Dampak</Label>
          <textarea
            id="objective"
            rows={2}
            {...register("objective")}
            className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm shadow-2xs focus-visible:ring-1 focus-visible:outline-hidden"
            placeholder="Tujuan utama yang ingin dicapai oleh program ini..."
          />
          {errors.objective && (
            <p className="text-destructive text-xs">
              {errors.objective.message}
            </p>
          )}
        </div>

        <div className="border-border flex justify-end gap-3 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => list("programs")}
          >
            Batal
          </Button>
          <Button type="submit" disabled={isCreating}>
            <Save className="mr-1 h-4 w-4" />
            {isCreating ? "Menyimpan..." : "Simpan Program (Draft)"}
          </Button>
        </div>
      </form>
    </section>
  );
}
