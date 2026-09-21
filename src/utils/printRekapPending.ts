export interface RekapPendingRow {
  invoice_number: string | null;
  order_date: string;
  customer_name: string;
  customer_phone: string;
  kasir_name: string;
  final_amount: number;
  paid: number;
  remaining: number;
  durasi_tunggu: number;
  catatan: string;
  tempo_date: string | null;
}

export interface RekapPendingSummary {
  count: number;
  totalAmount: number;
  totalPaid: number;
  totalRemaining: number;
}

interface CompanyInfo {
  logoUrl: string;
  companyName: string;
  address: string;
  phone: string;
}

const escapeHtml = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const rp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0
  );

export const fmtDateID = (d?: string | null) => {
  if (!d) return '-';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const summarizeRekap = (rows: RekapPendingRow[]): RekapPendingSummary => ({
  count: rows.length,
  totalAmount: rows.reduce((s, r) => s + (r.final_amount || 0), 0),
  totalPaid: rows.reduce((s, r) => s + (r.paid || 0), 0),
  totalRemaining: rows.reduce((s, r) => s + (r.remaining || 0), 0),
});

/** Buka jendela cetak; dari dialog print user bisa pilih "Save as PDF". */
export const printRekapPendingWindow = (params: {
  rows: RekapPendingRow[];
  company: CompanyInfo;
  periodeLabel: string;
  filterLabel?: string;
}) => {
  if (typeof window === 'undefined') return;
  const { rows, company, periodeLabel, filterLabel } = params;
  const sum = summarizeRekap(rows);

  const now = new Date();
  const printedAt = `${now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })} ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;

  const bodyRows = rows.map((r, i) => `
    <tr>
      <td class="center">${i + 1}</td>
      <td>${fmtDateID(r.order_date)}</td>
      <td>${escapeHtml(r.invoice_number || '-')}</td>
      <td>${escapeHtml(r.customer_name || '-')}${r.customer_phone ? `<div class="muted small">${escapeHtml(r.customer_phone)}</div>` : ''}</td>
      <td>${escapeHtml(r.kasir_name || '-')}</td>
      <td class="right">${rp(r.final_amount)}</td>
      <td class="right">${rp(r.paid)}</td>
      <td class="right">${rp(r.remaining)}</td>
      <td class="center">${r.durasi_tunggu} hr</td>
      <td>${escapeHtml(r.catatan || '-')}${r.tempo_date ? `<div class="muted small">Tempo: ${fmtDateID(r.tempo_date)}</div>` : ''}</td>
    </tr>`).join('');

  const w = window.open('', '_blank', 'width=1000,height=750');
  if (!w) return;

  w.document.open();
  w.document.write(`
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Rekap Penjualan Tertunda</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; margin: 0; }
    .kop { display: flex; align-items: center; gap: 14px; border-bottom: 3px double #000; padding-bottom: 8px; margin-bottom: 10px; }
    .kop img { height: 56px; width: auto; }
    .kop .name { font-size: 17px; font-weight: 700; letter-spacing: .5px; }
    .kop .meta { font-size: 10px; color: #333; }
    h1 { text-align: center; font-size: 15px; letter-spacing: 2px; margin: 8px 0 2px; }
    .subtitle { text-align: center; font-size: 10px; color: #555; margin-bottom: 10px; }
    .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 10px; }
    .card { border: 1px solid #000; padding: 6px 8px; }
    .card .k { font-size: 9px; text-transform: uppercase; color: #555; }
    .card .v { font-size: 13px; font-weight: 700; margin-top: 2px; }
    table.list { width: 100%; border-collapse: collapse; }
    table.list th, table.list td { border: 1px solid #000; padding: 4px 5px; vertical-align: top; }
    table.list th { background: #f0f0f0; font-size: 9.5px; text-transform: uppercase; }
    table.list tfoot td { font-weight: 700; background: #fafafa; }
    .right { text-align: right; } .center { text-align: center; }
    .muted { color: #555; } .small { font-size: 9px; }
    tr { page-break-inside: avoid; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
  </style>
</head>
<body onload="window.print();">
  <div class="kop">
    ${company.logoUrl ? `<img src="${escapeHtml(company.logoUrl)}" alt="logo" />` : ''}
    <div>
      <div class="name">${escapeHtml(company.companyName)}</div>
      <div class="meta">${escapeHtml(company.address)}</div>
      <div class="meta">${company.phone ? `Telp: ${escapeHtml(company.phone)}` : ''}</div>
    </div>
  </div>

  <h1>REKAP PENJUALAN TERTUNDA (BELUM LUNAS)</h1>
  <div class="subtitle">${escapeHtml(periodeLabel)}${filterLabel ? ` · ${escapeHtml(filterLabel)}` : ''} · Dicetak: ${escapeHtml(printedAt)}</div>

  <div class="cards">
    <div class="card"><div class="k">Jumlah transaksi</div><div class="v">${sum.count}</div></div>
    <div class="card"><div class="k">Total tagihan</div><div class="v">${rp(sum.totalAmount)}</div></div>
    <div class="card"><div class="k">Total dibayar (DP + pembayaran)</div><div class="v">${rp(sum.totalPaid)}</div></div>
    <div class="card"><div class="k">Total kekurangan (piutang)</div><div class="v">${rp(sum.totalRemaining)}</div></div>
  </div>

  <table class="list">
    <thead>
      <tr>
        <th style="width:26px">No</th>
        <th style="width:72px">Tanggal</th>
        <th style="width:88px">Faktur</th>
        <th>Pelanggan</th>
        <th style="width:80px">Kasir</th>
        <th style="width:85px">Tagihan</th>
        <th style="width:85px">Dibayar</th>
        <th style="width:85px">Kekurangan</th>
        <th style="width:48px">Durasi</th>
        <th style="width:170px">Keterangan</th>
      </tr>
    </thead>
    <tbody>${bodyRows}</tbody>
    <tfoot>
      <tr>
        <td colspan="5" class="right">TOTAL</td>
        <td class="right">${rp(sum.totalAmount)}</td>
        <td class="right">${rp(sum.totalPaid)}</td>
        <td class="right">${rp(sum.totalRemaining)}</td>
        <td colspan="2"></td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`);
  w.document.close();
};
