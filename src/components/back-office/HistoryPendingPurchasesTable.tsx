import React, { useMemo } from 'react';
import { Search, RefreshCcw, CreditCard, Trash2, Eye } from 'lucide-react';

interface PendingPurchaseItem {
  id: string;
  created_at: string;
  order_date: string;          // tanggal PO
  supplier_id: string | null;
  supplier_name: string | null;
  supplier_phone: string | null;
  invoice_number?: string | null;
  total_amount?: number;       // total sebelum diskon/pajak (opsional)
  discount_amount?: number;
  tax_amount?: number;
  final_amount?: number;       // nilai tagihan
  paid_amount?: number;        // total dibayar sampai saat ini
  payment_status?: 'paid' | 'due' | string | null;
}

type PaymentStatusFilter = 'all' | 'paid' | 'due';

interface Props {
  data: PendingPurchaseItem[];
  loading?: boolean;
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;

  startDate: string;
  endDate: string;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;

  onRefresh: () => void;
  onOpenPayment: (purchaseId: string) => void;
  onDelete: (purchaseId: string) => void;
  error?: string | null;
  onViewPayments: (purchaseId: string) => void;
  showDelete?: boolean;
  paymentStatus: PaymentStatusFilter;
  onPaymentStatusChange: (v: PaymentStatusFilter) => void;
}

const formatRp = (n: any) => `Rp ${(Number(n) || 0).toLocaleString('id-ID')}`;

const isRowPaid = (item: PendingPurchaseItem) => {
  // Jika backend sudah mengisi payment_status, gunakan itu
  if (item.payment_status === 'paid') return true;
  if (item.payment_status === 'due') return false;

  // Fallback hitung dari sisa
  const tagihan = Number(item.final_amount || item.total_amount || 0);
  const terbayar = Number(item.paid_amount || 0);
  const sisa = Math.max(tagihan - terbayar, 0);
  return sisa <= 0;
};

const StatusBadge: React.FC<{ status?: string | null; sisa: number }> = ({ status, sisa }) => {
  const isPaid = (status ?? '') === 'paid' || sisa <= 0;
  const label = isPaid ? 'Lunas' : 'Belum Lunas';
  const cls = isPaid
    ? 'bg-green-100 text-green-800 border-green-200'
    : 'bg-yellow-100 text-yellow-800 border-yellow-200';
  return <span className={`px-2 py-1 text-xs rounded border ${cls}`}>{label}</span>;
};

const HistoryPendingPurchasesTable: React.FC<Props> = ({
  data,
  loading = false,
  searchTerm,
  onSearchChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onRefresh,
  onOpenPayment,
  onDelete,
  onViewPayments,
  error,
  showDelete = false,
  paymentStatus,
  onPaymentStatusChange,
}) => {

  // const filteredData = useMemo(() => {
  //   if (paymentStatus === 'all') return data;
  //   const wantPaid = paymentStatus === 'paid';
  //   return data.filter((item) => isRowPaid(item) === wantPaid);
  // }, [data, paymentStatus]);

  const filteredData = data;

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-md bg-red-50 text-red-700 border border-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Filter */}
      <div className="bg-white rounded-lg shadow-sm p-6 flex flex-col md:flex-row gap-4 items-center">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <label className="text-sm font-medium text-gray-700">Tanggal:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <span className="text-gray-500">s/d</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <label className="text-sm font-medium text-gray-700">Status:</label>
          <select
            value={paymentStatus}
            onChange={(e) => onPaymentStatusChange(e.target.value as PaymentStatusFilter)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Semua</option>
            <option value="paid">Lunas</option>
            <option value="due">Belum Lunas</option>
          </select>
        </div>

        <div className="relative flex-1 w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Cari faktur, supplier, HP..."
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
              ${loading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
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
                {['No.', 'Faktur', 'Supplier', 'HP', 'Tagihan', 'Terbayar', 'Sisa', 'Status', 'Tanggal', 'Aksi'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {paymentStatus === 'all'
                      ? 'Tidak ada data pembelian tertunda.'
                      : `Tidak ada data untuk status "${paymentStatus === 'paid' ? 'Paid (Lunas)' : 'Due (Belum Lunas)'}".`}
                  </td>
                </tr>
              ) : (
                filteredData.map((item, idx) => {
                  const tagihan = Number(item.final_amount || item.total_amount || 0);
                  const terbayar = Number(item.paid_amount || 0);
                  const sisa = Math.max(tagihan - terbayar, 0);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => onOpenPayment(item.id)}  // klik baris buka modal
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{idx + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.invoice_number || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.supplier_name || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.supplier_phone || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatRp(tagihan)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatRp(terbayar)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatRp(sisa)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <StatusBadge status={item.payment_status} sisa={sisa} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(item.order_date).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onOpenPayment(item.id); }}
                            className="text-green-600 hover:text-green-900 flex items-center gap-1"
                            title="Tambah Pembayaran"
                          >
                            <CreditCard className="h-5 w-5" />
                            Bayar
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onViewPayments(item.id); }}
                            className="text-gray-700 hover:text-gray-900 flex items-center gap-1"
                            title="Lihat Riwayat Pembayaran"
                          >
                            <Eye className="h-5 w-5" />
                            Lihat
                          </button>
                          {/* + Hanya tampil jika super admin */}
                          {showDelete && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                              className="text-red-600 hover:text-red-900 flex items-center gap-1"
                              title="Hapus"
                            >
                              <Trash2 className="h-5 w-5" />
                              Hapus
                            </button>
                          )}
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
    </div>
  );
};

export default HistoryPendingPurchasesTable;
