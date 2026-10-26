import { useState, useCallback, useEffect, useRef } from 'react';

export const HW_STORAGE_EVENT = 'hw-storage';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const initialRef = useRef(initialValue);
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });
  const valueRef = useRef(storedValue);
  valueRef.current = storedValue;

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    const newValue = value instanceof Function ? value(valueRef.current) : value;
    valueRef.current = newValue;
    try {
      localStorage.setItem(key, JSON.stringify(newValue));
    } catch {
      // Keep the change in memory when this browser cannot store more.
    }
    setStoredValue(newValue);
    window.dispatchEvent(new CustomEvent(HW_STORAGE_EVENT, { detail: key }));
  }, [key]);

  useEffect(() => {
    const reload = () => {
      try {
        const item = localStorage.getItem(key);
        const parsed = item ? JSON.parse(item) as T : initialRef.current;
        valueRef.current = parsed;
        setStoredValue(parsed);
      } catch {
        valueRef.current = initialRef.current;
        setStoredValue(initialRef.current);
      }
    };
    const onCustom = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== key) return;
      reload();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key) return;
      reload();
    };
    window.addEventListener(HW_STORAGE_EVENT, onCustom);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(HW_STORAGE_EVENT, onCustom);
      window.removeEventListener('storage', onStorage);
    };
  }, [key]);

  return [storedValue, setValue] as const;
}
