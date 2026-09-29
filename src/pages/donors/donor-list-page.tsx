import { useQuery } from "@tanstack/react-query";
import {
  BellRing,
  Download,
  Eye,
  HandCoins,
  Repeat,
  Sprout,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";

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
import { engagementTone, formatShortDate } from "@/features/donors/format";
import type { DonorListItem, DonorSummary } from "@/features/donors/types";
import {
  donorEngagementHints,
  donorEngagementLabels,
  donorGivingKindLabels,
  donorSegmentLabels,
  labelOf,
  optionsOf,
  recurringFrequencyLabels,
} from "@/features/giving/labels";
import { useOrganization } from "@/features/organizations/organization-context";
import { apiFetch } from "@/lib/neon/http";

type DonorList = { data: DonorListItem[]; meta: { total: number } };

const csvCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

function givingChips(item: DonorListItem) {
  const chips: Array<{ amount: string; kind: string }> = [];
  if (Number(item.cash_total) > 0) chips.push({ amount: item.cash_total, kind: "cash" });
  if (Number(item.goods_total) > 0) chips.push({ amount: item.goods_total, kind: "in_kind" });
  if (Number(item.waqf_total) > 0 || item.donated_waqf_asset) chips.push({ amount: item.waqf_total, kind: "waqf" });
  if (Number(item.kafalah_total) > 0) chips.push({ amount: item.kafalah_total, kind: "kafalah" });
  return chips;
}

export function DonorListPage() {
  const navigate = useNavigate();
  const { activeOrganization } = useOrganization();
  const organizationId = activeOrganization?.organization.$id ?? "";
  const [filters, setFilters] = useState({
    engagement: "",
    follow_up: "",
    giving_type: "",
    manager: "",
    q: "",
    recurring: "",
    segment: "",
    sort: "total",
  });
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const pageSize = 25;
  const setFilter = (patch: Partial<typeof filters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };

  const queryString = (currentPage: number, size: number) => {
    const query = new URLSearchParams({ page: String(currentPage), pageSize: String(size) });
    for (const [key, value] of Object.entries(filters)) {
      if (value) query.set(key, value.trim());
    }
    return query.toString();
  };

  const summary = useQuery({
    enabled: Boolean(organizationId),
    queryFn: () => apiFetch<{ data: DonorSummary }>("/api/v1/donors/summary"),
    queryKey: ["donors", "summary", organizationId],
  });
  const donors = useQuery({
    enabled: Boolean(organizationId),
    queryFn: () => apiFetch<DonorList>(`/api/v1/donors?${queryString(page, pageSize)}`),
    queryKey: ["donors", "list", organizationId, filters, page],
  });
  const total = donors.data?.meta.total ?? 0;
  const stats = summary.data?.data;

  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows: DonorListItem[] = [];
      for (let current = 1; current <= 20; current += 1) {
        const response = await apiFetch<DonorList>(`/api/v1/donors?${queryString(current, 100)}`);
        rows.push(...response.data);
        if (rows.length >= response.meta.total || response.data.length === 0) break;
      }
      const header = [
        "Nama", "Jenis", "Telepon", "WhatsApp", "Email", "Kota", "Segmen", "Keaktifan",
        "Total dana", "Total barang (taksiran)", "Total wakaf", "Total kafalah", "Total semua",
        "Jumlah pemberian", "Pemberian pertama", "Pemberian terakhir", "Komitmen rutin", "PIC",
      ];
      const lines = rows.map((row) =>
        [
          row.display_name,
          row.contact_type === "institution" ? "Lembaga" : "Perorangan",
          row.primary_phone,
          row.whatsapp_phone,
          row.primary_email,
          row.city,
          labelOf(donorSegmentLabels, row.segment),
          labelOf(donorEngagementLabels, row.engagement),
          row.cash_total,
          row.goods_total,
          row.waqf_total,
          row.kafalah_total,
          row.grand_total,
          row.gift_count,
          row.first_gift_at?.slice(0, 10),
          row.last_gift_at?.slice(0, 10),
          row.recurring_amount ? `${row.recurring_amount} (${labelOf(recurringFrequencyLabels, row.recurring_frequency)})` : "",
          row.manager_name,
        ]
          .map(csvCell)
          .join(","),
      );
      const blob = new Blob([`${String.fromCharCode(0xfeff)}${[header.map(csvCell).join(","), ...lines].join("\n")}`], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `donatur-wakif-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const columns: ResourceTableColumn<DonorListItem>[] = [
    {
      key: "name",
      header: "Donatur / wakif",
      render: (item) => (
        <div className="crm-contact-cell">
          <Link className="donor-name-link" to={`/donors/${item.id}`}>
            {item.display_name}
          </Link>
          <small>
            {[item.contact_type === "institution" ? "Lembaga" : "Perorangan", item.whatsapp_phone ?? item.primary_phone, item.city]
              .filter(Boolean)
              .join(" · ")}
          </small>
        </div>
      ),
    },
    {
      key: "status",
      header: "Segmen & keaktifan",
      render: (item) => (
        <div className="flex flex-wrap gap-1">
          <StatusBadge tone={engagementTone(item.engagement)}>{labelOf(donorEngagementLabels, item.engagement)}</StatusBadge>
          {item.segment ? <StatusBadge tone="info">{labelOf(donorSegmentLabels, item.segment)}</StatusBadge> : <StatusBadge tone="neutral">Profil belum diisi</StatusBadge>}
          {item.recurring_amount ? (
            <StatusBadge tone="success">
              <Repeat aria-hidden className="inline" size={12} /> {labelOf(recurringFrequencyLabels, item.recurring_frequency)}
            </StatusBadge>
          ) : null}
        </div>
      ),
    },
    {
      key: "giving",
      header: "Bentuk pemberian",
      render: (item) => {
        const chips = givingChips(item);
        return chips.length === 0 ? (
          <small className="text-muted">Belum ada</small>
        ) : (
          <div className="donor-giving-chips">
            {chips.map((chip) => (
              <span data-kind={chip.kind} key={chip.kind}>
                {labelOf(donorGivingKindLabels, chip.kind)}
                {Number(chip.amount) > 0 ? ` · ${Number(chip.amount).toLocaleString("id-ID", { maximumFractionDigits: 0 })}` : ""}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: "total",
      header: "Total & terakhir",
      align: "right",
      render: (item) => (
        <div className="crm-contact-cell">
          <MoneyDisplay amount={item.grand_total} currency="IDR" mutedZero />
          <small>
            {item.gift_count > 0 ? `${item.gift_count}× · terakhir ${formatShortDate(item.last_gift_at)}` : "—"}
          </small>
        </div>
      ),
    },
    {
      key: "follow",
      header: "PIC & tindak lanjut",
      render: (item) => (
        <div className="crm-contact-cell">
          <small>{item.manager_name ?? "Belum ada PIC"}</small>
          {item.next_follow_up_at ? (
            <small data-late={new Date(item.next_follow_up_at) < new Date()} className="donor-follow-date">
              <BellRing aria-hidden className="inline" size={12} /> {formatShortDate(item.next_follow_up_at)}
            </small>
          ) : null}
        </div>
      ),
    },
  ];

  const engagementCards = stats
    ? (["active", "cooling", "lapsed", "never"] as const).map((key) => ({ count: stats[key], key }))
    : [];

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow="Penghimpunan"
        title="Donatur & wakif"
        description="Satu tempat untuk semua pemberi: donatur dana, donatur barang, wakif, dan kafil. Riwayat pemberian dihitung otomatis dari transaksi; catat komunikasi dan tindak lanjut agar tidak ada donatur yang terlupakan."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button disabled={exporting || total === 0} variant="outline" onClick={() => void exportCsv()}>
              <Download aria-hidden size={16} /> {exporting ? "Menyiapkan…" : "Unduh CSV"}
            </Button>
            <ProtectedActionButton action="manage" resource="donors" onClick={() => navigate("/donors/new")}>
              <UserPlus aria-hidden size={16} /> Tambah donatur
            </ProtectedActionButton>
          </div>
        }
      />

      {stats ? (
        <div className="report-metric-grid">
          <article className="report-metric">
            <UsersRound aria-hidden size={18} />
            <span>Total donatur & wakif</span>
            <strong>{stats.total}</strong>
          </article>
          <article className="report-metric">
            <Sprout aria-hidden size={18} />
            <span>Wakif</span>
            <strong>{stats.wakif}</strong>
          </article>
          <article className="report-metric">
            <Repeat aria-hidden size={18} />
            <span>Komitmen rutin</span>
            <strong>{stats.recurring}</strong>
          </article>
          <article className="report-metric report-metric--stacked">
            <HandCoins aria-hidden size={18} />
            <span>Pemberian tahun ini</span>
            <strong>
              <MoneyDisplay amount={stats.this_year_total} currency="IDR" />
            </strong>
          </article>
        </div>
      ) : null}

      {engagementCards.length > 0 ? (
        <div className="donor-engagement-bar" role="group" aria-label="Saring berdasarkan keaktifan">
          {engagementCards.map((card) => (
            <button
              aria-pressed={filters.engagement === card.key}
              data-tone={engagementTone(card.key)}
              key={card.key}
              type="button"
              onClick={() => setFilter({ engagement: filters.engagement === card.key ? "" : card.key })}
            >
              <strong>{card.count}</strong>
              <span>{labelOf(donorEngagementLabels, card.key)}</span>
              <small>{donorEngagementHints[card.key]}</small>
            </button>
          ))}
        </div>
      ) : null}

      {stats && stats.followUps.length > 0 ? (
        <section className="donor-followups" aria-label="Tindak lanjut terbuka">
          <header>
            <strong>
              <BellRing aria-hidden className="inline" size={16} /> Tindak lanjut terbuka
            </strong>
            {stats.follow_ups_due > 0 ? <StatusBadge tone="warning">{stats.follow_ups_due} jatuh tempo</StatusBadge> : null}
          </header>
          <ul>
            {stats.followUps.slice(0, 6).map((item) => (
              <li key={item.id}>
                <Link to={`/donors/${item.contact_id}#interaksi`}>
                  <strong>{item.display_name}</strong>
                  <span>{item.follow_up_note || item.summary}</span>
                </Link>
                <small data-late={item.follow_up_at ? new Date(item.follow_up_at) < new Date() : false}>
                  {formatShortDate(item.follow_up_at)}
                  {item.assignee_name ? ` · ${item.assignee_name}` : ""}
                </small>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <input
          aria-label="Cari donatur"
          className="min-w-64 flex-1 rounded-xl border px-3 py-2"
          placeholder="Cari nama, telepon, email, atau kota…"
          value={filters.q}
          onChange={(event) => setFilter({ q: event.target.value })}
        />
        <select aria-label="Bentuk pemberian" className="rounded-xl border px-3 py-2" value={filters.giving_type} onChange={(event) => setFilter({ giving_type: event.target.value })}>
          <option value="">Semua bentuk pemberian</option>
          {optionsOf(donorGivingKindLabels).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select aria-label="Segmen" className="rounded-xl border px-3 py-2" value={filters.segment} onChange={(event) => setFilter({ segment: event.target.value })}>
          <option value="">Semua segmen</option>
          {optionsOf(donorSegmentLabels).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
          <option value="unprofiled">Profil belum diisi</option>
        </select>
        <select aria-label="Tindak lanjut & PIC" className="rounded-xl border px-3 py-2" value={`${filters.manager}|${filters.follow_up}|${filters.recurring}`} onChange={(event) => {
          const [manager = "", follow_up = "", recurring = ""] = event.target.value.split("|");
          setFilter({ follow_up, manager, recurring });
        }}>
          <option value="||">Semua</option>
          <option value="me||">PIC saya</option>
          <option value="|due|">Tindak lanjut jatuh tempo</option>
          <option value="|open|">Ada tindak lanjut terbuka</option>
          <option value="||yes">Punya komitmen rutin</option>
        </select>
        <select aria-label="Urutkan" className="rounded-xl border px-3 py-2" value={filters.sort} onChange={(event) => setFilter({ sort: event.target.value })}>
          <option value="total">Urut: total terbesar</option>
          <option value="recent">Urut: pemberian terbaru</option>
          <option value="name">Urut: nama</option>
        </select>
      </div>

      {donors.isError ? (
        <ErrorState title="Data donatur tidak dapat dimuat" description="Periksa organisasi aktif dan izin melihat donatur." onRetry={() => donors.refetch()} />
      ) : (
        <ResourceTable
          ariaLabel="Daftar donatur dan wakif"
          columns={columns}
          items={donors.data?.data ?? []}
          getRowId={(item) => item.id}
          isLoading={donors.isLoading}
          empty={<EmptyState title="Belum ada donatur yang cocok" description="Tambahkan donatur baru atau ubah filter pencarian." />}
          rowActions={(item) => (
            <Link className={buttonVariants({ size: "sm", variant: "ghost" })} to={`/donors/${item.id}`}>
              <Eye aria-hidden size={16} />
              <span className="sr-only">Lihat {item.display_name}</span>
            </Link>
          )}
        />
      )}

      {total > pageSize ? (
        <div className="flex items-center justify-between text-sm">
          <span>
            Menampilkan {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} dari {total} donatur
          </span>
          <div className="flex gap-2">
            <Button disabled={page === 1} size="sm" variant="outline" onClick={() => setPage((value) => value - 1)}>
              Sebelumnya
            </Button>
            <Button disabled={page * pageSize >= total} size="sm" variant="outline" onClick={() => setPage((value) => value + 1)}>
              Berikutnya
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
