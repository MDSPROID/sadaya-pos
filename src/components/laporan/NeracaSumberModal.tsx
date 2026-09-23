import React from 'react';
import { X, ExternalLink, Info } from 'lucide-react';
import { NeracaSummary } from '../../hooks/useNeracaData';
import { buildDrilldownUrl, getDrilldown, NeracaRowKey } from '../../utils/neracaDrilldown';

interface NeracaSumberModalProps {
  rowKey: NeracaRowKey;
  value: number;
  summary: NeracaSummary;
  startDate: string;
  endDate: string;
  periodeLabel: string;
  onClose: () => void;
  /** Buka rincian baris lain (dipakai saat komponen rumus diklik). */
  onOpenRow: (key: NeracaRowKey) => void;
}

const rp = (n: number) => `Rp ${Math.round(Math.abs(n)).toLocaleString('id-ID')}`;
const signed = (n: number) => `${n < 0 ? '− ' : '+ '}${rp(n)}`;

const NeracaSumberModal: React.FC<NeracaSumberModalProps> = ({
  rowKey,
  value,
  summary,
  startDate,
  endDate,
  periodeLabel,
  onClose,
  onOpenRow,
}) => {
  const info = getDrilldown(rowKey, summary);

  return (
    <div className="no-print fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-40 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{info.title}</h2>
            <p className="text-sm text-gray-600">{periodeLabel}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Tutup">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-lg border bg-gray-50 p-3">
            <div className="text-xs uppercase text-gray-500">Nilai</div>
            <div className="text-2xl font-bold text-gray-900">{rp(value)}</div>
          </div>

          <div>
            <div className="text-xs uppercase text-gray-500 mb-1">Asal angka</div>
            <p className="text-sm text-gray-800">{info.sumber}</p>
          </div>

          {info.rumus && (
            <div>
              <div className="text-xs uppercase text-gray-500 mb-1">Rumus</div>
              <p className="text-sm font-medium text-gray-900">{info.rumus}</p>
            </div>
          )}

          {info.komponen && (
            <div>
              <div className="text-xs uppercase text-gray-500 mb-2">Rincian</div>
              <ul className="divide-y divide-gray-100 border rounded-lg">
                {info.komponen.map((c) => (
                  <li key={c.label} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="text-sm text-gray-700">
                      {c.sourceKey ? (
                        <button
                          type="button"
                          onClick={() => onOpenRow(c.sourceKey!)}
                          className="text-blue-600 hover:text-blue-800 hover:underline text-left"
                        >
                          {c.label}
                        </button>
                      ) : (
                        c.label
                      )}
                    </span>
                    <span className={`text-sm font-medium whitespace-nowrap ${c.value < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {signed(c.value)}
                    </span>
                  </li>
                ))}
                <li className="flex items-center justify-between gap-3 px-3 py-2 bg-gray-50">
                  <span className="text-sm font-semibold text-gray-900">Hasil</span>
                  <span className="text-sm font-bold text-gray-900">{rp(value)}</span>
                </li>
              </ul>
            </div>
          )}

          {info.catatan && (
            <div className="flex gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
              <Info className="h-4 w-4 text-amber-600 flex-none mt-0.5" />
              <p className="text-xs text-amber-900">{info.catatan}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 border-t">
          <p className="text-xs text-gray-500">
            {info.link ? info.link.cocokkan : 'Klik salah satu rincian di atas untuk menelusuri lebih jauh.'}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              Tutup
            </button>
            {info.link && (
              <a
                href={buildDrilldownUrl(info.link, startDate, endDate, { label: info.title, value })}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Buka {info.link.menu}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NeracaSumberModal;
