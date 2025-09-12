import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Eye } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '../../utils/toast';
import { useFormPersistence } from '../../hooks/useFormPersistence';

interface BankItem {
  id: string;
  nama_bank: string;
  rekening: string;
  nama_akun: string;
  charge: number;
}

const Bank: React.FC = () => {
  const [data, setData] = useState<BankItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initialBankForm: Partial<BankItem> = {
    nama_bank: '',
    rekening: '',
    nama_akun: '',
    charge: 0,
  };

  const [selectedItem, setSelectedItem, clearSelectedItem] = useFormPersistence<Partial<BankItem>>({
    key: 'bankFormDraft',
    initialValue: initialBankForm,
    enabled: modalMode === 'add',
  });

  // useEffect(() => {
  //   if (isDraftLoaded && modalMode === 'add') {
  //     showSuccess('Draft formulir Bank berhasil dimuat!');
  //   }
  // }, [isDraftLoaded, modalMode]);

  const fetchBank = async () => {
    setLoading(true);
    setError(null);
    const { data: bankList, error } = await supabase
      .from('bank')
      .select('*')
      .order('nama_bank', { ascending: true });

    if (error) {
      console.error('Error fetching bank:', error);
      showError('Gagal memuat data bank.');
      setError(error.message);
    } else {
      setData(bankList || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBank();
  }, []);

  const filteredData = data.filter(item =>
    item.nama_bank.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.rekening.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.nama_akun.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openModal = (mode: 'add' | 'edit' | 'view', item?: BankItem) => {
    setModalMode(mode);
    if (mode === 'add') {
      setSelectedItem(initialBankForm);
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
    const { name, value } = e.target;
    setSelectedItem(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = showLoading(modalMode === 'add' ? 'Menambah bank...' : 'Menyimpan perubahan...');

    if (modalMode === 'add') {
      const { data: newBank, error } = await supabase
        .from('bank')
        .insert([selectedItem])
        .select()
        .single();

      if (error) {
        showError('Gagal menambah bank: ' + error.message);
      } else {
        setData(prev => [...prev, newBank]);
        showSuccess('Bank berhasil ditambahkan!');
        closeModal();
      }
    } else if (modalMode === 'edit') {
      const { data: updatedBank, error } = await supabase
        .from('bank')
        .update(selectedItem)
        .eq('id', selectedItem.id)
        .select()
        .single();

      if (error) {
        showError('Gagal menyimpan perubahan: ' + error.message);
      } else {
        setData(prev => prev.map(item => (item.id === updatedBank.id ? updatedBank : item)));
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
    const toastId = showLoading('Menghapus bank...');
    const { error } = await supabase
      .from('bank')
      .delete()
      .eq('id', id);

    if (error) {
      showError('Gagal menghapus bank: ' + error.message);
    } else {
      setData(data.filter(item => item.id !== id));
      showSuccess('Bank berhasil dihapus!');
    }
    dismissToast(toastId);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">Memuat data bank...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 text-red-600">
        <p>Error: {error}</p>
        <button onClick={fetchBank} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
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
          <h1 className="text-2xl font-bold text-gray-900">Master Bank</h1>
          <p className="text-gray-600">Kelola rekening bank perusahaan</p>
        </div>
        <button
          onClick={() => openModal('add')}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Tambah Bank
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Cari bank..."
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
                  Nama Bank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rekening
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nama
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Charge
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.nama_bank}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.rekening}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.nama_akun}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.charge}%
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
                {modalMode === 'add' ? 'Tambah Bank' :
                 modalMode === 'edit' ? 'Edit Bank' : 'Detail Bank'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="nama_bank" className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Bank
                  </label>
                  <input
                    type="text"
                    id="nama_bank"
                    name="nama_bank"
                    value={selectedItem?.nama_bank || ''}
                    onChange={handleChange}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="rekening" className="block text-sm font-medium text-gray-700 mb-1">
                    Rekening
                  </label>
                  <input
                    type="text"
                    id="rekening"
                    name="rekening"
                    value={selectedItem?.rekening || ''}
                    onChange={handleChange}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="nama_akun" className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Akun
                  </label>
                  <input
                    type="text"
                    id="nama_akun"
                    name="nama_akun"
                    value={selectedItem?.nama_akun || ''}
                    onChange={handleChange}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="charge" className="block text-sm font-medium text-gray-700 mb-1">
                    Charge
                  </label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      id="charge"
                      name="charge"
                      value={selectedItem?.charge || 0}
                      onChange={handleChange}
                      disabled={modalMode === 'view'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                      required
                    />
                    <span className="ml-2 text-gray-700">%</span>
                  </div>
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

export default Bank;