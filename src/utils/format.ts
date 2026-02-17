import Table from 'cli-table3';
import { MailMessage, CalendarEvent, FormatType } from '../types';

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString();
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
}

// --- Mail formatters ---

export async function formatMailList(messages: MailMessage[], format: FormatType): Promise<string> {
  if (format === 'json') {
    return JSON.stringify(messages, null, 2);
  }

  if (format === 'text') {
    const chalk = (await import('chalk')).default;
    return messages
      .map((m, i) => {
        const read = m.isRead ? '' : chalk.yellow('[Unread] ');
        const attach = m.hasAttachments ? chalk.gray('[Attach] ') : '';
        return [
          `${chalk.gray(`#${i + 1}`)} ${read}${attach}${chalk.bold(m.subject || '(No Subject)')}`,
          `  From: ${m.from?.emailAddress?.name || ''} <${m.from?.emailAddress?.address || ''}>`,
          `  Date: ${formatDateTime(m.receivedDateTime)}`,
          `  ID:   ${m.id}`,
        ].join('\n');
      })
      .join('\n\n');
  }

  // table format
  const chalk = (await import('chalk')).default;
  const table = new Table({
    head: [
      chalk.cyan('Date'),
      chalk.cyan('From'),
      chalk.cyan('Subject'),
      chalk.cyan('Read'),
    ],
    colWidths: [22, 28, 40, 6],
    wordWrap: true,
  });

  for (const m of messages) {
    table.push([
      formatDateTime(m.receivedDateTime),
      truncate(m.from?.emailAddress?.name || m.from?.emailAddress?.address || '', 25),
      truncate(m.subject || '(No Subject)', 37),
      m.isRead ? 'Yes' : chalk.yellow('No'),
    ]);
  }

  return table.toString();
}

export async function formatMailDetail(message: MailMessage, format: FormatType): Promise<string> {
  if (format === 'json') {
    return JSON.stringify(message, null, 2);
  }

  const chalk = (await import('chalk')).default;
  const bodyText =
    message.body?.contentType === 'html'
      ? stripHtml(message.body.content)
      : message.body?.content || '';

  const toList = (message.toRecipients || [])
    .map((r) => `${r.emailAddress.name || ''} <${r.emailAddress.address}>`)
    .join(', ');

  const lines = [
    `${chalk.bold('Subject:')} ${message.subject || '(No Subject)'}`,
    `${chalk.bold('From:')}    ${message.from?.emailAddress?.name || ''} <${message.from?.emailAddress?.address || ''}>`,
    `${chalk.bold('To:')}      ${toList}`,
    `${chalk.bold('Date:')}    ${formatDateTime(message.receivedDateTime)}`,
    `${chalk.bold('Read:')}    ${message.isRead ? 'Yes' : 'No'}`,
    `${chalk.bold('Attach:')}  ${message.hasAttachments ? 'Yes' : 'No'}`,
    `${chalk.bold('ID:')}      ${message.id}`,
    '',
    chalk.gray('─'.repeat(60)),
    '',
    bodyText,
  ];

  return lines.join('\n');
}

// --- Calendar formatters ---

export async function formatCalendarList(events: CalendarEvent[], format: FormatType): Promise<string> {
  if (format === 'json') {
    return JSON.stringify(events, null, 2);
  }

  if (format === 'text') {
    const chalk = (await import('chalk')).default;
    return events
      .map((e, i) => {
        const location = e.location?.displayName ? ` @ ${e.location.displayName}` : '';
        const online = e.isOnlineMeeting ? chalk.blue(' [Online]') : '';
        return [
          `${chalk.gray(`#${i + 1}`)} ${chalk.bold(e.subject || '(No Subject)')}${online}`,
          `  Start:    ${formatDateTime(e.start.dateTime)}`,
          `  End:      ${formatDateTime(e.end.dateTime)}`,
          `  Location: ${location || 'N/A'}`,
          `  ID:       ${e.id}`,
        ].join('\n');
      })
      .join('\n\n');
  }

  // table format
  const chalk = (await import('chalk')).default;
  const table = new Table({
    head: [
      chalk.cyan('Start'),
      chalk.cyan('End'),
      chalk.cyan('Subject'),
      chalk.cyan('Location'),
    ],
    colWidths: [22, 22, 35, 20],
    wordWrap: true,
  });

  for (const e of events) {
    table.push([
      formatDateTime(e.start.dateTime),
      formatDateTime(e.end.dateTime),
      truncate(e.subject || '(No Subject)', 32),
      truncate(e.location?.displayName || '', 17),
    ]);
  }

  return table.toString();
}

export async function formatCalendarDetail(event: CalendarEvent, format: FormatType): Promise<string> {
  if (format === 'json') {
    return JSON.stringify(event, null, 2);
  }

  const chalk = (await import('chalk')).default;
  const bodyText = event.body
    ? event.body.contentType === 'html'
      ? stripHtml(event.body.content)
      : event.body.content
    : '';

  const attendeeList = (event.attendees || [])
    .map((a) => `  - ${a.emailAddress.name || ''} <${a.emailAddress.address}> (${a.type})`)
    .join('\n');

  const lines = [
    `${chalk.bold('Subject:')}   ${event.subject || '(No Subject)'}`,
    `${chalk.bold('Start:')}     ${formatDateTime(event.start.dateTime)} (${event.start.timeZone})`,
    `${chalk.bold('End:')}       ${formatDateTime(event.end.dateTime)} (${event.end.timeZone})`,
    `${chalk.bold('Location:')}  ${event.location?.displayName || 'N/A'}`,
    `${chalk.bold('Organizer:')} ${event.organizer?.emailAddress?.name || ''} <${event.organizer?.emailAddress?.address || ''}>`,
    `${chalk.bold('Online:')}    ${event.isOnlineMeeting ? 'Yes' : 'No'}`,
  ];

  if (event.onlineMeetingUrl) {
    lines.push(`${chalk.bold('Meet URL:')}  ${event.onlineMeetingUrl}`);
  }

  lines.push(`${chalk.bold('ID:')}        ${event.id}`);

  if (attendeeList) {
    lines.push('', `${chalk.bold('Attendees:')}`);
    lines.push(attendeeList);
  }

  if (bodyText) {
    lines.push('', chalk.gray('─'.repeat(60)), '', bodyText);
  }

  return lines.join('\n');
}
