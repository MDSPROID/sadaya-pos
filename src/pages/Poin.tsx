import React, { useState } from 'react';
import { supabase } from '../integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '../utils/toast';
import { useSession } from '../components/SessionContextProvider';
import { usePoinSettings } from '../hooks/usePoinSettings';
import { usePointHistory } from '../hooks/usePointHistory';
import PoinSettingsSection from '../components/pengaturan/PoinSettingsSection';
import PoinRedeemSection from '../components/pengaturan/PoinRedeemSection';
import PointHistoryTable from '../components/pengaturan/PointHistoryTable';

interface MemberItemForSelection {
  id: string;
  first_name: string;
  last_name: string;
  current_points: number;
}

const Poin: React.FC = () => {
  const { session, profile } = useSession();
  const currentUserId = session?.user?.id;
  const isAdminOrSuperAdmin = profile?.role === 'Super Admin' || profile?.role === 'Admin';
  const isKasirOrAdmin = isAdminOrSuperAdmin || profile?.role === 'Kasir';

  const {
    settings,
    loadingSettings,
    errorSettings,
    isEditingSettings,
    setIsEditingSettings,
    handleSettingsChange,
    handleSaveSettings,
    fetchSettings,
  } = usePoinSettings(isAdminOrSuperAdmin);

  const {
    pointHistory,
    loadingHistory,
    errorHistory,
    historySearchTerm,
    setHistorySearchTerm,
    fetchPointHistory,
  } = usePointHistory();

  const [redeemFormData, setRedeemFormData] = useState({
    member_id: '',
    member_name: '',
    current_member_points: 0,
    points_to_redeem: 0,
    keterangan: '',
  });
  const [showSelectMemberModal, setShowSelectMemberModal] = useState(false);

  const handleRedeemFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRedeemFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectMember = (member: MemberItemForSelection) => {
    setRedeemFormData(prev => ({
      ...prev,
      member_id: member.id,
      member_name: `${member.first_name} ${member.last_name || ''}`,
      current_member_points: member.current_points,
    }));
  };

  const handleResetRedeemForm = () => {
    setRedeemFormData({
      member_id: '',
      member_name: '',
      current_member_points: 0,
      points_to_redeem: 0,
      keterangan: '',
    });
  };

  const handleRedeemPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isKasirOrAdmin) {
      showError('Anda tidak memiliki izin untuk menukar poin.');
      return;
    }

    const { member_id, current_member_points, points_to_redeem, keterangan } = redeemFormData;
    const pointsToRedeemNum = parseFloat(points_to_redeem as any);

    if (!member_id) {
      showError('Pilih anggota terlebih dahulu.');
      return;
    }
    if (isNaN(pointsToRedeemNum) || pointsToRedeemNum <= 0) {
      showError('Jumlah poin yang ditukar harus angka positif.');
      return;
    }
    if (pointsToRedeemNum > current_member_points) {
      showError('Poin yang ditukar melebihi poin yang dimiliki anggota.');
      return;
    }

    const toastId = showLoading('Menukar poin...');

    try {
      // 1. Update member's current_points
      const newPoints = current_member_points - pointsToRedeemNum;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ current_points: newPoints })
        .eq('id', member_id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // 2. Record in point_history
      const { error: historyError } = await supabase
        .from('point_history')
        .insert([{
          member_id: member_id,
          point_change: -pointsToRedeemNum, // Negative for redeemed
          type: 'redeemed',
          description: keterangan || `Penukaran ${pointsToRedeemNum} poin`,
          recorded_by_id: currentUserId,
        }]);

      if (historyError) {
        throw new Error(historyError.message);
      }

      showSuccess('Poin berhasil ditukar!');
      fetchPointHistory(); // Refresh history
      handleResetRedeemForm(); // Reset form
    } catch (err: any) {
      showError('Gagal menukar poin: ' + err.message);
    } finally {
      dismissToast(toastId);
    }
  };

  if (loadingSettings || loadingHistory) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">Memuat pengaturan dan riwayat poin...</p>
      </div>
    );
  }

  if (errorSettings || errorHistory) {
    return (
      <div className="text-center p-4 text-red-600">
        <p>Error Pengaturan: {errorSettings}</p>
        <p>Error Riwayat: {errorHistory}</p>
        <button onClick={() => { fetchSettings(); fetchPointHistory(); }} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
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
          <h1 className="text-2xl font-bold text-gray-900">Pengaturan Poin</h1>
          <p className="text-gray-600">Kelola sistem poin dan riwayat penukaran.</p>
        </div>
      </div>

      <PoinSettingsSection
        settings={settings}
        isEditing={isEditingSettings}
        isAdminOrSuperAdmin={isAdminOrSuperAdmin}
        onToggleEdit={setIsEditingSettings}
        onSave={handleSaveSettings}
        onChange={handleSettingsChange}
      />

      <PoinRedeemSection
        redeemFormData={redeemFormData}
        isKasirOrAdmin={isKasirOrAdmin}
        onFormChange={handleRedeemFormChange}
        onSelectMember={handleSelectMember}
        onSubmit={handleRedeemPoints}
        onResetForm={handleResetRedeemForm}
        showSelectMemberModal={showSelectMemberModal}
        setShowSelectMemberModal={setShowSelectMemberModal}
      />

      <PointHistoryTable
        data={pointHistory}
        searchTerm={historySearchTerm}
        onSearchChange={(e) => setHistorySearchTerm(e.target.value)}
      />
    </div>
  );
};

export default Poin;