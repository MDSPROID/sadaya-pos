import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '../utils/toast';
import { useSession } from '../components/SessionContextProvider';
import { useNotaSettings } from './useNotaSettings';
import { generateInvoiceNumber } from '../utils/invoiceGenerator';
import { saveSalesOrder, updateSalesOrder } from '../utils/salesDbOperations';
import { useFormPersistence } from './useFormPersistence';
import {
  Product,
  AdditionalOption,
  OrderItem,
  OrderFormData,
  Customer,
  DesignerOption,
  PaymentDetails,
  OrderDataToSave,
  ItemToInsert
} from '../types/salesOrderTypes';


/** Replace semua "Payment Details: {...}" lama di notes dengan satu entri baru */
const upsertPaymentDetailsInNotes = (
  prevNotes: string | null | undefined,
  paymentDetails?: PaymentDetails
) => {
  let notes = (prevNotes || '').toString();

  if (!paymentDetails) return notes;

  // Tambahkan timestamp supaya histori punya penanda waktu
  const detailsToLog = { ...paymentDetails, created_at: new Date().toISOString() };
  const json = JSON.stringify(detailsToLog);

  // 1) Hapus SEMUA entri Payment Details lama
  const removeRe = /(?:^|\n)Payment Details:\s*{[\s\S]*?}(?=\n|$)/g;
  notes = notes.replace(removeRe, '').trim();

  // 2) Sisipkan SATU entri baru di akhir
  const line = `Payment Details: ${json}`;
  return (notes ? notes + '\n' : '') + line;
};

/**
 * Menyiapkan payload order & items untuk disimpan.
 */
const prepareOrderDataForSave = async (
  formData: OrderFormData,
  userId: string,
  notaSettings: any,
  status: 'pending' | 'paid',
  paymentDetails?: PaymentDetails
) => {
  let orderNotes = upsertPaymentDetailsInNotes(formData.notes, paymentDetails);

  const invoiceNumber = await generateInvoiceNumber(
    notaSettings.kode_referensi_penjualan || 'INV',
    notaSettings.metode_urutan || 'bulan',
    'sales'
  );

  const orderDataToSave: OrderDataToSave = {
    order_date: formData.order_date,
    pickup_date: formData.pickup_date || null,
    customer_id: formData.customer_id, // <- pastikan sudah di-resolve sebelum dipanggil
    customer_display_name: formData.customer_name,
    customer_display_phone: formData.customer_phone,
    kasir_id: userId,
    designer_id: formData.designer_id ?? null,
    total_amount: formData.total_amount,
    discount_amount: formData.discount_amount,
    tax_amount: formData.tax_amount,
    final_amount: formData.final_amount,
    payment_status: status,
    order_status: 'new',
    notes: orderNotes,
    priority: formData.priority,
    invoice_number: invoiceNumber,
    payment_method: paymentDetails?.payment_method,
    bank_name: paymentDetails?.bank_name || null,

    // RULE READY:
    // - Jika status 'paid' => ready
    // - Jika ada pembayaran parsial (DP / paid_amount > 0) => ready
    // - Jika pending tanpa pembayaran => not_ready
    ready_status:
      status === 'paid' ||
      ((paymentDetails?.paid_amount ?? 0) + (paymentDetails?.dp_amount ?? 0) > 0)
        ? 'ready'
        : 'not_ready',
  };

  const itemsToInsert: ItemToInsert[] = formData.items.map(item => ({
    ...item,
    subtotal_per_item: item.subtotal_per_item,
    order_id: '', // akan diisi di saveSalesOrder / updateSalesOrder
  }));

  return { orderDataToSave, itemsToInsert };
};

/** Normalisasi nomor telepon: buang non-digit, ganti awalan 0 => 62 */
const normalizePhone = (raw?: string) => {
  if (!raw) return '';
  const digits = raw.replace(/\D+/g, '');
  if (digits.startsWith('0')) return '62' + digits.slice(1);
  return digits;
};

/**
 * Resolve customer untuk order:
 * - Jika ada customer_id => ambil ulang dari tabel `pelanggan`
 * - Jika tidak ada tetapi ada phone => cari by telepon_normalized ATAU telepon
 * - Jika tidak ketemu => biarkan null (tidak membuat record baru di sini)
 */
