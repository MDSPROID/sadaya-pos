import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { showError } from '../utils/toast';

export interface SalesByProductItem {
  product_id: string;
  product_name: string;
  qty_terjual: number;
  luas_terjual: number; // Sum of (panjang * lebar * quantity) for relevant products
  satuan_nama: string;
  kategori_nama: string;
  subtotal: number;
}

interface UseSalesByProductDataProps {
  startDate: string;
  endDate: string;
  categoryId: string | null;
}

export const useSalesByProductData = ({ startDate, endDate, categoryId }: UseSalesByProductDataProps) => {
  const [data, setData] = useState<SalesByProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSalesByProduct = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all paid order items within the date range, with product details
      let query = supabase
        .from('order_items')
        .select(`
          quantity,
          subtotal_per_item,
          dimensions,
          product:produk(
            id,
            nama_produk,
            kategori:kategori(nama),
            satuan:satuan(nama)
          ),
          order:orders(
            payment_status,
            order_date
          )
        `)
        .eq('order.payment_status', 'paid')
        .gte('order.order_date', startDate)
        .lte('order.order_date', endDate);

      const { data: orderItems, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const aggregatedData: { [productId: string]: SalesByProductItem } = {};

      (orderItems || []).forEach((item: any) => {
        const productId = item.product?.id;
        if (!productId) return;

        const productName = item.product?.nama_produk || 'N/A';
        const kategoriNama = item.product?.kategori?.nama || 'N/A';
        const satuanNama = item.product?.satuan?.nama || 'N/A';

        // Apply category filter
        if (categoryId && kategoriNama !== 'N/A' && kategoriNama !== categoryId) {
          return;
        }

        if (!aggregatedData[productId]) {
          aggregatedData[productId] = {
            product_id: productId,
            product_name: productName,
            qty_terjual: 0,
            luas_terjual: 0,
            satuan_nama: satuanNama,
            kategori_nama: kategoriNama,
            subtotal: 0,
          };
        }

        aggregatedData[productId].qty_terjual += item.quantity;
        aggregatedData[productId].subtotal += item.subtotal_per_item;

        // Calculate 'Luas Terjual' only for 'Cetak Outdoor' category
        if (kategoriNama === 'Cetak Outdoor' && item.dimensions?.panjang && item.dimensions?.lebar) {
          let panjang = item.dimensions.panjang;
          let lebar = item.dimensions.lebar;
          // Convert CM to M if unit is CM
          if (item.dimensions.satuan === 'CM') {
            panjang /= 100;
            lebar /= 100;
          }
          const area = panjang * lebar;
          aggregatedData[productId].luas_terjual += area * item.quantity;
        }
      });

      // Convert aggregated object to array and sort
      const result = Object.values(aggregatedData).sort((a, b) =>
        a.product_name.localeCompare(b.product_name)
      );

      setData(result);
    } catch (err: any) {
      console.error('Error fetching sales by product data:', err);
      showError('Gagal memuat laporan penjualan per produk: ' + err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, categoryId]);

  useEffect(() => {
    fetchSalesByProduct();
  }, [fetchSalesByProduct]);

  return {
    data,
    loading,
    error,
    fetchSalesByProduct,
  };
};