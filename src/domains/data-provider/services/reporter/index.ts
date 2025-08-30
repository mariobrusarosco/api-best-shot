import { Operation } from './operation';

export class DataProviderReport {
  public tournament: { label: string; id: string; provider?: string } | null = null;
  public operationType: string | null = null;
  public startTime: string;
  public endTime: string | null = null;
  public summary: {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    duration?: number;
    standingsCounts?: {
      totalGroups?: number;
      groupsProcessed?: number;
      totalTeams?: number;
      totalStandingsCreated?: number;
    };
  } = {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    standingsCounts: {},
  };

  private operations: Operation[] = [];

  constructor(operationType: string | null) {
    this.operationType = operationType;
    this.startTime = new Date().toISOString();
  }

  public setTournament(tournament: { label: string; id: string; provider?: string }) {
    this.tournament = {
      label: tournament.label,
      id: tournament.id,
      provider: tournament.provider,
    };
    return this;
  }

  public createOperation(type: string, name: string): Operation {
    const op = new Operation(type, name, this);
    this.operations.push(op);
    this.summary.totalOperations++;
    return op;
  }

  public onOperationSuccess(): void {
    this.summary.successfulOperations++;
  }

  public onOperationFailure(): void {
    this.summary.failedOperations++;
  }

  public getOperations(): Operation[] {
    return this.operations;
  }

  public getSummary() {
    return this.summary;
  }

  public toJSON() {
    return {
      tournament: this.tournament,
      operationType: this.operationType,
      startTime: this.startTime,
      endTime: this.endTime,
      summary: this.getSummary(),
      operations: this.operations.map(op => ({
        type: op.type,
        name: op.name,
        status: op.status,
        startTime: op.startTime,
        data: op.data,
        error: op.error,
      })),
    };
  }
}
