import React from 'react';
import { Plus } from 'lucide-react';

interface BahanHeaderProps {
  onAddClick: () => void;
}

const BahanHeader: React.FC<BahanHeaderProps> = ({ onAddClick }) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Master Bahan</h1>
        <p className="text-gray-600">Kelola data bahan untuk produksi</p>
      </div>
      <button
        onClick={onAddClick}
        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Plus className="h-5 w-5 mr-2" />
        Tambah Bahan
      </button>
    </div>
  );
};

export default BahanHeader;