import { useIsAuthenticated } from "@refinedev/core";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BookOpenCheck,
  Building2,
  ClipboardCheck,
  Coins,
  FileSearch,
  Gift,
  HandCoins,
  HandHeart,
  HeartHandshake,
  KeyRound,
  Landmark,
  ListChecks,
  LockKeyhole,
  Menu,
  PackageCheck,
  Route,
  ShieldCheck,
  Smartphone,
  Sprout,
  Truck,
  UsersRound,
  WifiOff,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";

import { BrandLogo } from "@/components/brand/brand-logo";
import { TrustFlowIllustration } from "@/components/brand/trust-flow-illustration";
import { AppFooter } from "@/components/layout/app-footer";
import { percentageOf } from "@/features/programs/percentage";
import { fundTypeLabels, programSupportModeLabels } from "@/features/programs/schemas";

type PublicProgram = {
  beneficiaries_reached: number;
  budget_amount: string;
  category_name: string | null;
  distributed_amount: string;
  ends_at: string | null;
  fund_types: string[];
  id: string;
  name: string;
  organization_name: string;
  starts_at: string | null;
  summary: string;
  support_modes: Array<keyof typeof programSupportModeLabels>;
  target_beneficiary_count: number;
};

type PublicOverview = {
  programs: PublicProgram[];
  stats: {
    active_programs: number;
    beneficiaries_reached: number;
    distributed_amount: string;
    organizations: number;
    packages_delivered: number;
    waqf_assets: number;
  };
};

