import React from 'react';
import { Search } from 'lucide-react';

interface BahanSearchProps {
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const BahanSearch: React.FC<BahanSearchProps> = ({ searchTerm, onSearchChange }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder="Cari bahan..."
          value={searchTerm}
          onChange={onSearchChange}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>
  );
};

export default BahanSearch;