import { useQuery } from "@tanstack/react-query";
import { Plus, Settings2, Star } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { CanAccess } from "@/components/access-control/can-access";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrganization } from "@/features/organizations/organization-context";
import {
  fundTypeLabels,
  fundTypes,
  targetBeneficiaryTypeLabels,
  targetBeneficiaryTypes,
} from "@/features/programs/schemas";
import { apiFetch } from "@/lib/neon/http";

type FundType = (typeof fundTypes)[number];
type TargetType = (typeof targetBeneficiaryTypes)[number];

export type ProgramCategoryOption = {
  code: string;
  description: string | null;
  id: string;
  is_global: boolean;
  name: string;
  program_count: number;
  status: "active" | "inactive";
};

export type ProgramClassificationValue = {
  category_id: string;
  fund_type: FundType;
  fund_types: FundType[];
  target_beneficiary_type: TargetType;
  target_beneficiary_types: TargetType[];
};

type Props = {
  errors?: Partial<Record<keyof ProgramClassificationValue, string | undefined>>;
  onChange: (patch: Partial<ProgramClassificationValue>) => void;
  value: ProgramClassificationValue;
};

/** Toggle nilai dalam daftar multi-pilihan sambil menjaga nilai utama tetap valid. */
function toggle<T extends string>(list: T[], item: T, primary: T) {
  const next = list.includes(item) ? list.filter((value) => value !== item) : [...list, item];
  const nextPrimary = next.includes(primary) ? primary : (next[0] ?? primary);
  return { next, primary: nextPrimary };
}

export function ProgramClassificationFields({ errors, onChange, value }: Props) {
  const { activeOrganization } = useOrganization();
  const organizationId = activeOrganization?.organization.$id ?? "";
  const [adding, setAdding] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [categoryError, setCategoryError] = useState("");

  const categories = useQuery({
    enabled: Boolean(organizationId),
    queryFn: () => apiFetch<{ data: ProgramCategoryOption[] }>("/api/v1/program-categories"),
    queryKey: ["program-categories", organizationId],
  });
  const options = (categories.data?.data ?? []).filter(
    (category) => category.status === "active" || category.id === value.category_id,
  );

  const addCategory = async () => {
    setSaving(true);
    setCategoryError("");
    try {
      const response = await apiFetch<{ data: ProgramCategoryOption }>("/api/v1/program-categories", {
        body: JSON.stringify({ name: newCategory }),
        method: "POST",
      });
      await categories.refetch();
      onChange({ category_id: response.data.id });
      setNewCategory("");
      setAdding(false);
    } catch (failure) {
      setCategoryError(failure instanceof Error ? failure.message : "Kategori belum tersimpan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <fieldset className="program-classification">
      <legend>Kategori & klasifikasi</legend>

      <div className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="category_id" className="required">
            Kategori program
          </Label>
          <div className="flex gap-1">
            <CanAccess action="manage" resource="program_categories">
              <Button size="sm" type="button" variant="ghost" onClick={() => setAdding((current) => !current)}>
                <Plus aria-hidden className="size-4" /> Kategori baru
              </Button>
              <Link className="program-classification__manage" to="/programs/categories">
                <Settings2 aria-hidden className="size-4" /> Kelola
              </Link>
            </CanAccess>
          </div>
        </div>
        <select
          className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
          disabled={categories.isLoading}
          id="category_id"
          value={value.category_id}
          onChange={(event) => onChange({ category_id: event.target.value })}
        >
          <option value="">{categories.isLoading ? "Memuat kategori…" : "-- Pilih kategori --"}</option>
          {options.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
              {category.status === "inactive" ? " (nonaktif)" : ""}
            </option>
          ))}
        </select>
        {!categories.isLoading && options.length === 0 ? (
          <p className="text-muted-foreground text-xs">Belum ada kategori. Klik &ldquo;Kategori baru&rdquo; untuk membuat.</p>
        ) : null}
        {adding ? (
          <div className="program-classification__add">
            <Input
              aria-label="Nama kategori baru"
              autoFocus
              placeholder="Mis. Beasiswa santri penghafal Qur'an"
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  if (newCategory.trim().length >= 3) void addCategory();
                }
              }}
            />
            <Button disabled={saving || newCategory.trim().length < 3} size="sm" type="button" onClick={() => void addCategory()}>
              {saving ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        ) : null}
        {categoryError ? <p className="text-destructive text-xs">{categoryError}</p> : null}
        {errors?.category_id ? <p className="text-destructive text-xs">{errors.category_id}</p> : null}
      </div>

      <div className="space-y-1">
        <Label className="required">Klasifikasi amanah</Label>
        <p className="text-muted-foreground text-xs">
          Boleh lebih dari satu (mis. zakat + sedekah). Tanda <Star aria-hidden className="inline size-3" /> = klasifikasi utama untuk pembukuan; klik bintang untuk mengganti.
        </p>
        <div className="program-chip-grid">
          {fundTypes.map((type) => {
            const selected = value.fund_types.includes(type);
            const primary = value.fund_type === type && selected;
            return (
              <div className="program-chip" data-selected={selected} key={type}>
                <label>
                  <input
                    checked={selected}
                    type="checkbox"
                    onChange={() => {
                      const result = toggle(value.fund_types, type, value.fund_type);
                      onChange({ fund_type: result.primary, fund_types: result.next });
                    }}
                  />
                  {fundTypeLabels[type]}
                </label>
                {selected && value.fund_types.length > 1 ? (
                  <button
                    aria-label={primary ? `${fundTypeLabels[type]} klasifikasi utama` : `Jadikan ${fundTypeLabels[type]} klasifikasi utama`}
                    aria-pressed={primary}
                    type="button"
                    onClick={() => onChange({ fund_type: type })}
                  >
                    <Star aria-hidden className="size-3.5" />
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
        {errors?.fund_types ? <p className="text-destructive text-xs">{errors.fund_types}</p> : null}
      </div>

      <div className="space-y-1">
        <Label className="required">Tipe penerima manfaat</Label>
        <p className="text-muted-foreground text-xs">Pilih semua tipe yang dilayani program ini.</p>
        <div className="program-chip-grid">
          {targetBeneficiaryTypes.map((type) => {
            const selected = value.target_beneficiary_types.includes(type);
            return (
              <div className="program-chip" data-selected={selected} key={type}>
                <label>
                  <input
                    checked={selected}
                    type="checkbox"
                    onChange={() => {
                      const result = toggle(value.target_beneficiary_types, type, value.target_beneficiary_type);
                      onChange({ target_beneficiary_type: result.primary, target_beneficiary_types: result.next });
                    }}
                  />
                  {targetBeneficiaryTypeLabels[type]}
                </label>
              </div>
            );
          })}
        </div>
        {errors?.target_beneficiary_types ? (
          <p className="text-destructive text-xs">{errors.target_beneficiary_types}</p>
        ) : null}
      </div>
    </fieldset>
  );
}
