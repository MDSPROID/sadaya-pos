import React, { useState } from 'react';
import { useSalesData } from '../hooks/useSalesData';
import { useSalesOrder } from '../hooks/useSalesOrder';
import { showError } from '../utils/toast';
import { useLocation, useNavigate } from 'react-router-dom';
import { useHistoryPendingSalesData } from '../hooks/useHistoryPendingSalesData';
import PrinterStatusBadge from '../components/sales/PrinterStatusBadge';
import { supabase } from '../integrations/supabase/client';

import { isKasirOrSuperAdmin } from '../utils/roles';
import { useSession } from '../components/SessionContextProvider';

// Modular components
import CustomerForm from '../components/sales/CustomerForm';
import ProductInputForm from '../components/sales/ProductInputForm';
import OrderItemsTable from '../components/sales/OrderItemsTable';
import OrderSummary from '../components/sales/OrderSummary';
import SelectCustomerModal from '../components/sales/SelectCustomerModal';
import SelectProductModal from '../components/sales/SelectProductModal';
import ProductDetailModal from '../components/sales/ProductDetailModal';
import PaymentModal from '../components/sales/PaymentModal';

type ExistingPayment = {
  id: string;
  created_at?: string | null;
  dp_amount?: number | null;
  paid_amount?: number | null;
  tempo_active?: boolean | null;
  tempo_date?: string | null;
  payment_method?: 'cash' | 'bank_transfer' | string | null;
  bank_name?: string | null;
};

// Ekstrak semua "Payment Details: {...}" di orders.notes → array ExistingPayment
const extractPaymentsFromNotes = (notes?: string): ExistingPayment[] => {
  if (!notes) return [];
  const results: ExistingPayment[] = [];
  // Ambil setiap blok JSON setelah "Payment Details:"
  const regex = /Payment Details:\s*({[\s\S]*?})/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(notes)) !== null) {
    try {
      const obj = JSON.parse(match[1]);
      results.push({
        id: `notes-${results.length + 1}`,
        created_at: null,                                     // notes tidak simpan timestamp; opsional
        dp_amount: Number(obj?.dp_amount ?? 0),
        paid_amount: Number(obj?.paid_amount ?? 0),
        tempo_active: Boolean(obj?.tempo_active),
        tempo_date: obj?.tempo_date || null,
        payment_method: (obj?.payment_method as any) || null,
        bank_name: obj?.bank_name || null,
      });
    } catch {
      // abaikan parse error agar tidak memblokir
    }
  }
  return results;
};

