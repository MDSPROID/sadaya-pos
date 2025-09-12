import React from 'react';
import { PoinSettings } from '../../hooks/usePoinSettings';

interface PoinSettingsSectionProps {
  settings: Partial<PoinSettings>;
  isEditing: boolean;
  isAdminOrSuperAdmin: boolean;
  onToggleEdit: (editing: boolean) => void;
  onSave: () => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

const PoinSettingsSection: React.FC<PoinSettingsSectionProps> = ({
  settings,
  isEditing,
  isAdminOrSuperAdmin,
  onToggleEdit,
  onSave,
  onChange,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Pengaturan Sistem Poin</h3>
        {isAdminOrSuperAdmin && (
          <div className="flex space-x-3">
            {!isEditing ? (
              <button
                onClick={() => onToggleEdit(true)}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Ubah Pengaturan
              </button>
            ) : (
              <>
                <button
                  onClick={() => onToggleEdit(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  onClick={onSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Simpan Pengaturan
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label htmlFor="use_point_system" className="flex items-center text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              id="use_point_system"
              name="use_point_system"
              checked={settings.use_point_system || false}
              onChange={onChange}
              disabled={!isEditing}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2">Gunakan Sistem Poin</span>
          </label>
        </div>

        {settings.use_point_system && (
          <>
            <div>
              <label htmlFor="min_spend_for_point" className="block text-sm font-medium text-gray-700 mb-1">
                Belanja Senilai (Rp)
              </label>
              <input
                type="number"
                id="min_spend_for_point"
                name="min_spend_for_point"
                value={settings.min_spend_for_point || ''}
                onChange={onChange}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                min="0"
              />
            </div>
            <div>
              <label htmlFor="points_earned_per_min_spend" className="block text-sm font-medium text-gray-700 mb-1">
                Dapat Poin
              </label>
              <input
                type="number"
                id="points_earned_per_min_spend"
                name="points_earned_per_min_spend"
                value={settings.points_earned_per_min_spend || ''}
                onChange={onChange}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                min="0"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="apply_multiples" className="flex items-center text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  id="apply_multiples"
                  name="apply_multiples"
                  checked={settings.apply_multiples || false}
                  onChange={onChange}
                  disabled={!isEditing}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2">Berlaku Kelipatan</span>
              </label>
            </div>
          </>
        )}
        <div className="md:col-span-2">
          <label htmlFor="rupiah_per_poin" className="block text-sm font-medium text-gray-700 mb-1">
            1 Poin = Rupiah
          </label>
          <div className="relative mt-1 rounded-md shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="text-gray-500 sm:text-sm">Rp</span>
            </div>
            <input
              type="number"
              id="rupiah_per_poin"
              name="rupiah_per_poin"
              value={settings.rupiah_per_poin || ''}
              onChange={onChange}
              disabled={!isEditing}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              placeholder="10000"
              min="1"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Masukkan jumlah Rupiah yang setara dengan 1 Poin.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PoinSettingsSection;