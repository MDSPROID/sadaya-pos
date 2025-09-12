import React from 'react';
import { Search } from 'lucide-react';
import { PurchaseOrderFormData } from '../../types/purchaseOrderTypes';

interface SupplierFormProps {
  formData: PurchaseOrderFormData;
  onFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onSelectSupplierClick: () => void;
}

const SupplierForm: React.FC<SupplierFormProps> = ({ formData, onFormChange, onSelectSupplierClick }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 flex-shrink-0">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Supplier</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="supplier_id" className="block text-sm font-medium text-gray-700 mb-1">
            ID Supplier
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              id="supplier_id"
              value={formData.supplier_id ? `${formData.supplier_id.substring(0, 8)}...` : ''}
              disabled
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
              placeholder="Pilih supplier..."
            />
            <button
              type="button"
              onClick={onSelectSupplierClick}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div>
          <label htmlFor="supplier_name" className="block text-sm font-medium text-gray-700 mb-1">
            Nama
          </label>
          <input
            type="text"
            id="supplier_name"
            name="supplier_name"
            value={formData.supplier_name}
            onChange={onFormChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Nama Supplier"
          />
        </div>
        <div>
          <label htmlFor="supplier_phone" className="block text-sm font-medium text-gray-700 mb-1">
            HP/Telp
          </label>
          <input
            type="text"
            id="supplier_phone"
            name="supplier_phone"
            value={formData.supplier_phone}
            onChange={onFormChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Nomor Telepon"
          />
        </div>
        {/* Removed Email Field */}
        {/*
        <div>
          <label htmlFor="supplier_email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="supplier_email"
            name="supplier_email"
            value={formData.supplier_email}
            onChange={onFormChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Email Supplier"
          />
        </div>
        */}
        <div>
          <label htmlFor="supplier_address" className="block text-sm font-medium text-gray-700 mb-1">
            Alamat
          </label>
          <textarea
            id="supplier_address"
            name="supplier_address"
            rows={2}
            value={formData.supplier_address}
            onChange={onFormChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Alamat Supplier"
          />
        </div>
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
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Catatan
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            value={formData.notes}
            onChange={onFormChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Catatan untuk pesanan ini"
          />
        </div>
      </div>
    </div>
  );
};

export default SupplierForm;