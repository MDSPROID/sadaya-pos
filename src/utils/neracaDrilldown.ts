import { NeracaSummary } from '../hooks/useNeracaData';

/** Filter yang bisa dipasang lewat URL di halaman laporan tujuan. */
export interface DrilldownLink {
  /** Path menu tujuan, mis. '/dashboard/laporan/penjualan'. */
  path: string;
  /** Label menu untuk ditampilkan ke admin. */
  menu: string;
  /** Filter yang ikut terpasang otomatis. */
  params?: {
    status?: string;   // paid | pending | due
    method?: string;   // cash | bank_transfer
    include?: string;  // 'all' = termasuk order batal / belum ada pembayaran
  };
  /** Angka pembanding di halaman tujuan: total | dibayar | kekurangan | hutang. */
  focus: 'total' | 'dibayar' | 'kekurangan' | 'hutang';
  /** true = abaikan tanggal awal periode, buka dari awal data (untuk baris "Total"). */
  sejakAwal?: boolean;
  /** Keterangan singkat cara mencocokkan angkanya di halaman tujuan. */
  cocokkan: string;
}

export interface DrilldownComponent {
  label: string;
  /** Nilai komponen; negatif berarti mengurangi. */
  value: number;
  /** Baris neraca asal komponen ini (agar bisa diklik lagi), bila ada. */
  sourceKey?: NeracaRowKey;
}

export interface DrilldownInfo {
  title: string;
  /** Penjelasan singkat asal angka. */
  sumber: string;
  /** Link ke menu sumber (untuk baris bersumber tunggal). */
  link?: DrilldownLink;
  /** Rumus + komponen (untuk baris gabungan). */
  rumus?: string;
  komponen?: DrilldownComponent[];
  /** Peringatan bila angka bisa berbeda dengan halaman tujuan. */
  catatan?: string;
}

export type NeracaRowKey =
  | 'omset'
  | 'order_paid_cash'
  | 'order_paid_transfer'
  | 'order_not_paid'
  | 'kas_masuk_tunai'
  | 'kas_masuk_transfer'
  | 'kas_keluar_tunai'
  | 'kas_keluar_transfer'
  | 'jumlah_saldo_tunai'
  | 'jumlah_saldo_non_tunai'
  | 'total_jumlah_saldo'
  | 'total_pengeluaran'
  | 'jumlah_hutang'
  | 'jumlah_hutang_total'
  | 'jumlah_piutang'
  | 'jumlah_piutang_total'
  | 'saldo_awal_tunai'
  | 'saldo_awal_non_tunai'
  | 'saldo_seharusnya';

/** Tanggal pembuka untuk baris "Total" — cukup jauh ke belakang untuk mencakup semua data. */
const AWAL_DATA = '2000-01-01';

const PENJUALAN = '/dashboard/laporan/penjualan';
const PEMBELIAN = '/dashboard/laporan/pembelian';
const PEMASUKAN = '/dashboard/laporan/pemasukan';
const PENGELUARAN = '/dashboard/laporan/pengeluaran';

/**
 * Catatan selisih: Neraca menghitung SEMUA order pada periode, sedangkan Laporan
 * Penjualan hanya menampilkan order yang sudah jadi transaksi (lunas, atau belum
 * lunas tapi sudah ada metode pembayaran). Order batal / belum ada pembayaran
 * sama sekali tidak ikut di Laporan Penjualan.
 */
const CATATAN_ORDER =
  'Neraca menghitung semua order periode ini, termasuk yang batal / belum ada pembayaran. Karena itu tombol di bawah membuka Laporan Penjualan dengan opsi "Sertakan order batal / belum ada pembayaran" sudah aktif, supaya angkanya bisa dicocokkan. Kalau opsi itu dimatikan, totalnya akan lebih kecil.';

export const getDrilldown = (key: NeracaRowKey, s: NeracaSummary): DrilldownInfo => {
  switch (key) {
    case 'omset':
      return {
        title: 'Omset',
        sumber: 'Penjumlahan jumlah total (final) semua order pada periode ini.',
        link: {
          path: PENJUALAN,
          menu: 'Laporan Penjualan',
          params: { include: 'all' },
          focus: 'total',
          cocokkan: 'Bandingkan dengan angka "Total Penjualan" di ringkasan.',
        },
        catatan: CATATAN_ORDER,
      };

    case 'order_paid_cash':
      return {
        title: 'Realisasi Tunai',
        sumber: 'Uang masuk dari order dengan metode tunai: order lunas dihitung penuh, order belum lunas dihitung DP-nya.',
        link: {
          path: PENJUALAN,
          menu: 'Laporan Penjualan',
          params: { method: 'cash' },
          focus: 'dibayar',
          cocokkan: 'Bandingkan dengan angka "Dibayar" di ringkasan.',
        },
      };

    case 'order_paid_transfer':
      return {
        title: 'Realisasi Transfer',
        sumber: 'Uang masuk dari order dengan metode transfer: order lunas dihitung penuh, order belum lunas dihitung DP-nya.',
        link: {
          path: PENJUALAN,
          menu: 'Laporan Penjualan',
          params: { method: 'bank_transfer' },
          focus: 'dibayar',
          cocokkan: 'Bandingkan dengan angka "Dibayar" di ringkasan.',
        },
      };

    case 'order_not_paid':
    case 'jumlah_piutang':
      return {
        title: key === 'jumlah_piutang' ? 'Jumlah Piutang (Periode Ini)' : 'Non Realisasi',
        sumber: 'Sisa tagihan order yang belum lunas dan TANGGALNYA di dalam periode ini (jumlah total dikurangi DP). Tunggakan dari periode sebelumnya tidak masuk di sini — lihat baris "Jumlah Piutang (Total)".',
        link: {
          path: PENJUALAN,
          menu: 'Laporan Penjualan',
          params: { status: 'pending', include: 'all' },
          focus: 'kekurangan',
          cocokkan: 'Bandingkan dengan angka "Kekurangan" di ringkasan.',
        },
        catatan: CATATAN_ORDER,
      };

    case 'kas_masuk_tunai':
      return {
        title: 'Kas Masuk Tunai',
        sumber: 'Pemasukan kas tunai dari menu Kas Masuk (entri SALDO AWAL tidak dihitung di sini).',
        link: {
          path: PEMASUKAN,
          menu: 'Laporan Pemasukan',
          params: { method: 'cash' },
          focus: 'total',
          cocokkan: 'Lihat baris Total.',
        },
        catatan: 'Entri bernama "SALDO AWAL" masuk ke saldo awal, bukan ke kas masuk periode ini.',
      };

    case 'kas_masuk_transfer':
      return {
        title: 'Kas Masuk Transfer',
        sumber: 'Pemasukan kas non-tunai dari menu Kas Masuk (entri SALDO AWAL tidak dihitung di sini).',
        link: {
          path: PEMASUKAN,
          menu: 'Laporan Pemasukan',
          params: { method: 'bank_transfer' },
          focus: 'total',
          cocokkan: 'Lihat baris Total.',
        },
        catatan: 'Entri bernama "SALDO AWAL" masuk ke saldo awal, bukan ke kas masuk periode ini.',
      };

    case 'kas_keluar_tunai':
      return {
        title: 'Kas Keluar Tunai',
        sumber: 'Pengeluaran kas tunai dari menu Kas Keluar.',
        link: {
          path: PENGELUARAN,
          menu: 'Laporan Pengeluaran',
          params: { method: 'cash' },
          focus: 'total',
          cocokkan: 'Lihat baris Total.',
        },
      };

    case 'kas_keluar_transfer':
      return {
        title: 'Kas Keluar Transfer',
        sumber: 'Pengeluaran kas non-tunai dari menu Kas Keluar.',
        link: {
          path: PENGELUARAN,
          menu: 'Laporan Pengeluaran',
          params: { method: 'bank_transfer' },
          focus: 'total',
          cocokkan: 'Lihat baris Total.',
        },
      };

    case 'total_pengeluaran':
      return {
        title: 'Total Pengeluaran',
        sumber: 'Seluruh pengeluaran kas periode ini (tunai + transfer).',
        link: { path: PENGELUARAN, menu: 'Laporan Pengeluaran', focus: 'total', cocokkan: 'Lihat baris Total.' },
      };

    case 'jumlah_hutang':
      return {
        title: 'Jumlah Hutang (Periode Ini)',
        sumber: 'Sisa tagihan pembelian yang belum lunas dan TANGGALNYA di dalam periode ini (jumlah total dikurangi yang sudah dibayar). Tunggakan lama tidak masuk di sini — lihat baris "Jumlah Hutang (Total)".',
        link: {
          path: PEMBELIAN,
          menu: 'Laporan Pembelian',
          params: { status: 'due' },
          focus: 'hutang',
          cocokkan: 'Bandingkan dengan angka "Jumlah Hutang (Periode Ini)" di kartu atas.',
        },
      };

    case 'jumlah_piutang_total':
      return {
        title: 'Jumlah Piutang (Total)',
        sumber: 'Seluruh sisa tagihan pelanggan yang belum lunas sampai dengan tanggal akhir periode, termasuk order dari bulan-bulan sebelumnya.',
        link: {
          path: PENJUALAN,
          menu: 'Laporan Penjualan',
          params: { status: 'pending', include: 'all' },
          focus: 'kekurangan',
          sejakAwal: true,
          cocokkan: 'Bandingkan dengan angka "Kekurangan" di ringkasan.',
        },
        catatan: CATATAN_ORDER,
      };

    case 'jumlah_hutang_total':
      return {
        title: 'Jumlah Hutang (Total)',
        sumber: 'Seluruh sisa tagihan ke supplier yang belum lunas sampai dengan tanggal akhir periode, termasuk pembelian dari bulan-bulan sebelumnya.',
        link: {
          path: PEMBELIAN,
          menu: 'Laporan Pembelian',
          params: { status: 'due' },
          focus: 'hutang',
          sejakAwal: true,
          cocokkan: 'Bandingkan dengan angka "Jumlah Hutang (Periode Ini)" di kartu atas.',
        },
      };

    case 'saldo_awal_tunai':
      return {
        title: 'Saldo Awal Tunai',
        sumber:
          'Sisa kas tunai dari SELURUH transaksi sebelum tanggal awal periode: kas masuk tunai + entri "SALDO AWAL" tunai + uang tunai yang diterima dari order − kas keluar tunai. Angka ini tidak punya satu menu sumber tunggal karena menggabungkan seluruh riwayat sebelum periode.',
      };

    case 'saldo_awal_non_tunai':
      return {
        title: 'Saldo Awal Transfer',
        sumber:
          'Sisa saldo transfer dari SELURUH transaksi sebelum tanggal awal periode: kas masuk transfer + entri "SALDO AWAL" transfer + uang transfer yang diterima dari order − kas keluar transfer. Angka ini tidak punya satu menu sumber tunggal karena menggabungkan seluruh riwayat sebelum periode.',
      };

    case 'jumlah_saldo_tunai':
      return {
        title: 'Jumlah Saldo Tunai / Cash',
        sumber: 'Hasil hitungan, bukan satu sumber tunggal.',
        rumus: 'Saldo Awal Tunai + Realisasi Tunai + Kas Masuk Tunai − Kas Keluar Tunai',
        komponen: [
          { label: 'Saldo Awal Tunai (sebelum periode ini)', value: s.saldo_awal_tunai ?? 0, sourceKey: 'saldo_awal_tunai' },
          { label: 'Realisasi Tunai', value: s.order_paid_cash, sourceKey: 'order_paid_cash' },
          { label: 'Kas Masuk Tunai', value: s.kas_masuk_tunai, sourceKey: 'kas_masuk_tunai' },
          { label: 'Kas Keluar Tunai', value: -s.kas_keluar_tunai, sourceKey: 'kas_keluar_tunai' },
        ],
      };

    case 'jumlah_saldo_non_tunai':
      return {
        title: 'Jumlah Saldo Transfer',
        sumber: 'Hasil hitungan, bukan satu sumber tunggal.',
        rumus: 'Saldo Awal Transfer + Realisasi Transfer + Kas Masuk Transfer − Kas Keluar Transfer',
        komponen: [
          { label: 'Saldo Awal Transfer (sebelum periode ini)', value: s.saldo_awal_non_tunai ?? 0, sourceKey: 'saldo_awal_non_tunai' },
          { label: 'Realisasi Transfer', value: s.order_paid_transfer, sourceKey: 'order_paid_transfer' },
          { label: 'Kas Masuk Transfer', value: s.kas_masuk_transfer, sourceKey: 'kas_masuk_transfer' },
          { label: 'Kas Keluar Transfer', value: -s.kas_keluar_transfer, sourceKey: 'kas_keluar_transfer' },
        ],
      };

    case 'total_jumlah_saldo':
      return {
        title: 'Total Jumlah Saldo',
        sumber: 'Hasil hitungan, bukan satu sumber tunggal.',
        rumus: 'Jumlah Saldo Tunai + Jumlah Saldo Transfer',
        komponen: [
          { label: 'Jumlah Saldo Tunai', value: s.jumlah_saldo_tunai, sourceKey: 'jumlah_saldo_tunai' },
          { label: 'Jumlah Saldo Transfer', value: s.jumlah_saldo_non_tunai, sourceKey: 'jumlah_saldo_non_tunai' },
        ],
      };

    case 'saldo_seharusnya':
      return {
        title: 'Saldo Seharusnya',
        sumber: 'Hasil hitungan, bukan satu sumber tunggal.',
        rumus: 'Total Jumlah Saldo + Jumlah Piutang (Total) − Jumlah Hutang (Total)',
        komponen: [
          { label: 'Total Jumlah Saldo', value: s.total_jumlah_saldo, sourceKey: 'total_jumlah_saldo' },
          { label: 'Jumlah Piutang (Total)', value: s.jumlah_piutang_total, sourceKey: 'jumlah_piutang_total' },
          { label: 'Jumlah Hutang (Total)', value: -s.jumlah_hutang_total, sourceKey: 'jumlah_hutang_total' },
        ],
        catatan:
          'Saldo kas di sini kumulatif (sudah termasuk saldo awal), jadi piutang & hutang yang dipakai juga yang Total — bukan yang periode ini saja.',
      };
  }
};

/** URL menu sumber lengkap dengan filter periode, filter tambahan, dan penanda pembanding. */
export const buildDrilldownUrl = (
  link: DrilldownLink,
  startDate: string,
  endDate: string,
  opts?: { label?: string; value?: number }
) => {
  const q = new URLSearchParams({ start: link.sejakAwal ? AWAL_DATA : startDate, end: endDate });
  if (link.params?.status) q.set('status', link.params.status);
  if (link.params?.method) q.set('method', link.params.method);
  if (link.params?.include) q.set('include', link.params.include);

  // Penanda agar halaman tujuan bisa menunjuk langsung angka pembandingnya
  q.set('from', 'neraca');
  q.set('focus', link.focus);
  if (opts?.label) q.set('label', opts.label);
  if (typeof opts?.value === 'number') q.set('value', String(Math.round(opts.value)));

  return `${link.path}?${q.toString()}`;
};
