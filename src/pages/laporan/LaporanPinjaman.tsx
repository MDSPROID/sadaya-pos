import React, { useState, useMemo } from 'react';
import { usePinjamanKaryawanData } from '../../hooks/usePinjamanKaryawanData'; // Import hook
import PinjamanTable from '../../components/laporan/PinjamanTable'; // Import komponen tabel

const LaporanPinjaman: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const {
    data,
    loading,
    error,
    fetchPinjamanKaryawan,
  } = usePinjamanKaryawanData({ startDate, endDate }); // Menggunakan hook untuk mengambil data

  const filteredData = useMemo(() => {
    return data.filter(item =>
      item.profiles_karyawan?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.profiles_karyawan?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.keterangan?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);

  const totalPiutang = useMemo(() => {
    // Menghitung total sisa pinjaman dari data yang difilter
    return filteredData.reduce((sum, item) => sum + (item.sisa_pinjaman || 0), 0);
  }, [filteredData]);

  const handlePrint = () => {
    // Implementasi fungsi cetak di sini
    // Untuk saat ini, kita bisa menampilkan pesan atau membuka jendela cetak browser
    window.print();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">Memuat laporan pinjaman...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 text-red-600">
        <p>Error: {error}</p>
        <button onClick={fetchPinjamanKaryawan} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Pinjaman</h1>
          <p className="text-gray-600">Lihat dan cetak laporan pinjaman karyawan.</p>
        </div>
      </div>

      <PinjamanTable
        data={filteredData}
        searchTerm={searchTerm}
        onSearchChange={(e) => setSearchTerm(e.target.value)}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        totalPiutang={totalPiutang}
        onPrint={handlePrint}
      />
    </div>
  );
};

export default LaporanPinjaman;