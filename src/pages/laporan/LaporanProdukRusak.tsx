import React from 'react';

const LaporanProdukRusak: React.FC = () => {
  return (
    <div className="p-6 bg-white rounded-lg shadow-sm min-h-[calc(100vh-120px)]">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Laporan Produk Rusak</h1>
      <p className="text-gray-700">Konten untuk laporan produk rusak akan ditampilkan di sini.</p>
      <p className="text-sm text-gray-500 mt-2">Hanya dapat diakses oleh Super Admin.</p>
    </div>
  );
};

export default LaporanProdukRusak;