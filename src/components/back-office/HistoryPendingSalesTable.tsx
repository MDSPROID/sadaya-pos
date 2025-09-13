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
}) => {
  return (
    <div className="space-y-6">
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
                      {(item.invoice_number || item.id)?.toString().substring(0, 10)}…
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {item.customer_display_name ||
                          item.pelanggan?.[0]?.nama_pelanggan ||
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
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {item.notes || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.profiles?.first_name ||
                        item.profiles?.last_name ||
                        'N/A'}
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
