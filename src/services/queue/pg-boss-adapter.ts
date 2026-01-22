/**
 * pg-boss Adapter
 *
 * Wraps pg-boss with our queue interface, providing:
 * - Consistent API with other queue implementations
 * - Easy migration path to other queue systems
 * - Type-safe job handling
 */

import { PgBoss } from 'pg-boss';
import type { IQueue, JobHandler, JobOptions, QueueJob, WorkerOptions } from './queue.interface';

export class PgBossAdapter implements IQueue {
  private boss: PgBoss;
  private isStarted: boolean = false;

  constructor(connectionString: string) {
    this.boss = new PgBoss({
      connectionString,
      schema: 'pgboss',
      max: 2, // Lightweight connection pool
      noScheduling: false,
      retryDelay: 30,
      retryLimit: 3,
      expireInHours: 24,
    });
  }

  async start(): Promise<void> {
    if (this.isStarted) {
      console.warn('⚠️ Queue already started');
      return;
    }

    await this.boss.start();
    this.isStarted = true;
    console.log('✅ pg-boss adapter started');
  }

  async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    await this.boss.stop();
    this.isStarted = false;
    console.log('✅ pg-boss adapter stopped');
  }

  async createQueue(name: string): Promise<void> {
    await this.boss.createQueue(name);
  }

  async send<TData = any>(queueName: string, data: TData, options?: JobOptions): Promise<string | null> {
    // Only pass defined options to pg-boss
    const sendOptions: any = {};

    if (options?.startAfter !== undefined) sendOptions.startAfter = options.startAfter;
    if (options?.retryLimit !== undefined) sendOptions.retryLimit = options.retryLimit;
    if (options?.retryDelay !== undefined) sendOptions.retryDelay = options.retryDelay;
    if (options?.retryBackoff !== undefined) sendOptions.retryBackoff = options.retryBackoff;
    if (options?.expireInHours !== undefined) sendOptions.expireInHours = options.expireInHours;
    if (options?.priority !== undefined) sendOptions.priority = options.priority;

    return this.boss.send(queueName, data as object, sendOptions);
  }

  async work<TData = any, TResult = any>(
    queueName: string,
    handlerOrOptions: JobHandler<TData, TResult> | WorkerOptions,
    maybeHandler?: JobHandler<TData, TResult>
  ): Promise<string> {
    // Overload handling: work(name, handler) or work(name, options, handler)
    if (typeof handlerOrOptions === 'function') {
      // work(name, handler)
      return this.boss.work<TData, TResult>(queueName, handlerOrOptions);
    } else {
      // work(name, options, handler)
      if (!maybeHandler) {
        throw new Error('Handler is required when options are provided');
      }

      return this.boss.work<TData, TResult>(
        queueName,
        {
          teamSize: handlerOrOptions.teamSize,
          teamConcurrency: handlerOrOptions.teamConcurrency,
        },
        maybeHandler
      );
    }
  }

  async offWork(queueName: string): Promise<void> {
    await this.boss.offWork(queueName);
  }

  async getJobById<TData = any>(queueName: string, jobId: string): Promise<QueueJob<TData> | null> {
    const job = await this.boss.getJobById<TData>(queueName, jobId);

    if (!job) {
      return null;
    }

    // Map pg-boss job to our interface
    return {
      id: job.id,
      data: job.data,
      state: job.state as 'created' | 'active' | 'completed' | 'failed' | 'retry',
      createdOn: job.createdOn,
      startedOn: job.startedOn || undefined,
      completedOn: job.completedOn || undefined,
    };
  }

  async deleteQueue(queueName: string): Promise<void> {
    await this.boss.deleteQueue(queueName);
  }

  async deleteAllJobs(queueName?: string): Promise<void> {
    await this.boss.deleteAllJobs(queueName);
  }

  /**
   * Get the underlying pg-boss instance
   * Useful for advanced operations not covered by the interface
   */
  getUnderlyingQueue(): PgBoss {
    return this.boss;
  }
}
