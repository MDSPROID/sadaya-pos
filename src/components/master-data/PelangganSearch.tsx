import React from 'react';
import { Search } from 'lucide-react';

interface PelangganSearchProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

const PelangganSearch: React.FC<PelangganSearchProps> = ({ searchTerm, onSearchChange }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder="Cari pelanggan..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>
  );
};

export default PelangganSearch;