import React from 'react';
import { Search, RefreshCcw, Play, Trash2 } from 'lucide-react';

interface PendingOrderItem {
  id: string;
  created_at: string;
  order_date: string;
  customer_id: string | null;
  customer_display_name: string | null;
  customer_display_phone: string | null;
  pelanggan: Array<{ nama_pelanggan: string; telepon: string | null }> | null;
  kasir_id: string | null;
  operator_id?: string | null;
  designer_id?: string | null;
  finishing_id?: string | null;
  kasir_name?: string | null;
  operator_name?: string | null;
  designer_name?: string | null;
  designer_names?: string[] | null;
  finishing_name?: string | null;
  profiles: { first_name: string | null; last_name: string | null } | null;
  total_amount: number;
  notes: string | null;
  pickup_date: string | null;
  priority: string;
  durasi_tunggu: number;
  invoice_number?: string | null;
  discount_amount?: number;
  tax_amount?: number;
  final_amount?: number;
}

interface HistoryPendingSalesTableProps {
  data: PendingOrderItem[];
  loading?: boolean;
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  durationFilter: string;
  onDurationFilterChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onRefresh: () => void;
  onContinue: (orderId: string) => void;
  onDelete: (orderId: string) => void;
  onRekap: () => void;
  error?: string | null;
}

/* ====== Helpers untuk memformat notes Payment Details ====== */
const formatRupiah = (n: any) => {
  const num = Number(n) || 0;
  return `Rp ${num.toLocaleString('id-ID')}`;
};

const formatDateID = (iso?: string | null) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

const ucfirst = (s: string | null | undefined) => (s && s.length) ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';

function renderNotes(raw: string | null) {
  if (!raw) return <span>-</span>;

  // Cari pola "Payment Details: { ...json... }"
  const match = /Payment Details:\s*({[\s\S]*})/i.exec(raw);
  let before = raw.trim();
  let details: any | null = null;

  if (match && match[1]) {
    try {
      details = JSON.parse(match[1]);
      // buang bagian "Payment Details: {...}" dari catatan asli agar tidak dobel
      before = before.replace(match[0], '').trim();
    } catch {
      // gagal parse → tampilkan apa adanya
    }
  } else {
    // fallback: kalau catatan murni JSON
    try {
      const maybe = JSON.parse(raw);
      if (maybe && typeof maybe === 'object') {
        details = maybe;
        before = '';
      }
    } catch {
      // bukan JSON; tampilkan apa adanya
    }
  }

  if (!details) {
    return <span className="whitespace-pre-line break-words">{before || '-'}</span>;
  }

  const {
    dp_amount = 0,
    paid_amount = 0,
    // total_paid = 0,     // ⟵ tidak dipakai lagi untuk tampilan
    final_amount = 0,
    payment_status,
    payment_method,
    tempo_active,
    tempo_date,
  } = details;

  const dpNum = Number(dp_amount || 0);
  const paidNum = Number(paid_amount || 0);
  const finalNum = Number(final_amount || 0);

  // Kekurangan = Total Tagihan - DP (sesuai permintaan)
  const kekurangan = Math.max(finalNum - dpNum, 0);

  // Susun baris-baris rapi
  const lines: Array<[string, string]> = [];

  if (before) lines.push(['Catatan', before]);
  if (dpNum) lines.push(['DP', formatRupiah(dpNum)]);
  if (paidNum) lines.push(['Dibayar', formatRupiah(paidNum)]);
  if (finalNum) {
    lines.push(['Total Tagihan', formatRupiah(finalNum)]);
    lines.push(['Kekurangan', formatRupiah(kekurangan)]); // ⟵ setelah Total Tagihan
  }
  if (payment_status) lines.push(['Status', ucfirst(String(payment_status))]);
  if (payment_method) {
    const metode =
      payment_method === 'cash'
        ? 'Tunai'
        : payment_method === 'bank_transfer'
        ? 'Transfer Bank'
        : String(payment_method);
    lines.push(['Metode', metode]);
  }

  if (tempo_active === true) {
    lines.push(['Tempo', `Aktif (${formatDateID(tempo_date)})`]);
  } else if (tempo_active === false) {
    lines.push(['Tempo', 'Non-aktif']);
  }

  if (lines.length === 0) return <span>-</span>;

  return (
    <div className="whitespace-pre-line break-words">
      {lines.map(([k, v]) => (
        <div key={k}>
          <span className="text-gray-500">{k}: </span>
          <span className="text-gray-900">{v}</span>
        </div>
      ))}
    </div>
  );
}

