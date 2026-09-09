# Rencana Barang Program

Rencana barang memisahkan **nilai rencana Program** dari **stok resmi**. Nilai
barang pada Program dihitung dari baris `jumlah × nilai per unit`; stok hanya
berubah melalui `inventory_movements` (goods receipt, adjustment, atau
distribusi yang sah).

## Alur kerja

1. Kelola `Kategori Produk` dan `Produk Inventory` pada menu **Inventory & Gudang**.
2. Saat membuat Program dengan bentuk dukungan **Barang langsung**, pilih produk
   aktif dari master, isi jumlah dan nilai per unit.
3. Sistem menulis `program_goods_plan_items`, menyimpan satuan master sebagai
   snapshot, serta menghitung `goods_budget_amount` dari total seluruh baris.
4. Tahap berikutnya dapat menerjemahkan rencana ini menjadi kebutuhan pengadaan,
   reservasi paket gudang, dan item distribusi tanpa mengetik ulang barang.

## Aturan data dan keamanan

- Produk harus aktif dan berada dalam organisasi aktif pengguna.
- Produk yang sama hanya dapat muncul sekali pada satu rencana Program.
- Item rencana tidak mengubah stok dan tidak dapat dihapus secara fisik;
  statusnya dapat menjadi `cancelled` untuk menjaga jejak audit.
- Tabel baru menggunakan UUID, audit timestamps, RLS eksplisit, indeks tenant,
  dan izin `inventory_product_categories.*` serta `program_goods_plan.*`.
- Kategori teks lama pada produk dimigrasikan menjadi kategori master; kolom
  teks dipertahankan sementara sebagai kompatibilitas data lama.
