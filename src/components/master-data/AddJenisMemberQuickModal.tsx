import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '../../utils/toast';

interface JenisMemberItem {
  id: string;
  nama: string;
}

interface AddJenisMemberQuickModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const AddJenisMemberQuickModal: React.FC<AddJenisMemberQuickModalProps> = ({ onClose, onSuccess }) => {
  const [namaJenis, setNamaJenis] = useState('');
  const [jenisMemberList, setJenisMemberList] = useState<JenisMemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJenisMember = async () => {
    setLoading(true);
    setError(null);
    const { data: jenisMemberData, error } = await supabase
      .from('jenis_member')
      .select('*')
      .order('nama', { ascending: true });

    if (error) {
      console.error('Error fetching jenis member:', error);
      showError('Gagal memuat data jenis member: ' + error.message);
      setError(error.message);
    } else {
      setJenisMemberList(jenisMemberData || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchJenisMember();
  }, []);

  const handleAddJenisMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaJenis.trim()) {
      showError('Nama Jenis Member tidak boleh kosong.');
      return;
    }

    const toastId = showLoading('Menambah jenis member...');
    const { error } = await supabase
      .from('jenis_member')
      .insert([{ nama: namaJenis }])
      .select()
      .single();

    if (error) {
      showError('Gagal menambah jenis member: ' + error.message);
    } else {
      showSuccess('Jenis Member berhasil ditambahkan!');
      setNamaJenis('');
      fetchJenisMember();
      onSuccess();
    }
    dismissToast(toastId);
  };

  const handleDeleteJenisMember = async (id: string) => {
    if (!confirm('Yakin ingin menghapus jenis member ini?')) {
      return;
    }
    const toastId = showLoading('Menghapus jenis member...');
    const { error } = await supabase
      .from('jenis_member')
      .delete()
      .eq('id', id);

    if (error) {
      showError('Gagal menghapus jenis member: ' + error.message);
    } else {
      showSuccess('Jenis Member berhasil dihapus!');
      fetchJenisMember();
      onSuccess();
    }
    dismissToast(toastId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Manajemen Jenis Member</h3>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <form onSubmit={handleAddJenisMember} className="space-y-4 mb-6">
            <div>
              <label htmlFor="namaJenis" className="block text-sm font-medium text-gray-700 mb-1">
                Nama Jenis Member Baru
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  id="namaJenis"
                  value={namaJenis}
                  onChange={(e) => setNamaJenis(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Masukkan nama jenis member"
                  required
                />
                <button
                  type="submit"
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>
          </form>

          <h4 className="text-md font-semibold mb-3">Daftar Jenis Member</h4>
          {loading ? (
            <p className="text-gray-600">Memuat daftar jenis member...</p>
          ) : error ? (
            <p className="text-red-600">Error: {error}</p>
          ) : jenisMemberList.length === 0 ? (
            <p className="text-gray-600">Belum ada data jenis member.</p>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No.</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Jenis</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {jenisMemberList.map((jenis, index) => (
                    <tr key={jenis.id}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{jenis.nama}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDeleteJenisMember(jenis.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddJenisMemberQuickModal;