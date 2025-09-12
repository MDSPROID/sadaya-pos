import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Eye } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '../../utils/toast';
import { useFormPersistence } from '../../hooks/useFormPersistence';

interface KategoriItem {
  id: string;
  nama: string;
  deskripsi: string;
}

const Kategori: React.FC = () => {
  const [data, setData] = useState<KategoriItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initialKategoriForm: Partial<KategoriItem> = {
    nama: '',
    deskripsi: '',
  };

  const [selectedItem, setSelectedItem, clearSelectedItem] = useFormPersistence<Partial<KategoriItem>>({
    key: 'kategoriFormDraft',
    initialValue: initialKategoriForm,
    enabled: modalMode === 'add',
  });

  // useEffect(() => {
  //   if (isDraftLoaded && modalMode === 'add') {
  //     showSuccess('Draft formulir Kategori berhasil dimuat!');
  //   }
  // }, [isDraftLoaded, modalMode]);

  const fetchKategori = async () => {
    setLoading(true);
    setError(null);
    const { data: kategoriList, error } = await supabase
      .from('kategori')
      .select('*')
      .order('nama', { ascending: true });

    if (error) {
      console.error('Error fetching kategori:', error);
      showError('Gagal memuat data kategori.');
      setError(error.message);
    } else {
      setData(kategoriList || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchKategori();
  }, []);

  const filteredData = data.filter(item =>
    item.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.deskripsi.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openModal = (mode: 'add' | 'edit' | 'view', item?: KategoriItem) => {
    setModalMode(mode);
    if (mode === 'add') {
      setSelectedItem(initialKategoriForm);
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSelectedItem(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = showLoading(modalMode === 'add' ? 'Menambah kategori...' : 'Menyimpan perubahan...');

    if (modalMode === 'add') {
      const { data: newKategori, error } = await supabase
        .from('kategori')
        .insert([selectedItem])
        .select()
        .single();

      if (error) {
        showError('Gagal menambah kategori: ' + error.message);
      } else {
        setData(prev => [...prev, newKategori]);
        showSuccess('Kategori berhasil ditambahkan!');
        closeModal();
      }
    } else if (modalMode === 'edit') {
      const { data: updatedKategori, error } = await supabase
        .from('kategori')
        .update(selectedItem)
        .eq('id', selectedItem.id)
        .select()
        .single();

      if (error) {
        showError('Gagal menyimpan perubahan: ' + error.message);
      } else {
        setData(prev => prev.map(item => (item.id === updatedKategori.id ? updatedKategori : item)));
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
    const toastId = showLoading('Menghapus kategori...');
    const { error } = await supabase
      .from('kategori')
      .delete()
      .eq('id', id);

    if (error) {
      showError('Gagal menghapus kategori: ' + error.message);
    } else {
      setData(data.filter(item => item.id !== id));
      showSuccess('Kategori berhasil dihapus!');
    }
    dismissToast(toastId);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">Memuat data kategori...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 text-red-600">
        <p>Error: {error}</p>
        <button onClick={fetchKategori} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
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
          <h1 className="text-2xl font-bold text-gray-900">Master Kategori</h1>
          <p className="text-gray-600">Kelola kategori produk</p>
        </div>
        <button
          onClick={() => openModal('add')}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Tambah Kategori
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Cari kategori..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredData.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{item.nama}</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => openModal('view', item)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={() => openModal('edit', item)}
                  className="text-indigo-600 hover:text-indigo-800"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="text-gray-600 text-sm">{item.deskripsi}</p>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {modalMode === 'add' ? 'Tambah Kategori' :
                 modalMode === 'edit' ? 'Edit Kategori' : 'Detail Kategori'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="nama" className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Kategori
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
                  <label htmlFor="deskripsi" className="block text-sm font-medium text-gray-700 mb-1">
                    Deskripsi
                  </label>
                  <textarea
                    id="deskripsi"
                    name="deskripsi"
                    rows={4}
                    value={selectedItem?.deskripsi || ''}
                    onChange={handleChange}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
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

export default Kategori;