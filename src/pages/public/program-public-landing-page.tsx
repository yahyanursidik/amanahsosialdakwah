import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  HandHeart,
  MapPinned,
  Package,
  ShieldCheck,
  Truck,
  UsersRound,
} from "lucide-react";
import { Link, useParams } from "react-router";

import { BrandLogo } from "@/components/brand/brand-logo";
import {
  ErrorState,
  LoadingSkeleton,
  MoneyDisplay,
} from "@/components/design-system";
import {
  programSupportModeLabels,
  resolveProgramSupportModes,
} from "@/features/programs/schemas";
import { apiFetch } from "@/lib/neon/http";

type PublicProgramLanding = {
  budget_amount: string;
  cash_budget_amount: string;
  completed_distribution_amount: string;
  completed_distribution_count: number;
  delivery_area_count: number;
  eligible_beneficiary_count: number;
  ends_at: string | null;
  goods_budget_amount: string;
  logistics_budget_amount: string;
  organization_name: string;
  program_code: string;
  program_id: string;
  program_name: string;
  program_summary: string;
  objective: string | null;
  quota_capacity: number;
  quota_used: number;
  starts_at: string | null;
  support_modes: unknown;
};

type Envelope<T> = { data: T };
type SupportMode = "cash" | "in_kind" | "logistics";

const supportModeDetails: Record<
  SupportMode,
  { description: string; icon: typeof CircleDollarSign }
> = {
  cash: {
    description: "Dana yang direncanakan untuk pelaksanaan bantuan.",
    icon: CircleDollarSign,
  },
  in_kind: {
    description: "Barang atau paket bantuan yang akan disalurkan.",
    icon: Package,
  },
  logistics: {
    description: "Biaya pengiriman dan dukungan penyaluran.",
    icon: Truck,
  },
};

function dateLabel(value: string | null) {
  return value
    ? new Date(value).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;
}

function periodLabel(data: PublicProgramLanding) {
  const start = dateLabel(data.starts_at);
  const end = dateLabel(data.ends_at);
  if (!start && !end) return "Periode pelaksanaan belum dicantumkan";
  return `${start ?? "Awal pelaksanaan"} – ${end ?? "berjalan"}`;
}

export function percentageOf(value: number, total: number) {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0)
    return 0;
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

function supportBudgetFor(data: PublicProgramLanding, mode: SupportMode) {
  if (mode === "cash") return data.cash_budget_amount;
  if (mode === "in_kind") return data.goods_budget_amount;
  return data.logistics_budget_amount;
}

function CompactMetric({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: typeof MapPinned;
  label: string;
  value: React.ReactNode;
  note: string;
}) {
  return (
    <div className="public-program__metric">
      <Icon aria-hidden="true" className="public-program__metric-icon" />
      <div>
        <p className="public-program__metric-label">{label}</p>
        <p className="public-program__metric-value">{value}</p>
        <p className="public-program__metric-note">{note}</p>
      </div>
    </div>
  );
}

