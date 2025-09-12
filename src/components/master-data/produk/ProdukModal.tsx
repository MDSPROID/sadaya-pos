import React from 'react';
import { ProdukItem, KategoriOption, SatuanOption, BahanOption, MesinOption, JenisMemberOption } from '../../../hooks/useProdukData';
import { ModalMode } from '../../../hooks/useProdukForm';
import ProdukFormTab from './ProdukFormTab';
import HargaGrosirTab from './HargaGrosirTab';
import HargaMemberTab from './HargaMemberTab';

interface ProdukModalProps {
  showModal: boolean;
  onClose: () => void;
  modalMode: ModalMode;
  selectedItem: Partial<ProdukItem>;
  onSave: (e: React.FormEvent) => Promise<void>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleGrosirChange: (satuanType: 'satuan1' | 'satuan2', field: string, value: any, index?: number) => void;
  newMemberPriceForm: { jenis_member_id: string; price: number };
  handleMemberPriceFormChange: (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => void;
  handleAddMemberPrice: () => void;
  handleDeleteMemberPrice: (jenisMemberId: string) => void;
  handleCancelMemberPriceEdit: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  kategoriOptions: KategoriOption[];
  satuanOptions: SatuanOption[];
  bahanOptions: BahanOption[];
  mesinOptions: MesinOption[];
  jenisMemberOptions: JenisMemberOption[];
  onKategoriQuickAdd: () => void;
  onSatuanQuickAdd: () => void;
  onBahanQuickAdd: () => void;
  onMesinQuickAdd: () => void;
  setSelectedItem: React.Dispatch<React.SetStateAction<Partial<ProdukItem>>>; // Pass through for use_bahan checkbox
}

const ProdukModal: React.FC<ProdukModalProps> = ({
  showModal,
  onClose,
  modalMode,
  selectedItem,
  onSave,
  handleChange,
  handleGrosirChange,
  newMemberPriceForm,
  handleMemberPriceFormChange,
  handleAddMemberPrice,
  handleDeleteMemberPrice,
  handleCancelMemberPriceEdit,
  activeTab,
  setActiveTab,
  kategoriOptions,
  satuanOptions,
  bahanOptions,
  mesinOptions,
  jenisMemberOptions,
  onKategoriQuickAdd,
  onSatuanQuickAdd,
  onBahanQuickAdd,
  onMesinQuickAdd,
  setSelectedItem,
}) => {
  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={onSave} className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {modalMode === 'add' ? 'Tambah Produk' :
             modalMode === 'edit' ? 'Edit Produk' : 'Detail Produk'}
          </h3>
          
          {/* Tabs */}
          <div className="border-b border-gray-200 mb-4">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                type="button"
                onClick={() => setActiveTab('produk')}
                className={`
                  ${activeTab === 'produk'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                  whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm
                `}
              >
                Produk
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('harga_grosir')}
                className={`
                  ${activeTab === 'harga_grosir'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                  whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm
                `}
              >
                Harga Grosir
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('harga_member')}
                className={`
                  ${activeTab === 'harga_member'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                  whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm
                `}
              >
                Harga Member
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'produk' && (
            <ProdukFormTab
              selectedItem={selectedItem}
              handleChange={handleChange}
              modalMode={modalMode}
              kategoriOptions={kategoriOptions}
              satuanOptions={satuanOptions}
              bahanOptions={bahanOptions}
              mesinOptions={mesinOptions}
              onKategoriQuickAdd={onKategoriQuickAdd}
              onSatuanQuickAdd={onSatuanQuickAdd}
              onBahanQuickAdd={onBahanQuickAdd}
              onMesinQuickAdd={onMesinQuickAdd}
              setSelectedItem={setSelectedItem}
            />
          )}

          {activeTab === 'harga_grosir' && (
            <HargaGrosirTab
              selectedItem={selectedItem}
              handleGrosirChange={handleGrosirChange}
              modalMode={modalMode}
            />
          )}

          {activeTab === 'harga_member' && (
            <HargaMemberTab
              selectedItem={selectedItem}
              newMemberPriceForm={newMemberPriceForm}
              handleMemberPriceFormChange={handleMemberPriceFormChange}
              handleAddMemberPrice={handleAddMemberPrice}
              handleDeleteMemberPrice={handleDeleteMemberPrice}
              handleCancelMemberPriceEdit={handleCancelMemberPriceEdit}
              modalMode={modalMode}
              jenisMemberOptions={jenisMemberOptions}
            />
          )}

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
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
  );
};

export default ProdukModal;