"use client";

import { createContext, useContext, useMemo, useReducer, type ReactNode } from "react";
import type { ContractRecord } from "@/features/contracts/data/types";
import { sampleContracts } from "@/features/contracts/data/sample";
import { addDuration } from "@/features/contracts/utils/contracts";
import type { DurationType } from "@/features/contracts/data/constants";

interface ContractsState {
  contracts: ContractRecord[];
}

type ContractsAction =
  | { type: "add"; payload: Omit<ContractRecord, "id" | "createdAt" | "updatedAt" | "endDate"> }
  | { type: "update"; payload: ContractRecord }
  | { type: "remove"; payload: string };

const ContractsContext = createContext<{
  contracts: ContractRecord[];
  addContract: (contract: Omit<ContractRecord, "id" | "createdAt" | "updatedAt" | "endDate">) => void;
  updateContract: (contract: ContractRecord) => void;
  removeContract: (id: string) => void;
} | null>(null);

function contractsReducer(state: ContractsState, action: ContractsAction): ContractsState {
  switch (action.type) {
    case "add": {
      const now = new Date().toISOString().slice(0, 10);
      const endDate = addDuration(action.payload.startDate, action.payload.durationType as DurationType);
      const newContract: ContractRecord = {
        ...action.payload,
        id: `ct-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
        endDate
      };
      return { contracts: [newContract, ...state.contracts] };
    }
    case "update": {
      return {
        contracts: state.contracts.map((item) => (item.id === action.payload.id ? action.payload : item))
      };
    }
    case "remove": {
      return { contracts: state.contracts.filter((item) => item.id !== action.payload) };
    }
    default:
      return state;
  }
}

export function ContractsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(contractsReducer, { contracts: sampleContracts });

  const value = useMemo(() => {
    return {
      contracts: state.contracts,
      addContract: (contract: Omit<ContractRecord, "id" | "createdAt" | "updatedAt" | "endDate">) =>
        dispatch({ type: "add", payload: contract }),
      updateContract: (contract: ContractRecord) => dispatch({ type: "update", payload: contract }),
      removeContract: (id: string) => dispatch({ type: "remove", payload: id })
    };
  }, [state.contracts]);

  return <ContractsContext.Provider value={value}>{children}</ContractsContext.Provider>;
}

export function useContractsStore() {
  const context = useContext(ContractsContext);
  if (!context) {
    throw new Error("useContractsStore must be used within ContractsProvider");
  }
  return context;
}
