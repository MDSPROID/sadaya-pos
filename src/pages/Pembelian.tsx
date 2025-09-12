import React, { useState } from 'react';
import { usePurchaseData } from '../hooks/usePurchaseData';
import { usePurchaseOrder } from '../hooks/usePurchaseOrder';
import { showError } from '../utils/toast';

// Import modular components
import SupplierForm from '../components/purchase/SupplierForm';
import PurchaseItemInputForm from '../components/purchase/PurchaseItemInputForm';
import PurchaseItemsTable from '../components/purchase/PurchaseItemsTable';
import PurchaseSummary from '../components/purchase/PurchaseSummary';
import SelectSupplierModal from '../components/purchase/SelectSupplierModal';
import SelectPurchaseItemModal from '../components/purchase/SelectPurchaseItemModal';
import PurchasePaymentModal from '../components/purchase/PurchasePaymentModal';

const Pembelian: React.FC = () => {
  const {
    supplierOptions,
    productOptions,
    bahanOptions,
    bankOptions,
    loadingData,
    errorData,
    fetchAllPurchaseData,
  } = usePurchaseData();

  const {
    purchaseFormData,
    selectedPurchaseItem,
    itemQuantity,
    setItemQuantity,
    itemNotes,
    setItemNotes,
    itemUnitPrice,
    setItemUnitPrice,
    currentItemSubtotal,
    handleFormChange,
    handleSelectSupplier,
    handleSelectPurchaseItem,
    handleAddItemToOrder,
    handleRemoveItem,
    handleSavePurchaseOrder,
  } = usePurchaseOrder(); // Removed productOptions and bahanOptions

  const [showSelectSupplierModal, setShowSelectSupplierModal] = useState(false);
  const [showSelectPurchaseItemModal, setShowSelectPurchaseItemModal] = useState(false);
  const [showPurchasePaymentModal, setShowPurchasePaymentModal] = useState(false);

  const handleOpenPurchasePaymentModal = () => {
    if (purchaseFormData.items.length === 0) {
      showError('Keranjang pembelian kosong. Tambahkan item terlebih dahulu.');
      return;
    }
    setShowPurchasePaymentModal(true);
  };

  const handleProcessPayment = async (paymentDetails: {
    paid_amount: number;
    payment_method: 'cash' | 'bank_transfer';
    bank_id?: string;
    bank_name?: string;
    due_amount: number;
    due_date?: string;
  }) => {
    await handleSavePurchaseOrder(paymentDetails);
    setShowPurchasePaymentModal(false);
  };

  if (loadingData) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">Memuat data pembelian...</p>
      </div>
    );
  }

  if (errorData) {
    return (
      <div className="text-center p-4 text-red-600">
        <p>Error: {errorData}</p>
        <button onClick={fetchAllPurchaseData} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="h-full w-full space-y-6 p-6 bg-gray-100 flex flex-col">
      <h1 className="text-3xl font-bold text-gray-900 mb-6 flex-shrink-0">Transaksi Pembelian</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
        {/* Left Column: Supplier Info & Item Input */}
        <div className="lg:col-span-1 flex flex-col space-y-6 overflow-y-auto">
          <SupplierForm
            formData={purchaseFormData}
            onFormChange={handleFormChange}
            onSelectSupplierClick={() => setShowSelectSupplierModal(true)}
          />
          <PurchaseItemInputForm
            selectedPurchaseItem={selectedPurchaseItem}
            itemQuantity={itemQuantity}
            setItemQuantity={setItemQuantity}
            itemNotes={itemNotes}
            setItemNotes={setItemNotes}
            itemUnitPrice={itemUnitPrice}
            setItemUnitPrice={setItemUnitPrice}
            onSelectPurchaseItemClick={() => setShowSelectPurchaseItemModal(true)}
            onAddItemToOrder={handleAddItemToOrder}
          />
        </div>

        {/* Right Column: Purchase Items & Summary */}
        <div className="lg:col-span-2 flex flex-col space-y-6 overflow-y-auto">
          <PurchaseItemsTable
            items={purchaseFormData.items}
            onRemoveItem={handleRemoveItem}
          />
          <PurchaseSummary
            totalAmount={purchaseFormData.total_amount}
            discountAmount={purchaseFormData.discount_amount}
            finalAmount={purchaseFormData.final_amount}
            currentItemSubtotal={currentItemSubtotal}
            // onSavePending is no longer needed as there's no "Pending Trx" button
            onOpenPaymentModal={handleOpenPurchasePaymentModal}
          />
        </div>
      </div>

      {/* Modals */}
      {showSelectSupplierModal && (
        <SelectSupplierModal
          onClose={() => setShowSelectSupplierModal(false)}
          onSelect={handleSelectSupplier}
          supplierOptions={supplierOptions}
        />
      )}
      {showSelectPurchaseItemModal && (
        <SelectPurchaseItemModal
          onClose={() => setShowSelectPurchaseItemModal(false)}
          onSelect={handleSelectPurchaseItem}
          productOptions={productOptions}
          bahanOptions={bahanOptions}
        />
      )}
      {showPurchasePaymentModal && (
        <PurchasePaymentModal
          isOpen={showPurchasePaymentModal}
          onClose={() => setShowPurchasePaymentModal(false)}
          finalAmount={purchaseFormData.final_amount}
          bankOptions={bankOptions}
          onProcessPayment={handleProcessPayment}
        />
      )}
    </div>
  );
};

export default Pembelian;