# Program Support Modes

Program membedakan **klasifikasi amanah** dari **bentuk dukungan**.

- `fund_type` menyatakan klasifikasi amanah, misalnya zakat, infak, sedekah, atau wakaf.
- `support_modes` menyatakan bentuk pelaksanaan: `cash`, `in_kind`, dan `logistics`.
- `cash_budget_amount`, `goods_budget_amount`, serta `logistics_budget_amount` adalah komponen rencana.
- `budget_amount` adalah total terhitung dari ketiga komponen. Database menolak total yang tidak sesuai.

Nilai `goods_budget_amount` adalah valuasi rencana barang, bukan pengganti stok.
Kuantitas, batch, expiry, packing, serta pengiriman aktual tetap dikelola oleh
Inventory, Aid Packages, dan Logistics. Biaya pengiriman/handling direncanakan
di `logistics_budget_amount`; pengeluaran kas resmi tetap melalui Funds Engine.

Program lama dimigrasikan sebagai `cash` dengan nilai `cash_budget_amount`
sama dengan target anggarannya yang lama. Tidak ada data transaksi yang dihapus.
