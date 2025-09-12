import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '../utils/toast';
import { useSession } from '../components/SessionContextProvider';
import { useNotaSettings } from './useNotaSettings';
import { generateInvoiceNumber } from '../utils/invoiceGenerator';
import { saveSalesOrder } from '../utils/salesDbOperations';
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

/**
 * Helper function to prepare order data and items for saving to the database.
 * This separates the data transformation logic from the main save function.
 */
const prepareOrderDataForSave = async (
  formData: OrderFormData,
  userId: string,
  notaSettings: any, // Consider defining a more specific type for notaSettings if available
  status: 'pending' | 'paid',
  paymentDetails?: PaymentDetails
) => {
  let orderNotes = formData.notes;
  if (paymentDetails) {
    orderNotes += `\nPayment Details: ${JSON.stringify(paymentDetails)}`;
  }

  const invoiceNumber = await generateInvoiceNumber(
    notaSettings.kode_referensi_penjualan || 'INV',
    notaSettings.metode_urutan || 'bulan',
    'sales'
  );

  const orderDataToSave: OrderDataToSave = {
    order_date: formData.order_date,
    pickup_date: formData.pickup_date || null,
    customer_id: formData.customer_id,
    customer_display_name: formData.customer_name,
    customer_display_phone: formData.customer_phone,
    kasir_id: userId,
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
  };

  const itemsToInsert: ItemToInsert[] = formData.items.map(item => ({
    ...item,
    subtotal_per_item: item.subtotal_per_item,
    order_id: '', // This will be set by the saveSalesOrder function
  }));

  return { orderDataToSave, itemsToInsert };
};

export const useSalesOrder = (
  loadOrderId?: string,
  productOptions: Product[] = [],
  designerOptions: DesignerOption[] = [],
  customerOptions: Customer[] = [],
  fetchPendingSales?: () => Promise<void> // New parameter for refreshing pending sales
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
  };

  // Use form persistence conditionally based on loadOrderId
  const [orderFormData, setOrderFormData, clearOrderFormData, isDraftLoaded] = useFormPersistence<OrderFormData>({
    key: 'salesOrderDraft',
    initialValue: initialOrderFormData,
    enabled: !loadOrderId, // Only persist when NOT loading a specific order
  });

  // Ref to track if a specific order has already been loaded
  const loadedOrderIdRef = useRef<string | undefined>(undefined);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false); // New state to prevent multiple fetches

  // State for current item input
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemNotes, setItemNotes] = useState<string>('');
  const [itemDimensions, setItemDimensions] = useState<{ panjang?: number; lebar?: number; satuan?: string; tebal_bahan_id?: string; tebal_bahan_nama?: string }>({});
  const [itemDiscount, setItemDiscount] = useState<number>(0);
  const [itemAdditionalOptions, setItemAdditionalOptions] = useState<AdditionalOption[]>([]);

  const currentItemSubtotal = (() => {
    if (!selectedProduct || itemQuantity <= 0) {
      return 0;
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

    const additionalCost = itemAdditionalOptions.reduce((total, option) => {
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

  useEffect(() => {
    const newTotalAmount = orderFormData.items.reduce((sum, item) => sum + item.subtotal_per_item, 0);
    const newDiscountAmount = orderFormData.items.reduce((sum, item) => sum + item.discount_per_item, 0);
    const newTaxAmount = 0;
    const newCartFinalAmount = newTotalAmount - newDiscountAmount + newTaxAmount;

    setOrderFormData(prev => ({
      ...prev,
      total_amount: newTotalAmount,
      discount_amount: newDiscountAmount,
      tax_amount: newTaxAmount,
      final_amount: newCartFinalAmount,
    }));
  }, [orderFormData.items, setOrderFormData]);

  // Effect to load pending order
  useEffect(() => {
    const fetchAndLoadOrder = async () => {
      // If no orderId to load, or if this orderId has already been processed by this effect instance,
      // or if a load is already in progress, return.
      if (!loadOrderId || loadedOrderIdRef.current === loadOrderId || isLoadingOrder) {
        return;
      }

      // Ensure productOptions, designerOptions, and customerOptions are loaded before proceeding
      // If not loaded, return and wait for the next render cycle (when dependencies changes).
      // Do NOT set loadedOrderIdRef here, as we might return early.
      if (productOptions.length === 0 || designerOptions.length === 0 || customerOptions.length === 0) {
        return;
      }

      setIsLoadingOrder(true); // Set loading state to true
      loadedOrderIdRef.current = loadOrderId; // Mark this order as being processed

      clearOrderFormData(); // Clear any existing draft when loading a specific order

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

        const loadedItems: OrderItem[] = (orderItemsData || []).map(item => {
          const productDetail = productOptions.find(p => p.id === item.product_id);
          const designerDetail = designerOptions.find(d => d.id === item.designer_id);

          return {
            tempId: item.id, // Use item.id as tempId for loaded items
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
        });

        resetCurrentItemForm();
        showSuccess('Transaksi tertunda berhasil dimuat!');
      } catch (err: any) {
        showError('Gagal memuat transaksi tertunda: ' + err.message);
        console.error('Error loading pending order:', err);
        // Reset loadedOrderIdRef if there was an error, so it can be retried
        loadedOrderIdRef.current = undefined;
      } finally {
        dismissToast(toastId);
        setIsLoadingOrder(false); // Reset loading state to false
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

  const handleFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setOrderFormData(prev => ({ ...prev, [name]: value }));
  }, [setOrderFormData]);

  const handleSelectCustomer = useCallback((customer: { id: string; nama_pelanggan: string; telepon: string | null; alamat: string | null; }) => {
    setOrderFormData(prev => ({
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
      satuan: 'M', // Always set to 'M' as default
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

    const additionalCost = itemAdditionalOptions.reduce((total, option) => {
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
        additional_options: itemAdditionalOptions.filter(opt => opt.selected && opt.quantity > 0),
      },
      notes_per_item: itemNotes,
      designer_id: null,
      designer_name: null,
      satuan_nama: selectedProduct.satuan?.nama || null,
      bahan_nama: selectedProduct.bahan?.nama || null,
      mesin_nama: selectedProduct.mesin?.nama || null,
    };

    setOrderFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem],
    }));

    resetCurrentItemForm();
  }, [selectedProduct, itemQuantity, itemNotes, itemDimensions, itemDiscount, itemAdditionalOptions, resetCurrentItemForm, setOrderFormData]);

  const handleRemoveItem = useCallback((tempId: string) => {
    setOrderFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.tempId !== tempId),
    }));
  }, [setOrderFormData]);

  const handleUpdateItemDesigner = useCallback((tempId: string, designerId: string, designerName: string) => {
    setOrderFormData(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.tempId === tempId ? { ...item, designer_id: designerId, designer_name: designerName } : item
      ),
    }));
  }, [setOrderFormData]);

  const handleSaveOrder = useCallback(async (status: 'pending' | 'paid', paymentDetails?: PaymentDetails) => {
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
      // If loading an existing pending order, delete it first
      if (loadOrderId && status === 'paid') {
        const { error: deleteItemsError } = await supabase
          .from('order_items')
          .delete()
          .eq('order_id', loadOrderId);
        if (deleteItemsError) throw deleteItemsError;

        const { error: deleteOrderError } = await supabase
          .from('orders')
          .delete()
          .eq('id', loadOrderId);
        if (deleteOrderError) throw deleteOrderError;
      }

      // Use the helper function to prepare data
      const { orderDataToSave, itemsToInsert } = await prepareOrderDataForSave(
        orderFormData,
        currentUserId,
        notaSettings,
        status,
        paymentDetails
      );

      await saveSalesOrder(
        orderDataToSave,
        itemsToInsert,
        currentUserId,
        status,
        paymentDetails,
      );

      showSuccess(`Pesanan berhasil disimpan sebagai ${status === 'pending' ? 'Pending' : 'Lunas'}!`);
      
      setOrderFormData(initialOrderFormData);
      resetCurrentItemForm();
      clearOrderFormData();

      // Refresh pending sales data if the order was paid
      if (status === 'paid' && fetchPendingSales) {
        await fetchPendingSales();
      }

    } catch (error: any) {
      showError('Gagal menyimpan pesanan: ' + error.message);
      console.error('Error saving order:', error);
    } finally {
      dismissToast(toastId);
    }
  }, [orderFormData, currentUserId, loadingNotaSettings, notaSettings, initialOrderFormData, resetCurrentItemForm, setOrderFormData, clearOrderFormData, loadOrderId, fetchPendingSales]);

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
  };
};