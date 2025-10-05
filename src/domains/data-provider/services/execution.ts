import { Profiling } from '@/services/profiling';
import { SlackBlock, SlackNotificationPayload, slackService } from '@/services/slack';
import { QUERIES_DATA_PROVIDER_EXECUTIONS } from '../queries';
import type { DB_InsertDataProviderExecution, DB_SelectDataProviderExecution } from '../schema';

export class DataProviderExecution {
  private execution: DB_InsertDataProviderExecution;
  private requestId: string;
  private isCompleted: boolean = false;
  private webhookUrl: string;

  constructor(props: ConstructorProps) {
    this.requestId = props.requestId;
    this.execution = {
      requestId: props.requestId,
      tournamentId: props.tournamentId,
      operationType: props.operationType,
      status: 'in_progress',
      startedAt: new Date(),
    };

    this.webhookUrl = process.env.SLACK_JOB_EXECUTIONS_WEBHOOK || '';

    QUERIES_DATA_PROVIDER_EXECUTIONS.createExecution(this.execution);
  }

  async complete(data: {
    reportFileUrl?: string;
    reportFileKey?: string;
    summary?: Record<string, unknown>;
    duration?: number;
    tournamentLabel?: string;
  }): Promise<DB_SelectDataProviderExecution | null> {
    if (this.isCompleted) {
      throw new Error('Execution has already been completed or failed');
    }

    this.isCompleted = true;

    const result = await QUERIES_DATA_PROVIDER_EXECUTIONS.updateExecutionByRequestId(this.requestId, {
      status: 'completed',
      completedAt: new Date(),
      reportFileUrl: data.reportFileUrl,
      reportFileKey: data.reportFileKey,
      summary: data.summary,
      duration: data.duration,
    });

    // Send success notification
    await this.notifySuccess(
      this.execution.tournamentId,
      data.tournamentLabel || 'Unknown',
      data.summary,
      data.reportFileUrl
    );

    return result;
  }

  async failure(data: {
    reportFileUrl?: string;
    reportFileKey?: string;
    summary?: Record<string, unknown>;
    duration?: number;
    tournamentLabel?: string;
    error?: string;
  }): Promise<DB_SelectDataProviderExecution | null> {
    if (this.isCompleted) {
      throw new Error('Execution has already been completed or failed');
    }

    this.isCompleted = true;

    const result = await QUERIES_DATA_PROVIDER_EXECUTIONS.updateExecutionByRequestId(this.requestId, {
      status: 'failed',
      completedAt: new Date(),
      reportFileUrl: data.reportFileUrl,
      reportFileKey: data.reportFileKey,
      summary: data.summary,
      duration: data.duration,
    });

    await this.notifyFailure(
      this.execution.tournamentId,
      data.tournamentLabel || 'Unknown',
      data.error,
      data.summary,
      data.reportFileUrl
    );

    return result;
  }

  async update(data: {
    tournamentId?: string;
    status?: 'completed' | 'failed' | 'in_progress';
    reportFileUrl?: string;
    reportFileKey?: string;
    summary?: Record<string, unknown>;
  }): Promise<DB_SelectDataProviderExecution | null> {
    return await QUERIES_DATA_PROVIDER_EXECUTIONS.updateExecutionByRequestId(this.requestId, data);
  }

  async getCurrent(): Promise<DB_SelectDataProviderExecution | null> {
    return await QUERIES_DATA_PROVIDER_EXECUTIONS.getExecutionByRequestId(this.requestId);
  }

  /**
   * Update the tournament ID after tournament creation
   */
  async updateTournamentId(tournamentId: string): Promise<void> {
    this.execution.tournamentId = tournamentId;
    await QUERIES_DATA_PROVIDER_EXECUTIONS.updateExecutionByRequestId(this.requestId, {
      tournamentId,
    });
  }

  get completed(): boolean {
    return this.isCompleted;
  }

  get id(): string {
    return this.requestId;
  }

