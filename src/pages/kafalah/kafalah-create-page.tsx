import {
  useCreate,
  useList,
  useNavigation,
  type HttpError,
} from "@refinedev/core";
import { ArrowLeft, Save } from "lucide-react";
import { useState, type FormEvent } from "react";

import {
  ErrorState,
  FormSection,
  PageHeader,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type {
  KafalahContactOption,
  KafalahMatch,
  KafalahNeed,
} from "@/features/kafalah/types";

type Kind = "contract" | "match" | "need";

const today = () => new Date().toISOString().slice(0, 10);
const nextYear = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
};

export function KafalahCreatePage({ kind }: { kind: Kind }) {
  const { list, show } = useNavigation();
  const resources = {
    contract: "kafalah_contracts",
    match: "kafalah_matches",
    need: "kafalah_needs",
  } as const;
  const labels = { contract: "Kontrak", match: "Matching", need: "Kebutuhan" };
  const beneficiaries = useList<KafalahContactOption>({
    resource: "kafalah_beneficiaries",
    pagination: { currentPage: 1, pageSize: 100, mode: "server" },
    queryOptions: { enabled: kind === "need" },
  });
  const sponsors = useList<KafalahContactOption>({
    resource: "kafalah_sponsors",
    pagination: { currentPage: 1, pageSize: 100, mode: "server" },
    queryOptions: { enabled: kind === "match" },
  });
  const needs = useList<KafalahNeed>({
    resource: "kafalah_needs",
    filters: [{ field: "status", operator: "eq", value: "approved" }],
    pagination: { currentPage: 1, pageSize: 100, mode: "server" },
    queryOptions: { enabled: kind === "match" },
  });
  const matches = useList<KafalahMatch>({
    resource: "kafalah_matches",
    filters: [{ field: "status", operator: "eq", value: "proposed" }],
    pagination: { currentPage: 1, pageSize: 100, mode: "server" },
    queryOptions: { enabled: kind === "contract" },
  });
  const { mutate, mutation } = useCreate<Record<string, unknown>, HttpError>();
  const [need, setNeed] = useState({
    beneficiary_contact_id: "",
    need_type: "living",
    title: "",
    description: "",
    approved_amount: "",
    currency: "IDR",
    period_months: "12",
  });
  const [match, setMatch] = useState({
    need_id: "",
    sponsor_contact_id: "",
    matched_amount: "",
    start_date: today(),
    end_date: nextYear(),
  });
  const [contract, setContract] = useState({
    match_id: "",
    frequency: "monthly",
    periodic_amount: "",
    start_date: today(),
    end_date: nextYear(),
    terms: "",
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const values =
      kind === "need"
        ? { ...need, period_months: Number(need.period_months) }
        : kind === "match"
          ? match
          : contract;
    mutate(
      { resource: resources[kind], values },
      {
        onSuccess: ({ data }) =>
          kind === "contract"
            ? show("kafalah_contracts", String(data.id))
            : list(resources[kind]),
      },
    );
  };

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow="Kafalah"
        title={`${labels[kind]} Baru`}
        description="Semua referensi dibuat server-side dan terikat pada organisasi aktif."
        actions={
          <Button variant="outline" onClick={() => list("kafalah_contracts")}>
            <ArrowLeft size={16} /> Daftar
          </Button>
        }
      />
      {mutation.isError ? (
        <ErrorState
          title={`${labels[kind]} tidak dapat disimpan`}
          description={
            mutation.error?.message ?? "Periksa nilai, status, dan permission."
          }
        />
      ) : null}
      <form onSubmit={submit}>
        <FormSection
          title={`Data ${labels[kind].toLowerCase()}`}
          description="Kolom bertanda wajib harus diisi sebelum disimpan."
        >
          {kind === "need" ? (
            <div className="form-grid">
              <Field label="Penerima manfaat">
                <select
                  required
                  value={need.beneficiary_contact_id}
                  onChange={(e) =>
                    setNeed((v) => ({
                      ...v,
                      beneficiary_contact_id: e.target.value,
                    }))
                  }
                >
                  <option value="">Pilih penerima</option>
                  {(beneficiaries.result?.data ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.display_name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Jenis">
                <select
                  value={need.need_type}
                  onChange={(e) =>
                    setNeed((v) => ({ ...v, need_type: e.target.value }))
                  }
                >
                  {[
                    "education",
                    "living",
                    "health",
                    "orphan_care",
                    "dakwah",
                    "other",
                  ].map((value) => (
                    <option key={value} value={value}>
                      {value.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Judul">
                <input
                  required
                  minLength={5}
                  value={need.title}
                  onChange={(e) =>
                    setNeed((v) => ({ ...v, title: e.target.value }))
                  }
                />
              </Field>
              <Field label="Nilai kebutuhan">
                <input
                  required
                  inputMode="decimal"
                  value={need.approved_amount}
                  onChange={(e) =>
                    setNeed((v) => ({ ...v, approved_amount: e.target.value }))
                  }
                />
              </Field>
              <Field label="Durasi (bulan)">
                <input
                  required
                  type="number"
                  min={1}
                  max={120}
                  value={need.period_months}
                  onChange={(e) =>
                    setNeed((v) => ({ ...v, period_months: e.target.value }))
                  }
                />
              </Field>
              <Field label="Deskripsi" wide>
                <textarea
                  required
                  minLength={10}
                  rows={5}
                  value={need.description}
                  onChange={(e) =>
                    setNeed((v) => ({ ...v, description: e.target.value }))
                  }
                />
              </Field>
            </div>
          ) : kind === "match" ? (
            <div className="form-grid">
              <Field label="Kebutuhan approved">
                <select
                  required
                  value={match.need_id}
                  onChange={(e) =>
                    setMatch((v) => ({ ...v, need_id: e.target.value }))
                  }
                >
                  <option value="">Pilih kebutuhan</option>
                  {(needs.result?.data ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.reference_number} — {item.title}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Kafil">
                <select
                  required
                  value={match.sponsor_contact_id}
                  onChange={(e) =>
                    setMatch((v) => ({
                      ...v,
                      sponsor_contact_id: e.target.value,
                    }))
                  }
                >
                  <option value="">Pilih kafil</option>
                  {(sponsors.result?.data ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.display_name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Nilai matching">
                <input
                  required
                  inputMode="decimal"
                  value={match.matched_amount}
                  onChange={(e) =>
                    setMatch((v) => ({ ...v, matched_amount: e.target.value }))
                  }
                />
              </Field>
              <Field label="Tanggal mulai">
                <input
                  required
                  type="date"
                  value={match.start_date}
                  onChange={(e) =>
                    setMatch((v) => ({ ...v, start_date: e.target.value }))
                  }
                />
              </Field>
              <Field label="Tanggal akhir">
                <input
                  required
                  type="date"
                  value={match.end_date}
                  onChange={(e) =>
                    setMatch((v) => ({ ...v, end_date: e.target.value }))
                  }
                />
              </Field>
            </div>
          ) : (
            <div className="form-grid">
              <Field label="Matching proposed">
                <select
                  required
                  value={contract.match_id}
                  onChange={(e) =>
                    setContract((v) => ({ ...v, match_id: e.target.value }))
                  }
                >
                  <option value="">Pilih matching</option>
                  {(matches.result?.data ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.reference_number} — {item.sponsor_name} →{" "}
                      {item.beneficiary_name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Frekuensi">
                <select
                  value={contract.frequency}
                  onChange={(e) =>
                    setContract((v) => ({ ...v, frequency: e.target.value }))
                  }
                >
                  <option value="monthly">Bulanan</option>
                  <option value="quarterly">Triwulanan</option>
                  <option value="one_time">Sekali</option>
                </select>
              </Field>
              <Field label="Nilai per periode">
                <input
                  required
                  inputMode="decimal"
                  value={contract.periodic_amount}
                  onChange={(e) =>
                    setContract((v) => ({
                      ...v,
                      periodic_amount: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Tanggal mulai">
                <input
                  required
                  type="date"
                  value={contract.start_date}
                  onChange={(e) =>
                    setContract((v) => ({ ...v, start_date: e.target.value }))
                  }
                />
              </Field>
              <Field label="Tanggal akhir">
                <input
                  required
                  type="date"
                  value={contract.end_date}
                  onChange={(e) =>
                    setContract((v) => ({ ...v, end_date: e.target.value }))
                  }
                />
              </Field>
              <Field label="Syarat dan ketentuan" wide>
                <textarea
                  required
                  minLength={20}
                  rows={7}
                  value={contract.terms}
                  onChange={(e) =>
                    setContract((v) => ({ ...v, terms: e.target.value }))
                  }
                />
              </Field>
            </div>
          )}
        </FormSection>
        <div className="form-actions">
          <Button type="submit" disabled={mutation.isPending}>
            <Save size={16} /> {mutation.isPending ? "Menyimpan…" : "Simpan"}
          </Button>
        </div>
      </form>
    </section>
  );
}

function Field({
  children,
  label,
  wide = false,
}: {
  children: React.ReactNode;
  label: string;
  wide?: boolean;
}) {
  return (
    <div className={`auth-field${wide ? "form-field--wide" : ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
