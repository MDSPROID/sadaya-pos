import React, { useEffect, useMemo, useState } from 'react';
import { useBahanStockData } from '../../hooks/useBahanStockData';
import { useProdukStockData } from '../../hooks/useProdukStockData';
import BahanStockTable from '../../components/laporan/BahanStockTable';
import ProdukStockTable from '../../components/laporan/ProdukStockTable';
import Pagination from '../../components/Pagination';

const LaporanStok: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'bahan' | 'produk'>('bahan');
  // Disaring di database, bukan di browser, supaya hitungan halaman tetap benar.
  const [hanyaMenipis, setHanyaMenipis] = useState(false);

  // State for Bahan Stock tab
  const [bahanSearchTerm, setBahanSearchTerm] = useState('');
  const [bahanCurrentPage, setBahanCurrentPage] = useState(1);
  const [bahanPageSize] = useState(10); // You can make this configurable
  const [bahanSelectedIds, setBahanSelectedIds] = useState<string[]>([]);

  // State for Produk Stock tab
  const [produkSearchTerm, setProdukSearchTerm] = useState('');
  const [produkCurrentPage, setProdukCurrentPage] = useState(1);
  const [produkPageSize] = useState(10); // You can make this configurable
  const [produkSelectedIds, setProdukSelectedIds] = useState<string[]>([]);

  // Fetch data for Bahan Stock (allData hanya diambil saat tabnya aktif)
  const {
    data: bahanData,
    allData: bahanAllData,
    loadingAll: bahanLoadingAll,
    totalCount: bahanTotalCount,
    loading: bahanLoading,
    error: bahanError,
    fetchBahanStock,
  } = useBahanStockData({
    searchTerm: bahanSearchTerm,
    currentPage: bahanCurrentPage,
    pageSize: bahanPageSize,
    fetchAll: activeTab === 'bahan',
    hanyaMenipis,
  });

  // Fetch data for Produk Stock (allData hanya diambil saat tabnya aktif)
  const {
    data: produkData,
    allData: produkAllData,
    loadingAll: produkLoadingAll,
    totalCount: produkTotalCount,
    loading: produkLoading,
    error: produkError,
    fetchProdukStock,
  } = useProdukStockData({
    searchTerm: produkSearchTerm,
    currentPage: produkCurrentPage,
    pageSize: produkPageSize,
    fetchAll: activeTab === 'produk',
    hanyaMenipis,
  });

  // Centang direset saat pencarian berubah agar tidak menyisakan pilihan di luar hasil pencarian
  useEffect(() => setBahanSelectedIds([]), [bahanSearchTerm]);
  useEffect(() => setProdukSelectedIds([]), [produkSearchTerm]);

  const toggleId = (setIds: React.Dispatch<React.SetStateAction<string[]>>) => (id: string) =>
    setIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const toggleAllOnPage = (
    setIds: React.Dispatch<React.SetStateAction<string[]>>,
    pageIds: string[],
  ) => (checked: boolean) =>
    setIds(prev => (checked
      ? Array.from(new Set([...prev, ...pageIds]))
      : prev.filter(id => !pageIds.includes(id))));

  const bahanPageIds = useMemo(() => bahanData.map(b => b.id), [bahanData]);
  const produkPageIds = useMemo(() => produkData.map(p => p.id), [produkData]);

  const bahanTotalPages = Math.ceil(bahanTotalCount / bahanPageSize);
  const produkTotalPages = Math.ceil(produkTotalCount / produkPageSize);

  const filterMenipis = (
    <label className="flex items-center gap-2 text-sm text-gray-700 whitespace-nowrap">
      <input
        type="checkbox"
        checked={hanyaMenipis}
        onChange={(e) => {
          setHanyaMenipis(e.target.checked);
          setBahanCurrentPage(1);
          setProdukCurrentPage(1);
        }}
        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      Hanya stok menipis
      <span
        className="text-gray-400 cursor-help"
        title="Menampilkan barang yang stoknya sudah di bawah atau sama dengan Stok Minimum-nya. Barang yang Stok Minimum-nya masih 0 tidak dipantau."
      >
        (?)
      </span>
    </label>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Stok</h1>
          <p className="text-gray-600">Lihat dan kelola stok bahan baku dan produk.</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="no-print bg-white rounded-lg shadow-sm p-4">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex flex-wrap gap-x-8 gap-y-2" aria-label="Tabs">
            <button
              type="button"
              onClick={() => setActiveTab('bahan')}
              className={`
                ${activeTab === 'bahan'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
                whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm
              `}
            >
              Stok Bahan Baku
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('produk')}
              className={`
                ${activeTab === 'produk'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
                whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm
              `}
            >
              Stok Produk
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'bahan' && (
        <>
          <BahanStockTable
            data={bahanData}
            allData={bahanAllData}
            loadingAll={bahanLoadingAll}
            searchTerm={bahanSearchTerm}
            onSearchChange={(e) => {
              setBahanSearchTerm(e.target.value);
              setBahanCurrentPage(1); // Reset to first page on new search
            }}
            loading={bahanLoading}
            error={bahanError}
            onFetchData={fetchBahanStock}
            numberOffset={(bahanCurrentPage - 1) * bahanPageSize}
            selectedIds={bahanSelectedIds}
            onToggleRow={toggleId(setBahanSelectedIds)}
            onToggleAllPage={toggleAllOnPage(setBahanSelectedIds, bahanPageIds)}
            extraFilters={filterMenipis}
          />
          <div className="no-print">
            <Pagination
              currentPage={bahanCurrentPage}
              totalPages={bahanTotalPages}
              onPageChange={setBahanCurrentPage}
              pageSize={bahanPageSize}
              totalItems={bahanTotalCount}
            />
          </div>
        </>
      )}

      {activeTab === 'produk' && (
        <>
          <ProdukStockTable
            data={produkData}
            allData={produkAllData}
            loadingAll={produkLoadingAll}
            searchTerm={produkSearchTerm}
            onSearchChange={(e) => {
              setProdukSearchTerm(e.target.value);
              setProdukCurrentPage(1); // Reset to first page on new search
            }}
            loading={produkLoading}
            error={produkError}
            onFetchData={fetchProdukStock}
            numberOffset={(produkCurrentPage - 1) * produkPageSize}
            selectedIds={produkSelectedIds}
            onToggleRow={toggleId(setProdukSelectedIds)}
            onToggleAllPage={toggleAllOnPage(setProdukSelectedIds, produkPageIds)}
            extraFilters={filterMenipis}
          />
          <div className="no-print">
            <Pagination
              currentPage={produkCurrentPage}
              totalPages={produkTotalPages}
              onPageChange={setProdukCurrentPage}
              pageSize={produkPageSize}
              totalItems={produkTotalCount}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default LaporanStok;