const rupiah = (value: string | number) => {
  const amount = Number(value);
  if (amount >= 1_000_000_000) return `Rp${(amount / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  if (amount >= 1_000_000) return `Rp${(amount / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  return `Rp${amount.toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
};

const navigation = [
  { href: "#alur", label: "Alur amanah" },
  { href: "#fitur", label: "Fitur" },
  { href: "#program", label: "Program" },
  { href: "#transparansi", label: "Transparansi" },
  { href: "#tanya-jawab", label: "Tanya jawab" },
];

const journey = [
  {
    description: "Terima donasi dana, barang, wakaf, dan kafalah. Setiap pemberian tercatat atas nama pemberinya dan pos dananya.",
    icon: HandCoins,
    title: "Himpun",
  },
  {
    description: "Susun program dengan kategori, klasifikasi amanah, target penerima, serta rencana dana dan barang sekaligus.",
    icon: ClipboardCheck,
    title: "Rencanakan",
  },
  {
    description: "Terima pengajuan dari individu dan lembaga, lakukan asesmen dan kunjungan verifikasi sebelum menetapkan penerima.",
    icon: FileSearch,
    title: "Seleksi",
  },
  {
    description: "Salurkan dana, paket barang, atau keduanya dalam satu kunjungan, lengkap dengan ceklis petugas, foto, dan GPS.",
    icon: Truck,
    title: "Salurkan",
  },
  {
    description: "Laporan per donatur dan per program, jejak audit yang tidak dapat dihapus, dan halaman publik program.",
    icon: BarChart3,
    title: "Laporkan",
  },
];

const audiences = [
  {
    description: "Satu ruang kerja untuk dana, gudang, program, penyaluran, dan laporan, dengan hak akses per peran.",
    icon: Building2,
    title: "Pengurus lembaga & yayasan",
  },
  {
    description: "Riwayat pemberian, komitmen rutin, dan laporan pemanfaatan yang jelas untuk setiap donatur dan wakif.",
    icon: HeartHandshake,
    title: "Donatur & wakif",
  },
  {
    description: "Masjid, pesantren, dan komunitas dapat mengajukan program atau menyalurkan bantuan secara tercatat.",
    icon: UsersRound,
    title: "Mitra penyalur & pengaju",
  },
  {
    description: "To-do berceklis di HP untuk menyalurkan, memverifikasi, mengantar, dan melapor — tetap jalan tanpa sinyal.",
    icon: Smartphone,
    title: "Tim lapangan",
  },
  {
    description: "Pantau risiko, insiden, pengaduan, dan tindakan perbaikan dengan jejak audit lintas modul.",
    icon: ShieldCheck,
    title: "Auditor & pengawas",
  },
];

const features = [
  {
    icon: Landmark,
    items: ["Dana amanah per pos & rekonsiliasi", "Donasi barang langsung masuk gudang", "Wakaf uang, aset, dan hasil produktif", "Kafalah dengan jadwal & monitoring"],
    title: "Penghimpunan",
  },
  {
    icon: ClipboardCheck,
    items: ["Kategori program yang dapat ditambah", "Klasifikasi amanah & tipe penerima ganda", "Rencana dana dan barang dalam satu program", "Pengajuan individu & lembaga, asesmen, approval"],
    title: "Program & pengajuan",
  },
  {
    icon: PackageCheck,
    items: ["Distribusi dengan konfirmasi penerima", "Paket bantuan, pengemasan, dan gudang", "Pengiriman dengan pelacakan kurir", "Bukti & dokumen yang aksesnya tercatat"],
    title: "Penyaluran & logistik",
  },
  {
    icon: ListChecks,
    items: ["To-do berceklis per penerima", "Template ceklis yang diatur admin", "Foto, GPS, dan laporan dari lokasi", "Antrean offline, terkirim saat ada sinyal"],
    title: "Kerja lapangan",
  },
  {
    icon: HandHeart,
    items: ["Registri donatur & wakif otomatis", "Status keaktifan dan segmen donatur", "Catatan komunikasi & tindak lanjut", "Laporan pemberian per donatur"],
    title: "Donatur & wakif",
  },
  {
    icon: KeyRound,
    items: ["Anggota, peran, dan hak akses per menu", "Peran khusus lembaga", "Risiko, insiden, dan pengaduan", "Jejak audit yang tidak dapat dihapus"],
    title: "Tata kelola & laporan",
  },
];

const safeguards = [
  {
    description: "NIK dan KK hanya disimpan 4 digit terakhir beserta sidik digital satu arah; nomor rekening disamarkan bagi yang tidak berwenang.",
    icon: LockKeyhole,
    title: "Data penerima terlindungi",
  },
  {
    description: "Setiap perubahan penting tercatat siapa, kapan, dan apa yang berubah — dan catatan itu tidak dapat dihapus.",
    icon: FileSearch,
    title: "Jejak audit permanen",
  },
  {
    description: "Pengaju tidak dapat menyetujui pengajuannya sendiri; laporan lapangan direview oleh orang yang berbeda.",
    icon: BadgeCheck,
    title: "Pemeriksaan berlapis",
  },
  {
    description: "Data setiap lembaga terpisah, dan setiap anggota hanya melihat menu serta data sesuai perannya.",
    icon: ShieldCheck,
    title: "Akses sesuai peran",
  },
];

const faqs = [
  {
    answer:
      "Amanah Platform adalah ruang kerja digital untuk lembaga sosial-dakwah: menghimpun dana, barang, wakaf, dan kafalah; menjalankan program; menyalurkan bantuan; hingga melaporkannya secara transparan.",
    question: "Apa itu Amanah Platform?",
  },
  {
    answer:
      "Yayasan, lembaga amil, nazhir wakaf, masjid, pesantren, dan komunitas. Setiap anggota tim mendapat akun dengan peran sendiri — misalnya admin, bendahara, petugas lapangan, atau auditor.",
    question: "Siapa yang dapat memakainya?",
  },
  {
    answer:
      "Ya. Petugas mencentang langkah kerja, mengambil foto, dan mencatat GPS dari HP. Bila sinyal hilang, data disimpan di perangkat dan terkirim otomatis saat kembali online.",
    question: "Apakah bisa dipakai di lapangan tanpa sinyal?",
  },
  {
    answer:
      "Bisa. Satu program dapat menyalurkan dana, barang, atau keduanya sekaligus. Ceklis petugas menyesuaikan: serah terima dana hanya muncul bila ada dana, dan serah terima barang hanya bila ada barang.",
    question: "Apakah satu program bisa berupa dana dan barang sekaligus?",
  },
  {
    answer:
      "Lembaga dapat membagikan laporan pemberian per donatur serta halaman publik program yang menampilkan capaian tanpa membuka identitas penerima.",
    question: "Bagaimana donatur melihat hasil amanahnya?",
  },
  {
    answer:
      "Pengelola platform membuatkan ruang kerja lembaga. Setelah itu admin lembaga menambahkan anggota tim dan mengatur perannya sendiri dari menu Tata kelola.",
    question: "Bagaimana lembaga mulai menggunakan?",
  },
];

function StatValue({ value }: { value: number | string | undefined }) {
  return <strong>{value ?? "—"}</strong>;
}

/** Beranda di /beranda: memeriksa sesi agar tombol mengarah ke ruang kerja. */
export function PublicHomePage() {
  const { data: auth } = useIsAuthenticated();
  return <HomeLandingPage signedIn={Boolean(auth?.authenticated)} />;
}

/**
 * Isi beranda. Saat tampil sebagai pengganti "/" untuk pengunjung, halaman
 * ini tidak memeriksa sesi sendiri agar tidak memicu ulang pemeriksaan sesi
 * induknya.
 */
export function HomeLandingPage({ signedIn = false }: { signedIn?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const workspaceHref = signedIn ? "/" : "/login";
  const workspaceLabel = signedIn ? "Buka ruang kerja" : "Masuk";

  const overview = useQuery({
    queryFn: async () => {
      const response = await fetch("/api/v1/public/overview", { headers: { accept: "application/json" } });
      if (!response.ok) throw new Error("Ringkasan belum tersedia.");
      return ((await response.json()) as { data: PublicOverview }).data;
    },
    queryKey: ["public", "overview"],
    retry: 1,
    staleTime: 5 * 60_000,
  });
  const stats = overview.data?.stats;
  const programs = overview.data?.programs ?? [];

  useEffect(() => {
    document.title = "Amanah Platform · Kelola amanah sosial-dakwah dengan transparan";
    const description = document.querySelector('meta[name="description"]');
    const content =
      "Ruang kerja digital untuk lembaga sosial-dakwah: himpun dana, barang, wakaf, dan kafalah; salurkan bantuan dengan ceklis lapangan; laporkan secara transparan.";
    if (description) description.setAttribute("content", content);
    else {
      const meta = document.createElement("meta");
      meta.name = "description";
      meta.content = content;
      document.head.appendChild(meta);
    }
  }, []);

  const statItems = [
    { icon: Building2, label: "Lembaga aktif", value: stats?.organizations },
    { icon: ClipboardCheck, label: "Program berjalan", value: stats?.active_programs },
    { icon: UsersRound, label: "Penerima terjangkau", value: stats?.beneficiaries_reached?.toLocaleString("id-ID") },
    { icon: Coins, label: "Dana & manfaat tersalurkan", value: stats ? rupiah(stats.distributed_amount) : undefined },
    { icon: Gift, label: "Paket bantuan tersalurkan", value: stats?.packages_delivered?.toLocaleString("id-ID") },
    { icon: Sprout, label: "Aset wakaf produktif", value: stats?.waqf_assets },
  ];

  return (
    <div className="landing">
      <a className="landing__skip" href="#konten">
        Langsung ke konten
      </a>

      <header className="landing-header" data-open={menuOpen}>
        <div className="landing-shell landing-header__bar">
          <Link aria-label="Amanah Platform — beranda" className="landing-header__brand" to="/beranda">
            <BrandLogo priority />
          </Link>
          <nav aria-label="Navigasi beranda" className="landing-header__nav" id="landing-nav">
            {navigation.map((item) => (
              <a href={item.href} key={item.href} onClick={() => setMenuOpen(false)}>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="landing-header__actions">
            <Link className="landing-button landing-button--primary landing-button--small" to={workspaceHref}>
              {workspaceLabel} <ArrowRight aria-hidden size={16} />
            </Link>
            <button
              aria-controls="landing-nav"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
              className="landing-header__toggle"
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
            >
              {menuOpen ? <X aria-hidden size={20} /> : <Menu aria-hidden size={20} />}
            </button>
          </div>
        </div>
      </header>

      <main id="konten">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-shell landing-hero__grid">
            <div className="landing-hero__copy">
              <p className="landing-eyebrow landing-eyebrow--light">
                <ShieldCheck aria-hidden size={16} /> Platform amanah sosial-dakwah
              </p>
              <h1 id="landing-title">Setiap amanah punya perjalanan yang jelas.</h1>
              <p className="landing-hero__lead">
                Himpun dana, barang, wakaf, dan kafalah. Salurkan tepat sasaran bersama tim lapangan. Laporkan kepada
                donatur dan publik — semuanya dalam satu ruang kerja yang dapat ditelusuri.
              </p>
              <div className="landing-hero__actions">
                <Link className="landing-button landing-button--light" to={workspaceHref}>
                  {signedIn ? "Buka ruang kerja" : "Masuk ke ruang kerja"} <ArrowRight aria-hidden size={18} />
                </Link>
                <a className="landing-button landing-button--ghost-light" href="#program">
                  Lihat program berjalan
                </a>
              </div>
              <ul className="landing-hero__points">
                <li><FileSearch aria-hidden size={16} /> Jejak audit permanen</li>
                <li><LockKeyhole aria-hidden size={16} /> Data penerima terlindungi</li>
                <li><WifiOff aria-hidden size={16} /> Tetap jalan tanpa sinyal</li>
              </ul>
            </div>
            <div className="landing-hero__visual">
              <TrustFlowIllustration />
              {stats ? (
                <div className="landing-hero__badge" aria-hidden>
                  <span>Tersalurkan</span>
                  <strong>{rupiah(stats.distributed_amount)}</strong>
                  <small>kepada {stats.beneficiaries_reached.toLocaleString("id-ID")} penerima</small>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section aria-label="Capaian bersama" className="landing-stats">
          <div className="landing-shell">
            <ul className="landing-stats__grid" aria-busy={overview.isLoading}>
              {statItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.label}>
                    <Icon aria-hidden size={20} />
                    {overview.isLoading ? <span className="landing-skeleton" /> : <StatValue value={item.value} />}
                    <span>{item.label}</span>
                  </li>
                );
              })}
            </ul>
            <p className="landing-stats__note">
              {overview.isError
                ? "Angka capaian sedang tidak dapat dimuat."
                : "Angka dihitung langsung dari transaksi yang tercatat di platform, tanpa membuka identitas penerima."}
            </p>
          </div>
        </section>

        <section className="landing-section" aria-labelledby="alur-title" id="alur">
          <div className="landing-shell">
            <div className="landing-section__head">
              <p className="landing-eyebrow"><Route aria-hidden size={16} /> Alur amanah</p>
              <h2 id="alur-title">Dari pemberi hingga penerima, setiap langkah tercatat.</h2>
              <p>Lima tahap yang saling terhubung, sehingga setiap rupiah dan setiap paket dapat ditelusuri asal dan tujuannya.</p>
            </div>
            <ol className="landing-journey">
              {journey.map((step, index) => {
                const Icon = step.icon;
                return (
                  <li key={step.title}>
                    <span className="landing-journey__number">{index + 1}</span>
                    <Icon aria-hidden size={26} />
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <section className="landing-section landing-section--tint" aria-labelledby="peran-title">
          <div className="landing-shell">
            <div className="landing-section__head">
              <p className="landing-eyebrow"><UsersRound aria-hidden size={16} /> Untuk siapa</p>
              <h2 id="peran-title">Dirancang untuk semua yang menjaga amanah.</h2>
            </div>
            <div className="landing-audiences">
              {audiences.map((audience) => {
                const Icon = audience.icon;
                return (
                  <article key={audience.title}>
                    <Icon aria-hidden size={24} />
                    <h3>{audience.title}</h3>
                    <p>{audience.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="landing-section" aria-labelledby="fitur-title" id="fitur">
          <div className="landing-shell">
            <div className="landing-section__head">
              <p className="landing-eyebrow"><BookOpenCheck aria-hidden size={16} /> Fitur</p>
              <h2 id="fitur-title">Lengkap dari penghimpunan sampai pertanggungjawaban.</h2>
              <p>Modul-modul saling terhubung: donasi masuk ke pos dana, program memakai dana dan barang, petugas menyalurkan, laporan terbentuk otomatis.</p>
            </div>
            <div className="landing-features">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article key={feature.title}>
                    <header>
                      <span className="landing-features__icon"><Icon aria-hidden size={22} /></span>
                      <h3>{feature.title}</h3>
                    </header>
                    <ul>
                      {feature.items.map((item) => (
                        <li key={item}><BadgeCheck aria-hidden size={16} /> {item}</li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="landing-section landing-section--field" aria-labelledby="lapangan-title">
          <div className="landing-shell landing-split">
            <div>
              <p className="landing-eyebrow"><Smartphone aria-hidden size={16} /> Kerja lapangan</p>
              <h2 id="lapangan-title">Petugas cukup membuka HP dan mencentang.</h2>
              <p>
                Koordinator membuat tugas per penerima. Petugas melihat to-do berisi alamat, rute, nominal dana, dan
                rincian paket. Setiap langkah dicentang, foto dan GPS diambil dari lokasi, lalu laporan terkirim — tugas
                selesai otomatis.
              </p>
              <ul className="landing-checks">
                <li>Serah terima dana dan barang dalam satu kunjungan</li>
                <li>Template ceklis sesuai aturan lembaga</li>
                <li>Tanpa sinyal? Data tersimpan dan terkirim nanti</li>
                <li>Laporan direview supervisor yang berbeda</li>
              </ul>
            </div>
            <div className="landing-phone" aria-hidden>
              <div className="landing-phone__screen">
                <p className="landing-phone__title">Salurkan dana &amp; barang — Ibu Siti</p>
                <div className="landing-phone__chips"><span>Dana Rp300.000</span><span>1 paket</span></div>
                <div className="landing-phone__progress"><span style={{ width: "60%" }} /></div>
                <ul>
                  <li data-done="true">Cocokkan identitas penerima</li>
                  <li data-done="true">Serahkan dana Rp300.000</li>
                  <li data-done="true">Serahkan 1 paket sembako</li>
                  <li>Foto serah terima</li>
                  <li>Kirim laporan lapangan</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section" aria-labelledby="program-title" id="program">
          <div className="landing-shell">
            <div className="landing-section__head">
              <p className="landing-eyebrow"><HandHeart aria-hidden size={16} /> Program berjalan</p>
              <h2 id="program-title">Program yang sedang disalurkan.</h2>
              <p>Buka halaman program untuk melihat rencana, capaian, dan laporan publiknya.</p>
            </div>
            {overview.isLoading ? (
              <div className="landing-programs">
                {[0, 1, 2].map((key) => <div className="landing-program landing-program--loading" key={key} />)}
              </div>
            ) : programs.length === 0 ? (
              <p className="landing-empty">Belum ada program aktif yang ditampilkan.</p>
            ) : (
              <div className="landing-programs">
                {programs.map((program) => {
                  const progress = percentageOf(Number(program.distributed_amount), Number(program.budget_amount));
                  return (
                    <article className="landing-program" key={program.id}>
                      <p className="landing-program__org">
                        {program.organization_name}
                        {program.category_name ? ` · ${program.category_name}` : ""}
                      </p>
                      <h3>{program.name}</h3>
                      <p className="landing-program__summary">{program.summary}</p>
                      <div className="landing-program__chips">
                        {program.support_modes.map((mode) => (
                          <span key={mode}>{programSupportModeLabels[mode] ?? mode}</span>
                        ))}
                        {program.fund_types.slice(0, 2).map((type) => (
                          <span data-tone="soft" key={type}>{fundTypeLabels[type as keyof typeof fundTypeLabels] ?? type}</span>
                        ))}
                      </div>
                      <div className="landing-program__progress" aria-label={`Tersalurkan ${progress}% dari rencana`}>
                        <span style={{ width: `${progress}%` }} />
                      </div>
                      <dl>
                        <div><dt>Rencana</dt><dd>{rupiah(program.budget_amount)}</dd></div>
                        <div><dt>Target penerima</dt><dd>{program.target_beneficiary_count.toLocaleString("id-ID")}</dd></div>
                      </dl>
                      <Link className="landing-program__link" to={`/p/${program.id}`}>
                        Lihat program <ArrowRight aria-hidden size={16} />
                      </Link>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="landing-section landing-section--deep" aria-labelledby="transparansi-title" id="transparansi">
          <div className="landing-shell">
            <div className="landing-section__head landing-section__head--light">
              <p className="landing-eyebrow landing-eyebrow--light"><ShieldCheck aria-hidden size={16} /> Transparansi & keamanan</p>
              <h2 id="transparansi-title">Amanah dijaga, data dilindungi.</h2>
              <p>Keterbukaan kepada donatur tidak boleh mengorbankan martabat dan privasi penerima.</p>
            </div>
            <div className="landing-safeguards">
              {safeguards.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.title}>
                    <Icon aria-hidden size={24} />
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="landing-section" aria-labelledby="faq-title" id="tanya-jawab">
          <div className="landing-shell landing-faq">
            <div className="landing-section__head">
              <p className="landing-eyebrow"><BookOpenCheck aria-hidden size={16} /> Tanya jawab</p>
              <h2 id="faq-title">Yang sering ditanyakan.</h2>
            </div>
            <div className="landing-faq__list">
              {faqs.map((faq, index) => (
                <details key={faq.question} open={index === 0}>
                  <summary>{faq.question}</summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-cta" aria-labelledby="cta-title">
          <div className="landing-shell landing-cta__inner">
            <div>
              <h2 id="cta-title">Siap mengelola amanah dengan lebih tertib?</h2>
              <p>Masuk dengan akun yang diberikan lembaga Anda, atau jelajahi program yang sedang berjalan.</p>
            </div>
            <div className="landing-cta__actions">
              <Link className="landing-button landing-button--primary" to={workspaceHref}>
                {signedIn ? "Buka ruang kerja" : "Masuk ke ruang kerja"} <ArrowRight aria-hidden size={18} />
              </Link>
              <a className="landing-button landing-button--outline" href="#program">
                Lihat program
              </a>
            </div>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
