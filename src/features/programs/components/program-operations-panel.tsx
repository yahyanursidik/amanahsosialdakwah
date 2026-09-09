import { useMutation, useQuery } from "@tanstack/react-query";
import { type FormEvent, type ReactNode, useState } from "react";

import { CanAccess } from "@/components/access-control/can-access";
import {
  DetailSection,
  EmptyState,
  ErrorState,
  ResourceTable,
  StatusBadge,
  type ResourceTableColumn,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/neon/http";

type Envelope<T> = { data: T };
type Area = {
  city: string | null;
  code: string;
  id: string;
  name: string;
  province: string | null;
  quota_capacity: number;
  quota_used: number;
  status: string;
};
type PartnerCandidate = { display_name: string; id: string };
type Partner = {
  assignment_role: string;
  delivery_area_name: string | null;
  id: string;
  partner_name: string;
  pic_name: string | null;
  readiness_status: string;
  status: string;
};
type Candidate = {
  case_status: string | null;
  id: string;
  applicant_name: string;
  reference_number: string;
};
type Allocation = {
  applicant_name: string;
  application_reference: string;
  delivery_area_name: string | null;
  id: string;
  partner_name: string | null;
  status: string;
};
type ProgramOperations = {
  allocations: Allocation[];
  areas: Area[];
  candidates: Candidate[];
  partnerCandidates: PartnerCandidate[];
  partners: Partner[];
};

function label(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "Belum ditetapkan";
}

function tone(value: string): "neutral" | "success" | "warning" | "info" {
  if (
    ["active", "ready", "accepted", "reserved", "allocated"].includes(value)
  ) {
    return "success";
  }
  if (["pending", "waitlisted"].includes(value)) return "warning";
  return "info";
}

const areaColumns: ResourceTableColumn<Area>[] = [
  {
    header: "Kode",
    key: "code",
    render: (area) => <span className="font-mono text-xs">{area.code}</span>,
    width: "10rem",
  },
  { header: "Area penyaluran", key: "name", render: (area) => area.name },
  {
    header: "Wilayah",
    key: "region",
    render: (area) =>
      [area.city, area.province].filter(Boolean).join(", ") || "Belum dicatat",
  },
  {
    align: "right",
    header: "Kuota terpakai",
    key: "quota",
    render: (area) => `${area.quota_used} / ${area.quota_capacity}`,
  },
  {
    header: "Status",
    key: "status",
    render: (area) => (
      <StatusBadge tone={tone(area.status)}>{label(area.status)}</StatusBadge>
    ),
  },
];

const partnerColumns: ResourceTableColumn<Partner>[] = [
  {
    header: "Mitra penyalur",
    key: "partner",
    render: (partner) => partner.partner_name,
  },
  {
    header: "Cakupan",
    key: "area",
    render: (partner) => partner.delivery_area_name ?? "Lintas area",
  },
  {
    header: "Peran",
    key: "role",
    render: (partner) => label(partner.assignment_role),
  },
  {
    header: "PIC",
    key: "pic",
    render: (partner) => partner.pic_name ?? "Belum ditetapkan",
  },
  {
    header: "Kesiapan",
    key: "readiness",
    render: (partner) => (
      <StatusBadge tone={tone(partner.readiness_status)}>
        {label(partner.readiness_status)}
      </StatusBadge>
    ),
  },
];

const allocationColumns: ResourceTableColumn<Allocation>[] = [
  {
    header: "Pengajuan",
    key: "application",
    render: (allocation) => (
      <div className="grid gap-1">
        <span className="font-medium">{allocation.applicant_name}</span>
        <span className="text-muted-foreground font-mono text-xs">
          {allocation.application_reference}
        </span>
      </div>
    ),
  },
  {
    header: "Area",
    key: "area",
    render: (allocation) => allocation.delivery_area_name ?? "Belum ditentukan",
  },
  {
    header: "Mitra",
    key: "partner",
    render: (allocation) => allocation.partner_name ?? "Belum ditentukan",
  },
  {
    header: "Status alokasi",
    key: "status",
    render: (allocation) => (
      <StatusBadge tone={tone(allocation.status)}>
        {label(allocation.status)}
      </StatusBadge>
    ),
  },
];

export function ProgramOperationsPanel({ programId }: { programId: string }) {
  const operations = useQuery({
    queryKey: ["program-operations", programId],
    queryFn: () =>
      apiFetch<Envelope<ProgramOperations>>(
        `/api/v1/programs/${programId}/operations`,
      ),
    retry: false,
    staleTime: 30_000,
  });
  const data = operations.data?.data;
  const refetch = () => void operations.refetch();

  if (operations.isError) {
    return (
      <ErrorState
        title="Operasional program belum dapat dimuat"
        description={
          operations.error instanceof Error
            ? operations.error.message
            : "Periksa akses dan koneksi Anda."
        }
        onRetry={refetch}
      />
    );
  }

  return (
    <DetailSection
      title="Area, mitra, dan kuota penyaluran"
      description="Kelola kapasitas, mitra pelaksana, dan alokasi pengajuan pada satu tampilan operasional."
    >
      {operations.isLoading || !data ? (
        <p className="text-muted-foreground py-4 text-sm">
          Memuat operasional program…
        </p>
      ) : (
        <div className="program-operations">
          <AreaSection data={data} onSuccess={refetch} programId={programId} />
          <PartnerSection
            data={data}
            onSuccess={refetch}
            programId={programId}
          />
          <AllocationSection
            data={data}
            onSuccess={refetch}
            programId={programId}
          />
        </div>
      )}
    </DetailSection>
  );
}

function AreaSection({
  data,
  onSuccess,
  programId,
}: {
  data: ProgramOperations;
  onSuccess: () => void;
  programId: string;
}) {
  const [form, setForm] = useState({
    city: "",
    code: "",
    name: "",
    province: "",
    quota_capacity: "0",
  });
  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<Envelope<Area>>(
        `/api/v1/programs/${programId}/operations/areas`,
        {
          body: JSON.stringify({
            ...form,
            quota_capacity: Number(form.quota_capacity),
          }),
          method: "POST",
        },
      ),
    onSuccess: () => {
      setForm({
        city: "",
        code: "",
        name: "",
        province: "",
        quota_capacity: "0",
      });
      onSuccess();
    },
  });

  return (
    <section
      className="program-operations__section"
      aria-labelledby="program-areas-title"
    >
      <SectionHeading
        description="Kapasitas 0 belum dapat menerima reservasi."
        id="program-areas-title"
        title="Area penyaluran"
      />
      <ResourceTable
        columns={areaColumns}
        getRowId={(area) => area.id}
        items={data.areas}
        empty={
          <EmptyState
            title="Belum ada area penyaluran"
            description="Tambahkan area sebelum melakukan reservasi kuota."
          />
        }
      />
      <CanAccess action="manage" resource="programs">
        <details className="program-operations__command">
          <summary>Tambah area</summary>
          <form
            className="form-grid mt-3"
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              mutation.mutate();
            }}
          >
            <Field label="Kode area">
              <input
                required
                value={form.code}
                onChange={(event) =>
                  setForm({ ...form, code: event.target.value })
                }
              />
            </Field>
            <Field label="Nama area">
              <input
                required
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
              />
            </Field>
            <Field label="Kota/Kabupaten">
              <input
                value={form.city}
                onChange={(event) =>
                  setForm({ ...form, city: event.target.value })
                }
              />
            </Field>
            <Field label="Provinsi">
              <input
                value={form.province}
                onChange={(event) =>
                  setForm({ ...form, province: event.target.value })
                }
              />
            </Field>
            <Field label="Kuota penerima">
              <input
                min="0"
                required
                type="number"
                value={form.quota_capacity}
                onChange={(event) =>
                  setForm({ ...form, quota_capacity: event.target.value })
                }
              />
            </Field>
            <MutationButton error={mutation.error} pending={mutation.isPending}>
              Simpan area
            </MutationButton>
          </form>
        </details>
      </CanAccess>
    </section>
  );
}

