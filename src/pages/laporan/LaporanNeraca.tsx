import React, { useState, useEffect, useMemo } from 'react';
import { Search, Printer, Info } from 'lucide-react';
import { useNeracaData } from '../../hooks/useNeracaData';
import NeracaChart from '../../components/laporan/NeracaChart';

const InfoTip: React.FC<{ text: string }> = ({ text }) => {
  // Ikon selalu terlihat; bubble tooltip hanya untuk hover (disembunyikan saat print)
  return (
    <span className="relative inline-flex items-center align-middle group">
      <button
        type="button"
        className="p-0.5 -m-0.5 outline-none info-icon-wrapper"
        aria-label="Info"
        title={text} // fallback native
      >
        {/* class info-icon --> dipaksa terlihat & warna hitam saat print */}
        <Info className="info-icon h-4 w-4 ml-2 text-gray-400 group-hover:text-gray-600" aria-hidden="true" />
      </button>
      {/* bubble tooltip (non-print) */}
      <span className="info-tip-bubble pointer-events-none absolute left-1/2 top-full z-20 hidden -translate-x-1/2 translate-y-2 whitespace-pre rounded bg-gray-900 px-2 py-1 text-xs text-white shadow-lg group-hover:block">
        {text}
      </span>
    </span>
  );
};

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

  // APPLIED state (dipakai data & label periode)
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

  // Data hook: autoFetch=false agar default 0 sampai user klik
  const { summary, periodData, loading, error, fetchNeracaSummary, resetToZero } = useNeracaData({
    startDate: appliedStartDate,
    endDate: appliedEndDate,
    filterPeriod: appliedFilterPeriod,
    autoFetch: false,
  });

  // Pastikan awalnya nol (tanpa auto-fetch)
  useEffect(() => {
    resetToZero();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tombol Lihat → commit UI ke APPLIED, lalu fetch dengan override (hindari race setState)
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

    // Fetch langsung dengan parameter yang sama (tidak menunggu state ter-commit)
    fetchNeracaSummary({
      startDate: newStartDate,
      endDate: newEndDate,
      filterPeriod,
    });
  };

  const handlePrint = () => window.print();

  // Label periode (berdasarkan APPLIED agar sesuai data yang tampil)
  const periodeLabel = useMemo(() => {
    const fmt = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    if (appliedFilterPeriod === 'daily') {
      return appliedStartDate === appliedEndDate
        ? `Periode: ${fmt(appliedStartDate)}`
        : `Periode: ${fmt(appliedStartDate)} – ${fmt(appliedEndDate)}`;
    }
    if (appliedFilterPeriod === 'monthly') {
      const d = new Date(appliedStartDate);
      return `Periode: ${d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`;
    }
    // yearly
    return `Periode: ${new Date(appliedStartDate).getFullYear()}`;
  }, [appliedFilterPeriod, appliedStartDate, appliedEndDate]);

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
  }, [filterPeriod]);

  const ValueOrSkeleton: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    loading ? <span className="inline-block h-4 w-28 bg-gray-200 rounded animate-pulse" /> : <>{children}</>;

  if (error) {
    return (
      <div className="text-center p-4 text-red-600">
        <p>Error: {error}</p>
        <button onClick={() => fetchNeracaSummary({
          startDate: appliedStartDate,
          endDate: appliedEndDate,
          filterPeriod: appliedFilterPeriod,
        })} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
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
        {/* Judul + periode (tampil di layar & ikut tercetak) */}
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900">Laporan Neraca</h2>
          <p className="text-sm text-gray-600">{periodeLabel}</p>
        </div>

        {/* Filter & tombol (jangan dicetak) */}
        <div className="flex flex-col md:flex-row gap-4 items-center mb-6 no-print">
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

        {/* Summary + tooltips */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-gray-700 inline-flex items-center">
              Omset <InfoTip text="Total penjualan fix yang sudah lunas maupun belum lunas" />
            </span>
            <ValueOrSkeleton>Rp {summary.omset.toLocaleString('id-ID')}</ValueOrSkeleton>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-700 inline-flex items-center">
              Realisasi Tunai <InfoTip text="Jumlah uang masuk yang sudah fix order dengan metode pembayaran tunai" />
            </span>
            <ValueOrSkeleton>Rp {summary.order_paid_cash.toLocaleString('id-ID')}</ValueOrSkeleton>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-700 inline-flex items-center">
              Realisasi Transfer <InfoTip text="Jumlah uang masuk yang sudah fix order dengan metode pembayaran transfer" />
            </span>
            <ValueOrSkeleton>Rp {summary.order_paid_transfer.toLocaleString('id-ID')}</ValueOrSkeleton>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-700 inline-flex items-center">
              Non Realisasi <InfoTip text="Jumlah fix order yang belum bayar" />
            </span>
            <ValueOrSkeleton>Rp {summary.order_not_paid.toLocaleString('id-ID')}</ValueOrSkeleton>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-700 inline-flex items-center">
              Kas Masuk Tunai <InfoTip text="Total dari pemasukan menu 'Kas masuk' tunai" />
            </span>
            <ValueOrSkeleton>Rp {summary.kas_masuk_tunai.toLocaleString('id-ID')}</ValueOrSkeleton>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-700 inline-flex items-center">
              Kas Masuk Transfer <InfoTip text="Total dari pemasukan menu 'Kas masuk' transfer" />
            </span>
            <ValueOrSkeleton>Rp {summary.kas_masuk_transfer.toLocaleString('id-ID')}</ValueOrSkeleton>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-700 inline-flex items-center">
              Kas Keluar Tunai <InfoTip text="Total dari pengeluaran menu 'Kas keluar' tunai" />
            </span>
            <ValueOrSkeleton>Rp {summary.kas_keluar_tunai.toLocaleString('id-ID')}</ValueOrSkeleton>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-700 inline-flex items-center">
              Kas Keluar Transfer <InfoTip text="Total dari pengeluaran menu 'Kas keluar' transfer" />
            </span>
            <ValueOrSkeleton>Rp {summary.kas_keluar_transfer.toLocaleString('id-ID')}</ValueOrSkeleton>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-700 inline-flex items-center">
              Jumlah Saldo Tunai / Cash <InfoTip text="Total jumlah realisasi tunai + kas masuk tunai" />
            </span>
            <ValueOrSkeleton>Rp {summary.jumlah_saldo_tunai.toLocaleString('id-ID')}</ValueOrSkeleton>
          </div>

          <div className="flex justify-between items-center text-base">
            <span className="text-gray-700 inline-flex items-center">
              Jumlah Saldo Transfer <InfoTip text="Total jumlah realisasi transfer + kas masuk transfer" />
            </span>
            <ValueOrSkeleton>Rp {summary.jumlah_saldo_non_tunai.toLocaleString('id-ID')}</ValueOrSkeleton>
          </div>

          <div className="flex justify-between items-center text-base font-semibold">
            <span className="text-gray-700 inline-flex items-center">
              Total Jumlah Saldo <InfoTip text="Jumlah saldo tunai + non tunai" />
            </span>
            <ValueOrSkeleton>Rp {summary.total_jumlah_saldo.toLocaleString('id-ID')}</ValueOrSkeleton>
          </div>

          <div className="flex justify-between items-center text-base font-semibold">
            <span className="text-gray-700 inline-flex items-center">
              Total Pengeluaran <InfoTip text="Penjumlahan dari kas keluar" />
            </span>
            <ValueOrSkeleton>Rp {summary.total_pengeluaran.toLocaleString('id-ID')}</ValueOrSkeleton>
          </div>

          <div className="flex justify-between items-center text-base font-semibold">
            <span className="text-gray-700 inline-flex items-center">
              Jumlah Hutang <InfoTip text="Jumlah hutang ke supplier" />
            </span>
            <ValueOrSkeleton>Rp {summary.jumlah_hutang.toLocaleString('id-ID')}</ValueOrSkeleton>
          </div>

          <div className="flex justify-between items-center text-base font-semibold">
            <span className="text-gray-700 inline-flex items-center">
              Jumlah Piutang <InfoTip text="Jumlah fix order yang belum bayar" />
            </span>
            <ValueOrSkeleton>Rp {summary.jumlah_piutang.toLocaleString('id-ID')}</ValueOrSkeleton>
          </div>

          <div className="flex justify-between items-center text-base font-bold">
            <span className="text-gray-700 inline-flex items-center">
              Saldo Seharusnya <InfoTip text="Jumlah saldo + jumlah piutang - jumlah hutang" />
            </span>
            <ValueOrSkeleton>Rp {summary.saldo_seharusnya.toLocaleString('id-ID')}</ValueOrSkeleton>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-600 mt-2">
            Error: {error}{' '}
            <button
              onClick={() => fetchNeracaSummary({
                startDate: appliedStartDate,
                endDate: appliedEndDate,
                filterPeriod: appliedFilterPeriod,
              })}
              className="underline"
            >
              Coba lagi
            </button>
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
            /* Sembunyikan semua di luar section */
            body * { visibility: hidden !important; }

            /* Tampilkan hanya section neraca + isinya */
            #print-neraca-section, #print-neraca-section * {
              visibility: visible !important;
            }

            /* Sembunyikan semua yang bertanda no-print */
            .no-print { display: none !important; }

            /* Pastikan section rapi di halaman */
            #print-neraca-section {
              position: absolute; inset: 0; width: 100%;
              box-shadow: none !important;
              background: #fff !important;
            }

            /* ---- Tooltip/ikon print fixes ---- */
            /* Bubble tooltip jangan dicetak */
            .info-tip-bubble { display: none !important; }

            /* Paksa ikon terlihat jelas saat print */
            .info-icon-wrapper { display: inline-flex !important; }
            .info-icon {
              display:none;
              // color: #000 !important;
              // stroke: #000 !important;
              // -webkit-print-color-adjust: exact !important;
              // print-color-adjust: exact !important;
            }

            @page { margin: 16mm; }
          }
        `}
      </style>
    </div>
  );
};

export default LaporanNeraca;
