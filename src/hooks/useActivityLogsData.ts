import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { showError } from '../utils/toast';

export interface ActivityLogItem {
  id: string;
  created_at: string;
  user_id: string | null;
  profiles: { first_name: string; last_name: string; roles: { nama: string } | null } | null;
  action: string;
  details: any | null;
  ip_address: string | null;
}

interface UseActivityLogsDataProps {
  startDate?: string; // Make optional
  endDate?: string;   // Make optional
  limit?: number;     // Add limit option
}

export const useActivityLogsData = ({ startDate, endDate, limit }: UseActivityLogsDataProps) => {
  const [data, setData] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivityLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    let query = supabase
      .from('activity_logs')
      .select(`
        *,
        profiles(first_name, last_name, roles(nama))
      `)
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('created_at', `${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      query = query.lte('created_at', `${endDate}T23:59:59.999Z`);
    }
    if (limit) {
      query = query.limit(limit);
    }

    const { data: logsList, error } = await query;

    if (error) {
      console.error('Error fetching activity logs:', error);
      showError('Gagal memuat data riwayat aktivitas.');
      setError(error.message);
    } else {
      // Filter out logs from users with 'User' role on the client-side
      const filteredLogs = (logsList || []).filter(log => 
        log.profiles?.roles?.nama !== 'User'
      );
      setData(filteredLogs);
    }
    setLoading(false);
  }, [startDate, endDate, limit]);

  useEffect(() => {
    fetchActivityLogs();
  }, [fetchActivityLogs]);

  return {
    data,
    loading,
    error,
    fetchActivityLogs,
    setData, // Expose setData for local updates after CRUD
  };
};