function PartnerSection({
  data,
  onSuccess,
  programId,
}: {
  data: ProgramOperations;
  onSuccess: () => void;
  programId: string;
}) {
  const [form, setForm] = useState({
    assignment_role: "distributor",
    delivery_area_id: "",
    partner_contact_id: "",
    pic_name: "",
    readiness_status: "pending",
  });
  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<Envelope<Partner>>(
        `/api/v1/programs/${programId}/operations/partners`,
        {
          body: JSON.stringify({
            ...form,
            delivery_area_id: form.delivery_area_id || undefined,
            pic_name: form.pic_name || undefined,
          }),
          method: "POST",
        },
      ),
    onSuccess: () => {
      setForm({
        assignment_role: "distributor",
        delivery_area_id: "",
        partner_contact_id: "",
        pic_name: "",
        readiness_status: "pending",
      });
      onSuccess();
    },
  });

  return (
    <section
      className="program-operations__section"
      aria-labelledby="program-partners-title"
    >
      <SectionHeading
        description="Hanya contact aktif dengan peran mitra penyalur yang dapat ditugaskan."
        id="program-partners-title"
        title="Mitra terlibat"
      />
      <ResourceTable
        columns={partnerColumns}
        getRowId={(partner) => partner.id}
        items={data.partners}
        empty={
          <EmptyState
            title="Belum ada mitra yang ditugaskan"
            description="Kelola mitra di Contact Master lalu tetapkan perannya di sini."
          />
        }
      />
      <CanAccess action="manage" resource="programs">
        <details className="program-operations__command">
          <summary>Tugaskan mitra</summary>
          <form
            className="form-grid mt-3"
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              mutation.mutate();
            }}
          >
            <Field label="Mitra">
              <select
                required
                value={form.partner_contact_id}
                onChange={(event) =>
                  setForm({ ...form, partner_contact_id: event.target.value })
                }
              >
                <option value="">Pilih mitra</option>
                {data.partnerCandidates.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.display_name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Area">
              <select
                value={form.delivery_area_id}
                onChange={(event) =>
                  setForm({ ...form, delivery_area_id: event.target.value })
                }
              >
                <option value="">Lintas area</option>
                {data.areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Peran">
              <select
                value={form.assignment_role}
                onChange={(event) =>
                  setForm({ ...form, assignment_role: event.target.value })
                }
              >
                <option value="lead">Lead</option>
                <option value="coordinator">Koordinator</option>
                <option value="distributor">Penyalur</option>
                <option value="monitor">Monitoring</option>
              </select>
            </Field>
            <Field label="Status kesiapan">
              <select
                value={form.readiness_status}
                onChange={(event) =>
                  setForm({ ...form, readiness_status: event.target.value })
                }
              >
                <option value="pending">Menunggu</option>
                <option value="ready">Siap</option>
                <option value="accepted">Diterima</option>
                <option value="declined">Menolak</option>
              </select>
            </Field>
            <Field label="Nama PIC">
              <input
                value={form.pic_name}
                onChange={(event) =>
                  setForm({ ...form, pic_name: event.target.value })
                }
              />
            </Field>
            <MutationButton error={mutation.error} pending={mutation.isPending}>
              Tetapkan mitra
            </MutationButton>
          </form>
        </details>
      </CanAccess>
    </section>
  );
}

