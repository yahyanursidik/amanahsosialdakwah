import type { ProgramsDocument } from "@/generated/neon/models";
import type { ControlledEditProgramPayload, ProgramStatus } from "./types";

export function canFreeEditProgram(
  program: Pick<ProgramsDocument, "status" | "is_archived">,
): boolean {
  if (program.is_archived) {
    return false;
  }
  return program.status === "draft";
}

export function canPerformControlledEdit(
  program: Pick<ProgramsDocument, "status" | "is_archived">,
): boolean {
  if (program.is_archived) {
    return false;
  }
  return program.status === "active";
}

export function canArchiveProgram(
  program: Pick<ProgramsDocument, "is_archived">,
): boolean {
  return !program.is_archived;
}

export function canHardDeleteProgram(
  _program: Pick<ProgramsDocument, "status" | "is_archived">,
): false {
  void _program;
  // Business rule: Program tidak boleh hard delete. Hapus dilakukan via Archiving (soft delete).
  return false;
}

export function validateStatusTransition(
  currentStatus: ProgramStatus,
  targetStatus: ProgramStatus,
  isArchived: boolean,
): { allowed: boolean; reason?: string } {
  if (isArchived) {
    return {
      allowed: false,
      reason:
        "Program yang diarsipkan tidak dapat diubah statusnya tanpa di-restore terlebih dahulu.",
    };
  }

  if (currentStatus === targetStatus) {
    return { allowed: true };
  }

  switch (currentStatus) {
    case "draft":
      if (targetStatus === "active" || targetStatus === "archived") {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: "Program draft hanya dapat diaktifkan atau diarsipkan.",
      };

    case "active":
      if (
        targetStatus === "paused" ||
        targetStatus === "completed" ||
        targetStatus === "archived"
      ) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason:
          "Program aktif hanya dapat dihentikan sementara (paused), diselesaikan (completed), atau diarsipkan.",
      };

    case "paused":
      if (
        targetStatus === "active" ||
        targetStatus === "completed" ||
        targetStatus === "archived"
      ) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason:
          "Program paused hanya dapat dilanjutkan (active), diselesaikan, atau diarsipkan.",
      };

    case "completed":
      if (targetStatus === "archived") {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: "Program yang sudah selesai hanya dapat diarsipkan.",
      };

    case "archived":
      return {
        allowed: false,
        reason:
          "Program yang diarsipkan tidak dapat diubah statusnya secara langsung.",
      };

    default:
      return { allowed: false, reason: "Transisi status tidak dikenal." };
  }
}

export function buildControlledEditDiff(
  original: ProgramsDocument,
  payload: ControlledEditProgramPayload,
): {
  changeSummary: string;
  previousValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
  hasChanges: boolean;
} {
  const changes: string[] = [];
  const previousValues: Record<string, unknown> = {};
  const newValues: Record<string, unknown> = {};

  if (
    payload.description !== undefined &&
    payload.description !== original.description
  ) {
    changes.push("Deskripsi diperbarui");
    previousValues.description = original.description ?? "";
    newValues.description = payload.description;
  }

  if (
    payload.objective !== undefined &&
    payload.objective !== original.objective
  ) {
    changes.push("Tujuan program diperbarui");
    previousValues.objective = original.objective ?? "";
    newValues.objective = payload.objective;
  }

  if (
    payload.target_beneficiary_count !== undefined &&
    payload.target_beneficiary_count !== original.target_beneficiary_count
  ) {
    changes.push(
      `Target penerima diubah dari ${original.target_beneficiary_count ?? 0} menjadi ${payload.target_beneficiary_count}`,
    );
    previousValues.target_beneficiary_count =
      original.target_beneficiary_count ?? 0;
    newValues.target_beneficiary_count = payload.target_beneficiary_count;
  }

  if (payload.ends_at !== undefined && payload.ends_at !== original.ends_at) {
    changes.push(
      `Tenggat waktu diubah dari ${original.ends_at ?? "tidak ada"} menjadi ${payload.ends_at ?? "tidak ada"}`,
    );
    previousValues.ends_at = original.ends_at ?? null;
    newValues.ends_at = payload.ends_at;
  }

  return {
    changeSummary:
      changes.length > 0
        ? changes.join("; ")
        : "Aksi terkontrol tanpa perubahan atribut.",
    previousValues,
    newValues,
    hasChanges: changes.length > 0,
  };
}
