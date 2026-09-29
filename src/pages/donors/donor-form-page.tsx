import { useList } from "@refinedev/core";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";

import { ErrorState, FormSection, LoadingSkeleton, PageHeader } from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Label } from "@/components/ui/label";
import type { DonorDetail } from "@/features/donors/types";
import {
  donorChannelLabels,
  donorInterestLabels,
  donorSegmentLabels,
  donorSourceLabels,
  optionsOf,
  receiptPreferenceLabels,
  recurringFrequencyLabels,
  reportPreferenceLabels,
} from "@/features/giving/labels";
import { useOrganization } from "@/features/organizations/organization-context";
import type { CrmContactsDocument } from "@/generated/neon/models";
import { apiFetch } from "@/lib/neon/http";

type Member = { display_name: string; id: string };

const emptyContact = {
  address_line: "",
  birth_date: "",
  city: "",
  contact_type: "person" as "institution" | "person",
  display_name: "",
  gender: "",
  primary_email: "",
  primary_phone: "",
  province: "",
  whatsapp_phone: "",
};

const emptyProfile = {
  acquisition_source: "",
  giving_interests: [] as string[],
  notes: "",
  preferred_channel: "whatsapp",
  publish_name: true,
  receipt_preference: "whatsapp",
  recurring_amount: "",
  recurring_day: "",
  recurring_frequency: "none",
  relationship_manager_id: "",
  report_preference: "quarterly",
  segment: "regular",
  status: "active",
};

type ContactState = typeof emptyContact;
type ProfileState = typeof emptyProfile;

function initialState(detail: DonorDetail | undefined): { contact: ContactState; profile: ProfileState } {
  if (!detail) return { contact: emptyContact, profile: emptyProfile };
  const { contact, profile } = detail;
  return {
    contact: {
      address_line: contact.address_line ?? "",
      birth_date: contact.birth_date?.slice(0, 10) ?? "",
      city: contact.city ?? "",
      contact_type: contact.contact_type,
      display_name: contact.display_name,
      gender: contact.gender ?? "",
      primary_email: contact.primary_email ?? "",
      primary_phone: contact.primary_phone ?? "",
      province: contact.province ?? "",
      whatsapp_phone: contact.whatsapp_phone ?? "",
    },
    profile: profile
      ? {
          acquisition_source: profile.acquisition_source ?? "",
          giving_interests: profile.giving_interests ?? [],
          notes: profile.notes ?? "",
          preferred_channel: profile.preferred_channel,
          publish_name: profile.publish_name,
          receipt_preference: profile.receipt_preference,
          recurring_amount: profile.recurring_amount ? String(Number(profile.recurring_amount)) : "",
          recurring_day: profile.recurring_day ? String(profile.recurring_day) : "",
          recurring_frequency: profile.recurring_frequency,
          relationship_manager_id: profile.relationship_manager_id ?? "",
          report_preference: profile.report_preference,
          segment: profile.segment,
          status: profile.status,
        }
      : emptyProfile,
  };
}

export function DonorFormPage() {
  const { id } = useParams();
  const { activeOrganization } = useOrganization();
  const organizationId = activeOrganization?.organization.$id ?? "";
  const detail = useQuery({
    enabled: Boolean(organizationId && id),
    queryFn: () => apiFetch<{ data: DonorDetail }>(`/api/v1/donors/${id}`),
    queryKey: ["donors", "detail", organizationId, id],
  });

  if (id && detail.isLoading) {
    return (
      <section className="workspace-page">
        <LoadingSkeleton lines={8} />
      </section>
    );
  }
  if (id && (detail.isError || !detail.data)) {
    return (
      <section className="workspace-page">
        <ErrorState title="Donatur tidak dapat dimuat" onRetry={() => detail.refetch()} />
      </section>
    );
  }
  return <DonorForm detail={detail.data?.data} donorId={id} key={id ?? "new"} />;
}

