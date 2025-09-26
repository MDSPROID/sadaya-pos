import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Eye, X } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '../utils/toast';
import { useSession } from '../components/SessionContextProvider';
import { useKasKeluarData, KasKeluarItem } from '../hooks/useKasKeluarData';
import { useFormPersistence } from '../hooks/useFormPersistence';

interface BankOption {
  id: string;
  nama_bank: string;
  rekening: string;
  nama_akun: string;
  charge: number;
}

interface JenisOption {
  id: string;
  nama_jenis: string;
}

type KasKeluarItemEx = KasKeluarItem & {
  jenis_pengeluaran_id?: string | null;
  jenis_pengeluaran?: { nama_jenis: string } | null;
};

const KasKeluar: React.FC = () => {
  const { session } = useSession();
  const currentUserId = session?.user?.id;

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [bankOptions, setBankOptions] = useState<BankOption[]>([]);
  const [jenisOptions, setJenisOptions] = useState<JenisOption[]>([]);

  // === STATE MODAL JENIS BARU ===
  const [showJenisModal, setShowJenisModal] = useState(false);
  const [jenisNama, setJenisNama] = useState('');
  const [savingJenis, setSavingJenis] = useState(false);

  const initialKasKeluarForm: Partial<KasKeluarItemEx> = {
    tanggal: new Date().toISOString().split('T')[0],
    nama_pengeluaran: '',
    jenis_pengeluaran_id: null,
    jumlah: 0,
    keterangan: '',
    payment_method: 'cash',
    bank_id: null,
  };

  const [selectedItem, setSelectedItem, clearSelectedItem] = useFormPersistence<Partial<KasKeluarItemEx>>({
    key: 'kasKeluarFormDraft',
    initialValue: initialKasKeluarForm,
    enabled: modalMode === 'add',
  });

  const {
    data,
    loading,
    error,
    fetchKasKeluar,
    setData,
  } = useKasKeluarData({ startDate, endDate });

  const fetchBankOptions = async () => {
    const { data: bankList, error } = await supabase
      .from('bank')
      .select('id, nama_bank, rekening, nama_akun, charge')
      .order('nama_bank', { ascending: true });

    if (error) {
      console.error('Error fetching bank options:', error);
      showError('Gagal memuat opsi bank.');
    } else {
      setBankOptions(bankList || []);
    }
  };

  const fetchJenisOptions = async () => {
    const { data: jenisList, error } = await supabase
      .from('jenis_pengeluaran')
      .select('id, nama_jenis')
      .order('nama_jenis', { ascending: true });

    if (error) {
      console.error('Error fetching jenis options:', error);
      showError('Gagal memuat jenis pengeluaran.');
    } else {
      setJenisOptions(jenisList || []);
    }
  };

  useEffect(() => {
    fetchBankOptions();
    fetchJenisOptions();
  }, []);

  const filteredData = data.filter(item =>
    item.nama_pengeluaran.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.keterangan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.profiles?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.profiles?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.payment_method.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.bank?.nama_bank?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openModal = (mode: 'add' | 'edit' | 'view', item?: KasKeluarItemEx) => {
    setModalMode(mode);
    if (mode === 'add') {
      setSelectedItem(prev => ({
        ...prev,
        tanggal: new Date().toISOString().split('T')[0],
        jenis_pengeluaran_id: prev?.jenis_pengeluaran_id ?? null,
      }));
    } else {
      setSelectedItem({
        ...item,
        jenis_pengeluaran_id: (item as any)?.jenis_pengeluaran_id ?? null,
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    clearSelectedItem();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSelectedItem(prev => ({ ...prev, [name]: value }));
  };

  // === MODAL JENIS BARU ===
  const openJenisModal = () => {
    setJenisNama('');
    setShowJenisModal(true);
  };
  const closeJenisModal = () => {
    if (savingJenis) return;
    setShowJenisModal(false);
    setJenisNama('');
  };
  const handleSubmitJenis = async (e: React.FormEvent) => {
    e.preventDefault();
    const nama = jenisNama.trim();
    if (!nama) {
      showError('Nama jenis tidak boleh kosong.');
      return;
    }
    const toastId = showLoading('Menambahkan jenis...');
    try {
      setSavingJenis(true);
      const { data: inserted, error } = await supabase
        .from('jenis_pengeluaran')
        .insert([{ nama_jenis: nama }])
        .select('id, nama_jenis')
        .single();

      if (error) throw error;

      await fetchJenisOptions();
      setSelectedItem(prev => ({ ...prev, jenis_pengeluaran_id: inserted.id }));
      showSuccess('Jenis pengeluaran ditambahkan.');
      setShowJenisModal(false);
      setJenisNama('');
    } catch (err: any) {
      console.error(err);
      showError(err?.message || 'Gagal menambah jenis.');
    } finally {
      dismissToast(toastId);
      setSavingJenis(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = showLoading(modalMode === 'add' ? 'Menambah pengeluaran...' : 'Menyimpan perubahan...');

    const itemToSave: any = {
      tanggal: selectedItem.tanggal,
      nama_pengeluaran: selectedItem.nama_pengeluaran,
      jenis_pengeluaran_id: selectedItem.jenis_pengeluaran_id || null,
      jumlah: parseFloat(selectedItem.jumlah as any),
      keterangan: selectedItem.keterangan,
      petugas_id: currentUserId,
      payment_method: selectedItem.payment_method || 'cash',
      bank_id: selectedItem.payment_method === 'bank_transfer' ? selectedItem.bank_id : null,
    };

    if (modalMode === 'add') {
      const { data: newKasKeluar, error } = await supabase
        .from('kas_keluar')
        .insert([itemToSave])
        .select('*, profiles(first_name, last_name), bank(nama_bank), jenis_pengeluaran(nama_jenis)')
        .single();

      if (error) {
        showError('Gagal menambah pengeluaran: ' + error.message);
      } else {
        setData(prev => [...prev, newKasKeluar].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        showSuccess('Pengeluaran berhasil ditambahkan!');
        closeModal();
      }
    } else if (modalMode === 'edit') {
      const { data: updatedKasKeluar, error } = await supabase
        .from('kas_keluar')
        .update(itemToSave)
        .eq('id', (selectedItem as any).id)
        .select('*, profiles(first_name, last_name), bank(nama_bank), jenis_pengeluaran(nama_jenis)')
        .single();

      if (error) {
        showError('Gagal menyimpan perubahan: ' + error.message);
      } else {
        setData(prev => prev.map(item => (item.id === updatedKasKeluar.id ? updatedKasKeluar : item)));
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
    const toastId = showLoading('Menghapus pengeluaran...');
    const { error } = await supabase
      .from('kas_keluar')
      .delete()
      .eq('id', id);

    if (error) {
      showError('Gagal menghapus pengeluaran: ' + error.message);
    } else {
      setData(data.filter(item => item.id !== id));
      showSuccess('Pengeluaran berhasil dihapus!');
    }
    dismissToast(toastId);
  };

  const handleDeleteAll = async () => {
    if (!confirm('Yakin ingin menghapus SEMUA data kas keluar yang ditampilkan? Tindakan ini tidak dapat dibatalkan.')) {
      return;
    }
    const toastId = showLoading('Menghapus semua pengeluaran...');
    const idsToDelete = filteredData.map(item => item.id);

    if (idsToDelete.length === 0) {
      showError('Tidak ada data untuk dihapus.');
      dismissToast(toastId);
      return;
    }

    const { error } = await supabase
      .from('kas_keluar')
      .delete()
      .in('id', idsToDelete);

    if (error) {
      showError('Gagal menghapus semua pengeluaran: ' + error.message);
    } else {
      setData([]);
      showSuccess('Semua pengeluaran berhasil dihapus!');
    }
    dismissToast(toastId);
  };

  const formatPaymentMethod = (method: string | null | undefined) => {
    if (!method) return 'N/A';
    return method.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">Memuat data kas keluar...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 text-red-600">
        <p>Error: {error}</p>
        <button onClick={fetchKasKeluar} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
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
          <h1 className="text-2xl font-bold text-gray-900">Kas Keluar</h1>
          <p className="text-gray-600">Kelola semua pengeluaran kas perusahaan.</p>
        </div>
        <button
          onClick={() => openModal('add')}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Tambah Pengeluaran
        </button>
      </div>

      {/* Search and Date Filter */}
      <div className="bg-white rounded-lg shadow-sm p-6 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Cari pengeluaran..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <label htmlFor="startDate" className="text-sm font-medium text-gray-700">Dari:</label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <label htmlFor="endDate" className="text-sm font-medium text-gray-700">Sampai:</label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  Tanggal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jam
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pengeluaran
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Keterangan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Petugas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jumlah
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Metode Pembayaran
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    Tidak ada data kas keluar.
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(item.tanggal).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.nama_pengeluaran}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{item.keterangan}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.profiles ? `${item.profiles.first_name} ${item.profiles.last_name || ''}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Rp {item.jumlah?.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPaymentMethod(item.payment_method)}
                      {item.bank?.nama_bank && ` (${item.bank.nama_bank})`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openModal('view', item as any)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => openModal('edit', item as any)}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 mt-6">
        <button
          onClick={handleDeleteAll}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Hapus Semua (Filter)
        </button>
      </div>

      {/* Modal Form Kas Keluar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {modalMode === 'add' ? 'Tambah Pengeluaran' :
                 modalMode === 'edit' ? 'Edit Pengeluaran' : 'Detail Pengeluaran'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="tanggal" className="block text-sm font-medium text-gray-700 mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    id="tanggal"
                    name="tanggal"
                    value={selectedItem?.tanggal || ''}
                    onChange={handleChange}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="nama_pengeluaran" className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Pengeluaran
                  </label>
                  <input
                    type="text"
                    id="nama_pengeluaran"
                    name="nama_pengeluaran"
                    value={selectedItem?.nama_pengeluaran || ''}
                    onChange={handleChange}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    required
                  />
                </div>

                {/* === JENIS PENGELUARAN (dropdown + tombol + hijau) === */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jenis Pengeluaran
                  </label>
                  <div className="flex gap-2">
                    <select
                      name="jenis_pengeluaran_id"
                      value={(selectedItem?.jenis_pengeluaran_id as string) || ''}
                      onChange={handleChange}
                      disabled={modalMode === 'view'}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    >
                      <option value="">— Pilih Jenis —</option>
                      {jenisOptions.map(j => (
                        <option key={j.id} value={j.id}>{j.nama_jenis}</option>
                      ))}
                    </select>
                    {modalMode !== 'view' && (
                      <button
                        type="button"
                        onClick={openJenisModal}
                        className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
                        title="Tambah jenis baru"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="jumlah" className="block text-sm font-medium text-gray-700 mb-1">
                    Jumlah
                  </label>
                  <input
                    type="number"
                    id="jumlah"
                    name="jumlah"
                    value={selectedItem?.jumlah || ''}
                    onChange={handleChange}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="keterangan" className="block text-sm font-medium text-gray-700 mb-1">
                    Keterangan
                  </label>
                  <textarea
                    id="keterangan"
                    name="keterangan"
                    rows={3}
                    value={selectedItem?.keterangan || ''}
                    onChange={handleChange}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                  />
                </div>

                {/* Metode Pembayaran */}
                <div>
                  <label htmlFor="payment_method" className="block text-sm font-medium text-gray-700 mb-1">
                    Metode Pembayaran
                  </label>
                  <select
                    id="payment_method"
                    name="payment_method"
                    value={selectedItem?.payment_method || 'cash'}
                    onChange={handleChange}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    required
                  >
                    <option value="cash">Tunai</option>
                    <option value="bank_transfer">Transfer Bank</option>
                  </select>
                </div>

                {/* Bank jika transfer */}
                {selectedItem?.payment_method === 'bank_transfer' && (
                  <div>
                    <label htmlFor="bank_id" className="block text-sm font-medium text-gray-700 mb-1">
                      Pilih Bank
                    </label>
                    <select
                      id="bank_id"
                      name="bank_id"
                      value={selectedItem?.bank_id || ''}
                      onChange={handleChange}
                      disabled={modalMode === 'view'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                      required
                    >
                      <option value="">Pilih Bank</option>
                      {bankOptions.map(bank => (
                        <option key={bank.id} value={bank.id}>
                          {bank.nama_bank} ({bank.rekening})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {modalMode === 'view' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Petugas
                    </label>
                    <input
                      type="text"
                      value={selectedItem?.profiles ? `${selectedItem.profiles.first_name} ${selectedItem.profiles.last_name || ''}` : 'N/A'}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
                    />
                  </div>
                )}
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

      {/* === MODAL INPUT JENIS PENGELUARAN BARU === */}
      {showJenisModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg w-full max-w-md shadow-lg">
            <form onSubmit={handleSubmitJenis} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold">Tambah Jenis Pengeluaran</h3>
                <button
                  type="button"
                  onClick={closeJenisModal}
                  className="p-2 rounded-md hover:bg-gray-100"
                  aria-label="Tutup"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Jenis
                  </label>
                  <input
                    type="text"
                    value={jenisNama}
                    onChange={(e) => setJenisNama(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                    placeholder="Mis. Operasional Toko, Listrik, ATK..."
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeJenisModal}
                  disabled={savingJenis}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingJenis}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                >
                  {savingJenis ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KasKeluar;
