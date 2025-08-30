import type { DataProviderReport } from './index';

export class Operation {
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
    this.report?.onOperationSuccess();
    Object.assign(this, { data });
  }

  fail(error?: any) {
    this.status = 'failed';
    this.report?.onOperationFailure();
    Object.assign(this, { error });
  }
}
