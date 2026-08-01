import {
  useCreate,
  useList,
  useNavigation,
  type HttpError,
} from "@refinedev/core";
import { ArrowLeft, Save } from "lucide-react";
import { useState, type FormEvent } from "react";

import {
  EmptyState,
  FormSection,
  PageHeader,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { AidPackagePacking } from "@/features/aid-packages/types";
import type {
  LogisticsCourier,
  LogisticsShipment,
} from "@/features/logistics/types";

export function LogisticsShipmentCreatePage() {
  const { list, show } = useNavigation();
  const couriers = useList<LogisticsCourier>({
    resource: "logistics_couriers",
    filters: [{ field: "status", operator: "eq", value: "active" }],
    pagination: { currentPage: 1, pageSize: 100, mode: "server" },
  });
  const packings = useList<AidPackagePacking>({
    resource: "aid_package_packings",
    filters: [{ field: "status", operator: "eq", value: "packed" }],
    pagination: { currentPage: 1, pageSize: 100, mode: "server" },
  });
  const { mutate, mutation } = useCreate<LogisticsShipment, HttpError>();
  const [form, setForm] = useState({
    packing_id: "",
    courier_id: "",
    tracking_number: "",
    service_level: "",
    destination_name: "",
    destination_phone: "",
    destination_address: "",
    planned_dispatch_at: "",
    notes: "",
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    mutate(
      {
        resource: "logistics_shipments",
        values: {
          ...form,
          tracking_number: form.tracking_number || undefined,
          service_level: form.service_level || undefined,
          destination_phone: form.destination_phone || undefined,
          planned_dispatch_at: form.planned_dispatch_at
            ? new Date(form.planned_dispatch_at).toISOString()
            : undefined,
          notes: form.notes || undefined,
        },
      },
      { onSuccess: ({ data }) => show("logistics_shipments", data.id) },
    );
  };
  if (!couriers.query.isLoading && (couriers.result?.data.length ?? 0) === 0)
    return (
      <section className="workspace-page">
        <PageHeader eyebrow="Logistik" title="Shipment Baru" />
        <EmptyState
          title="Kurir aktif belum tersedia"
          description="Tambahkan master kurir terlebih dahulu."
          action={
            <Button onClick={() => list("logistics_couriers")}>
              Kembali ke logistik
            </Button>
          }
        />
      </section>
    );
  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow="Logistik"
        title="Shipment Baru"
        description="Shipment hanya dapat dibuat dari paket yang sudah dipacking."
        actions={
          <Button variant="outline" onClick={() => list("logistics_shipments")}>
            <ArrowLeft aria-hidden size={16} />
            Daftar
          </Button>
        }
      />
      <form onSubmit={submit}>
        <FormSection title="Sumber dan kurir">
          <div className="form-grid">
            <div className="auth-field">
              <Label htmlFor="shipment-packing">Packing</Label>
              <select
                id="shipment-packing"
                required
                value={form.packing_id}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    packing_id: e.target.value,
                  }))
                }
              >
                <option value="">Pilih packing</option>
                {(packings.result?.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.reference_number} — {item.template_name} (
                    {item.package_count})
                  </option>
                ))}
              </select>
            </div>
            <div className="auth-field">
              <Label htmlFor="shipment-courier">Kurir</Label>
              <select
                id="shipment-courier"
                required
                value={form.courier_id}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    courier_id: e.target.value,
                  }))
                }
              >
                <option value="">Pilih kurir</option>
                {(couriers.result?.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} — {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="auth-field">
              <Label htmlFor="shipment-tracking">Nomor tracking</Label>
              <input
                id="shipment-tracking"
                value={form.tracking_number}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    tracking_number: e.target.value,
                  }))
                }
              />
            </div>
            <div className="auth-field">
              <Label htmlFor="shipment-service">Layanan</Label>
              <input
                id="shipment-service"
                value={form.service_level}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    service_level: e.target.value,
                  }))
                }
              />
            </div>
            <div className="auth-field">
              <Label htmlFor="shipment-plan">Rencana berangkat</Label>
              <input
                id="shipment-plan"
                type="datetime-local"
                value={form.planned_dispatch_at}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    planned_dispatch_at: e.target.value,
                  }))
                }
              />
            </div>
          </div>
        </FormSection>
        <FormSection title="Tujuan pengiriman">
          <div className="form-grid">
            <div className="auth-field">
              <Label htmlFor="destination-name">Nama tujuan</Label>
              <input
                id="destination-name"
                required
                minLength={2}
                value={form.destination_name}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    destination_name: e.target.value,
                  }))
                }
              />
            </div>
            <div className="auth-field">
              <Label htmlFor="destination-phone">Telepon</Label>
              <input
                id="destination-phone"
                value={form.destination_phone}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    destination_phone: e.target.value,
                  }))
                }
              />
            </div>
            <div className="auth-field auth-field--wide">
              <Label htmlFor="destination-address">Alamat operasional</Label>
              <textarea
                id="destination-address"
                required
                minLength={10}
                rows={4}
                value={form.destination_address}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    destination_address: e.target.value,
                  }))
                }
              />
            </div>
            <div className="auth-field auth-field--wide">
              <Label htmlFor="shipment-notes">Catatan</Label>
              <textarea
                id="shipment-notes"
                rows={3}
                value={form.notes}
                onChange={(e) =>
                  setForm((current) => ({ ...current, notes: e.target.value }))
                }
              />
            </div>
          </div>
        </FormSection>
        {mutation.isError ? (
          <p className="form-error">
            {mutation.error?.message ?? "Shipment gagal dibuat."}
          </p>
        ) : null}
        <div className="form-section__footer">
          <Button type="submit" disabled={mutation.isPending}>
            <Save aria-hidden size={16} />
            Simpan Draft
          </Button>
        </div>
      </form>
    </section>
  );
}
