/**
 * Label berbahasa Indonesia untuk nilai enum penghimpunan, wakaf, dan
 * pengajuan. Halaman memakai `labelOf` agar status tidak tampil sebagai kode.
 */
export type LabelMap = Record<string, string>;

export function labelOf(map: LabelMap, value: string | null | undefined) {
  if (!value) return "—";
  return map[value] ?? value.replaceAll("_", " ");
}

export function optionsOf(map: LabelMap) {
  return Object.entries(map).map(([value, label]) => ({ label, value }));
}

export type StatusTone = "danger" | "info" | "neutral" | "success" | "warning";

export function toneOf(status: string | null | undefined): StatusTone {
  if (!status) return "neutral";
  if (
    [
      "accepted",
      "active",
      "approved",
      "completed",
      "converted",
      "posted",
      "received",
      "verified",
    ].includes(status)
  )
    return "success";
  if (
    [
      "cancelled",
      "declined",
      "disputed",
      "rejected",
      "retired",
      "reversed",
      "suspended",
    ].includes(status)
  )
    return "danger";
  if (
    [
      "in_screening",
      "pending",
      "pending_review",
      "submitted",
      "under_maintenance",
      "under_review",
    ].includes(status)
  )
    return "warning";
  if (["draft", "planned"].includes(status)) return "info";
  return "neutral";
}

export const waqfAssetTypeLabels: LabelMap = {
  building: "Bangunan",
  cash: "Uang (wakaf uang)",
  equipment: "Peralatan",
  land: "Tanah",
  other: "Lainnya",
  precious_metal: "Logam mulia",
  productive_asset: "Aset produktif",
  rights: "Hak (sewa/HAKI)",
  securities: "Surat berharga/sukuk",
  vehicle: "Kendaraan",
};

export const waqfPurposeLabels: LabelMap = {
  ahli: "Wakaf ahli (keluarga/keturunan)",
  khairi: "Wakaf khairi (kepentingan umum)",
  musytarak: "Wakaf musytarak (gabungan)",
};

export const waqfDurationLabels: LabelMap = {
  permanent: "Selamanya (muabbad)",
  temporary: "Berjangka (muaqqat)",
};

export const waqfSchemeLabels: LabelMap = {
  cash_for_asset: "Wakaf melalui uang (patungan membangun/membeli aset)",
  cash_waqf: "Wakaf uang (pokok dijaga, hasil disalurkan)",
  direct_asset: "Wakaf benda langsung",
  productive: "Wakaf produktif (dikelola untuk menghasilkan)",
};

export const waqfSchemeHints: LabelMap = {
  cash_for_asset:
    "Dana wakif dihimpun hingga target untuk membangun atau membeli aset. Setoran boleh dicatat saat aset masih draft.",
  cash_waqf:
    "Uang wakaf diinvestasikan secara syariah; nilai pokok tidak boleh berkurang, hanya hasilnya yang disalurkan sebagai manfaat.",
  direct_asset:
    "Wakif menyerahkan benda (tanah, bangunan, kendaraan, dll.) secara langsung melalui ikrar wakaf.",
  productive:
    "Aset dikelola secara usaha (sewa, bagi hasil, panen) dan hasilnya disalurkan sebagai manfaat.",
};

export const waqfOperationalStatusLabels: LabelMap = {
  active: "Aktif",
  draft: "Draft (menunggu registrasi)",
  retired: "Dihentikan",
  suspended: "Ditangguhkan",
  under_maintenance: "Dalam pemeliharaan",
};

export const waqfLegalStatusLabels: LabelMap = {
  disputed: "Sengketa",
  incomplete: "Dokumen belum lengkap",
  pending_review: "Menunggu verifikasi",
  verified: "Legalitas terverifikasi",
};

export const waqfContributionFormLabels: LabelMap = {
  building: "Bangunan",
  cash: "Uang",
  goods: "Barang",
  land: "Tanah",
  other: "Lainnya",
  precious_metal: "Logam mulia",
};

export const paymentMethodLabels: LabelMap = {
  bank_transfer: "Transfer bank",
  cash: "Tunai",
  e_wallet: "Dompet digital",
  in_kind: "Serah terima benda",
  other: "Lainnya",
  payroll: "Potong gaji",
  qris: "QRIS",
};

export const waqfProposalTypeLabels: LabelMap = {
  asset_offer: "Penawaran aset wakaf (calon wakif)",
  benefit_request: "Permohonan manfaat wakaf",
  waqf_project: "Proyek wakaf baru (mis. masjid, sekolah, sumur)",
};

export const waqfProposalTypeHints: LabelMap = {
  asset_offer:
    "Individu/lembaga ingin mewakafkan aset. Setelah disetujui, sistem membuat aset wakaf draft dengan wakif terisi.",
  benefit_request:
    "Individu/lembaga memohon manfaat dari aset wakaf yang sudah aktif. Setelah disetujui, sistem membuat rencana pemanfaatan.",
  waqf_project:
    "Lembaga/individu mengusulkan proyek wakaf. Setelah disetujui, sistem membuat aset draft; bila ada nilai kebutuhan, aset langsung siap menghimpun wakaf melalui uang.",
};

export const proposalStatusLabels: LabelMap = {
  approved: "Disetujui — siap diteruskan",
  cancelled: "Dibatalkan",
  converted: "Sudah diteruskan",
  draft: "Draft",
  rejected: "Ditolak",
  submitted: "Diajukan",
  under_review: "Sedang dinilai",
};

