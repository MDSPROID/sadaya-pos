import React, { useState, useMemo } from 'react';
import { useKasMasukData } from '../../hooks/useKasMasukData'; // Import hook
import PemasukanTable from '../../components/laporan/PemasukanTable'; // Import komponen tabel

const LaporanPemasukan: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const {
    data,
    loading,
    error,
    fetchKasMasuk,
  } = useKasMasukData({ startDate, endDate }); // Menggunakan hook untuk mengambil data

  const filteredData = useMemo(() => {
    return data.filter(item =>
      item.nama_pemasukan.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.keterangan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.profiles?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.profiles?.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);

  const totalJumlah = useMemo(() => {
    return filteredData.reduce((sum, item) => sum + (item.jumlah || 0), 0);
  }, [filteredData]);

  const handlePrint = () => {
    // Implementasi fungsi cetak di sini
    // Untuk saat ini, kita bisa menampilkan pesan atau membuka jendela cetak browser
    window.print();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">Memuat laporan pemasukan...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 text-red-600">
        <p>Error: {error}</p>
        <button onClick={fetchKasMasuk} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Pemasukan</h1>
          <p className="text-gray-600">Lihat dan cetak laporan pemasukan kas perusahaan.</p>
        </div>
      </div>

      <PemasukanTable
        data={filteredData}
        searchTerm={searchTerm}
        onSearchChange={(e) => setSearchTerm(e.target.value)}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        totalJumlah={totalJumlah}
        onPrint={handlePrint}
      />
    </div>
  );
};

export default LaporanPemasukan;