export interface SlackMessage {
  text: string;
  blocks?: Array<{
    type: string;
    text?: {
      type: string;
      text: string;
    };
    fields?: Array<{
      type: string;
      text: string;
    }>;
    elements?: Array<{
      type: string;
      text: string;
    }>;
  }>;
}

export class SlackNotificationService {
  constructor(private webhookUrl: string) {}

  async sendError(error: Error, context: { operation?: string; tournament?: string; requestId?: string }): Promise<void> {
    if (!this.webhookUrl) {
      console.warn('Slack webhook URL not configured, skipping error notification');
      return;
    }

    const message: SlackMessage = {
      text: `🚨 Data Provider Error`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🚨 Data Provider Error'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Error:* ${error.message}`
            },
            {
              type: 'mrkdwn',
              text: `*Operation:* ${context.operation || 'Unknown'}`
            },
            {
              type: 'mrkdwn',
              text: `*Tournament:* ${context.tournament || 'Unknown'}`
            },
            {
              type: 'mrkdwn',
              text: `*Request ID:* ${context.requestId || 'Unknown'}`
            }
          ]
        }
      ]
    };

    if (error.stack) {
      const truncatedStack = error.stack.substring(0, 500) + (error.stack.length > 500 ? '...' : '');
      message.blocks?.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `\`\`\`${truncatedStack}\`\`\``
        }
      });
    }

    await this.sendMessage(message);
  }

  async sendCustomMessage(message: SlackMessage): Promise<void> {
    await this.sendMessage(message);
  }

  private async sendMessage(message: SlackMessage): Promise<void> {
    if (!this.webhookUrl) {
      console.warn('Slack webhook URL not configured, skipping notification');
      return;
    }

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        console.error('Failed to send Slack notification:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error sending Slack notification:', error);
    }
  }
}

export const slackNotifications = new SlackNotificationService(process.env.SLACK_WEBHOOK_REPORT_URL || '');