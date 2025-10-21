import React, { useEffect, useRef } from 'react';
import { Search, Printer, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { PurchaseReportItem } from '../../types/purchaseOrderTypes';
import { formatCurrency, formatPaymentMethod } from '../../utils/formatters';

interface SupplierOption { id: string; name: string; }
interface RecordedByOption { id: string; name: string; }

interface PurchaseReportTableProps {
  loading?: boolean;
  data: PurchaseReportItem[];
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
  onSupplierChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
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

  // master checkbox indeterminate
  const masterRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (!masterRef.current) return;
    masterRef.current.indeterminate = !!someSelectedOnPage && !allSelectedOnPage;
  }, [someSelectedOnPage, allSelectedOnPage]);

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="bg-white rounded-lg shadow-sm p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start no-print">
        <div className="relative sm:col-span-2 lg:col-span-2 xl:col-span-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Cari pembelian (faktur, supplier, petugas)..."
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
        <div className="flex items-center gap-2">
          <label htmlFor="paymentStatusFilter" className="text-sm font-medium text-gray-700">Status:</label>
          <select
            id="paymentStatusFilter"
            value={paymentStatusFilter}
            onChange={onPaymentStatusFilterChange}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          >
            <option value="all">Semua Status</option>
            <option value="paid">Lunas</option>
            <option value="due">Belum Lunas</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="paymentMethodFilter" className="text-sm font-medium text-gray-700">Metode:</label>
          <select
            id="paymentMethodFilter"
            value={paymentMethodFilter}
            onChange={onPaymentMethodChange}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          >
            <option value="all">Semua Metode</option>
            <option value="cash">Tunai</option>
            <option value="bank_transfer">Transfer Bank</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="supplierFilter" className="text-sm font-medium text-gray-700">Supplier:</label>
          <select
            id="supplierFilter"
            value={selectedSupplierId}
            onChange={onSupplierChange}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Semua Supplier</option>
            {supplierOptions.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="recordedByFilter" className="text-sm font-medium text-gray-700">Petugas:</label>
          <select
            id="recordedByFilter"
            value={selectedRecordedById}
            onChange={onRecordedByChange}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Semua Petugas</option>
            {recordedByOptions.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={onPrint}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors w-full sm:col-span-2 lg:col-span-1 xl:col-span-1"
        >
          <Printer className="h-5 w-5 mr-2" />
          Cetak
        </button>
      </div>

      {/* Summary total - juga JANGAN ikut dicetak */}
      <div className="bg-white rounded-lg shadow-sm p-6 text-right no-print">
        <h2 className="text-xl font-bold text-gray-900">
          Total Pembelian: {formatCurrency(totalPurchaseAmount)}
        </h2>
      </div>

      {/* === INI AREA YANG AKAN DICETAK === */}
      <div id="purchase-print-area" className="bg-white rounded-lg shadow-sm overflow-hidden print-only-block">
        <div className="overflow-x-auto">
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
                      </tr>
                    );
                  })
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
