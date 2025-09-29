import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList
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
  const renderCustomizedLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    const isNegative = value < 0;
    return (
      <text
        x={x + width / 2}
        y={y + (isNegative ? height + 15 : -5)}
        fill={isNegative ? '#ef4444' : '#4a5568'}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={12}
      >
        {formatCurrency(value)}
      </text>
    );
  };

  const seriesToDisplay = selectedSeriesKeys
    ? seriesConfig.filter(s => selectedSeriesKeys.includes(s.key))
    : seriesConfig;

  const safeData: NeracaDataPoint[] = (data && data.length > 0)
    ? data
    : [{ periodLabel: '-', sortKey: '-', Omset: 0, 'Total Pengeluaran': 0, 'Jumlah Hutang': 0, 'Jumlah Piutang': 0 }];

  const allSelectedSeriesZero = (payload: any) =>
    seriesToDisplay.every(s => Number(payload?.[s.key] ?? 0) === 0);

  const primaryKey = seriesToDisplay[0]?.key;

  const labelContentFor = (seriesKey: string) => (props: any) => {
    const { payload, value } = props;
    const isAllZero = allSelectedSeriesZero(payload);
    if (isAllZero) {
      if (seriesKey === primaryKey) return renderCustomizedLabel({ ...props, value: 0 });
      return null;
    }
    if (!value) return null;
    return renderCustomizedLabel(props);
  };

  return (
    <div className="relative">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={safeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="periodLabel" />
            <YAxis tickFormatter={(value) => formatCurrency(value)} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend />
            {seriesToDisplay.map(series => (
              <Bar key={series.key} dataKey={series.key} fill={series.color}>
                <LabelList dataKey={series.key} content={labelContentFor(series.key)} />
              </Bar>
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
