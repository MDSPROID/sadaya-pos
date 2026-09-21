import React, { useMemo, useState } from 'react';
import { X, FileDown, Printer } from 'lucide-react';
import { showError } from '../../utils/toast';
import { fetchCompanyInfo } from '../../utils/printTandaTerima';
import { downloadXlsx } from '../../utils/exportXlsx';
import {
  RekapPendingRow,
  fmtDateID,
  printRekapPendingWindow,
  summarizeRekap,
} from '../../utils/printRekapPending';

interface RekapPendingModalProps {
  rows: RekapPendingRow[];
  periodeLabel: string;
  filterLabel?: string;
  onClose: () => void;
}

const rp = (n: number) => `Rp ${Math.round(Number(n) || 0).toLocaleString('id-ID')}`;

const RekapPendingModal: React.FC<RekapPendingModalProps> = ({ rows, periodeLabel, filterLabel, onClose }) => {
  const [busy, setBusy] = useState<'pdf' | 'xlsx' | null>(null);
  const sum = useMemo(() => summarizeRekap(rows), [rows]);

  const stamp = () => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
  };

  const handlePdf = async () => {
    setBusy('pdf');
    try {
      const company = await fetchCompanyInfo();
      printRekapPendingWindow({ rows, company, periodeLabel, filterLabel });
    } catch (e: any) {
      showError(e?.message || 'Gagal menyiapkan PDF.');
    } finally {
      setBusy(null);
    }
  };

  const handleXlsx = async () => {
    setBusy('xlsx');
    try {
      await downloadXlsx(`rekap-penjualan-tertunda-${stamp()}.xlsx`, {
        name: 'Rekap Pending',
        preface: [
          ['REKAP PENJUALAN TERTUNDA (BELUM LUNAS)'],
          [periodeLabel + (filterLabel ? ` · ${filterLabel}` : '')],
          [],
          ['Jumlah transaksi', sum.count],
          ['Total tagihan', sum.totalAmount],
          ['Total dibayar (DP + pembayaran)', sum.totalPaid],
          ['Total kekurangan (piutang)', sum.totalRemaining],
        ],
        header: ['No', 'Tanggal', 'Faktur', 'Pelanggan', 'HP', 'Kasir', 'Tagihan', 'Dibayar', 'Kekurangan', 'Durasi (hari)', 'Tempo', 'Keterangan'],
        rows: rows.map((r, i) => [
          i + 1,
          fmtDateID(r.order_date),
          r.invoice_number || '',
          r.customer_name,
          r.customer_phone,
          r.kasir_name,
          r.final_amount,
          r.paid,
          r.remaining,
          r.durasi_tunggu,
          r.tempo_date ? fmtDateID(r.tempo_date) : '',
          r.catatan,
        ]),
        colWidths: [5, 13, 14, 26, 16, 16, 14, 14, 14, 12, 13, 40],
      });
    } catch (e: any) {
      showError(e?.message || 'Gagal membuat file Excel.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between p-5 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Rekap Penjualan Tertunda</h2>
            <p className="text-sm text-gray-600">{periodeLabel}{filterLabel ? ` · ${filterLabel}` : ''}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Tutup">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border p-3">
            <div className="text-xs uppercase text-gray-500">Jumlah transaksi</div>
            <div className="text-xl font-bold text-gray-900">{sum.count}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs uppercase text-gray-500">Total tagihan</div>
            <div className="text-xl font-bold text-gray-900">{rp(sum.totalAmount)}</div>
          </div>
          <div className="rounded-lg border p-3 bg-green-50">
            <div className="text-xs uppercase text-gray-500">Total dibayar</div>
            <div className="text-xl font-bold text-green-700">{rp(sum.totalPaid)}</div>
          </div>
          <div className="rounded-lg border p-3 bg-amber-50">
            <div className="text-xs uppercase text-gray-500">Total kekurangan (piutang)</div>
            <div className="text-xl font-bold text-amber-700">{rp(sum.totalRemaining)}</div>
          </div>
        </div>

        <div className="px-5 pb-3 overflow-auto flex-1">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {['No', 'Tanggal', 'Faktur', 'Pelanggan', 'Kasir', 'Tagihan', 'Dibayar', 'Kekurangan', 'Durasi', 'Keterangan'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr><td colSpan={10} className="px-3 py-6 text-center text-gray-500">Tidak ada data untuk direkap.</td></tr>
              ) : rows.map((r, i) => (
                <tr key={`${r.invoice_number}-${i}`}>
                  <td className="px-3 py-2">{i + 1}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtDateID(r.order_date)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.invoice_number || '-'}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900">{r.customer_name || '-'}</div>
                    {r.customer_phone && <div className="text-xs text-gray-500">{r.customer_phone}</div>}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.kasir_name || '-'}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">{rp(r.final_amount)}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">{rp(r.paid)}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap font-medium">{rp(r.remaining)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.durasi_tunggu} hr</td>
                  <td className="px-3 py-2 max-w-xs">
                    {r.catatan || '-'}
                    {r.tempo_date && <div className="text-xs text-gray-500">Tempo: {fmtDateID(r.tempo_date)}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap justify-end gap-3 p-5 border-t">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            Tutup
          </button>
          <button
            type="button"
            onClick={handleXlsx}
            disabled={busy !== null || rows.length === 0}
            className="flex items-center px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <FileDown className="h-4 w-4 mr-2" />
            {busy === 'xlsx' ? 'Menyiapkan…' : 'Export Excel'}
          </button>
          <button
            type="button"
            onClick={handlePdf}
            disabled={busy !== null || rows.length === 0}
            className="flex items-center px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            title="Membuka dialog cetak — pilih 'Save as PDF' untuk menyimpan sebagai PDF"
          >
            <Printer className="h-4 w-4 mr-2" />
            {busy === 'pdf' ? 'Menyiapkan…' : 'Export PDF'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RekapPendingModal;
