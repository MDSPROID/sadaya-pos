import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Eye } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '../../utils/toast';
import { useFormPersistence } from '../../hooks/useFormPersistence';

interface SatuanItem {
  id: string;
  nama: string;
  hitung_satuan: boolean;
}

const Satuan: React.FC = () => {
  const [data, setData] = useState<SatuanItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initialSatuanForm: Partial<SatuanItem> = {
    nama: '',
    hitung_satuan: false,
  };

  const [selectedItem, setSelectedItem, clearSelectedItem] = useFormPersistence<Partial<SatuanItem>>({
    key: 'satuanFormDraft',
    initialValue: initialSatuanForm,
    enabled: modalMode === 'add',
  });

  // useEffect(() => {
  //   if (isDraftLoaded && modalMode === 'add') {
  //     showSuccess('Draft formulir Satuan berhasil dimuat!');
  //   }
  // }, [isDraftLoaded, modalMode]);

  const fetchSatuan = async () => {
    setLoading(true);
    setError(null);
    const { data: satuanList, error } = await supabase
      .from('satuan')
      .select('*')
      .order('nama', { ascending: true });

    if (error) {
      console.error('Error fetching satuan:', error);
      showError('Gagal memuat data satuan.');
      setError(error.message);
    } else {
      setData(satuanList || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSatuan();
  }, []);

  const filteredData = data.filter(item =>
    item.nama.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openModal = (mode: 'add' | 'edit' | 'view', item?: SatuanItem) => {
    setModalMode(mode);
    if (mode === 'add') {
      setSelectedItem(initialSatuanForm);
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSelectedItem(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = showLoading(modalMode === 'add' ? 'Menambah satuan...' : 'Menyimpan perubahan...');

    if (modalMode === 'add') {
      const { data: newSatuan, error } = await supabase
        .from('satuan')
        .insert([selectedItem])
        .select()
        .single();

      if (error) {
        showError('Gagal menambah satuan: ' + error.message);
      } else {
        setData(prev => [...prev, newSatuan]);
        showSuccess('Satuan berhasil ditambahkan!');
        closeModal();
      }
    } else if (modalMode === 'edit') {
      const { data: updatedSatuan, error } = await supabase
        .from('satuan')
        .update(selectedItem)
        .eq('id', selectedItem.id)
        .select()
        .single();

      if (error) {
        showError('Gagal menyimpan perubahan: ' + error.message);
      } else {
        setData(prev => prev.map(item => (item.id === updatedSatuan.id ? updatedSatuan : item)));
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
    const toastId = showLoading('Menghapus satuan...');
    const { error } = await supabase
      .from('satuan')
      .delete()
      .eq('id', id);

    if (error) {
      showError('Gagal menghapus satuan: ' + error.message);
    } else {
      setData(data.filter(item => item.id !== id));
      showSuccess('Satuan berhasil dihapus!');
    }
    dismissToast(toastId);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">Memuat data satuan...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 text-red-600">
        <p>Error: {error}</p>
        <button onClick={fetchSatuan} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
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
          <h1 className="text-2xl font-bold text-gray-900">Master Satuan</h1>
          <p className="text-gray-600">Kelola satuan untuk produk dan bahan</p>
        </div>
        <button
          onClick={() => openModal('add')}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Tambah Satuan
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Cari satuan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  No.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Satuan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hitung Satuan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.nama}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.hitung_satuan ? 'Ya' : 'Tidak'}
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
                {modalMode === 'add' ? 'Tambah Satuan' :
                 modalMode === 'edit' ? 'Edit Satuan' : 'Detail Satuan'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="nama" className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Satuan
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
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="hitung_satuan"
                    name="hitung_satuan"
                    checked={selectedItem?.hitung_satuan || false}
                    onChange={handleChange}
                    disabled={modalMode === 'view'}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="hitung_satuan" className="ml-2 block text-sm text-gray-900">
                    Hitung Satuan
                  </label>
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

export default Satuan;