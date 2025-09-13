import React, { useState } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '../../utils/toast';

import { useProdukData } from '../../hooks/useProdukData';
import type { ProdukItem } from '../../hooks/useProdukData';
import { useProdukForm } from '../../hooks/useProdukForm';
import ProdukTable from './produk/ProdukTable';
import ProdukModal from './produk/ProdukModal';
import Pagination from '../Pagination';

import AddKategoriQuickModal from './AddKategoriQuickModal';
import AddSatuanQuickModal from './AddSatuanQuickModal';
import AddBahanQuickModal from './AddBahanQuickModal';
import AddMesinQuickModal from './AddMesinQuickModal';
import AddSupplierQuickModal from './AddSupplierQuickModal';

const Produk: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const {
    data: allProdukData,
    setData,
    totalCount,
    kategoriOptions,
    fetchKategoriOptions,
    satuanOptions,
    fetchSatuanOptions,
    bahanOptions,
    fetchBahanOptions,
    mesinOptions,
    fetchMesinOptions,
    jenisMemberOptions,
    loading,
    error,
    fetchProduk,
  } = useProdukData({ currentPage, pageSize, searchTerm });

  const {
    showModal,
    modalMode,
    selectedItem,
    activeTab,
    newMemberPriceForm,
    openModal,
    closeModal,
    handleChange,
    handleGrosirChange,
    handleMemberPriceFormChange,
    handleAddMemberPrice,
    handleDeleteMemberPrice,
    handleCancelMemberPriceEdit,
    setActiveTab,
    setSelectedItem,
  } = useProdukForm(jenisMemberOptions);

  const [showAddKategoriModal, setShowAddKategoriModal] = useState(false);
  const [showAddSatuanModal, setShowAddSatuanModal] = useState(false);
  const [showAddBahanModal, setShowAddBahanModal] = useState(false);
  const [showAddMesinModal, setShowAddMesinModal] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = showLoading(modalMode === 'add' ? 'Menambah produk...' : 'Menyimpan perubahan...');

    const { kategori, satuan, bahan, mesin, ...restOfItemToSave } = selectedItem;

    const itemToSave = {
      ...restOfItemToSave,
      member_prices: restOfItemToSave.member_prices || [],
    };

    try {
      if (modalMode === 'add') {
        const { data: newProduk, error: insertError } = await supabase
          .from('produk')
          .insert([itemToSave])
          .select('*, kategori(nama), satuan(nama), bahan(nama), mesin(nama)')
          .single();

        if (insertError) throw insertError;

        setData((prev: ProdukItem[]) => [...prev, newProduk]);
        showSuccess('Produk berhasil ditambahkan!');
        closeModal();
        fetchProduk();
      } else if (modalMode === 'edit') {
        const { data: updatedProduk, error: updateError } = await supabase
          .from('produk')
          .update(itemToSave)
          .eq('id', selectedItem.id)
          .select('*, kategori(nama), satuan(nama), bahan(nama), mesin(nama)')
          .single();

        if (updateError) throw updateError;

        setData((prev: ProdukItem[]) => prev.map((item: ProdukItem) => (item.id === updatedProduk.id ? updatedProduk : item)));
        showSuccess('Perubahan berhasil disimpan!');
        closeModal();
        fetchProduk();
      }
    } catch (err: any) {
      showError('Gagal menyimpan produk: ' + err.message);
      console.error('Error saving product:', err);
    } finally {
      dismissToast(toastId);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus data ini?')) {
      return;
    }
    const toastId = showLoading('Menghapus produk...');
    try {
      const { error: deleteError } = await supabase
        .from('produk')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setData((data: ProdukItem[]) => data.filter((item: ProdukItem) => item.id !== id));
      showSuccess('Produk berhasil dihapus!');
      fetchProduk();
    } catch (err: any) {
      showError('Gagal menghapus produk: ' + err.message);
      console.error('Error deleting product:', err);
    } finally {
      dismissToast(toastId);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setSearchTerm(newVal);
    setCurrentPage(1);

    // Opsi A: hanya filter client-side (paling simpel). Tidak perlu panggil fetch.
    // Opsi B (opsional): kalau mau server-side search, debounce & panggil fetchProduk override:
    // if (typingTimer.current) window.clearTimeout(typingTimer.current);
    // typingTimer.current = window.setTimeout(() => {
    //   fetchProduk({ searchTerm: newVal, page: 1 });
    // }, 300);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  // if (loading) {
  //   return (
  //     <div className="flex justify-center items-center h-64">
  //       <p className="text-gray-600">Memuat data produk...</p>
  //     </div>
  //   );
  // }

  if (error) {
    return (
      <div className="text-center p-4 text-red-600">
        <p>Error: {error}</p>
        <button onClick={fetchProduk} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ProdukTable
        data={allProdukData}
        loading={loading}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        // onSearchChange={(e) => {
        //   setSearchTerm(e.target.value);
        //   setCurrentPage(1);
        // }}
        onOpenModal={openModal}
        onDelete={handleDelete}
      />

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        pageSize={pageSize}
        totalItems={totalCount}
      />

      <ProdukModal
        showModal={showModal}
        onClose={closeModal}
        modalMode={modalMode}
        selectedItem={selectedItem}
        onSave={handleSaveProduct}
        handleChange={handleChange}
        handleGrosirChange={handleGrosirChange}
        newMemberPriceForm={newMemberPriceForm}
        handleMemberPriceFormChange={handleMemberPriceFormChange}
        handleAddMemberPrice={handleAddMemberPrice}
        handleDeleteMemberPrice={handleDeleteMemberPrice}
        handleCancelMemberPriceEdit={handleCancelMemberPriceEdit}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        kategoriOptions={kategoriOptions}
        satuanOptions={satuanOptions}
        bahanOptions={bahanOptions}
        mesinOptions={mesinOptions}
        jenisMemberOptions={jenisMemberOptions}
        onKategoriQuickAdd={() => setShowAddKategoriModal(true)}
        onSatuanQuickAdd={() => setShowAddSatuanModal(true)}
        onBahanQuickAdd={() => setShowAddBahanModal(true)}
        onMesinQuickAdd={() => setShowAddMesinModal(true)}
        setSelectedItem={setSelectedItem}
      />

      {showAddKategoriModal && (
        <AddKategoriQuickModal
          onClose={() => setShowAddKategoriModal(false)}
          onSuccess={() => {
            fetchKategoriOptions();
            setShowAddKategoriModal(false);
          }}
        />
      )}

      {showAddSatuanModal && (
        <AddSatuanQuickModal
          onClose={() => setShowAddSatuanModal(false)}
          onSuccess={() => {
            fetchSatuanOptions();
            setShowAddSatuanModal(false);
          }}
        />
      )}

      {showAddBahanModal && (
        <AddBahanQuickModal
          onClose={() => setShowAddBahanModal(false)}
          onSuccess={() => {
            fetchBahanOptions();
            setShowAddBahanModal(false);
          }}
          onShowAddSatuanModal={() => setShowAddSatuanModal(true)}
          onShowAddSupplierModal={() => setShowAddSupplierModal(true)}
        />
      )}

      {showAddMesinModal && (
        <AddMesinQuickModal
          onClose={() => setShowAddMesinModal(false)}
          onSuccess={() => {
            fetchMesinOptions();
            setShowAddMesinModal(false);
          }}
        />
      )}

      {showAddSupplierModal && (
        <AddSupplierQuickModal
          onClose={() => setShowAddSupplierModal(false)}
          onSuccess={() => {
            setShowAddSupplierModal(false);
          }}
        />
      )}
    </div>
  );
};

export default Produk;