const resolveCustomerForOrder = async (formData: OrderFormData) => {
  const name = (formData.customer_name || '').trim();
  const phoneRaw = (formData.customer_phone || '').trim();
  const address = (formData.customer_address || '').trim();
  const notes = (formData.customer_notes || '').trim();

  // 1) Sudah ada ID => ambil ulang dari master pelanggan
  if (formData.customer_id) {
    const { data, error } = await supabase
      .from('pelanggan')
      .select('id, nama_pelanggan, telepon, alamat, catatan')
      .eq('id', formData.customer_id)
      .maybeSingle();

    if (data && !error) {
      return {
        customer_id: data.id as string,
        name: (data.nama_pelanggan as string) ?? name,
        phone: (data.telepon as string) ?? phoneRaw,
        address: (data.alamat as string) ?? address,
        notes: (data.catatan as string) ?? notes,
      };
    }
    // fallback pakai nilai form
    return {
      customer_id: formData.customer_id,
      name, phone: phoneRaw, address, notes,
    };
  }

  // 2) Tidak ada ID, coba cari by telepon
  if (phoneRaw) {
    const normalized = normalizePhone(phoneRaw);

    // Coba OR telepon_normalized/telepon
    let row: any = null;
    try {
      const { data } = await supabase
        .from('pelanggan')
        .select('id, nama_pelanggan, telepon, alamat, catatan')
        .or(`telepon_normalized.eq.${normalized},telepon.eq.${phoneRaw}`)
        .limit(1);
      row = Array.isArray(data) ? data[0] : null;
    } catch (e) {
      // Jika kolom telepon_normalized tidak ada, fallback cari by telepon saja
      const { data } = await supabase
        .from('pelanggan')
        .select('id, nama_pelanggan, telepon, alamat, catatan')
        .eq('telepon', phoneRaw)
        .limit(1);
      row = Array.isArray(data) ? data[0] : null;
    }

    if (row) {
      return {
        customer_id: row.id as string,
        name: (row.nama_pelanggan as string) ?? name,
        phone: (row.telepon as string) ?? phoneRaw,
        address: (row.alamat as string) ?? address,
        notes: (row.catatan as string) ?? notes,
      };
    }
  }

  // 3) Tidak ada id & tidak ketemu by phone
  return {
    customer_id: null,
    name, phone: phoneRaw, address, notes,
  };
};

export const useSalesOrder = (
  loadOrderId?: string,
  productOptions: Product[] = [],
  designerOptions: DesignerOption[] = [],
  customerOptions: Customer[] = [],
  fetchPendingSales?: () => Promise<void>
) => {
  const { session } = useSession();
  const currentUserId = session?.user?.id;
  const { notaSettings, loadingNotaSettings } = useNotaSettings();

  const initialOrderFormData: OrderFormData = {
    customer_id: null,
    customer_name: '',
    customer_phone: '',
    customer_address: '',
    customer_notes: '',
    order_date: new Date().toISOString().split('T')[0],
    pickup_date: '',
    priority: 'normal',
    items: [],
    total_amount: 0,
    discount_amount: 0,
    tax_amount: 0,
    final_amount: 0,
    payment_status: 'pending',
    order_status: 'new',
    notes: '',
    // >>> penting: ikutkan di form state
    designer_id: null,
  };

  // Persist form saat membuat transaksi baru (bukan saat melanjutkan pending)
  const [orderFormData, setOrderFormData, clearOrderFormData, isDraftLoaded] =
    useFormPersistence<OrderFormData>({
      key: 'salesOrderDraft',
      initialValue: initialOrderFormData,
      enabled: !loadOrderId,
    });

  const loadedOrderIdRef = useRef<string | undefined>(undefined);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);

  // State untuk input item saat ini
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemNotes, setItemNotes] = useState<string>('');
  const [itemDimensions, setItemDimensions] = useState<{
    panjang?: number; lebar?: number; satuan?: string;
    tebal_bahan_id?: string; tebal_bahan_nama?: string;
  }>({});
  const [itemDiscount, setItemDiscount] = useState<number>(0);
  const [itemAdditionalOptions, setItemAdditionalOptions] = useState<AdditionalOption[]>([]);

  const currentItemSubtotal = (() => {
    if (!selectedProduct || itemQuantity <= 0) return 0;

    const unitPrice = selectedProduct.harga_jual_umum;
    let calculatedPanjang = itemDimensions.panjang || 0;
    let calculatedLebar = itemDimensions.lebar || 0;

    if (itemDimensions.satuan === 'CM') {
      calculatedPanjang /= 100;
      calculatedLebar /= 100;
    }

    let subtotal = unitPrice * itemQuantity;
    if (selectedProduct.kategori?.nama === 'Cetak Outdoor' && calculatedPanjang > 0 && calculatedLebar > 0) {
      const area = calculatedPanjang * calculatedLebar;
      subtotal = unitPrice * area * itemQuantity;
    }

    const additionalCost = itemAdditionalOptions.reduce((total: number, option: AdditionalOption) => {
      return total + (option.selected && option.quantity > 0 ? option.cost * option.quantity : 0);
    }, 0);
    subtotal += additionalCost;
    subtotal -= itemDiscount;

    return subtotal;
  })();

  const resetCurrentItemForm = useCallback(() => {
    setSelectedProduct(null);
    setItemQuantity(1);
    setItemNotes('');
    setItemDimensions({});
    setItemDiscount(0);
    setItemAdditionalOptions([]);
  }, []);

  const resetOrderForm = useCallback(() => {
    setOrderFormData(initialOrderFormData);
    resetCurrentItemForm();
    clearOrderFormData();
  }, [initialOrderFormData, resetCurrentItemForm, clearOrderFormData, setOrderFormData]);

  // Hitung ulang total/discount/tax/final saat items berubah
  useEffect(() => {
    const newTotalAmount = orderFormData.items.reduce((sum: number, item: OrderItem) => sum + item.subtotal_per_item, 0);
    const newDiscountAmount = orderFormData.items.reduce((sum: number, item: OrderItem) => sum + item.discount_per_item, 0);
    const newTaxAmount = 0;
    const newCartFinalAmount = newTotalAmount - newDiscountAmount + newTaxAmount;

    setOrderFormData((prev: OrderFormData) => ({
      ...prev,
      total_amount: newTotalAmount,
      discount_amount: newDiscountAmount,
      tax_amount: newTaxAmount,
      final_amount: newCartFinalAmount,
    }));
  }, [orderFormData.items, setOrderFormData]);

  // Load order pending (continue)
  useEffect(() => {
    const fetchAndLoadOrder = async () => {
      if (!loadOrderId || loadedOrderIdRef.current === loadOrderId || isLoadingOrder) return;
      if (productOptions.length === 0 || designerOptions.length === 0 || customerOptions.length === 0) return;

      setIsLoadingOrder(true);
      loadedOrderIdRef.current = loadOrderId;

      clearOrderFormData();

      const toastId = showLoading('Memuat transaksi tertunda...');
      try {
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', loadOrderId)
          .single();
        if (orderError) throw orderError;

        const { data: orderItemsData, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', loadOrderId);
        if (itemsError) throw itemsError;

        const loadedItems: OrderItem[] = (orderItemsData || []).map((item: any) => {
          const productDetail = productOptions.find(p => p.id === item.product_id);
          const designerDetail = designerOptions.find(d => d.id === item.designer_id);

          return {
            tempId: item.id,
            product_id: item.product_id,
            product_name: productDetail?.nama_produk || item.product_name || 'N/A',
            unit_price: item.unit_price,
            quantity: item.quantity,
            discount_per_item: item.discount_per_item,
            subtotal_per_item: item.subtotal_per_item,
            dimensions: item.dimensions,
            notes_per_item: item.notes_per_item,
            designer_id: item.designer_id,
            designer_name: designerDetail?.name || null,
            satuan_nama: productDetail?.satuan?.nama || null,
            bahan_nama: productDetail?.bahan?.nama || null,
            mesin_nama: productDetail?.mesin?.nama || null,
          };
        });

        const customerDetail = customerOptions.find(c => c.id === orderData.customer_id);

        setOrderFormData({
          customer_id: orderData.customer_id,
          customer_name: orderData.customer_display_name || customerDetail?.nama_pelanggan || '',
          customer_phone: orderData.customer_display_phone || customerDetail?.telepon || '',
          customer_address: customerDetail?.alamat || '',
          customer_notes: orderData.notes || '',
          order_date: orderData.order_date,
          pickup_date: orderData.pickup_date || '',
          priority: orderData.priority,
          items: loadedItems,
          total_amount: orderData.total_amount,
          discount_amount: orderData.discount_amount,
          tax_amount: orderData.tax_amount,
          final_amount: orderData.final_amount,
          payment_status: orderData.payment_status,
          order_status: orderData.order_status,
          notes: orderData.notes || '',
          // >>> penting: load dari DB untuk lanjut pending
          designer_id: orderData.designer_id || null,
        });

        resetCurrentItemForm();
        showSuccess('Transaksi tertunda berhasil dimuat!');
      } catch (err: any) {
        showError('Gagal memuat transaksi tertunda: ' + err.message);
        console.error('Error loading pending order:', err);
        loadedOrderIdRef.current = undefined;
      } finally {
        dismissToast(toastId);
        setIsLoadingOrder(false);
      }
    };

    fetchAndLoadOrder();
  }, [
    loadOrderId,
    isLoadingOrder,
    resetCurrentItemForm,
    setOrderFormData,
    clearOrderFormData,
    productOptions,
    designerOptions,
    customerOptions,
  ]);

  const handleFormChange = useCallback((e: any) => {
    const { name, value } = e.target;
    setOrderFormData((prev: OrderFormData) => ({ ...prev, [name]: value }));
  }, [setOrderFormData]);

  const handleSelectCustomer = useCallback((customer: { id: string; nama_pelanggan: string; telepon: string | null; alamat: string | null; }) => {
    setOrderFormData((prev: OrderFormData) => ({
      ...prev,
      customer_id: customer.id,
      customer_name: customer.nama_pelanggan,
      customer_phone: customer.telepon || '',
      customer_address: customer.alamat || '',
    }));
  }, [setOrderFormData]);

  const handleSelectProduct = useCallback((product: Product) => {
    setSelectedProduct(product);
    setItemQuantity(1);
    setItemNotes('');
    setItemDimensions({
      panjang: product.bahan?.ukuran_panjang || undefined,
      lebar: product.bahan?.ukuran_lebar || undefined,
      satuan: 'M',
      tebal_bahan_id: product.bahan?.id || undefined,
      tebal_bahan_nama: product.bahan?.nama || undefined,
    });
    setItemDiscount(0);
    setItemAdditionalOptions([]);
  }, []);

  const handleUpdateProductDetailsFromModal = useCallback((
    updatedQuantity: number,
    updatedDimensions: { panjang?: number; lebar?: number; satuan?: string; tebal_bahan_id?: string; tebal_bahan_nama?: string },
    updatedAdditionalOptions: AdditionalOption[]
  ) => {
    setItemQuantity(updatedQuantity);
    setItemDimensions(updatedDimensions);
    setItemAdditionalOptions(updatedAdditionalOptions);
  }, []);

  const handleAddItemToOrder = useCallback(() => {
    if (!selectedProduct || itemQuantity <= 0) {
      showError('Pilih produk dan masukkan kuantitas yang valid.');
      return;
    }

    const unitPrice = selectedProduct.harga_jual_umum;
    let calculatedPanjang = itemDimensions.panjang || 0;
    let calculatedLebar = itemDimensions.lebar || 0;

    if (itemDimensions.satuan === 'CM') {
      calculatedPanjang /= 100;
      calculatedLebar /= 100;
    }

    let subtotal = unitPrice * itemQuantity;
    if (selectedProduct.kategori?.nama === 'Cetak Outdoor' && calculatedPanjang > 0 && calculatedLebar > 0) {
      const area = calculatedPanjang * calculatedLebar;
      subtotal = unitPrice * area * itemQuantity;
    }

    const additionalCost = itemAdditionalOptions.reduce((total: number, option: AdditionalOption) => {
      return total + (option.selected && option.quantity > 0 ? option.cost * option.quantity : 0);
    }, 0);
    subtotal += additionalCost;
    subtotal -= itemDiscount;

    const newItem: OrderItem = {
      tempId: Date.now().toString(),
      product_id: selectedProduct.id,
      product_name: selectedProduct.nama_produk || 'Nama Produk Tidak Tersedia',
      unit_price: unitPrice,
      quantity: itemQuantity,
      discount_per_item: itemDiscount,
      subtotal_per_item: subtotal,
      dimensions: {
        ...itemDimensions,
        additional_options: itemAdditionalOptions.filter((opt: AdditionalOption) => opt.selected && opt.quantity > 0),
      },
      notes_per_item: itemNotes,
      designer_id: null,
      designer_name: null,
      satuan_nama: selectedProduct.satuan?.nama || null,
      bahan_nama: selectedProduct.bahan?.nama || null,
      mesin_nama: selectedProduct.mesin?.nama || null,
    };

    setOrderFormData((prev: OrderFormData) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));

    resetCurrentItemForm();
  }, [selectedProduct, itemQuantity, itemNotes, itemDimensions, itemDiscount, itemAdditionalOptions, resetCurrentItemForm, setOrderFormData]);

  const handleRemoveItem = useCallback((tempId: string) => {
    setOrderFormData((prev: OrderFormData) => ({
      ...prev,
      items: prev.items.filter(item => item.tempId !== tempId),
    }));
  }, [setOrderFormData]);

  const handleUpdateItemDesigner = useCallback((tempId: string, designerId: string, designerName: string) => {
    setOrderFormData((prev: OrderFormData) => ({
      ...prev,
      items: prev.items.map((item: OrderItem) =>
        item.tempId === tempId ? { ...item, designer_id: designerId, designer_name: designerName } : item
      ),
    }));
  }, [setOrderFormData]);

  const handleSaveOrder = useCallback(async (
    status: 'pending' | 'paid',
    paymentDetails?: PaymentDetails,
    options?: { skipPrint?: boolean }
  ) => {
    if (orderFormData.items.length === 0) {
      showError('Keranjang belanja kosong.');
      return;
    }

    if (!orderFormData.customer_id && !orderFormData.customer_name) {
      showError('Pilih pelanggan atau masukkan nama pelanggan.');
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

    const toastId = showLoading('Menyimpan pesanan...');

    try {
      // Pastikan customer_id valid
      const resolved = await resolveCustomerForOrder(orderFormData);

      // Merge lokal untuk proses save
      const formForSave: OrderFormData = {
        ...orderFormData,
        customer_id: resolved.customer_id,
        customer_name: resolved.name || orderFormData.customer_name,
        customer_phone: resolved.phone || orderFormData.customer_phone,
        customer_address: resolved.address || orderFormData.customer_address,
        customer_notes: resolved.notes || orderFormData.customer_notes,
      };

      // >>> KUNCI: jika ini transaksi baru & belum ada designer_id, catat sebagai user yang input pertama
      if (!loadOrderId && !formForSave.designer_id && currentUserId) {
        formForSave.designer_id = currentUserId;
      }

      const { orderDataToSave, itemsToInsert } = await prepareOrderDataForSave(
        formForSave,
        currentUserId,
        notaSettings,
        status,
        paymentDetails
      );

      if (loadOrderId) {
        await updateSalesOrder(
          loadOrderId,
          orderDataToSave,
          itemsToInsert,
          currentUserId,
          status,
          paymentDetails,
          options,
        );
      } else {
        await saveSalesOrder(
          orderDataToSave,
          itemsToInsert,
          currentUserId,
          status,
          paymentDetails,
          options,
        );
      }

      if (loadOrderId) {
        showSuccess(`Transaksi diperbarui sebagai ${status === 'pending' ? 'Pending' : 'Lunas'}.`);
      } else {
        showSuccess(`Transaksi baru ${status === 'pending' ? 'disimpan sebagai Pending' : 'Lunas'}.`);
      }

      setOrderFormData(initialOrderFormData);
      resetCurrentItemForm();
      clearOrderFormData();

      if (status === 'paid' && fetchPendingSales) {
        await fetchPendingSales();
      }
    } catch (error: any) {
      showError('Gagal menyimpan pesanan: ' + error.message);
      console.error('Error saving order:', error);
    } finally {
      dismissToast(toastId);
    }
  }, [
    orderFormData,
    currentUserId,
    loadingNotaSettings,
    notaSettings,
    initialOrderFormData,
    resetCurrentItemForm,
    setOrderFormData,
    clearOrderFormData,
    loadOrderId,
    fetchPendingSales
  ]);

  return {
    orderFormData,
    setOrderFormData,
    selectedProduct,
    setSelectedProduct,
    itemQuantity,
    setItemQuantity,
    itemNotes,
    setItemNotes,
    itemDimensions,
    setItemDimensions,
    itemDiscount,
    setItemDiscount,
    itemAdditionalOptions,
    setItemAdditionalOptions,
    currentItemSubtotal,
    handleFormChange,
    handleSelectCustomer,
    handleSelectProduct,
    handleUpdateProductDetailsFromModal,
    handleAddItemToOrder,
    handleRemoveItem,
    handleUpdateItemDesigner,
    handleSaveOrder,
    isDraftLoaded,
    resetOrderForm,
  };
};
