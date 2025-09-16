import React, { useState } from 'react';
import { useSalesData } from '../hooks/useSalesData';
import { useSalesOrder } from '../hooks/useSalesOrder';
import { showError } from '../utils/toast';
import { useLocation,useNavigate } from 'react-router-dom';
import { useHistoryPendingSalesData } from '../hooks/useHistoryPendingSalesData'; // Import useHistoryPendingSalesData
import { isPrinterAvailable } from '../utils/printAgent';
import PrinterStatusBadge from '../components/sales/PrinterStatusBadge';
import { supabase } from '../integrations/supabase/client';

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
    setOrderFormData,
    resetOrderForm,
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
  const [showSaveCustomerConfirm, setShowSaveCustomerConfirm] = useState(false);
  const [postConfirmAction, setPostConfirmAction] = useState<'pending' | 'payment' | null>(null);
  const [savingCustomer, setSavingCustomer] = useState(false);

  const normalizePhone = (raw?: string) => {
    if (!raw) return '';
    let digits = raw.replace(/\D+/g, '');
  
    // Hilangkan leading 0 ketika akan diprefix 62
    if (digits.startsWith('0')) digits = digits.slice(1);
  
    // Hilangkan leading 62 ganda (kalau user input sudah 62... lalu kamu tambah 62 lagi)
    if (digits.startsWith('62')) digits = digits.slice(2);
  
    return '62' + digits; // hasil akhir selalu '62' + nomor
  };

  const checkCustomerExistsByPhone = async (phoneRaw: string) => {
    const normalized = normalizePhone(phoneRaw);
  
    // Aman untuk OR multi-kolom + limit
    const { data, error } = await supabase
      .from('customers')
      .select('id')
      .or(
        `telepon_normalized.eq.${normalized},telepon.eq.${phoneRaw}`
      )
      .limit(1);
  
    if (error) {
      // Log saja, jangan blokir alur: anggap tidak ada supaya tetap munculkan konfirmasi
      console.warn('checkCustomerExistsByPhone error', error);
      return false;
    }
    return Array.isArray(data) && data.length > 0;
  };

  const maybeAskToSaveCustomer = async (nextAction: 'pending' | 'payment'): Promise<boolean> => {
    if (loadOrderId) return true; // Skip when continuing pending
    if (orderFormData.customer_id) return true; // Already chosen existing customer
    const phoneRaw = (orderFormData.customer_phone || '').trim();
    // const phoneRaw = (orderFormData.customer_phone || orderFormData.customer_display_phone || '').trim();
    if (!phoneRaw) return true; // No phone provided, nothing to check

    const exists = await checkCustomerExistsByPhone(phoneRaw);
    if (exists) return true;

    // const normalized = normalizePhone(phoneRaw);
    // const { data: existingByPhone, error } = await supabase
    //   .from('customers')
    //   .select('id')
    //   .or(`telepon_normalized.eq.${normalized},telepon.eq.${phoneRaw}`)
    //   .maybeSingle();

    // if (error && (error as any).code !== 'PGRST116') {
    //   return true; // on error, don't block
    // }

    // if (existingByPhone && (existingByPhone as any).id) {
    //   return true; // exists
    // }

    setPostConfirmAction(nextAction);
    setShowSaveCustomerConfirm(true);
    return false; // wait for confirmation
  };

  const saveCustomerNow = async () => {
    setSavingCustomer(true);
    const name = (orderFormData.customer_name || '').trim() || '(Tanpa Nama)';
    const phoneRaw = (orderFormData.customer_phone || '').trim();
    const address = (orderFormData.customer_address || '').trim();
    const notes = (orderFormData.customer_notes || '').trim();
    const normalized = normalizePhone(phoneRaw);

    const { data: inserted, error } = await supabase
      .from('customers')
      .insert({
        nama_pelanggan: name,
        telepon: phoneRaw || null,
        telepon_normalized: phoneRaw ? normalized : null,
        alamat: address || null,
        catatan: notes || null,
      })
      .select('id')
      .single();

    setSavingCustomer(false);
    setShowSaveCustomerConfirm(false);
    if (error) {
      return false;
    }
    if (inserted && (inserted as any).id) {
      setOrderFormData((prev: any) => ({
        ...prev,
        customer_id: (inserted as any).id,
      }));
    }
    return true;
  };

  const handleOpenProductDetailModal = () => {
    if (!selectedProduct) {
      showError('Pilih produk terlebih dahulu untuk melihat detail.');
      return;
    }
    setShowProductDetailModal(true);
  };

  const handleOpenPaymentModal = async () => {
    if (orderFormData.items.length === 0) {
      showError('Keranjang belanja kosong. Tambahkan item terlebih dahulu.');
      return;
    }
    const canProceed = await maybeAskToSaveCustomer('payment');
    if (!canProceed) return;
    setShowPaymentModal(true);
  };

  // Ensure clean form when arriving for new sales (no loadOrderId)
  React.useEffect(() => {
    if (!loadOrderId) {
      resetOrderForm();
    }
    // Only run when loadOrderId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadOrderId]);

  const handleProcessPayment = async (paymentDetails: {
    dp_amount: number;
    paid_amount: number;
    payment_method: 'cash' | 'bank_transfer';
    bank_id?: string;
    bank_name?: string;
    tempo_active: boolean;
    tempo_date?: string;
  }) => {

    // Cek ketersediaan printer. Jika tidak tersedia, tawarkan opsi lanjut tanpa cetak atau batal.
    const available = await isPrinterAvailable();
    if (!available) {
      // Simpan transaksi dengan skipPrint, lalu arahkan sesuai alur
      await handleSaveOrder('paid', paymentDetails, { skipPrint: true });
      setShowPaymentModal(false);
      if (loadOrderId) {
        navigate('/dashboard/history-pending');
      } else {
        navigate('/dashboard/sales', { replace: true });
      }
      return;
    }
    
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
      {/* <h1 className="text-3xl font-bold text-gray-900 mb-6 flex-shrink-0">Transaksi Penjualan</h1> */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <h1 className="text-3xl font-bold text-gray-900">Transaksi Penjualan</h1>
        <PrinterStatusBadge />
      </div>

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
              // For new insert, check customer existence first
              if (!loadOrderId) {
                const canProceed = await maybeAskToSaveCustomer('pending');
                if (!canProceed) return;
              }
              await handleSaveOrder('pending');
              if (loadOrderId) {
                navigate('/dashboard/history-pending');
              } else {
                navigate('/dashboard/sales', { replace: true });
              }
            }}
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

{showSaveCustomerConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-3 text-gray-900">Konfirmasi</h3>
            <p className="text-gray-700 mb-6">Apakah ingin menyimpan data pembeli di database?</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={async () => {
                  const ok = await saveCustomerNow();
                  if (!ok) return;
                  if (postConfirmAction === 'pending') {
                    await handleSaveOrder('pending');
                    if (loadOrderId) {
                      navigate('/dashboard/history-pending');
                    } else {
                      navigate('/dashboard/sales', { replace: true });
                    }
                  } else if (postConfirmAction === 'payment') {
                    setShowPaymentModal(true);
                  }
                }}
                disabled={savingCustomer}
                className={`px-4 py-2 rounded-lg text-white ${savingCustomer ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                Ya
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSaveCustomerConfirm(false);
                  if (postConfirmAction === 'pending') {
                    (async () => {
                      await handleSaveOrder('pending');
                      if (loadOrderId) {
                        navigate('/dashboard/history-pending');
                      } else {
                        navigate('/dashboard/sales', { replace: true });
                      }
                    })();
                  } else if (postConfirmAction === 'payment') {
                    setShowPaymentModal(true);
                  }
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Tidak
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;