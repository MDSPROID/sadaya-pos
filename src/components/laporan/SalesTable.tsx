import React, { useEffect, useMemo, useState } from 'react';
import { Search, Printer, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import { SalesItem, PendingOrderItem } from '../../types/orderTypes';
import { formatCurrency } from '../../utils/formatters';
import { supabase } from '../../integrations/supabase/client';

// Ambil dp_amount dari kolom notes (string "Payment Details: {...}" atau object)
const getDpFromNotes = (notes: any): number => {
  try {
    if (!notes) return 0;

    if (typeof notes === 'object' && notes !== null) {
      if (typeof notes.dp_amount === 'number') return notes.dp_amount || 0;
      if (typeof (notes as any).PaymentDetails?.dp_amount === 'number')
        return (notes as any).PaymentDetails.dp_amount || 0;
    }

    const str = String(notes).trim();
    const prefix = 'Payment Details:';
    const jsonPart = str.startsWith(prefix) ? str.slice(prefix.length).trim() : str;

    const parsed = JSON.parse(jsonPart);
    if (typeof parsed?.dp_amount === 'number') return parsed.dp_amount || 0;
    if (typeof parsed?.PaymentDetails?.dp_amount === 'number') return parsed.PaymentDetails.dp_amount || 0;

    return 0;
  } catch {
    return 0;
  }
};

// join "first_name + last_name" (fallback untuk kasir dari item.profiles)
const nameFromProfile = (p: any) => {
  if (!p) return '';
  const fn = String(p.first_name ?? '').trim();
  const ln = String(p.last_name ?? '').trim();
  return [fn, ln].filter(Boolean).join(' ').trim();
};

type CombinedSalesItem = SalesItem | PendingOrderItem;

interface KasirOption { id: string; name: string; }
interface CustomerOption { id: string; name: string; }
interface OptionItem { id: string; name: string; }

interface SalesTableProps {
  data: CombinedSalesItem[];
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  totalSalesAmount: number;
  onPrint: () => void;
  onRowClick: (item: CombinedSalesItem) => void;
  selectedItemId: string | null;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string) => void;
  paymentStatusFilter: string;
  onPaymentStatusFilterChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  selectedPaymentMethod: string;
  onPaymentMethodChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  kasirOptions: KasirOption[];
  selectedKasirId: string;
  onKasirChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  customerOptions: CustomerOption[];
  selectedCustomerId: string;
  onCustomerChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  designerOptions: OptionItem[];
  selectedDesignerId: string;
  onDesignerChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  operatorOptions: OptionItem[];
  selectedOperatorId: string;
  onOperatorChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  finishingOptions: OptionItem[];
  selectedFinishingId: string;
  onFinishingChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  isRefreshing?: boolean;
}

const SalesTable: React.FC<SalesTableProps> = ({
  data,
  searchTerm,
  onSearchChange,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  totalSalesAmount,
  onPrint,
  onRowClick,
  selectedItemId,
  sortColumn,
  sortDirection,
  onSort,
  paymentStatusFilter,
  onPaymentStatusFilterChange,
  selectedPaymentMethod,
  onPaymentMethodChange,
  kasirOptions,
  selectedKasirId,
  onKasirChange,
  customerOptions,
  selectedCustomerId,
  onCustomerChange,
  designerOptions,
  selectedDesignerId,
  onDesignerChange,
  operatorOptions,
  selectedOperatorId,
  onOperatorChange,
  finishingOptions,
  selectedFinishingId,
  onFinishingChange,
  isRefreshing = false,
}) => {
  const renderSortIcon = (column: string) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />;
    }
    return null;
  };

  // Helper format method
  const formatPaymentMethod = (method: string | null | undefined) => {
    if (!method) return 'N/A';
    return method.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // ===== Peta id → nama dari options (asumsi dari profiles / master)
  const kasirMap     = useMemo(() => new Map<string, string>(kasirOptions.map(o => [String(o.id), o.name])), [kasirOptions]);
  const designerMap  = useMemo(() => new Map<string, string>(designerOptions.map(o => [String(o.id), o.name])), [designerOptions]);
  const operatorMap  = useMemo(() => new Map<string, string>(operatorOptions.map(o => [String(o.id), o.name])), [operatorOptions]);
  const finishingMap = useMemo(() => new Map<string, string>(finishingOptions.map(o => [String(o.id), o.name])), [finishingOptions]);

  const resolveByMap = (map: Map<string, string>, id?: string | null) => {
    if (!id) return '';
    const key = String(id);
    const val = map.get(key);
    return (val && val.trim()) ? val : '';
  };

  // ===== CACHE NAMA PROFILE (lookup ke tabel profiles sekali per perubahan data)
  type ProfileName = { first_name: string | null; last_name: string | null };
  const [profileCache, setProfileCache] = useState<Record<string, ProfileName>>({});

  useEffect(() => {
    // Kumpulkan id unik yang perlu di-lookup ke profiles
    const ids = new Set<string>();
    data.forEach((item: any) => {
      ['kasir_id', 'designer_id', 'operator_id'].forEach((key) => {
        const val = item?.[key];
        if (val) {
          const s = String(val);
          if (!profileCache[s]) ids.add(s);
        }
      });
      // Jika ada id di level item order_items (opsional):
      const items = Array.isArray((item as any)?.order_items) ? (item as any).order_items : [];
      items.forEach((it: any) => {
        ['designer_id', 'operator_id'].forEach((key) => {
          const val = it?.[key];
          if (val) {
            const s = String(val);
            if (!profileCache[s]) ids.add(s);
          }
        });
      });
    });

    const idsToFetch = Array.from(ids);
    if (idsToFetch.length === 0) return;

    (async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', idsToFetch);

      if (error) {
        console.error('profiles lookup error:', error);
        return;
      }
      const next = { ...profileCache };
      (profiles || []).forEach((p: any) => {
        next[String(p.id)] = { first_name: p.first_name ?? null, last_name: p.last_name ?? null };
      });
      setProfileCache(next);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]); // sengaja tidak masukkan profileCache agar tidak loop; guard via idsToFetch

  const getNameFromProfilesById = (id?: string | null) => {
    if (!id) return '';
    const rec = profileCache[String(id)];
    if (!rec) return '';
    const fn = String(rec.first_name ?? '').trim();
    const ln = String(rec.last_name ?? '').trim();
    return [fn, ln].filter(Boolean).join(' ').trim();
  };

  // ====== UTIL: cari finishing dari order_items.additional_options (sesuai pola di status order)
  const findFinishingFromItems = (order: any): string => {
    try {
      const labels = new Set<string>();
      const items = Array.isArray(order?.order_items) ? order.order_items : [];
      items.forEach((it: any) => {
        const opts = it?.dimensions?.additional_options;
        if (Array.isArray(opts)) {
          opts.forEach((op: any) => {
            const n = String(op?.name ?? op?.label ?? '').toLowerCase();
            const t = String(op?.type ?? op?.category ?? '').toLowerCase();
            const isFin =
              t === 'finishing' ||
              /finishing|laminasi|potong|lipat|jahit|spiral|ring|emboss|spot uv|vernish/.test(n);
            if (isFin) {
              const label = String(op?.label ?? op?.name ?? '').trim();
              if (label) labels.add(label);
            }
          });
        }
      });
      return Array.from(labels).join(', ');
    } catch {
      return '';
    }
  };

  // ===== renderPetugasCell — prioritas:
  // 1) Nama eksplisit di order (designer_name/operator_name/kasir_name)
  // 2) Nama dari tabel profiles berdasarkan *_id
  // 3) Designer: gabungkan designer_names[] jika ada
  // 4) Kasir: fallback item.profiles (join kasir)
  // 5) Finishing: finishing_name -> map -> scan additional_options
  // 6) Kosong => "-"
  const renderPetugasCell = (item: any) => {
    // Designer
    const designerJoined =
      Array.isArray(item?.designer_names) && item.designer_names.length
        ? item.designer_names.filter(Boolean).join(', ')
        : '';
    const designerName =
      String(item?.designer_name ?? '').trim() ||
      getNameFromProfilesById(item?.designer_id) ||
      designerJoined ||
      // resolveByMap(designerMap, item?.designer_id) || // bonus: pakai map jika ada (opsional)
      '';

    // Operator
    const operatorName =
      String(item?.operator_name ?? '').trim() ||
      getNameFromProfilesById(item?.operator_id) ||
      // resolveByMap(operatorMap, item?.operator_id) ||
      '';

    // Finishing (bukan profiles)
    const finishingFromField = String(item?.finishing_name ?? '').trim();
    const finishingFromId    = resolveByMap(finishingMap, item?.finishing_id);
    const finishingFromItems = findFinishingFromItems(item);
    const finishingName =
      finishingFromField ||
      // finishingFromId ||
      finishingFromItems ||
      '';

    // Kasir
    let kasirName =
      String(item?.kasir_name ?? '').trim() ||
      getNameFromProfilesById(item?.kasir_id) ||
      resolveByMap(kasirMap, item?.kasir_id) ||
      '';
    if (!kasirName && item?.profiles) {
      const fromProfiles = nameFromProfile(item.profiles);
      if (fromProfiles) kasirName = fromProfiles;
    }

    const toDisplay = (v: string) => (v && v.trim() ? v : '-');

    const rows: Array<[string, string]> = [
      ['Designer',  toDisplay(designerName)],
      ['Kasir',     toDisplay(kasirName)],
      ['Operator',  toDisplay(operatorName)],
      ['Finishing', toDisplay(finishingName)],
    ];

    return (
      <div className="whitespace-pre-line break-words">
        {rows.map(([label, val]) => (
          <div key={label}>
            <span className="text-gray-500">{label}: </span>
            <span className="text-gray-900">{val}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* TOP CONTROLS */}
      <div className="bg-white rounded-lg shadow-sm p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Cari penjualan (faktur, pelanggan, kasir)..."
            value={searchTerm}
            onChange={onSearchChange}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="startDate" className="text-sm font-medium text-gray-700">Dari:</label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="endDate" className="text-sm font-medium text-gray-700">Sampai:</label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          />
        </div>
      </div>

      {/* FILTER BAR — ROW 1 */}
      <div className="bg-white rounded-lg shadow-sm p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="paymentStatusFilter" className="text-sm font-medium text-gray-700">Status Pembayaran:</label>
          <select
            id="paymentStatusFilter"
            value={paymentStatusFilter}
            onChange={onPaymentStatusFilterChange}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          >
            <option value="all">Semua Status</option>
            <option value="paid">Lunas</option>
            <option value="pending">Tertunda</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="paymentMethodFilter" className="text-sm font-medium text-gray-700">Metode:</label>
          <select
            id="paymentMethodFilter"
            value={selectedPaymentMethod}
            onChange={onPaymentMethodChange}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          >
            <option value="all">Semua Metode</option>
            <option value="cash">Tunai</option>
            <option value="bank_transfer">Transfer Bank</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="customerFilter" className="text-sm font-medium text-gray-700">Customer:</label>
          <select
            id="customerFilter"
            value={selectedCustomerId}
            onChange={onCustomerChange}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          >
            <option value="">Semua Customer</option>
            {customerOptions.map(customer => (
              <option key={customer.id} value={customer.id}>{customer.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* FILTER BAR — ROW 2 */}
      <div className="bg-white rounded-lg shadow-sm p-6 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
        <div className="flex items-center gap-2">
          <label htmlFor="kasirFilter" className="text-sm font-medium text-gray-700">Kasir:</label>
          <select
            id="kasirFilter"
            value={selectedKasirId}
            onChange={onKasirChange}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          >
            <option value="">Semua Kasir</option>
            {kasirOptions.map(kasir => (
              <option key={kasir.id} value={kasir.id}>{kasir.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="designerFilter" className="text-sm font-medium text-gray-700">Designer:</label>
          <select
            id="designerFilter"
            value={selectedDesignerId}
            onChange={onDesignerChange}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          >
            <option value="">Semua Designer</option>
            {designerOptions.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="operatorFilter" className="text-sm font-medium text-gray-700">Operator:</label>
          <select
            id="operatorFilter"
            value={selectedOperatorId}
            onChange={onOperatorChange}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          >
            <option value="">Semua Operator</option>
            {operatorOptions.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="finishingFilter" className="text-sm font-medium text-gray-700">Finishing:</label>
          <select
            id="finishingFilter"
            value={selectedFinishingId}
            onChange={onFinishingChange}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          >
            <option value="">Semua Finishing</option>
            {finishingOptions.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.name}</option>
            ))}
          </select>
        </div>

        <div className="md:justify-self-end">
          <button
            onClick={onPrint}
            className="w-full md:w-auto flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Printer className="h-5 w-5 mr-2" />
            Cetak
          </button>
        </div>

        {isRefreshing && (
          <div className="col-span-1 md:col-span-5 flex justify-center pt-1">
            <span className="inline-flex items-center text-xs text-gray-500" aria-live="polite" aria-busy="true">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Memperbarui data…
            </span>
          </div>
        )}
      </div>

      {/* TOTAL */}
      <div className="bg-white rounded-lg shadow-sm p-6 text-right">
        <h2 className="text-xl font-bold text-gray-900">
          Total Penjualan: {formatCurrency(totalSalesAmount)}
        </h2>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No.</th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => onSort('order_date')}
                >
                  <div className="flex items-center">Tanggal {renderSortIcon('order_date')}</div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => onSort('invoice_number')}
                >
                  <div className="flex items-center">Faktur {renderSortIcon('invoice_number')}</div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => onSort('customer')}
                >
                  <div className="flex items-center">Pelanggan {renderSortIcon('customer')}</div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => onSort('cashier')}
                >
                  <div className="flex items-center">Petugas {renderSortIcon('cashier')}</div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => onSort('final_amount')}
                >
                  <div className="flex items-center">Jumlah Total {renderSortIcon('final_amount')}</div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => onSort('payment_status')}
                >
                  <div className="flex items-center">Status Pembayaran {renderSortIcon('payment_status')}</div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Metode Pembayaran
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    Tidak ada data penjualan.
                  </td>
                </tr>
              ) : (
                data
                  .filter(
                    (it) =>
                      it.payment_status === 'paid' ||
                      (it.payment_status === 'pending' && it.payment_method !== null && it.payment_method !== '')
                  )
                  .map((item, index) => (
                    <tr
                      key={item.id}
                      className={`cursor-pointer hover:bg-gray-50 ${selectedItemId === item.id ? 'bg-blue-50' : ''}`}
                      onClick={() => onRowClick(item)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(item.order_date).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.invoice_number || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {item.customer_display_name || (item as any).pelanggan?.[0]?.nama_pelanggan || 'Umum'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.customer_display_phone || (item as any).pelanggan?.[0]?.telepon || 'N/A'}
                        </div>
                      </td>

                      {/* PETUGAS */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {renderPetugasCell(item)}
                      </td>

                      {/* JUMLAH TOTAL + badge sisa piutang */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(() => {
                          const finalAmount = Number(item.final_amount || 0);
                          const eligible =
                            item.payment_status === 'pending' &&
                            item.payment_method !== null &&
                            item.payment_method !== '';
                          const dpAmount = eligible ? getDpFromNotes((item as any).notes) : 0;
                          const remaining = Math.max(0, finalAmount - Number(dpAmount || 0));

                          const fmt = (n: number) =>
                            n.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

                          return (
                            <div className="flex items-center gap-2">
                              <span>{fmt(finalAmount)}</span>
                              {eligible && remaining > 0 && (
                                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                  +{fmt(remaining)}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* STATUS */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            item.payment_status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : item.payment_status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {item.payment_status === 'paid' ? 'Lunas' : item.payment_status === 'pending' ? 'Tertunda' : 'Batal'}
                        </span>
                      </td>

                      {/* METODE */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatPaymentMethod((item as any).payment_method)}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesTable;
