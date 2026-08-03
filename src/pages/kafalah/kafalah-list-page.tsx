import { useCustomMutation, useList, useNavigation } from "@refinedev/core";
import { Eye, HandCoins, Link2, Plus } from "lucide-react";

import { CanAccess } from "@/components/access-control/can-access";
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
import type {
  KafalahContract,
  KafalahMatch,
  KafalahNeed,
} from "@/features/kafalah/types";

const tone = (status: string) => {
  if (["active", "approved", "fulfilled", "completed"].includes(status))
    return "success" as const;
  if (["cancelled", "rejected"].includes(status)) return "danger" as const;
  if (["matched", "proposed"].includes(status)) return "info" as const;
  return "neutral" as const;
};

export function KafalahListPage() {
  const { create, show } = useNavigation();
  const needs = useList<KafalahNeed>({
    resource: "kafalah_needs",
    pagination: { currentPage: 1, pageSize: 50, mode: "server" },
  });
  const matches = useList<KafalahMatch>({
    resource: "kafalah_matches",
    pagination: { currentPage: 1, pageSize: 50, mode: "server" },
  });
  const contracts = useList<KafalahContract>({
    resource: "kafalah_contracts",
    pagination: { currentPage: 1, pageSize: 50, mode: "server" },
  });
  const approval = useCustomMutation();
  const refresh = () => {
    void needs.query.refetch();
    void matches.query.refetch();
    void contracts.query.refetch();
  };
  if (needs.query.isError || matches.query.isError || contracts.query.isError)
    return (
      <section className="workspace-page">
        <PageHeader eyebrow="Program & layanan" title="Kafalah" />
        <ErrorState
          title="Data Kafalah tidak dapat dimuat"
          description="Periksa organisasi aktif dan permission Kafalah."
          onRetry={refresh}
        />
      </section>
    );

  const needColumns: ResourceTableColumn<KafalahNeed>[] = [
    {
      key: "need",
      header: "Kebutuhan",
      render: (item) => (
        <div className="crm-contact-cell">
          <strong>{item.title}</strong>
          <small>
            {item.reference_number} · {item.beneficiary_name}
          </small>
        </div>
      ),
    },
    {
      key: "type",
      header: "Jenis",
      render: (item) => item.need_type.replaceAll("_", " "),
    },
    {
      key: "amount",
      header: "Nilai / Matching",
      render: (item) => (
        <div className="crm-contact-cell">
          <MoneyDisplay
            amount={item.approved_amount}
            currency={item.currency}
          />
          <small>
            Terpasang:{" "}
            <MoneyDisplay
              amount={item.matched_amount}
              currency={item.currency}
            />
          </small>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => (
        <StatusBadge tone={tone(item.status)}>{item.status}</StatusBadge>
      ),
    },
  ];
  const matchColumns: ResourceTableColumn<KafalahMatch>[] = [
    {
      key: "reference",
      header: "Matching",
      render: (item) => (
        <div className="crm-contact-cell">
          <strong>{item.reference_number}</strong>
          <small>{item.need_title}</small>
        </div>
      ),
    },
    {
      key: "parties",
      header: "Kafil → Penerima",
      render: (item) => `${item.sponsor_name} → ${item.beneficiary_name}`,
    },
    {
      key: "amount",
      header: "Nilai",
      render: (item) => (
        <MoneyDisplay amount={item.matched_amount} currency="IDR" />
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => (
        <StatusBadge tone={tone(item.status)}>{item.status}</StatusBadge>
      ),
    },
  ];
  const contractColumns: ResourceTableColumn<KafalahContract>[] = [
    {
      key: "reference",
      header: "Kontrak",
      render: (item) => (
        <div className="crm-contact-cell">
          <strong>{item.reference_number}</strong>
          <small>{item.match_reference}</small>
        </div>
      ),
    },
    {
      key: "parties",
      header: "Kafil → Penerima",
      render: (item) => `${item.sponsor_name} → ${item.beneficiary_name}`,
    },
    {
      key: "period",
      header: "Periode",
      render: (item) => `${item.start_date} – ${item.end_date}`,
    },
    {
      key: "status",
      header: "Status",
      render: (item) => (
        <StatusBadge tone={tone(item.status)}>{item.status}</StatusBadge>
      ),
    },
  ];

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow="Program & layanan"
        title="Kafalah"
        description="Kelola kebutuhan, pemasangan kafil, kontrak, pembayaran, penyaluran, monitoring, dan perpanjangan dalam satu jejak amanah."
        actions={
          <>
            <ProtectedActionButton
              action="manage"
              resource="kafalah_needs"
              onClick={() => create("kafalah_needs")}
            >
              <Plus size={16} /> Kebutuhan
            </ProtectedActionButton>
            <ProtectedActionButton
              action="manage"
              resource="kafalah_matches"
              onClick={() => create("kafalah_matches")}
            >
              <Link2 size={16} /> Matching
            </ProtectedActionButton>
            <ProtectedActionButton
              action="manage"
              resource="kafalah_contracts"
              onClick={() => create("kafalah_contracts")}
            >
              <HandCoins size={16} /> Kontrak
            </ProtectedActionButton>
          </>
        }
      />
      {approval.mutation.isError ? (
        <ErrorState
          title="Approval ditolak"
          description={
            approval.mutation.error?.message ??
            "Periksa maker-checker dan status kebutuhan."
          }
        />
      ) : null}
      <div className="section-heading">
        <div>
          <h2>Kebutuhan penerima</h2>
          <p>
            Kebutuhan harus disetujui aktor berbeda sebelum dapat dipasangkan.
          </p>
        </div>
      </div>
      <ResourceTable
        columns={needColumns}
        items={needs.result?.data ?? []}
        getRowId={(item) => item.id}
        isLoading={needs.query.isLoading}
        empty={
          <EmptyState
            title="Belum ada kebutuhan Kafalah"
            description="Catat kebutuhan penerima manfaat untuk memulai alur."
          />
        }
        rowActions={(item) =>
          item.status === "draft" ? (
            <CanAccess action="approve" resource="kafalah_needs">
              <Button
                size="sm"
                variant="outline"
                disabled={approval.mutation.isPending}
                onClick={() =>
                  approval.mutate(
                    {
                      url: `/api/v1/kafalah/needs/${item.id}/approve`,
                      method: "post",
                      values: {},
                    },
                    { onSuccess: refresh },
                  )
                }
              >
                Setujui
              </Button>
            </CanAccess>
          ) : null
        }
      />
      <div className="section-heading">
        <div>
          <h2>Matching kafil</h2>
          <p>Nilai matching dikunci atomik agar tidak melampaui kebutuhan.</p>
        </div>
      </div>
      <ResourceTable
        columns={matchColumns}
        items={matches.result?.data ?? []}
        getRowId={(item) => item.id}
        isLoading={matches.query.isLoading}
        empty={
          <EmptyState
            title="Belum ada matching"
            description="Pasangkan kafil aktif dengan kebutuhan approved."
          />
        }
      />
      <div className="section-heading">
        <div>
          <h2>Kontrak & jadwal</h2>
          <p>Kontrak aktif menghasilkan jadwal kontribusi secara otomatis.</p>
        </div>
      </div>
      <ResourceTable
        columns={contractColumns}
        items={contracts.result?.data ?? []}
        getRowId={(item) => item.id}
        isLoading={contracts.query.isLoading}
        empty={
          <EmptyState
            title="Belum ada kontrak"
            description="Buat kontrak dari matching proposed."
          />
        }
        rowActions={(item) => (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => show("kafalah_contracts", item.id)}
          >
            <Eye size={16} />
            <span className="sr-only">Lihat {item.reference_number}</span>
          </Button>
        )}
      />
    </section>
  );
}
