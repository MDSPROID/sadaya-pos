import React, { useState, useEffect } from 'react';
import { User, Edit, Save, X } from 'lucide-react';
import { useSession } from '../components/SessionContextProvider';
import { supabase } from '../integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '../utils/toast';
import ChangePasswordForm from '../components/pengaturan/ChangePasswordForm'; // Import the new component

const ProfilePage: React.FC = () => {
  const { profile, session } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [editableFirstName, setEditableFirstName] = useState(profile?.first_name || '');
  const [editableLastName, setEditableLastName] = useState(profile?.last_name || '');

  useEffect(() => {
    if (profile) {
      setEditableFirstName(profile.first_name || '');
      setEditableLastName(profile.last_name || '');
    }
  }, [profile]);

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    if (isEditing) { // If we were editing and now toggling off (cancel)
      setEditableFirstName(profile?.first_name || '');
      setEditableLastName(profile?.last_name || '');
    }
  };

  const handleSave = async () => {
    if (!session?.user?.id) {
      showError('Pengguna tidak terautentikasi.');
      return;
    }

    const toastId = showLoading('Menyimpan profil...');
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: editableFirstName,
        last_name: editableLastName,
      })
      .eq('id', session.user.id);

    if (error) {
      showError('Gagal menyimpan profil: ' + error.message);
    } else {
      showSuccess('Profil berhasil diperbarui!');
      setIsEditing(false);
      // The SessionContextProvider's onAuthStateChange listener should automatically re-fetch the profile
      // after a successful update, ensuring the displayed data is fresh.
    }
    dismissToast(toastId);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profil Pengguna</h1>
          <p className="text-gray-600">Lihat dan kelola informasi profil Anda.</p>
        </div>
        {profile && ( // Only show edit button if profile exists
          <div>
            {!isEditing ? (
              <button
                onClick={handleEditToggle}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Edit className="h-5 w-5 mr-2" />
                Edit Profil
              </button>
            ) : (
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleEditToggle} // This acts as cancel
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <X className="h-5 w-5 mr-2" />
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save className="h-5 w-5 mr-2" />
                  Simpan
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="h-24 w-24 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="h-full w-full rounded-full object-cover" />
            ) : (
              <User className="h-12 w-12 text-indigo-600" />
            )}
          </div>
          <h2 className="text-xl font-semibold text-gray-900">
            {profile?.first_name} {profile?.last_name}
          </h2>
          <p className="text-sm text-gray-600">{profile?.role}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
              Nama Depan
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={editableFirstName}
              onChange={(e) => setEditableFirstName(e.target.value)}
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
              Nama Belakang
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={editableLastName}
              onChange={(e) => setEditableLastName(e.target.value)}
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={session?.user?.email || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Jabatan
            </label>
            <input
              type="text"
              id="role"
              name="role"
              value={profile?.role || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
            />
          </div>
        </div>
      </div>

      {/* Change Password Section */}
      <ChangePasswordForm />
    </div>
  );
};

export default ProfilePage;