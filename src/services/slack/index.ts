import { Profiling } from '@/services/profiling';

export interface SlackNotificationPayload {
  text: string;
  channel?: string;
  username?: string;
  icon_emoji?: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
}

// Following the official Slack Block Kit documentation
export interface SlackBlock {
  type: 'section' | 'divider' | 'header' | 'context' | 'actions' | 'image' | 'input';
  block_id?: string;
  text?: SlackTextObject;
  fields?: SlackTextObject[];
  elements?: SlackElement[];
  accessory?: SlackElement;
}

export interface SlackTextObject {
  type: 'plain_text' | 'mrkdwn';
  text: string;
  emoji?: boolean;
}

export interface SlackElement {
  type: 'image' | 'button' | 'static_select' | 'mrkdwn' | 'plain_text';
  text?: string | SlackTextObject;
  image_url?: string;
  alt_text?: string;
  url?: string;
  action_id?: string;
}

// Legacy attachment support
export interface SlackAttachment {
  color: 'good' | 'warning' | 'danger' | string;
  fields: SlackField[];
  title?: string;
  text?: string;
}

export interface SlackField {
  title: string;
  value: string;
  short: boolean;
}

export class SlackService {
  async sendNotification(webhookUrl: string, payload: SlackNotificationPayload): Promise<void> {
    if (!webhookUrl) {
      Profiling.log({
        msg: '[SLACK] Webhook URL not provided, skipping notification',
        source: 'SLACK_SERVICE_sendNotification',
      });
      return;
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const responseText = await response.text();
        throw new Error(`Slack notification failed: ${response.status} ${responseText}`);
      }
    } catch (error) {
      Profiling.error({
        error: error instanceof Error ? error : new Error(String(error)),
        source: 'SLACK_SERVICE_sendNotification',
      });
      throw error;
    }
  }
}

// Export singleton instance
export const slackService = new SlackService();
