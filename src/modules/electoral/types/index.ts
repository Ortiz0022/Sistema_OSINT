export interface ElectoralMetadata {
  source: string;
  dataset: string;
  sourceFile: string;
  processedAt: string;
  recordsProcessed: number;
  aggregationLevel: string;
  containsPersonalData: boolean;
}

export interface ElectoralDistrictAggregate {
  province: string;
  canton: string;
  district: string;
  registeredVoters: number;
  cantonPercentage: number;
}

export interface ElectoralDataResponse {
  metadata: ElectoralMetadata;
  territories: ElectoralDistrictAggregate[];
}
