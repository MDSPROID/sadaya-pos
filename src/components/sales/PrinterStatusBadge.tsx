import React from 'react';
import { isPrinterAvailable } from '../../utils/printAgent';

const PrinterStatusBadge: React.FC = () => {
  const [available, setAvailable] = React.useState<boolean | null>(null);

  const refresh = React.useCallback(async () => {
    const ok = await isPrinterAvailable();
    setAvailable(ok);
  }, []);

  React.useEffect(() => {
    let mounted = true;
    const tick = async () => {
      if (!mounted) return;
      await refresh();
    };
    // initial
    tick();
    // interval
    const id = setInterval(tick, 5000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [refresh]);

  let text = 'Memeriksa printer…';
  let cls = 'bg-gray-100 text-gray-700 border-gray-200';
  if (available === true) {
    text = 'Printer siap';
    cls = 'bg-green-50 text-green-700 border-green-200';
  } else if (available === false) {
    text = 'Printer offline';
    cls = 'bg-red-50 text-red-700 border-red-200';
  }

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm border ${cls}`}>
      <span className="w-2 h-2 rounded-full mr-2" style={{
        backgroundColor: available === null ? '#9CA3AF' : available ? '#10B981' : '#EF4444'
      }} />
      {text}
      <button
        type="button"
        onClick={refresh}
        className="ml-3 text-xs underline text-blue-600 hover:text-blue-800"
      >
        cek lagi
      </button>
    </div>
  );
};

export default PrinterStatusBadge;