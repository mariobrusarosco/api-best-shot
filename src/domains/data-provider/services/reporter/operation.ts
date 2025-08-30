import type { DataProviderReport } from './index';

export class Operation {
  public endTime?: number;
  public duration?: number;
  
  constructor(
    public type: string,
    public name: string,
    private report?: DataProviderReport,
    public status: 'started' | 'completed' | 'failed' = 'started',
    public startTime = Date.now(),
    public data?: any,
    public error?: any
  ) {}

  success(data?: any) {
    this.status = 'completed';
    this.endTime = Date.now();
    this.duration = this.endTime - this.startTime;
    this.report?.onOperationSuccess();
    Object.assign(this, { data });
  }

  fail(error?: any) {
    this.status = 'failed';
    this.endTime = Date.now();
    this.duration = this.endTime - this.startTime;
    this.report?.onOperationFailure();
    Object.assign(this, { error });
  }
}
