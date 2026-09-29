import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BellRing,
  CheckCircle2,
  FileText,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Repeat,
  UserCog,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";

import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  MoneyDisplay,
  PageHeader,
  StatusBadge,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Label } from "@/components/ui/label";
import { engagementTone, formatShortDate, waLink } from "@/features/donors/format";
import type { DonorDetail, DonorInteraction } from "@/features/donors/types";
import {
  donorChannelLabels,
  donorEngagementHints,
  donorEngagementLabels,
  donorGivingKindLabels,
  donorInterestLabels,
  donorSegmentLabels,
  donorSourceLabels,
  interactionDirectionLabels,
  interactionTypeLabels,
  labelOf,
  optionsOf,
  receiptPreferenceLabels,
  recurringFrequencyLabels,
  reportPreferenceLabels,
  toneOf,
} from "@/features/giving/labels";
import { useOrganization } from "@/features/organizations/organization-context";
import { apiFetch } from "@/lib/neon/http";

const roleLabels: Record<string, string> = {
  applicant: "Pengaju",
  beneficiary: "Penerima manfaat",
  distribution_partner: "Mitra penyalur",
  donor: "Donatur",
  kafil: "Kafil",
  volunteer: "Relawan",
};

const nowLocal = () => {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

function InteractionForm({ contactId, onSaved }: { contactId: string; onSaved: () => void }) {
  const [form, setForm] = useState({
    direction: "outbound",
    follow_up_at: "",
    follow_up_note: "",
    interaction_type: "whatsapp",
    occurred_at: nowLocal(),
    summary: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (patch: Partial<typeof form>) => setForm((value) => ({ ...value, ...patch }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiFetch(`/api/v1/donors/${contactId}/interactions`, {
        body: JSON.stringify({
          direction: form.direction,
          follow_up_at: form.follow_up_at ? new Date(`${form.follow_up_at}T09:00:00`).toISOString() : null,
          follow_up_note: form.follow_up_at ? form.follow_up_note || undefined : undefined,
          interaction_type: form.interaction_type,
          occurred_at: new Date(form.occurred_at).toISOString(),
          summary: form.summary,
        }),
        method: "POST",
      });
      setForm((value) => ({ ...value, follow_up_at: "", follow_up_note: "", occurred_at: nowLocal(), summary: "" }));
      onSaved();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Catatan belum tersimpan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="donor-interaction-form" onSubmit={submit}>
      <div className="form-grid">
        <div className="auth-field">
          <Label htmlFor="interaction_type">Melalui</Label>
          <select id="interaction_type" value={form.interaction_type} onChange={(event) => set({ interaction_type: event.target.value })}>
            {optionsOf(interactionTypeLabels).map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div className="auth-field">
          <Label htmlFor="direction">Arah</Label>
          <select id="direction" value={form.direction} onChange={(event) => set({ direction: event.target.value })}>
            {optionsOf(interactionDirectionLabels).map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div className="auth-field">
          <Label htmlFor="occurred_at">Waktu</Label>
          <input id="occurred_at" type="datetime-local" value={form.occurred_at} onChange={(event) => set({ occurred_at: event.target.value })} />
        </div>
        <div className="auth-field auth-field--wide">
          <Label htmlFor="summary">Apa yang dibicarakan?</Label>
          <textarea id="summary" minLength={3} required rows={2} value={form.summary} onChange={(event) => set({ summary: event.target.value })} placeholder="Mis. mengirim laporan penyaluran Q3 dan ucapan terima kasih; beliau tertarik wakaf sumur." />
        </div>
        <div className="auth-field">
          <Label htmlFor="follow_up_at">Tindak lanjut (opsional)</Label>
          <input id="follow_up_at" type="date" value={form.follow_up_at} onChange={(event) => set({ follow_up_at: event.target.value })} />
        </div>
        {form.follow_up_at ? (
          <div className="auth-field">
            <Label htmlFor="follow_up_note">Yang perlu dilakukan</Label>
            <input id="follow_up_note" maxLength={1000} value={form.follow_up_note} onChange={(event) => set({ follow_up_note: event.target.value })} placeholder="Mis. kirim proposal wakaf sumur" />
          </div>
        ) : null}
      </div>
      {error ? <p className="field-card__error">{error}</p> : null}
      <div className="form-actions">
        <Button disabled={saving} size="sm" type="submit">
          {saving ? "Menyimpan…" : "Simpan catatan"}
        </Button>
      </div>
    </form>
  );
}

function InteractionItem({
  canManage,
  contactId,
  interaction,
  onChanged,
}: {
  canManage: boolean;
  contactId: string;
  interaction: DonorInteraction;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const complete = async () => {
    const note = window.prompt("Catatan penyelesaian (opsional):") ?? undefined;
    setBusy(true);
    try {
      await apiFetch(`/api/v1/donors/${contactId}/interactions/${interaction.id}/complete`, {
        body: JSON.stringify({ note: note || undefined }),
        method: "POST",
      });
      onChanged();
    } finally {
      setBusy(false);
    }
  };
  const late = interaction.follow_up_status === "open" && interaction.follow_up_at && new Date(interaction.follow_up_at) < new Date();
  return (
    <li className="donor-interaction">
      <header>
        <strong>{labelOf(interactionTypeLabels, interaction.interaction_type)}</strong>
        <small>
          {labelOf(interactionDirectionLabels, interaction.direction)} ·{" "}
          {interaction.occurred_at ? new Date(interaction.occurred_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "—"}
          {interaction.author_name ? ` · ${interaction.author_name}` : ""}
        </small>
      </header>
      <p>{interaction.summary}</p>
      {interaction.follow_up_status !== "none" ? (
        <div className="donor-interaction__follow" data-status={interaction.follow_up_status} data-late={Boolean(late)}>
          {interaction.follow_up_status === "open" ? <BellRing aria-hidden size={14} /> : <CheckCircle2 aria-hidden size={14} />}
          <span>
            {interaction.follow_up_status === "open" ? "Tindak lanjut " : "Selesai "}
            {formatShortDate(interaction.follow_up_status === "open" ? interaction.follow_up_at : interaction.follow_up_done_at)}
            {interaction.follow_up_note ? `: ${interaction.follow_up_note}` : ""}
            {interaction.assignee_name ? ` (${interaction.assignee_name})` : ""}
          </span>
          {interaction.follow_up_status === "open" && canManage ? (
            <Button disabled={busy} size="sm" variant="outline" onClick={() => void complete()}>
              Tandai selesai
            </Button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export function DonorDetailPage() {
  const { id = "" } = useParams();
  const { activeOrganization } = useOrganization();
  const organizationId = activeOrganization?.organization.$id ?? "";
  const [kindFilter, setKindFilter] = useState("");
  const query = useQuery({
    enabled: Boolean(organizationId && id),
    queryFn: () => apiFetch<{ data: DonorDetail }>(`/api/v1/donors/${id}`),
    queryKey: ["donors", "detail", organizationId, id],
  });

  if (query.isLoading) {
    return (
      <section className="workspace-page">
        <LoadingSkeleton lines={10} />
      </section>
    );
  }
  const data = query.data?.data;
  if (query.isError || !data) {
    return (
      <section className="workspace-page">
        <ErrorState title="Donatur tidak dapat dimuat" onRetry={() => query.refetch()} />
      </section>
    );
  }

  const { contact, profile, totals } = data;
  const firstName = contact.display_name;
  const wa = contact.whatsapp_phone ?? contact.primary_phone;
  const greeting = `Assalamu'alaikum ${firstName}, terima kasih atas kepercayaan dan dukungan Bapak/Ibu.`;
  const isWakif = Number(totals.waqf_total) > 0 || data.waqfAssets.length > 0;
  const kinds = [
    { amount: totals.cash_total, kind: "cash" },
    { amount: totals.goods_total, kind: "in_kind" },
    { amount: totals.waqf_total, kind: "waqf" },
    { amount: totals.kafalah_total, kind: "kafalah" },
  ].filter((item) => Number(item.amount) > 0);
  const years = [...new Set(data.yearly.map((row) => row.year))];
  const timeline = kindFilter ? data.timeline.filter((gift) => gift.kind === kindFilter) : data.timeline;

  return (
    <section className="workspace-page donor-page">
      <PageHeader
        eyebrow="Donatur & wakif"
        title={contact.display_name}
        description={[
          contact.contact_type === "institution" ? "Lembaga" : "Perorangan",
          contact.city,
          totals.first_gift_at ? `memberi sejak ${formatShortDate(totals.first_gift_at)}` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link className={buttonVariants({ variant: "outline" })} to="/donors">
              <ArrowLeft aria-hidden size={16} /> Daftar
            </Link>
            <Link className={buttonVariants({ variant: "outline" })} to={`/reports/stakeholders/${contact.id}`}>
              <FileText aria-hidden size={16} /> Laporan pemberian
            </Link>
            {data.permissions.canManage ? (
              <Link className={buttonVariants({})} to={`/donors/${contact.id}/edit`}>
                <Pencil aria-hidden size={16} /> Ubah profil
              </Link>
            ) : null}
          </div>
        }
      />

      <div className="donor-badges">
        <StatusBadge tone={engagementTone(totals.engagement)}>
          {labelOf(donorEngagementLabels, totals.engagement)} — {donorEngagementHints[totals.engagement]}
        </StatusBadge>
        {profile ? <StatusBadge tone="info">{labelOf(donorSegmentLabels, profile.segment)}</StatusBadge> : null}
        {isWakif ? <StatusBadge tone="success">Wakif</StatusBadge> : null}
        {contact.roles.filter((role) => role !== "donor").map((role) => (
          <StatusBadge key={role} tone="neutral">{roleLabels[role] ?? role}</StatusBadge>
        ))}
        {profile && !profile.publish_name ? <StatusBadge tone="warning">Ingin anonim</StatusBadge> : null}
        {profile?.status === "inactive" ? <StatusBadge tone="neutral">Tidak dikelola</StatusBadge> : null}
      </div>

      <div className="donor-contact-actions">
        {wa ? (
          <a className={buttonVariants({ size: "sm", variant: "outline" })} href={waLink(wa, greeting)} rel="noreferrer" target="_blank">
            <MessageCircle aria-hidden size={15} /> WhatsApp
          </a>
        ) : null}
        {contact.primary_phone ? (
          <a className={buttonVariants({ size: "sm", variant: "outline" })} href={`tel:${contact.primary_phone.replace(/[^\d+]/g, "")}`}>
            <Phone aria-hidden size={15} /> {contact.primary_phone}
          </a>
        ) : null}
        {contact.primary_email ? (
          <a className={buttonVariants({ size: "sm", variant: "outline" })} href={`mailto:${contact.primary_email}`}>
            <Mail aria-hidden size={15} /> {contact.primary_email}
          </a>
        ) : null}
        {contact.address_line ? <small>{[contact.address_line, contact.city, contact.province].filter(Boolean).join(", ")}</small> : null}
      </div>

      <div className="report-metric-grid">
        <article className="report-metric report-metric--stacked">
          <span>Total pemberian</span>
          <strong><MoneyDisplay amount={totals.grand_total} currency="IDR" /></strong>
          <small>{totals.gift_count} kali · terakhir {formatShortDate(totals.last_gift_at)}</small>
        </article>
        <article className="report-metric report-metric--stacked">
          <span>Tahun ini</span>
          <strong><MoneyDisplay amount={totals.this_year_total} currency="IDR" /></strong>
        </article>
        {kinds.map((item) => (
          <article className="report-metric report-metric--stacked" key={item.kind}>
            <span>{labelOf(donorGivingKindLabels, item.kind)}</span>
            <strong><MoneyDisplay amount={item.amount} currency="IDR" /></strong>
            {item.kind === "in_kind" ? <small>nilai taksiran barang</small> : null}
          </article>
        ))}
      </div>

      <div className="donor-columns">
        <div className="donor-column">
          <section className="donor-panel">
            <header>
              <h2><UserCog aria-hidden size={16} /> Profil relasi</h2>
            </header>
            {profile ? (
              <dl className="donor-facts">
                <div><dt>PIC</dt><dd>{profile.manager_name ?? "Belum ditentukan"}</dd></div>
                <div><dt>Komitmen rutin</dt><dd>
                  {profile.recurring_amount ? (
                    <>
                      <Repeat aria-hidden className="inline" size={13} /> <MoneyDisplay amount={profile.recurring_amount} currency="IDR" /> · {labelOf(recurringFrequencyLabels, profile.recurring_frequency)}
                      {profile.recurring_day ? `, tgl ${profile.recurring_day}` : ""}
                    </>
                  ) : "Tidak rutin"}
                </dd></div>
                <div><dt>Minat</dt><dd>
                  {profile.giving_interests.length > 0 ? profile.giving_interests.map((value) => labelOf(donorInterestLabels, value)).join(", ") : "—"}
                </dd></div>
                <div><dt>Saluran</dt><dd>{labelOf(donorChannelLabels, profile.preferred_channel)}</dd></div>
                <div><dt>Kuitansi</dt><dd>{labelOf(receiptPreferenceLabels, profile.receipt_preference)}</dd></div>
                <div><dt>Laporan</dt><dd>{labelOf(reportPreferenceLabels, profile.report_preference)}</dd></div>
                <div><dt>Sumber</dt><dd>{labelOf(donorSourceLabels, profile.acquisition_source)}</dd></div>
                {contact.birth_date ? <div><dt>Tanggal lahir</dt><dd>{formatShortDate(contact.birth_date)}</dd></div> : null}
                {profile.notes ? <div className="donor-facts__wide"><dt>Catatan</dt><dd>{profile.notes}</dd></div> : null}
              </dl>
            ) : (
              <EmptyState
                title="Profil relasi belum diisi"
                description="Lengkapi segmen, PIC, minat, dan preferensi laporan agar donatur ini dikelola dengan baik."
                action={data.permissions.canManage ? (
                  <Link className={buttonVariants({ size: "sm" })} to={`/donors/${contact.id}/edit`}>Lengkapi profil</Link>
                ) : undefined}
              />
            )}
          </section>

          <section className="donor-panel" id="interaksi">
            <header>
              <h2><MessageCircle aria-hidden size={16} /> Komunikasi & tindak lanjut</h2>
            </header>
            {data.permissions.canManageInteractions ? (
              <InteractionForm contactId={contact.id} onSaved={() => void query.refetch()} />
            ) : null}
            {data.interactions.length === 0 ? (
              <p className="donor-muted">Belum ada catatan komunikasi.</p>
            ) : (
              <ul className="donor-interactions">
                {data.interactions.map((interaction) => (
                  <InteractionItem
                    canManage={data.permissions.canManageInteractions}
                    contactId={contact.id}
                    interaction={interaction}
                    key={interaction.id}
                    onChanged={() => void query.refetch()}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="donor-column">
          <section className="donor-panel">
            <header>
              <h2>Riwayat pemberian</h2>
              <div className="donor-kind-filter" role="group" aria-label="Saring jenis pemberian">
                <button aria-pressed={kindFilter === ""} type="button" onClick={() => setKindFilter("")}>Semua</button>
                {kinds.map((item) => (
                  <button aria-pressed={kindFilter === item.kind} key={item.kind} type="button" onClick={() => setKindFilter(item.kind)}>
                    {labelOf(donorGivingKindLabels, item.kind)}
                  </button>
                ))}
              </div>
            </header>
            {timeline.length === 0 ? (
              <p className="donor-muted">Belum ada pemberian tercatat.</p>
            ) : (
              <ul className="donor-timeline">
                {timeline.map((gift) => (
                  <li data-kind={gift.kind} key={`${gift.kind}-${gift.id}`}>
                    <div>
                      <strong>{labelOf(donorGivingKindLabels, gift.kind)}{gift.purpose ? ` — ${gift.purpose}` : ""}</strong>
                      <small>
                        {formatShortDate(gift.gift_at)} · <Link to={gift.href}>{gift.reference_number}</Link>
                        {gift.detail ? ` · ${gift.detail}` : ""}
                      </small>
                    </div>
                    <div className="donor-timeline__amount">
                      <MoneyDisplay amount={gift.amount} currency="IDR" />
                      {["posted", "received"].includes(gift.status) ? null : (
                        <StatusBadge tone={toneOf(gift.status)}>{gift.status}</StatusBadge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {years.length > 1 ? (
              <table className="donor-yearly">
                <caption>Ringkasan per tahun</caption>
                <thead>
                  <tr><th>Tahun</th><th>Pemberian</th><th>Jumlah</th></tr>
                </thead>
                <tbody>
                  {years.map((year) => {
                    const rows = data.yearly.filter((row) => row.year === year);
                    return (
                      <tr key={year}>
                        <td>{year}</td>
                        <td>{rows.reduce((sum, row) => sum + row.gifts, 0)}×</td>
                        <td><MoneyDisplay amount={rows.reduce((sum, row) => sum + Number(row.amount), 0)} currency="IDR" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : null}
          </section>

          {data.commitments.length > 0 ? (
            <section className="donor-panel">
              <header><h2>Janji / komitmen donasi</h2></header>
              <ul className="donor-list">
                {data.commitments.map((item) => (
                  <li key={item.id}>
                    <div>
                      <strong>{item.reference_number} · {item.restriction_name}</strong>
                      <small>Dijanjikan {formatShortDate(item.committed_at)}{item.expected_at ? ` · target ${formatShortDate(item.expected_at)}` : ""}</small>
                    </div>
                    <div className="donor-timeline__amount">
                      <small><MoneyDisplay amount={item.received_amount} currency="IDR" /> / <MoneyDisplay amount={item.amount} currency="IDR" /></small>
                      <StatusBadge tone={toneOf(item.status)}>{item.status}</StatusBadge>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {data.waqfAssets.length > 0 ? (
            <section className="donor-panel">
              <header><h2>Aset wakaf yang didukung</h2></header>
              <ul className="donor-list">
                {data.waqfAssets.map((asset) => (
                  <li key={asset.id}>
                    <Link to={`/waqf/assets/${asset.id}`}><strong>{asset.name}</strong></Link>
                    <small>{asset.reference_number} · {asset.operational_status}</small>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {data.sponsorships.length > 0 ? (
            <section className="donor-panel">
              <header><h2>Kafalah yang ditanggung</h2></header>
              <ul className="donor-list">
                {data.sponsorships.map((item) => (
                  <li key={item.id}>
                    <strong>{item.reference_number}</strong>
                    <small>
                      <MoneyDisplay amount={item.matched_amount} currency="IDR" /> · {formatShortDate(item.start_date)}–{formatShortDate(item.end_date)} · {item.status}
                    </small>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {data.programs.length > 0 ? (
            <section className="donor-panel">
              <header><h2>Program yang didukung</h2></header>
              <div className="donor-giving-chips">
                {data.programs.map((program) => (
                  <Link key={program.id} to={`/programs/${program.id}`}>{program.name}</Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </section>
  );
}
