# Audit, Risk, Incident, Complaint, and Corrective Action

## Scope fase 21

Modul ini menyediakan register organisasi untuk:

- `risk_flags`;
- `governance_incidents`;
- `complaints`;
- `corrective_actions`;
- `governance_events` append-only;
- pembacaan ringkas `audit_events` lintas modul.

Setiap record mempunyai referensi organisasi, status terkontrol, penanggung
jawab, SLA, dan audit trail. Tidak ada hard delete.

## SLA

SLA awal dihitung server-side dari waktu kejadian/penerimaan:

| Severity | Respons | Resolusi |
|---|---:|---:|
| Critical | 4 jam | 24 jam |
| High | 8 jam | 72 jam |
| Medium | 24 jam | 168 jam |
| Low | 72 jam | 720 jam |

Kategori pengaduan fraud, safeguarding, dan privacy menggunakan severity high;
kategori lain menggunakan medium. SLA configurable per organisasi belum masuk
fase ini.

## Security and privacy

- seluruh endpoint memakai session, membership aktif, active organization, dan
  permission server-side;
- RLS tetap memfilter seluruh tabel tenant-owned;
- field officer hanya mendapat `governance_incidents.report` dan
  `complaints.record` secara default;
- daftar pengaduan tidak mengirim uraian dan contact pelapor;
- pengaduan restricted memerlukan `complaints.restricted_read`;
- pelapor tidak boleh menyelesaikan laporan sendiri;
- pelaksana corrective action tidak boleh memverifikasi pekerjaannya sendiri;
- event governance append-only dan payload audit before/after tidak dikirim di
  endpoint daftar.

## State transitions

Transisi status diperiksa di application service dan trigger PostgreSQL.
Penyelesaian, penutupan, dan verifikasi wajib memakai command endpoint, bukan
generic CRUD update.

## Rollback notes

Migration `0024_audit_risk.sql` bersifat aditif. Rollback memerlukan ekspor dan
retensi record governance sebelum tabel, policy, trigger, permission, serta
indeks dihapus. Karena record merupakan jejak audit, rollback destruktif tidak
boleh dilakukan tanpa persetujuan dan arsip resmi.

## Known limitations

- SLA belum configurable per organisasi dan belum memiliki eskalasi otomatis;
- notifikasi email/WhatsApp belum tersedia;
- upload lampiran masih menunggu konfigurasi S3 production;
- korelasi otomatis risk flag dari rule lintas modul belum aktif;
- redaction/detail view pengaduan restricted akan diperkeras pada fase 22.
