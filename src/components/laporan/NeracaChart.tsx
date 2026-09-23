import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { NeracaDataPoint } from '../../hooks/useNeracaData';
import { formatCurrency } from '../../utils/formatters';

interface NeracaChartProps {
  data: NeracaDataPoint[];
  selectedSeriesKeys?: string[];
  loading?: boolean;
}

const seriesConfig = [
  { key: 'Omset', color: '#8884d8' },
  { key: 'Total Pengeluaran', color: '#ef4444' },
  { key: 'Jumlah Hutang', color: '#f59e0b' },
  { key: 'Jumlah Piutang', color: '#22c55e' },
];

const NeracaChart: React.FC<NeracaChartProps> = ({ data, selectedSeriesKeys, loading }) => {
  const seriesToDisplay = selectedSeriesKeys
    ? seriesConfig.filter(s => selectedSeriesKeys.includes(s.key))
    : seriesConfig;

  const safeData: NeracaDataPoint[] = (data && data.length > 0)
    ? data
    : [{ periodLabel: '-', sortKey: '-', Omset: 0, 'Total Pengeluaran': 0, 'Jumlah Hutang': 0, 'Jumlah Piutang': 0 }];

  // FIX: Buat chartKey unik dari total nilai data agar Recharts remount saat data berubah
  // Recharts kadang tidak re-render meski props berubah jika array length-nya sama
  const chartKey = safeData.reduce((sum, d) => sum + d.Omset + d['Total Pengeluaran'], 0);

  return (
    <div className="relative">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart key={chartKey} data={safeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="periodLabel" />
            <YAxis tickFormatter={(value) => formatCurrency(value)} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend />
            {/* Tanpa label angka di atas batang — nilainya dibaca lewat tooltip saat kursor diarahkan ke batang. */}
            {seriesToDisplay.map(series => (
              <Bar key={series.key} dataKey={series.key} fill={series.color} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {loading && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center rounded-lg">
          <span className="text-gray-700">Memuat grafik…</span>
        </div>
      )}
    </div>
  );
};

export default NeracaChart;