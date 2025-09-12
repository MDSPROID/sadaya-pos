import { useState, useEffect, useCallback, useRef } from 'react';

interface UseFormPersistenceOptions<T> {
  key: string;
  initialValue: T;
  enabled?: boolean; // To enable/disable persistence
}

/**
 * Custom hook to persist form data in sessionStorage.
 * @param options.key Unique key for sessionStorage.
 * @param options.initialValue Initial state value.
 * @param options.enabled Whether persistence is active (e.g., only for 'add' mode).
 * @returns [value, setValue, clearPersistedValue, isDraftLoaded]
 */
export function useFormPersistence<T>({ key, initialValue, enabled = true }: UseFormPersistenceOptions<T>) {
  const isInitialMount = useRef(true); // Track initial mount
  const [isDraftLoaded, setIsDraftLoaded] = useState(false); // New state to indicate if draft was loaded

  const [value, setValue] = useState<T>(() => {
    if (!enabled) {
      sessionStorage.removeItem(key);
      return initialValue;
    }
    try {
      const saved = sessionStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        const mergedValue = { ...initialValue, ...parsed };
        // Set the flag here, but don't call toast directly
        // This will be true only on the very first render if a draft exists
        if (isInitialMount.current) { // Only set on initial render
          setIsDraftLoaded(true);
        }
        return mergedValue;
      }
      return initialValue;
    } catch (error) {
      console.error(`Error parsing persisted state for key "${key}":`, error);
      sessionStorage.removeItem(key);
      return initialValue;
    }
  });

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false; // Mark as not initial mount after first render
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      sessionStorage.setItem(key, JSON.stringify(value));
    } else {
      sessionStorage.removeItem(key);
    }
  }, [key, value, enabled]);

  const clearPersistedValue = useCallback(() => {
    sessionStorage.removeItem(key);
    setValue(initialValue);
    setIsDraftLoaded(false); // Reset flag when clearing
  }, [key, initialValue]);

  return [value, setValue, clearPersistedValue, isDraftLoaded] as const;
}