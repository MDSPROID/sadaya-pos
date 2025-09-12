import React from 'react';
import { Search, Printer, ArrowUp, ArrowDown } from 'lucide-react';
import { SalesItem, PendingOrderItem } from '../../types/orderTypes';
import { formatCurrency } from '../../utils/formatters';

type CombinedSalesItem = SalesItem | PendingOrderItem;

interface KasirOption {
  id: string;
  name: string;
}

interface CustomerOption {
  id: string;
  name: string;
}

interface SalesTableProps {
  data: CombinedSalesItem[];
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  totalSalesAmount: number;
  onPrint: () => void;
  onRowClick: (item: CombinedSalesItem) => void;
  selectedItemId: string | null;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string) => void;
  paymentStatusFilter: string;
  onPaymentStatusFilterChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  selectedPaymentMethod: string; // New prop
  onPaymentMethodChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; // New prop
  kasirOptions: KasirOption[];
  selectedKasirId: string;
  onKasirChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  customerOptions: CustomerOption[];
  selectedCustomerId: string;
  onCustomerChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const SalesTable: React.FC<SalesTableProps> = ({
  data,
  searchTerm,
  onSearchChange,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  totalSalesAmount,
  onPrint,
  onRowClick,
  selectedItemId,
  sortColumn,
  sortDirection,
  onSort,
  paymentStatusFilter,
  onPaymentStatusFilterChange,
  selectedPaymentMethod, // Destructure new prop
  onPaymentMethodChange, // Destructure new prop
  kasirOptions,
  selectedKasirId,
  onKasirChange,
  customerOptions,
  selectedCustomerId,
  onCustomerChange,
}) => {
  const renderSortIcon = (column: string) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />;
    }
    return null;
  };

  // Helper function to format payment method string
  const formatPaymentMethod = (method: string | null | undefined) => {
    if (!method) return 'N/A';
    return method.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start"> {/* Changed items-end to items-start */}
        <div className="relative sm:col-span-2 lg:col-span-2 xl:col-span-2"> {/* Adjusted col-span for search input */}
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Cari penjualan (faktur, pelanggan, kasir)..."
            value={searchTerm}
            onChange={onSearchChange}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="startDate" className="text-sm font-medium text-gray-700">Dari:</label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="endDate" className="text-sm font-medium text-gray-700">Sampai:</label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="paymentStatusFilter" className="text-sm font-medium text-gray-700">Status:</label>
          <select
            id="paymentStatusFilter"
            value={paymentStatusFilter}
            onChange={onPaymentStatusFilterChange}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          >
            <option value="all">Semua Status</option>
            <option value="paid">Lunas</option>
            <option value="pending">Tertunda</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="paymentMethodFilter" className="text-sm font-medium text-gray-700">Metode:</label>
          <select
            id="paymentMethodFilter"
            value={selectedPaymentMethod}
            onChange={onPaymentMethodChange}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          >
            <option value="all">Semua Metode</option>
            <option value="cash">Tunai</option>
            <option value="bank_transfer">Transfer Bank</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="kasirFilter" className="text-sm font-medium text-gray-700">Kasir:</label>
          <select
            id="kasirFilter"
            value={selectedKasirId}
            onChange={onKasirChange}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Semua Kasir</option>
            {kasirOptions.map(kasir => (
              <option key={kasir.id} value={kasir.id}>{kasir.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="customerFilter" className="text-sm font-medium text-gray-700">Pelanggan:</label>
          <select
            id="customerFilter"
            value={selectedCustomerId}
            onChange={onCustomerChange}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Semua Pelanggan</option>
            {customerOptions.map(customer => (
              <option key={customer.id} value={customer.id}>{customer.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={onPrint}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors w-full sm:col-span-2 lg:col-span-1 xl:col-span-1"
        >
          <Printer className="h-5 w-5 mr-2" />
          Cetak
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 text-right">
        <h2 className="text-xl font-bold text-gray-900">
          Total Penjualan: {formatCurrency(totalSalesAmount)}
        </h2>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  No.
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => onSort('order_date')}
                >
                  <div className="flex items-center">
                    Tanggal
                    {renderSortIcon('order_date')}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => onSort('invoice_number')}
                >
                  <div className="flex items-center">
                    Faktur
                    {renderSortIcon('invoice_number')}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => onSort('customer')}
                >
                  <div className="flex items-center">
                    Pelanggan
                    {renderSortIcon('customer')}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => onSort('cashier')}
                >
                  <div className="flex items-center">
                    Kasir
                    {renderSortIcon('cashier')}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => onSort('final_amount')}
                >
                  <div className="flex items-center">
                    Jumlah Total
                    {renderSortIcon('final_amount')}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => onSort('payment_status')}
                >
                  <div className="flex items-center">
                    Status Pembayaran
                    {renderSortIcon('payment_status')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Metode Pembayaran
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    Tidak ada data penjualan.
                  </td>
                </tr>
              ) : (
                data.map((item, index) => (
                  <tr
                    key={item.id}
                    className={`cursor-pointer hover:bg-gray-50 ${selectedItemId === item.id ? 'bg-blue-50' : ''}`}
                    onClick={() => onRowClick(item)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(item.order_date).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.invoice_number || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {item.customer_display_name || item.pelanggan?.[0]?.nama_pelanggan || 'Umum'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.customer_display_phone || item.pelanggan?.[0]?.telepon || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.profiles ? `${item.profiles.first_name} ${item.profiles.last_name || ''}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(item.final_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        item.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                        item.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {item.payment_status === 'paid' ? 'Lunas' :
                         item.payment_status === 'pending' ? 'Tertunda' : 'Batal'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPaymentMethod(item.payment_method)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesTable;