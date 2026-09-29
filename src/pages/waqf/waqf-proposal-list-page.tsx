import { useList, useNavigation } from "@refinedev/core";
import { Eye, FilePlus2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { ProtectedActionButton } from "@/components/access-control/protected-action-button";
import {
  EmptyState,
  ErrorState,
  MoneyDisplay,
  PageHeader,
  ResourceTable,
  StatusBadge,
  type ResourceTableColumn,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  labelOf,
  optionsOf,
  proposalStatusLabels,
  proposerTypeLabels,
  toneOf,
  waqfProposalTypeLabels,
} from "@/features/giving/labels";
import type { WaqfProposal } from "@/features/waqf/types";

export function WaqfProposalListPage() {
  const { create, show } = useNavigation();
  const [status, setStatus] = useState("");
  const [proposalType, setProposalType] = useState("");
  const [search, setSearch] = useState("");
  const proposals = useList<WaqfProposal>({
    resource: "waqf_proposals",
    filters: [
      { field: "status", operator: "eq", value: status },
      { field: "proposal_type", operator: "eq", value: proposalType },
      { field: "q", operator: "eq", value: search },
    ],
    pagination: { currentPage: 1, pageSize: 50, mode: "server" },
  });

  const columns: ResourceTableColumn<WaqfProposal>[] = [
    {
      key: "title",
      header: "Pengajuan",
      render: (item) => (
        <div className="crm-contact-cell">
          <strong>{item.title}</strong>
          <small>
            {item.reference_number} ·{" "}
            {labelOf(waqfProposalTypeLabels, item.proposal_type)}
          </small>
        </div>
      ),
    },
    {
      key: "proposer",
      header: "Pengaju",
      render: (item) => (
        <div className="crm-contact-cell">
          <strong>{item.proposer_name}</strong>
          <small>{labelOf(proposerTypeLabels, item.proposer_type)}</small>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Kebutuhan",
      align: "right",
      render: (item) =>
        item.requested_amount ? (
          <MoneyDisplay amount={item.requested_amount} currency={item.currency} />
        ) : (
          "—"
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => (
        <StatusBadge tone={toneOf(item.status)}>
          {labelOf(proposalStatusLabels, item.status)}
        </StatusBadge>
      ),
    },
  ];

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow="Wakaf"
        title="Pengajuan program wakaf"
        description="Tampung usulan dari individu maupun lembaga: proyek wakaf baru, penawaran aset oleh calon wakif, dan permohonan manfaat dari aset wakaf aktif."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link className={buttonVariants({ variant: "outline" })} to="/waqf">
              Aset wakaf
            </Link>
            <ProtectedActionButton
              action="manage"
              resource="waqf_proposals"
              onClick={() => create("waqf_proposals")}
            >
              <FilePlus2 size={16} /> Pengajuan baru
            </ProtectedActionButton>
          </div>
        }
      />
      <ol className="process-steps" aria-label="Alur pengajuan wakaf">
        <li>
          <strong>1. Catat</strong>
          <span>Petugas mencatat usulan dan pengajunya.</span>
        </li>
        <li>
          <strong>2. Ajukan</strong>
          <span>Draft dikirim untuk dinilai.</span>
        </li>
        <li>
          <strong>3. Nilai</strong>
          <span>Penilai berbeda menyetujui/menolak dengan catatan.</span>
        </li>
        <li>
          <strong>4. Teruskan</strong>
          <span>Sistem membuat aset wakaf atau rencana pemanfaatan.</span>
        </li>
      </ol>
      <div className="flex flex-wrap gap-3">
        <input
          aria-label="Cari pengajuan"
          className="min-w-64 flex-1 rounded-xl border px-3 py-2"
          placeholder="Cari judul, nomor, atau pengaju…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          aria-label="Jenis pengajuan"
          className="rounded-xl border px-3 py-2"
          value={proposalType}
          onChange={(event) => setProposalType(event.target.value)}
        >
          <option value="">Semua jenis</option>
          {optionsOf(waqfProposalTypeLabels).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Status"
          className="rounded-xl border px-3 py-2"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">Semua status</option>
          {optionsOf(proposalStatusLabels).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {proposals.query.isError ? (
        <ErrorState
          title="Pengajuan wakaf tidak dapat dimuat"
          description="Periksa organisasi aktif dan izin wakaf."
          onRetry={() => proposals.query.refetch()}
        />
      ) : (
        <ResourceTable
          columns={columns}
          items={proposals.result?.data ?? []}
          getRowId={(item) => item.id}
          isLoading={proposals.query.isLoading}
          empty={
            <EmptyState
              title="Belum ada pengajuan wakaf"
              description="Catat usulan pertama dari lembaga mitra atau individu."
            />
          }
          rowActions={(item) => (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => show("waqf_proposals", item.id)}
            >
              <Eye aria-hidden size={16} />
              <span className="sr-only">Lihat {item.reference_number}</span>
            </Button>
          )}
        />
      )}
    </section>
  );
}
