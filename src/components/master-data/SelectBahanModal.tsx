import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { showError } from '../../utils/toast';

interface BahanItemForSelection {
  id: string;
  nama: string;
  satuan: { nama: string } | null;
  isi: number;
  ukuran_panjang: number;
  ukuran_lebar: number;
  stok: number;
}

interface SelectBahanModalProps {
  onClose: () => void;
  onSelectBahan: (bahan: BahanItemForSelection) => void;
}

const SelectBahanModal: React.FC<SelectBahanModalProps> = ({ onClose, onSelectBahan }) => {
  const [bahanList, setBahanList] = useState<BahanItemForSelection[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBahan = async () => {
    setLoading(true);
    setError(null);
    const { data: fetchedBahanList, error } = await supabase
      .from('bahan')
      .select('id, nama, satuan(nama), isi, ukuran_panjang, ukuran_lebar, stok')
      .order('nama', { ascending: true });

    if (error) {
      console.error('Error fetching bahan for selection:', error);
      showError('Gagal memuat daftar bahan.');
      setError(error.message);
    } else {
      const mappedBahanList = (fetchedBahanList || []).map(bahan => ({
        ...bahan,
        satuan: Array.isArray(bahan.satuan) && bahan.satuan.length > 0 ? bahan.satuan[0] : null,
      }));
      setBahanList(mappedBahanList);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBahan();
  }, []);

  const filteredBahan = bahanList.filter(bahan =>
    bahan.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bahan.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bahan.satuan?.nama.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (bahan: BahanItemForSelection) => {
    onSelectBahan(bahan);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Pilih Bahan</h3>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Cari bahan (Kode, Nama, Satuan)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-48">
              <p className="text-gray-600">Memuat daftar bahan...</p>
            </div>
          ) : error ? (
            <div className="text-center p-4 text-red-600">
              <p>Error: {error}</p>
              <button onClick={fetchBahan} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Coba Lagi
              </button>
            </div>
          ) : filteredBahan.length === 0 ? (
            <div className="text-center p-4 text-gray-500">
              <p>Tidak ada bahan yang ditemukan.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No.</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kode</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Satuan</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Panjang</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lebar</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stok</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredBahan.map((bahan, index) => (
                    <tr key={bahan.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{bahan.id}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{bahan.nama}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{bahan.satuan?.nama || 'N/A'}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{bahan.ukuran_panjang}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{bahan.ukuran_lebar}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{bahan.stok}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          type="button"
                          onClick={() => handleSelect(bahan)}
                          className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs"
                        >
                          Pilih
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectBahanModal;