import { useQuery } from "@tanstack/react-query";
import { Copy, Lock, Plus, Save } from "lucide-react";
import { useState } from "react";

import { CanAccess } from "@/components/access-control/can-access";
import { ErrorState, LoadingSkeleton, PageHeader, StatusBadge } from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  actionLabel,
  permissionModules,
  resourceLabel,
} from "@/features/access-control/permission-labels";
import { useOrganization } from "@/features/organizations/organization-context";
import { apiFetch } from "@/lib/neon/http";

export type AdminRole = {
  description: string | null;
  id: string;
  is_global: boolean;
  is_system: boolean;
  key: string;
  member_count: number;
  name: string;
  permission_keys: string[];
};

type Permission = { action: string; description: string | null; id: string; key: string; resource: string };

type Draft = { description: string; id: string | null; name: string; permissions: Set<string> };

function groupPermissions(permissions: Permission[]) {
  const byResource = new Map<string, Permission[]>();
  for (const permission of permissions) {
    byResource.set(permission.resource, [...(byResource.get(permission.resource) ?? []), permission]);
  }
  const known = new Set(permissionModules.flatMap((module) => module.resources));
  const modules = permissionModules.map((module) => ({
    label: module.label,
    resources: module.resources.filter((resource) => byResource.has(resource)),
  }));
  const others = [...byResource.keys()].filter((resource) => !known.has(resource));
  if (others.length > 0) modules.push({ label: "Lainnya", resources: others });
  return { byResource, modules: modules.filter((module) => module.resources.length > 0) };
}

