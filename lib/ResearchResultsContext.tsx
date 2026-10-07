"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { OptimizationResponse } from "./optimizationTypes";
import type { WhatIfResponse } from "./whatIfTypes";

interface ResearchResultsContextValue {
  whatIfResult: WhatIfResponse | null;
  optimizationResult: OptimizationResponse | null;
  setWhatIfResult: (result: WhatIfResponse | null) => void;
  setOptimizationResult: (result: OptimizationResponse | null) => void;
}

const ResearchResultsContext = createContext<ResearchResultsContextValue | null>(null);

export function ResearchResultsProvider({ children }: { children: ReactNode }) {
  const [whatIfResult, setWhatIfResult] = useState<WhatIfResponse | null>(null);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResponse | null>(null);
  const value = useMemo(() => ({ whatIfResult, optimizationResult, setWhatIfResult, setOptimizationResult }), [whatIfResult, optimizationResult]);
  return <ResearchResultsContext.Provider value={value}>{children}</ResearchResultsContext.Provider>;
}

export function useResearchResults(): ResearchResultsContextValue {
  const context = useContext(ResearchResultsContext);
  if (!context) throw new Error("useResearchResults must be used inside ResearchResultsProvider");
  return context;
}
