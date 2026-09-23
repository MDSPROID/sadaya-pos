-- ============================================================================
-- Stok minimum untuk produk & bahan baku
-- ----------------------------------------------------------------------------
-- Jalankan di Supabase Dashboard > SQL Editor.
-- Aman dijalankan berulang kali (pakai IF NOT EXISTS).
--
-- JALANKAN SQL INI DULU, baru deploy aplikasinya. Kalau aplikasinya lebih dulu,
-- halaman Laporan Stok akan error karena kolomnya belum ada.
-- ============================================================================


-- ============================================================================
-- BAGIAN 1 — Tambah kolom
-- ----------------------------------------------------------------------------
-- Default 0 = tidak dipantau. Barang baru dianggap tidak dipantau sampai
-- admin mengisi batasnya sendiri, jadi tidak ada peringatan palsu.
-- ============================================================================

alter table produk
  add column if not exists stok_minimum numeric not null default 0;

alter table bahan
  add column if not exists stok_minimum numeric not null default 0;

comment on column produk.stok_minimum is
  'Batas stok untuk peringatan "menipis". 0 = tidak dipantau.';
comment on column bahan.stok_minimum is
  'Batas stok untuk peringatan "menipis". 0 = tidak dipantau.';


-- ============================================================================
-- BAGIAN 1b — Penanda "stok menipis" yang dihitung otomatis
-- ----------------------------------------------------------------------------
-- Kolom ini terisi sendiri dari stok & stok_minimum dan selalu ikut berubah
-- saat stok berubah. Gunanya supaya filter "Hanya stok menipis" di aplikasi
-- bisa menyaring di sisi database — kalau disaring di browser, hasilnya cuma
-- baris pada halaman yang sedang dibuka, bukan seluruh data.
-- ============================================================================

alter table produk
  add column if not exists stok_menipis boolean
  generated always as (stok_minimum > 0 and stok <= stok_minimum) stored;

alter table bahan
  add column if not exists stok_menipis boolean
  generated always as (stok_minimum > 0 and stok <= stok_minimum) stored;

create index if not exists produk_stok_menipis_idx on produk (stok_menipis);
create index if not exists bahan_stok_menipis_idx  on bahan  (stok_menipis);


-- ============================================================================
-- BAGIAN 2 — (Opsional) Isi batas awal secara massal
-- ----------------------------------------------------------------------------
-- Mengisi 200+ barang satu per satu itu melelahkan. Kalau mau, pasang dulu
-- batas awal untuk SEMUA barang, lalu admin merapikan yang penting saja.
-- Hapus tanda komentar (--) pada perintah yang dipilih.
-- ============================================================================

-- Contoh A: semua bahan baku diberi batas 5
-- update bahan set stok_minimum = 5 where stok_minimum = 0;

-- Contoh B: batas = 10% dari stok saat ini, dibulatkan ke atas, minimal 1
-- update bahan
-- set stok_minimum = greatest(1, ceil(stok * 0.1))
-- where stok_minimum = 0 and stok > 0;


-- ============================================================================
-- BAGIAN 3 — Cek hasilnya
-- ============================================================================

-- Barang yang stoknya sudah di bawah batas
select 'bahan' as jenis, id, nama as nama_barang, stok, stok_minimum
from bahan
where stok_minimum > 0 and stok <= stok_minimum
union all
select 'produk' as jenis, id, nama_produk, stok, stok_minimum
from produk
where stok_minimum > 0 and stok <= stok_minimum
order by jenis, nama_barang;
