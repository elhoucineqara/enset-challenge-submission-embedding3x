"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  ReactNode,
} from "react";

interface StorageContextValue {
  get: <T>(key: string) => T | null;
  set: <T>(key: string, value: T) => void;
  remove: (key: string) => void;
}

const StorageContext = createContext<StorageContextValue | null>(null);

export function StorageProvider({ children }: { children: ReactNode }) {
  const get = useCallback(<T,>(key: string): T | null => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }, []);

  const set = useCallback(<T,>(key: string, value: T): void => {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, JSON.stringify(value));
  }, []);

  const remove = useCallback((key: string): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(key);
  }, []);

  return (
    <StorageContext.Provider value={{ get, set, remove }}>
      {children}
    </StorageContext.Provider>
  );
}

export function useStorage(): StorageContextValue {
  const ctx = useContext(StorageContext);
  if (!ctx) throw new Error("useStorage must be used within <StorageProvider>");
  return ctx;
}
