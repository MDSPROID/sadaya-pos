import React, { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Product, Bahan } from '../../types/purchaseOrderTypes';

interface PurchaseItemInputFormProps {
  selectedPurchaseItem: Product | Bahan | null;
  itemQuantity: number;
  setItemQuantity: (qty: number) => void;
  itemNotes: string;
  setItemNotes: (notes: string) => void;
  itemUnitPrice: number;
  setItemUnitPrice: (price: number) => void;
  onSelectPurchaseItemClick: () => void;
  onAddItemToOrder: () => void;
}

const PurchaseItemInputForm: React.FC<PurchaseItemInputFormProps> = ({
  selectedPurchaseItem,
  itemQuantity,
  setItemQuantity,
  itemNotes,
  setItemNotes,
  itemUnitPrice,
  setItemUnitPrice,
  onSelectPurchaseItemClick,
  onAddItemToOrder,
}) => {
  const itemName = selectedPurchaseItem
    ? ('nama_produk' in selectedPurchaseItem ? selectedPurchaseItem.nama_produk : selectedPurchaseItem.nama)
    : '';
  const itemType = selectedPurchaseItem
    ? ('nama_produk' in selectedPurchaseItem ? 'Produk' : 'Bahan')
    : '';
  const itemSatuan = (selectedPurchaseItem as any)?.satuan?.nama || '';

  // === util format angka seperti di input penjualan ===
  const formatNumber = (value: number | undefined): string => {
    if (value === undefined || value === null || isNaN(value)) return '';
    return value.toLocaleString('id-ID');
  };

  // QTY: hanya digit → simpan number, tampil formatted
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setItemQuantity(0);
      return;
    }
    const cleanValue = value.replace(/[^\d]/g, '');
    const numericValue = parseFloat(cleanValue);
    if (!isNaN(numericValue)) {
      setItemQuantity(numericValue);
    }
  };

  const onlyDigits = (s: string) => s.replace(/[^\d]/g, '');
  const toNumber = (s: string) => {
    const n = parseInt(onlyDigits(s) || '0', 10);
    return Number.isFinite(n) ? n : 0;
  };
  const formatRupiahStr = (n: number) => n.toLocaleString('id-ID');
  
  const [unitPriceInput, setUnitPriceInput] = useState<string>('');
  useEffect(() => {
    // sinkronkan tampilan saat itemUnitPrice dari parent berubah
    setUnitPriceInput(itemUnitPrice > 0 ? formatRupiahStr(itemUnitPrice) : '');
  }, [itemUnitPrice]);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 flex-shrink-0">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Input Item Pembelian</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="item_id" className="block text-sm font-medium text-gray-700 mb-1">
            Kode Item
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              id="item_id"
              value={selectedPurchaseItem?.id || ''}
              disabled
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
              placeholder="Pilih bahan"
            />
            <button
              type="button"
              onClick={onSelectPurchaseItemClick}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="item_name_display" className="block text-sm font-medium text-gray-700 mb-1">
            Nama Item
          </label>
          <input
            type="text"
            id="item_name_display"
            value={itemName}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="item_type_display" className="block text-sm font-medium text-gray-700 mb-1">
              Tipe
            </label>
            <input
              type="text"
              id="item_type_display"
              value={itemType}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
            />
          </div>
          <div>
            <label htmlFor="item_satuan_display" className="block text-sm font-medium text-gray-700 mb-1">
              Satuan
            </label>
            <input
              type="text"
              id="item_satuan_display"
              value={itemSatuan}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
            />
          </div>
        </div>

        <div>
          <label htmlFor="item_notes" className="block text-sm font-medium text-gray-700 mb-1">
            Keterangan Item
          </label>
          <textarea
            id="item_notes"
            rows={2}
            value={itemNotes}
            onChange={(e) => setItemNotes(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Catatan spesifik untuk item ini"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="item_quantity" className="block text-sm font-medium text-gray-700 mb-1">
              QTY
            </label>
            <input
              type="text"                        // ✅ sama seperti penjualan
              id="item_quantity"
              value={formatNumber(itemQuantity)}  // ✅ tampil format ribuan
              onChange={handleQuantityChange}     // ✅ hanya digit → number
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
              inputMode="numeric"                 // ✅ mobile numeric keypad
            />
          </div>

          <div>
            <label htmlFor="item_unit_price" className="block text-sm font-medium text-gray-700 mb-1">
              Harga Satuan (Rp)
            </label>
            <input
              type="text"
              id="item_unit_price"
              value={unitPriceInput}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw.trim() === '') {
                  setUnitPriceInput('');
                  setItemUnitPrice(0);            // nilai ke parent = 0 saat kosong
                  return;
                }
                const digits = onlyDigits(raw);
                setUnitPriceInput(digits);        // tampil tanpa pemisah saat ketik
                setItemUnitPrice(toNumber(digits));
              }}
              onBlur={() => {
                if (unitPriceInput.trim() === '') return;             // biarkan kosong
                setUnitPriceInput(formatRupiahStr(toNumber(unitPriceInput))); // format saat blur
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              inputMode="numeric"                  // keypad numerik di mobile
              placeholder="0"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onAddItemToOrder}
          className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Tambah Ke Keranjang
        </button>
      </div>
    </div>
  );
};

export default PurchaseItemInputForm;
