import React from 'react';
import { Search, Printer } from 'lucide-react';
import { SalesByProductItem } from '../../hooks/useSalesByProductData';
import { KategoriOption } from '../../hooks/useProdukData'; // Re-use KategoriOption
import { formatCurrency } from '../../utils/formatters';

interface SalesByProductTableProps {
  data: SalesByProductItem[];
  loading: boolean; // Added loading prop
  error: string | null; // Added error prop
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  kategoriOptions: KategoriOption[];
  selectedKategoriId: string | null;
  onKategoriChange: (id: string) => void;
  onPrint: () => void;
  onFetchSalesByProduct: () => void; // Added for retry button
}

const SalesByProductTable: React.FC<SalesByProductTableProps> = ({
  data,
  loading,
  error,
  searchTerm,
  onSearchChange,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  kategoriOptions,
  selectedKategoriId,
  onKategoriChange,
  onPrint,
  onFetchSalesByProduct,
}) => {
  const totalSubtotal = data.reduce((sum, item) => sum + item.subtotal, 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">Memuat laporan penjualan per produk...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 text-red-600">
        <p>Error: {error}</p>
        <button onClick={onFetchSalesByProduct} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow-sm p-6 flex flex-col md:flex-row gap-4 items-center">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <label htmlFor="startDate" className="text-sm font-medium text-gray-700">Dari:</label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <label htmlFor="endDate" className="text-sm font-medium text-gray-700">Sampai:</label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <label htmlFor="kategoriFilter" className="text-sm font-medium text-gray-700">Kategori:</label>
          <select
            id="kategoriFilter"
            value={selectedKategoriId || ''}
            onChange={(e) => onKategoriChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Semua</option>
            {kategoriOptions.map(kategori => (
              <option key={kategori.id} value={kategori.nama}>{kategori.nama}</option>
            ))}
          </select>
        </div>
        <div className="relative flex-1 w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Cari produk..."
            value={searchTerm}
            onChange={onSearchChange}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={onPrint}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Printer className="h-5 w-5 mr-2" />
          Cetak
        </button>
      </div>

      {/* Total Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 text-right">
        <h2 className="text-xl font-bold text-gray-900">
          Total Subtotal: {formatCurrency(totalSubtotal)}
        </h2>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  No.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kode Produk
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nama
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  QTY Terjual
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Luas Terjual
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Satuan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kategori
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    Tidak ada data penjualan per produk.
                  </td>
                </tr>
              ) : (
                data.map((item, index) => (
                  <tr key={item.product_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.product_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.product_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.qty_terjual}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.luas_terjual.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.satuan_nama}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {item.kategori_nama}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(item.subtotal)}
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

export default SalesByProductTable;