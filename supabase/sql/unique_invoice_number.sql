-- ============================================================================
-- Mencegah nomor faktur kembar (orders & purchase_orders)
-- ----------------------------------------------------------------------------
-- Jalankan di Supabase Dashboard > SQL Editor, BERTAHAP, jangan sekaligus.
-- Bagian 1 & 2 hanya membaca. Bagian 4 yang mengubah struktur.
-- ============================================================================


-- ============================================================================
-- BAGIAN 1 — CEK DULU: apakah sudah ada faktur kembar?
-- Kalau hasilnya kosong, langsung lompat ke BAGIAN 4.
-- ============================================================================

-- Penjualan
select invoice_number,
       count(*)                       as jumlah,
       min(created_at)                as pertama_dibuat,
       max(created_at)                as terakhir_dibuat,
       string_agg(id::text, ', ')     as daftar_id
from orders
where invoice_number is not null
group by invoice_number
having count(*) > 1
order by jumlah desc, invoice_number;

-- Pembelian
select invoice_number,
       count(*)                       as jumlah,
       string_agg(id::text, ', ')     as daftar_id
from purchase_orders
where invoice_number is not null
group by invoice_number
having count(*) > 1
order by jumlah desc, invoice_number;


-- ============================================================================
-- BAGIAN 2 — Lihat isi transaksi yang kembar sebelum memutuskan
-- Ganti 'INV0926-01' dengan nomor dari hasil BAGIAN 1.
-- ============================================================================

-- select id, invoice_number, order_date, created_at, customer_display_name,
--        final_amount, payment_status
-- from orders
-- where invoice_number = 'INV0926-01'
-- order by created_at;


-- ============================================================================
-- BAGIAN 3 — Rapikan yang kembar (HANYA kalau BAGIAN 1 menemukan data)
-- ----------------------------------------------------------------------------
-- Transaksi yang dibuat lebih dulu MEMPERTAHANKAN nomornya. Yang menyusul
-- diberi akhiran -R2, -R3, dst. supaya nomornya unik tapi masih terlacak.
--
-- PENTING: nomor faktur yang berubah adalah nomor yang sudah pernah dicetak ke
-- nota pelanggan. Cetak dulu hasil BAGIAN 1 sebagai catatan, dan pastikan bagian
-- keuangan setuju sebelum menjalankan ini.
--
-- Hapus tanda komentar (--) di bawah kalau sudah yakin.
-- ============================================================================

-- with peringkat as (
--   select id,
--          invoice_number,
--          row_number() over (partition by invoice_number
--                             order by created_at, id) as urutan
--   from orders
--   where invoice_number is not null
-- )
-- update orders o
-- set invoice_number = p.invoice_number || '-R' || p.urutan
-- from peringkat p
-- where o.id = p.id
--   and p.urutan > 1;

-- with peringkat as (
--   select id,
--          invoice_number,
--          row_number() over (partition by invoice_number
--                             order by created_at, id) as urutan
--   from purchase_orders
--   where invoice_number is not null
-- )
-- update purchase_orders o
-- set invoice_number = p.invoice_number || '-R' || p.urutan
-- from peringkat p
-- where o.id = p.id
--   and p.urutan > 1;


-- ============================================================================
-- BAGIAN 4 — Pasang kuncinya
-- ----------------------------------------------------------------------------
-- Setelah ini, database menolak nomor faktur kembar. Aplikasi sudah siap:
-- kalau dua kasir menyimpan bersamaan dan nomornya bentrok, aplikasi otomatis
-- menaikkan nomornya lalu menyimpan ulang (insertWithUniqueInvoice).
--
-- Baris tanpa nomor faktur (NULL) tetap diperbolehkan.
-- Kalau perintah ini GAGAL, artinya masih ada data kembar -> ulangi BAGIAN 1.
-- ============================================================================

create unique index if not exists orders_invoice_number_unique
  on orders (invoice_number)
  where invoice_number is not null;

create unique index if not exists purchase_orders_invoice_number_unique
  on purchase_orders (invoice_number)
  where invoice_number is not null;


-- ============================================================================
-- BAGIAN 5 — Pastikan sudah terpasang
-- ============================================================================

select indexname, indexdef
from pg_indexes
where indexname in ('orders_invoice_number_unique',
                    'purchase_orders_invoice_number_unique');
