import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Search, Eye, Grid3X3 } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '../../utils/toast';

interface PolaItem {
  id: string;
  nama: string;
  ukuran: string;
  deskripsi: string;
}

const Pola: React.FC = () => {
  const [data, setData] = useState<PolaItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedItem, setSelectedItem] = useState<Partial<PolaItem>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initialPolaForm: Partial<PolaItem> = {
    nama: '',
    ukuran: '',
    deskripsi: '',
  };

  const fetchPola = async () => {
    setLoading(true);
    setError(null);
    const { data: polaList, error } = await supabase
      .from('pola')
      .select('*')
      .order('nama', { ascending: true });

    if (error) {
      console.error('Error fetching pola:', error);
      showError('Gagal memuat data pola.');
      setError(error.message);
    } else {
      setData(polaList || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPola();
  }, []);

  const filteredData = data.filter((item: PolaItem) =>
    item.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.ukuran.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openModal = (mode: 'add' | 'edit' | 'view', item?: PolaItem) => {
    setModalMode(mode);
    if (mode === 'add') {
      setSelectedItem(initialPolaForm);
    } else {
      setSelectedItem(item || {});
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedItem({});
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSelectedItem((prev: Partial<PolaItem>) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = showLoading(modalMode === 'add' ? 'Menambah pola...' : 'Menyimpan perubahan...');

    if (modalMode === 'add') {
      const { data: newPola, error } = await supabase
        .from('pola')
        .insert([selectedItem])
        .select()
        .single();

      if (error) {
        showError('Gagal menambah pola: ' + error.message);
      } else {
        setData((prev: PolaItem[]) => [...prev, newPola]);
        showSuccess('Pola berhasil ditambahkan!');
        closeModal();
      }
    } else if (modalMode === 'edit') {
      const { data: updatedPola, error } = await supabase
        .from('pola')
        .update(selectedItem)
        .eq('id', selectedItem.id)
        .select()
        .single();

      if (error) {
        showError('Gagal menyimpan perubahan: ' + error.message);
      } else {
        setData((prev: PolaItem[]) => prev.map((item: PolaItem) => (item.id === updatedPola.id ? updatedPola : item)));
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
    const toastId = showLoading('Menghapus pola...');
    const { error } = await supabase
      .from('pola')
      .delete()
      .eq('id', id);

    if (error) {
      showError('Gagal menghapus pola: ' + error.message);
    } else {
      setData((prev: PolaItem[]) => prev.filter((item: PolaItem) => item.id !== id));
      showSuccess('Pola berhasil dihapus!');
    }
    dismissToast(toastId);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">Memuat data pola...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 text-red-600">
        <p>Error: {error}</p>
        <button onClick={fetchPola} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
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
          <h1 className="text-2xl font-bold text-gray-900">Master Pola</h1>
          <p className="text-gray-600">Kelola pola untuk desain produk</p>
        </div>
        <button
          onClick={() => openModal('add')}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Tambah Pola
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Cari pola..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredData.map((item: PolaItem) => (
          <div key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start space-x-4">
              <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Grid3X3 className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{item.nama}</h3>
                  <div className="flex space-x-1">
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
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 mb-3">
                  {item.ukuran}
                </span>
                <p className="text-sm text-gray-600">{item.deskripsi}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {modalMode === 'add' ? 'Tambah Pola' :
                 modalMode === 'edit' ? 'Edit Pola' : 'Detail Pola'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="nama" className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Pola
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
                  <label htmlFor="ukuran" className="block text-sm font-medium text-gray-700 mb-1">
                    Ukuran
                  </label>
                    <input
                      type="text"
                      id="ukuran"
                      name="ukuran"
                      value={selectedItem?.ukuran || ''}
                      onChange={handleChange}
                      disabled={modalMode === 'view'}
                      placeholder="contoh: 100x70 cm atau Ø 50 cm"
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

export default Pola;