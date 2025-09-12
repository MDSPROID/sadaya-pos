import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '../utils/toast';
import { useSession } from '../components/SessionContextProvider';
import { useBahanKeluarData } from '../hooks/useBahanKeluarData';
import BahanKeluarFormModal from '../components/back-office/BahanKeluarFormModal';
import BahanKeluarTable from '../components/back-office/BahanKeluarTable';
import { useFormPersistence } from '../hooks/useFormPersistence'; // Import useFormPersistence

interface BahanKeluarItem {
  id: string;
  created_at: string;
  tanggal: string;
  invoice_id: string | null;
  operator_id: string | null;
  profiles_operator: { first_name: string; last_name: string } | null;
  bahan_id: string | null;
  bahan: { id: string; nama: string; satuan: { nama: string } | null; ukuran_panjang: number; ukuran_lebar: number } | null;
  jumlah: number;
  ukuran_panjang_keluar: number | null;
  ukuran_lebar_keluar: number | null;
  dicatat_oleh_id: string | null;
  profiles_dicatat_oleh: { first_name: string; last_name: string } | null;
}

const BahanKeluar: React.FC = () => {
  const { session } = useSession();
  const currentUserId = session?.user?.id;

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showSelectBahanModal, setShowSelectBahanModal] = useState(false);

  const initialBahanKeluarForm: Partial<BahanKeluarItem> = {
    tanggal: new Date().toISOString().split('T')[0],
    invoice_id: '',
    operator_id: '',
    bahan_id: '',
    jumlah: 0,
    ukuran_panjang_keluar: 0,
    ukuran_lebar_keluar: 0,
    bahan: null,
  };

  const [selectedItem, setSelectedItem, clearSelectedItem] = useFormPersistence<Partial<BahanKeluarItem>>({
    key: 'bahanKeluarFormDraft',
    initialValue: initialBahanKeluarForm,
    enabled: modalMode === 'add', // Only persist when in 'add' mode
  });

  // Effect to show toast when draft is loaded
  // useEffect(() => {
  //   if (isDraftLoaded && modalMode === 'add') {
  //     showSuccess('Draft formulir Bahan Keluar berhasil dimuat!');
  //   }
  // }, [isDraftLoaded, modalMode]);

  const {
    data,
    operatorOptions,
    loading,
    error,
    fetchBahanKeluar,
    setData,
  } = useBahanKeluarData({ startDate, endDate });

  const filteredData = data.filter(item =>
    item.bahan?.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.profiles_operator?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.profiles_operator?.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openModal = (mode: 'add' | 'edit' | 'view', item?: BahanKeluarItem) => {
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
    setSelectedItem({}); // Reset form state
    clearSelectedItem(); // Clear persisted data
  };

  const handleSelectBahanFromModal = (bahan: any) => {
    setSelectedItem(prev => ({
      ...prev,
      bahan_id: bahan.id,
      bahan: {
        id: bahan.id,
        nama: bahan.nama,
        satuan: bahan.satuan,
        ukuran_panjang: bahan.ukuran_panjang,
        ukuran_lebar: bahan.ukuran_lebar,
      },
      jumlah: bahan.isi,
      ukuran_panjang_keluar: bahan.ukuran_panjang,
      ukuran_lebar_keluar: bahan.ukuran_lebar,
    }));
    setShowSelectBahanModal(false);
  };

  const handleSubmit = async (formData: Partial<BahanKeluarItem>) => {
    const toastId = showLoading(modalMode === 'add' ? 'Menambah bahan keluar...' : 'Menyimpan perubahan...');

    const itemToSave = {
      tanggal: formData.tanggal,
      invoice_id: formData.invoice_id || null,
      operator_id: formData.operator_id || null,
      bahan_id: formData.bahan_id || null,
      jumlah: parseFloat(formData.jumlah as any),
      ukuran_panjang_keluar: parseFloat(formData.ukuran_panjang_keluar as any) || null,
      ukuran_lebar_keluar: parseFloat(formData.ukuran_lebar_keluar as any) || null,
      dicatat_oleh_id: currentUserId,
    };

    if (modalMode === 'add') {
      const { data: newBahanKeluar, error } = await supabase
        .from('bahan_keluar')
        .insert([itemToSave])
        .select(`
          *,
          profiles_operator:profiles!bahan_keluar_operator_id_fkey(first_name, last_name),
          bahan:bahan(id, nama, satuan(nama), ukuran_panjang, ukuran_lebar),
          profiles_dicatat_oleh:profiles!bahan_keluar_dicatat_oleh_id_fkey(first_name, last_name)
        `)
        .single();

      if (error) {
        showError('Gagal menambah bahan keluar: ' + error.message);
      } else {
        setData(prev => [...prev, newBahanKeluar].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        showSuccess('Bahan keluar berhasil ditambahkan!');
        closeModal();
      }
    } else if (modalMode === 'edit') {
      const { data: updatedBahanKeluar, error } = await supabase
        .from('bahan_keluar')
        .update(itemToSave)
        .eq('id', selectedItem.id)
        .select(`
          *,
          profiles_operator:profiles!bahan_keluar_operator_id_fkey(first_name, last_name),
          bahan:bahan(id, nama, satuan(nama), ukuran_pananjang, ukuran_lebar),
          profiles_dicatat_oleh:profiles!bahan_keluar_dicatat_oleh_id_fkey(first_name, last_name)
        `)
        .single();

      if (error) {
        showError('Gagal menyimpan perubahan: ' + error.message);
      } else {
        setData(prev => prev.map(item => (item.id === updatedBahanKeluar.id ? updatedBahanKeluar : item)));
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
    const toastId = showLoading('Menghapus bahan keluar...');
    const { error } = await supabase
      .from('bahan_keluar')
      .delete()
      .eq('id', id);

    if (error) {
      showError('Gagal menghapus bahan keluar: ' + error.message);
    } else {
      setData(data.filter(item => item.id !== id));
      showSuccess('Bahan keluar berhasil dihapus!');
    }
    dismissToast(toastId);
  };

  const handleDeleteAll = async () => {
    if (!confirm('Yakin ingin menghapus SEMUA data bahan keluar yang ditampilkan? Tindakan ini tidak dapat dibatalkan.')) {
      return;
    }
    const toastId = showLoading('Menghapus semua bahan keluar...');
    const idsToDelete = filteredData.map(item => item.id);

    if (idsToDelete.length === 0) {
      showError('Tidak ada data untuk dihapus.');
      dismissToast(toastId);
      return;
    }

    const { error } = await supabase
      .from('bahan_keluar')
      .delete()
      .in('id', idsToDelete);

    if (error) {
      showError('Gagal menghapus semua bahan keluar: ' + error.message);
    } else {
      setData([]);
      showSuccess('Semua bahan keluar berhasil dihapus!');
    }
    dismissToast(toastId);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">Memuat data bahan keluar...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 text-red-600">
        <p>Error: {error}</p>
        <button onClick={() => fetchBahanKeluar()} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
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
          <h1 className="text-2xl font-bold text-gray-900">Bahan Keluar</h1>
          <p className="text-gray-600">Catat bahan yang keluar dari stok untuk produksi atau keperluan lain.</p>
        </div>
        <button
          onClick={() => openModal('add')}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Tambah Pengeluaran
        </button>
      </div>

      <BahanKeluarTable
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
      />

      <BahanKeluarFormModal
        isOpen={showModal}
        mode={modalMode}
        item={selectedItem}
        onClose={closeModal}
        onSubmit={handleSubmit}
        operatorOptions={operatorOptions}
        onSelectBahan={handleSelectBahanFromModal}
        showSelectBahanModal={showSelectBahanModal}
        setShowSelectBahanModal={setShowSelectBahanModal}
      />
    </div>
  );
};

export default BahanKeluar;