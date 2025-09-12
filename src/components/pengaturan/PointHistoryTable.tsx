import React from 'react';
import { Search } from 'lucide-react';
import { PointHistoryItem } from '../../hooks/usePointHistory';

interface PointHistoryTableProps {
  data: PointHistoryItem[];
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const PointHistoryTable: React.FC<PointHistoryTableProps> = ({
  data,
  searchTerm,
  onSearchChange,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Riwayat Poin</h3>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder="Cari riwayat poin (nama anggota, keterangan, tipe)..."
          value={searchTerm}
          onChange={onSearchChange}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No.</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Anggota</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Poin</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipe</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keterangan</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dicatat Oleh</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-2 text-center text-sm text-gray-500">Tidak ada riwayat poin.</td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{new Date(item.created_at).toLocaleDateString('id-ID')}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                    {item.member_profile ? `${item.member_profile.first_name} ${item.member_profile.last_name || ''}` : 'N/A'}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      item.point_change > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {item.point_change > 0 ? '+' : ''}{item.point_change.toLocaleString('id-ID')}
                    </span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                    {item.type === 'earned' ? 'Didapat' : 'Ditukar'}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">{item.description || '-'}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                    {item.recorded_by_profile ? `${item.recorded_by_profile.first_name} ${item.recorded_by_profile.last_name || ''}` : 'N/A'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PointHistoryTable;