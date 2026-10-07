"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { DatasetRecord } from "./datasetTypes";

interface DatasetContextValue {
  dataset: DatasetRecord | null;
  loadDataset: (dataset: DatasetRecord) => void;
  clearDataset: () => void;
}

const DatasetContext = createContext<DatasetContextValue | null>(null);

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [dataset, setDataset] = useState<DatasetRecord | null>(null);
  const loadDataset = useCallback((nextDataset: DatasetRecord) => setDataset(nextDataset), []);
  const clearDataset = useCallback(() => setDataset(null), []);
  const value = useMemo(() => ({ dataset, loadDataset, clearDataset }), [dataset, loadDataset, clearDataset]);
  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>;
}

export function useDataset(): DatasetContextValue {
  const context = useContext(DatasetContext);
  if (!context) throw new Error("useDataset must be used inside DatasetProvider");
  return context;
}
