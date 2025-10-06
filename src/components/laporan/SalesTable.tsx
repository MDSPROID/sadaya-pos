import React, { useEffect, useMemo, useState } from 'react';
import { Search, Printer, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import { SalesItem, PendingOrderItem } from '../../types/orderTypes';
import { formatCurrency } from '../../utils/formatters';
import { supabase } from '../../integrations/supabase/client';

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

  // props lama masih diterima; sekarang nilainya diisi "nama" (bukan id).
  kasirOptions: KasirOption[]; // tak dipakai untuk opsi filter, tapi tetap diterima agar kompatibel
  selectedKasirId: string;
  onKasirChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;

  customerOptions: CustomerOption[];
  selectedCustomerId: string;
  onCustomerChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;

  designerOptions: OptionItem[]; // tak dipakai untuk opsi filter
  selectedDesignerId: string;
  onDesignerChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;

  operatorOptions: OptionItem[]; // tak dipakai untuk opsi filter
  selectedOperatorId: string;
  onOperatorChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;

  finishingOptions: OptionItem[]; // tak dipakai untuk opsi filter
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

  // props lama:
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

  const formatPaymentMethod = (method: string | null | undefined) => {
    if (!method) return 'N/A';
    return method.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // =========================
  // 1) Ambil nama dari profiles (batch)
  // =========================
  type ProfileName = { first_name: string | null; last_name: string | null };
  const [profileCache, setProfileCache] = useState<Record<string, ProfileName>>({});

  useEffect(() => {
    const ids = new Set<string>();
    data.forEach((item: any) => {
      ['kasir_id', 'designer_id', 'operator_id'].forEach((key) => {
        const val = item?.[key];
        if (val) ids.add(String(val));
      });
      const items = Array.isArray((item as any)?.order_items) ? (item as any).order_items : [];
      items.forEach((it: any) => {
        ['designer_id', 'operator_id'].forEach((key) => {
          const val = it?.[key];
          if (val) ids.add(String(val));
        });
      });
    });

    const idsToFetch = Array.from(ids).filter(id => !profileCache[id]);
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
  }, [data]);

  const getNameFromProfilesById = (id?: string | null) => {
    if (!id) return '';
    const rec = profileCache[String(id)];
    if (!rec) return '';
    const fn = String(rec.first_name ?? '').trim();
    const ln = String(rec.last_name ?? '').trim();
    return [fn, ln].filter(Boolean).join(' ').trim();
  };

  // =========================
  // 2) Ekstrak "Finishing" dari additional_options (sesuai status order)
  // =========================
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

  // =========================
  // 3) Normalisasi nama Petugas yang DITAMPILKAN DI TABEL
  //    (harus match dengan tampilan kolom Petugas)
  // =========================
  const computePetugasNames = (item: any) => {
    // Designer
    const designerJoined =
      Array.isArray(item?.designer_names) && item.designer_names.length
        ? item.designer_names.filter(Boolean).join(', ')
        : '';
    const designerName =
      String(item?.designer_name ?? '').trim() ||
      getNameFromProfilesById(item?.designer_id) ||
      designerJoined ||
      '';

    // Operator
    const operatorName =
      String(item?.operator_name ?? '').trim() ||
      getNameFromProfilesById(item?.operator_id) ||
      '';

    // Finishing
    const finishingFromField = String(item?.finishing_name ?? '').trim();
    const finishingFromItems = findFinishingFromItems(item);
    const finishingName =
      finishingFromField ||
      finishingFromItems ||
      '';

    // Kasir
    let kasirName =
      String(item?.kasir_name ?? '').trim() ||
      getNameFromProfilesById(item?.kasir_id) ||
      '';
    if (!kasirName && item?.profiles) {
      const fromProfiles = nameFromProfile(item.profiles);
      if (fromProfiles) kasirName = fromProfiles;
    }

    const dashIfEmpty = (v: string) => (v && v.trim() ? v.trim() : '-');

    return {
      designer: dashIfEmpty(designerName),
      operator: dashIfEmpty(operatorName),
      finishing: dashIfEmpty(finishingName),
      kasir: dashIfEmpty(kasirName),
    };
  };

  // =========================
  // 4) Kumpulkan opsi filter dari KOLOM PETUGAS (dedup by lower-case)
  // =========================
  const { kasirOptionsFromData, designerOptionsFromData, operatorOptionsFromData, finishingOptionsFromData } =
    useMemo(() => {
      const add = (map: Map<string, string>, label: string) => {
        const trimmed = (label ?? '').trim();
        if (!trimmed) return;
        const parts = trimmed.split(',').map(s => s.trim()).filter(Boolean);
        parts.forEach(p => {
          const key = p.toLocaleLowerCase();
          if (!map.has(key)) map.set(key, p);
        });
      };

      const kasirMap = new Map<string, string>();
      const designerMap = new Map<string, string>();
      const operatorMap = new Map<string, string>();
      const finishingMap = new Map<string, string>();

      data.forEach((item) => {
        const p = computePetugasNames(item);
        add(kasirMap, p.kasir);
        add(designerMap, p.designer);
        add(operatorMap, p.operator);
        add(finishingMap, p.finishing);
      });

      const sortByLabel = (a: string, b: string) => a.localeCompare(b, 'id');

      const toArray = (m: Map<string, string>) => Array.from(m.values()).sort(sortByLabel);

      // Pastikan '-' tetap hadir bila memang ada di data
      return {
        kasirOptionsFromData: toArray(kasirMap),
        designerOptionsFromData: toArray(designerMap),
        operatorOptionsFromData: toArray(operatorMap),
        finishingOptionsFromData: toArray(finishingMap),
      };
    }, [data, profileCache]);

  // =========================
  // 5) State lokal fallback utk filter (kalau parent tidak mengontrol)
  // =========================
  const [localKasir, setLocalKasir] = useState('');
  const [localDesigner, setLocalDesigner] = useState('');
  const [localOperator, setLocalOperator] = useState('');
  const [localFinishing, setLocalFinishing] = useState('');

  const kasirValue = (selectedKasirId ?? localKasir) || '';
  const designerValue = (selectedDesignerId ?? localDesigner) || '';
  const operatorValue = (selectedOperatorId ?? localOperator) || '';
  const finishingValue = (selectedFinishingId ?? localFinishing) || '';

  const handleKasirChange =
    onKasirChange ??
    ((e: React.ChangeEvent<HTMLSelectElement>) => setLocalKasir(e.target.value));
  const handleDesignerChange =
    onDesignerChange ??
    ((e: React.ChangeEvent<HTMLSelectElement>) => setLocalDesigner(e.target.value));
  const handleOperatorChange =
    onOperatorChange ??
    ((e: React.ChangeEvent<HTMLSelectElement>) => setLocalOperator(e.target.value));
  const handleFinishingChange =
    onFinishingChange ??
    ((e: React.ChangeEvent<HTMLSelectElement>) => setLocalFinishing(e.target.value));

  // =========================
  // 6) Render cell Petugas (harus sama dengan basis filter)
  // =========================
  const renderPetugasCell = (item: any) => {
    const p = computePetugasNames(item);
    const rows: Array<[string, string]> = [
      ['Designer', p.designer],
      ['Kasir', p.kasir],
      ['Operator', p.operator],
      ['Finishing', p.finishing],
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

  // =========================
  // 7) Filter baris berdasarkan NAMA petugas yang tampil
  // =========================
  const nameHasToken = (cellValue: string, token: string) => {
    if (!token) return true;
    if (!cellValue) return false;
    const cellParts = cellValue.split(',').map(s => s.trim().toLocaleLowerCase()).filter(Boolean);
    const t = token.trim().toLocaleLowerCase();
    return cellParts.includes(t);
  };

  const filteredData = useMemo(() => {
    return data
      .filter(
        (it) =>
          it.payment_status === 'paid' ||
          (it.payment_status === 'pending' && it.payment_method !== null && it.payment_method !== '')
      )
      .filter((it) => {
        // filter existing (status + metode) tetap di parent via props
        if (paymentStatusFilter !== 'all' && it.payment_status !== paymentStatusFilter) return false;
        if (selectedPaymentMethod !== 'all' && (it.payment_method ?? '') !== selectedPaymentMethod) return false;

        // filter Petugas (berdasarkan yang tampil)
        const p = computePetugasNames(it);
        if (kasirValue && !nameHasToken(p.kasir, kasirValue)) return false;
        if (designerValue && !nameHasToken(p.designer, designerValue)) return false;
        if (operatorValue && !nameHasToken(p.operator, operatorValue)) return false;
        if (finishingValue && !nameHasToken(p.finishing, finishingValue)) return false;

        // filter pencarian teks bebas (optional)
        if (searchTerm?.trim()) {
          const q = searchTerm.trim().toLocaleLowerCase();
          const hay = [
            it.invoice_number,
            it.customer_display_name,
            it.customer_display_phone,
            p.kasir,
            p.designer,
            p.operator,
            p.finishing,
          ]
            .filter(Boolean)
            .join(' | ')
            .toLocaleLowerCase();
          if (!hay.includes(q)) return false;
        }
        // filter customer
        if (selectedCustomerId && String(selectedCustomerId).trim()) {
          const label = it.customer_display_name || (it as any).pelanggan?.[0]?.nama_pelanggan || 'Umum';
          if (String(label).trim() !== String(selectedCustomerId).trim()) return false;
        }

        return true;
      });
  }, [
    data,
    searchTerm,
    paymentStatusFilter,
    selectedPaymentMethod,
    kasirValue,
    designerValue,
    operatorValue,
    finishingValue,
    profileCache,
  ]);

  return (
    <div className="space-y-6">
      {/* TOP CONTROLS */}
      <div className="bg-white rounded-lg shadow-sm p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Cari penjualan (faktur, pelanggan, kasir/designer/operator/finishing)..."
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
              <option key={customer.id} value={customer.name}>{customer.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* FILTER BAR — ROW 2 (opsi dari KOLOM PETUGAS) */}
      <div className="bg-white rounded-lg shadow-sm p-6 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
        <div className="flex items-center gap-2">
          <label htmlFor="kasirFilter" className="text-sm font-medium text-gray-700">Kasir:</label>
          <select
            id="kasirFilter"
            value={kasirValue}
            onChange={handleKasirChange}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          >
            <option value="">Semua Kasir</option>
            {kasirOptionsFromData.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="designerFilter" className="text-sm font-medium text-gray-700">Designer:</label>
          <select
            id="designerFilter"
            value={designerValue}
            onChange={handleDesignerChange}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          >
            <option value="">Semua Designer</option>
            {designerOptionsFromData.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="operatorFilter" className="text-sm font-medium text-gray-700">Operator:</label>
          <select
            id="operatorFilter"
            value={operatorValue}
            onChange={handleOperatorChange}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          >
            <option value="">Semua Operator</option>
            {operatorOptionsFromData.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="finishingFilter" className="text-sm font-medium text-gray-700">Finishing:</label>
          <select
            id="finishingFilter"
            value={finishingValue}
            onChange={handleFinishingChange}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          >
            <option value="">Semua Finishing</option>
            {finishingOptionsFromData.map(name => (
              <option key={name} value={name}>{name}</option>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => onSort('order_date')}>
                  <div className="flex items-center">Tanggal {renderSortIcon('order_date')}</div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => onSort('invoice_number')}>
                  <div className="flex items-center">Faktur {renderSortIcon('invoice_number')}</div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => onSort('customer')}>
                  <div className="flex items-center">Pelanggan {renderSortIcon('customer')}</div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => onSort('cashier')}>
                  <div className="flex items-center">Petugas {renderSortIcon('cashier')}</div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => onSort('final_amount')}>
                  <div className="flex items-center">Jumlah Total {renderSortIcon('final_amount')}</div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => onSort('payment_status')}>
                  <div className="flex items-center">Status Pembayaran {renderSortIcon('payment_status')}</div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metode Pembayaran</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">Tidak ada data penjualan.</td>
                </tr>
              ) : (
                filteredData.map((item, index) => (
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
