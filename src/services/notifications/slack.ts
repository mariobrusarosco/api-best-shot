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

  public async sendMessage(message: SlackMessage): Promise<void> {
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
