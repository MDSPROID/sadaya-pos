-- ============================================================================
-- CEK JUMLAH PIUTANG DI LAPORAN NERACA
-- ----------------------------------------------------------------------------
-- Semua query di sini HANYA MEMBACA, tidak mengubah data apa pun.
-- Jalankan di Supabase Dashboard > SQL Editor.
--
-- Pertanyaannya: apakah Jumlah Piutang ikut menghitung order yang BELUM FIX?
--
-- Di aplikasi, "order fix" = kolom ready_status = 'ready', yang terisi kalau:
--   lunas, ATAU pembayaran tempo, ATAU sudah ada DP / pembayaran sebagian.
-- Order pending tanpa pembayaran dan bukan tempo = 'not_ready' = BELUM FIX.
--
-- Laporan Neraca sekarang menjumlahkan SEMUA order payment_status='pending'
-- tanpa melihat ready_status.
-- ============================================================================


-- ============================================================================
-- BAGIAN 1 — Pecah piutang: yang sudah fix vs yang belum fix
-- ----------------------------------------------------------------------------
-- Angka "Jumlah Piutang" di Neraca = penjumlahan SELURUH baris di bawah ini.
-- Yang seharusnya masuk piutang hanya baris "FIX".
-- ============================================================================

with pending as (
  select
    id,
    order_date,
    invoice_number,
    customer_display_name,
    ready_status,
    final_amount,
    coalesce(
      (regexp_match(notes, '"dp_amount"\s*:\s*([0-9]+(?:\.[0-9]+)?)'))[1]::numeric,
      0
    ) as dp,
    payment_method,
    (notes ~ '"tempo_active"\s*:\s*true') as tempo
  from orders
  where payment_status = 'pending'
    and order_date <= current_date
)
select
  case when ready_status = 'ready'
       then 'FIX (ready) — seharusnya masuk piutang'
       else 'BELUM FIX (not_ready) — seharusnya TIDAK masuk'
  end                                              as jenis,
  count(*)                                         as jumlah_order,
  round(sum(greatest(final_amount - dp, 0)))       as sisa_tagihan
from pending
group by 1
union all
select 'TOTAL (angka yang tampil di Neraca sekarang)',
       count(*),
       round(sum(greatest(final_amount - dp, 0)))
from pending
order by jenis;


-- ============================================================================
-- BAGIAN 2 — Order tempo yang DP-nya masih 0
-- ----------------------------------------------------------------------------
-- Ini kebalikannya: order yang SUDAH fix (tempo) tapi belum ada pembayaran.
-- Kalau jumlahnya > 0, berarti di Laporan Penjualan order ini ikut hilang saat
-- opsi "Sertakan order batal / belum ada pembayaran" dimatikan, padahal
-- piutangnya nyata dan harus ditagih.
-- ============================================================================

with pending as (
  select
    final_amount,
    ready_status,
    payment_method,
    coalesce(
      (regexp_match(notes, '"dp_amount"\s*:\s*([0-9]+(?:\.[0-9]+)?)'))[1]::numeric,
      0
    ) as dp,
    (notes ~ '"tempo_active"\s*:\s*true') as tempo
  from orders
  where payment_status = 'pending'
    and order_date <= current_date
)
select
  count(*)                                   as order_tempo_tanpa_metode_bayar,
  round(sum(greatest(final_amount - dp, 0))) as sisa_tagihan
from pending
where ready_status = 'ready'
  and (payment_method is null or payment_method = '');


-- ============================================================================
-- BAGIAN 3 — Contoh order yang belum fix tapi ikut terhitung
-- ----------------------------------------------------------------------------
-- Untuk dicocokkan admin dengan kenyataan di lapangan: benarkah order-order
-- ini memang belum jadi / belum ada kesepakatan bayar?
-- ============================================================================

select
  invoice_number,
  order_date,
  customer_display_name,
  round(final_amount)      as jumlah_total,
  order_status,
  payment_method
from orders
where payment_status = 'pending'
  and ready_status <> 'ready'
  and order_date <= current_date
order by final_amount desc
limit 20;


-- ============================================================================
-- BAGIAN 4 — Angka yang SEHARUSNYA muncul di Neraca setelah perbaikan
-- ----------------------------------------------------------------------------
-- Jalankan setelah deploy, lalu cocokkan dengan layar Laporan Neraca memakai
-- filter tanggal yang sama (ubah dua tanggal di bawah kalau perlu).
-- Angka bisa bergeser sedikit kalau ada transaksi baru di sela-selanya.
-- ============================================================================

with param as (
  select date '2025-12-01' as dari, current_date as sampai
),
fix as (
  select
    o.order_date,
    o.final_amount,
    o.payment_status,
    coalesce(
      (regexp_match(o.notes, '"dp_amount"\s*:\s*([0-9]+(?:\.[0-9]+)?)'))[1]::numeric,
      0
    ) as dp
  from orders o, param p
  where (o.ready_status = 'ready' or o.payment_status = 'paid')
    and o.order_date <= p.sampai
)
select 'Omset (periode)' as baris,
       round(sum(final_amount)) as nilai
from fix, param p
where order_date >= p.dari
union all
select 'Jumlah Piutang (Periode Ini)',
       round(sum(greatest(final_amount - dp, 0)))
from fix, param p
where payment_status = 'pending' and order_date >= p.dari
union all
select 'Jumlah Piutang (Total)',
       round(sum(greatest(final_amount - dp, 0)))
from fix
where payment_status = 'pending';
