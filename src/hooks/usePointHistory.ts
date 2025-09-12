import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { showError } from '../utils/toast';

export interface PointHistoryItem {
  id: string;
  created_at: string;
  member_id: string;
  member_profile: { first_name: string; last_name: string } | null;
  point_change: number;
  type: 'earned' | 'redeemed';
  description: string | null;
  recorded_by_id: string | null;
  recorded_by_profile: { first_name: string; last_name: string } | null;
}

export const usePointHistory = () => {
  const [pointHistory, setPointHistory] = useState<PointHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchPointHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: historyList, error } = await supabase
      .from('point_history')
      .select(`
        *,
        member_profile:profiles!point_history_member_id_fkey(first_name, last_name),
        recorded_by_profile:profiles!point_history_recorded_by_id_fkey(first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching point history:', error);
      showError('Gagal memuat riwayat poin.');
      setError(error.message);
    } else {
      setPointHistory(historyList || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPointHistory();
  }, [fetchPointHistory]);

  const filteredHistory = pointHistory.filter(item =>
    item.member_profile?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.member_profile?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return {
    pointHistory: filteredHistory,
    loadingHistory: loading,
    errorHistory: error,
    historySearchTerm: searchTerm,
    setHistorySearchTerm: setSearchTerm, // Fixed: Correctly return setSearchTerm
    fetchPointHistory,
  };
};