export const proposerTypeLabels: LabelMap = {
  individual: "Individu",
  institution: "Lembaga",
};

export const givingTypeLabels: LabelMap = {
  csr: "CSR perusahaan",
  hibah: "Hibah",
  infaq: "Infaq",
  other: "Lainnya",
  sedekah: "Sedekah",
  waqf: "Wakaf benda",
  zakat: "Zakat (fitrah/mal dalam bentuk barang)",
};

export const donorTypeLabels: LabelMap = {
  anonymous: "Hamba Allah (anonim)",
  individual: "Individu",
  institution: "Lembaga/perusahaan",
};

export const itemConditionLabels: LabelMap = {
  good_used: "Bekas layak pakai",
  needs_repair: "Perlu perbaikan",
  new: "Baru",
};

export const submitterTypeLabels: LabelMap = {
  individual: "Individu mengajukan untuk dirinya/keluarga",
  institution: "Lembaga mengajukan untuk lembaganya",
  partner_on_behalf: "Lembaga mitra mengajukan atas nama penerima",
};

export const applicationStatusLabels: LabelMap = {
  accepted: "Diterima",
  cancelled: "Dibatalkan",
  converted: "Menjadi kasus",
  draft: "Draft",
  in_screening: "Diseleksi",
  rejected: "Ditolak",
  submitted: "Diajukan",
};

export const partnerRoleLabels: LabelMap = {
  coordinator: "Koordinator",
  distributor: "Penyalur",
  lead: "Mitra utama",
  monitor: "Pemantau",
};

export const readinessLabels: LabelMap = {
  accepted: "Menerima tugas",
  declined: "Menolak",
  pending: "Menunggu konfirmasi",
  ready: "Siap",
};

export const contactRoleLabels: LabelMap = {
  applicant: "Pengaju",
  beneficiary: "Penerima manfaat",
  distribution_partner: "Mitra penyalur",
  donor: "Donatur/wakif",
  kafil: "Kafil",
  volunteer: "Relawan",
};

export const beneficiaryTypeLabels: LabelMap = {
  community: "Komunitas",
  family: "Keluarga",
  individual: "Individu",
  institution: "Lembaga",
};

export const vulnerabilityLabels: LabelMap = {
  critical: "Kritis",
  high: "Tinggi",
  low: "Rendah",
  medium: "Sedang",
};

export const assessmentStatusLabels: LabelMap = {
  eligible: "Layak",
  expired: "Kedaluwarsa",
  in_review: "Sedang dinilai",
  not_assessed: "Belum dinilai",
  not_eligible: "Tidak layak",
};

export const beneficiaryStatusLabels: LabelMap = {
  active: "Aktif",
  blocked: "Diblokir",
  graduated: "Sudah mandiri",
  inactive: "Tidak aktif",
};

export const incomeRangeLabels: LabelMap = {
  low: "Rendah",
  middle: "Menengah",
  none: "Tidak berpenghasilan",
  unknown: "Belum diketahui",
};

export const asnafLabels: LabelMap = {
  amil: "Amil",
  fakir: "Fakir",
  fisabilillah: "Fisabilillah",
  gharimin: "Gharimin (terlilit utang)",
  ibnu_sabil: "Ibnu sabil (musafir)",
  miskin: "Miskin",
  muallaf: "Muallaf",
  riqab: "Riqab",
};

export const beneficiaryCategoryLabels: LabelMap = {
  dai: "Dai",
  disabilitas: "Disabilitas",
  dhuafa: "Dhuafa",
  guru_ngaji: "Guru ngaji",
  ibnu_sabil: "Ibnu sabil",
  janda: "Janda",
  korban_bencana: "Korban bencana",
  lainnya: "Lainnya",
  lansia: "Lansia",
  mahasiswa: "Mahasiswa",
  mualaf: "Mualaf",
  pasien: "Pasien",
  pelajar: "Pelajar",
  piatu: "Piatu",
  santri: "Santri",
  yatim: "Yatim",
  yatim_piatu: "Yatim piatu",
};

export const maritalStatusLabels: LabelMap = {
  divorced: "Cerai hidup",
  married: "Menikah",
  single: "Belum menikah",
  widowed: "Cerai mati",
};

export const educationLabels: LabelMap = {
  diploma: "Diploma",
  none: "Tidak sekolah",
  s1: "S1",
  s2_plus: "S2 / lebih",
  sd: "SD / sederajat",
  sma: "SMA / sederajat",
  smp: "SMP / sederajat",
};

export const housingLabels: LabelMap = {
  family: "Menumpang keluarga",
  free_use: "Bebas sewa",
  none: "Tidak punya tempat tinggal",
  official: "Rumah dinas",
  own: "Milik sendiri",
  rent: "Sewa / kontrak",
};

export const disabilityLabels: LabelMap = {
  intellectual: "Intelektual",
  mental: "Mental",
  multiple: "Ganda",
  none: "Tidak ada",
  physical: "Fisik",
  sensory: "Sensorik",
};

export const genderLabels: LabelMap = {
  female: "Perempuan",
  male: "Laki-laki",
  unknown: "Belum diisi",
};

export const identityTypeLabels: LabelMap = {
  family_card: "Nomor KK",
  kitab: "KITAS",
  nik: "NIK",
  other: "Lainnya",
  passport: "Paspor",
  tax_id: "NPWP",
};

export const beneficiarySourceLabels: LabelMap = {
  kafalah: "Kafalah",
  program: "Program donasi",
  registered: "Terdaftar",
  waqf: "Manfaat wakaf",
};
