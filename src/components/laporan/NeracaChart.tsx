import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList
} from 'recharts';
import { NeracaDataPoint } from '../../hooks/useNeracaData'; // Import NeracaDataPoint
import { formatCurrency } from '../../utils/formatters';

interface NeracaChartProps {
  data: NeracaDataPoint[];
  selectedSeriesKeys?: string[]; // New prop
}

const seriesConfig = [
  { key: 'Omset', color: '#8884d8' },              // ungu
  { key: 'Total Pengeluaran', color: '#ef4444' },  // merah
  { key: 'Jumlah Hutang', color: '#f59e0b' },      // amber
  { key: 'Jumlah Piutang', color: '#22c55e' },     // hijau
];

const NeracaChart: React.FC<NeracaChartProps> = ({ data, selectedSeriesKeys }) => {
  // Custom label for BarChart to show currency
  const renderCustomizedLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    const isNegative = value < 0;

    return (
      <text
        x={x + width / 2}
        y={y + (isNegative ? height + 15 : -5)} // Position below for negative, above for positive
        fill={isNegative ? '#ef4444' : '#4a5568'} // Red for negative, gray for positive
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={12}
      >
        {formatCurrency(value)}
      </text>
    );
  };

  // Determine which series to display based on selectedSeriesKeys
  const seriesToDisplay = selectedSeriesKeys
    ? seriesConfig.filter(s => selectedSeriesKeys.includes(s.key))
    : seriesConfig; // If no selection provided, show all (for daily)

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Visualisasi Keuangan</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{
            top: 20, right: 30, left: 20, bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="periodLabel" />
          <YAxis tickFormatter={(value) => formatCurrency(value)} />
          <Tooltip formatter={(value: number) => formatCurrency(value)} />
          <Legend />
          {seriesToDisplay.map(series => (
            <Bar key={series.key} dataKey={series.key} fill={series.color}>
              <LabelList dataKey={series.key} content={renderCustomizedLabel} />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default NeracaChart;