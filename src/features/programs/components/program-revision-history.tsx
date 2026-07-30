import { Clock, History, User } from "lucide-react";

import { StatusBadge } from "@/components/design-system";
import type { ProgramRevisionsDocument } from "@/generated/neon/models";

type ProgramRevisionHistoryProps = {
  revisions: ProgramRevisionsDocument[];
  isLoading?: boolean;
};

const actionTypeLabels: Record<
  string,
  { label: string; tone: "neutral" | "success" | "warning" | "danger" | "info" }
> = {
  created: { label: "Program Dibuat", tone: "info" },
  draft_updated: { label: "Draft Diperbarui", tone: "neutral" },
  activated: { label: "Program Diaktifkan", tone: "success" },
  controlled_edit: { label: "Aksi Terkontrol", tone: "warning" },
  paused: { label: "Program Diberhentikan", tone: "warning" },
  resumed: { label: "Program Dilanjutkan", tone: "success" },
  completed: { label: "Program Diselesaikan", tone: "success" },
  archived: { label: "Program Diarsipkan", tone: "danger" },
  restored: { label: "Program Dipulihkan", tone: "info" },
};

export function ProgramRevisionHistory({
  revisions,
  isLoading = false,
}: ProgramRevisionHistoryProps) {
  if (isLoading) {
    return (
      <div className="text-muted-foreground p-4 text-center text-sm">
        Memuat riwayat revisi...
      </div>
    );
  }

  if (!revisions || revisions.length === 0) {
    return (
      <div className="border-border text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
        Belum ada catatan revisi atau perubahan audit untuk program ini.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-foreground flex items-center gap-2 text-sm font-semibold">
        <History className="text-primary h-4 w-4" />
        <span>Jurnal Audit & Riwayat Perubahan</span>
      </div>

      <div className="before:bg-border relative space-y-6 pl-6 before:absolute before:top-2 before:bottom-2 before:left-2.5 before:w-0.5">
        {revisions.map((rev) => {
          const config = actionTypeLabels[rev.action_type] ?? {
            label: rev.action_type,
            tone: "neutral",
          };

          return (
            <div key={rev.$id} className="group relative">
              <div className="border-background bg-primary ring-primary/20 absolute top-1.5 -left-6 h-3 w-3 rounded-full border-2 ring-2" />

              <div className="border-border bg-card space-y-2 rounded-lg border p-4 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <StatusBadge tone={config.tone}>{config.label}</StatusBadge>
                    <span className="text-muted-foreground flex items-center gap-1 text-xs">
                      <Clock className="h-3 w-3" />
                      {new Date(
                        rev.performed_at || rev.$createdAt,
                      ).toLocaleString("id-ID")}
                    </span>
                  </div>
                  <span className="text-muted-foreground flex items-center gap-1 text-xs">
                    <User className="h-3 w-3" />
                    ID Petugas: {rev.performed_by || "Sistem"}
                  </span>
                </div>

                <p className="text-foreground text-sm font-medium">
                  {rev.change_summary}
                </p>

                {rev.reason && (
                  <div className="bg-muted/50 text-muted-foreground border-border/50 rounded-md border p-2 text-xs">
                    <strong className="text-foreground">Alasan:</strong>{" "}
                    {rev.reason}
                  </div>
                )}

                {rev.previous_values && rev.new_values && (
                  <details className="text-muted-foreground text-xs">
                    <summary className="hover:text-foreground cursor-pointer font-medium">
                      Lihat Rincian Perubahan
                    </summary>
                    <div className="bg-muted mt-2 grid grid-cols-1 gap-2 rounded-md p-2 font-mono text-[11px] sm:grid-cols-2">
                      <div>
                        <span className="text-destructive font-semibold">
                          Sebelum:
                        </span>
                        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap">
                          {rev.previous_values}
                        </pre>
                      </div>
                      <div>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          Sesudah:
                        </span>
                        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap">
                          {rev.new_values}
                        </pre>
                      </div>
                    </div>
                  </details>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
