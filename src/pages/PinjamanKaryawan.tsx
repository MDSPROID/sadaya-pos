import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '../utils/toast';
import { useSession } from '../components/SessionContextProvider';
import { usePinjamanKaryawanData, PinjamanKaryawanItem } from '../hooks/usePinjamanKaryawanData';
import PinjamanKaryawanFormModal from '../components/back-office/PinjamanKaryawanFormModal';
import PinjamanKaryawanTable from '../components/back-office/PinjamanKaryawanTable';
import PaymentLoanModal from '../components/back-office/PaymentLoanModal'; // Import PaymentLoanModal
import { useFormPersistence } from '../hooks/useFormPersistence';
import { getSingleRelatedObject } from '../utils/dataHelpers'; // Import getSingleRelatedObject

const PinjamanKaryawan: React.FC = () => {
  const { session } = useSession();
  const currentUserId = session?.user?.id;

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [showPaymentModal, setShowPaymentModal] = useState(false); // State for payment modal
  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<PinjamanKaryawanItem | null>(null); // State for loan to pay

  const initialPinjamanKaryawanForm: Partial<PinjamanKaryawanItem> = {
    tanggal_pinjam: new Date().toISOString().split('T')[0],
    karyawan_id: '',
    jumlah_pinjaman: 0,
    jatuh_tempo: new Date().toISOString().split('T')[0], // Default to today
    status: 'active',
    keterangan: '',
    sisa_pinjaman: 0, // Initialize new fields
    jumlah_pembayaran: 0, // Initialize new fields
    payment_method: 'cash', // Default payment method
    bank_id: null, // Default bank ID
  };

  const [selectedItem, setSelectedItem, clearSelectedItem] = useFormPersistence<Partial<PinjamanKaryawanItem>>({
    key: 'pinjamanKaryawanFormDraft',
    initialValue: initialPinjamanKaryawanForm,
    enabled: modalMode === 'add', // Only persist when in 'add' mode
  });

  const {
    data,
    karyawanOptions,
    bankOptions, // Get bank options from hook
    loading,
    error,
    fetchPinjamanKaryawan,
    setData,
  } = usePinjamanKaryawanData({ startDate, endDate });

  const filteredData = data.filter(item =>
    item.profiles_karyawan?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.profiles_karyawan?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.keterangan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.payment_method.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.bank?.nama_bank?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openModal = (mode: 'add' | 'edit' | 'view', item?: PinjamanKaryawanItem) => {
    setModalMode(mode);
    if (mode === 'add') {
      setSelectedItem(prev => ({ ...prev, tanggal_pinjam: new Date().toISOString().split('T')[0], jatuh_tempo: new Date().toISOString().split('T')[0] }));
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

  const handleOpenPaymentModal = (item: PinjamanKaryawanItem) => {
    setSelectedLoanForPayment(item);
    setShowPaymentModal(true);
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedLoanForPayment(null);
  };

  const handleSubmit = async (formData: Partial<PinjamanKaryawanItem>) => {
    const toastId = showLoading(modalMode === 'add' ? 'Menambah pinjaman karyawan...' : 'Menyimpan perubahan...');

    const itemToSave = {
      tanggal_pinjam: formData.tanggal_pinjam,
      karyawan_id: formData.karyawan_id || null,
      jumlah_pinjaman: parseFloat(formData.jumlah_pinjaman as any),
      jatuh_tempo: formData.jatuh_tempo || null,
      status: formData.status || 'active',
      keterangan: formData.keterangan || null,
      dicatat_oleh_id: currentUserId,
      sisa_pinjaman: modalMode === 'add' ? parseFloat(formData.jumlah_pinjaman as any) : formData.sisa_pinjaman,
      jumlah_pembayaran: modalMode === 'add' ? 0 : formData.jumlah_pembayaran,
      payment_method: formData.payment_method || 'cash', // Include payment method
      bank_id: formData.payment_method === 'bank_transfer' ? formData.bank_id : null, // Include bank ID conditionally
    };

    try {
      if (modalMode === 'add') {
        const { data: newPinjaman, error } = await supabase
          .from('pinjaman_karyawan')
          .insert([itemToSave])
          .select(`
            id,
            created_at,
            tanggal_pinjam,
            karyawan_id,
            profiles_karyawan:profiles!pinjaman_karyawan_karyawan_id_fkey(first_name, last_name),
            jumlah_pinjaman,
            jatuh_tempo,
            status,
            keterangan,
            dicatat_oleh_id,
            profiles_dicatat_oleh:profiles!pinjaman_karyawan_dicatat_oleh_id_fkey(first_name, last_name),
            sisa_pinjaman,
            jumlah_pembayaran,
            payment_method,
            bank_id,
            bank:bank(nama_bank)
          `)
          .single();

        if (error) throw error;

        // Automate recording as Kas Keluar
        const selectedKaryawan = karyawanOptions.find(k => k.id === newPinjaman.karyawan_id);
        await supabase.from('kas_keluar').insert([{
          tanggal: newPinjaman.tanggal_pinjam,
          nama_pengeluaran: `Pinjaman Karyawan: ${selectedKaryawan?.first_name} ${selectedKaryawan?.last_name || ''}`,
          jumlah: newPinjaman.jumlah_pinjaman,
          keterangan: newPinjaman.keterangan || `Pinjaman untuk ${selectedKaryawan?.first_name} ${selectedKaryawan?.last_name || ''}`,
          petugas_id: currentUserId,
          payment_method: newPinjaman.payment_method, // Use loan's payment method
          bank_id: newPinjaman.bank_id, // Use loan's bank ID
        }]);

        const formattedNewPinjaman: PinjamanKaryawanItem = {
          ...newPinjaman,
          profiles_karyawan: getSingleRelatedObject(newPinjaman.profiles_karyawan),
          profiles_dicatat_oleh: getSingleRelatedObject(newPinjaman.profiles_dicatat_oleh),
          bank: getSingleRelatedObject(newPinjaman.bank),
        };
        setData(prev => [...prev, formattedNewPinjaman].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        showSuccess('Pinjaman karyawan berhasil ditambahkan dan dicatat sebagai pengeluaran!');
        closeModal();
      } else if (modalMode === 'edit') {
        const { data: updatedPinjaman, error } = await supabase
          .from('pinjaman_karyawan')
          .update(itemToSave)
          .eq('id', selectedItem.id)
          .select(`
            id,
            created_at,
            tanggal_pinjam,
            karyawan_id,
            profiles_karyawan:profiles!pinjaman_karyawan_karyawan_id_fkey(first_name, last_name),
            jumlah_pinjaman,
            jatuh_tempo,
            status,
            keterangan,
            dicatat_oleh_id,
            profiles_dicatat_oleh:profiles!pinjaman_karyawan_dicatat_oleh_id_fkey(first_name, last_name),
            sisa_pinjaman,
            jumlah_pembayaran,
            payment_method,
            bank_id,
            bank:bank(nama_bank)
          `)
          .single();

        if (error) throw error;

        const formattedUpdatedPinjaman: PinjamanKaryawanItem = {
          ...updatedPinjaman,
          profiles_karyawan: getSingleRelatedObject(updatedPinjaman.profiles_karyawan),
          profiles_dicatat_oleh: getSingleRelatedObject(updatedPinjaman.profiles_dicatat_oleh),
          bank: getSingleRelatedObject(updatedPinjaman.bank),
        };
        setData(prev => prev.map(item => (item.id === formattedUpdatedPinjaman.id ? formattedUpdatedPinjaman : item)));
        showSuccess('Perubahan berhasil disimpan!');
        closeModal();
      }
    } catch (err: any) {
      showError('Gagal menyimpan pinjaman karyawan: ' + err.message);
      console.error('Error saving loan:', err);
    } finally {
      dismissToast(toastId);
    }
  };

  const handleProcessLoanPayment = async (loanId: string, amountPaid: number, paymentMethod: string) => {
    if (!selectedLoanForPayment || !currentUserId) {
      showError('Data pinjaman atau pengguna tidak valid.');
      return;
    }

    const toastId = showLoading('Memproses pembayaran...');

    try {
      const newSisaPinjaman = selectedLoanForPayment.sisa_pinjaman - amountPaid;
      const newJumlahPembayaran = selectedLoanForPayment.jumlah_pembayaran + 1;
      let newStatus = selectedLoanForPayment.status;

      if (newSisaPinjaman <= 0) {
        newStatus = 'completed';
      } else if (newSisaPinjaman > 0 && selectedLoanForPayment.status === 'completed') {
        // If it was completed but now has remaining balance (e.g., due to partial payment or error correction)
        newStatus = 'active';
      }

      // 1. Update pinjaman_karyawan table
      const { error: updateLoanError } = await supabase
        .from('pinjaman_karyawan')
        .update({
          sisa_pinjaman: newSisaPinjaman,
          jumlah_pembayaran: newJumlahPembayaran,
          status: newStatus,
        })
        .eq('id', loanId);

      if (updateLoanError) throw updateLoanError;

      // 2. Insert into loan_payments table
      const { error: insertPaymentError } = await supabase
        .from('loan_payments')
        .insert([{
          loan_id: loanId,
          amount_paid: amountPaid,
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: paymentMethod,
          recorded_by_id: currentUserId,
        }]);

      if (insertPaymentError) throw insertPaymentError;

      // 3. Automate recording as Kas Masuk
      await supabase.from('kas_masuk').insert([{
        tanggal: new Date().toISOString().split('T')[0], // Tanggal pembayaran
        nama_pemasukan: `Pembayaran Pinjaman Karyawan: ${selectedLoanForPayment.profiles_karyawan?.first_name} ${selectedLoanForPayment.profiles_karyawan?.last_name || ''}`,
        jumlah: amountPaid,
        keterangan: `Pembayaran angsuran pinjaman oleh ${selectedLoanForPayment.profiles_karyawan?.first_name} ${selectedLoanForPayment.profiles_karyawan?.last_name || ''} (${paymentMethod})`,
        petugas_id: currentUserId,
        payment_method: paymentMethod === 'Cash' ? 'cash' : 'bank_transfer', // Map to 'cash' or 'bank_transfer'
        bank_id: paymentMethod === 'Bank Transfer' ? selectedLoanForPayment.bank_id : null, // Use loan's bank_id if bank transfer
      }]);

      // 4. Log activity
      await supabase.from('activity_logs').insert([{
        user_id: currentUserId,
        action: `Mencatat pembayaran pinjaman untuk ${selectedLoanForPayment.profiles_karyawan?.first_name} ${selectedLoanForPayment.profiles_karyawan?.last_name || ''}`,
        details: { loan_id: loanId, amount_paid: amountPaid, new_sisa_pinjaman: newSisaPinjaman, payment_method: paymentMethod },
      }]);

      showSuccess('Pembayaran berhasil dicatat dan masuk ke pemasukan!');
      handleClosePaymentModal();
      fetchPinjamanKaryawan(); // Refresh data
    } catch (err: any) {
      showError('Gagal memproses pembayaran: ' + err.message);
      console.error('Error processing loan payment:', err);
    } finally {
      dismissToast(toastId);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus data ini?')) {
      return;
    }
    const toastId = showLoading('Menghapus pinjaman karyawan...');
    const { error } = await supabase
      .from('pinjaman_karyawan')
      .delete()
      .eq('id', id);

    if (error) {
      showError('Gagal menghapus pinjaman karyawan: ' + error.message);
    } else {
      setData(data.filter(item => item.id !== id));
      showSuccess('Pinjaman karyawan berhasil dihapus!');
    }
    dismissToast(toastId);
  };

  const handleDeleteAll = async () => {
    if (!confirm('Yakin ingin menghapus SEMUA data pinjaman karyawan yang ditampilkan? Tindakan ini tidak dapat dibatalkan.')) {
      return;
    }
    const toastId = showLoading('Menghapus semua pinjaman karyawan...');
    const idsToDelete = filteredData.map(item => item.id);

    if (idsToDelete.length === 0) {
      showError('Tidak ada data untuk dihapus.');
      dismissToast(toastId);
      return;
    }

    const { error } = await supabase
      .from('pinjaman_karyawan')
      .delete()
      .in('id', idsToDelete);

    if (error) {
      showError('Gagal menghapus semua pinjaman karyawan: ' + error.message);
    } else {
      setData([]);
      showSuccess('Semua pinjaman karyawan berhasil dihapus!');
    }
    dismissToast(toastId);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">Memuat data pinjaman karyawan...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 text-red-600">
        <p>Error: {error}</p>
        <button onClick={() => fetchPinjamanKaryawan()} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
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
          <h1 className="text-2xl font-bold text-gray-900">Pinjaman Karyawan</h1>
          <p className="text-gray-600">Kelola catatan pinjaman yang diberikan kepada karyawan.</p>
        </div>
        <button
          onClick={() => openModal('add')}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Tambah Pinjaman
        </button>
      </div>

      <PinjamanKaryawanTable
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
        onOpenPaymentModal={handleOpenPaymentModal} // Pass the new handler
      />

      <PinjamanKaryawanFormModal
        isOpen={showModal}
        mode={modalMode}
        item={selectedItem}
        onClose={closeModal}
        onSubmit={handleSubmit}
        karyawanOptions={karyawanOptions}
        bankOptions={bankOptions} // Pass bank options
      />

      {showPaymentModal && (
        <PaymentLoanModal
          isOpen={showPaymentModal}
          onClose={handleClosePaymentModal}
          loan={selectedLoanForPayment}
          onProcessPayment={handleProcessLoanPayment}
        />
      )}
    </div>
  );
};

export default PinjamanKaryawan;