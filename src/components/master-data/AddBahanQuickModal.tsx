import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '../../utils/toast';

interface SatuanOption {
  id: string;
  nama: string;
}

interface SupplierOption {
  id: string;
  nama: string;
  jenis_supplier: string;
}

interface AddBahanQuickModalProps {
  onClose: () => void;
  onSuccess: () => void;
  onShowAddSatuanModal: () => void;
  onShowAddSupplierModal: () => void;
}

const AddBahanQuickModal: React.FC<AddBahanQuickModalProps> = ({ onClose, onSuccess, onShowAddSatuanModal, onShowAddSupplierModal }) => {
  const [id, setId] = useState('');
  const [nama, setNama] = useState('');
  const [satuanId, setSatuanId] = useState('');
  const [isi, setIs] = useState<number | ''>(1);
  const [ukuranPanjang, setUkuranPanjang] = useState<number | ''>(1);
  const [ukuranLebar, setUkuranLebar] = useState<number | ''>(1);
  const [hargaBeli, setHargaBeli] = useState<number | ''>(0);
  const [stok, setStok] = useState<number | ''>(1);
  const [supplierId, setSupplierId] = useState('');

  const [satuanOptions, setSatuanOptions] = useState<SatuanOption[]>([]);
  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [errorOptions, setErrorOptions] = useState<string | null>(null);

  const fetchOptions = async () => {
    setLoadingOptions(true);
    setErrorOptions(null);
    try {
      const { data: satuanList, error: satuanError } = await supabase
        .from('satuan')
        .select('id, nama')
        .order('nama', { ascending: true });
      if (satuanError) throw satuanError;
      setSatuanOptions(satuanList || []);

      const { data: supplierList, error: supplierError } = await supabase
        .from('supplier')
        .select('id, nama, jenis_supplier')
        .order('nama', { ascending: true });
      if (supplierError) throw supplierError;
      setSupplierOptions(supplierList || []);

    } catch (err: any) {
      console.error('Error fetching options:', err);
      showError('Gagal memuat opsi: ' + err.message);
      setErrorOptions(err.message);
    } finally {
      setLoadingOptions(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim() || !nama.trim() || !satuanId || isi === '' || ukuranPanjang === '' || ukuranLebar === '' || hargaBeli === '' || stok === '' || !supplierId) {
      showError('Semua bidang wajib diisi.');
      return;
    }

    const toastId = showLoading('Menambah bahan...');

    const { error } = await supabase
      .from('bahan')
      .insert([{
        id,
        nama,
        satuan_id: satuanId,
        isi: parseFloat(isi as any),
        ukuran_panjang: parseFloat(ukuranPanjang as any),
        ukuran_lebar: parseFloat(ukuranLebar as any),
        harga_beli: parseFloat(hargaBeli as any),
        stok: parseFloat(stok as any),
        supplier_id: supplierId,
      }])
      .select()
      .single();

    if (error) {
      showError('Gagal menambah bahan: ' + error.message);
    } else {
      showSuccess('Bahan berhasil ditambahkan!');
      onSuccess();
      onClose();
    }
    dismissToast(toastId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Tambah Bahan Baru</h3>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {loadingOptions ? (
            <p className="text-gray-600">Memuat opsi...</p>
          ) : errorOptions ? (
            <p className="text-red-600">Error memuat opsi: {errorOptions}</p>
          ) : (
            <div className="space-y-4">
              <div>
                <label htmlFor="idBahan" className="block text-sm font-medium text-gray-700 mb-1">
                  ID Kode Bahan
                </label>
                <input
                  type="text"
                  id="idBahan"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label htmlFor="namaBahan" className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Bahan
                </label>
                <input
                  type="text"
                  id="namaBahan"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label htmlFor="satuanId" className="block text-sm font-medium text-gray-700 mb-1">
                  Satuan
                </label>
                <div className="flex items-center space-x-2">
                  <select
                    id="satuanId"
                    value={satuanId}
                    onChange={(e) => setSatuanId(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Pilih Satuan</option>
                    {satuanOptions.map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.nama}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={onShowAddSatuanModal}
                    className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="isi" className="block text-sm font-medium text-gray-700 mb-1">
                  Isi
                </label>
                <input
                  type="number"
                  id="isi"
                  value={isi}
                  onChange={(e) => setIs(parseFloat(e.target.value) || '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ukuran (P x L)
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    id="ukuranPanjang"
                    value={ukuranPanjang}
                    onChange={(e) => setUkuranPanjang(parseFloat(e.target.value) || '')}
                    className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Panjang"
                    required
                  />
                  <span className="flex items-center text-gray-500">X</span>
                  <input
                    type="number"
                    id="ukuranLebar"
                    value={ukuranLebar}
                    onChange={(e) => setUkuranLebar(parseFloat(e.target.value) || '')}
                    className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Lebar"
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="hargaBeli" className="block text-sm font-medium text-gray-700 mb-1">
                  Harga Beli
                </label>
                <input
                  type="number"
                  id="hargaBeli"
                  value={hargaBeli}
                  onChange={(e) => setHargaBeli(parseFloat(e.target.value) || '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label htmlFor="stok" className="block text-sm font-medium text-gray-700 mb-1">
                  Stok
                </label>
                <input
                  type="number"
                  id="stok"
                  value={stok}
                  onChange={(e) => setStok(parseFloat(e.target.value) || '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label htmlFor="supplierId" className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier
                </label>
                <div className="flex items-center space-x-2">
                  <select
                    id="supplierId"
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Pilih Supplier</option>
                    {supplierOptions.map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.jenis_supplier} - {opt.nama}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={onShowAddSupplierModal}
                    className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              disabled={loadingOptions}
            >
              Tambah
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBahanQuickModal;