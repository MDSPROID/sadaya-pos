/**
 * Filter awal laporan yang dikirim lewat URL, dipakai saat admin menelusuri
 * angka di Laporan Neraca (lihat utils/neracaDrilldown.ts).
 *
 * Contoh: /dashboard/laporan/penjualan?start=2026-09-01&end=2026-09-30&method=cash
 */
export interface ReportQueryParams {
  start?: string;   // YYYY-MM-DD
  end?: string;     // YYYY-MM-DD
  status?: string;  // paid | pending | due
  method?: string;  // cash | bank_transfer
  /** 'all' = tampilkan juga order batal / belum ada pembayaran (agar cocok dengan Neraca). */
  include?: string;

  /* --- penanda saat dibuka dari Laporan Neraca --- */
  /** 'neraca' bila halaman dibuka lewat penelusuran angka neraca. */
  from?: string;
  /** Nama baris neraca asal, mis. "Jumlah Piutang". */
  label?: string;
  /** Angka pembanding di halaman ini: total | dibayar | kekurangan | hutang. */
  focus?: string;
  /** Nilai menurut neraca, untuk dibandingkan. */
  value?: number;
}

const isDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

export const readReportParams = (search: string): ReportQueryParams => {
  const q = new URLSearchParams(search);
  const start = q.get('start');
  const end = q.get('end');
  const status = q.get('status');
  const method = q.get('method');
  const include = q.get('include');
  const from = q.get('from');
  const label = q.get('label');
  const focus = q.get('focus');
  const value = Number(q.get('value'));

  return {
    start: isDate(start) ? start : undefined,
    end: isDate(end) ? end : undefined,
    status: status && ['paid', 'pending', 'due'].includes(status) ? status : undefined,
    method: method && ['cash', 'bank_transfer'].includes(method) ? method : undefined,
    include: include === 'all' ? 'all' : undefined,
    from: from === 'neraca' ? 'neraca' : undefined,
    label: label || undefined,
    focus: focus && ['total', 'dibayar', 'kekurangan', 'hutang'].includes(focus) ? focus : undefined,
    value: Number.isFinite(value) && q.get('value') !== null ? value : undefined,
  };
};
