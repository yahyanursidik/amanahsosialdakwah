import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PageHeader,
} from "@/components/design-system";
import { buttonVariants } from "@/components/ui/button-variants";
import { Label } from "@/components/ui/label";
import { TaskCard } from "@/features/field/task-card";
import type { FieldTask } from "@/features/field/types";
import { fieldTaskStatusLabels, optionsOf } from "@/features/giving/labels";
import { useOrganization } from "@/features/organizations/organization-context";
import { apiFetch } from "@/lib/neon/http";

export type FieldMember = {
  display_name: string;
  email: string | null;
  id: string;
  roles: string[];
};

type TaskList = { data: FieldTask[]; meta: { total: number } };

export function FieldTaskListPage() {
  const { activeOrganization } = useOrganization();
  const organizationId = activeOrganization?.organization.$id ?? "";
  const [status, setStatus] = useState("open");
  const [assignee, setAssignee] = useState("");
  const [search, setSearch] = useState("");

  const members = useQuery({
    enabled: Boolean(organizationId),
    queryFn: () => apiFetch<{ data: FieldMember[] }>("/api/v1/field/members"),
    queryKey: ["field", "members", organizationId],
  });
  const tasks = useQuery({
    enabled: Boolean(organizationId),
    queryFn: () => {
      const query = new URLSearchParams({ pageSize: "100" });
      if (status) query.set("status", status);
      if (assignee) query.set("assigned_profile_id", assignee);
      if (search.trim()) query.set("q", search.trim());
      return apiFetch<TaskList>(`/api/v1/field/tasks?${query.toString()}`);
    },
    queryKey: ["field", "tasks", organizationId, status, assignee, search],
  });
  const rows = tasks.data?.data ?? [];

  return (
    <section className="workspace-page field-page">
      <PageHeader
        eyebrow="Lapangan"
        title="Kelola tugas lapangan"
        description="Buat to-do berceklis untuk petugas: salurkan dana/barang, verifikasi, antar, atau pantau penerima. Pantau progresnya di sini."
        actions={
          <Link className={buttonVariants({})} to="/field/tasks/new">
            <Plus aria-hidden size={16} /> Buat tugas
          </Link>
        }
      />

      <div className="task-filters">
        <div className="auth-field">
          <Label htmlFor="task-status">Status</Label>
          <select id="task-status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="open">Belum selesai</option>
            <option value="">Semua</option>
            {optionsOf(fieldTaskStatusLabels).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="auth-field">
          <Label htmlFor="task-assignee">Petugas</Label>
          <select id="task-assignee" value={assignee} onChange={(event) => setAssignee(event.target.value)}>
            <option value="">Semua petugas</option>
            {(members.data?.data ?? []).map((member) => (
              <option key={member.id} value={member.id}>
                {member.display_name}
              </option>
            ))}
          </select>
        </div>
        <div className="auth-field">
          <Label htmlFor="task-search">Cari</Label>
          <input id="task-search" placeholder="Judul, nomor, atau penerima" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
      </div>

      {tasks.isLoading ? <LoadingSkeleton lines={6} /> : null}
      {tasks.isError ? <ErrorState title="Tugas belum dapat dimuat" onRetry={() => tasks.refetch()} /> : null}
      {tasks.data ? (
        <div className="field-list">
          <small className="task-count">{tasks.data.meta.total} tugas</small>
          {rows.length === 0 ? (
            <EmptyState title="Belum ada tugas" description="Buat tugas pertama, misalnya penyaluran paket sembako dan santunan ke beberapa penerima sekaligus." />
          ) : (
            rows.map((task) => <TaskCard key={task.id} showAssignee task={task} />)
          )}
        </div>
      ) : null}
    </section>
  );
}
