import React, { useState, useEffect } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '../../utils/toast';
import AddSatuanQuickModal from './AddSatuanQuickModal';
import AddSupplierQuickModal from './AddSupplierQuickModal';
import { useFormPersistence } from '../../hooks/useFormPersistence';

import BahanHeader from './BahanHeader';
import BahanSearch from './BahanSearch';
import BahanTable from './BahanTable';
import BahanFormModal from './BahanFormModal';

interface SatuanOption {
  id: string;
  nama: string;
}

interface SupplierOption {
  id: string;
  nama: string;
  jenis_supplier: string;
}

interface BahanItem {
  id: string;
  nama: string;
  satuan_id: string | null;
  satuan: { nama: string } | null;
  isi: number;
  ukuran_panjang: number;
  ukuran_lebar: number;
  harga_beli: number;
  stok: number;
  supplier_id: string | null;
  supplier: { nama: string; jenis_supplier: string } | null;
}

const Bahan: React.FC = () => {
  const [data, setData] = useState<BahanItem[]>([]);
  const [satuanOptions, setSatuanOptions] = useState<SatuanOption[]>([]);
  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddSatuanModal, setShowAddSatuanModal] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);

  const initialBahanForm: Partial<BahanItem> = {
    id: '',
    nama: '',
    satuan_id: '',
    isi: 1,
    ukuran_panjang: 1,
    ukuran_lebar: 1,
    harga_beli: 0,
    stok: 1,
    supplier_id: '',
  };

  const [selectedItem, setSelectedItem, clearSelectedItem] = useFormPersistence<Partial<BahanItem>>({
    key: 'bahanFormDraft',
    initialValue: initialBahanForm,
    enabled: modalMode === 'add',
  });

  // useEffect(() => {
  //   if (isDraftLoaded && modalMode === 'add') {
  //     showSuccess('Draft formulir Bahan berhasil dimuat!');
  //   }
  // }, [isDraftLoaded, modalMode]);

  const fetchBahan = async () => {
    setLoading(true);
    setError(null);
    const { data: bahanList, error } = await supabase
      .from('bahan')
      .select('*, satuan(nama), supplier(nama, jenis_supplier)')
      .order('nama', { ascending: true });

    if (error) {
      console.error('Error fetching bahan:', error);
      showError('Gagal memuat data bahan.');
      setError(error.message);
    } else {
      setData(bahanList || []);
    }
    setLoading(false);
  };

  const fetchSatuanOptions = async () => {
    const { data: satuanList, error } = await supabase
      .from('satuan')
      .select('id, nama')
      .order('nama', { ascending: true });

    if (error) {
      console.error('Error fetching satuan options:', error);
      showError('Gagal memuat opsi satuan.');
    } else {
      setSatuanOptions(satuanList || []);
    }
  };

  const fetchSupplierOptions = async () => {
    const { data: supplierList, error } = await supabase
      .from('supplier')
      .select('id, nama, jenis_supplier')
      .order('nama', { ascending: true });

    if (error) {
      console.error('Error fetching supplier options:', error);
      showError('Gagal memuat opsi supplier.');
    } else {
      setSupplierOptions(supplierList || []);
    }
  };

  useEffect(() => {
    fetchBahan();
    fetchSatuanOptions();
    fetchSupplierOptions();
  }, []);

  const filteredData = data.filter(item =>
    item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.satuan?.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.supplier?.nama.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openModal = (mode: 'add' | 'edit' | 'view', item?: BahanItem) => {
    setModalMode(mode);
    if (mode === 'add') {
      setSelectedItem(initialBahanForm);
    } else {
      setSelectedItem(item || {});
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    clearSelectedItem();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSelectedItem(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = showLoading(modalMode === 'add' ? 'Menambah bahan...' : 'Menyimpan perubahan...');

    const { satuan, supplier, ...itemToSave } = selectedItem;

    if (modalMode === 'add') {
      const { data: newBahan, error } = await supabase
        .from('bahan')
        .insert([itemToSave])
        .select('*, satuan(nama), supplier(nama, jenis_supplier)')
        .single();

      if (error) {
        showError('Gagal menambah bahan: ' + error.message);
      } else {
        setData(prev => [...prev, newBahan]);
        showSuccess('Bahan berhasil ditambahkan!');
        closeModal();
      }
    } else if (modalMode === 'edit') {
      const { data: updatedBahan, error } = await supabase
        .from('bahan')
        .update(itemToSave)
        .eq('id', selectedItem.id)
        .select('*, satuan(nama), supplier(nama, jenis_supplier)')
        .single();

      if (error) {
        showError('Gagal menyimpan perubahan: ' + error.message);
      } else {
        setData(prev => prev.map(item => (item.id === updatedBahan.id ? updatedBahan : item)));
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
    const toastId = showLoading('Menghapus bahan...');
    const { error } = await supabase
      .from('bahan')
      .delete()
      .eq('id', id);

    if (error) {
      showError('Gagal menghapus bahan: ' + error.message);
    } else {
      setData(data.filter(item => item.id !== id));
      showSuccess('Bahan berhasil dihapus!');
    }
    dismissToast(toastId);
  };

  return (
    <div className="space-y-6">
      <BahanHeader onAddClick={() => openModal('add')} />
      <BahanSearch searchTerm={searchTerm} onSearchChange={(e) => setSearchTerm(e.target.value)} />
      <BahanTable
        data={filteredData}
        loading={loading}
        error={error}
        onOpenModal={openModal}
        onDelete={handleDelete}
        onFetchBahan={fetchBahan}
      />

      <BahanFormModal
        isOpen={showModal}
        mode={modalMode}
        item={selectedItem}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onChange={handleChange}
        satuanOptions={satuanOptions}
        supplierOptions={supplierOptions}
        onShowAddSatuanModal={() => setShowAddSatuanModal(true)}
        onShowAddSupplierModal={() => setShowAddSupplierModal(true)}
      />

      {showAddSatuanModal && (
        <AddSatuanQuickModal 
          onClose={() => setShowAddSatuanModal(false)} 
          onSuccess={() => {
            fetchSatuanOptions();
            setShowAddSatuanModal(false);
          }} 
        />
      )}

      {showAddSupplierModal && (
        <AddSupplierQuickModal 
          onClose={() => setShowAddSupplierModal(false)} 
          onSuccess={() => {
            fetchSupplierOptions();
            setShowAddSupplierModal(false);
          }} 
        />
      )}
    </div>
  );
};

export default Bahan;