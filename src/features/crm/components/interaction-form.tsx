import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  interactionDirectionLabels,
  interactionTypeLabels,
  optionsOf,
} from "@/features/giving/labels";
import { apiFetch } from "@/lib/neon/http";

const nowLocal = () => {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

/** Form catatan komunikasi + tindak lanjut untuk kontak mana pun (donatur, mitra, penerima). */
export function InteractionForm({ contactId, onSaved }: { contactId: string; onSaved: () => void }) {
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