function DonorForm({ detail, donorId }: { detail: DonorDetail | undefined; donorId: string | undefined }) {
  const navigate = useNavigate();
  const { activeOrganization } = useOrganization();
  const organizationId = activeOrganization?.organization.$id ?? "";
  const initial = initialState(detail);
  const [mode, setMode] = useState<"existing" | "new">("new");
  const [contact, setContact] = useState(initial.contact);
  const [profile, setProfile] = useState(initial.profile);
  const [existingId, setExistingId] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const setC = (patch: Partial<ContactState>) => setContact((value) => ({ ...value, ...patch }));
  const setP = (patch: Partial<ProfileState>) => setProfile((value) => ({ ...value, ...patch }));

  const members = useQuery({
    enabled: Boolean(organizationId),
    queryFn: () => apiFetch<{ data: Member[] }>("/api/v1/field/members"),
    queryKey: ["field", "members", organizationId],
    retry: false,
  });
  const contacts = useList<CrmContactsDocument>({
    resource: "crm_contacts",
    filters: organizationId ? [{ field: "organization_id", operator: "eq", value: organizationId }] : [],
    pagination: { currentPage: 1, pageSize: 100, mode: "server" },
    queryOptions: { enabled: !donorId && mode === "existing" && Boolean(organizationId) },
  });
  const contactOptions = (contacts.result?.data ?? []).filter((item) =>
    item.display_name.toLowerCase().includes(contactSearch.trim().toLowerCase()),
  );

  const toggleInterest = (value: string) =>
    setP({
      giving_interests: profile.giving_interests.includes(value)
        ? profile.giving_interests.filter((item) => item !== value)
        : [...profile.giving_interests, value],
    });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const recurring = profile.recurring_frequency !== "none";
    const profilePayload = {
      acquisition_source: profile.acquisition_source || null,
      giving_interests: profile.giving_interests,
      notes: profile.notes || undefined,
      preferred_channel: profile.preferred_channel,
      publish_name: profile.publish_name,
      receipt_preference: profile.receipt_preference,
      recurring_amount: recurring ? profile.recurring_amount : null,
      recurring_day: recurring && profile.recurring_day ? Number(profile.recurring_day) : null,
      recurring_frequency: profile.recurring_frequency,
      relationship_manager_id: profile.relationship_manager_id || null,
      report_preference: profile.report_preference,
      segment: profile.segment,
      status: profile.status,
    };
    const contactPayload = {
      ...contact,
      birth_date: contact.contact_type === "person" ? contact.birth_date || null : null,
      gender: contact.contact_type === "person" ? contact.gender || null : null,
    };
    try {
      if (donorId) {
        await apiFetch(`/api/v1/donors/${donorId}`, {
          body: JSON.stringify({ contact: contactPayload, profile: profilePayload }),
          method: "PUT",
        });
        navigate(`/donors/${donorId}`);
      } else {
        const response = await apiFetch<{ data: { id: string } }>("/api/v1/donors", {
          body: JSON.stringify(
            mode === "existing"
              ? { contact_id: existingId, profile: profilePayload }
              : { contact: contactPayload, profile: profilePayload },
          ),
          method: "POST",
        });
        navigate(`/donors/${response.data.id}`);
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Data donatur belum tersimpan.");
      setSubmitting(false);
    }
  };

  const showContactFields = Boolean(donorId) || mode === "new";

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow="Penghimpunan"
        title={donorId ? `Ubah profil ${detail?.contact.display_name ?? "donatur"}` : "Tambah donatur / wakif"}
        description="Profil relasi membantu tim menyapa donatur di waktu dan saluran yang tepat. Riwayat pemberian tercatat otomatis dari transaksi donasi, wakaf, barang, dan kafalah."
        actions={
          <Link className={buttonVariants({ variant: "outline" })} to={donorId ? `/donors/${donorId}` : "/donors"}>
            <ArrowLeft aria-hidden size={16} /> Kembali
          </Link>
        }
      />
      {error ? <ErrorState title="Data belum tersimpan" description={error} /> : null}

      <form onSubmit={submit}>
        {!donorId ? (
          <FormSection title="1. Siapa donaturnya?">
            <div className="choice-grid choice-grid--compact">
              <label className="choice-card" data-selected={mode === "new"}>
                <input checked={mode === "new"} name="mode" type="radio" onChange={() => setMode("new")} />
                <strong>Donatur baru</strong>
                <small>Isi data kontak baru.</small>
              </label>
              <label className="choice-card" data-selected={mode === "existing"}>
                <input checked={mode === "existing"} name="mode" type="radio" onChange={() => setMode("existing")} />
                <strong>Dari kontak yang ada</strong>
                <small>Mis. mitra atau penerima yang kini ikut berdonasi.</small>
              </label>
            </div>
            {mode === "existing" ? (
              <div className="form-grid mt-3">
                <div className="auth-field">
                  <Label htmlFor="contact-search">Cari kontak</Label>
                  <input id="contact-search" placeholder="Ketik nama…" value={contactSearch} onChange={(event) => setContactSearch(event.target.value)} />
                </div>
                <div className="auth-field">
                  <Label htmlFor="contact-id">Kontak *</Label>
                  <select id="contact-id" required value={existingId} onChange={(event) => setExistingId(event.target.value)}>
                    <option value="">{contacts.query.isLoading ? "Memuat…" : "Pilih kontak"}</option>
                    {contactOptions.slice(0, 50).map((item) => (
                      <option key={item.$id} value={item.$id}>
                        {item.display_name}
                        {item.city ? ` — ${item.city}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : null}
          </FormSection>
        ) : null}

        {showContactFields ? (
          <FormSection title={donorId ? "Data kontak" : "2. Data kontak"}>
            <div className="form-grid">
              <div className="auth-field">
                <Label htmlFor="contact_type">Jenis</Label>
                <select id="contact_type" value={contact.contact_type} onChange={(event) => setC({ contact_type: event.target.value as ContactState["contact_type"] })}>
                  <option value="person">Perorangan / keluarga</option>
                  <option value="institution">Lembaga / perusahaan</option>
                </select>
              </div>
              <div className="auth-field">
                <Label htmlFor="display_name">Nama *</Label>
                <input id="display_name" minLength={2} required value={contact.display_name} onChange={(event) => setC({ display_name: event.target.value })} placeholder={contact.contact_type === "person" ? "Mis. Bpk. Ahmad Fauzi" : "Mis. PT Amanah Sejahtera"} />
              </div>
              <div className="auth-field">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <input id="whatsapp" inputMode="tel" value={contact.whatsapp_phone} onChange={(event) => setC({ whatsapp_phone: event.target.value })} placeholder="08…" />
              </div>
              <div className="auth-field">
                <Label htmlFor="phone">Telepon</Label>
                <input id="phone" inputMode="tel" value={contact.primary_phone} onChange={(event) => setC({ primary_phone: event.target.value })} />
              </div>
              <div className="auth-field">
                <Label htmlFor="email">Email</Label>
                <input id="email" type="email" value={contact.primary_email} onChange={(event) => setC({ primary_email: event.target.value })} />
              </div>
              {contact.contact_type === "person" ? (
                <>
                  <div className="auth-field">
                    <Label htmlFor="birth_date">Tanggal lahir</Label>
                    <input id="birth_date" type="date" value={contact.birth_date} onChange={(event) => setC({ birth_date: event.target.value })} />
                  </div>
                  <div className="auth-field">
                    <Label htmlFor="gender">Jenis kelamin</Label>
                    <select id="gender" value={contact.gender} onChange={(event) => setC({ gender: event.target.value })}>
                      <option value="">—</option>
                      <option value="male">Laki-laki</option>
                      <option value="female">Perempuan</option>
                    </select>
                  </div>
                </>
              ) : null}
              <div className="auth-field auth-field--wide">
                <Label htmlFor="address">Alamat</Label>
                <input id="address" value={contact.address_line} onChange={(event) => setC({ address_line: event.target.value })} />
              </div>
              <div className="auth-field">
                <Label htmlFor="city">Kota / kabupaten</Label>
                <input id="city" value={contact.city} onChange={(event) => setC({ city: event.target.value })} />
              </div>
              <div className="auth-field">
                <Label htmlFor="province">Provinsi</Label>
                <input id="province" value={contact.province} onChange={(event) => setC({ province: event.target.value })} />
              </div>
            </div>
          </FormSection>
        ) : null}

        <FormSection title="Profil relasi" description="Segmen dan minat membantu memilih program yang ditawarkan serta cara menyapa.">
          <div className="form-grid">
            <div className="auth-field">
              <Label htmlFor="segment">Segmen</Label>
              <select id="segment" value={profile.segment} onChange={(event) => setP({ segment: event.target.value })}>
                {optionsOf(donorSegmentLabels).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="auth-field">
              <Label htmlFor="source">Mengenal lembaga dari</Label>
              <select id="source" value={profile.acquisition_source} onChange={(event) => setP({ acquisition_source: event.target.value })}>
                <option value="">—</option>
                {optionsOf(donorSourceLabels).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="auth-field">
              <Label htmlFor="manager">PIC / pendamping</Label>
              <select id="manager" value={profile.relationship_manager_id} onChange={(event) => setP({ relationship_manager_id: event.target.value })}>
                <option value="">Belum ditentukan</option>
                {(members.data?.data ?? []).map((member) => (
                  <option key={member.id} value={member.id}>{member.display_name}</option>
                ))}
              </select>
            </div>
            <div className="auth-field">
              <Label htmlFor="status">Status</Label>
              <select id="status" value={profile.status} onChange={(event) => setP({ status: event.target.value })}>
                <option value="active">Aktif dikelola</option>
                <option value="inactive">Tidak dikelola lagi</option>
              </select>
            </div>
            <div className="auth-field auth-field--wide">
              <Label>Minat pemberian</Label>
              <div className="donor-interest-grid">
                {optionsOf(donorInterestLabels).map((option) => (
                  <label data-selected={profile.giving_interests.includes(option.value)} key={option.value}>
                    <input checked={profile.giving_interests.includes(option.value)} type="checkbox" onChange={() => toggleInterest(option.value)} />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </FormSection>

        <FormSection title="Komitmen donasi rutin" description="Untuk donatur yang berjanji memberi secara berkala (mis. Rp100.000 tiap bulan tanggal 5).">
          <div className="form-grid">
            <div className="auth-field">
              <Label htmlFor="frequency">Frekuensi</Label>
              <select id="frequency" value={profile.recurring_frequency} onChange={(event) => setP({ recurring_frequency: event.target.value })}>
                {optionsOf(recurringFrequencyLabels).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            {profile.recurring_frequency !== "none" ? (
              <>
                <div className="auth-field">
                  <Label htmlFor="recurring_amount">Nominal (Rp) *</Label>
                  <input id="recurring_amount" inputMode="numeric" required value={profile.recurring_amount} onChange={(event) => setP({ recurring_amount: event.target.value.replace(/[^\d]/g, "") })} placeholder="100000" />
                </div>
                <div className="auth-field">
                  <Label htmlFor="recurring_day">Tanggal pengingat</Label>
                  <input id="recurring_day" inputMode="numeric" max={31} min={1} type="number" value={profile.recurring_day} onChange={(event) => setP({ recurring_day: event.target.value })} placeholder="Mis. 5" />
                </div>
              </>
            ) : null}
          </div>
        </FormSection>

        <FormSection title="Komunikasi & laporan">
          <div className="form-grid">
            <div className="auth-field">
              <Label htmlFor="channel">Saluran favorit</Label>
              <select id="channel" value={profile.preferred_channel} onChange={(event) => setP({ preferred_channel: event.target.value })}>
                {optionsOf(donorChannelLabels).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="auth-field">
              <Label htmlFor="receipt">Bukti terima / kuitansi</Label>
              <select id="receipt" value={profile.receipt_preference} onChange={(event) => setP({ receipt_preference: event.target.value })}>
                {optionsOf(receiptPreferenceLabels).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="auth-field">
              <Label htmlFor="report">Laporan penyaluran</Label>
              <select id="report" value={profile.report_preference} onChange={(event) => setP({ report_preference: event.target.value })}>
                {optionsOf(reportPreferenceLabels).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="auth-field">
              <Label>
                <input checked={profile.publish_name} className="mr-2" type="checkbox" onChange={(event) => setP({ publish_name: event.target.checked })} />
                Nama boleh dicantumkan di publikasi
              </Label>
              <span className="auth-field__message">Matikan bila donatur ingin tetap anonim (hamba Allah).</span>
            </div>
            <div className="auth-field auth-field--wide">
              <Label htmlFor="notes">Catatan</Label>
              <textarea id="notes" maxLength={2000} rows={3} value={profile.notes} onChange={(event) => setP({ notes: event.target.value })} placeholder="Mis. lebih suka dihubungi setelah Isya; tertarik program pendidikan anak yatim." />
            </div>
          </div>
        </FormSection>

        <div className="form-actions">
          <Button disabled={submitting} type="submit">
            <Save aria-hidden size={16} /> {submitting ? "Menyimpan…" : "Simpan donatur"}
          </Button>
        </div>
      </form>
    </section>
  );
}
