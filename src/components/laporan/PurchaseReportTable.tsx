import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Printer, ArrowUp, ArrowDown, Trash2, FileDown } from 'lucide-react';
import { PurchaseReportItem } from '../../types/purchaseOrderTypes';
import { formatCurrency, formatPaymentMethod } from '../../utils/formatters';
import SearchableSelect from './SearchableSelect';
import { downloadXlsx } from '../../utils/exportXlsx';
import { showError } from '../../utils/toast';

interface SupplierOption { id: string; name: string; }
interface RecordedByOption { id: string; name: string; }

interface PurchaseReportTableProps {
  loading?: boolean;
  data: PurchaseReportItem[];
  /** Seluruh data hasil filter (tanpa pagination) — dipakai khusus untuk cetak. */
  printData?: PurchaseReportItem[];
  /** Offset penomoran baris di layar agar lanjut antar halaman, mis. (currentPage-1)*pageSize. */
  numberOffset?: number;
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  totalPurchaseAmount: number;
  onPrint: () => void;
  onRowClick: (item: PurchaseReportItem) => void;
  selectedItemId: string | null;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string) => void;
  paymentStatusFilter: string;
  onPaymentStatusFilterChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  paymentMethodFilter: string;
  onPaymentMethodChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  supplierOptions: SupplierOption[];
  selectedSupplierId: string;
  onSupplierChange: (supplierId: string) => void;
  recordedByOptions: RecordedByOption[];
  selectedRecordedById: string;
  onRecordedByChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onDeleteSelected: () => void;
  onDeleteAllFiltered: () => void;

  /* === selection (baru) === */
  selectedIds?: string[];
  onToggleRow?: (id: string) => void;
  onToggleAllPage?: (checked: boolean) => void;
  allSelectedOnPage?: boolean;
  someSelectedOnPage?: boolean;
  onDeleteSelectedIds?: () => void;
}

