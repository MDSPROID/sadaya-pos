"use client";

import { Toaster } from 'react-hot-toast';

const ToastProvider = () => {
  return <Toaster 
  position="top-right" 
  containerStyle={{
    top: 90,      // Geser 70px dari atas
    right: 20,    // Jaga tetap di kanan
  }}
  />;
};

export default ToastProvider;