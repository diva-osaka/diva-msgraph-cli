import { getGraphClient } from './graph-client';
import { MailMessage, MailListOptions } from '../types';
import { parseSinceOption } from '../utils/date';
import { GraphCliError } from '../utils/errors';

export class MailService {
  async listMessages(options: MailListOptions & { since?: string }): Promise<MailMessage[]> {
    const client = await getGraphClient();
    const top = options.top || 25;

    let request = client
      .api('/me/messages')
      .top(top)
      .orderby('receivedDateTime desc')
      .select('id,subject,from,toRecipients,receivedDateTime,isRead,hasAttachments,bodyPreview');

    if (options.since) {
      const parsed = parseSinceOption(options.since);
      let filterStr = `receivedDateTime ge ${parsed.start}`;
      if (parsed.end) {
        filterStr += ` and receivedDateTime le ${parsed.end}`;
      }
      if (options.filter) {
        filterStr = `${filterStr} and ${options.filter}`;
      }
      request = request.filter(filterStr);
    } else if (options.filter) {
      request = request.filter(options.filter);
    }

    if (options.search) {
      request = request.search(options.search);
    }

    const response = await request.get();
    return response.value as MailMessage[];
  }

  async readMessage(messageId: string): Promise<MailMessage> {
    if (!messageId || !messageId.trim()) {
      throw new GraphCliError('Message ID cannot be empty.', 'InvalidMessageId');
    }
    const client = await getGraphClient();
    const message = await client
      .api(`/me/messages/${messageId}`)
      .get();
    return message as MailMessage;
  }

  async sendMessage(
    to: string[],
    subject: string,
    body: string,
    contentType: string = 'text'
  ): Promise<void> {
    for (const address of to) {
      if (!address.includes('@')) {
        throw new GraphCliError(
          `Invalid email address: "${address}"`,
          'InvalidRecipient'
        );
      }
    }

    const client = await getGraphClient();

    const toRecipients = to.map((address) => ({
      emailAddress: { address: address.trim() },
    }));

    const sendMailBody = {
      message: {
        subject,
        body: {
          contentType: contentType === 'html' ? 'HTML' : 'Text',
          content: body,
        },
        toRecipients,
      },
    };

    await client.api('/me/sendMail').post(sendMailBody);
  }
}
