import {
  useCustomMutation,
  useNavigation,
  useOne,
  type HttpError,
} from "@refinedev/core";
import { ArrowLeft, Download, Globe2, Trash2 } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router";
import { CanAccess } from "@/components/access-control/can-access";
import {
  DetailSection,
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  StatusBadge,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { EvidenceFile } from "@/features/evidence/types";

export function EvidenceDetailPage() {
  const { id = "" } = useParams();
  const { list } = useNavigation();
  const query = useOne<EvidenceFile>({
    id,
    resource: "evidence_files",
    queryOptions: { enabled: Boolean(id) },
  });
  const command = useCustomMutation<
    Record<string, unknown>,
    HttpError,
    Record<string, unknown>
  >();
  const [deleteReason, setDeleteReason] = useState("");
  const [publication, setPublication] = useState({
    consent_reference: "",
    redaction_notes: "",
  });
  if (query.query.isLoading)
    return (
      <section className="workspace-page">
        <LoadingSkeleton lines={8} />
      </section>
    );
  if (query.query.isError || !query.result)
    return (
      <section className="workspace-page">
        <PageHeader eyebrow="Evidence" title="Detail Bukti" />
        <ErrorState
          title="Bukti tidak ditemukan"
          description="Bukti tidak tersedia, restricted, atau berada di organisasi lain."
          onRetry={() => query.query.refetch()}
        />
      </section>
    );
  const record = query.result;
  const run = (
    path: string,
    values: Record<string, unknown>,
    onSuccess?: (data: Record<string, unknown>) => void,
  ) =>
    command.mutate(
      { url: path, method: "post", values },
      {
        onSuccess: ({ data }) => {
          onSuccess?.(data);
          void query.query.refetch();
        },
      },
    );
  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow={`Evidence / v${record.version}`}
        title={record.original_file_name}
        description={record.purpose}
        meta={
          <StatusBadge
            tone={
              record.status === "available"
                ? "success"
                : record.status === "deleted" || record.status === "quarantined"
                  ? "danger"
                  : "neutral"
            }
          >
            {record.status}
          </StatusBadge>
        }
        actions={
          <Button variant="outline" onClick={() => list("evidence_files")}>
            <ArrowLeft aria-hidden size={16} />
            Daftar
          </Button>
        }
      />
      {command.mutation.isError ? (
        <ErrorState
          title="Command bukti ditolak"
          description={
            command.mutation.error?.message ?? "Periksa status dan permission."
          }
        />
      ) : null}
      <DetailSection
        title="Metadata bukti"
        items={[
          {
            label: "Entitas",
            value: `${record.entity_type} / ${record.entity_id}`,
          },
          { label: "Klasifikasi", value: record.classification },
          { label: "MIME", value: record.mime_type },
          {
            label: "Ukuran",
            value: `${(Number(record.size_bytes) / 1024 / 1024).toFixed(2)} MB`,
          },
          { label: "Versi", value: String(record.version) },
          {
            label: "Dikonfirmasi",
            value: record.confirmed_at
              ? new Date(record.confirmed_at).toLocaleString("id-ID")
              : "Belum",
          },
        ]}
      />
      {record.status === "available" ? (
        <CanAccess action="download" resource="evidence_files">
          <div className="form-section__footer">
            <Button
              onClick={() =>
                run(`/api/v1/evidence/files/${id}/download`, {}, (data) => {
                  const url = data.url;
                  if (typeof url === "string") window.location.assign(url);
                })
              }
            >
              <Download aria-hidden size={16} />
              Unduh via Signed URL
            </Button>
          </div>
        </CanAccess>
      ) : null}
      {record.status === "available" && !record.publication_status ? (
        <CanAccess action="publish" resource="evidence_files">
          <section className="form-section">
            <div className="section-heading">
              <div>
                <h2>Publikasi terkontrol</h2>
                <p>Wajib memiliki consent dan catatan redaksi/anonymization.</p>
              </div>
            </div>
            <div className="form-section__body">
              <div className="form-grid">
                <div className="auth-field">
                  <Label htmlFor="consent-reference">Referensi consent</Label>
                  <input
                    id="consent-reference"
                    minLength={5}
                    value={publication.consent_reference}
                    onChange={(e) =>
                      setPublication((v) => ({
                        ...v,
                        consent_reference: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="auth-field auth-field--wide">
                  <Label htmlFor="redaction-notes">Catatan redaksi</Label>
                  <textarea
                    id="redaction-notes"
                    rows={3}
                    minLength={10}
                    value={publication.redaction_notes}
                    onChange={(e) =>
                      setPublication((v) => ({
                        ...v,
                        redaction_notes: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
            <div className="form-section__footer">
              <Button
                disabled={
                  publication.consent_reference.trim().length < 5 ||
                  publication.redaction_notes.trim().length < 10 ||
                  command.mutation.isPending
                }
                onClick={() =>
                  run(`/api/v1/evidence/files/${id}/publish`, publication)
                }
              >
                <Globe2 aria-hidden size={16} />
                Catat Publikasi
              </Button>
            </div>
          </section>
        </CanAccess>
      ) : null}
      {record.status === "available" || record.status === "quarantined" ? (
        <CanAccess action="delete" resource="evidence_files">
          <section className="form-section">
            <div className="section-heading">
              <div>
                <h2>Tandai terhapus</h2>
                <p>
                  Metadata dan object dipertahankan untuk audit; tidak ada hard
                  delete.
                </p>
              </div>
            </div>
            <div className="form-section__body">
              <div className="auth-field">
                <Label htmlFor="delete-reason">Alasan</Label>
                <textarea
                  id="delete-reason"
                  rows={3}
                  minLength={10}
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                />
              </div>
            </div>
            <div className="form-section__footer">
              <Button
                variant="outline"
                disabled={
                  deleteReason.trim().length < 10 || command.mutation.isPending
                }
                onClick={() =>
                  run(`/api/v1/evidence/files/${id}/delete`, {
                    reason: deleteReason,
                  })
                }
              >
                <Trash2 aria-hidden size={16} />
                Tandai Terhapus
              </Button>
            </div>
          </section>
        </CanAccess>
      ) : null}
    </section>
  );
}
