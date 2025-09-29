import React, { useState, useEffect, useRef } from 'react';
import { Search, Printer } from 'lucide-react';
import { useNeracaData } from '../../hooks/useNeracaData';
import NeracaChart from '../../components/laporan/NeracaChart';

const LaporanNeraca: React.FC = () => {
  const today = new Date().toISOString().split('T')[0];
  const currentMonthYear = new Date().toISOString().substring(0, 7);
  const currentYear = new Date().getFullYear();

  // UI state (belum diterapkan)
  const [filterPeriod, setFilterPeriod] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [selectedDailyStartDate, setSelectedDailyStartDate] = useState<string>(today);
  const [selectedDailyEndDate, setSelectedDailyEndDate] = useState<string>(today);
  const [selectedMonthYear, setSelectedMonthYear] = useState<string>(currentMonthYear);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // APPLIED state (dipakai query)
  const [appliedFilterPeriod, setAppliedFilterPeriod] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [appliedStartDate, setAppliedStartDate] = useState<string>(today);
  const [appliedEndDate, setAppliedEndDate] = useState<string>(today);

  const allChartSeriesOptions = [
    { key: 'Omset', label: 'Omset' },
    { key: 'Total Pengeluaran', label: 'Total Pengeluaran' },
    { key: 'Jumlah Hutang', label: 'Jumlah Hutang' },
    { key: 'Jumlah Piutang', label: 'Jumlah Piutang' },
  ];
  const [selectedChartSeries, setSelectedChartSeries] = useState<string[]>(
    allChartSeriesOptions.map(s => s.key)
  );

  // Data hook: autoFetch=false agar default 0
  const { summary, periodData, loading, error, fetchNeracaSummary, resetToZero } = useNeracaData({
    startDate: appliedStartDate,
    endDate: appliedEndDate,
    filterPeriod: appliedFilterPeriod,
    autoFetch: false,
  });

  // Reset ke nol sekali saat mount (antisipasi HMR)
  useEffect(() => {
    resetToZero();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch hanya setelah APPLIED berubah (skip render pertama)
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    fetchNeracaSummary();
  }, [appliedStartDate, appliedEndDate, appliedFilterPeriod, fetchNeracaSummary]);

  const handleLihatClick = () => {
    let newStartDate: string;
    let newEndDate: string;
    if (filterPeriod === 'daily') {
      newStartDate = selectedDailyStartDate;
      newEndDate = selectedDailyEndDate;
    } else if (filterPeriod === 'monthly') {
      const [year, month] = selectedMonthYear.split('-');
      const lastDay = new Date(Number(year), Number(month), 0).getDate();
      newStartDate = `${year}-${month}-01`;
      newEndDate = `${year}-${month}-${lastDay}`;
    } else {
      newStartDate = `${selectedYear}-01-01`;
      newEndDate = `${selectedYear}-12-31`;
    }
    setAppliedFilterPeriod(filterPeriod);
    setAppliedStartDate(newStartDate);
    setAppliedEndDate(newEndDate);
  };

  const handlePrint = () => window.print();

  const yearsOptions = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  const handleChartSeriesToggle = (key: string) => {
    setSelectedChartSeries(prev =>
      prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]
    );
  };

  useEffect(() => {
    if (filterPeriod === 'daily') {
      setSelectedChartSeries(allChartSeriesOptions.map(s => s.key));
    } else {
      setSelectedChartSeries(['Omset']);
    }
    // hanya UI, tidak memicu fetch
  }, [filterPeriod]);

  const ValueOrSkeleton: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    loading ? <span className="inline-block h-4 w-28 bg-gray-200 rounded animate-pulse" /> : <>{children}</>;

  if (error) {
    return (
      <div className="text-center p-4 text-red-600">
        <p>Error: {error}</p>
        <button onClick={fetchNeracaSummary} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header (tidak dicetak) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Neraca</h1>
          <p className="text-gray-600">Lihat ringkasan keuangan global perusahaan.</p>
        </div>
      </div>

      {/* SECTION yang akan dicetak */}
      <div id="print-neraca-section" className="bg-white rounded-lg shadow-sm p-6">
        {/* Judul khusus untuk print (disembunyikan di layar) */}
        <h2 className="print-title text-2xl font-bold text-gray-900" style={{ display: 'none' }}>
          Laporan Neraca
        </h2>

        {/* Filter & tombol (jangan dicetak) */}
        <div className="flex flex-col md:flex-row gap-4 items-center mb-6 no-print">
          {/* Filter Period */}
          <div className="flex items-center gap-4 w-full md:w-auto">
            <label className="text-sm font-medium text-gray-700">Periode:</label>
            <div className="flex space-x-2">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="filterPeriod"
                  value="daily"
                  checked={filterPeriod === 'daily'}
                  onChange={() => setFilterPeriod('daily')}
                  className="form-radio h-4 w-4 text-blue-600"
                />
                <span className="ml-2 text-sm text-gray-700">Harian</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="filterPeriod"
                  value="monthly"
                  checked={filterPeriod === 'monthly'}
                  onChange={() => setFilterPeriod('monthly')}
                  className="form-radio h-4 w-4 text-blue-600"
                />
                <span className="ml-2 text-sm text-gray-700">Bulanan</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="filterPeriod"
                  value="yearly"
                  checked={filterPeriod === 'yearly'}
                  onChange={() => setFilterPeriod('yearly')}
                  className="form-radio h-4 w-4 text-blue-600"
                />
                <span className="ml-2 text-sm text-gray-700">Tahunan</span>
              </label>
            </div>
          </div>

          {filterPeriod === 'daily' && (
            <>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <label htmlFor="selectedDailyStartDate" className="text-sm font-medium text-gray-700">Dari:</label>
                <input
                  type="date"
                  id="selectedDailyStartDate"
                  value={selectedDailyStartDate}
                  onChange={(e) => setSelectedDailyStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <label htmlFor="selectedDailyEndDate" className="text-sm font-medium text-gray-700">Sampai:</label>
                <input
                  type="date"
                  id="selectedDailyEndDate"
                  value={selectedDailyEndDate}
                  onChange={(e) => setSelectedDailyEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </>
          )}

          {filterPeriod === 'monthly' && (
            <div className="flex items-center gap-2 w-full md:w-auto">
              <label htmlFor="selectedMonthYear" className="text-sm font-medium text-gray-700">Bulan/Tahun:</label>
              <input
                type="month"
                id="selectedMonthYear"
                value={selectedMonthYear}
                onChange={(e) => setSelectedMonthYear(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {filterPeriod === 'yearly' && (
            <div className="flex items-center gap-2 w-full md:w-auto">
              <label htmlFor="selectedYear" className="text-sm font-medium text-gray-700">Tahun:</label>
              <select
                id="selectedYear"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {yearsOptions.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleLihatClick}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full md:w-auto justify-center"
          >
            <Search className="h-5 w-5 mr-2" />
            Lihat
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Printer className="h-5 w-5 mr-2" />
            Cetak
          </button>
        </div>

        {/* Summary */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Omset:</span>
            <ValueOrSkeleton>Rp {summary.omset.toLocaleString('id-ID')}</ValueOrSkeleton>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Realisasi Tunai:</span>
            <ValueOrSkeleton>Rp {summary.order_paid_cash.toLocaleString('id-ID')}</ValueOrSkeleton>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Realisasi Transfer:</span>
            <ValueOrSkeleton>Rp {summary.order_paid_transfer.toLocaleString('id-ID')}</ValueOrSkeleton>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Non Realisasi:</span>
            <ValueOrSkeleton>Rp {summary.order_not_paid.toLocaleString('id-ID')}</ValueOrSkeleton>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-700">Kas Masuk Tunai:</span>
            <ValueOrSkeleton>Rp {summary.kas_masuk_tunai.toLocaleString('id-ID')}</ValueOrSkeleton>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Kas Masuk Transfer:</span>
            <ValueOrSkeleton>Rp {summary.kas_masuk_transfer.toLocaleString('id-ID')}</ValueOrSkeleton>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Kas Keluar Tunai:</span>
            <ValueOrSkeleton>Rp {summary.kas_keluar_tunai.toLocaleString('id-ID')}</ValueOrSkeleton>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Kas Keluar Transfer:</span>
            <ValueOrSkeleton>Rp {summary.kas_keluar_transfer.toLocaleString('id-ID')}</ValueOrSkeleton>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-700">Jumlah Saldo Tunai / Cash:</span>
            <ValueOrSkeleton>Rp {summary.jumlah_saldo_tunai.toLocaleString('id-ID')}</ValueOrSkeleton>
          </div>
          <div className="flex justify-between items-center text-base">
            <span className="text-gray-700">Jumlah Saldo Non Tunai:</span>
            <ValueOrSkeleton>Rp {summary.jumlah_saldo_non_tunai.toLocaleString('id-ID')}</ValueOrSkeleton>
          </div>

          <div className="flex justify-between items-center text-base font-semibold">
            <span className="text-gray-700">Total Jumlah Saldo:</span>
            <ValueOrSkeleton>Rp {summary.total_jumlah_saldo.toLocaleString('id-ID')}</ValueOrSkeleton>
          </div>
          <div className="flex justify-between items-center text-base font-semibold">
            <span className="text-gray-700">Total Pengeluaran:</span>
            <ValueOrSkeleton>Rp {summary.total_pengeluaran.toLocaleString('id-ID')}</ValueOrSkeleton>
          </div>

          <div className="flex justify-between items-center text-base font-semibold">
            <span className="text-gray-700">Jumlah Hutang:</span>
            <ValueOrSkeleton>Rp {summary.jumlah_hutang.toLocaleString('id-ID')}</ValueOrSkeleton>
          </div>
          <div className="flex justify-between items-center text-base font-semibold">
            <span className="text-gray-700">Jumlah Piutang:</span>
            <ValueOrSkeleton>Rp {summary.jumlah_piutang.toLocaleString('id-ID')}</ValueOrSkeleton>
          </div>

          <div className="flex justify-between items-center text-base font-bold">
            <span className="text-gray-700">Saldo Seharusnya:</span>
            <ValueOrSkeleton>Rp {summary.saldo_seharusnya.toLocaleString('id-ID')}</ValueOrSkeleton>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-600 mt-2">
            Error: {error} <button onClick={fetchNeracaSummary} className="underline">Coba lagi</button>
          </div>
        )}
      </div>

      {/* CHART (tidak ikut cetak) */}
      <div className="bg-white rounded-lg shadow-sm p-6 no-print">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Visualisasi Keuangan</h3>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Data untuk Grafik:</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {allChartSeriesOptions.map(series => (
              <label key={series.key} className="inline-flex items-center">
                <input
                  type="checkbox"
                  value={series.key}
                  checked={selectedChartSeries.includes(series.key)}
                  onChange={() => handleChartSeriesToggle(series.key)}
                  className="form-checkbox h-4 w-4 text-blue-600"
                  disabled={loading}
                />
                <span className="ml-2 text-sm text-gray-700">{series.label}</span>
              </label>
            ))}
          </div>
        </div>
        <NeracaChart data={periodData} selectedSeriesKeys={selectedChartSeries} loading={loading} />
      </div>

      {/* CSS PRINT HARUS berada di dalam JSX agar aktif */}
      <style>
        {`
          @media print {
            /* Sembunyikan semua */
            body * { visibility: hidden !important; }

            /* Tampilkan hanya section neraca + isinya */
            #print-neraca-section, #print-neraca-section * {
              visibility: visible !important;
            }

            /* Judul khusus print: tampilkan */
            .print-title { display: block !important; margin-bottom: 12px; }

            /* Sembunyikan semua yang bertanda no-print */
            .no-print { display: none !important; }

            /* Taruh section di halaman penuh & rapikan */
            #print-neraca-section {
              position: absolute; inset: 0; width: 100%;
              box-shadow: none !important;
            }

            @page { margin: 16mm; }
          }
        `}
      </style>
    </div>
  );
};

export default LaporanNeraca;