const HistoryPendingSalesTable: React.FC<HistoryPendingSalesTableProps> = ({
  data,
  loading = false,
  searchTerm,
  onSearchChange,
  durationFilter,
  onDurationFilterChange,
  onRefresh,
  onContinue,
  onDelete,
  onRekap,
  error,
}) => {

  const renderPetugas = (item: PendingOrderItem) => {
     const designerDisplay =
      (item.designer_names && item.designer_names.length > 0)
        ? item.designer_names.join(', ')
        : (item.designer_name && item.designer_name.trim() ? item.designer_name : '-');

    const row = [
      ['Kasir', item.kasir_name],
      ['Operator', item.operator_name],
      ['Designer', designerDisplay],
      ['Finishing', item.finishing_name],
    ] as Array<[string, string | null | undefined]>;

    return (
      <div className="whitespace-pre-line break-words">
        {row.map(([label, val]) => (
          <div key={label}>
            <span className="text-gray-500">{label}: </span>
            <span className="text-gray-900">{val && val.trim() ? val : '-'}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-md bg-red-50 text-red-700 border border-red-200 text-sm">
          {error}
        </div>
      )}
      {/* Filter Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 flex flex-col md:flex-row gap-4 items-center">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <label htmlFor="durationFilter" className="text-sm font-medium text-gray-700">
            Durasi Tunggu:
          </label>
          <select
            id="durationFilter"
            value={durationFilter}
            onChange={onDurationFilterChange}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Semua Durasi</option>
            <option value="1-7">1-7 Hari</option>
            <option value="8-14">8-14 Hari</option>
            <option value=">14">&gt;14 Hari</option>
          </select>
        </div>

        <div className="relative flex-1 w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Cari faktur, nama pemesan, HP..."
            value={searchTerm}
            onChange={onSearchChange}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors w-full md:w-auto justify-center
              ${loading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}
            `}
            title="Muat Ulang"
          >
            <RefreshCcw className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Memuat…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="relative overflow-x-auto">
          {loading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
              <div className="text-gray-700 text-sm">Memuat data…</div>
            </div>
          )}
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {[
                  'No.',
                  'Faktur',
                  'Nama Pemesan',
                  'HP',
                  'Jumlah',
                  'Keterangan',
                  'Petugas',
                  'PC',
                  'Tanggal',
                  'Durasi Tunggu',
                  'Aksi',
                ].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center"
                  >
                    Tidak ada data penjualan tertunda.
                  </td>
                </tr>
              ) : (
                data.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {/* {(item.invoice_number || item.id)?.toString().substring(0, 10)}… */}
                      {item.invoice_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {ucfirst(item.customer_display_name) ||
                          ucfirst(item.pelanggan?.[0]?.nama_pelanggan) ||
                          'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.customer_display_phone ||
                        item.pelanggan?.[0]?.telepon ||
                        '0'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Rp {item.total_amount.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                      {renderNotes(item.notes)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {renderPetugas(item)}
                    </td> 
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Server
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(item.order_date).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.durasi_tunggu} Hari
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => onContinue(item.id)}
                          className="text-green-600 hover:text-green-900"
                          title="Lanjutkan Transaksi"
                        >
                          <Play className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(item.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Hapus Transaksi"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 mt-6">
        <button
          type="button"
          onClick={onRekap}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Rekap
        </button>
      </div>
    </div>
  );
};

export default HistoryPendingSalesTable;
