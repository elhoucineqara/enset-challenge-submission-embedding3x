// StorageContext
"use client";
import { createContext, useContext } from "react";

const StorageContext = createContext({});

export function StorageProvider({ children }: { children: React.ReactNode }) {
  return <StorageContext.Provider value={{}}>{children}</StorageContext.Provider>;
}

export const useStorage = () => useContext(StorageContext);