const Sales: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const loadOrderId = (location.state as { loadOrderId?: string })?.loadOrderId;

  const { profile } = useSession();
  const canPay = isKasirOrSuperAdmin(profile?.role);

  const [reloadingProducts, setReloadingProducts] = useState(false);

  // 2) Handler baru untuk tombol "Pilih Produk"
  const handleOpenSelectProductWithReload = async () => {
    setReloadingProducts(true);
    try {
      // reload semua master (termasuk productOptions)
      await fetchAllSalesData();
    } catch (e) {
      console.warn('Gagal reload data produk:', e);
    } finally {
      setReloadingProducts(false);
      setShowSelectProductModal(true); // buka modal setelah refresh selesai
    }
  };

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

  // Pending list fetcher
  const { fetchPendingSales } = useHistoryPendingSalesData({ startDate: '', endDate: '', searchTerm: '' });

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
  } = useSalesOrder(loadOrderId, productOptions, designerOptions, customerOptions, fetchPendingSales);

  const [showSelectCustomerModal, setShowSelectCustomerModal] = useState(false);
  const [showSelectProductModal, setShowSelectProductModal] = useState(false);
  const [showProductDetailModal, setShowProductDetailModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSaveCustomerConfirm, setShowSaveCustomerConfirm] = useState(false);
  const [postConfirmAction, setPostConfirmAction] = useState<'pending' | 'payment' | null>(null);
  const [savingCustomer, setSavingCustomer] = useState(false);

  // === Ambil user login untuk isi designer_id pada insert pertama ===
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;
      if (error) {
        console.warn('getUser error:', error);
        return;
      }
      setCurrentUserId(data?.user?.id);
    })();
    return () => { mounted = false; };
  }, []);

  const [existingPayments, setExistingPayments] = useState<ExistingPayment[]>([]);

  // Helper: pastikan designer_id terisi user yang input pertama
  const ensureDesignerId = async () => {
    if (!orderFormData?.designer_id && currentUserId) {
      setOrderFormData((prev: any) => ({ ...prev, designer_id: currentUserId }));
      // tunggu 1 tick agar state ter-flush sebelum handleSaveOrder membaca state
      await new Promise((r) => setTimeout(r, 0));
    }
  };

  const normalizePhone = (raw?: string) => {
    if (!raw) return '';
    let digits = raw.replace(/\D+/g, '');
    if (digits.startsWith('0')) digits = digits.slice(1);
    if (digits.startsWith('62')) digits = digits.slice(2);
    return '62' + digits;
  };

  const checkCustomerExistsByPhone = async (phoneRaw: string) => {
    const normalized = normalizePhone(phoneRaw);
    const { data, error } = await supabase
      .from('pelanggan')
      .select('id')
      .or(`telepon_normalized.eq.${normalized},telepon.eq.${phoneRaw}`)
      .limit(1);
    if (error) {
      console.warn('checkCustomerExistsByPhone error', error);
      return false;
    }
    return Array.isArray(data) && data.length > 0;
  };

  const maybeAskToSaveCustomer = async (nextAction: 'pending' | 'payment'): Promise<boolean> => {
    if (loadOrderId) return true; // continue pending: skip
    if (orderFormData.customer_id) return true;
    const phoneRaw = (orderFormData.customer_phone || '').trim();
    if (!phoneRaw) return true;

    const exists = await checkCustomerExistsByPhone(phoneRaw);
    if (exists) return true;

    setPostConfirmAction(nextAction);
    setShowSaveCustomerConfirm(true);
    return false;
  };

  const persistCustomerNotes = async (): Promise<boolean> => {
    const notes = (orderFormData.customer_notes || '').trim();
    if (!orderFormData.customer_id) return true;
    const { error } = await supabase
      .from('pelanggan')
      .update({ catatan: notes || null })
      .eq('id', orderFormData.customer_id);
    if (error) {
      console.warn('persistCustomerNotes error', error);
      return false;
    }
    return true;
  };

  const saveCustomerNow = async () => {
    setSavingCustomer(true);
    try {
      const name =
        (orderFormData.customer_name ||
          (orderFormData as any).customer_display_name ||
          '').trim() || '(Tanpa Nama)';

      const phoneRaw =
        (orderFormData.customer_phone ||
          (orderFormData as any).customer_display_phone ||
          '').trim();

      const address = (orderFormData.customer_address || '').trim();
      const notes = (orderFormData.customer_notes || '').trim();
      const normalized = phoneRaw ? normalizePhone(phoneRaw) : null;

      const upsertRes = await supabase
        .from('pelanggan')
        .upsert(
          {
            nama_pelanggan: name,
            telepon: normalized || null,
            alamat: address || null,
            catatan: notes || null,
          }
        )
        .select('id');

      if (upsertRes.error) {
        console.error('upsert pelanggan error:', upsertRes.error);
        showError(upsertRes.error.message || 'Gagal menyimpan data pelanggan.');
        return false;
      }

      let newId = upsertRes.data?.[0]?.id;

      if (!newId) {
        const findRes = await supabase
          .from('pelanggan')
          .select('id')
          .or(
            normalized && phoneRaw
              ? `telepon_normalized.eq.${normalized},telepon.eq.${phoneRaw}`
              : phoneRaw
              ? `telepon.eq.${phoneRaw}`
              : 'id.gt.0'
          )
          .limit(1);

        if (findRes.error) {
          console.warn('find-after-upsert error:', findRes.error);
        } else {
          newId = findRes.data?.[0]?.id;
        }
      }

      if (!newId) {
        showError('Pelanggan tidak ditemukan setelah disimpan. Cek RLS/Policy dan unique index.');
        return false;
      }

      setOrderFormData((prev: any) => ({ ...prev, customer_id: newId }));
      await persistCustomerNotes();
      return true;
    } catch (e: any) {
      console.error('saveCustomerNow exception', e);
      showError(e?.message || 'Terjadi kesalahan saat menyimpan pelanggan.');
      return false;
    } finally {
      setSavingCustomer(false);
      setShowSaveCustomerConfirm(false);
    }
  };

  const handleOpenProductDetailModal = () => {
    if (!selectedProduct) {
      showError('Pilih produk terlebih dahulu untuk melihat detail.');
      return;
    }
    setShowProductDetailModal(true);
  };

  // Ambil histori pembayaran saat membuka modal (jika continue pending)
  // NOTE: Kalau PaymentModal kamu mendukung prop existingPayments, kamu bisa pass di bawah.
  const handleOpenPaymentModal = async () => {
    if (orderFormData.items.length === 0) {
      showError('Keranjang belanja kosong. Tambahkan item terlebih dahulu.');
      return;
    }
    const canProceed = await maybeAskToSaveCustomer('payment');
    if (!canProceed) return;
  
    // pastikan designer_id terisi sebelum proses pembayaran
    await ensureDesignerId();
  
    // 1) Tarik histori dari orders.notes (sudah ada di state orderFormData)
    let list: ExistingPayment[] = extractPaymentsFromNotes(orderFormData.notes);
  
    // 2) (Opsional) gabungkan dengan catatan di tabel order_payments jika kamu pakai tabel itu
    if (loadOrderId) {
      const { data: pays, error } = await supabase
        .from('order_payments')
        .select('id, created_at, dp_amount, paid_amount, tempo_active, tempo_date, payment_method, bank_name')
        .eq('order_id', loadOrderId)
        .order('created_at', { ascending: false });
  
      if (!error && Array.isArray(pays) && pays.length) {
        const mapped: ExistingPayment[] = pays.map((p: any) => ({
          id: p.id,
          created_at: p.created_at,
          dp_amount: Number(p.dp_amount ?? 0),
          paid_amount: Number(p.paid_amount ?? 0),
          tempo_active: Boolean(p.tempo_active),
          tempo_date: p.tempo_date,
          payment_method: p.payment_method,
          bank_name: p.bank_name,
        }));
        // Utamakan yang dari DB, lalu yang dari notes
        list = [...mapped, ...list];
      }
    }
  
    setExistingPayments(list);
    setShowPaymentModal(true);
  };

  // Reset form saat bukan melanjutkan pending
  React.useEffect(() => {
    if (!loadOrderId) {
      resetOrderForm();
      setExistingPayments([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadOrderId]);

  // Sinkron catatan pelanggan dari master ketika lanjut pending
  React.useEffect(() => {
    if (!loadOrderId) return;
    const cid = orderFormData.customer_id;
    if (!cid) return;

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('pelanggan')
        .select('catatan')
        .eq('id', cid)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.warn('Gagal ambil catatan pelanggan:', error);
        return;
      }

      setOrderFormData((prev: any) => ({
        ...prev,
        customer_notes: data?.catatan || '',
      }));
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadOrderId, orderFormData.customer_id]);

  type PaymentDetailsFromModal = {
    dp_amount: number;
    paid_amount: number;
    total_paid: number;
    final_amount: number;
    payment_status: 'paid' | 'pending';
    payment_method: 'cash' | 'bank_transfer';
    bank_id?: string;
    bank_name?: string;
    tempo_active: boolean;
    tempo_date?: string;
  };

  const handleProcessPayment = async (
    detail: PaymentDetailsFromModal,
    options?: { skipPrint?: boolean }
  ) => {
    try {
      if (orderFormData.customer_id) {
        await persistCustomerNotes();
      }

      // pastikan designer_id terisi saat save (insert pertama)
      await ensureDesignerId();

      const status: 'paid' | 'pending' =
        detail?.payment_status ?? (detail.total_paid >= detail.final_amount ? 'paid' : 'pending');

      await handleSaveOrder(status, detail, { ...(options || {}), suppressReadyPopup: true });

      setShowPaymentModal(false);

      if (loadOrderId) {
        navigate('/dashboard/history-pending');
      } else {
        navigate('/dashboard/sales', { replace: true });
      }
    } catch (err: any) {
      console.error(err);
      showError(err?.message || 'Gagal memproses pembayaran.');
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

  const effectiveOrderStatus = (orderFormData as any)?.order_status ?? 'new';

  return (
    <div className="h-full w-full space-y-6 p-6 bg-gray-100 flex flex-col">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <h1 className="text-3xl font-bold text-gray-900">Transaksi Penjualan</h1>
        <PrinterStatusBadge />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
        {/* Left Column */}
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
            onSelectProductClick={handleOpenSelectProductWithReload}
            // onSelectProductClick={() => setShowSelectProductModal(true)}
            onAddItemToOrder={handleAddItemToOrder}
            onOpenProductDetailModal={handleOpenProductDetailModal}
          />
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 flex flex-col space-y-6 overflow-y-auto">
          <OrderItemsTable
            items={orderFormData.items}
            designerOptions={designerOptions}
            onRemoveItem={handleRemoveItem}
            onUpdateItemDesigner={handleUpdateItemDesigner}
            currentUserId={currentUserId}
            orderStatus={effectiveOrderStatus}
          />
          <OrderSummary
            totalAmount={orderFormData.total_amount}
            discountAmount={orderFormData.discount_amount}
            taxAmount={orderFormData.tax_amount}
            cartFinalAmount={orderFormData.final_amount}
            currentItemSubtotal={currentItemSubtotal}
            // Hanya Kasir/Super Admin yang boleh "Pembayaran"
            canPay={canPay}
            onSavePending={async () => {
              if (!loadOrderId) {
                const canProceed = await maybeAskToSaveCustomer('pending');
                if (!canProceed) return;
              }
              if (orderFormData.customer_id) {
                await persistCustomerNotes();
              }
              // pastikan designer_id terisi pada insert pertama
              await ensureDesignerId();

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
          onSelect={(c) => {
            if (handleSelectCustomer) {
              handleSelectCustomer(c as any);
            }
            setOrderFormData((prev: any) => ({
              ...prev,
              customer_id: c.id,
              customer_name: c.nama_pelanggan || '',
              customer_phone: c.telepon || '',
              customer_address: c.alamat || '',
              customer_notes: c.catatan || ''
            }));
            setShowSelectCustomerModal(false);
          }}
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
          existingPayments={existingPayments}
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
                    await ensureDesignerId();
                    await handleSaveOrder('pending');
                    if (loadOrderId) {
                      navigate('/dashboard/history-pending');
                    } else {
                      navigate('/dashboard/sales', { replace: true });
                    }
                  } else if (postConfirmAction === 'payment') {
                    await ensureDesignerId();
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
                onClick={async () => {
                  setShowSaveCustomerConfirm(false);
                  if (postConfirmAction === 'pending') {
                    await ensureDesignerId();
                    await handleSaveOrder('pending');
                    if (loadOrderId) {
                      navigate('/dashboard/history-pending');
                    } else {
                      navigate('/dashboard/sales', { replace: true });
                    }
                  } else if (postConfirmAction === 'payment') {
                    await ensureDesignerId();
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
