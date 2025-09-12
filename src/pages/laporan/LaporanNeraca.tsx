import React, { useState, useEffect } from 'react';
import { Search, Printer } from 'lucide-react';
import { useNeracaData } from '../../hooks/useNeracaData';
import NeracaChart from '../../components/laporan/NeracaChart'; // Import NeracaChart

const LaporanNeraca: React.FC = () => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const currentMonthYear = new Date().toISOString().substring(0, 7); // YYYY-MM
  const currentYear = new Date().getFullYear();

  const [filterPeriod, setFilterPeriod] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [selectedDailyStartDate, setSelectedDailyStartDate] = useState<string>(today);
  const [selectedDailyEndDate, setSelectedDailyEndDate] = useState<string>(today);
  const [selectedMonthYear, setSelectedMonthYear] = useState<string>(currentMonthYear);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);

  const allChartSeriesOptions = [
    { key: 'Pemasukan', label: 'Pemasukan' },
    { key: 'Pengeluaran', label: 'Pengeluaran' },
    { key: 'Saldo Akhir', label: 'Saldo Akhir' },
    { key: 'Piutang', label: 'Piutang' },
    { key: 'Omset', label: 'Omset' },
    { key: 'Laba Penjualan', label: 'Laba Penjualan' },
    { key: 'Pembelian', label: 'Pembelian' },
  ];
  const [selectedChartSeries, setSelectedChartSeries] = useState<string[]>(allChartSeriesOptions.map(s => s.key)); // Default to all for daily

  // Effect to update startDate and endDate based on filterPeriod and selected dates
  useEffect(() => {
    let newStartDate: string;
    let newEndDate: string;

    if (filterPeriod === 'daily') {
      newStartDate = selectedDailyStartDate;
      newEndDate = selectedDailyEndDate;
    } else if (filterPeriod === 'monthly') {
      const [year, month] = selectedMonthYear.split('-');
      newStartDate = `${year}-${month}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      newEndDate = `${year}-${month}-${lastDay}`;
    } else { // yearly
      newStartDate = `${selectedYear}-01-01`;
      newEndDate = `${selectedYear}-12-31`;
    }

    setStartDate(newStartDate);
    setEndDate(newEndDate);
  }, [filterPeriod, selectedDailyStartDate, selectedDailyEndDate, selectedMonthYear, selectedYear]);

  const { summary, periodData, loading, error, fetchNeracaSummary } = useNeracaData({ startDate, endDate, filterPeriod });

  const handleLihatClick = () => {
    fetchNeracaSummary(); // Re-fetch data based on current date range
  };

  const handlePrint = () => {
    window.print();
  };

  const yearsOptions = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i); // Last 10 years

  const handleChartSeriesToggle = (key: string) => {
    setSelectedChartSeries(prev =>
      prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]
    );
  };

  // Reset selected series to all when switching to daily filter
  // And reset to a default single selection for monthly/yearly
  useEffect(() => {
    if (filterPeriod === 'daily') {
      setSelectedChartSeries(allChartSeriesOptions.map(s => s.key));
    } else {
      // For monthly/yearly, default to 'Pemasukan' or first available series
      setSelectedChartSeries(['Pemasukan']);
    }
  }, [filterPeriod]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">Memuat laporan neraca...</p>
      </div>
    );
  }

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Neraca</h1>
          <p className="text-gray-600">Lihat ringkasan keuangan global perusahaan.</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Laporan Global</h3>
        <div className="flex flex-col md:flex-row gap-4 items-center mb-6">
          {/* Filter Period Selection */}
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

          {/* Date Inputs based on filterPeriod */}
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
        </div>

        {/* Summary Section */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Omset:</span>
            <span className="font-medium text-gray-900">Rp {summary.omset.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Laba Penjualan:</span>
            <span className="font-medium text-gray-900">Rp {summary.laba_penjualan.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Piutang:</span>
            <span className="font-medium text-gray-900">Rp {summary.piutang.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Pembelian:</span>
            <span className="font-medium text-gray-900">Rp {summary.pembelian.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Pemasukan:</span>
            <span className="font-medium text-gray-900">Rp {summary.pemasukan.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Pengeluaran:</span>
            <span className="font-medium text-gray-900">Rp {summary.pengeluaran.toLocaleString('id-ID')}</span>
          </div>
          <div className="border-t border-gray-200 pt-3 mt-3 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Jumlah Uang Masuk:</span>
              <span className="font-semibold text-green-600">Rp {summary.jumlah_uang_masuk.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Jumlah Uang Keluar:</span>
              <span className="font-semibold text-red-600">Rp {summary.jumlah_uang_keluar.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Jumlah Piutang:</span>
              <span className="font-semibold text-yellow-600">Rp {summary.jumlah_piutang_aktif.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between items-center text-lg font-bold">
              <span className="text-gray-900">Jumlah Saldo Akhir:</span>
              <span className="text-blue-600">Rp {summary.jumlah_saldo_akhir.toLocaleString('id-ID')}</span>
            </div>
            {/* New fields for Saldo Cash and Saldo Bank Transfer */}
            <div className="flex justify-between items-center text-base font-semibold">
              <span className="text-gray-700">Jumlah Saldo Cash:</span>
              <span className="text-gray-900">Rp {summary.jumlah_saldo_cash.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between items-center text-base font-semibold">
              <span className="text-gray-700">Jumlah Saldo Bank Transfer:</span>
              <span className="text-gray-900">Rp {summary.jumlah_saldo_bank_transfer.toLocaleString('id-ID')}</span>
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <button
              onClick={handlePrint}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Printer className="h-5 w-5 mr-2" />
              Cetak
            </button>
          </div>
        </div>
      </div>

      {/* Chart Section (now below summary) */}
      <div className="bg-white rounded-lg shadow-sm p-6"> {/* Added bg-white and padding for the chart section */}
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Visualisasi Keuangan</h3>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pilih Data untuk Grafik:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {allChartSeriesOptions.map(series => (
              <label key={series.key} className="inline-flex items-center">
                <input
                  type="checkbox"
                  value={series.key}
                  checked={selectedChartSeries.includes(series.key)}
                  onChange={() => handleChartSeriesToggle(series.key)}
                  className="form-checkbox h-4 w-4 text-blue-600"
                />
                <span className="ml-2 text-sm text-gray-700">{series.label}</span>
              </label>
            ))}
          </div>
        </div>
        <NeracaChart data={periodData} selectedSeriesKeys={selectedChartSeries} />
      </div>

      {/* Cetak Laporan Tahunan Section (remains outside the main grid for better layout) */}
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cetak Laporan Tahunan</h3>
        <div>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {yearsOptions.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <button className="w-full flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors justify-center">
          <Printer className="h-5 w-5 mr-2" />
          Laporan Penjualan Tahunan
        </button>
        <button className="w-full flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors justify-center">
          <Printer className="h-5 w-5 mr-2" />
          Laporan Penjualan Per Pelanggan
        </button>
        <button className="w-full flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors justify-center">
          <Printer className="h-5 w-5 mr-2" />
          Laporan Pengeluaran
        </button>
        <button className="w-full flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors justify-center">
          <Printer className="h-5 w-5 mr-2" />
          Laporan Pengeluaran Bahan
        </button>
        <p className="text-sm text-gray-500 mt-4">
          * Laporan tahunan akan diimplementasikan di kemudian hari.
        </p>
      </div>
    </div>
  );
};

export default LaporanNeraca;