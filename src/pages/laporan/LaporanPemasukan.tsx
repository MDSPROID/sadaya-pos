import React, { useState, useMemo, useEffect } from 'react';
import { useKasMasukData } from '../../hooks/useKasMasukData';
import PemasukanTable from '../../components/laporan/PemasukanTable';

const LaporanPemasukan: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
    const q = searchTerm.trim().toLowerCase();
    if (!q) return data;
    return data.filter(item => {
      const petugas = `${item.profiles?.first_name || ''} ${item.profiles?.last_name || ''}`.toLowerCase();
      return (
        item.nama_pemasukan.toLowerCase().includes(q) ||
        (item.keterangan || '').toLowerCase().includes(q) ||
        petugas.includes(q)
      );
    });
  }, [data, searchTerm]);

  // Centang direset saat filter berubah agar tidak menyisakan pilihan di luar hasil
  useEffect(() => setSelectedIds([]), [searchTerm, startDate, endDate]);

  const totalJumlah = useMemo(() => {
    return filteredData.reduce((sum, item) => sum + (item.jumlah || 0), 0);
  }, [filteredData]);

  const toggleRow = (id: string) =>
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const toggleAllOnPage = (checked: boolean) =>
    setSelectedIds(checked ? filteredData.map(i => i.id) : []);

  return (
    <div className="space-y-6">
      {/* Header */}
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
        // ⬇️ hanya tabel yang menunjukkan loading
        loading={loading}
        error={error}
        onFetchData={fetchKasMasuk}
        selectedIds={selectedIds}
        onToggleRow={toggleRow}
        onToggleAllPage={toggleAllOnPage}
      />
    </div>
  );
};

export default LaporanPemasukan;
