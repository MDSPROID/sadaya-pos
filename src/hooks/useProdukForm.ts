import { useState, useCallback, useEffect } from 'react';
import { ProdukItem, defaultGrosirPrices, MemberPrice, JenisMemberOption } from './useProdukData'; // Import interfaces
import { showError, showSuccess } from '../utils/toast';

export type ModalMode = 'add' | 'edit' | 'view';

const FORM_DRAFT_KEY = 'produkFormDraft';

export const useProdukForm = (jenisMemberOptions: JenisMemberOption[]) => {
  const initialProdukItem: Partial<ProdukItem> = {
    id: '',
    nama_produk: '',
    kategori_id: '',
    satuan_id: '',
    bahan_id: '',
    quantity_bahan: 1,
    use_mesin: false,
    mesin_id: '',
    harga_pokok: 0,
    harga_jual_umum: 0,
    harga_jual_khusus: 0,
    stok: 1,
    barcode_1: '',
    barcode_2: '',
    keterangan: '',
    diskon_persen: 0,
    template_order: '',
    grosir_prices: defaultGrosirPrices,
    member_prices: [],
  };

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('add');
  const [selectedItem, setSelectedItem] = useState<Partial<ProdukItem>>({});
  const [activeTab, setActiveTab] = useState('produk'); // 'produk', 'harga_grosir', 'harga_member'

  const [newMemberPriceForm, setNewMemberPriceForm] = useState<{ jenis_member_id: string; price: number }>({
    jenis_member_id: '',
    price: 0,
  });

  // Effect to load draft from sessionStorage when component mounts
  useEffect(() => {
    const savedDraft = sessionStorage.getItem(FORM_DRAFT_KEY);
    if (savedDraft) {
      try {
        const draftItem = JSON.parse(savedDraft);
        // Only load if it's a new item being added (not editing/viewing existing)
        // And if the modal is intended to be 'add' mode
        if (modalMode === 'add') { // Removed draftItem.id === '' condition here
          const loadedItem = {
            ...initialProdukItem, // Start with a full default structure
            ...draftItem,        // Overlay with saved draft values
            grosir_prices: draftItem.grosir_prices || defaultGrosirPrices, // Ensure nested objects are also merged
            member_prices: draftItem.member_prices || [],
          };
          setSelectedItem(loadedItem);
          setShowModal(true); // Re-open modal if there's a draft
          // showSuccess('Draft formulir produk berhasil dimuat!'); // Removed toast
          console.log('Loaded draft from sessionStorage:', loadedItem); // Add log
        }
      } catch (e) {
        console.error("Failed to parse produk form draft from sessionStorage", e);
        sessionStorage.removeItem(FORM_DRAFT_KEY); // Clear invalid draft
      }
    }
  }, []); // Run only once on mount

  // Effect to save draft to sessionStorage whenever selectedItem changes
  useEffect(() => {
    // Save draft only if in 'add' mode and modal is open
    // Removed the condition `selectedItem.id === ''` to ensure saving continues even after ID is typed.
    if (showModal && modalMode === 'add') {
      console.log('Saving draft to sessionStorage:', selectedItem); // Add log
      sessionStorage.setItem(FORM_DRAFT_KEY, JSON.stringify(selectedItem));
    }
  }, [selectedItem, showModal, modalMode]);

  const openModal = useCallback((mode: ModalMode, item?: ProdukItem) => {
    setModalMode(mode);
    if (mode === 'add') {
      const savedDraft = sessionStorage.getItem(FORM_DRAFT_KEY);
      if (savedDraft) {
        try {
          const draftItem = JSON.parse(savedDraft);
          // Merge loaded draft with a complete initial structure to ensure all fields exist
          const loadedItem = {
            ...initialProdukItem, // Start with a full default structure
            ...draftItem,        // Overlay with saved draft values
            grosir_prices: draftItem.grosir_prices || defaultGrosirPrices, // Ensure nested objects are also merged
            member_prices: draftItem.member_prices || [],
          };
          setSelectedItem(loadedItem);
          setShowModal(true); // Re-open modal if there's a draft
          // showSuccess('Draft formulir produk berhasil dimuat!'); // Removed toast
          console.log('Loaded draft from sessionStorage:', loadedItem);
        } catch (e) {
          console.error("Failed to parse produk form draft from sessionStorage", e);
          sessionStorage.removeItem(FORM_DRAFT_KEY);
          setSelectedItem(initialProdukItem); // Fallback to clean initial state
        }
      } else {
        setSelectedItem(initialProdukItem); // Use clean initial state
      }
    } else { // This is for 'edit' or 'view' mode
      setSelectedItem(item ? { 
        ...item, 
        grosir_prices: item.grosir_prices || defaultGrosirPrices,
        member_prices: item.member_prices || [], 
      } : {});
      sessionStorage.removeItem(FORM_DRAFT_KEY); // Clear draft if opening existing item
    }
    setActiveTab('produk'); // Always start on the 'Produk' tab
    setNewMemberPriceForm({ jenis_member_id: '', price: 0 }); // Reset member price form
    setShowModal(true);
  }, [initialProdukItem]);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setSelectedItem({});
    setNewMemberPriceForm({ jenis_member_id: '', price: 0 });
    sessionStorage.removeItem(FORM_DRAFT_KEY); // Clear draft on close/cancel
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setSelectedItem(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setSelectedItem(prev => ({ ...prev, [name]: value }));
    }
  }, []);

  const handleGrosirChange = useCallback((satuanType: 'satuan1' | 'satuan2', field: string, value: any, index?: number) => {
    setSelectedItem(prev => {
      const newGrosirPrices = { ...prev?.grosir_prices || defaultGrosirPrices };
      if (field === 'active') {
        newGrosirPrices[satuanType].active = value;
      } else if (index !== undefined) {
        newGrosirPrices[satuanType].tiers[index] = {
          ...newGrosirPrices[satuanType].tiers[index],
          [field]: parseFloat(value) || 0,
        };
      }
      return { ...prev, grosir_prices: newGrosirPrices };
    });
  }, []);

  const handleMemberPriceFormChange = useCallback((e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewMemberPriceForm(prev => ({ ...prev, [name]: name === 'price' ? parseFloat(value) || 0 : value }));
  }, []);

  const handleAddMemberPrice = useCallback(() => {
    if (!newMemberPriceForm.jenis_member_id || newMemberPriceForm.price <= 0) {
      showError('Pilih jenis member dan masukkan harga yang valid.');
      return;
    }

    const selectedJenisMember = jenisMemberOptions.find(
      jm => jm.id === newMemberPriceForm.jenis_member_id
    );

    if (!selectedJenisMember) {
      showError('Jenis Member tidak ditemukan.');
      return;
    }

    let successMessage = ''; // Variable to hold the message

    setSelectedItem(prevSelectedItem => {
      const rawMemberPrices = prevSelectedItem?.member_prices;
      // Ensure currentMemberPrices is always an array
      const currentMemberPrices: MemberPrice[] = Array.isArray(rawMemberPrices) ? rawMemberPrices : [];

      let updatedMemberPrices: MemberPrice[];

      const existingPriceIndex = currentMemberPrices.findIndex(
        mp => mp.jenis_member_id === newMemberPriceForm.jenis_member_id
      );

      const newMemberPrice: MemberPrice = {
        jenis_member_id: newMemberPriceForm.jenis_member_id,
        jenis_member_nama: selectedJenisMember.nama,
        price: newMemberPriceForm.price,
      };

      if (existingPriceIndex !== -1) {
        // Update existing item
        updatedMemberPrices = currentMemberPrices.map((mp, idx) =>
          idx === existingPriceIndex ? newMemberPrice : mp
        );
        successMessage = 'Harga member berhasil diperbarui!'; // Set message here
      } else {
        // Add new item
        updatedMemberPrices = [...currentMemberPrices, newMemberPrice];
        successMessage = 'Harga member berhasil ditambahkan!'; // Set message here
      }

      return {
        ...prevSelectedItem,
        member_prices: updatedMemberPrices,
      };
    });

    // Call showSuccess AFTER setSelectedItem has been dispatched
    if (successMessage) {
      showSuccess(successMessage);
    }
    
    setNewMemberPriceForm({ jenis_member_id: '', price: 0 });
  }, [newMemberPriceForm, jenisMemberOptions]);

  const handleDeleteMemberPrice = useCallback((jenisMemberId: string) => {
    if (!confirm('Yakin ingin menghapus harga member ini?')) {
      return;
    }
    setSelectedItem(prev => {
      const rawMemberPrices = prev?.member_prices;
      // Ensure currentMemberPrices is always an array
      const currentMemberPrices: MemberPrice[] = Array.isArray(rawMemberPrices) ? rawMemberPrices : [];
      return {
        ...prev,
        member_prices: currentMemberPrices.filter(
          mp => mp.jenis_member_id !== jenisMemberId
        ),
      };
    });
    showSuccess('Harga member berhasil dihapus!');
  }, []);

  const handleCancelMemberPriceEdit = useCallback(() => {
    setNewMemberPriceForm({ jenis_member_id: '', price: 0 });
  }, []);

  return {
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
    setSelectedItem, // Expose for external updates if needed (e.g., initial load)
  };
};