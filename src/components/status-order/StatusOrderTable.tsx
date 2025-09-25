import React from 'react';
import { Search, RefreshCcw, Play, Trash2, XCircle, CheckCircle2 } from 'lucide-react';

/* ===== Types ===== */
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
  order_status?: 'new' | 'proses_cetak' | 'siap_ambil' | string | null;
}

/* ===== Helpers ===== */
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

const ucfirst = (s?: string | null): string => {
  const str = (s ?? '').toString().trim();
  return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';
};

function renderNotes(raw: string | null) {
  if (!raw) return <span>-</span>;

  const match = /Payment Details:\s*({[\s\S]*})/i.exec(raw);
  let before = raw.trim();
  let details: any | null = null;

  if (match && match[1]) {
    try {
      details = JSON.parse(match[1]);
      before = before.replace(match[0], '').trim();
    } catch { /* ignore */ }
  } else {
    try {
      const maybe = JSON.parse(raw);
      if (maybe && typeof maybe === 'object') {
        details = maybe;
        before = '';
      }
    } catch { /* ignore */ }
  }

  if (!details) {
    return <span className="whitespace-pre-line break-words">{before || '-'}</span>;
  }

  const {
    dp_amount = 0,
    paid_amount = 0,
    total_paid = 0,
    final_amount = 0,
    payment_status,
    payment_method,
    tempo_active,
    tempo_date,
  } = details;

  const lines: Array<[string, string]> = [];
  if (before) lines.push(['Catatan', before]);
  if (dp_amount) lines.push(['DP', formatRupiah(dp_amount)]);
  if (paid_amount) lines.push(['Dibayar', formatRupiah(paid_amount)]);
  if (total_paid) lines.push(['Total Dibayar', formatRupiah(total_paid)]);
  if (final_amount) lines.push(['Total Tagihan', formatRupiah(final_amount)]);
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
  if (tempo_active === true) lines.push(['Tempo', `Aktif (${formatDateID(tempo_date)})`]);
  else if (tempo_active === false) lines.push(['Tempo', 'Non-aktif']);

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

const renderOrderStatus = (status?: string | null) => {
  let label = '-';
  let cls = 'bg-gray-100 text-gray-700';
  switch (status) {
    case 'new':
      label = 'Siap Cetak';
      cls = 'bg-yellow-100 text-yellow-800';
      break;
    case 'proses_cetak':
      label = 'Proses Cetak';
      cls = 'bg-blue-100 text-blue-800';
      break;
    case 'siap_ambil':
      label = 'Siap Ambil';
      cls = 'bg-green-100 text-green-800';
      break;
  }
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{label}</span>;
};

/** === Sama seperti HistoryPendingSalesTable === */
const renderPetugas = (item: PendingOrderItem) => {
  const designerDisplay =
    item.designer_names && item.designer_names.length > 0
      ? item.designer_names.map(ucfirst).join(', ')
      : (ucfirst(item.designer_name) || '-');

  // urutan sama: Designer, Kasir, Operator, Finishing
  const row: Array<[string, string]> = [
    ['Designer', designerDisplay || '-'],
    ['Kasir', ucfirst(item.kasir_name) || '-'],
    ['Operator', ucfirst(item.operator_name) || '-'],
    ['Finishing', ucfirst(item.finishing_name) || '-'],
  ];

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

/* ===== Props ===== */
interface StatusOrderTableProps {
  data: PendingOrderItem[];
  loading?: boolean;
  error?: string | null;

  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;

  durationFilter: string;
  onDurationFilterChange: (value: string) => void; // terima string

  onRefresh: () => void;
  onContinue: (orderId: string) => void;
  onDelete: (orderId: string) => void;
  onRekap: () => void;

  /* bulk */
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (checked: boolean) => void;
  onBulkProcess: () => void;     // set order_status = 'proses_cetak'
  onBulkCancel: () => void;      // set order_status = 'new'
}

/* ===== Komponen ===== */
const StatusOrderTable: React.FC<StatusOrderTableProps> = ({
  data,
  loading = false,
  error,
  searchTerm,
  onSearchChange,
  durationFilter,
  onDurationFilterChange,
  onRefresh,
  onContinue,
  onDelete,
  onRekap,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onBulkProcess,
  onBulkCancel,
}) => {
  // ⛔️ PENTING: variabel harus di luar JSX
  const allVisibleChecked = data.length > 0 && data.every(d => selectedIds.includes(d.id));
  const anyChecked = selectedIds.length > 0;

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-md bg-red-50 text-red-700 border border-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-white rounded-lg shadow-sm p-6 flex flex-col md:flex-row gap-4 items-center">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <label htmlFor="durationFilter" className="text-sm font-medium text-gray-700">
            Durasi Tunggu:
          </label>
          <select
            id="durationFilter"
            value={durationFilter}
            onChange={(e) => onDurationFilterChange(e.target.value)}
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

      {/* Bulk action bar */}
      <div className="bg-white rounded-lg shadow-sm p-4 flex flex-col md:flex-row md:items-center gap-3 justify-between">
        <div className="text-sm text-gray-700">
          Dipilih: <span className="font-semibold">{selectedIds.length}</span> order
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBulkProcess}
            disabled={!anyChecked}
            className="flex items-center px-3 py-2 rounded-md bg-blue-600 text-white disabled:opacity-60"
            title="Set ke PROSES CETAK"
          >
            <CheckCircle2 className="h-5 w-5 mr-2" /> PROSES CETAK
          </button>
          <button
            type="button"
            onClick={onBulkCancel}
            disabled={!anyChecked}
            className="flex items-center px-3 py-2 rounded-md bg-red-600 text-white disabled:opacity-60"
            title="Batalkan proses cetak (kembali NEW)"
          >
            <XCircle className="h-5 w-5 mr-2" /> BATALKAN PROSES CETAK
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
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allVisibleChecked}
                    onChange={(e) => onToggleSelectAll(e.target.checked)}
                  />
                </th>
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
                  'Order Status',
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
                    colSpan={12}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center"
                  >
                    Tidak ada data Status Order (ready).
                  </td>
                </tr>
              ) : (
                data.map((item, index) => {
                  // ⛔️ kalau butuh deklarasi, gunakan blok { ... return (...) }
                  const checked = selectedIds.includes(item.id);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => onToggleSelect(item.id)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.invoice_number || item.id}
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
                        {formatRupiah(item.total_amount)}
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
                        {renderOrderStatus(item.order_status)}
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
                            title="Lanjutkan (Proses Cetak)"
                          >
                            <Play className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(item.id)}
                            className="hidden text-red-600 hover:text-red-900"
                            title="Hapus Transaksi"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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
          className="hidden px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Rekap
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBulkProcess}
            disabled={!anyChecked}
            className="flex items-center px-3 py-2 rounded-md bg-blue-600 text-white disabled:opacity-60"
          >
            <CheckCircle2 className="h-5 w-5 mr-2" /> Proses Cetak
          </button>
          <button
            type="button"
            onClick={onBulkCancel}
            disabled={!anyChecked}
            className="flex items-center px-3 py-2 rounded-md bg-red-600 text-white disabled:opacity-60"
          >
            <XCircle className="h-5 w-5 mr-2" /> Batalkan Proses Cetak
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusOrderTable;
