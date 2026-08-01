import {
  useCustomMutation,
  useNavigation,
  useOne,
  type HttpError,
} from "@refinedev/core";
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  RotateCcw,
  Send,
  ShieldAlert,
} from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router";

import { CanAccess } from "@/components/access-control/can-access";
import {
  DetailSection,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  ResourceTable,
  StatusBadge,
  type ResourceTableColumn,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type {
  LogisticsIncident,
  LogisticsShipment,
  LogisticsTrackingEvent,
} from "@/features/logistics/types";

function nowLocal() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function tone(status: string) {
  if (status === "delivered") return "success" as const;
  if (["cancelled", "returned"].includes(status)) return "danger" as const;
  if (["dispatched", "in_transit", "returning"].includes(status))
    return "info" as const;
  if (status === "return_requested") return "warning" as const;
  return "neutral" as const;
}

export function LogisticsShipmentDetailPage() {
  const { id = "" } = useParams();
  const { list } = useNavigation();
  const query = useOne<LogisticsShipment>({
    id,
    resource: "logistics_shipments",
    queryOptions: { enabled: Boolean(id) },
  });
  const command = useCustomMutation<
    Record<string, unknown>,
    HttpError,
    Record<string, unknown>
  >();
  const [dispatch, setDispatch] = useState({
    dispatched_at: nowLocal(),
    tracking_number: "",
    notes: "",
  });
  const [tracking, setTracking] = useState({
    event_type: "in_transit",
    event_at: nowLocal(),
    location: "",
    notes: "",
  });
  const [delivery, setDelivery] = useState({
    recipient_name: "",
    relationship_to_recipient: "",
    received_at: nowLocal(),
    notes: "",
  });
  const [returnForm, setReturnForm] = useState({
    reason_code: "delivery_failed",
    reason_notes: "",
  });
  const [returnReceive, setReturnReceive] = useState({
    received_at: nowLocal(),
    condition_on_return: "",
  });
  const [incident, setIncident] = useState({
    incident_type: "delay",
    severity: "medium",
    occurred_at: nowLocal(),
    location: "",
    description: "",
  });
  const [resolution, setResolution] = useState("");
  const run = (
    path: string,
    values: Record<string, unknown>,
    idempotent = false,
  ) =>
    command.mutate(
      {
        url: path,
        method: "post",
        values,
        ...(idempotent
          ? { config: { headers: { "Idempotency-Key": crypto.randomUUID() } } }
          : {}),
      },
      { onSuccess: () => query.query.refetch() },
    );
  if (query.query.isLoading)
    return (
      <section className="workspace-page">
        <LoadingSkeleton lines={10} />
      </section>
    );
  if (query.query.isError || !query.result)
    return (
      <section className="workspace-page">
        <PageHeader eyebrow="Logistik" title="Detail Shipment" />
        <ErrorState
          title="Shipment tidak ditemukan"
          description="Data tidak tersedia atau berada pada organisasi lain."
          onRetry={() => query.query.refetch()}
        />
      </section>
    );
  const record = query.result;
  const trackingColumns: ResourceTableColumn<LogisticsTrackingEvent>[] = [
    {
      key: "event",
      header: "Kejadian",
      render: (item) => (
        <div className="crm-contact-cell">
          <strong>{item.event_type.replaceAll("_", " ")}</strong>
          <small>{new Date(item.event_at).toLocaleString("id-ID")}</small>
        </div>
      ),
    },
    {
      key: "location",
      header: "Lokasi",
      render: (item) => item.location ?? "-",
    },
    { key: "notes", header: "Catatan", render: (item) => item.notes ?? "-" },
  ];
  const incidentColumns: ResourceTableColumn<LogisticsIncident>[] = [
    {
      key: "type",
      header: "Insiden",
      render: (item) => (
        <div className="crm-contact-cell">
          <strong>{item.incident_type}</strong>
          <small>{new Date(item.occurred_at).toLocaleString("id-ID")}</small>
        </div>
      ),
    },
    {
      key: "severity",
      header: "Risiko",
      render: (item) => (
        <StatusBadge
          tone={
            ["high", "critical"].includes(item.severity) ? "danger" : "warning"
          }
        >
          {item.severity}
        </StatusBadge>
      ),
    },
    {
      key: "description",
      header: "Keterangan",
      render: (item) => item.description,
    },
    {
      key: "status",
      header: "Status",
      render: (item) => (
        <StatusBadge tone={item.status === "resolved" ? "success" : "warning"}>
          {item.status}
        </StatusBadge>
      ),
    },
  ];
  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow={`Logistik / ${record.reference_number}`}
        title={record.destination_name}
        description={`${record.package_name ?? "Paket bantuan"} · ${record.package_count} paket · ${record.courier_name}`}
        meta={
          <StatusBadge tone={tone(record.status)}>
            {record.status.replaceAll("_", " ")}
          </StatusBadge>
        }
        actions={
          <Button variant="outline" onClick={() => list("logistics_shipments")}>
            <ArrowLeft aria-hidden size={16} />
            Daftar
          </Button>
        }
      />
      {command.mutation.isError ? (
        <ErrorState
          title="Command logistik ditolak"
          description={
            command.mutation.error?.message ??
            "Periksa status, waktu, dan permission."
          }
        />
      ) : null}
      <DetailSection
        title="Konteks shipment"
        items={[
          { label: "Packing", value: record.packing_reference },
          {
            label: "Kurir",
            value: `${record.courier_code} — ${record.courier_name}`,
          },
          {
            label: "Tracking",
            value: record.tracking_number ?? "Belum tersedia",
          },
          { label: "Layanan", value: record.service_level ?? "-" },
          {
            label: "Berangkat",
            value: record.dispatched_at
              ? new Date(record.dispatched_at).toLocaleString("id-ID")
              : "Belum",
          },
          {
            label: "Diterima",
            value: record.delivered_at
              ? new Date(record.delivered_at).toLocaleString("id-ID")
              : "Belum",
          },
        ]}
      >
        <div className="mt-4 rounded-xl border p-4 text-sm">
          <strong>Alamat operasional</strong>
          <p className="mt-1 whitespace-pre-wrap">
            {record.destination_address}
          </p>
          {record.destination_phone ? (
            <p className="text-muted-foreground mt-1">
              {record.destination_phone}
            </p>
          ) : null}
        </div>
      </DetailSection>
      {record.status === "draft" ? (
        <CanAccess action="dispatch" resource="logistics_shipments">
          <section className="form-section">
            <div className="section-heading">
              <div>
                <h2>Berangkatkan shipment</h2>
                <p>
                  Command ini mengunci konteks tujuan dan mencatat event
                  pertama.
                </p>
              </div>
            </div>
            <div className="form-section__body">
              <div className="form-grid">
                <Field label="Waktu berangkat">
                  <input
                    type="datetime-local"
                    value={dispatch.dispatched_at}
                    onChange={(e) =>
                      setDispatch((v) => ({
                        ...v,
                        dispatched_at: e.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Nomor tracking">
                  <input
                    value={dispatch.tracking_number}
                    onChange={(e) =>
                      setDispatch((v) => ({
                        ...v,
                        tracking_number: e.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Catatan" wide>
                  <textarea
                    rows={3}
                    value={dispatch.notes}
                    onChange={(e) =>
                      setDispatch((v) => ({ ...v, notes: e.target.value }))
                    }
                  />
                </Field>
              </div>
            </div>
            <div className="form-section__footer">
              <Button
                disabled={command.mutation.isPending}
                onClick={() =>
                  run(
                    `/api/v1/logistics/shipments/${id}/dispatch`,
                    {
                      ...dispatch,
                      dispatched_at: new Date(
                        dispatch.dispatched_at,
                      ).toISOString(),
                      tracking_number: dispatch.tracking_number || undefined,
                      notes: dispatch.notes || undefined,
                    },
                    true,
                  )
                }
              >
                <Send aria-hidden size={16} />
                Berangkatkan
              </Button>
            </div>
          </section>
        </CanAccess>
      ) : null}
      {["dispatched", "in_transit", "return_requested", "returning"].includes(
        record.status,
      ) ? (
        <CanAccess action="track" resource="logistics_shipments">
          <section className="form-section">
            <div className="section-heading">
              <div>
                <h2>Tambah tracking</h2>
                <p>Event perjalanan append-only dan tidak dapat diedit.</p>
              </div>
            </div>
            <div className="form-section__body">
              <div className="form-grid">
                <Field label="Event">
                  <select
                    value={tracking.event_type}
                    onChange={(e) =>
                      setTracking((v) => ({ ...v, event_type: e.target.value }))
                    }
                  >
                    {record.status === "return_requested" ? (
                      <option value="return_in_transit">
                        Return dalam perjalanan
                      </option>
                    ) : null}
                    <option value="in_transit">Dalam perjalanan</option>
                    <option value="arrived_hub">Tiba di hub</option>
                    <option value="out_for_delivery">
                      Diantar ke penerima
                    </option>
                    <option value="delivery_attempt">
                      Percobaan pengiriman
                    </option>
                    <option value="note">Catatan</option>
                  </select>
                </Field>
                <Field label="Waktu">
                  <input
                    type="datetime-local"
                    value={tracking.event_at}
                    onChange={(e) =>
                      setTracking((v) => ({ ...v, event_at: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Lokasi">
                  <input
                    value={tracking.location}
                    onChange={(e) =>
                      setTracking((v) => ({ ...v, location: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Catatan" wide>
                  <textarea
                    rows={3}
                    value={tracking.notes}
                    onChange={(e) =>
                      setTracking((v) => ({ ...v, notes: e.target.value }))
                    }
                  />
                </Field>
              </div>
            </div>
            <div className="form-section__footer">
              <Button
                disabled={command.mutation.isPending}
                onClick={() =>
                  run(
                    `/api/v1/logistics/shipments/${id}/tracking`,
                    {
                      ...tracking,
                      event_at: new Date(tracking.event_at).toISOString(),
                      location: tracking.location || undefined,
                      notes: tracking.notes || undefined,
                    },
                    true,
                  )
                }
              >
                <MapPin aria-hidden size={16} />
                Catat Tracking
              </Button>
            </div>
          </section>
        </CanAccess>
      ) : null}
      {["dispatched", "in_transit"].includes(record.status) ? (
        <CanAccess action="deliver" resource="logistics_shipments">
          <section className="form-section">
            <div className="section-heading">
              <div>
                <h2>Konfirmasi penerimaan</h2>
                <p>Nama penerima dan waktu penerimaan menjadi catatan final.</p>
              </div>
            </div>
            <div className="form-section__body">
              <div className="form-grid">
                <Field label="Nama penerima">
                  <input
                    required
                    minLength={2}
                    value={delivery.recipient_name}
                    onChange={(e) =>
                      setDelivery((v) => ({
                        ...v,
                        recipient_name: e.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Hubungan">
                  <input
                    value={delivery.relationship_to_recipient}
                    onChange={(e) =>
                      setDelivery((v) => ({
                        ...v,
                        relationship_to_recipient: e.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Waktu diterima">
                  <input
                    type="datetime-local"
                    value={delivery.received_at}
                    onChange={(e) =>
                      setDelivery((v) => ({
                        ...v,
                        received_at: e.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Catatan" wide>
                  <textarea
                    rows={3}
                    value={delivery.notes}
                    onChange={(e) =>
                      setDelivery((v) => ({ ...v, notes: e.target.value }))
                    }
                  />
                </Field>
              </div>
            </div>
            <div className="form-section__footer">
              <Button
                disabled={
                  delivery.recipient_name.trim().length < 2 ||
                  command.mutation.isPending
                }
                onClick={() =>
                  run(
                    `/api/v1/logistics/shipments/${id}/deliver`,
                    {
                      ...delivery,
                      received_at: new Date(delivery.received_at).toISOString(),
                      relationship_to_recipient:
                        delivery.relationship_to_recipient || undefined,
                      notes: delivery.notes || undefined,
                    },
                    true,
                  )
                }
              >
                <CheckCircle2 aria-hidden size={16} />
                Konfirmasi Diterima
              </Button>
            </div>
          </section>
        </CanAccess>
      ) : null}
      {["dispatched", "in_transit", "delivered"].includes(record.status) ? (
        <CanAccess action="return" resource="logistics_shipments">
          <section className="form-section">
            <div className="section-heading">
              <div>
                <h2>Ajukan return</h2>
                <p>Return tidak otomatis mengembalikan paket ke stok.</p>
              </div>
            </div>
            <div className="form-section__body">
              <div className="form-grid">
                <Field label="Alasan">
                  <select
                    value={returnForm.reason_code}
                    onChange={(e) =>
                      setReturnForm((v) => ({
                        ...v,
                        reason_code: e.target.value,
                      }))
                    }
                  >
                    <option value="delivery_failed">Pengiriman gagal</option>
                    <option value="recipient_unavailable">
                      Penerima tidak tersedia
                    </option>
                    <option value="address_invalid">Alamat tidak valid</option>
                    <option value="refused">Ditolak penerima</option>
                    <option value="damaged">Rusak</option>
                    <option value="other">Lainnya</option>
                  </select>
                </Field>
                <Field label="Keterangan" wide>
                  <textarea
                    rows={3}
                    minLength={10}
                    value={returnForm.reason_notes}
                    onChange={(e) =>
                      setReturnForm((v) => ({
                        ...v,
                        reason_notes: e.target.value,
                      }))
                    }
                  />
                </Field>
              </div>
            </div>
            <div className="form-section__footer">
              <Button
                variant="outline"
                disabled={
                  returnForm.reason_notes.trim().length < 10 ||
                  command.mutation.isPending
                }
                onClick={() =>
                  run(
                    `/api/v1/logistics/shipments/${id}/return`,
                    returnForm,
                    true,
                  )
                }
              >
                <RotateCcw aria-hidden size={16} />
                Ajukan Return
              </Button>
            </div>
          </section>
        </CanAccess>
      ) : null}
      {["return_requested", "returning"].includes(record.status) ? (
        <CanAccess action="return" resource="logistics_shipments">
          <section className="form-section">
            <div className="section-heading">
              <div>
                <h2>Terima barang return</h2>
                <p>Catat kondisi aktual sebelum proses unpack terpisah.</p>
              </div>
            </div>
            <div className="form-section__body">
              <div className="form-grid">
                <Field label="Waktu diterima">
                  <input
                    type="datetime-local"
                    value={returnReceive.received_at}
                    onChange={(e) =>
                      setReturnReceive((v) => ({
                        ...v,
                        received_at: e.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Kondisi barang" wide>
                  <textarea
                    rows={3}
                    minLength={10}
                    value={returnReceive.condition_on_return}
                    onChange={(e) =>
                      setReturnReceive((v) => ({
                        ...v,
                        condition_on_return: e.target.value,
                      }))
                    }
                  />
                </Field>
              </div>
            </div>
            <div className="form-section__footer">
              <Button
                disabled={
                  returnReceive.condition_on_return.trim().length < 10 ||
                  command.mutation.isPending
                }
                onClick={() =>
                  run(
                    `/api/v1/logistics/shipments/${id}/return/receive`,
                    {
                      ...returnReceive,
                      received_at: new Date(
                        returnReceive.received_at,
                      ).toISOString(),
                    },
                    true,
                  )
                }
              >
                <RotateCcw aria-hidden size={16} />
                Terima Return
              </Button>
            </div>
          </section>
        </CanAccess>
      ) : null}
      {!["draft", "cancelled", "returned"].includes(record.status) ? (
        <CanAccess action="manage" resource="logistics_incidents">
          <section className="form-section">
            <div className="section-heading">
              <div>
                <h2>Laporkan insiden</h2>
                <p>
                  Kerusakan, kehilangan, keterlambatan, dan risiko keamanan.
                </p>
              </div>
            </div>
            <div className="form-section__body">
              <div className="form-grid">
                <Field label="Jenis">
                  <select
                    value={incident.incident_type}
                    onChange={(e) =>
                      setIncident((v) => ({
                        ...v,
                        incident_type: e.target.value,
                      }))
                    }
                  >
                    <option value="delay">Keterlambatan</option>
                    <option value="damage">Kerusakan</option>
                    <option value="loss">Kehilangan</option>
                    <option value="security">Keamanan</option>
                    <option value="other">Lainnya</option>
                  </select>
                </Field>
                <Field label="Keparahan">
                  <select
                    value={incident.severity}
                    onChange={(e) =>
                      setIncident((v) => ({ ...v, severity: e.target.value }))
                    }
                  >
                    <option value="low">Rendah</option>
                    <option value="medium">Sedang</option>
                    <option value="high">Tinggi</option>
                    <option value="critical">Kritis</option>
                  </select>
                </Field>
                <Field label="Waktu">
                  <input
                    type="datetime-local"
                    value={incident.occurred_at}
                    onChange={(e) =>
                      setIncident((v) => ({
                        ...v,
                        occurred_at: e.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Lokasi">
                  <input
                    value={incident.location}
                    onChange={(e) =>
                      setIncident((v) => ({ ...v, location: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Deskripsi" wide>
                  <textarea
                    rows={3}
                    minLength={10}
                    value={incident.description}
                    onChange={(e) =>
                      setIncident((v) => ({
                        ...v,
                        description: e.target.value,
                      }))
                    }
                  />
                </Field>
              </div>
            </div>
            <div className="form-section__footer">
              <Button
                variant="outline"
                disabled={
                  incident.description.trim().length < 10 ||
                  command.mutation.isPending
                }
                onClick={() =>
                  run(`/api/v1/logistics/shipments/${id}/incidents`, {
                    ...incident,
                    occurred_at: new Date(incident.occurred_at).toISOString(),
                    location: incident.location || undefined,
                  })
                }
              >
                <ShieldAlert aria-hidden size={16} />
                Laporkan Insiden
              </Button>
            </div>
          </section>
        </CanAccess>
      ) : null}
      <div className="section-heading">
        <div>
          <h2>Timeline tracking</h2>
          <p>Riwayat append-only dari keberangkatan hingga status terakhir.</p>
        </div>
      </div>
      <ResourceTable
        columns={trackingColumns}
        items={record.tracking_events ?? []}
        getRowId={(item) => item.id}
        empty={
          <EmptyState
            title="Belum ada tracking"
            description="Event pertama dibuat ketika shipment diberangkatkan."
          />
        }
      />
      <div className="section-heading">
        <div>
          <h2>Insiden</h2>
          <p>Penyelesaian insiden memakai maker-checker.</p>
        </div>
      </div>
      {(record.incidents ?? []).some((item) => item.status === "open") ? (
        <CanAccess action="resolve" resource="logistics_incidents">
          <div className="form-section__body mb-4">
            <Field label="Catatan penyelesaian">
              <textarea
                rows={3}
                minLength={10}
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
              />
            </Field>
          </div>
        </CanAccess>
      ) : null}
      <ResourceTable
        columns={incidentColumns}
        items={record.incidents ?? []}
        getRowId={(item) => item.id}
        empty={
          <EmptyState
            title="Tidak ada insiden"
            description="Shipment berjalan tanpa insiden tercatat."
          />
        }
        rowActions={(item) =>
          item.status === "open" ? (
            <CanAccess action="resolve" resource="logistics_incidents">
              <Button
                size="sm"
                variant="outline"
                disabled={
                  resolution.trim().length < 10 || command.mutation.isPending
                }
                onClick={() =>
                  run(`/api/v1/logistics/incidents/${item.id}/resolve`, {
                    resolution_notes: resolution,
                  })
                }
              >
                Selesaikan
              </Button>
            </CanAccess>
          ) : null
        }
      />
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
    <div className={`auth-field${wide ? "auth-field--wide" : ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
