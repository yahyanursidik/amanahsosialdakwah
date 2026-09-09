import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  ClipboardCheck,
  Eye,
  Filter,
  MapPin,
  Route,
  ShieldCheck,
  Truck,
  UserRound,
} from "lucide-react";
import { useDeferredValue, useState, type FormEvent } from "react";
import { Link } from "react-router";

import { CanAccess } from "@/components/access-control/can-access";
import {
  DetailSection,
  EmptyState,
  ErrorState,
  FilterBar,
  ResourceTable,
  StatusBadge,
  type ResourceTableColumn,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/neon/http";

type Envelope<T> = { data: T };

type ProgramBeneficiaryJourneyItem = {
  application_created_at: string;
  application_id: string;
  application_reference: string;
  application_status: string;
  applicant_name: string;
  assessment_assessor_name: string | null;
  assessment_id: string | null;
  assessment_outcome: string | null;
  assessment_reference: string | null;
  assessment_reviewer_name: string | null;
  assessment_score_percentage: string | number | null;
  assessment_status: string | null;
  beneficiary_address: string | null;
  beneficiary_assessment_status: string | null;
  beneficiary_contact_id: string;
  beneficiary_name: string;
  beneficiary_type: string | null;
  case_id: string | null;
  case_reference: string | null;
  case_status: string | null;
  distribution_assignee_name: string | null;
  distribution_id: string | null;
  distribution_method: string | null;
  distribution_reference: string | null;
  distribution_status: string | null;
  proposer_name: string | null;
  requested_support: string;
  urgency: string;
  approval_approver_name: string | null;
  approval_decided_at: string | null;
  approval_id: string | null;
  approval_reference: string | null;
  approval_requested_by_name: string | null;
  approval_status: string | null;
};

type ProgramBeneficiaryJourney = {
  availableSections: string[];
  beneficiaries: ProgramBeneficiaryJourneyItem[];
  dataLimitations: string[];
  fulfillmentSchemaAvailable: boolean;
  fulfillmentsByApplication: Record<
    string,
    Array<{
      packing_reference: string;
      packing_status: string;
      partner_name: string | null;
      partner_pic_name: string | null;
      partner_readiness_status: string;
      shipment_reference: string | null;
      shipment_status: string | null;
      warehouse_name: string;
    }>
  >;
  withheldSections: string[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
  };
};

type StatusTone = "danger" | "info" | "neutral" | "success" | "warning";
type JourneyStage = "all" | "needs_action" | "in_distribution" | "completed";

type FulfillmentOptions = {
  packings: Array<{
    id: string;
    package_count: number;
    reference_number: string;
    warehouse_name: string;
  }>;
  partners: Array<{ display_name: string; id: string }>;
};

const journeyStatusCopy: Record<string, string> = {
  accepted: "Diterima",
  allocated: "Sudah dialokasikan",
  approved: "Disetujui",
  assessment: "Sedang asesmen",
  cancelled: "Dibatalkan",
  completed: "Selesai disalurkan",
  converted: "Menjadi kasus",
  draft: "Draf",
  eligible: "Layak menerima bantuan",
  emergency: "Darurat",
  in_distribution: "Sedang disalurkan",
  in_screening: "Sedang diperiksa",
  manual_review: "Perlu penilaian manual",
  needs_action: "Perlu ditindaklanjuti",
  normal: "Prioritas normal",
  not_eligible: "Belum memenuhi kriteria",
  open: "Kasus terbuka",
  pending: "Menunggu proses",
  ready: "Siap disalurkan",
  rejected: "Ditolak",
  reserved: "Kuota dicadangkan",
  submitted: "Menunggu pemeriksaan",
  urgent: "Mendesak",
  verified: "Terverifikasi",
  waitlisted: "Masuk daftar tunggu",
};

export function formatJourneyStatus(value: string | null | undefined): string {
  if (!value) return "Belum tersedia";
  return journeyStatusCopy[value] ?? value.replaceAll("_", " ");
}

function statusTone(value: string | null | undefined): StatusTone {
  if (!value) return "neutral";
  if (
    [
      "approved",
      "eligible",
      "verified",
      "completed",
      "accepted",
      "converted",
    ].includes(value)
  ) {
    return "success";
  }
  if (
    ["rejected", "not_eligible", "cancelled", "revision_required"].includes(
      value,
    )
  ) {
    return "danger";
  }
  if (["draft", "pending"].includes(value)) return "neutral";
  if (["urgent", "emergency", "in_screening"].includes(value)) {
    return "warning";
  }
  return "info";
}

function JourneyStatus({ value }: { value: string | null | undefined }) {
  return (
    <StatusBadge tone={statusTone(value)}>
      {formatJourneyStatus(value)}
    </StatusBadge>
  );
}

function summary(items: ProgramBeneficiaryJourneyItem[]) {
  return {
    assessed: items.filter((item) => item.assessment_id).length,
    eligible: items.filter(
      (item) =>
        item.case_status === "eligible" ||
        item.assessment_outcome === "eligible",
    ).length,
    inDistribution: items.filter(
      (item) =>
        item.distribution_status &&
        !["completed", "cancelled"].includes(item.distribution_status),
    ).length,
    total: items.length,
  };
}

function journeyStage(item: ProgramBeneficiaryJourneyItem): JourneyStage {
  if (item.distribution_status === "completed") return "completed";
  if (
    item.distribution_status &&
    !["completed", "cancelled"].includes(item.distribution_status)
  ) {
    return "in_distribution";
  }
  return "needs_action";
}

const stageLabels: Record<JourneyStage, string> = {
  all: "Semua jejak",
  completed: "Selesai disalurkan",
  in_distribution: "Dalam penyaluran",
  needs_action: "Perlu ditindaklanjuti",
};

function getVisiblePages(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([
    1,
    totalPages,
    currentPage - 1,
    currentPage,
    currentPage + 1,
  ]);

  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((first, second) => first - second)
    .flatMap((page, index, items) => {
      const previous = items[index - 1];
      return previous && page - previous > 1
        ? ["ellipsis" as const, page]
        : [page];
    });
}

function FulfillmentLinkForm({
  candidates,
  onLinked,
  programId,
}: {
  candidates: ProgramBeneficiaryJourneyItem[];
  onLinked: () => void;
  programId: string;
}) {
  const options = useQuery({
    queryFn: () =>
      apiFetch<Envelope<FulfillmentOptions>>(
        `/api/v1/programs/${programId}/beneficiary-journey/fulfillment-options`,
      ),
    queryKey: ["program-fulfillment-options", programId],
    retry: false,
    staleTime: 30_000,
  });
  const [applicationId, setApplicationId] = useState("");
  const [packingId, setPackingId] = useState("");
  const [packageCount, setPackageCount] = useState("1");
  const [partnerContactId, setPartnerContactId] = useState("");
  const [partnerPicName, setPartnerPicName] = useState("");
  const [partnerReadiness, setPartnerReadiness] = useState("pending");
  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<Envelope<Record<string, unknown>>>(
        `/api/v1/programs/${programId}/beneficiary-journey/fulfillments`,
        {
          body: JSON.stringify({
            application_id: applicationId,
            package_count: Number(packageCount),
            packing_id: packingId,
            ...(partnerContactId
              ? { partner_contact_id: partnerContactId }
              : {}),
            ...(partnerPicName ? { partner_pic_name: partnerPicName } : {}),
            partner_readiness_status: partnerReadiness,
          }),
          headers: { "Idempotency-Key": crypto.randomUUID() },
          method: "POST",
        },
      ),
    onSuccess: () => {
      setPartnerPicName("");
      onLinked();
    },
  });

  if (options.isLoading || options.isError || !options.data?.data) return null;
  const { packings, partners } = options.data.data;
  if (!candidates.length || !packings.length) return null;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate();
  };

  return (
    <CanAccess action="manage" resource="programs">
      <details className="border-border mt-5 rounded-lg border p-4">
        <summary className="cursor-pointer font-semibold">
          Hubungkan paket gudang ke calon penerima
        </summary>
        <form className="form-grid mt-4" onSubmit={submit}>
          <div className="auth-field">
            <Label htmlFor="fulfillment_application">Calon penerima</Label>
            <select
              id="fulfillment_application"
              required
              value={applicationId}
              onChange={(event) => setApplicationId(event.target.value)}
            >
              <option value="">Pilih calon penerima</option>
              {candidates.map((candidate) => (
                <option
                  key={candidate.application_id}
                  value={candidate.application_id}
                >
                  {candidate.beneficiary_name} —{" "}
                  {candidate.application_reference}
                </option>
              ))}
            </select>
          </div>
          <div className="auth-field">
            <Label htmlFor="fulfillment_packing">Paket dari gudang</Label>
            <select
              id="fulfillment_packing"
              required
              value={packingId}
              onChange={(event) => setPackingId(event.target.value)}
            >
              <option value="">Pilih packing packed</option>
              {packings.map((packing) => (
                <option key={packing.id} value={packing.id}>
                  {packing.reference_number} — {packing.warehouse_name} (
                  {packing.package_count} paket)
                </option>
              ))}
            </select>
          </div>
          <div className="auth-field">
            <Label htmlFor="fulfillment_count">Jumlah paket</Label>
            <input
              id="fulfillment_count"
              min="1"
              required
              type="number"
              value={packageCount}
              onChange={(event) => setPackageCount(event.target.value)}
            />
          </div>
          <div className="auth-field">
            <Label htmlFor="fulfillment_partner">Mitra penyalur</Label>
            <select
              id="fulfillment_partner"
              value={partnerContactId}
              onChange={(event) => setPartnerContactId(event.target.value)}
            >
              <option value="">Internal / belum memilih mitra</option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.display_name}
                </option>
              ))}
            </select>
          </div>
          <div className="auth-field">
            <Label htmlFor="fulfillment_pic">Nama PIC mitra</Label>
            <input
              id="fulfillment_pic"
              value={partnerPicName}
              onChange={(event) => setPartnerPicName(event.target.value)}
            />
          </div>
          <div className="auth-field">
            <Label htmlFor="fulfillment_readiness">Kesiapan mitra</Label>
            <select
              id="fulfillment_readiness"
              value={partnerReadiness}
              onChange={(event) => setPartnerReadiness(event.target.value)}
            >
              <option value="pending">Menunggu</option>
              <option value="ready">Siap</option>
              <option value="accepted">Diterima</option>
              <option value="declined">Ditolak</option>
            </select>
          </div>
          {mutation.isError ? (
            <p className="text-destructive text-sm sm:col-span-2">
              {mutation.error instanceof Error
                ? mutation.error.message
                : "Fulfilment tidak dapat dihubungkan."}
            </p>
          ) : null}
          <div className="sm:col-span-2">
            <Button disabled={mutation.isPending} type="submit">
              Hubungkan fulfilment
            </Button>
          </div>
        </form>
      </details>
    </CanAccess>
  );
}

