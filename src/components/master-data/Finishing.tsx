import React, { useMemo, useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Eye } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '../../utils/toast';
import { useFormPersistence } from '../../hooks/useFormPersistence';

interface KategoriOption {
  id: string;
  nama: string;
}

interface FinishingItem {
  id: string;
  nama: string;
  deskripsi: string;
  harga: number;
  satuan: string;
  kategori_id: string | null;
  kategori: { nama: string } | null;
}

// helper: aman untuk toLowerCase/includes
const s = (v: unknown) => (v ?? '').toString().toLowerCase();

const Finishing: React.FC = () => {
  const [data, setData] = useState<FinishingItem[]>([]);
  const [kategoriOptions, setKategoriOptions] = useState<KategoriOption[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKategoriFilter, setSelectedKategoriFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initialFinishingForm: Partial<FinishingItem> = {
    nama: '',
    deskripsi: '',
    harga: 0,
    satuan: '',
    kategori_id: '',
  };

  const [selectedItem, setSelectedItem, clearSelectedItem] = useFormPersistence<Partial<FinishingItem>>({
    key: 'finishingFormDraft',
    initialValue: initialFinishingForm,
    enabled: modalMode === 'add',
  });

  // useEffect(() => {
  //   if (isDraftLoaded && modalMode === 'add') {
  //     showSuccess('Draft formulir Finishing berhasil dimuat!');
  //   }
  // }, [isDraftLoaded, modalMode]);

  const fetchFinishing = async () => {
    setLoading(true);
    setError(null);
    const { data: finishingList, error } = await supabase
      .from('finishing')
      .select('*, kategori(nama)')
      .order('nama', { ascending: true });

    if (error) {
      console.error('Error fetching finishing:', error);
      showError('Gagal memuat data finishing.');
      setError(error.message);
    } else {
      setData(finishingList || []);
    }
    setLoading(false);
  };

  const fetchKategoriOptions = async () => {
    const { data: kategoriList, error } = await supabase
      .from('kategori')
      .select('id, nama')
      .order('nama', { ascending: true });

    if (error) {
      console.error('Error fetching kategori options:', error);
      showError('Gagal memuat opsi kategori.');
    } else {
      setKategoriOptions(kategoriList || []);
    }
  };

  useEffect(() => {
    fetchFinishing();
    fetchKategoriOptions();
  }, []);

  // opsi pencarian finishing
  // const filteredData = data.filter(item =>
  //   (item.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //   item.deskripsi.toLowerCase().includes(searchTerm.toLowerCase())) &&
  //   (selectedKategoriFilter === '' || item.kategori?.nama === selectedKategoriFilter)
  // );
  const filteredData = useMemo(() => {
    const q = s(searchTerm);
    const selected = s(selectedKategoriFilter);

    return data.filter((item) => {
      const nama = s(item.nama);
      const deskripsi = s(item.deskripsi);
      const kategoriNama = s(item.kategori?.nama);

      const matchesSearch = nama.includes(q) || deskripsi.includes(q);
      const matchesKategori = selected ? kategoriNama === selected : true;

      return matchesSearch && matchesKategori;
    });
  }, [data, searchTerm, selectedKategoriFilter]);

  const openModal = (mode: 'add' | 'edit' | 'view', item?: FinishingItem) => {
    setModalMode(mode);
    if (mode === 'add') {
      setSelectedItem(initialFinishingForm);
    } else {
      setSelectedItem(item || {});
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedItem({});
    clearSelectedItem();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSelectedItem(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = showLoading(modalMode === 'add' ? 'Menambah finishing...' : 'Menyimpan perubahan...');

    const itemToSave: Partial<FinishingItem> = {
      nama: selectedItem.nama,
      harga: selectedItem.harga,
      kategori_id: selectedItem.kategori_id,
      deskripsi: selectedItem.deskripsi,
      satuan: selectedItem.satuan,
    };

    if (modalMode === 'add') {
      const { data: newFinishing, error } = await supabase
        .from('finishing')
        .insert([itemToSave])
        .select('*, kategori(nama)')
        .single();

      if (error) {
        showError('Gagal menambah finishing: ' + error.message);
      } else {
        setData(prev => [...prev, newFinishing]);
        showSuccess('Finishing berhasil ditambahkan!');
        closeModal();
      }
    } else if (modalMode === 'edit') {
      const { data: updatedFinishing, error } = await supabase
        .from('finishing')
        .update(itemToSave)
        .eq('id', selectedItem.id)
        .select('*, kategori(nama)')
        .single();

      if (error) {
        showError('Gagal menyimpan perubahan: ' + error.message);
      } else {
        setData(prev => prev.map(item => (item.id === updatedFinishing.id ? updatedFinishing : item)));
        showSuccess('Perubahan berhasil disimpan!');
        closeModal();
      }
    }
    dismissToast(toastId);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus data ini?')) {
      return;
    }
    const toastId = showLoading('Menghapus finishing...');
    const { error } = await supabase
      .from('finishing')
      .delete()
      .eq('id', id);

    if (error) {
      showError('Gagal menghapus finishing: ' + error.message);
    } else {
      setData(data.filter(item => item.id !== id));
      showSuccess('Finishing berhasil dihapus!');
    }
    dismissToast(toastId);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">Memuat data finishing...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 text-red-600">
        <p>Error: {error}</p>
        <button onClick={fetchFinishing} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Master Finishing</h1>
          <p className="text-gray-600">Kelola data finishing untuk produk</p>
        </div>
        <button
          onClick={() => openModal('add')}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Tambah Finishing
        </button>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow-sm p-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-[2]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Cari finishing..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

          {/* Filter kategori + pencarian kategori */}
        <div className="relative flex-[1]">
          <select
            value={selectedKategoriFilter}
            onChange={(e) => setSelectedKategoriFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Filter by Kategori</option>
            {kategoriOptions.map(kategori => (
              <option key={kategori.id} value={kategori.nama}>{kategori.nama}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nama Finishing
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kategori
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deskripsi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Harga
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.nama}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {item.kategori?.nama || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{item.deskripsi}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Rp {item.harga?.toLocaleString() || '0'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openModal('view', item)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => openModal('edit', item)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {modalMode === 'add' ? 'Tambah Finishing' :
                 modalMode === 'edit' ? 'Edit Finishing' : 'Detail Finishing'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="nama" className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Finishing
                  </label>
                  <input
                    type="text"
                    id="nama"
                    name="nama"
                    value={selectedItem?.nama || ''}
                    onChange={handleChange}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="kategori_id" className="block text-sm font-medium text-gray-700 mb-1">
                    Kategori
                  </label>
                  <select
                    id="kategori_id"
                    name="kategori_id"
                    value={selectedItem?.kategori_id || ''}
                    onChange={handleChange}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    required
                  >
                    <option value="">Pilih Kategori</option>
                    {kategoriOptions.map(kategori => (
                      <option key={kategori.id} value={kategori.id}>{kategori.nama}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="harga" className="block text-sm font-medium text-gray-700 mb-1">
                    Harga
                  </label>
                  <input
                    type="number"
                    id="harga"
                    name="harga"
                    value={selectedItem?.harga || ''}
                    onChange={handleChange}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {modalMode === 'view' ? 'Tutup' : 'Batal'}
                </button>
                {modalMode !== 'view' && (
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {modalMode === 'add' ? 'Tambah' : 'Simpan'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finishing;