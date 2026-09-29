import { useQuery } from "@tanstack/react-query";
import { Pencil, Save, UserPlus, X } from "lucide-react";
import { useState } from "react";

import { CanAccess } from "@/components/access-control/can-access";
import {
  EmptyState,
  ErrorState,
  PageHeader,
  ResourceTable,
  StatusBadge,
  type ResourceTableColumn,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrganization } from "@/features/organizations/organization-context";
import { apiFetch } from "@/lib/neon/http";

import type { AdminRole } from "./roles-page";

type Member = {
  display_name: string;
  email: string;
  id: string;
  joined_at: string;
  last_activity_at: string | null;
  profile_id: string;
  roles: Array<{ id: string; key: string; name: string }>;
  status: "active" | "inactive" | "invited" | "suspended";
};

const statusLabels: Record<string, string> = {
  active: "Aktif",
  inactive: "Nonaktif",
  invited: "Diundang",
  suspended: "Ditangguhkan",
};

function RolePicker({ onChange, roles, selected }: { onChange: (ids: string[]) => void; roles: AdminRole[]; selected: string[] }) {
  return (
    <div className="admin-role-picker">
      {roles.map((role) => (
        <label data-selected={selected.includes(role.id)} key={role.id}>
          <input
            checked={selected.includes(role.id)}
            type="checkbox"
            onChange={() =>
              onChange(selected.includes(role.id) ? selected.filter((id) => id !== role.id) : [...selected, role.id])
            }
          />
          <span>
            <strong>{role.name}</strong>
            {role.description ? <small>{role.description}</small> : null}
          </span>
        </label>
      ))}
    </div>
  );
}

export function MembersPage() {
  const { activeOrganization, user } = useOrganization();
  const organizationId = activeOrganization?.organization.$id ?? "";
  const [editing, setEditing] = useState<{ id: string; roleIds: string[]; status: Member["status"] } | null>(null);
  const [adding, setAdding] = useState(false);
  const [newMember, setNewMember] = useState({ email: "", roleIds: [] as string[] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const members = useQuery({
    enabled: Boolean(organizationId),
    queryFn: () => apiFetch<{ data: Member[] }>("/api/v1/admin/members"),
    queryKey: ["admin", "members", organizationId],
  });
  const roles = useQuery({
    enabled: Boolean(organizationId),
    queryFn: () => apiFetch<{ data: { roles: AdminRole[] } }>("/api/v1/admin/roles"),
    queryKey: ["admin", "roles", organizationId],
  });
  const roleOptions = roles.data?.data.roles ?? [];
  const rows = (members.data?.data ?? []).filter((member) =>
    `${member.display_name} ${member.email}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await action();
      await members.refetch();
      return true;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Perubahan belum tersimpan.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const columns: ResourceTableColumn<Member>[] = [
    {
      header: "Anggota",
      key: "name",
      render: (member) => (
        <div className="crm-contact-cell">
          <strong>
            {member.display_name}
            {member.profile_id === user?.$id ? " (Anda)" : ""}
          </strong>
          <small>{member.email}</small>
        </div>
      ),
    },
    {
      header: "Peran",
      key: "roles",
      render: (member) =>
        editing?.id === member.id ? (
          <RolePicker roles={roleOptions} selected={editing.roleIds} onChange={(roleIds) => setEditing({ ...editing, roleIds })} />
        ) : (
          <div className="flex flex-wrap gap-1">
            {member.roles.length === 0 ? <StatusBadge tone="warning">Belum ada peran</StatusBadge> : null}
            {member.roles.map((role) => (
              <StatusBadge key={role.id} tone="info">{role.name}</StatusBadge>
            ))}
          </div>
        ),
    },
    {
      header: "Status",
      key: "status",
      render: (member) =>
        editing?.id === member.id ? (
          <select
            aria-label="Status anggota"
            className="border-input bg-background h-9 rounded-md border px-2 text-sm"
            value={editing.status}
            onChange={(event) => setEditing({ ...editing, status: event.target.value as Member["status"] })}
          >
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
            <option value="suspended">Ditangguhkan</option>
          </select>
        ) : (
          <StatusBadge tone={member.status === "active" ? "success" : "neutral"}>{statusLabels[member.status] ?? member.status}</StatusBadge>
        ),
    },
    {
      header: "Aktivitas terakhir",
      key: "activity",
      render: (member) => (
        <small>
          {member.last_activity_at ? new Date(member.last_activity_at).toLocaleDateString("id-ID", { dateStyle: "medium" }) : "—"}
          <br />
          bergabung {new Date(member.joined_at).toLocaleDateString("id-ID", { dateStyle: "medium" })}
        </small>
      ),
    },
  ];

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow="Tata kelola"
        title="Anggota & peran"
        description="Atur siapa saja yang bekerja di organisasi ini dan perannya. Peran menentukan menu dan data yang bisa diakses."
        actions={
          <CanAccess action="manage" resource="memberships">
            <Button onClick={() => { setAdding(true); setError(""); }}>
              <UserPlus aria-hidden size={16} /> Tambah anggota
            </Button>
          </CanAccess>
        }
      />

      {adding ? (
        <form
          className="category-editor"
          onSubmit={(event) => {
            event.preventDefault();
            void run(() =>
              apiFetch("/api/v1/admin/members", {
                body: JSON.stringify({ email: newMember.email, role_ids: newMember.roleIds }),
                method: "POST",
              }),
            ).then((ok) => {
              if (ok) {
                setAdding(false);
                setNewMember({ email: "", roleIds: [] });
              }
            });
          }}
        >
          <strong>Tambah anggota</strong>
          <p className="text-muted-foreground text-sm">
            Masukkan email orang yang sudah pernah masuk ke aplikasi. Bila belum punya akun, minta ia mendaftar/masuk sekali terlebih dahulu.
          </p>
          <div className="space-y-1">
            <Label htmlFor="member-email">Email *</Label>
            <Input id="member-email" required type="email" value={newMember.email} onChange={(event) => setNewMember({ ...newMember, email: event.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Peran *</Label>
            <RolePicker roles={roleOptions} selected={newMember.roleIds} onChange={(roleIds) => setNewMember({ ...newMember, roleIds })} />
          </div>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <div className="flex gap-2">
            <Button disabled={busy || newMember.roleIds.length === 0} type="submit">
              <Save aria-hidden size={16} /> {busy ? "Menyimpan…" : "Tambahkan"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
              <X aria-hidden size={16} /> Batal
            </Button>
          </div>
        </form>
      ) : null}

      {!adding && error ? <p className="text-destructive text-sm" role="alert">{error}</p> : null}

      <input
        aria-label="Cari anggota"
        className="min-w-64 rounded-xl border px-3 py-2"
        placeholder="Cari nama atau email…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {members.isError ? (
        <ErrorState title="Daftar anggota belum dapat dimuat" onRetry={() => members.refetch()} />
      ) : (
        <ResourceTable
          ariaLabel="Daftar anggota"
          columns={columns}
          empty={<EmptyState title="Belum ada anggota" />}
          getRowId={(member) => member.id}
          isLoading={members.isLoading}
          items={rows}
          rowActions={(member) => (
            <CanAccess action="manage" resource="memberships">
              {editing?.id === member.id ? (
                <div className="flex gap-1">
                  <Button
                    disabled={busy || editing.roleIds.length === 0}
                    size="sm"
                    onClick={() =>
                      void run(() =>
                        apiFetch(`/api/v1/admin/members/${member.id}`, {
                          body: JSON.stringify({ role_ids: editing.roleIds, status: editing.status }),
                          method: "PUT",
                        }),
                      ).then((ok) => ok && setEditing(null))
                    }
                  >
                    <Save aria-hidden size={14} /> Simpan
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                    Batal
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setError("");
                    setEditing({ id: member.id, roleIds: member.roles.map((role) => role.id), status: member.status });
                  }}
                >
                  <Pencil aria-hidden size={14} /> Ubah
                </Button>
              )}
            </CanAccess>
          )}
        />
      )}
    </section>
  );
}
