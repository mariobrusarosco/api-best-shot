export type ProviderTransportFlowStep = {
  kind: 'request' | 'warmup';
  label: string;
  url: string;
  status?: number;
  ok?: boolean;
  note?: string;
};

export type ProviderTransportFlow = {
  summary: string;
  steps: ProviderTransportFlowStep[];
};
