import React, { useState } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '../../utils/toast';

import PelangganHeader from './PelangganHeader';
import PelangganSearch from './PelangganSearch';
import PelangganTable from './PelangganTable';
import PelangganModal from './PelangganModal';
import AddJenisMemberQuickModal from './AddJenisMemberQuickModal';
import Pagination from '../Pagination';
import { usePelangganData, PelangganItem } from '../../hooks/usePelangganData';
import { useFormPersistence } from '../../hooks/useFormPersistence';

const Pelanggan: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [showAddJenisMemberModal, setShowAddJenisMemberModal] = useState(false);

  const initialPelangganForm: Partial<PelangganItem> = {
    nama_pelanggan: '',
    organisasi: '',
    telepon: '',
    email: '',
    alamat: '',
    jenis_member_id: '',
    npwp: '',
    ppn: false,
  };

  const [selectedItem, setSelectedItem, clearSelectedItem] = useFormPersistence<Partial<PelangganItem>>({
    key: 'pelangganFormDraft',
    initialValue: initialPelangganForm,
    enabled: modalMode === 'add',
  });

  // useEffect(() => {
  //   if (isDraftLoaded && modalMode === 'add') {
  //     showSuccess('Draft formulir Pelanggan berhasil dimuat!');
  //   }
  // }, [isDraftLoaded, modalMode]);

  const {
    data,
    setData,
    totalCount,
    jenisMemberOptions,
    fetchJenisMemberOptions,
    loading,
    error,
    fetchPelanggan,
  } = usePelangganData({ searchTerm, currentPage, pageSize });

  const openModal = (mode: 'add' | 'edit' | 'view', item?: PelangganItem) => {
    setModalMode(mode);
    if (mode === 'add') {
      setSelectedItem(initialPelangganForm);
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
    const { name, value, type } = e.target;
    setSelectedItem((prev: Partial<PelangganItem>) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = showLoading(modalMode === 'add' ? 'Menambah pelanggan...' : 'Menyimpan perubahan...');

    const { jenis_member, ...itemToSave } = selectedItem;

    if (modalMode === 'add') {
      const { data: newPelanggan, error } = await supabase
        .from('pelanggan')
        .insert([itemToSave])
        .select('*, jenis_member(nama)')
        .single();

      if (error) {
        showError('Gagal menambah pelanggan: ' + error.message);
      } else {
        setData(prev => [...prev, newPelanggan]);
        showSuccess('Pelanggan berhasil ditambahkan!');
        closeModal();
        fetchPelanggan();
      }
    } else if (modalMode === 'edit') {
      const { data: updatedPelanggan, error } = await supabase
        .from('pelanggan')
        .update(itemToSave)
        .eq('id', selectedItem.id)
        .select('*, jenis_member(nama)')
        .single();

      if (error) {
        showError('Gagal menyimpan perubahan: ' + error.message);
      } else {
        setData(prev => prev.map(item => (item.id === updatedPelanggan.id ? updatedPelanggan : item)));
        showSuccess('Perubahan berhasil disimpan!');
        closeModal();
        fetchPelanggan();
      }
    }
    dismissToast(toastId);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus data ini?')) {
      return;
    }
    const toastId = showLoading('Menghapus pelanggan...');
    const { error } = await supabase
      .from('pelanggan')
      .delete()
      .eq('id', id);

    if (error) {
      showError('Gagal menghapus pelanggan: ' + error.message);
    } else {
      setData(data.filter(item => item.id !== id));
      showSuccess('Pelanggan berhasil dihapus!');
      fetchPelanggan();
    }
    dismissToast(toastId);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">Memuat data pelanggan...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 text-red-600">
        <p>Error: {error}</p>
        <button onClick={fetchPelanggan} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PelangganHeader onAddClick={() => openModal('add')} />
      <PelangganSearch
        searchTerm={searchTerm}
        onSearchChange={(term) => {
          setSearchTerm(term);
          setCurrentPage(1);
        }}
      />
      <PelangganTable data={data} openModal={openModal} handleDelete={handleDelete} />

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        pageSize={pageSize}
        totalItems={totalCount}
      />

      {showModal && (
        <PelangganModal
          modalMode={modalMode}
          selectedItem={selectedItem}
          handleChange={handleChange}
          handleSubmit={handleSubmit}
          onClose={closeModal}
          jenisMemberOptions={jenisMemberOptions}
          onAddJenisMemberClick={() => setShowAddJenisMemberModal(true)}
        />
      )}

      {showAddJenisMemberModal && (
        <AddJenisMemberQuickModal 
          onClose={() => setShowAddJenisMemberModal(false)} 
          onSuccess={() => {
            fetchJenisMemberOptions();
            setShowAddJenisMemberModal(false);
          }} 
        />
      )}
    </div>
  );
};

export default Pelanggan;