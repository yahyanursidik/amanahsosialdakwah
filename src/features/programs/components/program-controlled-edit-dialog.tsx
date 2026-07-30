import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, ShieldCheck, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProgramsDocument } from "@/generated/neon/models";
import {
  controlledEditFormSchema,
  type ControlledEditFormValues,
} from "../schemas";

type ProgramControlledEditDialogProps = {
  isOpen: boolean;
  program: ProgramsDocument;
  onClose: () => void;
  onSubmit: (values: ControlledEditFormValues) => Promise<void>;
  isLoading?: boolean;
};

export function ProgramControlledEditDialog({
  isOpen,
  program,
  onClose,
  onSubmit,
  isLoading = false,
}: ProgramControlledEditDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ControlledEditFormValues>({
    resolver: zodResolver(controlledEditFormSchema),
    defaultValues: {
      reason: "",
      description: program.description ?? "",
      objective: program.objective ?? "",
      target_beneficiary_count: program.target_beneficiary_count ?? 0,
      ends_at: program.ends_at ? program.ends_at.slice(0, 10) : "",
    },
  });

  if (!isOpen) {
    return null;
  }

  const handleFormSubmit = async (values: ControlledEditFormValues) => {
    await onSubmit(values);
    reset();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="controlled-edit-title"
    >
      <div className="border-border bg-card max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border p-6 shadow-xl">
        <div className="border-border mb-4 flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-primary h-5 w-5" />
            <h2 id="controlled-edit-title" className="text-lg font-semibold">
              Aksi Terkontrol — {program.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-md p-1"
            aria-label="Tutup modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <strong>Program Aktif:</strong> Atribut mendasar (kode, anggaran,
            jenis dana) tidak dapat diubah secara bebas. Seluruh penyesuaian
            akan dicatat dalam Jurnal Revisi/Audit dengan alasan penyesuaian.
          </div>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="reason" className="required">
              Alasan Penyesuaian (Wajib untuk Audit)
            </Label>
            <textarea
              id="reason"
              rows={3}
              {...register("reason")}
              className="border-input bg-background ring-offset-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-hidden"
              placeholder="Jelaskan alasan rasional penyesuaian program aktif ini..."
            />
            {errors.reason && (
              <p className="text-destructive text-xs">
                {errors.reason.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="target_beneficiary_count">
              Target Penerima Manfaat
            </Label>
            <Input
              id="target_beneficiary_count"
              type="number"
              min={0}
              {...register("target_beneficiary_count")}
            />
            {errors.target_beneficiary_count && (
              <p className="text-destructive text-xs">
                {errors.target_beneficiary_count.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="ends_at">Tenggat Waktu Baru (Opsional)</Label>
            <Input id="ends_at" type="date" {...register("ends_at")} />
            {errors.ends_at && (
              <p className="text-destructive text-xs">
                {errors.ends_at.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">Deskripsi Program</Label>
            <textarea
              id="description"
              rows={3}
              {...register("description")}
              className="border-input bg-background ring-offset-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-hidden"
            />
            {errors.description && (
              <p className="text-destructive text-xs">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="objective">Tujuan Program</Label>
            <textarea
              id="objective"
              rows={2}
              {...register("objective")}
              className="border-input bg-background ring-offset-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-hidden"
            />
            {errors.objective && (
              <p className="text-destructive text-xs">
                {errors.objective.message}
              </p>
            )}
          </div>

          <div className="border-border flex justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Menyimpan..." : "Simpan Perubahan Terkontrol"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
