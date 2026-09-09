import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useList, useNavigation } from "@refinedev/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrganization } from "@/features/organizations/organization-context";
import {
  ProgramDeliveryPlanFields,
  type DeliveryAreaDraft,
  type PartnerAssignmentDraft,
  type ProgramPlanningOptions,
} from "@/features/programs/components/program-delivery-plan-fields";
import {
  ProgramGoodsPlanFields,
  type ProgramGoodsPlanDraft,
  type ProgramGoodsPlanProduct,
} from "@/features/programs/components/program-goods-plan-fields";
import {
  fundTypes,
  programFormSchema,
  programSupportModeLabels,
  programSupportModes,
  sumProgramSupportBudget,
  targetBeneficiaryTypes,
  type ProgramFormValues,
} from "@/features/programs/schemas";
import { apiFetch } from "@/lib/neon/http";
import type { ProgramCategoriesDocument } from "@/generated/neon/models";

type Envelope<T> = { data: T; meta: { requestId: string } };

type CreatedProgramPlan = {
  program: { id: string };
};

export function ProgramCreatePage() {
  const [defaultCode] = useState(
    () =>
      `PRG-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
  );
  const { activeOrganization } = useOrganization();
  const { list, show } = useNavigation();
  const activeOrgId = activeOrganization?.organization.$id;
  const [deliveryAreas, setDeliveryAreas] = useState<DeliveryAreaDraft[]>([]);
  const [partnerAssignments, setPartnerAssignments] = useState<
    PartnerAssignmentDraft[]
  >([]);
  const [goodsPlanItems, setGoodsPlanItems] = useState<ProgramGoodsPlanDraft[]>(
    [],
  );
  const [planningError, setPlanningError] = useState<string | null>(null);

  const { result: categoryResult, query: categoryQuery } =
    useList<ProgramCategoriesDocument>({
      resource: "program_categories",
    });
  const categories = categoryResult?.data ?? [];
  const planningOptions = useQuery({
    enabled: Boolean(activeOrgId),
    queryKey: ["program-planning-options", activeOrgId],
    queryFn: () =>
      apiFetch<Envelope<ProgramPlanningOptions>>(
        "/api/v1/programs/planning-options",
      ),
  });

  const createProgramPlan = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiFetch<Envelope<CreatedProgramPlan>>("/api/v1/programs/initial-plan", {
        body: JSON.stringify(payload),
        method: "POST",
      }),
    onSuccess: ({ data }) => show("programs", data.program.id),
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
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
      support_modes: ["cash"],
      cash_budget_amount: 0,
      goods_budget_amount: 0,
      logistics_budget_amount: 0,
      fund_type: "general",
      description: "",
      objective: "",
      starts_at: "",
      ends_at: "",
    },
  });

  const supportModes = watch("support_modes") ?? [];
  const goodsPlanTotal = goodsPlanItems.reduce(
    (total, item) =>
      total + (Number(item.quantity) || 0) * (Number(item.unitValue) || 0),
    0,
  );
  const plannedBudget = sumProgramSupportBudget({
    cash_budget_amount: Number(watch("cash_budget_amount") ?? 0),
    goods_budget_amount: Number(watch("goods_budget_amount") ?? 0),
    logistics_budget_amount: Number(watch("logistics_budget_amount") ?? 0),
  });

  const toggleSupportMode = (
    mode: (typeof programSupportModes)[number],
    checked: boolean,
  ) => {
    const nextModes = checked
      ? [...supportModes, mode]
      : supportModes.filter((value) => value !== mode);
    setValue("support_modes", nextModes, { shouldValidate: true });

    if (!checked) {
      const budgetField = {
        cash: "cash_budget_amount",
        in_kind: "goods_budget_amount",
        logistics: "logistics_budget_amount",
      } as const;
      setValue(budgetField[mode], 0, { shouldValidate: true });
      if (mode === "in_kind") setGoodsPlanItems([]);
    }
  };

  const onSubmit: SubmitHandler<ProgramFormValues> = (values) => {
    if (!activeOrgId) {
      alert("Organisasi aktif tidak ditemukan.");
      return;
    }

    const incompleteArea = deliveryAreas.find(
      (area) =>
        !area.name.trim() ||
        !area.city.trim() ||
        !area.province.trim() ||
        !area.addressLine.trim(),
    );
    if (incompleteArea) {
      setPlanningError(
        "Lengkapi nama, kota/kabupaten, provinsi, dan alamat jelas pada setiap area penyaluran.",
      );
      return;
    }

    if (
      partnerAssignments.some(
        (partner) =>
          !partner.partnerContactId && !partner.partnerOrganizationId,
      )
    ) {
      setPlanningError("Pilih mitra terdaftar pada setiap penugasan mitra.");
      return;
    }

    if (supportModes.includes("in_kind")) {
      const incompleteGoodsItem = goodsPlanItems.find(
        (item) =>
          !item.productId ||
          Number(item.quantity) <= 0 ||
          Number(item.unitValue) < 0,
      );
      if (incompleteGoodsItem || goodsPlanItems.length === 0) {
        setPlanningError(
          "Tambahkan minimal satu produk aktif beserta jumlah dan nilai per unit untuk dukungan barang.",
        );
        return;
      }
    }

    setPlanningError(null);
    const { budget_amount: _budgetAmount, ...programValues } = values;
    const payload = {
      ...programValues,
      cash_budget_amount: Number(values.cash_budget_amount),
      delivery_areas: deliveryAreas.map((area) => ({
        address_line: area.addressLine,
        city: area.city,
        client_id: area.clientId,
        district: area.district || undefined,
        name: area.name,
        postal_code: area.postalCode || undefined,
        province: area.province,
        quota_capacity: Number(area.quotaCapacity || 0),
        village: area.village || undefined,
      })),
      goods_budget_amount: goodsPlanTotal,
      goods_plan_items: goodsPlanItems.map((item) => ({
        notes: item.notes || undefined,
        product_id: item.productId,
        quantity: Number(item.quantity),
        unit_value: Number(item.unitValue),
      })),
      logistics_budget_amount: Number(values.logistics_budget_amount),
      partner_assignments: partnerAssignments.map((partner) => ({
        assignment_role: partner.assignmentRole,
        delivery_area_client_id: partner.deliveryAreaClientId || undefined,
        partner_contact_id: partner.partnerContactId || undefined,
        partner_organization_id: partner.partnerOrganizationId || undefined,
        pic_name: partner.picName || undefined,
        pic_phone: partner.picPhone || undefined,
        readiness_status: partner.readinessStatus,
      })),
    };

    createProgramPlan.mutate(payload);
  };

  const isCreating = createProgramPlan.isPending;

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
        className="border-border bg-card max-w-4xl space-y-6 rounded-xl border p-6 shadow-2xs"
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

        <fieldset className="border-border bg-muted/20 space-y-4 rounded-lg border p-4">
          <legend className="px-1 text-sm font-semibold">
            Bentuk dukungan program
          </legend>
          <p className="text-muted-foreground text-xs">
            Pilih satu atau beberapa bentuk. Barang dicatat sebagai valuasi
            rencana; stok dan paket aktual dikelola di Gudang & Paket Bantuan.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {programSupportModes.map((mode) => (
              <label
                className="border-border bg-background flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm"
                key={mode}
              >
                <input
                  checked={supportModes.includes(mode)}
                  className="mt-0.5"
                  onChange={(event) =>
                    toggleSupportMode(mode, event.target.checked)
                  }
                  type="checkbox"
                />
                <span>{programSupportModeLabels[mode]}</span>
              </label>
            ))}
          </div>
          {errors.support_modes ? (
            <p className="text-destructive text-xs">
              {errors.support_modes.message}
            </p>
          ) : null}
        </fieldset>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="fund_type" className="required">
              Klasifikasi Amanah
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

        <input
          type="hidden"
          {...register("budget_amount", { valueAsNumber: true })}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {supportModes.includes("cash") ? (
            <div className="space-y-1">
              <Label htmlFor="cash_budget_amount">Rencana Dana (Rp)</Label>
              <Input
                id="cash_budget_amount"
                min={0}
                step={10000}
                type="number"
                {...register("cash_budget_amount")}
              />
              {errors.cash_budget_amount ? (
                <p className="text-destructive text-xs">
                  {errors.cash_budget_amount.message}
                </p>
              ) : null}
            </div>
          ) : null}
          {supportModes.includes("logistics") ? (
            <div className="space-y-1">
              <Label htmlFor="logistics_budget_amount">
                Logistik & Kirim (Rp)
              </Label>
              <Input
                id="logistics_budget_amount"
                min={0}
                step={10000}
                type="number"
                {...register("logistics_budget_amount")}
              />
              {errors.logistics_budget_amount ? (
                <p className="text-destructive text-xs">
                  {errors.logistics_budget_amount.message}
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="border-primary/30 bg-primary/5 rounded-md border p-3 sm:col-span-3">
            <p className="text-muted-foreground text-xs">
              Total rencana dukungan
            </p>
            <p className="text-lg font-semibold">
              Rp {plannedBudget.toLocaleString("id-ID")}
            </p>
          </div>
        </div>

        {supportModes.includes("in_kind") ? (
          <ProgramGoodsPlanFields
            items={goodsPlanItems}
            loading={planningOptions.isLoading}
            onChange={(items) => {
              setGoodsPlanItems(items);
              const total = items.reduce(
                (value, item) =>
                  value +
                  (Number(item.quantity) || 0) * (Number(item.unitValue) || 0),
                0,
              );
              setValue("goods_budget_amount", total, { shouldValidate: true });
            }}
            products={
              (planningOptions.data?.data.products ??
                []) as ProgramGoodsPlanProduct[]
            }
          />
        ) : null}

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

        <ProgramDeliveryPlanFields
          areas={deliveryAreas}
          onAreasChange={setDeliveryAreas}
          onPartnersChange={setPartnerAssignments}
          options={planningOptions.data?.data}
          optionsLoading={planningOptions.isLoading}
          partners={partnerAssignments}
        />

        {planningOptions.isError ? (
          <p className="border-destructive/40 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm">
            Saran area dan daftar mitra belum dapat dimuat. Program tetap dapat
            dibuat tanpa rencana mitra; coba muat ulang untuk menugaskan mitra.
          </p>
        ) : null}

        {planningError || createProgramPlan.error ? (
          <p className="border-destructive/40 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm">
            {planningError ??
              (createProgramPlan.error instanceof Error
                ? createProgramPlan.error.message
                : "Program belum dapat disimpan.")}
          </p>
        ) : null}

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
