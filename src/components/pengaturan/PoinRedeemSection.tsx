import React from 'react';
import { Search } from 'lucide-react';
import SelectMemberModal from './SelectMemberModal';

interface RedeemFormData {
  member_id: string;
  member_name: string;
  current_member_points: number;
  points_to_redeem: number;
  keterangan: string;
}

interface MemberItemForSelection {
  id: string;
  first_name: string;
  last_name: string;
  current_points: number;
}

interface PoinRedeemSectionProps {
  redeemFormData: RedeemFormData;
  isKasirOrAdmin: boolean;
  onFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSelectMember: (member: MemberItemForSelection) => void;
  onSubmit: (e: React.FormEvent) => void;
  onResetForm: () => void;
  showSelectMemberModal: boolean;
  setShowSelectMemberModal: (show: boolean) => void;
}

const PoinRedeemSection: React.FC<PoinRedeemSectionProps> = ({
  redeemFormData,
  isKasirOrAdmin,
  onFormChange,
  onSelectMember,
  onSubmit,
  onResetForm,
  showSelectMemberModal,
  setShowSelectMemberModal,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Tukar Poin</h3>
      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="member_id" className="block text-sm font-medium text-gray-700 mb-1">
            ID Member
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              id="member_id"
              name="member_id"
              value={redeemFormData.member_id ? `${redeemFormData.member_id.substring(0, 8)}...` : ''}
              disabled
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
              placeholder="Pilih anggota..."
            />
            <button
              type="button"
              onClick={() => setShowSelectMemberModal(true)}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div>
          <label htmlFor="member_name" className="block text-sm font-medium text-gray-700 mb-1">
            Nama
          </label>
          <input
            type="text"
            id="member_name"
            name="member_name"
            value={redeemFormData.member_name}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
          />
        </div>
        <div>
          <label htmlFor="current_member_points" className="block text-sm font-medium text-gray-700 mb-1">
            Jumlah Poin
          </label>
          <input
            type="text"
            id="current_member_points"
            name="current_member_points"
            value={redeemFormData.current_member_points.toLocaleString('id-ID')}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
          />
        </div>
        <div>
          <label htmlFor="points_to_redeem" className="block text-sm font-medium text-gray-700 mb-1">
            Tukar Sebanyak
          </label>
          <input
            type="number"
            id="points_to_redeem"
            name="points_to_redeem"
            value={redeemFormData.points_to_redeem || ''}
            onChange={onFormChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min="0"
            required
          />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="keterangan" className="block text-sm font-medium text-gray-700 mb-1">
            Keterangan
          </label>
          <textarea
            id="keterangan"
            name="keterangan"
            rows={3}
            value={redeemFormData.keterangan}
            onChange={onFormChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="md:col-span-2 flex justify-end space-x-3 mt-4">
          <button
            type="button"
            onClick={onResetForm}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Batal
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            disabled={!isKasirOrAdmin}
          >
            Tukar Poin
          </button>
        </div>
      </form>

      {showSelectMemberModal && (
        <SelectMemberModal
          onClose={() => setShowSelectMemberModal(false)}
          onSelectMember={onSelectMember}
        />
      )}
    </div>
  );
};

export default PoinRedeemSection;