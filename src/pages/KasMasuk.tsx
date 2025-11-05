import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '../utils/toast';
import { useSession } from '../components/SessionContextProvider';
import { useKasMasukData, KasMasukItem } from '../hooks/useKasMasukData';
import { useFormPersistence } from '../hooks/useFormPersistence';
import KasMasukFormModal from '../components/back-office/KasMasukFormModal'; // Import new modal component
import KasMasukTable from '../components/back-office/KasMasukTable'; // Import new table component

interface BankOption {
  id: string;
  nama_bank: string;
  rekening: string;
  nama_akun: string;
  charge: number;
}

const KasMasuk: React.FC = () => {
  const { session } = useSession();
  const currentUserId = session?.user?.id;

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [bankOptions, setBankOptions] = useState<BankOption[]>([]);

  const initialKasMasukForm: Partial<KasMasukItem> = {
    tanggal: new Date().toISOString().split('T')[0],
    nama_pemasukan: '',
    jumlah: 0,
    keterangan: '',
    payment_method: 'cash',
    bank_id: null,
  };

  const [selectedItem, setSelectedItem, clearSelectedItem] = useFormPersistence<Partial<KasMasukItem>>({
    key: 'kasMasukFormDraft',
    initialValue: initialKasMasukForm,
    enabled: modalMode === 'add',
  });

  const {
    data,
    loading,
    error,
    fetchKasMasuk,
    setData,
  } = useKasMasukData({ startDate, endDate });

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

  useEffect(() => {
    fetchBankOptions();
  }, []);

  // 🔁 Refresh data hanya tabel saat tanggal berubah
  useEffect(() => {
    fetchKasMasuk();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const filteredData = data.filter(item =>
    item.nama_pemasukan.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.keterangan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.profiles?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.profiles?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.payment_method.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.bank?.nama_bank?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openModal = (mode: 'add' | 'edit' | 'view', item?: KasMasukItem) => {
    setModalMode(mode);
    if (mode === 'add') {
      setSelectedItem(prev => ({ ...prev, tanggal: new Date().toISOString().split('T')[0] }));
    } else {
      setSelectedItem(item || {});
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    clearSelectedItem();
  };

  const handleSubmit = async (formData: Partial<KasMasukItem>) => {
    const toastId = showLoading(modalMode === 'add' ? 'Menambah pemasukan...' : 'Menyimpan perubahan...');

    const itemToSave = {
      tanggal: formData.tanggal,
      nama_pemasukan: formData.nama_pemasukan,
      jumlah: parseFloat(formData.jumlah as any),
      keterangan: formData.keterangan,
      petugas_id: currentUserId,
      payment_method: formData.payment_method || 'cash',
      bank_id: formData.payment_method === 'bank_transfer' ? formData.bank_id : null,
    };

    if (modalMode === 'add') {
      const { data: newKasMasuk, error } = await supabase
        .from('kas_masuk')
        .insert([itemToSave])
        .select('*, profiles(first_name, last_name), bank(nama_bank)')
        .single();

      if (error) {
        showError('Gagal menambah pemasukan: ' + error.message);
      } else {
        setData(prev => [...prev, newKasMasuk].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        showSuccess('Pemasukan berhasil ditambahkan!');
        closeModal();
      }
    } else if (modalMode === 'edit') {
      const { data: updatedKasMasuk, error } = await supabase
        .from('kas_masuk')
        .update(itemToSave)
        .eq('id', selectedItem.id)
        .select('*, profiles(first_name, last_name), bank(nama_bank)')
        .single();

      if (error) {
        showError('Gagal menyimpan perubahan: ' + error.message);
      } else {
        setData(prev => prev.map(item => (item.id === updatedKasMasuk.id ? updatedKasMasuk : item)));
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
    const toastId = showLoading('Menghapus pemasukan...');
    const { error } = await supabase
      .from('kas_masuk')
      .delete()
      .eq('id', id);

    if (error) {
      showError('Gagal menghapus pemasukan: ' + error.message);
    } else {
      setData(data.filter(item => item.id !== id));
      showSuccess('Pemasukan berhasil dihapus!');
    }
    dismissToast(toastId);
  };

  const handleDeleteAll = async () => {
    if (!confirm('Yakin ingin menghapus SEMUA data kas masuk yang ditampilkan? Tindakan ini tidak dapat dibatalkan.')) {
      return;
    }
    const toastId = showLoading('Menghapus semua pemasukan...');
    const idsToDelete = filteredData.map(item => item.id);

    if (idsToDelete.length === 0) {
      showError('Tidak ada data untuk dihapus.');
      dismissToast(toastId);
      return;
    }

    const { error } = await supabase
      .from('kas_masuk')
      .delete()
      .in('id', idsToDelete);

    if (error) {
      showError('Gagal menghapus semua pemasukan: ' + error.message);
    } else {
      setData([]);
      showSuccess('Semua pemasukan berhasil dihapus!');
    }
    dismissToast(toastId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kas Masuk</h1>
          <p className="text-gray-600">Kelola semua pemasukan kas perusahaan.</p>
        </div>
        <button
          onClick={() => openModal('add')}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Tambah Pemasukan
        </button>
      </div>

      {/* Error banner (tanpa full reload) */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
          Error: {error}{' '}
          <button onClick={fetchKasMasuk} className="ml-2 underline">Coba lagi</button>
        </div>
      )}

      <KasMasukTable
        data={filteredData}
        searchTerm={searchTerm}
        onSearchChange={(e) => setSearchTerm(e.target.value)}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        onOpenModal={openModal}
        onDelete={handleDelete}
        onDeleteAll={handleDeleteAll}
        // ⬇️ hanya tabel yang menunjukkan loading
        loading={loading}
      />

      <KasMasukFormModal
        isOpen={showModal}
        mode={modalMode}
        item={selectedItem}
        onClose={closeModal}
        onSubmit={handleSubmit}
        bankOptions={bankOptions}
      />
    </div>
  );
};

export default KasMasuk;
