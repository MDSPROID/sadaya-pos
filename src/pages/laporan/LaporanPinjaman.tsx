import React, { useState, useMemo, useEffect } from 'react';
import { usePinjamanKaryawanData } from '../../hooks/usePinjamanKaryawanData';
import PinjamanTable from '../../components/laporan/PinjamanTable';

const LaporanPinjaman: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data, loading, error, fetchPinjamanKaryawan } =
    usePinjamanKaryawanData({ startDate, endDate });

  // 🔁 Refresh data tabel saat tanggal berubah (tanpa refresh 1 halaman)
  useEffect(() => {
    fetchPinjamanKaryawan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const filteredData = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return data;
    return data.filter(item => {
      const nama = `${item.profiles_karyawan?.first_name || ''} ${item.profiles_karyawan?.last_name || ''}`.toLowerCase();
      return nama.includes(q) || (item.keterangan || '').toLowerCase().includes(q);
    });
  }, [data, searchTerm]);

  // Centang direset saat filter berubah agar tidak menyisakan pilihan di luar hasil
  useEffect(() => setSelectedIds([]), [searchTerm, startDate, endDate]);

  const totalPiutang = useMemo(() => {
    return filteredData.reduce((sum, item) => sum + (item.sisa_pinjaman || 0), 0);
  }, [filteredData]);

  const toggleRow = (id: string) =>
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const toggleAllOnPage = (checked: boolean) =>
    setSelectedIds(checked ? filteredData.map(i => i.id) : []);

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
        loading={loading}   // ⬅️ hanya tabel yang loading
        error={error}
        onFetchData={fetchPinjamanKaryawan}
        selectedIds={selectedIds}
        onToggleRow={toggleRow}
        onToggleAllPage={toggleAllOnPage}
      />
    </div>
  );
};

export default LaporanPinjaman;
