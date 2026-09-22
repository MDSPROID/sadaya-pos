import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Printer, ArrowUp, ArrowDown, Loader2, FileDown } from 'lucide-react';
import { SalesItem, PendingOrderItem } from '../../types/orderTypes';
import { formatCurrency } from '../../utils/formatters';
import { IdName, customerLabelOf, petugasOf } from '../../utils/salesReportFilters';
import SearchableSelect from './SearchableSelect';
import { downloadXlsx } from '../../utils/exportXlsx';
import { showError } from '../../utils/toast';

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

type CombinedSalesItem = SalesItem | PendingOrderItem;

interface SalesTableProps {
  /** Baris halaman aktif (sudah difilter & dipaginasi oleh halaman induk). */
  data: CombinedSalesItem[];
  /** Seluruh data hasil filter (tanpa pagination) — dipakai khusus untuk cetak. */
  printData?: CombinedSalesItem[];
  /** Peta id profil -> nama, untuk kolom Petugas. */
  nameById: Record<string, string>;
  /** Opsi dropdown (sudah dihitung halaman induk dari data yang tampil, tanpa duplikat). */
  customerOptions: IdName[];
  kasirOptions: IdName[];
  designerOptions: IdName[];
  operatorOptions: IdName[];
  finishingOptions: IdName[];
  /** Offset penomoran baris di layar agar lanjut antar halaman, mis. (currentPage-1)*pageSize. */
  numberOffset?: number;
  /** Tombol aksi (mis. cetak tanda terima / hapus) yang ditampilkan tepat di atas tabel. */
  toolbar?: React.ReactNode;
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

  selectedCustomerId: string; // value = customer_id
  onCustomerChange: (customerId: string) => void;

  selectedKasirId: string;
  onKasirChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  selectedDesignerId: string;
  onDesignerChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  selectedOperatorId: string;
  onOperatorChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  selectedFinishingId: string;
  onFinishingChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;

  isRefreshing?: boolean;

  /* === tambahan untuk checkbox selection (opsional agar backward compatible) === */
  selectedIds?: string[];
  onToggleRow?: (id: string) => void;
  onToggleAllPage?: (checked: boolean) => void;
  allSelectedOnPage?: boolean;
  someSelectedOnPage?: boolean;
}

