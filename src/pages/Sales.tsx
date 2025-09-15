import React, { useState } from 'react';
import { useSalesData } from '../hooks/useSalesData';
import { useSalesOrder } from '../hooks/useSalesOrder';
import { showError } from '../utils/toast';
import { useLocation,useNavigate } from 'react-router-dom';
import { useHistoryPendingSalesData } from '../hooks/useHistoryPendingSalesData'; // Import useHistoryPendingSalesData

// Import modular components
import CustomerForm from '../components/sales/CustomerForm';
import ProductInputForm from '../components/sales/ProductInputForm';
import OrderItemsTable from '../components/sales/OrderItemsTable';
import OrderSummary from '../components/sales/OrderSummary';
import SelectCustomerModal from '../components/sales/SelectCustomerModal';
import SelectProductModal from '../components/sales/SelectProductModal';
import ProductDetailModal from '../components/sales/ProductDetailModal';
import PaymentModal from '../components/sales/PaymentModal';

const Sales: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const loadOrderId = (location.state as { loadOrderId?: string })?.loadOrderId;

  const {
    customerOptions,
    productOptions,
    designerOptions,
    finishingOptions,
    bahanOptions,
    bankOptions,
    loadingData,
    errorData,
    fetchAllSalesData,
  } = useSalesData();

  // Get fetchPendingSales from useHistoryPendingSalesData
  const { fetchPendingSales } = useHistoryPendingSalesData({ durationFilter: 'all', searchTerm: '' });

  const {
    orderFormData,
    selectedProduct,
    itemQuantity,
    setItemQuantity,
    itemNotes,
    setItemNotes,
    itemDimensions,
    setItemDimensions,
    itemDiscount,
    setItemDiscount,
    itemAdditionalOptions,
    currentItemSubtotal,
    handleFormChange,
    handleSelectCustomer,
    handleSelectProduct,
    handleUpdateProductDetailsFromModal,
    handleAddItemToOrder,
    handleRemoveItem,
    handleUpdateItemDesigner,
    handleSaveOrder,
  } = useSalesOrder(loadOrderId, productOptions, designerOptions, customerOptions, fetchPendingSales); // Pass fetchPendingSales

  const [showSelectCustomerModal, setShowSelectCustomerModal] = useState(false);
  const [showSelectProductModal, setShowSelectProductModal] = useState(false);
  const [showProductDetailModal, setShowProductDetailModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const handleOpenProductDetailModal = () => {
    if (!selectedProduct) {
      showError('Pilih produk terlebih dahulu untuk melihat detail.');
      return;
    }
    setShowProductDetailModal(true);
  };

  const handleOpenPaymentModal = () => {
    if (orderFormData.items.length === 0) {
      showError('Keranjang belanja kosong. Tambahkan item terlebih dahulu.');
      return;
    }
    setShowPaymentModal(true);
  };

  const handleProcessPayment = async (paymentDetails: {
    dp_amount: number;
    paid_amount: number;
    payment_method: 'cash' | 'bank_transfer';
    bank_id?: string;
    bank_name?: string;
    tempo_active: boolean;
    tempo_date?: string;
  }) => {
    await handleSaveOrder('paid', paymentDetails);
    setShowPaymentModal(false);
    if (loadOrderId) {
      navigate('/dashboard/history-pending');
    } else {
      navigate('/dashboard/sales', { replace: true });
    }
  };

  if (loadingData) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">Memuat data penjualan...</p>
      </div>
    );
  }

  if (errorData) {
    return (
      <div className="text-center p-4 text-red-600">
        <p>Error: {errorData}</p>
        <button onClick={fetchAllSalesData} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="h-full w-full space-y-6 p-6 bg-gray-100 flex flex-col">
      <h1 className="text-3xl font-bold text-gray-900 mb-6 flex-shrink-0">Transaksi Penjualan</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
        {/* Left Column: Customer Info & Product Input */}
        <div className="lg:col-span-1 flex flex-col space-y-6 overflow-y-auto">
          <CustomerForm
            formData={orderFormData}
            onFormChange={handleFormChange}
            onSelectCustomerClick={() => setShowSelectCustomerModal(true)}
          />
          <ProductInputForm
            selectedProduct={selectedProduct}
            itemQuantity={itemQuantity}
            setItemQuantity={setItemQuantity}
            itemNotes={itemNotes}
            setItemNotes={setItemNotes}
            itemDimensions={itemDimensions}
            setItemDimensions={setItemDimensions}
            itemDiscount={itemDiscount}
            setItemDiscount={setItemDiscount}
            onSelectProductClick={() => setShowSelectProductModal(true)}
            onAddItemToOrder={handleAddItemToOrder}
            onOpenProductDetailModal={handleOpenProductDetailModal}
          />
        </div>

        {/* Right Column: Order Items & Summary */}
        <div className="lg:col-span-2 flex flex-col space-y-6 overflow-y-auto">
          <OrderItemsTable
            items={orderFormData.items}
            designerOptions={designerOptions}
            onRemoveItem={handleRemoveItem}
            onUpdateItemDesigner={handleUpdateItemDesigner}
          />
          <OrderSummary
            totalAmount={orderFormData.total_amount}
            discountAmount={orderFormData.discount_amount}
            taxAmount={orderFormData.tax_amount}
            cartFinalAmount={orderFormData.final_amount}
            currentItemSubtotal={currentItemSubtotal}
            onSavePending={async () => {
              await handleSaveOrder('pending');
              if (loadOrderId) {
                navigate('/dashboard/history-pending');
              } else {
                navigate('/dashboard/sales', { replace: true });
              }
            }}
            // onSavePending={() => handleSaveOrder('pending')}
            onOpenPaymentModal={handleOpenPaymentModal}
          />
        </div>
      </div>

      {/* Modals */}
      {showSelectCustomerModal && (
        <SelectCustomerModal
          onClose={() => setShowSelectCustomerModal(false)}
          onSelect={handleSelectCustomer}
          customerOptions={customerOptions}
        />
      )}
      {showSelectProductModal && (
        <SelectProductModal
          onClose={() => setShowSelectProductModal(false)}
          onSelect={handleSelectProduct}
          productOptions={productOptions}
        />
      )}
      {showProductDetailModal && selectedProduct && (
        <ProductDetailModal
          isOpen={showProductDetailModal}
          onClose={() => setShowProductDetailModal(false)}
          product={selectedProduct}
          initialQuantity={itemQuantity}
          initialDimensions={itemDimensions}
          initialAdditionalOptions={itemAdditionalOptions}
          finishingOptions={finishingOptions}
          bahanOptions={bahanOptions}
          onSave={handleUpdateProductDetailsFromModal}
        />
      )}
      {showPaymentModal && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          finalAmount={orderFormData.final_amount}
          bankOptions={bankOptions}
          onProcessPayment={handleProcessPayment}
        />
      )}
    </div>
  );
};

export default Sales;