import { useState, useEffect, useCallback } from 'react';
import { showSuccess, showError, showLoading, dismissToast } from '../utils/toast';
import {
  Supplier,
  Product,
  Bahan,
  PurchaseItem,
  PurchaseOrderFormData,
  PaymentDetails,
  PurchaseOrderDataToSave,
  ItemToInsert
} from '../types/purchaseOrderTypes';
import { supabase } from '../integrations/supabase/client';
import { useSession } from '../components/SessionContextProvider';
import { useNotaSettings } from './useNotaSettings';
import { generateInvoiceNumber } from '../utils/invoiceGenerator';
import { savePurchaseOrder } from '../utils/purchaseDbOperations';
import { useFormPersistence } from './useFormPersistence';


/**
 * Helper function to prepare purchase order data and items for saving to the database.
 */
const preparePurchaseOrderDataForSave = async (
  formData: PurchaseOrderFormData,
  userId: string,
  notaSettings: any,
  paymentStatus: 'paid' | 'due', // Changed status type
  paymentDetails?: PaymentDetails
) => {
  const invoiceNumber = await generateInvoiceNumber(
    notaSettings.kode_referensi_pembelian || 'PO',
    notaSettings.metode_urutan || 'bulan',
    'purchase' // Added 'purchase' as the third argument
  );

  const purchaseOrderDataToSave: PurchaseOrderDataToSave = {
    order_date: formData.order_date,
    supplier_id: formData.supplier_id,
    supplier_display_name: formData.supplier_name,
    supplier_display_phone: formData.supplier_phone,
    recorded_by_id: userId,
    total_amount: formData.total_amount,
    discount_amount: formData.discount_amount,
    final_amount: formData.final_amount,
    payment_status: paymentStatus, // Use derived status
    notes: formData.notes,
    invoice_number: invoiceNumber,
    payment_method: paymentDetails?.payment_method || 'cash',
    bank_id: paymentDetails?.bank_id || null,
    bank_name: paymentDetails?.bank_name || null,
    paid_amount: paymentDetails?.paid_amount || 0,
    due_amount: paymentDetails?.due_amount || 0,
    due_date: paymentDetails?.due_date || null,
  };

  const itemsToInsert: ItemToInsert[] = formData.items.map(item => ({
    item_type: item.item_type,
    item_id: item.item_id,
    item_name: item.item_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    subtotal_per_item: item.subtotal_per_item,
    notes_per_item: item.notes_per_item,
  }));

  return { purchaseOrderDataToSave, itemsToInsert };
};