export function PublicProgramLandingPage() {
  const { slug: programId } = useParams<{ slug: string }>();
  const landing = useQuery({
    enabled: Boolean(programId),
    queryFn: () =>
      apiFetch<Envelope<PublicProgramLanding>>(
        `/api/v1/public/programs/${programId}`,
      ),
    queryKey: ["public-program", programId],
    retry: false,
    staleTime: 60_000,
  });

  if (landing.isLoading)
    return (
      <main className="public-program public-program--loading">
        <div className="public-program__shell">
          <LoadingSkeleton lines={8} />
        </div>
      </main>
    );
  if (landing.isError || !landing.data?.data)
    return (
      <main className="public-program public-program--loading">
        <div className="public-program__shell public-program__shell--narrow">
          <ErrorState
            title="Halaman program tidak ditemukan"
            description="Halaman publik hanya tersedia untuk Program yang sedang aktif."
          />
        </div>
      </main>
    );

  const data = landing.data.data;
  const supportModes = resolveProgramSupportModes(data.support_modes);
  const quotaProgress = percentageOf(data.quota_used, data.quota_capacity);
  const distributionProgress = percentageOf(
    data.completed_distribution_count,
    data.eligible_beneficiary_count,
  );

  return (
    <main className="public-program">
      <div className="public-program__shell">
        <nav
          aria-label="Navigasi halaman publik"
          className="public-program__topbar"
        >
          <Link
            aria-label="Beranda Amanah Platform"
            className="public-program__brand"
            to="/"
          >
            <BrandLogo />
          </Link>
          <Link className="public-program__workspace-link" to="/login">
            Ruang kerja <ArrowUpRight aria-hidden="true" />
          </Link>
        </nav>

        <section
          className="public-program__intro"
          aria-labelledby="program-name"
        >
          <div className="public-program__intro-copy">
            <p className="public-program__eyebrow">
              <ShieldCheck aria-hidden="true" /> Program aktif
            </p>
            <p className="public-program__code">
              {data.organization_name} <span aria-hidden="true">/</span>{" "}
              {data.program_code}
            </p>
            <h1 id="program-name">{data.program_name}</h1>
            <p className="public-program__summary">{data.program_summary}</p>
          </div>
          <dl className="public-program__intro-facts">
            <div>
              <dt>
                <CalendarDays aria-hidden="true" /> Periode
              </dt>
              <dd>{periodLabel(data)}</dd>
            </div>
            <div>
              <dt>
                <HandHeart aria-hidden="true" /> Bentuk dukungan
              </dt>
              <dd>
                {supportModes
                  .map((mode) => programSupportModeLabels[mode])
                  .join(" · ")}
              </dd>
            </div>
          </dl>
        </section>

        {data.objective ? (
          <section
            className="public-program__objective"
            aria-labelledby="program-objective"
          >
            <p className="public-program__section-label">Tujuan program</p>
            <h2 id="program-objective">{data.objective}</h2>
          </section>
        ) : null}

        <section
          className="public-program__section"
          aria-labelledby="support-title"
        >
          <div className="public-program__section-heading">
            <div>
              <p className="public-program__section-label">Rencana dukungan</p>
              <h2 id="support-title">Komposisi bantuan</h2>
            </div>
            <div className="public-program__total">
              <span>Total rencana</span>
              <strong>
                <MoneyDisplay amount={data.budget_amount} />
              </strong>
            </div>
          </div>
          <div
            className="public-program__support-table"
            role="table"
            aria-label="Komposisi rencana dukungan"
          >
            <div className="public-program__support-head" role="row">
              <span role="columnheader">Bentuk dukungan</span>
              <span role="columnheader">Nilai rencana</span>
            </div>
            {supportModes.map((mode) => {
              const detail = supportModeDetails[mode];
              const Icon = detail.icon;
              return (
                <div
                  className="public-program__support-row"
                  key={mode}
                  role="row"
                >
                  <div role="cell">
                    <Icon aria-hidden="true" />
                    <div>
                      <strong>{programSupportModeLabels[mode]}</strong>
                      <span>{detail.description}</span>
                    </div>
                  </div>
                  <strong role="cell">
                    <MoneyDisplay amount={supportBudgetFor(data, mode)} />
                  </strong>
                </div>
              );
            })}
          </div>
        </section>

        <section
          className="public-program__section public-program__progress"
          aria-labelledby="progress-title"
        >
          <div className="public-program__section-heading">
            <div>
              <p className="public-program__section-label">Pelaksanaan</p>
              <h2 id="progress-title">Cakupan dan progres</h2>
            </div>
            <p className="public-program__section-note">
              Angka ditampilkan sebagai agregat, tanpa identitas penerima.
            </p>
          </div>
          <div className="public-program__progress-grid">
            <div className="public-program__progress-panel">
              <div className="public-program__progress-title">
                <span>Alokasi kuota</span>
                <strong>{quotaProgress}%</strong>
              </div>
              <div
                aria-label={`${quotaProgress}% kuota telah dialokasikan`}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={quotaProgress}
                className="public-program__progress-track"
                role="progressbar"
              >
                <span style={{ width: `${quotaProgress}%` }} />
              </div>
              <p>
                <strong>{data.quota_used.toLocaleString("id-ID")}</strong> dari{" "}
                {data.quota_capacity.toLocaleString("id-ID")} kuota telah
                dicadangkan atau dialokasikan.
              </p>
            </div>
            <div className="public-program__progress-panel">
              <div className="public-program__progress-title">
                <span>Distribusi selesai</span>
                <strong>{distributionProgress}%</strong>
              </div>
              <div
                aria-label={`${distributionProgress}% distribusi selesai dibanding calon penerima layak`}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={distributionProgress}
                className="public-program__progress-track"
                role="progressbar"
              >
                <span style={{ width: `${distributionProgress}%` }} />
              </div>
              <p>
                <strong>
                  {data.completed_distribution_count.toLocaleString("id-ID")}
                </strong>{" "}
                distribusi selesai dibanding{" "}
                {data.eligible_beneficiary_count.toLocaleString("id-ID")} calon
                penerima yang memenuhi kriteria.
              </p>
            </div>
          </div>
          <div className="public-program__metrics">
            <CompactMetric
              icon={MapPinned}
              label="Area penyaluran"
              note="Area yang tercatat pada Program"
              value={data.delivery_area_count.toLocaleString("id-ID")}
            />
            <CompactMetric
              icon={UsersRound}
              label="Penerima layak"
              note="Kasus yang telah memenuhi kriteria"
              value={data.eligible_beneficiary_count.toLocaleString("id-ID")}
            />
            <CompactMetric
              icon={Truck}
              label="Distribusi selesai"
              note="Penyaluran yang sudah selesai dicatat"
              value={data.completed_distribution_count.toLocaleString("id-ID")}
            />
            <CompactMetric
              icon={CircleDollarSign}
              label="Nilai tersalurkan"
              note="Nominal distribusi selesai yang tercatat"
              value={
                <MoneyDisplay amount={data.completed_distribution_amount} />
              }
            />
          </div>
        </section>

        <aside
          className="public-program__disclosure"
          aria-label="Keterbukaan informasi"
        >
          <ShieldCheck aria-hidden="true" />
          <div>
            <strong>Informasi publik yang terjaga</strong>
            <p>
              Halaman ini diperbarui otomatis dari Program yang aktif. Data
              penerima, alamat, asesmen, approval, dan bukti privat tidak
              ditampilkan.
            </p>
          </div>
        </aside>

        <footer className="public-program__footer">
          <span>
            Ringkasan pelaksanaan Program oleh {data.organization_name}.
          </span>
          <Link to="/">
            <ArrowLeft aria-hidden="true" /> Amanah Platform
          </Link>
        </footer>
      </div>
    </main>
  );
}
