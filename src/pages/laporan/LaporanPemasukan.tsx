import React, { useState, useMemo, useEffect } from 'react';
import { useKasMasukData } from '../../hooks/useKasMasukData';
import PemasukanTable from '../../components/laporan/PemasukanTable';

const LaporanPemasukan: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const {
    data,
    loading,
    error,
    fetchKasMasuk,
  } = useKasMasukData({ startDate, endDate });

  // 🔁 Refresh data tabel saat tanggal berubah (tanpa refresh 1 halaman)
  useEffect(() => {
    fetchKasMasuk();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

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
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Pemasukan</h1>
          <p className="text-gray-600">Lihat dan cetak laporan pemasukan kas perusahaan.</p>
        </div>
      </div>

      {/* Error banner (tanpa full-page return) */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
          Error: {error}{' '}
          <button onClick={fetchKasMasuk} className="ml-2 underline">Coba lagi</button>
        </div>
      )}

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
        // ⬇️ hanya tabel yang menunjukkan loading
        loading={loading}
      />
    </div>
  );
};

export default LaporanPemasukan;