const PurchaseReportTable: React.FC<PurchaseReportTableProps> = ({
  loading = false,
  data,
  printData,
  numberOffset = 0,
  searchTerm,
  onSearchChange,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  totalPurchaseAmount,
  onPrint,
  onRowClick,
  selectedItemId,
  sortColumn,
  sortDirection,
  onSort,
  paymentStatusFilter,
  onPaymentStatusFilterChange,
  paymentMethodFilter,
  onPaymentMethodChange,
  supplierOptions,
  selectedSupplierId,
  onSupplierChange,
  recordedByOptions,
  selectedRecordedById,
  onRecordedByChange,
  onDeleteSelected,
  onDeleteAllFiltered,

  /* selection */
  selectedIds,
  onToggleRow,
  onToggleAllPage,
  allSelectedOnPage,
  someSelectedOnPage,
  onDeleteSelectedIds,
}) => {
  const renderSortIcon = (column: string) => {
    if (sortColumn === column) return sortDirection === 'asc' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />;
    return null;
  };

  const labelCls = 'block text-xs font-medium text-gray-600 mb-1';
  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  // Skeleton row component
  const RowSkeleton = ({ idx }: { idx: number }) => (
    <tr key={`s-${idx}`}>
      {/* checkbox skeleton hanya di layar */}
      {typeof selectedIds !== 'undefined' && <td className="no-print px-6 py-4"><div className="h-4 w-4 bg-gray-200 rounded" /></td>}
      <td className="px-6 py-4"><div className="h-4 w-6 bg-gray-200 rounded animate-pulse" /></td>
      <td className="px-6 py-4"><div className="h-4 w-24 bg-gray-200 rounded animate-pulse" /></td>
      <td className="px-6 py-4"><div className="h-4 w-28 bg-gray-200 rounded animate-pulse" /></td>
      <td className="px-6 py-4">
        <div className="h-4 w-40 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
      </td>
      <td className="px-6 py-4"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></td>
      <td className="px-6 py-4"><div className="h-4 w-24 bg-gray-200 rounded animate-pulse" /></td>
      <td className="px-6 py-4"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></td>
      <td className="px-6 py-4"><div className="h-4 w-28 bg-gray-200 rounded animate-pulse" /></td>
      <td className="px-6 py-4"><div className="h-4 w-36 bg-gray-200 rounded animate-pulse" /></td>
    </tr>
  );

  const showEmpty = !loading && data.length === 0;

  // Kalau ada baris dicentang, yang dicetak hanya baris terpilih; kalau tidak, semua hasil filter
  const hasSelection = (selectedIds?.length ?? 0) > 0;
  const rowsToPrint = useMemo(() => {
    const all = printData ?? [];
    if (!hasSelection) return all;
    const set = new Set(selectedIds);
    return all.filter((it) => set.has(it.id));
  }, [printData, selectedIds, hasSelection]);

  // Sel data satu baris (tanpa kolom checkbox) — dipakai bersama oleh tabel layar & tabel cetak
  const renderDataCells = (item: PurchaseReportItem, index: number) => (
    <>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {index + 1}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {new Date(item.order_date).toLocaleDateString('id-ID')}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {item.invoice_number || 'N/A'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">
          {item.supplier_display_name || item.supplier?.nama || 'N/A'}
        </div>
        <div className="text-xs text-gray-500">
          {item.supplier_display_phone || item.supplier?.telepon || 'N/A'}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {formatCurrency(item.final_amount)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {item.due_date ? new Date(item.due_date).toLocaleDateString('id-ID') : 'N/A'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {formatCurrency(item.due_amount)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {formatPaymentMethod(item.payment_method)}
        {item.bank_name && ` (${item.bank_name})`}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {item.profiles ? `${item.profiles.first_name} ${item.profiles.last_name || ''}` : 'N/A'}
      </td>
    </>
  );

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
      const statusLabel = paymentStatusFilter === 'all' ? 'Semua Status' : paymentStatusFilter === 'paid' ? 'Lunas' : 'Belum Lunas';
      const methodLabel = paymentMethodFilter === 'all' ? 'Semua Metode' : formatPaymentMethod(paymentMethodFilter);
      const supplierLabel = selectedSupplierId ? (supplierOptions.find(s => s.id === selectedSupplierId)?.name || '-') : 'Semua Supplier';
      const petugasLabel = selectedRecordedById ? (recordedByOptions.find(u => u.id === selectedRecordedById)?.name || '-') : 'Semua Petugas';
      await downloadXlsx(`laporan-pembelian-${stamp}.xlsx`, {
        name: 'Laporan Pembelian',
        preface: [
          ['LAPORAN PEMBELIAN'],
          ['Periode', `${startDate || '-'} s/d ${endDate || '-'}`],
          ['Status', statusLabel],
          ['Metode', methodLabel],
          ['Supplier', supplierLabel],
          ['Petugas', petugasLabel],
          ['Pencarian', searchTerm.trim() ? `"${searchTerm.trim()}"` : '-'],
          ['Jumlah transaksi', rowsToPrint.length],
          ['Total pembelian', rowsToPrint.reduce((sum, it) => sum + Number(it.final_amount || 0), 0)],
          ['Total hutang', rowsToPrint.reduce((sum, it) => sum + Number(it.due_amount || 0), 0)],
        ],
        header: ['No', 'Tanggal', 'Faktur', 'Supplier', 'HP', 'Jumlah Total', 'Tgl Tempo', 'Hutang', 'Status', 'Metode', 'Bank', 'Petugas'],
        rows: rowsToPrint.map((it, i) => [
          i + 1,
          new Date(it.order_date).toLocaleDateString('id-ID'),
          it.invoice_number || '',
          it.supplier_display_name || it.supplier?.nama || '',
          it.supplier_display_phone || it.supplier?.telepon || '',
          Number(it.final_amount || 0),
          it.due_date ? new Date(it.due_date).toLocaleDateString('id-ID') : '',
          Number(it.due_amount || 0),
          it.payment_status === 'paid' ? 'Lunas' : 'Belum Lunas',
          formatPaymentMethod(it.payment_method),
          it.bank_name || '',
          it.profiles ? `${it.profiles.first_name} ${it.profiles.last_name || ''}`.trim() : '',
        ]),
        colWidths: [5, 12, 14, 26, 16, 14, 12, 14, 12, 16, 16, 18],
      });
    } catch (e: any) {
      showError(e?.message || 'Gagal membuat file Excel.');
    } finally {
      setExporting(false);
    }
  };

  // master checkbox indeterminate
  const masterRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (!masterRef.current) return;
    masterRef.current.indeterminate = !!someSelectedOnPage && !allSelectedOnPage;
  }, [someSelectedOnPage, allSelectedOnPage]);

  return (
    <div className="space-y-6">
      {/* ====== FILTER (no-print) ====== */}
      <div className="no-print bg-white rounded-lg shadow-sm p-4 sm:p-6 space-y-4">
        {/* Baris 1: pencarian + rentang tanggal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="purchaseSearch" className={labelCls}>Cari</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                id="purchaseSearch"
                type="text"
                placeholder="Faktur, supplier, petugas, nama barang..."
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
            <label htmlFor="paymentStatusFilter" className={labelCls}>Status</label>
            <select id="paymentStatusFilter" value={paymentStatusFilter} onChange={onPaymentStatusFilterChange} className={inputCls}>
              <option value="all">Semua Status</option>
              <option value="paid">Lunas</option>
              <option value="due">Belum Lunas</option>
            </select>
          </div>
          <div>
            <label htmlFor="paymentMethodFilter" className={labelCls}>Metode</label>
            <select id="paymentMethodFilter" value={paymentMethodFilter} onChange={onPaymentMethodChange} className={inputCls}>
              <option value="all">Semua Metode</option>
              <option value="cash">Tunai</option>
              <option value="bank_transfer">Transfer Bank</option>
            </select>
          </div>
          <div>
            <label htmlFor="supplierFilter" className={labelCls}>Supplier</label>
            <SearchableSelect
              id="supplierFilter"
              options={supplierOptions}
              value={selectedSupplierId}
              onChange={onSupplierChange}
              allLabel="Semua Supplier"
              placeholder="Ketik nama supplier..."
            />
          </div>
          <div>
            <label htmlFor="recordedByFilter" className={labelCls}>Petugas</label>
            <select id="recordedByFilter" value={selectedRecordedById} onChange={onRecordedByChange} className={inputCls}>
              <option value="">Semua Petugas</option>
              {recordedByOptions.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        </div>

        {/* Baris 3: total + aksi */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-4 border-t border-gray-100">
          <div className="text-base sm:text-lg font-bold text-gray-900">
            Total Pembelian: {formatCurrency(totalPurchaseAmount)}
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

      {/* === INI AREA YANG AKAN DICETAK === */}
      <div id="purchase-print-area" className="bg-white rounded-lg shadow-sm overflow-hidden print-only-block">
        {/* TABLE (layar, per-halaman) — disembunyikan saat print */}
        <div className="no-print overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {/* checkbox master hanya di layar */}
                {typeof selectedIds !== 'undefined' && (
                  <th className="no-print px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                <th onClick={() => onSort('order_date')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center">Tanggal {renderSortIcon('order_date')}</div>
                </th>
                <th onClick={() => onSort('invoice_number')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center">Faktur {renderSortIcon('invoice_number')}</div>
                </th>
                <th onClick={() => onSort('supplier')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center">Supplier {renderSortIcon('supplier')}</div>
                </th>
                <th onClick={() => onSort('final_amount')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center">Jumlah Total {renderSortIcon('final_amount')}</div>
                </th>
                <th onClick={() => onSort('due_date')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center">Tgl Tempo {renderSortIcon('due_date')}</div>
                </th>
                <th onClick={() => onSort('due_amount')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center">Hutang {renderSortIcon('due_amount')}</div>
                </th>
                <th onClick={() => onSort('payment_method')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center">Metode {renderSortIcon('payment_method')}</div>
                </th>
                <th onClick={() => onSort('recorded_by')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center">Petugas {renderSortIcon('recorded_by')}</div>
                </th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} idx={i} />)
                : showEmpty ? (
                  <tr>
                    <td colSpan={typeof selectedIds !== 'undefined' ? 10 : 9} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      Tidak ada data pembelian.
                    </td>
                  </tr>
                ) : (
                  data.map((item, index) => {
                    const checked = selectedIds?.includes(item.id) ?? false;
                    return (
                      <tr
                        key={item.id}
                        className={`cursor-pointer hover:bg-gray-50 ${selectedItemId === item.id ? 'bg-blue-50' : ''}`}
                        onClick={() => onRowClick(item)}
                      >
                        {/* checkbox per baris (hanya layar) */}
                        {typeof selectedIds !== 'undefined' && (
                          <td className="no-print px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={checked}
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
        <div className="print-only overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faktur</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jumlah Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tgl Tempo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hutang</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metode</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Petugas</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rowsToPrint.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    Tidak ada data pembelian.
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

      <div className="flex flex-wrap justify-end gap-3 mt-6">
        {/* baru: hapus terpilih */}
        {typeof selectedIds !== 'undefined' && (
          <button
            onClick={onDeleteSelectedIds}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            disabled={loading || (selectedIds?.length ?? 0) === 0}
          >
            <Trash2 className="h-5 w-5 mr-2" />
            Hapus Terpilih ({selectedIds?.length ?? 0})
          </button>
        )}

        {/* yang lama tetap ada */}
        {/* <button
          onClick={onDeleteSelected}
          className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          disabled={loading}
        >
          <Trash2 className="h-5 w-5 mr-2" />
          Hapus Transaksi
        </button> */}
        <button
          onClick={onDeleteAllFiltered}
          className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          disabled={loading}
        >
          <Trash2 className="h-5 w-5 mr-2" />
          Hapus Semua (Filter)
        </button>
      </div>
    </div>
  );
};

export default PurchaseReportTable;
