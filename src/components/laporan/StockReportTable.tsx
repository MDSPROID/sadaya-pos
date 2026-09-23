import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Printer, FileDown, Loader2 } from 'lucide-react';
import { downloadXlsx, XlsxCell } from '../../utils/exportXlsx';
import { showError } from '../../utils/toast';

export interface StockColumn<T> {
  key: string;
  header: string;
  /** Tampilan di layar (boleh JSX, mis. badge stok). */
  cell: (item: T) => React.ReactNode;
  /** Tampilan saat dicetak; default memakai `cell`. */
  printCell?: (item: T) => React.ReactNode;
  /** Nilai untuk file Excel (angka tetap angka agar bisa dihitung). */
  excel: (item: T) => XlsxCell;
  /** Lebar kolom Excel (karakter). */
  width?: number;
}

interface StockReportTableProps<T> {
  /** Judul laporan, dipakai di header cetak & file Excel. */
  title: string;
  /** Baris halaman aktif. */
  data: T[];
  /** Seluruh baris hasil pencarian (tanpa pagination) — untuk cetak & export. */
  allData: T[];
  loadingAll?: boolean;
  getId: (item: T) => string;
  columns: StockColumn<T>[];

  searchPlaceholder: string;
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;

  loading: boolean;
  error: string | null;
  onFetchData: () => void;

  /** Offset penomoran agar lanjut antar halaman, mis. (currentPage-1)*pageSize. */
  numberOffset?: number;

  selectedIds: string[];
  onToggleRow: (id: string) => void;
  onToggleAllPage: (checked: boolean) => void;

  emptyText: string;
  /** Nama dasar file Excel, mis. "laporan-stok-bahan". */
  fileBaseName: string;
}