  private async notifySuccess(
    tournamentId: string,
    tournamentLabel: string,
    summary?: Record<string, unknown>,
    reportFileUrl?: string
  ): Promise<void> {
    console.log('[DEBUG] notifySuccess called:', { webhookUrl: this.webhookUrl, tournamentLabel });

    if (!this.webhookUrl) {
      console.log('[DEBUG] No webhook URL, skipping notification');
      return;
    }

    try {
      const payload = this.buildSlackPayload('success', {
        tournamentId,
        tournamentLabel,
        summary,
        reportFileUrl,
      });
      console.log('[DEBUG] Sending Slack notification:', payload.text);
      await slackService.sendNotification(this.webhookUrl, payload);
      console.log('[DEBUG] Slack notification sent successfully');
    } catch (error) {
      console.error('[DEBUG] Slack notification error:', error);
      Profiling.error({
        error: error instanceof Error ? error : new Error(String(error)),
        data: { requestId: this.requestId },
        source: 'DATA_PROVIDER_EXECUTION_notifySuccess',
      });
    }
  }

  private async notifyFailure(
    tournamentId: string,
    tournamentLabel: string,
    error?: string,
    summary?: Record<string, unknown>,
    reportFileUrl?: string
  ): Promise<void> {
    if (!this.webhookUrl) return;

    try {
      const payload = this.buildSlackPayload('failure', {
        tournamentId,
        tournamentLabel,
        error,
        summary,
        reportFileUrl,
      });
      await slackService.sendNotification(this.webhookUrl, payload);
    } catch (err) {
      Profiling.error({
        error: err instanceof Error ? err : new Error(String(err)),
        data: { requestId: this.requestId },
        source: 'DATA_PROVIDER_EXECUTION_notifyFailure',
      });
    }
  }

