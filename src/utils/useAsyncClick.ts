import { useState, useCallback } from "react";

export function useAsyncClick<T extends any[]>(
  fn: (...args: T) => void | Promise<void>
) {
  const [loading, setLoading] = useState(false);

  const onClick = useCallback(async (...args: T) => {
    if (loading) return;           // cegah double click
    try {
      setLoading(true);
      await Promise.resolve(fn(...args));
    } finally {
      setLoading(false);
    }
  }, [fn, loading]);

  return { onClick, loading };
}
