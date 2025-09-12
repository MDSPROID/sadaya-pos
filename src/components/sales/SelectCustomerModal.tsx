import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface Customer {
  id: string;
  nama_pelanggan: string;
  organisasi: string | null;
  telepon: string | null;
  email: string | null;
  alamat: string | null;
  jenis_member: { nama: string } | null;
  npwp: string | null;
  ppn: boolean;
  current_points: number;
}

interface SelectCustomerModalProps {
  onClose: () => void;
  onSelect: (customer: Customer) => void;
  customerOptions: Customer[];
}

const SelectCustomerModal: React.FC<SelectCustomerModalProps> = ({ onClose, onSelect, customerOptions }) => {
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');

  const filteredCustomers = customerOptions.filter(c =>
    c.nama_pelanggan.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    c.telepon?.toLowerCase().includes(customerSearchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
        <h3 className="text-lg font-semibold mb-4">Pilih Pelanggan</h3>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Cari pelanggan..."
            value={customerSearchTerm}
            onChange={(e) => setCustomerSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {filteredCustomers.length === 0 ? (
            <p className="text-gray-500 text-sm">Tidak ada pelanggan ditemukan.</p>
          ) : (
            filteredCustomers.map(c => (
              <button
                key={c.id}
                onClick={() => onSelect(c)}
                className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <p className="font-medium text-gray-900">{c.nama_pelanggan}</p>
                <p className="text-sm text-gray-500">{c.telepon || 'N/A'} - {c.jenis_member?.nama || 'Umum'}</p>
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

export default SelectCustomerModal;