export function RolesPage() {
  const { activeOrganization } = useOrganization();
  const organizationId = activeOrganization?.organization.$id ?? "";
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const query = useQuery({
    enabled: Boolean(organizationId),
    queryFn: () => apiFetch<{ data: { permissions: Permission[]; roles: AdminRole[] } }>("/api/v1/admin/roles"),
    queryKey: ["admin", "roles", organizationId],
  });
  const roles = query.data?.data.roles ?? [];
  const permissions = query.data?.data.permissions ?? [];
  const { byResource, modules } = groupPermissions(permissions);
  const selected = roles.find((role) => role.id === selectedId) ?? roles[0];
  const editing = draft !== null;
  const granted = editing ? draft.permissions : new Set(selected?.permission_keys ?? []);

  const startDraft = (base: AdminRole | null, copy: boolean) => {
    setMessage("");
    setDraft({
      description: base && !copy ? (base.description ?? "") : "",
      id: base && !copy ? base.id : null,
      name: base ? (copy ? `${base.name} (khusus)` : base.name) : "",
      permissions: new Set(base?.permission_keys ?? []),
    });
  };

  const toggle = (key: string) => {
    if (!draft) return;
    const next = new Set(draft.permissions);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setDraft({ ...draft, permissions: next });
  };

  const toggleResource = (resource: string, value: boolean) => {
    if (!draft) return;
    const next = new Set(draft.permissions);
    for (const permission of byResource.get(resource) ?? []) {
      if (value) next.add(permission.key);
      else next.delete(permission.key);
    }
    setDraft({ ...draft, permissions: next });
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setMessage("");
    try {
      const body = JSON.stringify({
        description: draft.description || undefined,
        name: draft.name,
        permission_keys: [...draft.permissions],
      });
      const response = await apiFetch<{ data: { id: string } }>(
        draft.id ? `/api/v1/admin/roles/${draft.id}` : "/api/v1/admin/roles",
        { body, method: draft.id ? "PUT" : "POST" },
      );
      await query.refetch();
      setSelectedId(response.data.id);
      setDraft(null);
      setMessage("Peran tersimpan. Anggota dengan peran ini mendapat hak akses baru saat memuat ulang halaman.");
    } catch (failure) {
      setMessage(failure instanceof Error ? failure.message : "Peran belum tersimpan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow="Tata kelola"
        title="Hak akses per peran"
        description="Lihat apa saja yang boleh dilakukan setiap peran. Peran bawaan sistem tidak dapat diubah, tetapi dapat diduplikat menjadi peran khusus lembaga lalu disesuaikan."
        actions={
          <CanAccess action="manage" resource="roles">
            <Button onClick={() => startDraft(null, false)}>
              <Plus aria-hidden size={16} /> Peran baru
            </Button>
          </CanAccess>
        }
      />
      {query.isLoading ? <LoadingSkeleton lines={8} /> : null}
      {query.isError ? <ErrorState title="Peran belum dapat dimuat" onRetry={() => query.refetch()} /> : null}
      {message ? <p className="field-notice" role="status">{message}</p> : null}

      {roles.length > 0 ? (
        <div className="admin-roles">
          <aside className="admin-roles__list" aria-label="Daftar peran">
            {roles.map((role) => (
              <button
                aria-pressed={!editing && selected?.id === role.id}
                key={role.id}
                type="button"
                onClick={() => {
                  setDraft(null);
                  setSelectedId(role.id);
                }}
              >
                <strong>
                  {role.is_global ? <Lock aria-hidden className="inline" size={12} /> : null} {role.name}
                </strong>
                <small>
                  {role.member_count} anggota · {role.permission_keys.length} hak akses
                </small>
              </button>
            ))}
          </aside>

          <div className="admin-roles__detail">
            {editing ? (
              <div className="category-editor">
                <strong>{draft.id ? "Ubah peran khusus" : "Peran khusus baru"}</strong>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="role-name">Nama peran *</Label>
                    <Input id="role-name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Mis. Staf keuangan" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="role-description">Keterangan</Label>
                    <Input id="role-description" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button disabled={saving || draft.name.trim().length < 3 || draft.permissions.size === 0} onClick={() => void save()}>
                    <Save aria-hidden size={16} /> {saving ? "Menyimpan…" : `Simpan (${draft.permissions.size} hak akses)`}
                  </Button>
                  <Button variant="ghost" onClick={() => setDraft(null)}>
                    Batal
                  </Button>
                </div>
              </div>
            ) : selected ? (
              <header className="admin-roles__header">
                <div>
                  <h2>{selected.name}</h2>
                  <p>{selected.description ?? (selected.is_global ? "Peran bawaan sistem." : "Peran khusus lembaga.")}</p>
                </div>
                <CanAccess action="manage" resource="roles">
                  <div className="flex flex-wrap gap-2">
                    {selected.is_global ? null : (
                      <Button size="sm" variant="outline" onClick={() => startDraft(selected, false)}>
                        Ubah hak akses
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => startDraft(selected, true)}>
                      <Copy aria-hidden size={14} /> Duplikat jadi peran khusus
                    </Button>
                  </div>
                </CanAccess>
              </header>
            ) : null}

            {modules.map((module) => (
              <details className="admin-permissions" key={module.label} open={editing}>
                <summary>
                  {module.label}
                  <StatusBadge tone="neutral">
                    {module.resources.reduce(
                      (count, resource) => count + (byResource.get(resource) ?? []).filter((permission) => granted.has(permission.key)).length,
                      0,
                    )}{" "}
                    / {module.resources.reduce((count, resource) => count + (byResource.get(resource) ?? []).length, 0)}
                  </StatusBadge>
                </summary>
                <table>
                  <tbody>
                    {module.resources.map((resource) => {
                      const list = byResource.get(resource) ?? [];
                      const all = list.every((permission) => granted.has(permission.key));
                      return (
                        <tr key={resource}>
                          <th scope="row">
                            {editing ? (
                              <label>
                                <input checked={all} type="checkbox" onChange={(event) => toggleResource(resource, event.target.checked)} />
                                {resourceLabel(resource)}
                              </label>
                            ) : (
                              resourceLabel(resource)
                            )}
                          </th>
                          <td>
                            <div className="admin-permission-actions">
                              {list.map((permission) =>
                                editing ? (
                                  <label data-granted={granted.has(permission.key)} key={permission.key} title={permission.description ?? ""}>
                                    <input checked={granted.has(permission.key)} type="checkbox" onChange={() => toggle(permission.key)} />
                                    {actionLabel(permission.action)}
                                  </label>
                                ) : (
                                  <span data-granted={granted.has(permission.key)} key={permission.key} title={permission.description ?? ""}>
                                    {actionLabel(permission.action)}
                                  </span>
                                ),
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </details>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
