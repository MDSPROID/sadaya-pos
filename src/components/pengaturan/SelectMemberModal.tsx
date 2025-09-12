import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { showError } from '../../utils/toast';

interface MemberItemForSelection {
  id: string;
  first_name: string;
  last_name: string;
  current_points: number;
}

interface SelectMemberModalProps {
  onClose: () => void;
  onSelectMember: (member: MemberItemForSelection) => void;
}

const SelectMemberModal: React.FC<SelectMemberModalProps> = ({ onClose, onSelectMember }) => {
  const [memberList, setMemberList] = useState<MemberItemForSelection[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = async () => {
    setLoading(true);
    setError(null);
    const { data: fetchedMemberList, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, current_points, roles(nama)')
      .order('first_name', { ascending: true });

    if (error) {
      console.error('Error fetching members for selection:', error);
      showError('Gagal memuat daftar anggota.');
      setError(error.message);
    } else {
      const filteredMembers = (fetchedMemberList || []).filter(
        (profile: any) => profile.roles?.nama === 'User'
      );
      setMemberList(filteredMembers);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const filteredMembers = memberList.filter(member =>
    member.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.last_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (member: MemberItemForSelection) => {
    onSelectMember(member);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Pilih Anggota</h3>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Cari anggota (ID, Nama Depan, Nama Belakang)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-48">
              <p className="text-gray-600">Memuat daftar anggota...</p>
            </div>
          ) : error ? (
            <div className="text-center p-4 text-red-600">
              <p>Error: {error}</p>
              <button onClick={fetchMembers} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Coba Lagi
              </button>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center p-4 text-gray-500">
              <p>Tidak ada anggota yang ditemukan.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No.</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Member</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Poin Saat Ini</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMembers.map((member, index) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{member.id.substring(0, 8)}...</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{member.first_name} {member.last_name}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{member.current_points.toLocaleString('id-ID')}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          type="button"
                          onClick={() => handleSelect(member)}
                          className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs"
                        >
                          Pilih
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
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectMemberModal;