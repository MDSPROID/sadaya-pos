import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';

export interface SearchableOption {
  id: string;
  name: string;
}

interface SearchableSelectProps {
  id?: string;
  options: SearchableOption[];
  value: string;
  onChange: (id: string) => void;
  allLabel: string;
  placeholder?: string;
  className?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  id,
  options,
  value,
  onChange,
  allLabel,
  placeholder = 'Ketik untuk mencari...',
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(() => options.find(o => o.id === value) ?? null, [options, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o => o.name.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  useEffect(() => setActiveIndex(0), [query, open]);

  const pick = (nextId: string) => {
    onChange(nextId);
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, filtered.length)); // index 0 = "Semua"
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex === 0) pick('');
      else if (filtered[activeIndex - 1]) pick(filtered[activeIndex - 1].id);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  const displayText = open ? query : (selected ? selected.name : '');

  return (
    <div ref={rootRef} className={`relative w-full ${className}`}>
      <div className="relative">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          value={displayText}
          placeholder={open ? placeholder : (selected ? selected.name : allLabel)}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); if (!open) setOpen(true); }}
          onKeyDown={onKeyDown}
          className="w-full pl-3 pr-14 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
          {value && (
            <button
              type="button"
              aria-label="Hapus pilihan"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick('')}
              className="p-0.5 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <ChevronDown className="h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {open && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 w-full max-h-60 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg text-sm"
        >
          <li
            role="option"
            aria-selected={value === ''}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pick('')}
            className={`px-3 py-2 cursor-pointer ${activeIndex === 0 ? 'bg-blue-50' : 'hover:bg-gray-50'} ${value === '' ? 'font-semibold' : ''}`}
          >
            {allLabel}
          </li>
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-gray-500">Tidak ditemukan.</li>
          ) : (
            filtered.map((o, idx) => (
              <li
                key={o.id}
                role="option"
                aria-selected={o.id === value}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(o.id)}
                className={`px-3 py-2 cursor-pointer ${activeIndex === idx + 1 ? 'bg-blue-50' : 'hover:bg-gray-50'} ${o.id === value ? 'font-semibold' : ''}`}
              >
                {o.name}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

export default SearchableSelect;
