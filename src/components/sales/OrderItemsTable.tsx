import React, { useEffect, useMemo } from 'react';
import { Trash2 } from 'lucide-react';

interface AdditionalOption {
  id: string;
  name: string;
  cost: number;
  quantity: number;
  selected: boolean;
}

interface OrderItem {
  tempId: string;
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  discount_per_item: number;
  subtotal_per_item: number; /* Fixed: Changed from subtotal_per_per_item */
  dimensions: {
    panjang?: number;
    lebar?: number;
    satuan?: string;
    tebal_bahan_id?: string;
    tebal_bahan_nama?: string;
    additional_options?: AdditionalOption[];
  } | null;
  notes_per_item: string;
  designer_id: string | null;
  designer_name: string | null;
  satuan_nama: string | null;
  bahan_nama: string | null;
  mesin_nama: string | null;
}

interface DesignerOption {
  id: string;
  name: string;
}

interface OrderItemsTableProps {
  items: OrderItem[];
  designerOptions: DesignerOption[];
  onRemoveItem: (tempId: string) => void;
  onUpdateItemDesigner: (tempId: string, designerId: string, designerName: string) => void;
  currentUserId?: string;

  /** NEW: status order induk. Jika bukan "new", tombol hapus disembunyikan */
  orderStatus?: 'new' | 'proses_cetak' | 'siap_ambil' | string | null;
}

const OrderItemsTable: React.FC<OrderItemsTableProps> = ({
  items,
  designerOptions,
  onRemoveItem,
  onUpdateItemDesigner,
  currentUserId,
  orderStatus = 'new',
}) => {
  // Apakah user yang login adalah salah satu designer?
  const meAsDesigner = useMemo(
    () => (currentUserId ? designerOptions.find(d => d.id === currentUserId) : undefined),
    [currentUserId, designerOptions]
  );
  const isDesignerLoggedIn = !!meAsDesigner;

  // Auto-assign designer (yang login) jika item belum punya designer
  useEffect(() => {
    if (!meAsDesigner) return;
    if (!items?.length) return;

    items.forEach((item) => {
      if (!item.designer_id || item.designer_id === '') {
        onUpdateItemDesigner(item.tempId, meAsDesigner.id, meAsDesigner.name);
      }
    });
  }, [meAsDesigner, items, onUpdateItemDesigner]);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 flex-shrink-0">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Daftar Item Pesanan</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No.</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produk</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ukuran</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keterangan</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Desainer</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Harga</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Disc</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {
            items.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-2 text-center text-sm text-gray-500">
                  Belum ada item dalam pesanan.
                </td>
              </tr>
            ) : (
              items.map((item, index) => {
                const selectedDesignerName =
                  item.designer_name ||
                  designerOptions.find(d => d.id === item.designer_id)?.name ||
                  (isDesignerLoggedIn ? meAsDesigner?.name : '') ||
                  '';

                return (
                  <tr key={item.tempId}>
                    <td className="px-4 py-2 text-sm text-gray-900">{index + 1}</td>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">{item.product_name}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {item.dimensions?.panjang}x{item.dimensions?.lebar} {item.dimensions?.satuan}
                      {item.dimensions?.tebal_bahan_nama && ` (${item.dimensions.tebal_bahan_nama})`}
                      {item.dimensions?.additional_options && item.dimensions.additional_options.length > 0 && (
                        <div className="text-xs text-gray-600 mt-1">
                          {item.dimensions.additional_options.map(opt => `${opt.name} (${opt.quantity})`).join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">{item.notes_per_item || '-'}</td>

                    {/* Kolom Desainer */}
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {isDesignerLoggedIn ? (
                        // READONLY (designer tidak boleh ubah)
                        <div className="px-2 py-1 text-xs rounded border border-gray-200">
                          {selectedDesignerName || '—'}
                        </div>
                      ) : (
                        // ADMIN/KASIR bisa pilih dari dropdown
                        <select
                          value={item.designer_id || ''}
                          onChange={(e) =>
                            onUpdateItemDesigner(
                              item.tempId,
                              e.target.value,
                              e.target.options[e.target.selectedIndex].text
                            )
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-xs"
                        >
                          <option value="">Pilih Desainer</option>
                          {designerOptions.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      )}
                    </td>

                    <td className="px-4 py-2 text-sm text-gray-900">Rp {item.unit_price.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">Rp {item.discount_per_item.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      Rp {item.subtotal_per_item.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {/* Hanya tampilkan tombol hapus jika status order adalah "new" */}
                      {orderStatus === 'new' && (
                        <button
                          onClick={() => onRemoveItem(item.tempId)}
                          className="text-red-600 hover:text-red-900"
                          title="Hapus item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrderItemsTable;
