import React, { useState } from 'react';
import { useBahanStockData } from '../../hooks/useBahanStockData';
import { useProdukStockData } from '../../hooks/useProdukStockData';
import BahanStockTable from '../../components/laporan/BahanStockTable';
import ProdukStockTable from '../../components/laporan/ProdukStockTable';
import Pagination from '../../components/Pagination';

const LaporanStok: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'bahan' | 'produk'>('bahan');
  
  // State for Bahan Stock tab
  const [bahanSearchTerm, setBahanSearchTerm] = useState('');
  const [bahanCurrentPage, setBahanCurrentPage] = useState(1);
  const [bahanPageSize] = useState(10); // You can make this configurable

  // State for Produk Stock tab
  const [produkSearchTerm, setProdukSearchTerm] = useState('');
  const [produkCurrentPage, setProdukCurrentPage] = useState(1);
  const [produkPageSize] = useState(10); // You can make this configurable

  // Fetch data for Bahan Stock
  const {
    data: bahanData,
    totalCount: bahanTotalCount,
    loading: bahanLoading,
    error: bahanError,
    fetchBahanStock,
  } = useBahanStockData({ searchTerm: bahanSearchTerm, currentPage: bahanCurrentPage, pageSize: bahanPageSize });

  // Fetch data for Produk Stock
  const {
    data: produkData,
    totalCount: produkTotalCount,
    loading: produkLoading,
    error: produkError,
    fetchProdukStock,
  } = useProdukStockData({ searchTerm: produkSearchTerm, currentPage: produkCurrentPage, pageSize: produkPageSize });

  const handlePrint = () => {
    window.print();
    console.log(`Mencetak laporan stok ${activeTab === 'bahan' ? 'bahan baku' : 'produk'}...`);
  };

  const bahanTotalPages = Math.ceil(bahanTotalCount / bahanPageSize);
  const produkTotalPages = Math.ceil(produkTotalCount / produkPageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Stok</h1>
          <p className="text-gray-600">Lihat dan kelola stok bahan baku dan produk.</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm p-4">
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
            searchTerm={bahanSearchTerm}
            onSearchChange={(e) => {
              setBahanSearchTerm(e.target.value);
              setBahanCurrentPage(1); // Reset to first page on new search
            }}
            onPrint={handlePrint}
            loading={bahanLoading}
            error={bahanError}
            onFetchData={fetchBahanStock}
          />
          <Pagination
            currentPage={bahanCurrentPage}
            totalPages={bahanTotalPages}
            onPageChange={setBahanCurrentPage}
            pageSize={bahanPageSize}
            totalItems={bahanTotalCount}
          />
        </>
      )}

      {activeTab === 'produk' && (
        <>
          <ProdukStockTable
            data={produkData}
            searchTerm={produkSearchTerm}
            onSearchChange={(e) => {
              setProdukSearchTerm(e.target.value);
              setProdukCurrentPage(1); // Reset to first page on new search
            }}
            onPrint={handlePrint}
            loading={produkLoading}
            error={produkError}
            onFetchData={fetchProdukStock}
          />
          <Pagination
            currentPage={produkCurrentPage}
            totalPages={produkTotalPages}
            onPageChange={setProdukCurrentPage}
            pageSize={produkPageSize}
            totalItems={produkTotalCount}
          />
        </>
      )}
    </div>
  );
};

export default LaporanStok;