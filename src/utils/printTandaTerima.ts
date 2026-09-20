import { supabase } from '../integrations/supabase/client';

export interface TandaTerimaRow {
  invoice_number: string | null;
  order_date: string;
  pickup_date?: string | null;
  customer_name: string;
  customer_phone: string;
  items: Array<{ product_name: string; quantity: number; dimensions?: any }>;
  final_amount: number;
  paid: number;
  remaining: number;
  payment_status: string;
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

const fmtDate = (d?: string | null) => {
  if (!d) return '-';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? escapeHtml(d) : dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
};

const dimsText = (dims: any): string => {
  if (!dims) return '';
  const p = dims.panjang ?? '';
  const l = dims.lebar ?? '';
  const satuan = dims.satuan ?? '';
  let base = p && l ? `${p}x${l}` : (p || l || '');
  if (satuan) base = base ? `${base} ${satuan}` : String(satuan);
  const extra = Array.isArray(dims.additional_options) && dims.additional_options.length
    ? dims.additional_options.map((o: any) => `${o?.name ?? ''}${o?.quantity ? ` (${o.quantity})` : ''}`).join(', ')
    : '';
  return [base, dims.tebal_bahan_nama ? `(${dims.tebal_bahan_nama})` : '', extra].filter(Boolean).join(' ');
};

/** Kop surat diambil dari Pengaturan Aplikasi (tabel app_settings). */
export const fetchCompanyInfo = async (): Promise<CompanyInfo> => {
  const { data } = await supabase
    .from('app_settings')
    .select('nama_perusahaan, alamat, kota_kabupaten, provinsi, telepon, logo_url')
    .limit(1)
    .maybeSingle();

  const address = [data?.alamat, data?.kota_kabupaten, data?.provinsi].filter(Boolean).join(', ');
  return {
    logoUrl: data?.logo_url || '',
    companyName: data?.nama_perusahaan || '',
    address,
    phone: data?.telepon || '',
  };
};

export const printTandaTerimaWindow = (params: {
  rows: TandaTerimaRow[];
  company: CompanyInfo;
  handedOverBy?: string;
}) => {
  if (typeof window === 'undefined') return;
  const { rows, company, handedOverBy } = params;

  const now = new Date();
  const printedAt = `${now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })} ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;

  const uniqueCustomers = Array.from(new Set(rows.map(r => r.customer_name.trim()).filter(Boolean)));
  const receiverName = uniqueCustomers.length === 1 ? uniqueCustomers[0] : '';
  const receiverPhone = uniqueCustomers.length === 1 ? (rows.find(r => r.customer_phone)?.customer_phone || '') : '';

  const totalAmount = rows.reduce((s, r) => s + (r.final_amount || 0), 0);
  const totalPaid = rows.reduce((s, r) => s + (r.paid || 0), 0);
  const totalRemaining = rows.reduce((s, r) => s + (r.remaining || 0), 0);

  const bodyRows = rows.map((r, i) => {
    const itemLines = (r.items || []).map(it => {
      const dt = dimsText(it.dimensions);
      return `<div>${escapeHtml(it.product_name)} <span class="muted">x${escapeHtml(it.quantity)}</span>${dt ? `<div class="muted small">${escapeHtml(dt)}</div>` : ''}</div>`;
    }).join('');
    const status = r.payment_status === 'paid' ? 'Lunas' : r.remaining > 0 ? 'Belum Lunas' : 'Lunas';
    return `
      <tr>
        <td class="center">${i + 1}</td>
        <td>${fmtDate(r.order_date)}</td>
        <td>${escapeHtml(r.invoice_number || '-')}</td>
        <td>${escapeHtml(r.customer_name || '-')}${r.customer_phone ? `<div class="muted small">${escapeHtml(r.customer_phone)}</div>` : ''}</td>
        <td>${itemLines || '-'}</td>
        <td class="right">${rp(r.final_amount)}</td>
        <td class="right">${rp(r.paid)}</td>
        <td class="right">${rp(r.remaining)}</td>
        <td class="center">${status}</td>
      </tr>`;
  }).join('');

  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return;

  w.document.open();
  w.document.write(`
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Tanda Terima</title>
  <style>
    @page { size: A4 portrait; margin: 14mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #111; margin: 0; }
    .kop { display: flex; align-items: center; gap: 14px; border-bottom: 3px double #000; padding-bottom: 8px; margin-bottom: 12px; }
    .kop img { height: 64px; width: auto; }
    .kop .name { font-size: 18px; font-weight: 700; letter-spacing: .5px; }
    .kop .meta { font-size: 11px; color: #333; }
    h1 { text-align: center; font-size: 16px; letter-spacing: 2px; margin: 10px 0 4px; }
    .subtitle { text-align: center; font-size: 11px; color: #555; margin-bottom: 12px; }
    .info { width: 100%; margin-bottom: 10px; font-size: 12px; }
    .info td { padding: 2px 4px; vertical-align: top; }
    .info td.k { width: 120px; color: #444; }
    table.list { width: 100%; border-collapse: collapse; }
    table.list th, table.list td { border: 1px solid #000; padding: 5px 6px; vertical-align: top; }
    table.list th { background: #f0f0f0; font-size: 11px; text-transform: uppercase; }
    table.list tfoot td { font-weight: 700; background: #fafafa; }
    .right { text-align: right; } .center { text-align: center; }
    .muted { color: #555; } .small { font-size: 10px; }
    tr { page-break-inside: avoid; }
    thead { display: table-header-group; }
    .sign { width: 100%; margin-top: 28px; }
    .sign td { width: 50%; text-align: center; vertical-align: top; padding: 0 20px; }
    .sign .line { margin-top: 64px; border-top: 1px solid #000; padding-top: 4px; }
    .note { margin-top: 14px; font-size: 10px; color: #555; }
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

  <h1>TANDA TERIMA</h1>
  <div class="subtitle">Dicetak: ${escapeHtml(printedAt)}</div>

  <table class="info">
    <tr><td class="k">Diserahkan kepada</td><td>: ${escapeHtml(receiverName || '________________________')}${receiverPhone ? ` (${escapeHtml(receiverPhone)})` : ''}</td></tr>
    <tr><td class="k">Jumlah transaksi</td><td>: ${rows.length}</td></tr>
  </table>

  <table class="list">
    <thead>
      <tr>
        <th style="width:28px">No</th>
        <th style="width:90px">Tanggal</th>
        <th style="width:95px">Faktur</th>
        <th style="width:120px">Pelanggan</th>
        <th>Item</th>
        <th style="width:90px">Total</th>
        <th style="width:90px">Dibayar</th>
        <th style="width:90px">Sisa</th>
        <th style="width:70px">Status</th>
      </tr>
    </thead>
    <tbody>${bodyRows}</tbody>
    <tfoot>
      <tr>
        <td colspan="5" class="right">TOTAL</td>
        <td class="right">${rp(totalAmount)}</td>
        <td class="right">${rp(totalPaid)}</td>
        <td class="right">${rp(totalRemaining)}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>

  <div class="note">Dengan ini menyatakan bahwa pesanan di atas telah diserahkan dan diterima dalam kondisi baik.</div>

  <table class="sign">
    <tr>
      <td>Diserahkan oleh,<div class="line">${escapeHtml(handedOverBy || '')}&nbsp;</div></td>
      <td>Diterima oleh,<div class="line">${escapeHtml(receiverName)}&nbsp;</div></td>
    </tr>
  </table>
</body>
</html>`);
  w.document.close();
};