export function ProgramBeneficiaryJourney({
  programId,
}: {
  programId: string;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [stage, setStage] = useState<JourneyStage>("all");
  const journey = useQuery({
    enabled: Boolean(programId),
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        stage,
      });
      if (deferredSearch.trim()) params.set("q", deferredSearch.trim());
      return apiFetch<Envelope<ProgramBeneficiaryJourney>>(
        `/api/v1/programs/${programId}/beneficiary-journey?${params.toString()}`,
      );
    },
    queryKey: [
      "program-beneficiary-journey",
      programId,
      page,
      pageSize,
      deferredSearch,
      stage,
    ],
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: 30_000,
  });
  const data = journey.data?.data;

  if (journey.isError) {
    return (
      <ErrorState
        title="Jejak penerima belum dapat dimuat"
        description={
          journey.error instanceof Error
            ? journey.error.message
            : "Periksa koneksi atau akses organisasi aktif Anda."
        }
        onRetry={() => void journey.refetch()}
      />
    );
  }

  const items = data?.beneficiaries ?? [];
  const counts = summary(items);
  const pagination = data?.pagination ?? {
    page,
    pageSize,
    total: items.length,
  };
  const totalPages = Math.max(
    1,
    Math.ceil(pagination.total / pagination.pageSize),
  );
  const visiblePages = getVisiblePages(pagination.page, totalPages);
  const columns: ResourceTableColumn<ProgramBeneficiaryJourneyItem>[] = [
    {
      header: "Penerima & pengajuan",
      key: "beneficiary",
      width: "22%",
      render: (item) => (
        <div className="program-journey__cell program-journey__beneficiary">
          <Link
            className="text-primary font-semibold underline-offset-4 hover:underline"
            to={`/crm/contacts/${item.beneficiary_contact_id}`}
          >
            {item.beneficiary_name}
          </Link>
          <Link
            className="program-journey__reference text-primary underline-offset-4 hover:underline"
            to={`/applications/${item.application_id}`}
          >
            {item.application_reference}
          </Link>
          <p className="program-journey__location">
            <MapPin aria-hidden="true" className="size-3 shrink-0" />
            <span>{item.beneficiary_address ?? "Alamat belum dicatat"}</span>
          </p>
        </div>
      ),
    },
    {
      header: "Kebutuhan",
      key: "request",
      width: "28%",
      render: (item) => (
        <div className="program-journey__cell">
          <div className="flex flex-wrap items-center gap-1.5">
            <JourneyStatus value={item.application_status} />
            <JourneyStatus value={item.urgency} />
          </div>
          <p className="program-journey__support">{item.requested_support}</p>
          <p className="text-muted-foreground text-xs">
            Pengaju: {item.proposer_name ?? item.applicant_name}
          </p>
        </div>
      ),
    },
    {
      header: "Asesmen & keputusan",
      key: "assessment",
      width: "24%",
      render: (item) => {
        const assessmentStatus =
          item.assessment_outcome ?? item.assessment_status;
        const decisionStatus = item.approval_status ?? item.case_status;

        return (
          <div className="program-journey__cell">
            <div>
              <p className="program-journey__cell-label">Asesmen</p>
              {item.assessment_reference ? (
                <p className="program-journey__reference">
                  {item.assessment_reference}
                </p>
              ) : (
                <p className="text-muted-foreground text-xs">
                  Belum ada asesmen
                </p>
              )}
              {assessmentStatus ? (
                <JourneyStatus value={assessmentStatus} />
              ) : null}
            </div>
            <div>
              <p className="program-journey__cell-label">Keputusan</p>
              {item.approval_reference ? (
                <p className="program-journey__reference">
                  {item.approval_reference}
                </p>
              ) : null}
              {decisionStatus ? (
                <JourneyStatus value={decisionStatus} />
              ) : (
                <p className="text-muted-foreground text-xs">
                  Menunggu keputusan
                </p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: "Gudang & mitra",
      key: "fulfillment",
      width: "19%",
      render: (item) => {
        const fulfillments =
          data?.fulfillmentsByApplication[item.application_id] ?? [];
        const primaryFulfillment = fulfillments[0];

        return (
          <div className="program-journey__cell program-journey__fulfillments">
            <div>
              <p className="program-journey__cell-label">Tahap</p>
              <JourneyStatus value={journeyStage(item)} />
            </div>
            {item.distribution_reference ? (
              <>
                <p className="program-journey__cell-label">Penyaluran</p>
                {item.distribution_id ? (
                  <Link
                    className="program-journey__reference text-primary underline-offset-4 hover:underline"
                    to={`/distributions/${item.distribution_id}`}
                  >
                    {item.distribution_reference}
                  </Link>
                ) : (
                  <p className="program-journey__reference">
                    {item.distribution_reference}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-1.5">
                  <JourneyStatus value={item.distribution_status} />
                </div>
                <p className="program-journey__location">
                  <Truck aria-hidden="true" className="size-3 shrink-0" />
                  <span>
                    {item.distribution_assignee_name ?? "PIC belum ditugaskan"}
                  </span>
                </p>
              </>
            ) : primaryFulfillment ? (
              <>
                <p className="program-journey__reference">
                  {primaryFulfillment.packing_reference}
                </p>
                <p>{primaryFulfillment.warehouse_name}</p>
                <p className="text-muted-foreground text-xs">
                  {primaryFulfillment.partner_name ??
                    "Internal / belum memilih mitra"}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground text-xs">
                {data?.fulfillmentSchemaAvailable
                  ? "Belum ditautkan ke gudang atau mitra"
                  : "Data gudang & mitra belum tersedia"}
              </p>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <DetailSection
      title="Jejak calon penerima"
      description="Kebutuhan, keputusan, dan penyaluran dalam satu alur."
    >
      <div className="program-journey">
        <div
          className="program-journey__summary"
          aria-label="Ringkasan jejak penerima"
        >
          {[
            {
              icon: UserRound,
              label: "Penerima",
              value: counts.total,
            },
            {
              icon: ClipboardCheck,
              label: "Asesmen",
              value: counts.assessed,
            },
            {
              icon: ShieldCheck,
              label: "Layak",
              value: counts.eligible,
            },
            {
              icon: Route,
              label: "Penyaluran",
              value: counts.inDistribution,
            },
          ].map(({ icon: Icon, label, value }) => (
            <div className="program-journey__metric" key={label}>
              <Icon aria-hidden="true" className="text-primary size-5" />
              <div>
                <p className="text-muted-foreground text-xs">{label}</p>
                <p className="text-lg font-semibold">{value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="program-journey__toolbar">
          <FilterBar
            onSearchChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            searchLabel="Cari jejak calon penerima"
            searchPlaceholder="Cari penerima, pengajuan, atau kebutuhan"
            searchValue={search}
          >
            <label className="sr-only" htmlFor="journey-stage">
              Tahap perjalanan
            </label>
            <Filter aria-hidden="true" className="size-4" />
            <select
              id="journey-stage"
              onChange={(event) => {
                setStage(event.target.value as JourneyStage);
                setPage(1);
              }}
              value={stage}
            >
              {Object.entries(stageLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </FilterBar>
        </div>

        {data?.withheldSections.length ? (
          <div className="border-border bg-muted/40 mb-5 rounded-lg border p-3 text-sm">
            Beberapa bagian disembunyikan sesuai permission organisasi:{" "}
            {data.withheldSections.join(", ")}.
          </div>
        ) : null}

        <div className="program-journey__table">
          <ResourceTable
            actionWidth="7%"
            ariaLabel="Daftar jejak calon penerima"
            columns={columns}
            getRowId={(item) => item.application_id}
            isLoading={journey.isLoading && !journey.isPlaceholderData}
            items={items}
            empty={
              <EmptyState
                title={
                  search || stage !== "all"
                    ? "Jejak tidak ditemukan"
                    : "Belum ada calon penerima"
                }
                description={
                  search || stage !== "all"
                    ? "Ubah kata kunci atau filter tahap untuk melihat jejak lain."
                    : "Pengajuan yang diarahkan ke program ini akan tampil di sini."
                }
              />
            }
            rowActions={(item) => (
              <Link
                aria-label={`Buka detail pengajuan ${item.application_reference}`}
                className="program-journey__action-link"
                to={`/applications/${item.application_id}`}
              >
                <Eye aria-hidden="true" className="size-4" />
                <span>Detail</span>
              </Link>
            )}
          />
        </div>

        {pagination.total > 0 ? (
          <nav
            className="program-journey__pagination"
            aria-label="Halaman jejak calon penerima"
          >
            <p>
              Menampilkan{" "}
              <strong>
                {(pagination.page - 1) * pagination.pageSize + 1}–
                {Math.min(
                  pagination.page * pagination.pageSize,
                  pagination.total,
                )}
              </strong>{" "}
              dari <strong>{pagination.total}</strong> jejak
            </p>
            <div className="program-journey__pagination-controls">
              <label htmlFor="journey-page-size">Baris per halaman</label>
              <select
                id="journey-page-size"
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                value={pageSize}
              >
                {[10, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <div className="program-journey__page-controls">
                <Button
                  aria-label="Halaman sebelumnya"
                  className="px-2"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  size="sm"
                  title="Halaman sebelumnya"
                  variant="outline"
                >
                  <ArrowLeft aria-hidden="true" className="size-4" />
                </Button>
                {visiblePages.map((pageNumber, index) =>
                  pageNumber === "ellipsis" ? (
                    <span
                      aria-hidden="true"
                      className="program-journey__page-ellipsis"
                      key={`ellipsis-${index}`}
                    >
                      …
                    </span>
                  ) : (
                    <Button
                      aria-current={
                        pageNumber === pagination.page ? "page" : undefined
                      }
                      aria-label={`Halaman ${pageNumber}`}
                      className="min-w-9 px-2"
                      key={pageNumber}
                      onClick={() => setPage(pageNumber)}
                      size="sm"
                      variant={
                        pageNumber === pagination.page ? "default" : "outline"
                      }
                    >
                      {pageNumber}
                    </Button>
                  ),
                )}
                <Button
                  aria-label="Halaman berikutnya"
                  className="px-2"
                  disabled={pagination.page >= totalPages}
                  onClick={() =>
                    setPage((value) => Math.min(totalPages, value + 1))
                  }
                  size="sm"
                  title="Halaman berikutnya"
                  variant="outline"
                >
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Button>
              </div>
            </div>
          </nav>
        ) : null}

        {data?.fulfillmentSchemaAvailable ? (
          <FulfillmentLinkForm
            candidates={items}
            programId={programId}
            onLinked={() => void journey.refetch()}
          />
        ) : null}

        {data?.dataLimitations.map((limitation) => (
          <p className="text-muted-foreground mt-4 text-xs" key={limitation}>
            Catatan data: {limitation}
          </p>
        ))}
      </div>
    </DetailSection>
  );
}
