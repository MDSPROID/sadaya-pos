import React from 'react';
import { Link } from 'react-router-dom';
import { Frown } from 'lucide-react';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-gray-800 p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md w-full">
        <Frown className="h-24 w-24 text-blue-500 mx-auto mb-6" />
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-4">Halaman Tidak Ditemukan</h2>
        <p className="text-gray-600 mb-6">
          Maaf, halaman yang Anda cari tidak ada. Mungkin Anda salah mengetik alamat atau halaman telah dipindahkan.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFound;