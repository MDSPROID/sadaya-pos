import React from 'react';
import { Search } from 'lucide-react';

interface CustomerFormData {
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_notes: string;
  order_date: string;
  pickup_date: string;
  priority: string;
}

interface CustomerFormProps {
  formData: CustomerFormData;
  onFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onSelectCustomerClick: () => void;
}

const CustomerForm: React.FC<CustomerFormProps> = ({ formData, onFormChange, onSelectCustomerClick }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 flex-shrink-0">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Pembeli</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="customer_id" className="block text-sm font-medium text-gray-700 mb-1">
            ID Member
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              id="customer_id"
              value={formData.customer_id ? `${formData.customer_id.substring(0, 8)}...` : ''}
              disabled
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
              placeholder="Pilih pelanggan..."
            />
            <button
              type="button"
              onClick={onSelectCustomerClick}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div>
          <label htmlFor="customer_name" className="block text-sm font-medium text-gray-700 mb-1">
            Nama
          </label>
          <input
            type="text"
            id="customer_name"
            name="customer_name"
            value={formData.customer_name}
            onChange={onFormChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Nama Pelanggan"
          />
        </div>
        <div>
          <label htmlFor="customer_phone" className="block text-sm font-medium text-gray-700 mb-1">
            HP/Telp
          </label>
          <input
            type="text"
            id="customer_phone"
            name="customer_phone"
            value={formData.customer_phone}
            onChange={(e) => {
              let onlyDigits = e.target.value.replace(/\D/g, '');
              if (onlyDigits.length > 16) {
                onlyDigits = onlyDigits.slice(0, 16);
              }
              onFormChange({
                target: {
                  name: 'customer_phone',
                  value: onlyDigits,
                },
              } as any);
            }}
            maxLength={16} 
            inputMode="numeric"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Nomor Telepon"
          />
        </div>
        <div>
          <label htmlFor="customer_address" className="block text-sm font-medium text-gray-700 mb-1">
            Alamat
          </label>
          <textarea
            id="customer_address"
            name="customer_address"
            rows={2}
            value={formData.customer_address}
            onChange={onFormChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Alamat Pelanggan"
          />
        </div>
        <div>
          <label htmlFor="customer_notes" className="block text-sm font-medium text-gray-700 mb-1">
            Catatan
          </label>
          <textarea
            id="customer_notes"
            name="customer_notes"
            rows={2}
            value={formData.customer_notes}
            onChange={onFormChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Catatan untuk pelanggan"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="order_date" className="block text-sm font-medium text-gray-700 mb-1">
              Tanggal Pesanan
            </label>
            <input
              type="date"
              id="order_date"
              name="order_date"
              value={formData.order_date}
              onChange={onFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="pickup_date" className="block text-sm font-medium text-gray-700 mb-1">
              Tanggal Pengambilan
            </label>
            <input
              type="date"
              id="pickup_date"
              name="pickup_date"
              value={formData.pickup_date}
              onChange={onFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
            Prioritas
          </label>
          <select
            id="priority"
            name="priority"
            value={formData.priority}
            onChange={onFormChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="normal">Normal</option>
            <option value="high">Tinggi</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default CustomerForm;