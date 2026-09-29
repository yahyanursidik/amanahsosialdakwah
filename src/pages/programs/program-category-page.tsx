import { useQuery } from "@tanstack/react-query";
import { Pencil, Plus, Save, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import {
  EmptyState,
  ErrorState,
  PageHeader,
  ResourceTable,
  StatusBadge,
  type ResourceTableColumn,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrganization } from "@/features/organizations/organization-context";
import type { ProgramCategoryOption } from "@/features/programs/components/program-classification-fields";
import { apiFetch } from "@/lib/neon/http";

type Draft = { code: string; description: string; name: string; status: "active" | "inactive" };

const emptyDraft: Draft = { code: "", description: "", name: "", status: "active" };

export function ProgramCategoryPage() {
  const { activeOrganization } = useOrganization();
  const organizationId = activeOrganization?.organization.$id ?? "";
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const categories = useQuery({
    enabled: Boolean(organizationId),
    queryFn: () => apiFetch<{ data: ProgramCategoryOption[] }>("/api/v1/program-categories"),
    queryKey: ["program-categories", organizationId],
  });
  const rows = (categories.data?.data ?? []).filter((category) =>
    `${category.name} ${category.code}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const startEdit = (category: ProgramCategoryOption | null) => {
    setError("");
    setEditingId(category?.id ?? "new");
    setDraft(
      category
        ? { code: category.code, description: category.description ?? "", name: category.name, status: category.status }
        : emptyDraft,
    );
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await apiFetch(editingId === "new" ? "/api/v1/program-categories" : `/api/v1/program-categories/${editingId}`, {
        body: JSON.stringify({
          code: draft.code || undefined,
          description: draft.description || undefined,
          name: draft.name,
          status: draft.status,
        }),
        method: editingId === "new" ? "POST" : "PUT",
      });
      setEditingId(null);
      await categories.refetch();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Kategori belum tersimpan.");
    } finally {
      setSaving(false);
    }
  };

  const columns: ResourceTableColumn<ProgramCategoryOption>[] = [
    {
      header: "Kategori",
      key: "name",
      render: (item) => (
        <div className="crm-contact-cell">
          <strong>{item.name}</strong>
          <small>{item.description || "—"}</small>
        </div>
      ),
    },
    { header: "Kode", key: "code", render: (item) => <code>{item.code}</code> },
    {
      align: "right",
      header: "Program",
      key: "program_count",
      render: (item) =>
        item.program_count > 0 ? (
          <Link to={`/programs?category=${item.id}`}>{item.program_count} program</Link>
        ) : (
          <small>—</small>
        ),
    },
    {
      header: "Status",
      key: "status",
      render: (item) => (
        <StatusBadge tone={item.status === "active" ? "success" : "neutral"}>
          {item.status === "active" ? "Aktif" : "Nonaktif"}
        </StatusBadge>
      ),
    },
  ];

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow="Program & pengajuan"
        title="Kategori program"
        description="Kelompokkan program sesuai kebutuhan lembaga, mis. pangan, pendidikan, kesehatan, dakwah, tanggap bencana. Kategori nonaktif tidak muncul di form program baru, tetapi program lama tetap aman."
        actions={
          <div className="flex gap-2">
            <Link className={buttonVariants({ variant: "outline" })} to="/programs">
              Daftar program
            </Link>
            <Button onClick={() => startEdit(null)}>
              <Plus aria-hidden size={16} /> Kategori baru
            </Button>
          </div>
        }
      />

      {editingId ? (
        <form
          className="category-editor"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <strong>{editingId === "new" ? "Kategori baru" : "Ubah kategori"}</strong>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="category-name">Nama *</Label>
              <Input id="category-name" minLength={3} required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Mis. Beasiswa santri" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="category-code">Kode</Label>
              <Input id="category-code" maxLength={30} value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value.toUpperCase() })} placeholder="Otomatis dari nama" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="category-status">Status</Label>
              <select className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm" id="category-status" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Draft["status"] })}>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </div>
            <div className="space-y-1 sm:col-span-4">
              <Label htmlFor="category-description">Keterangan</Label>
              <Input id="category-description" maxLength={500} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
            </div>
          </div>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <div className="flex gap-2">
            <Button disabled={saving || draft.name.trim().length < 3} type="submit">
              <Save aria-hidden size={16} /> {saving ? "Menyimpan…" : "Simpan"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditingId(null)}>
              <X aria-hidden size={16} /> Batal
            </Button>
          </div>
        </form>
      ) : null}

      <input
        aria-label="Cari kategori"
        className="min-w-64 rounded-xl border px-3 py-2"
        placeholder="Cari kategori…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {categories.isError ? (
        <ErrorState title="Kategori belum dapat dimuat" onRetry={() => categories.refetch()} />
      ) : (
        <ResourceTable
          ariaLabel="Daftar kategori program"
          columns={columns}
          empty={<EmptyState title="Belum ada kategori" description="Buat kategori pertama untuk mengelompokkan program." />}
          getRowId={(item) => item.id}
          isLoading={categories.isLoading}
          items={rows}
          rowActions={(item) =>
            item.is_global ? (
              <small>Bawaan sistem</small>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => startEdit(item)}>
                <Pencil aria-hidden size={14} /> Ubah
              </Button>
            )
          }
        />
      )}
    </section>
  );
}