function AllocationSection({
  data,
  onSuccess,
  programId,
}: {
  data: ProgramOperations;
  onSuccess: () => void;
  programId: string;
}) {
  const [form, setForm] = useState({
    application_id: "",
    delivery_area_id: "",
    notes: "",
    partner_assignment_id: "",
    status: "waitlisted",
  });
  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<Envelope<Allocation>>(
        `/api/v1/programs/${programId}/operations/allocations`,
        {
          body: JSON.stringify({
            ...form,
            delivery_area_id: form.delivery_area_id || undefined,
            notes: form.notes || undefined,
            partner_assignment_id: form.partner_assignment_id || undefined,
          }),
          headers: { "Idempotency-Key": crypto.randomUUID() },
          method: "POST",
        },
      ),
    onSuccess: () => {
      setForm({
        application_id: "",
        delivery_area_id: "",
        notes: "",
        partner_assignment_id: "",
        status: "waitlisted",
      });
      onSuccess();
    },
  });

  return (
    <section
      className="program-operations__section"
      aria-labelledby="program-allocations-title"
    >
      <SectionHeading
        description="Reservasi dan alokasi hanya untuk kasus eligible; waitlist tidak memakai kuota."
        id="program-allocations-title"
        title="Waitlist & alokasi kuota"
      />
      <ResourceTable
        columns={allocationColumns}
        getRowId={(allocation) => allocation.id}
        items={data.allocations}
        empty={
          <EmptyState
            title="Belum ada alokasi pengajuan"
            description="Pilih pengajuan untuk waitlist, reservasi area, atau alokasi."
          />
        }
      />
      <CanAccess action="manage" resource="programs">
        <details className="program-operations__command">
          <summary>Atur alokasi</summary>
          <form
            className="form-grid mt-3"
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              mutation.mutate();
            }}
          >
            <Field label="Pengajuan">
              <select
                required
                value={form.application_id}
                onChange={(event) =>
                  setForm({ ...form, application_id: event.target.value })
                }
              >
                <option value="">Pilih pengajuan</option>
                {data.candidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.applicant_name} — {candidate.reference_number} (
                    {label(candidate.case_status)})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                value={form.status}
                onChange={(event) =>
                  setForm({ ...form, status: event.target.value })
                }
              >
                <option value="waitlisted">Waitlist</option>
                <option value="reserved">Reservasi kuota</option>
                <option value="allocated">Dialokasikan</option>
              </select>
            </Field>
            <Field label="Area penyaluran">
              <select
                required={form.status !== "waitlisted"}
                value={form.delivery_area_id}
                onChange={(event) =>
                  setForm({ ...form, delivery_area_id: event.target.value })
                }
              >
                <option value="">
                  {form.status === "waitlisted"
                    ? "Belum ditentukan"
                    : "Pilih area"}
                </option>
                {data.areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name} ({area.quota_used}/{area.quota_capacity})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Mitra pelaksana">
              <select
                value={form.partner_assignment_id}
                onChange={(event) =>
                  setForm({
                    ...form,
                    partner_assignment_id: event.target.value,
                  })
                }
              >
                <option value="">Belum ditentukan</option>
                {data.partners
                  .filter((partner) =>
                    ["ready", "accepted"].includes(partner.readiness_status),
                  )
                  .map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {partner.partner_name} —{" "}
                      {partner.delivery_area_name ?? "Lintas area"}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Catatan">
              <input
                value={form.notes}
                onChange={(event) =>
                  setForm({ ...form, notes: event.target.value })
                }
              />
            </Field>
            <MutationButton error={mutation.error} pending={mutation.isPending}>
              Simpan alokasi
            </MutationButton>
          </form>
        </details>
      </CanAccess>
    </section>
  );
}

function SectionHeading({
  description,
  id,
  title,
}: {
  description: string;
  id: string;
  title: string;
}) {
  return (
    <header className="program-operations__heading">
      <div>
        <h3 id={id}>{title}</h3>
        <p>{description}</p>
      </div>
    </header>
  );
}

function Field({
  children,
  label: title,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="auth-field">
      <Label>{title}</Label>
      {children}
    </div>
  );
}

function MutationButton({
  children,
  error,
  pending,
}: {
  children: ReactNode;
  error: Error | null;
  pending: boolean;
}) {
  return (
    <div className="sm:col-span-2">
      <Button disabled={pending} type="submit">
        {children}
      </Button>
      {error ? (
        <p className="text-destructive mt-2 text-xs">{error.message}</p>
      ) : null}
    </div>
  );
}
