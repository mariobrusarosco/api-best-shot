/**
 * Queue Abstraction Interface
 *
 * This interface abstracts queue operations, allowing us to swap
 * queue implementations (pg-boss, Bull, BullMQ, etc.) without
 * changing application code.
 *
 * Benefits:
 * - Easy migration from pg-boss to Redis-based queues
 * - Testable with mock implementations
 * - Consistent API across different queue providers
 */

export type JobOptions = {
  /**
   * Delay job execution by N seconds
   */
  startAfter?: number;

  /**
   * Maximum number of retry attempts
   */
  retryLimit?: number;

  /**
   * Delay between retries in seconds
   */
  retryDelay?: number;

  /**
   * Use exponential backoff for retries
   */
  retryBackoff?: boolean;

  /**
   * Job expiration in hours
   */
  expireInHours?: number;

  /**
   * Job priority (higher = more important)
   */
  priority?: number;
};

export type JobHandler<TData = any, TResult = any> = (jobs: QueueJob<TData>[]) => Promise<TResult | void>;

export type QueueJob<TData = any> = {
  id: string;
  data: TData;
  state: 'created' | 'active' | 'completed' | 'failed' | 'retry';
  createdOn: Date;
  startedOn?: Date;
  completedOn?: Date;
};

export type WorkerOptions = {
  /**
   * Number of worker instances
   */
  teamSize?: number;

  /**
   * Concurrency per worker
   */
  teamConcurrency?: number;
};

/**
 * Main Queue Interface
 *
 * Defines the contract for queue operations
 */
export interface IQueue {
  /**
   * Initialize and start the queue
   */
  start(): Promise<void>;

  /**
   * Stop the queue gracefully
   */
  stop(): Promise<void>;

  /**
   * Create a new queue/job type
   */
  createQueue(name: string): Promise<void>;

  /**
   * Send a job to the queue
   */
  send<TData = any>(queueName: string, data: TData, options?: JobOptions): Promise<string | null>;

  /**
   * Register a worker to process jobs
   */
  work<TData = any, TResult = any>(queueName: string, handler: JobHandler<TData, TResult>): Promise<string>;

  /**
   * Register a worker with options
   */
  work<TData = any, TResult = any>(
    queueName: string,
    options: WorkerOptions,
    handler: JobHandler<TData, TResult>
  ): Promise<string>;

  /**
   * Stop a worker
   */
  offWork(queueName: string): Promise<void>;

  /**
   * Get job by ID
   */
  getJobById<TData = any>(queueName: string, jobId: string): Promise<QueueJob<TData> | null>;

  /**
   * Delete a queue and all its jobs
   */
  deleteQueue(queueName: string): Promise<void>;

  /**
   * Delete all jobs in a queue
   */
  deleteAllJobs(queueName?: string): Promise<void>;
}