const SalesTable: React.FC<SalesTableProps> = ({
  data,
  printData,
  nameById,
  customerOptions,
  kasirOptions,
  designerOptions,
  operatorOptions,
  finishingOptions,
  numberOffset = 0,
  toolbar,
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
  selectedCustomerId,
  onCustomerChange,

  selectedKasirId,
  onKasirChange,
  selectedDesignerId,
  onDesignerChange,
  selectedOperatorId,
  onOperatorChange,
  selectedFinishingId,
  onFinishingChange,

  isRefreshing = false,

  /* selection (opsional) */
  selectedIds,
  onToggleRow,
  onToggleAllPage,
  allSelectedOnPage,
  someSelectedOnPage,
}) => {

  const renderSortIcon = (column: string) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />;
    }
    return null;
  };

  const labelCls = 'block text-xs font-medium text-gray-600 mb-1';
  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  const formatPaymentMethod = (method: string | null | undefined) => {
    if (!method) return 'N/A';
    return method.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const renderPetugas = (item: any) => {
    const p = petugasOf(item, nameById);
    const rows: Array<[string, string]> = [
      ['Designer', p.designers.map(d => d.name).join(', ')],
      ['Kasir', p.kasir],
      ['Operator', p.operator],
      ['Finishing', p.finishing],
    ];

    return (
      <div className="whitespace-pre-line break-words">
        {rows.map(([label, val]) => (
          <div key={label}>
            <span className="text-gray-500">{label}: </span>
            <span className="text-gray-900">{val && val.trim() ? val : '-'}</span>
          </div>
        ))}
      </div>
    );
  };

  const extractCustomerLabel = (it: any): string => customerLabelOf(it);

  // Filter & opsi dropdown sepenuhnya dihitung halaman induk; di sini hanya tampilan.
  const filteredData = data;
  const printFilteredData = printData ?? [];

  // Kalau ada baris dicentang, yang dicetak hanya baris terpilih; kalau tidak, semua hasil filter
  const hasSelection = (selectedIds?.length ?? 0) > 0;
  const rowsToPrint = useMemo(() => {
    if (!hasSelection) return printFilteredData;
    const set = new Set(selectedIds);
    return printFilteredData.filter((it: any) => set.has(it.id));
  }, [printFilteredData, selectedIds, hasSelection]);

  // ===== H) Hitung dibayar & kekurangan =====
  const computePaidAndRemaining = (item: any) => {
    const finalAmount = Number(item.final_amount || 0);
    if (item.payment_status === 'paid') {
      return { paid: finalAmount, remaining: 0 };
    }
    const eligible = item.payment_status === 'pending' && item.payment_method !== null && item.payment_method !== '';
    const dpAmount = eligible ? getDpFromNotes((item as any).notes) : 0;
    const paid = Math.min(finalAmount, Number(dpAmount || 0));
    const remaining = Math.max(0, finalAmount - paid);
    return { paid, remaining };
  };

  const fmtIDR0 = (n: number) =>
    n.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

  // Sel data satu baris (tanpa kolom checkbox) — dipakai bersama oleh tabel layar & tabel cetak
  const renderDataCells = (item: CombinedSalesItem, index: number) => {
    const finalAmount = Number((item as any).final_amount || 0);
    const { paid, remaining } = computePaidAndRemaining(item as any);

    return (
      <>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {new Date((item as any).order_date).toLocaleDateString('id-ID')}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {(item as any).invoice_number || 'N/A'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm font-medium text-gray-900">
            {extractCustomerLabel(item)}
          </div>
          <div className="text-xs text-gray-500">
            {(item as any).customer_display_phone || (item as any)?.pelanggan?.[0]?.telepon || '-'}
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap align-top text-sm text-gray-900">
          {renderPetugas(item)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {fmtIDR0(finalAmount)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {fmtIDR0(paid)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          <div className="flex items-center gap-2">
            <span>{fmtIDR0(remaining)}</span>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm">
          <span
            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
              (item as any).payment_status === 'paid'
                ? 'bg-green-100 text-green-800'
                : (item as any).payment_status === 'pending'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {(item as any).payment_status === 'paid' ? 'Lunas' : (item as any).payment_status === 'pending' ? 'Belum Lunas' : 'Batal'}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {formatPaymentMethod((item as any).payment_method)}
        </td>
      </>
    );
  };

  // ===== Label filter aktif untuk area print =====
  const labelFromOptions = (id: string, options: IdName[]) => {
    if (!id) return '';
    return options.find(o => o.id === id)?.name || nameById[id] || '-';
  };

  const activeFilter = useMemo(() => {
    const items: { k: string; v: string }[] = [];

    items.push({ k: 'Periode', v: `${startDate || '-'} s/d ${endDate || '-'}` });

    items.push({
      k: 'Status',
      v: (paymentStatusFilter === 'all')
        ? 'Semua Status'
        : (paymentStatusFilter === 'paid' ? 'Lunas' : 'Belum Lunas')
    });

    items.push({
      k: 'Metode',
      v: (selectedPaymentMethod === 'all')
        ? 'Semua Metode'
        : selectedPaymentMethod.replace(/_/g, ' ')
    });

    items.push({ k: 'Customer', v: selectedCustomerId ? labelFromOptions(selectedCustomerId, customerOptions) : 'Semua Customer' });
    items.push({ k: 'Kasir', v: selectedKasirId ? labelFromOptions(selectedKasirId, kasirOptions) : 'Semua Kasir' });
    items.push({ k: 'Designer', v: selectedDesignerId ? labelFromOptions(selectedDesignerId, designerOptions) : 'Semua Designer' });
    items.push({ k: 'Operator', v: selectedOperatorId ? labelFromOptions(selectedOperatorId, operatorOptions) : 'Semua Operator' });
    items.push({ k: 'Finishing', v: selectedFinishingId ? labelFromOptions(selectedFinishingId, finishingOptions) : 'Semua Finishing' });

    items.push({
      k: 'Pencarian',
      v: (searchTerm?.trim() ? `"${searchTerm.trim()}"` : '-')
    });

    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    startDate, endDate,
    paymentStatusFilter, selectedPaymentMethod,
    selectedCustomerId, selectedKasirId, selectedDesignerId, selectedOperatorId, selectedFinishingId,
    customerOptions, kasirOptions, designerOptions, operatorOptions, finishingOptions,
    nameById, searchTerm
  ]);

  // ===== Export Excel (data sama dengan yang dicetak) =====
  const [exporting, setExporting] = useState(false);
  const handleExportExcel = async () => {
    if (rowsToPrint.length === 0) {
      showError('Tidak ada data untuk diekspor.');
      return;
    }
    setExporting(true);
    try {
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
      await downloadXlsx(`laporan-penjualan-${stamp}.xlsx`, {
        name: 'Laporan Penjualan',
        preface: [
          ['LAPORAN PENJUALAN'],
          ...activeFilter.map(f => [f.k, f.v]),
          ['Jumlah transaksi', rowsToPrint.length],
          ['Total penjualan', rowsToPrint.reduce((s, it: any) => s + Number(it.final_amount || 0), 0)],
        ],
        header: ['No', 'Tanggal', 'Faktur', 'Pelanggan', 'HP', 'Designer', 'Kasir', 'Operator', 'Finishing', 'Jumlah Total', 'Dibayar', 'Kekurangan', 'Status Pembayaran', 'Metode Pembayaran'],
        rows: rowsToPrint.map((it: any, i) => {
          const p = petugasOf(it, nameById);
          const { paid, remaining } = computePaidAndRemaining(it);
          return [
            i + 1,
            new Date(it.order_date).toLocaleDateString('id-ID'),
            it.invoice_number || '',
            extractCustomerLabel(it),
            it.customer_display_phone || it?.pelanggan?.[0]?.telepon || '',
            p.designers.map(d => d.name).join(', '),
            p.kasir,
            p.operator,
            p.finishing,
            Number(it.final_amount || 0),
            paid,
            remaining,
            it.payment_status === 'paid' ? 'Lunas' : it.payment_status === 'pending' ? 'Belum Lunas' : 'Batal',
            formatPaymentMethod(it.payment_method),
          ];
        }),
        colWidths: [5, 12, 14, 26, 16, 18, 14, 14, 14, 14, 14, 14, 16, 18],
      });
    } catch (e: any) {
      showError(e?.message || 'Gagal membuat file Excel.');
    } finally {
      setExporting(false);
    }
  };

  // ====== Checkbox master indeterminate (kalau selection props ada) ======
  const masterRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (!masterRef.current) return;
    masterRef.current.indeterminate = !!someSelectedOnPage && !allSelectedOnPage;
  }, [someSelectedOnPage, allSelectedOnPage]);

  // ===== UI =====
  return (
    <div className="space-y-6">

      {/* ====== FILTER (no-print) ====== */}
      <div className="no-print bg-white rounded-lg shadow-sm p-4 sm:p-6 space-y-4">
        {/* Baris 1: pencarian + rentang tanggal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="salesSearch" className={labelCls}>Cari</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                id="salesSearch"
                type="text"
                placeholder="Faktur, pelanggan, HP, produk, nama staff..."
                value={searchTerm}
                onChange={onSearchChange}
                className={`${inputCls} pl-10`}
              />
            </div>
          </div>
          <div>
            <label htmlFor="startDate" className={labelCls}>Dari</label>
            <input type="date" id="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor="endDate" className={labelCls}>Sampai</label>
            <input type="date" id="endDate" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
          </div>
        </div>

        {/* Baris 2: filter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label htmlFor="paymentStatusFilter" className={labelCls}>Status Pembayaran</label>
            <select id="paymentStatusFilter" value={paymentStatusFilter} onChange={onPaymentStatusFilterChange} className={inputCls}>
              <option value="all">Semua Status</option>
              <option value="paid">Lunas</option>
              <option value="pending">Belum Lunas</option>
            </select>
          </div>
          <div>
            <label htmlFor="paymentMethodFilter" className={labelCls}>Metode</label>
            <select id="paymentMethodFilter" value={selectedPaymentMethod} onChange={onPaymentMethodChange} className={inputCls}>
              <option value="all">Semua Metode</option>
              <option value="cash">Tunai</option>
              <option value="bank_transfer">Transfer Bank</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="customerFilter" className={labelCls}>Customer</label>
            <SearchableSelect
              id="customerFilter"
              options={customerOptions}
              value={selectedCustomerId}
              onChange={onCustomerChange}
              allLabel="Semua Customer"
              placeholder="Ketik nama customer..."
            />
          </div>
          <div>
            <label htmlFor="kasirFilter" className={labelCls}>Kasir</label>
            <select id="kasirFilter" value={selectedKasirId || ''} onChange={onKasirChange} className={inputCls}>
              <option value="">Semua Kasir</option>
              {kasirOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="designerFilter" className={labelCls}>Designer</label>
            <select id="designerFilter" value={selectedDesignerId || ''} onChange={onDesignerChange} className={inputCls}>
              <option value="">Semua Designer</option>
              {designerOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="operatorFilter" className={labelCls}>Operator</label>
            <select id="operatorFilter" value={selectedOperatorId || ''} onChange={onOperatorChange} className={inputCls}>
              <option value="">Semua Operator</option>
              {operatorOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="finishingFilter" className={labelCls}>Finishing</label>
            <select id="finishingFilter" value={selectedFinishingId || ''} onChange={onFinishingChange} className={inputCls}>
              <option value="">Semua Finishing</option>
              {finishingOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
            </select>
          </div>
        </div>

        {/* Baris 3: total + aksi */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-4 border-t border-gray-100">
          <div className="text-base sm:text-lg font-bold text-gray-900">
            Total Penjualan: {formatCurrency(totalSalesAmount)}
            {isRefreshing && (
              <span className="ml-3 inline-flex items-center text-xs font-normal text-gray-500" aria-live="polite" aria-busy="true">
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Memperbarui data…
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:flex md:gap-2">
            <button
              onClick={onPrint}
              className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
            >
              <Printer className="h-5 w-5 mr-2" />
              {hasSelection ? `Cetak Data yang Dipilih (${selectedIds!.length})` : 'Cetak'}
            </button>
            <button
              onClick={handleExportExcel}
              disabled={exporting}
              className="flex items-center justify-center px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:opacity-50 transition-colors whitespace-nowrap"
              title="Export ke Excel (.xlsx) — data sama dengan yang dicetak"
            >
              <FileDown className="h-5 w-5 mr-2" />
              {exporting ? 'Menyiapkan…' : hasSelection ? `Export Excel (${selectedIds!.length})` : 'Export Excel'}
            </button>
          </div>
        </div>
      </div>

      {toolbar && <div className="no-print">{toolbar}</div>}

      {/* ====== AREA KHUSUS CETAK ====== */}
      <div id="purchase-print-area" className="print-only-block">
        {/* Header & Ringkasan filter (print only) */}
        <div className="print-only print-header">
          <div className="print-title">Laporan Penjualan</div>
          <div className="print-divider" />
          <div className="print-filter-grid">
            {activeFilter.map((it, idx) => (
              <div className="print-filter-row" key={idx}>
                <div className="print-k">{it.k}</div>
                <div className="print-v">{it.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* TABLE (layar, per-halaman) — disembunyikan saat print */}
        <div className="no-print bg-white rounded-lg shadow-sm overflow-x-auto print-table-wrap">
          <table className="min-w-full divide-y divide-gray-200 print-w-full">
            <thead className="bg-gray-50">
              <tr>
                {/* Checkbox kolom — hanya tampil di layar (bukan print) */}
                {typeof selectedIds !== 'undefined' && (
                  <th className="no-print px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      ref={masterRef}
                      type="checkbox"
                      className="h-4 w-4"
                      checked={!!allSelectedOnPage}
                      onChange={(e) => onToggleAllPage?.(e.target.checked)}
                      aria-checked={someSelectedOnPage ? 'mixed' : allSelectedOnPage ? 'true' : 'false'}
                    />
                  </th>
                )}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dibayar</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kekurangan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => onSort('payment_status')}>
                  <div className="flex items-center">Status Pembayaran {renderSortIcon('payment_status')}</div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metode Pembayaran</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={typeof selectedIds !== 'undefined' ? 11 : 10} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    Tidak ada data penjualan.
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => {
                  const isChecked = selectedIds?.includes(item.id) ?? false;

                  return (
                    <tr
                      key={item.id}
                      className={`cursor-pointer hover:bg-gray-50 avoid-break ${selectedItemId === item.id ? 'bg-blue-50' : ''}`}
                      onClick={() => onRowClick(item)}>

                      {/* Checkbox per baris — hanya di layar */}
                      {typeof selectedIds !== 'undefined' && (
                        <td className="no-print px-4 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={isChecked}
                            onChange={(e) => {
                              e.stopPropagation();
                              onToggleRow?.(item.id);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                      )}

                      {renderDataCells(item, numberOffset + index)}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* TABLE (cetak, SELURUH hasil filter — bukan per halaman) — hanya tampil saat print */}
        <div className="print-only bg-white rounded-lg shadow-sm overflow-x-auto print-table-wrap">
          <table className="min-w-full divide-y divide-gray-200 print-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faktur</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pelanggan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Petugas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jumlah Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dibayar</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kekurangan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status Pembayaran</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metode Pembayaran</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rowsToPrint.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    Tidak ada data penjualan.
                  </td>
                </tr>
              ) : (
                rowsToPrint.map((item, index) => (
                  <tr key={item.id} className="avoid-break">
                    {renderDataCells(item, index)}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* ====== /AREA KHUSUS CETAK ====== */}
    </div>
  );
};

export default SalesTable;