  private buildSlackPayload(
    status: 'success' | 'failure',
    payload: NotificationPayloadSuccess | NotificationPayloadFailure
  ): SlackNotificationPayload {
    const isSuccess = status === 'success';
    const emoji = isSuccess ? '✅' : '❌';
    const statusText = isSuccess ? 'SUCCESS' : 'FAILED';
    const operationName = this.execution.operationType.replace('_', ' ').toUpperCase();

    const blocks: SlackBlock[] = [
      // Header block - following the official documentation
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} Data Provider Execution ${statusText}`,
          emoji: true,
        },
      },
      // Section block with fields - following the official documentation
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Tournament:*\n${payload.tournamentLabel}`,
          },
          {
            type: 'mrkdwn',
            text: `*Operation:*\n${operationName}`,
          },
          {
            type: 'mrkdwn',
            text: `*Status:*\n${statusText}`,
          },
        ],
      },
    ];

    // Check if payload has error property (failure case)
    if (status === 'failure' && 'error' in payload && payload.error) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Error Details:*\n\`\`\`${payload.error}\`\`\``,
        },
      });
    }

    // Add summary section if available
    if (payload.summary) {
      const summaryText = this.formatSummary(payload.summary);
      if (summaryText) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Summary:*\n${summaryText}`,
          },
        });
      }
    }

    // Add report URL as rich text link if available
    if (payload.reportFileUrl) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `📊 <${payload.reportFileUrl}|View Report>`,
        },
      });
    }

    // Context block - following the official documentation
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Request ID: \`${this.requestId}\``,
        },
        {
          type: 'mrkdwn',
          text: `Timestamp: <!date^${Math.floor(Date.now() / 1000)}^{date_short_pretty} at {time}|${new Date().toISOString()}>`,
        },
      ],
    });

    // Add divider
    blocks.push({
      type: 'divider',
    });

    return {
      text: `${emoji} Data Provider Execution ${statusText}`, // Fallback text
      username: 'Data Provider Bot',
      icon_emoji: ':robot_face:',
      blocks,
    };
  }

  private formatSummary(summary: Record<string, unknown>): string {
    const parts: string[] = [];

    if (typeof summary.operationsCount === 'number') {
      parts.push(`${summary.operationsCount} operations`);
    }

    if (typeof summary.successfulOperations === 'number') {
      parts.push(`${summary.successfulOperations} successful`);
    }

    if (typeof summary.failedOperations === 'number' && summary.failedOperations > 0) {
      parts.push(`${summary.failedOperations} failed`);
    }

    return parts.join(', ');
  }

  // Legacy static methods for backward compatibility
  static async createExecution(data: {
    requestId: string;
    tournamentId: string;
    operationType: string;
  }): Promise<DB_SelectDataProviderExecution> {
    const execution: DB_InsertDataProviderExecution = {
      requestId: data.requestId,
      tournamentId: data.tournamentId,
      operationType: data.operationType,
      status: 'in_progress',
      startedAt: new Date(),
    };

    return await QUERIES_DATA_PROVIDER_EXECUTIONS.createExecution(execution);
  }

  // Legacy static methods for backward compatibility
  static async completeExecution(
    requestId: string,
    data: {
      status: 'completed' | 'failed';
      reportFileUrl?: string;
      reportFileKey?: string;
      summary?: Record<string, unknown>;
      duration?: number;
    }
  ): Promise<DB_SelectDataProviderExecution | null> {
    return await QUERIES_DATA_PROVIDER_EXECUTIONS.updateExecutionByRequestId(requestId, {
      status: data.status,
      completedAt: new Date(),
      reportFileUrl: data.reportFileUrl,
      reportFileKey: data.reportFileKey,
      summary: data.summary,
      duration: data.duration,
    });
  }

  // Legacy static methods for backward compatibility
  static async updateExecution(
    requestId: string,
    data: {
      tournamentId?: string;
      status?: 'completed' | 'failed' | 'in_progress';
      reportFileUrl?: string;
      reportFileKey?: string;
      summary?: Record<string, unknown>;
    }
  ): Promise<DB_SelectDataProviderExecution | null> {
    return await QUERIES_DATA_PROVIDER_EXECUTIONS.updateExecutionByRequestId(requestId, data);
  }

  // Get executions by tournament
  static async getExecutionsByTournament(
    tournamentId: string,
    options?: {
      operationType?: string;
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<DB_SelectDataProviderExecution[]> {
    return await QUERIES_DATA_PROVIDER_EXECUTIONS.getExecutionsByTournament(tournamentId, options);
  }

  // Get all executions with filtering
  static async getAllExecutions(options?: {
    tournamentId?: string;
    operationType?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<DB_SelectDataProviderExecution[]> {
    return await QUERIES_DATA_PROVIDER_EXECUTIONS.getAllExecutions(options);
  }

  // Get execution by ID
  static async getExecutionById(id: string): Promise<DB_SelectDataProviderExecution | null> {
    return await QUERIES_DATA_PROVIDER_EXECUTIONS.getExecutionById(id);
  }

  // Get execution statistics for a tournament
  static async getExecutionStats(tournamentId: string): Promise<{
    total: number;
    completed: number;
    failed: number;
    in_progress: number;
    byOperationType: Record<string, { total: number; completed: number; failed: number }>;
  }> {
    const executions = await QUERIES_DATA_PROVIDER_EXECUTIONS.getExecutionsByTournament(tournamentId);

    const stats = {
      total: executions.length,
      completed: 0,
      failed: 0,
      in_progress: 0,
      byOperationType: {} as Record<string, { total: number; completed: number; failed: number }>,
    };

    executions.forEach(execution => {
      if (execution.status === 'completed') stats.completed++;
      else if (execution.status === 'failed') stats.failed++;
      else if (execution.status === 'in_progress') stats.in_progress++;

      if (!stats.byOperationType[execution.operationType]) {
        stats.byOperationType[execution.operationType] = {
          total: 0,
          completed: 0,
          failed: 0,
        };
      }

      stats.byOperationType[execution.operationType].total++;
      if (execution.status === 'completed') {
        stats.byOperationType[execution.operationType].completed++;
      } else if (execution.status === 'failed') {
        stats.byOperationType[execution.operationType].failed++;
      }
    });

    return stats;
  }
}

type ConstructorProps = {
  requestId: string;
  tournamentId: string;
  operationType: string;
};

type NotificationPayloadFailure = {
  tournamentId: string;
  tournamentLabel: string;
  error?: string;
  summary?: Record<string, unknown>;
  reportFileUrl?: string;
};

type NotificationPayloadSuccess = {
  tournamentId: string;
  tournamentLabel: string;
  summary?: Record<string, unknown>;
  reportFileUrl?: string;
};
