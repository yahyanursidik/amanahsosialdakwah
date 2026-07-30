# Core Business Rules

## Amanah

```text
Commitment → Receipt → Restriction → Allocation → Disbursement → Distribution → Utilization → Impact → Closing
```

Commitment tidak sama dengan dana diterima.

## Beneficiary

```text
Contact → Application → Screening → Case → Assessment → Verification → Eligibility → Allocation → Distribution → Monitoring
```

Satu contact dapat memiliki banyak case tanpa duplikasi identitas.

## Maker–Checker–Approver

- pembuat tidak boleh menyetujui sendiri;
- workflow approval berversi;
- request menyimpan snapshot workflow;
- approval selesai immutable.

## Dana

- exact numeric;
- tidak boleh over-allocation;
- restricted fund harus kompatibel;
- disbursement merujuk allocation approved;
- distribution berbeda dari disbursement;
- correction memakai reversal/adjustment;
- concurrency tidak boleh menyebabkan overspend.

## Barang dan Inventaris

- sumber: donasi fisik, pembelian, vendor direct delivery;
- stock movement adalah source of truth;
- batch/expiry bila relevan;
- FEFO;
- no negative stock;
- disposal membutuhkan approval dan evidence.

## Distribution

Dapat berupa transfer, tunai, barang, paket, voucher, vendor payment, reimbursement, bantuan berkala, atau wakaf.

Completion memerlukan beneficiary valid, allocation valid, execution, evidence, confirmation bila perlu, dan verification independen.

## Kafalah

Pisahkan commitment, payment, need, matching, schedule, distribution, monitoring, renewal. Matching tidak boleh melebihi need approved.

## Wakaf

Aset tidak boleh dihapus setelah registrasi. Legal status, operational status, valuation, maintenance, utilization, income, expense, dan benefit distribution dicatat terpisah.

## Correction

Dilarang silent editing, overwrite evidence, atau delete transaksi selesai. Gunakan revision, amendment, cancellation, reversal, corrective entry, atau superseding version.
