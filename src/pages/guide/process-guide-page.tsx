import {
  ArrowRight,
  Building2,
  Gift,
  HandHeart,
  Landmark,
  Sprout,
  Truck,
  UserRound,
} from "lucide-react";
import { useState, type ComponentType } from "react";
import { Link } from "react-router";

import { PageHeader } from "@/components/design-system";
import { Button } from "@/components/ui/button";

type Step = { description: string; href: string; menu: string; title: string };
type Journey = {
  icon: ComponentType<{ "aria-hidden"?: boolean; size?: number }>;
  id: string;
  label: string;
  steps: Step[];
  summary: string;
  who: string;
};

const journeys: Journey[] = [
  {
    icon: HandHeart,
    id: "donor",
    label: "Donatur (dana)",
    summary:
      "Pemberi zakat, infaq, sedekah, atau donasi program dalam bentuk uang.",
    who: "Petugas penghimpunan / keuangan",
    steps: [
      { description: "Daftarkan donatur (individu/lembaga) dan beri peran Donatur.", href: "/crm/contacts/new", menu: "Relasi → Contact master", title: "Catat donatur" },
      { description: "Pastikan ada Dana amanah: umum atau terikat program.", href: "/funds", menu: "Penghimpunan → Dana amanah", title: "Siapkan pos dana" },
      { description: "Catat penerimaan dana dan tautkan ke donatur agar masuk laporan pribadinya.", href: "/funds/new/receipt", menu: "Dana amanah → Penerimaan", title: "Terima dana" },
      { description: "Alokasikan ke program, lalu salurkan melalui Distribusi.", href: "/funds", menu: "Dana amanah → Alokasi", title: "Alokasikan & salurkan" },
      { description: "Bagikan laporan pribadi donatur: pemberian + capaian program yang didukung.", href: "/reports/stakeholders?role=donor", menu: "Laporan → Pemangku kepentingan", title: "Laporkan ke donatur" },
    ],
  },
  {
    icon: Gift,
    id: "goods",
    label: "Donatur barang",
    summary:
      "Pemberian sembako, pakaian, alat sekolah, obat, atau barang lain — termasuk zakat/wakaf dalam bentuk barang.",
    who: "Petugas gudang",
    steps: [
      { description: "Pastikan jenis barang sudah ada di master produk (satuan, batch, kedaluwarsa).", href: "/inventory", menu: "Penyaluran → Inventory", title: "Siapkan master produk" },
      { description: "Pilih donatur, jenis amanah, program tujuan, gudang, dan rincian barang.", href: "/in-kind-donations/new", menu: "Penghimpunan → Donasi barang", title: "Terima donasi barang" },
      { description: "Cetak tanda terima dari halaman detail untuk diberikan kepada donatur.", href: "/in-kind-donations", menu: "Donasi barang → detail", title: "Cetak tanda terima" },
      { description: "Stok bertambah otomatis. Rakit paket bantuan dan kirim via Logistik.", href: "/aid-packages", menu: "Penyaluran → Paket bantuan", title: "Kemas & kirim" },
      { description: "Laporan donatur menampilkan barang yang diberikan dan program terkait.", href: "/reports/stakeholders?role=donor", menu: "Laporan → Pemangku kepentingan", title: "Laporkan ke donatur" },
    ],
  },
  {
    icon: Sprout,
    id: "wakif",
    label: "Wakif (pemberi wakaf)",
    summary:
      "Wakaf uang (pokok dijaga), wakaf melalui uang (patungan membangun aset), wakaf benda (tanah, bangunan, kendaraan), atau wakaf produktif.",
    who: "Nazhir / petugas wakaf",
    steps: [
      { description: "Buat aset/proyek wakaf dan pilih skemanya: wakaf uang, melalui uang, benda, atau produktif. Tentukan khairi/ahli dan muabbad/muaqqat.", href: "/waqf/assets/new", menu: "Wakaf → Aset wakaf", title: "Tentukan jenis wakaf" },
      { description: "Catat setiap setoran wakif (boleh atas nama keluarga yang telah wafat) beserta no. AIW/sertifikat wakaf uang.", href: "/waqf", menu: "Detail aset → Setoran wakif", title: "Catat setoran wakif" },
      { description: "Unggah metadata dokumen legal, verifikasi oleh petugas lain, lalu registrasi aktif.", href: "/waqf", menu: "Detail aset → Dokumen legal", title: "Legalitas & registrasi" },
      { description: "Kelola nazhir, pemanfaatan, pendapatan hasil, dan distribusi manfaat.", href: "/waqf", menu: "Detail aset", title: "Kelola & salurkan manfaat" },
      { description: "Laporan wakif memuat setoran, status aset, dan manfaat yang telah tersalur.", href: "/reports/stakeholders?role=donor", menu: "Laporan → Pemangku kepentingan", title: "Laporkan ke wakif" },
    ],
  },
  {
    icon: UserRound,
    id: "individual",
    label: "Individu pengaju",
    summary: "Perorangan yang mengajukan bantuan atau manfaat wakaf untuk diri/keluarganya.",
    who: "Petugas intake / lapangan",
    steps: [
      { description: "Daftarkan kontak dan beri peran Pengaju atau Penerima manfaat.", href: "/crm/contacts/new", menu: "Relasi → Contact master", title: "Catat pengaju" },
      { description: "Pilih tipe “Individu”, program, jumlah penerima, dan kebutuhan.", href: "/applications/new", menu: "Program & pengajuan → Pengajuan bantuan", title: "Buat pengajuan" },
      { description: "Ajukan → seleksi → terima/tolak → konversi menjadi kasus.", href: "/applications", menu: "Pengajuan → detail", title: "Seleksi" },
      { description: "Asesmen & persetujuan, lalu distribusi dana/barang ke penerima.", href: "/cases", menu: "Kasus → Asesmen → Distribusi", title: "Asesmen & penyaluran" },
      { description: "Untuk manfaat wakaf, gunakan Pengajuan program wakaf jenis “Permohonan manfaat”.", href: "/waqf/proposals/new", menu: "Wakaf → Pengajuan", title: "Alternatif: manfaat wakaf" },
    ],
  },
  {
    icon: Building2,
    id: "institution",
    label: "Lembaga mitra pengaju",
    summary:
      "Masjid, pesantren, sekolah, atau yayasan yang mengajukan untuk lembaganya, atau mengajukan atas nama penerima di wilayahnya.",
    who: "Petugas kemitraan / program",
    steps: [
      { description: "Daftarkan lembaga (tipe lembaga) dengan peran Pengaju; beri juga peran Mitra penyalur bila ikut menyalurkan.", href: "/crm/partners", menu: "Relasi → Mitra & pengaju", title: "Daftarkan lembaga" },
      { description: "Tipe “Lembaga untuk lembaganya” — isi jumlah jiwa/santri yang terlayani.", href: "/applications/new", menu: "Pengajuan bantuan", title: "Pengajuan untuk lembaga" },
      { description: "Tipe “Mitra atas nama penerima” — pilih lembaga mitra dan penerima; kanal otomatis ‘Mitra’.", href: "/applications/new", menu: "Pengajuan bantuan", title: "Pengajuan atas nama penerima" },
      { description: "Usulan proyek wakaf (masjid, sumur, sekolah) atau penawaran aset diajukan di sini.", href: "/waqf/proposals/new", menu: "Wakaf → Pengajuan program wakaf", title: "Usulan program wakaf" },
      { description: "Laporan lembaga: semua pengajuan, statusnya, dan usulan wakaf.", href: "/reports/stakeholders?role=applicant", menu: "Laporan → Pemangku kepentingan", title: "Pantau & laporkan" },
    ],
  },
  {
    icon: Truck,
    id: "partner",
    label: "Lembaga mitra penyalur",
    summary: "Mitra yang menyalurkan bantuan ke penerima di area tertentu.",
    who: "Petugas program / logistik",
    steps: [
      { description: "Pastikan lembaga memiliki peran Mitra penyalur.", href: "/crm/partners", menu: "Relasi → Mitra & pengaju", title: "Daftarkan mitra" },
      { description: "Di detail Program, tetapkan area penyaluran dan tugaskan mitra (peran, PIC, kesiapan).", href: "/programs", menu: "Program → Operasional", title: "Tugaskan ke program" },
      { description: "Alokasikan pengajuan yang diterima ke mitra & area.", href: "/programs", menu: "Program → Alokasi pengajuan", title: "Alokasikan penerima" },
      { description: "Kirim paket via Logistik; mitra mengonfirmasi serah terima dan bukti.", href: "/logistics", menu: "Penyaluran → Logistik / Distribusi", title: "Salurkan" },
      { description: "Laporan mitra: penugasan, kesiapan, penerima dilayani, dan paket.", href: "/reports/stakeholders?role=distribution_partner", menu: "Laporan → Pemangku kepentingan", title: "Laporkan kinerja mitra" },
    ],
  },
  {
    icon: Landmark,
    id: "general",
    label: "Laporan umum",
    summary: "Ringkasan organisasi untuk pengurus, auditor, dan publik.",
    who: "Pimpinan / auditor",
    steps: [
      { description: "Dana, barang, wakaf, penyaluran, dan antrean tindak lanjut dalam satu layar.", href: "/reports", menu: "Laporan & dashboard", title: "Ringkasan organisasi" },
      { description: "Donatur & wakif teratas, kinerja mitra, dan rekap pengaju.", href: "/reports/stakeholders", menu: "Laporan → Pemangku kepentingan", title: "Rekap per peran" },
      { description: "Terbitkan halaman publik program untuk transparansi kepada masyarakat.", href: "/programs", menu: "Program → Publikasi", title: "Publikasi program" },
      { description: "Jejak audit dan risiko untuk pemeriksaan.", href: "/governance", menu: "Tata kelola → Audit & risiko", title: "Audit" },
    ],
  },
];

export function ProcessGuidePage() {
  const [active, setActive] = useState(journeys[0]!.id);
  const journey = journeys.find((item) => item.id === active) ?? journeys[0]!;
  const Icon = journey.icon;

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow="Panduan"
        title="Panduan alur kerja"
        description="Pilih siapa yang Anda layani. Setiap langkah menunjukkan menu yang dipakai — klik untuk langsung membukanya. Menu yang tidak Anda punya izinnya akan menampilkan halaman akses ditolak."
      />
      <div className="report-range flex-wrap" role="tablist" aria-label="Peran">
        {journeys.map((item) => (
          <Button
            aria-selected={active === item.id}
            key={item.id}
            role="tab"
            size="sm"
            variant={active === item.id ? "default" : "outline"}
            onClick={() => setActive(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>
      <div className="rounded-3xl border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-primary/10 p-3 text-primary">
            <Icon aria-hidden size={22} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{journey.label}</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {journey.summary}
            </p>
            <p className="mt-1 text-sm">
              <strong>Dikerjakan oleh:</strong> {journey.who}
            </p>
          </div>
        </div>
      </div>
      <ol className="guide-steps">
        {journey.steps.map((step, index) => (
          <li key={step.title}>
            <span className="guide-steps__number">{index + 1}</span>
            <div>
              <strong>{step.title}</strong>
              <p>{step.description}</p>
              <Link to={step.href}>
                {step.menu} <ArrowRight aria-hidden size={14} />
              </Link>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
