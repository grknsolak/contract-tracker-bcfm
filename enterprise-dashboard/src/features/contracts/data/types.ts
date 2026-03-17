import type { ContractStage, DurationType, RenewalStatus, ServiceScope } from "./constants";

export interface ContractRecord {
  id: string;
  name: string;
  contractName: string;
  startDate: string;
  durationType: DurationType;
  endDate: string;
  stage: ContractStage;
  renewalStatus: RenewalStatus;
  scopes: ServiceScope[];
  otherScopeText?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