const StockReportTable = <T,>({
  title,
  data,
  allData,
  loadingAll = false,
  getId,
  columns,
  searchPlaceholder,
  searchTerm,
  onSearchChange,
  loading,
  error,
  onFetchData,
  numberOffset = 0,
  selectedIds,
  onToggleRow,
  onToggleAllPage,
  emptyText,
  fileBaseName,
}: StockReportTableProps<T>) => {
  const masterRef = useRef<HTMLInputElement | null>(null);

  const pageIds = useMemo(() => data.map(getId), [data, getId]);
  const allSelectedOnPage = pageIds.length > 0 && pageIds.every(id => selectedIds.includes(id));
  const someSelectedOnPage = pageIds.some(id => selectedIds.includes(id)) && !allSelectedOnPage;

  useEffect(() => {
    if (masterRef.current) masterRef.current.indeterminate = someSelectedOnPage;
  }, [someSelectedOnPage]);

  const hasSelection = selectedIds.length > 0;

  // Yang dicetak/diekspor: baris tercentang (lintas halaman) atau semua hasil pencarian
  const rowsToPrint = useMemo(() => {
    if (!hasSelection) return allData;
    const set = new Set(selectedIds);
    return allData.filter(item => set.has(getId(item)));
  }, [allData, selectedIds, hasSelection, getId]);

  const [exporting, setExporting] = useState(false);

  const handlePrint = () => {
    if (rowsToPrint.length === 0) {
      showError('Tidak ada data untuk dicetak.');
      return;
    }
    window.print();
  };

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
      await downloadXlsx(`${fileBaseName}-${stamp}.xlsx`, {
        name: title.slice(0, 31),
        preface: [
          [title.toUpperCase()],
          ['Pencarian', searchTerm.trim() ? `"${searchTerm.trim()}"` : '-'],
          ['Jumlah data', rowsToPrint.length],
          ['Dicetak', d.toLocaleString('id-ID')],
        ],
        header: ['No', ...columns.map(c => c.header)],
        rows: rowsToPrint.map((item, i) => [i + 1, ...columns.map(c => c.excel(item))]),
        colWidths: [5, ...columns.map(c => c.width ?? 18)],
      });
    } catch (e: any) {
      showError(e?.message || 'Gagal membuat file Excel.');
    } finally {
      setExporting(false);
    }
  };

  if (loading && data.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">Memuat data…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 text-red-600">
        <p>Error: {error}</p>
        <button onClick={onFetchData} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Coba Lagi
        </button>
      </div>
    );
  }

  const actionLabel = (base: string) => (hasSelection ? `${base} (${selectedIds.length})` : base);
  const colCount = columns.length + 2; // checkbox + No + kolom data

  return (
    <div className="space-y-6">
      {/* ====== FILTER & AKSI (no-print) ====== */}
      <div className="no-print bg-white rounded-lg shadow-sm p-4 sm:p-6 space-y-4">
        <div>
          <label htmlFor="stockSearch" className="block text-xs font-medium text-gray-600 mb-1">Cari</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              id="stockSearch"
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={onSearchChange}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-4 border-t border-gray-100">
          <div className="text-sm text-gray-600">
            {hasSelection ? (
              <>Terpilih <span className="font-semibold text-gray-900">{selectedIds.length}</span> dari {allData.length} data</>
            ) : (
              <>Total <span className="font-semibold text-gray-900">{allData.length}</span> data</>
            )}
            {loadingAll && (
              <span className="ml-3 inline-flex items-center text-xs text-gray-500" aria-live="polite">
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Menyiapkan data cetak…
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:flex md:gap-2">
            <button
              onClick={handlePrint}
              disabled={loadingAll}
              className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors whitespace-nowrap"
              title="Cetak — data sama dengan yang diekspor"
            >
              <Printer className="h-5 w-5 mr-2" />
              {actionLabel(hasSelection ? 'Cetak Data yang Dipilih' : 'Cetak')}
            </button>
            <button
              onClick={handleExportExcel}
              disabled={exporting || loadingAll}
              className="flex items-center justify-center px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:opacity-50 transition-colors whitespace-nowrap"
              title="Export ke Excel (.xlsx) — data sama dengan yang dicetak"
            >
              <FileDown className="h-5 w-5 mr-2" />
              {exporting ? 'Menyiapkan…' : actionLabel('Export Excel')}
            </button>
          </div>
        </div>
      </div>

      {/* ====== AREA KHUSUS CETAK ====== */}
      <div id="purchase-print-area" className="print-only-block">
        {/* Header cetak */}
        <div className="print-only print-header">
          <div className="print-title">{title}</div>
          <div className="print-divider" />
          <div className="print-filter-grid">
            <div className="print-filter-row">
              <div className="print-k">Pencarian</div>
              <div className="print-v">{searchTerm.trim() ? `"${searchTerm.trim()}"` : '-'}</div>
            </div>
            <div className="print-filter-row">
              <div className="print-k">Jumlah data</div>
              <div className="print-v">{rowsToPrint.length}</div>
            </div>
          </div>
        </div>

        {/* Tabel layar (per halaman) — disembunyikan saat cetak */}
        <div className="no-print bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      ref={masterRef}
                      type="checkbox"
                      className="h-4 w-4"
                      checked={allSelectedOnPage}
                      onChange={(e) => onToggleAllPage(e.target.checked)}
                      aria-label="Pilih semua di halaman ini"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No.</th>
                  {columns.map(c => (
                    <th key={c.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={colCount} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      {emptyText}
                    </td>
                  </tr>
                ) : (
                  data.map((item, index) => {
                    const id = getId(item);
                    return (
                      <tr key={id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={selectedIds.includes(id)}
                            onChange={() => onToggleRow(id)}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {numberOffset + index + 1}
                        </td>
                        {columns.map(c => (
                          <td key={c.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {c.cell(item)}
                          </td>
                        ))}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabel cetak (SELURUH data / baris terpilih) — hanya tampil saat cetak */}
        <div className="print-only bg-white rounded-lg shadow-sm overflow-x-auto print-table-wrap">
          <table className="min-w-full divide-y divide-gray-200 print-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No.</th>
                {columns.map(c => (
                  <th key={c.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rowsToPrint.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {emptyText}
                  </td>
                </tr>
              ) : (
                rowsToPrint.map((item, index) => (
                  <tr key={getId(item)} className="avoid-break">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                    {columns.map(c => (
                      <td key={c.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(c.printCell ?? c.cell)(item)}
                      </td>
                    ))}
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

export default StockReportTable;
