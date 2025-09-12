import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '../utils/toast';

export interface PoinSettings {
  id: string;
  rupiah_per_poin: number;
  use_point_system: boolean;
  min_spend_for_point: number;
  points_earned_per_min_spend: number;
  apply_multiples: boolean;
}

export const usePoinSettings = (isAdminOrSuperAdmin: boolean) => {
  const [settings, setSettings] = useState<Partial<PoinSettings>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('poin_settings')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching poin settings:', error);
      showError('Gagal memuat pengaturan poin.');
      setError(error.message);
    } else if (data) {
      setSettings(data);
    } else {
      setSettings({
        rupiah_per_poin: 10000,
        use_point_system: true,
        min_spend_for_point: 50000,
        points_earned_per_min_spend: 1,
        apply_multiples: true,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : parseFloat(value) || value,
    }));
  };

  const handleSaveSettings = async () => {
    if (!isAdminOrSuperAdmin) {
      showError('Anda tidak memiliki izin untuk menyimpan pengaturan.');
      return;
    }

    if (settings.rupiah_per_poin === undefined || isNaN(settings.rupiah_per_poin) || settings.rupiah_per_poin <= 0 ||
        settings.min_spend_for_point === undefined || isNaN(settings.min_spend_for_point) || settings.min_spend_for_point < 0 ||
        settings.points_earned_per_min_spend === undefined || isNaN(settings.points_earned_per_min_spend) || settings.points_earned_per_min_spend < 0) {
      showError('Semua nilai pengaturan poin harus angka positif.');
      return;
    }

    const toastId = showLoading('Menyimpan pengaturan poin...');
    const { error } = await supabase
      .from('poin_settings')
      .upsert([settings], { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      showError('Gagal menyimpan pengaturan: ' + error.message);
    } else {
      showSuccess('Pengaturan berhasil disimpan!');
      setIsEditing(false);
      fetchSettings();
    }
    dismissToast(toastId);
  };

  return {
    settings,
    loadingSettings: loading,
    errorSettings: error,
    isEditingSettings: isEditing,
    setIsEditingSettings: setIsEditing, // Fixed: Correctly return setIsEditing
    handleSettingsChange,
    handleSaveSettings,
    fetchSettings,
  };
};