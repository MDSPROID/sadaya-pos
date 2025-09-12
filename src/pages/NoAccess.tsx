import React from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';

const NoAccess: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-gray-800 p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md w-full">
        <Lock className="h-24 w-24 text-red-500 mx-auto mb-6" />
        <h1 className="text-4xl font-bold mb-4">Akses Ditolak</h1>
        <h2 className="text-2xl font-semibold mb-4">Anda Tidak Memiliki Izin</h2>
        <p className="text-gray-600 mb-6">
          Maaf, Anda tidak memiliki izin untuk mengakses halaman ini. Silakan hubungi administrator jika Anda merasa ini adalah kesalahan.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Kembali ke Halaman Login
        </Link>
      </div>
    </div>
  );
};

export default NoAccess;