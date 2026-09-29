/** Teks status perjalanan penerima dalam bahasa Indonesia. */
const journeyStatusCopy: Record<string, string> = {
  accepted: "Diterima",
  allocated: "Sudah dialokasikan",
  approved: "Disetujui",
  assessment: "Sedang asesmen",
  cancelled: "Dibatalkan",
  completed: "Selesai disalurkan",
  converted: "Menjadi kasus",
  draft: "Draf",
  eligible: "Layak menerima bantuan",
  emergency: "Darurat",
  in_distribution: "Sedang disalurkan",
  in_screening: "Sedang diperiksa",
  manual_review: "Perlu penilaian manual",
  needs_action: "Perlu ditindaklanjuti",
  normal: "Prioritas normal",
  not_eligible: "Belum memenuhi kriteria",
  open: "Kasus terbuka",
  pending: "Menunggu proses",
  ready: "Siap disalurkan",
  rejected: "Ditolak",
  reserved: "Kuota dicadangkan",
  submitted: "Menunggu pemeriksaan",
  urgent: "Mendesak",
  verified: "Terverifikasi",
  waitlisted: "Masuk daftar tunggu",
};

export function formatJourneyStatus(value: string | null | undefined): string {
  if (!value) return "Belum tersedia";
  return journeyStatusCopy[value] ?? value.replaceAll("_", " ");
}