export const usePurchaseOrder = (
  // productOptions: Product[] = [], // Removed unused parameter
  // bahanOptions: Bahan[] = [] // Removed unused parameter
) => {
  const { session } = useSession();
  const currentUserId = session?.user?.id;
  const { notaSettings, loadingNotaSettings } = useNotaSettings();

  const initialPurchaseOrderFormData: PurchaseOrderFormData = {
    supplier_id: null,
    supplier_name: '',
    supplier_phone: '',
    supplier_address: '',
    order_date: new Date().toISOString().split('T')[0],
    notes: '',
    items: [],
    total_amount: 0,
    discount_amount: 0,
    final_amount: 0,
    payment_status: 'due', // Default to 'due' or 'paid' based on initial state
    paid_amount: 0,
    due_amount: 0,
    due_date: null,
    payment_method: 'cash',
    bank_id: null,
    bank_name: null,
  };

  const [purchaseFormData, setPurchaseFormData, clearPurchaseFormData] = useFormPersistence<PurchaseOrderFormData>({
    key: 'purchaseOrderDraft',
    initialValue: initialPurchaseOrderFormData,
    enabled: true, // Always persist for purchase form
  });

  // State for current item input
  const [selectedPurchaseItem, setSelectedPurchaseItem] = useState<Product | Bahan | null>(null);
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemNotes, setItemNotes] = useState<string>('');
  const [itemUnitPrice, setItemUnitPrice] = useState<number>(0);

  const currentItemSubtotal = (() => {
    if (!selectedPurchaseItem || itemQuantity <= 0 || itemUnitPrice <= 0) {
      return 0;
    }
    return itemUnitPrice * itemQuantity;
  })();

  const resetCurrentItemForm = useCallback(() => {
    setSelectedPurchaseItem(null);
    setItemQuantity(1);
    setItemNotes('');
    setItemUnitPrice(0);
  }, []);

  useEffect(() => {
    const newTotalAmount = purchaseFormData.items.reduce((sum, item) => sum + item.subtotal_per_item, 0);
    const newFinalAmount = newTotalAmount - purchaseFormData.discount_amount;

    setPurchaseFormData(prev => ({
      ...prev,
      total_amount: newTotalAmount,
      final_amount: newFinalAmount,
    }));
  }, [purchaseFormData.items, purchaseFormData.discount_amount, setPurchaseFormData]);

  const handleFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPurchaseFormData(prev => ({ ...prev, [name]: value }));
  }, [setPurchaseFormData]);

  const handleSelectSupplier = useCallback((supplier: Supplier) => {
    setPurchaseFormData(prev => ({
      ...prev,
      supplier_id: supplier.id,
      supplier_name: supplier.nama,
      supplier_phone: supplier.telepon || '',
      supplier_address: supplier.alamat || '',
    }));
  }, [setPurchaseFormData]);

  const handleSelectPurchaseItem = useCallback((item: Product | Bahan, type: 'produk' | 'bahan') => {
    setSelectedPurchaseItem(item);
    setItemQuantity(1);
    setItemNotes('');
    if (type === 'produk') {
      setItemUnitPrice((item as Product).harga_pokok || 0);
    } else {
      setItemUnitPrice((item as Bahan).harga_beli || 0);
    }
  }, []);

  const handleAddItemToOrder = useCallback(() => {
    if (!selectedPurchaseItem || itemQuantity <= 0 || itemUnitPrice <= 0) {
      showError('Pilih item, masukkan kuantitas, dan harga satuan yang valid.');
      return;
    }

    const itemType = 'nama_produk' in selectedPurchaseItem ? 'produk' : 'bahan';
    const itemName = 'nama_produk' in selectedPurchaseItem ? selectedPurchaseItem.nama_produk : selectedPurchaseItem.nama;
    const satuanNama = selectedPurchaseItem.satuan?.nama || null;

    const newItem: PurchaseItem = {
      tempId: Date.now().toString(),
      item_type: itemType,
      item_id: selectedPurchaseItem.id,
      item_name: itemName,
      quantity: itemQuantity,
      unit_price: itemUnitPrice,
      subtotal_per_item: currentItemSubtotal,
      notes_per_item: itemNotes,
      satuan_nama: satuanNama,
    };

    setPurchaseFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem],
    }));

    resetCurrentItemForm();
  }, [selectedPurchaseItem, itemQuantity, itemNotes, itemUnitPrice, currentItemSubtotal, resetCurrentItemForm, setPurchaseFormData]);

  const handleRemoveItem = useCallback((tempId: string) => {
    setPurchaseFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.tempId !== tempId),
    }));
  }, [setPurchaseFormData]);

  // Modified handleSavePurchaseOrder
  const handleSavePurchaseOrder = useCallback(async (paymentDetails: PaymentDetails) => { // Removed 'status' parameter
    if (purchaseFormData.items.length === 0) {
      showError('Keranjang pembelian kosong.');
      return;
    }
    if (!purchaseFormData.supplier_id && !purchaseFormData.supplier_name) {
      showError('Pilih supplier atau masukkan nama supplier.');
      return;
    }
    if (loadingNotaSettings) {
      showError('Pengaturan nota sedang dimuat. Mohon coba lagi.');
      return;
    }
    if (!currentUserId) {
      showError('ID pengguna tidak ditemukan. Mohon login kembali.');
      return;
    }

    const toastId = showLoading('Menyimpan pesanan pembelian...');

    try {
      // 1) derive status
      const paymentStatus = paymentDetails.due_amount > 0 ? 'due' : 'paid';
    
      // 2) siapkan payload untuk save PO
      const { purchaseOrderDataToSave, itemsToInsert } = await preparePurchaseOrderDataForSave(
        purchaseFormData,
        currentUserId,
        notaSettings,
        paymentStatus,
        paymentDetails
      );
    
      // 3) simpan PO & item (savePurchaseOrder mengembalikan ID PO baru)
      const newPurchaseOrderId = await savePurchaseOrder(
        purchaseOrderDataToSave,
        itemsToInsert,
        currentUserId,
        paymentStatus,
        paymentDetails
      );
    
      // 4) INSERT ke purchase_payments bila user isi nominal > 0
      const mustInsertPayment =
        (paymentDetails.due_amount && paymentDetails.due_amount > 0) ||
        (paymentDetails.paid_amount && paymentDetails.paid_amount > 0);

      if (mustInsertPayment) {
        // ⬇️ CEK DULU: apakah sudah ada payment untuk PO ini?
        const { data: existingPayments, error: existErr } = await supabase
          .from('purchase_payments')
          .select('id')
          .eq('purchase_order_id', newPurchaseOrderId)
          .limit(1);

        if (existErr) throw existErr;

        // Kalau sudah ada (mis. disisipkan oleh savePurchaseOrder atau trigger), kita SKIP supaya tidak dobel
        if (!existingPayments || existingPayments.length === 0) {
          const payDate =
            purchaseOrderDataToSave.order_date ||
            new Date().toISOString().slice(0, 10);

          // Gabungan "Metode - Nama Akun" untuk non tunai.
          const combinedBankName =
            paymentDetails.payment_method === 'bank_transfer'
              ? (paymentDetails.bank_name?.trim()?.length
                  ? paymentDetails.bank_name!.trim()
                  : `${paymentDetails.payment_method} - ${(paymentDetails.bank_name || '').trim()}` // fallback
                )
              : null;

          const paymentRow: any = {
            purchase_order_id: newPurchaseOrderId, // tetap pakai kolom yang sudah kamu gunakan
            pay_date: payDate,
            amount: paymentDetails.paid_amount ?? 0, // boleh 0 saat tempo
            method: paymentDetails.payment_method,   // 'cash' | 'bank_transfer'
            bank_name: combinedBankName,             // simpan gabungan di kolom bank_name SAJA
            note: null,
          };

          const { error: payErr } = await supabase
            .from('purchase_payments')
            .insert(paymentRow);

          if (payErr) throw payErr;
        }
      }
    
      showSuccess(`Pesanan pembelian berhasil disimpan sebagai ${paymentStatus === 'due' ? 'Tempo' : 'Lunas'}!`);
    
      setPurchaseFormData(initialPurchaseOrderFormData);
      resetCurrentItemForm();
      clearPurchaseFormData();
    
    } catch (error: any) {
      showError('Gagal menyimpan pesanan pembelian: ' + error.message);
      console.error('Error saving purchase order:', error);
    } finally {
      dismissToast(toastId);
    }
  }, [purchaseFormData, currentUserId, loadingNotaSettings, notaSettings, initialPurchaseOrderFormData, resetCurrentItemForm, setPurchaseFormData, clearPurchaseFormData]);

  return {
    purchaseFormData,
    setPurchaseFormData,
    selectedPurchaseItem,
    setSelectedPurchaseItem,
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
  };
};