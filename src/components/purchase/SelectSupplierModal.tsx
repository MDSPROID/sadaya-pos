import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Supplier } from '../../types/purchaseOrderTypes';

interface SelectSupplierModalProps {
  onClose: () => void;
  onSelect: (supplier: Supplier) => void;
  supplierOptions: Supplier[];
}

const SelectSupplierModal: React.FC<SelectSupplierModalProps> = ({ onClose, onSelect, supplierOptions }) => {
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');

  const filteredSuppliers = supplierOptions.filter(s =>
    s.nama.toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
    s.telepon?.toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
    s.jenis_supplier?.toLowerCase().includes(supplierSearchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
        <h3 className="text-lg font-semibold mb-4">Pilih Supplier</h3>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Cari supplier..."
            value={supplierSearchTerm}
            onChange={(e) => setSupplierSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {filteredSuppliers.length === 0 ? (
            <p className="text-gray-500 text-sm">Tidak ada supplier ditemukan.</p>
          ) : (
            filteredSuppliers.map(s => (
              <button
                key={s.id}
                onClick={() => { onSelect(s); onClose(); }}
                className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <p className="font-medium text-gray-900">{s.nama}</p>
                <p className="text-sm text-gray-500">{s.telepon || 'N/A'} - {s.jenis_supplier || 'Umum'}</p>
              </button>
            ))
          )}
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Tutup</button>
        </div>
      </div>
    </div>
  );
};

export default SelectSupplierModal;