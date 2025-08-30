export interface ScrapingOperation {
  step: 'scraping' | 'mapping' | 'database';
  operation: string;
  status: 'started' | 'completed' | 'failed';
  data?: Record<string, unknown>;
  timestamp?: string;
}

export interface OperationReport {
  tournament: {
    label: string;
    id: string;
    provider: string;
  };
  startTime: string;
  endTime: string | null;
  operations: ScrapingOperation[];
}
