import { describe, it, expect, vi } from 'vitest';

vi.mock('chalk', () => ({
  default: {
    cyan: (s: string) => s,
    yellow: (s: string) => s,
    gray: (s: string) => s,
    green: (s: string) => s,
    blue: (s: string) => s,
    bold: (s: string) => s,
  },
}));

import {
  formatMailList,
  formatMailDetail,
  formatCalendarList,
  formatCalendarDetail,
} from '../../src/utils/format';
import { MailMessage, CalendarEvent } from '../../src/types';

const mockMail: MailMessage = {
  id: 'msg-001',
  subject: 'Test Email Subject',
  from: {
    emailAddress: {
      name: 'John Doe',
      address: 'john@example.com',
    },
  },
  toRecipients: [
    {
      emailAddress: {
        name: 'Jane Smith',
        address: 'jane@example.com',
      },
    },
  ],
  body: {
    contentType: 'text',
    content: 'Hello, this is a test email body.',
  },
  receivedDateTime: '2025-06-15T10:30:00Z',
  isRead: false,
  hasAttachments: true,
};

const mockMailRead: MailMessage = {
  id: 'msg-002',
  subject: 'Another Email',
  from: {
    emailAddress: {
      name: 'Alice',
      address: 'alice@example.com',
    },
  },
  toRecipients: [],
  body: {
    contentType: 'html',
    content: '<p>HTML <b>content</b></p>',
  },
  receivedDateTime: '2025-06-14T08:00:00Z',
  isRead: true,
  hasAttachments: false,
};

const mockEvent: CalendarEvent = {
  id: 'evt-001',
  subject: 'Team Meeting',
  start: {
    dateTime: '2025-06-16T09:00:00',
    timeZone: 'Asia/Tokyo',
  },
  end: {
    dateTime: '2025-06-16T10:00:00',
    timeZone: 'Asia/Tokyo',
  },
  location: {
    displayName: 'Conference Room A',
  },
  organizer: {
    emailAddress: {
      name: 'Boss',
      address: 'boss@example.com',
    },
  },
  attendees: [
    {
      emailAddress: {
        name: 'Team Member',
        address: 'member@example.com',
      },
      type: 'required',
    },
  ],
  isOnlineMeeting: true,
  onlineMeetingUrl: 'https://teams.microsoft.com/meet/123',
  body: {
    contentType: 'text',
    content: 'Weekly sync meeting',
  },
};

const mockEventNoLocation: CalendarEvent = {
  id: 'evt-002',
  subject: 'Quick Chat',
  start: {
    dateTime: '2025-06-17T14:00:00',
    timeZone: 'UTC',
  },
  end: {
    dateTime: '2025-06-17T14:30:00',
    timeZone: 'UTC',
  },
  isOnlineMeeting: false,
};

// --- Mail List Tests ---
describe('formatMailList', () => {
  it('should return JSON format', async () => {
    const result = await formatMailList([mockMail], 'json');
    const parsed = JSON.parse(result);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe('msg-001');
    expect(parsed[0].subject).toBe('Test Email Subject');
  });

  it('should return text format', async () => {
    const result = await formatMailList([mockMail], 'text');
    expect(result).toContain('Test Email Subject');
    expect(result).toContain('John Doe');
    expect(result).toContain('msg-001');
    expect(result).toContain('[Unread]');
    expect(result).toContain('[Attach]');
  });

  it('should return table format', async () => {
    const result = await formatMailList([mockMail, mockMailRead], 'table');
    expect(result).toContain('Test Email Subject');
    expect(result).toContain('Another Email');
  });

  it('should handle empty data in JSON format', async () => {
    const result = await formatMailList([], 'json');
    expect(JSON.parse(result)).toEqual([]);
  });

  it('should handle empty data in text format', async () => {
    const result = await formatMailList([], 'text');
    expect(result).toBe('');
  });

  it('should handle empty data in table format', async () => {
    const result = await formatMailList([], 'table');
    expect(result).toBeDefined();
  });
});

// --- Mail Detail Tests ---
describe('formatMailDetail', () => {
  it('should return JSON format', async () => {
    const result = await formatMailDetail(mockMail, 'json');
    const parsed = JSON.parse(result);
    expect(parsed.id).toBe('msg-001');
    expect(parsed.subject).toBe('Test Email Subject');
  });

  it('should return text format with details', async () => {
    const result = await formatMailDetail(mockMail, 'text');
    expect(result).toContain('Subject:');
    expect(result).toContain('Test Email Subject');
    expect(result).toContain('From:');
    expect(result).toContain('John Doe');
    expect(result).toContain('To:');
    expect(result).toContain('jane@example.com');
    expect(result).toContain('Hello, this is a test email body.');
  });

  it('should strip HTML content', async () => {
    const result = await formatMailDetail(mockMailRead, 'text');
    expect(result).toContain('HTML content');
    expect(result).not.toContain('<p>');
    expect(result).not.toContain('<b>');
  });

  it('should show table format (same as text for detail)', async () => {
    const result = await formatMailDetail(mockMail, 'table');
    expect(result).toContain('Subject:');
    expect(result).toContain('Test Email Subject');
  });
});

// --- Calendar List Tests ---
describe('formatCalendarList', () => {
  it('should return JSON format', async () => {
    const result = await formatCalendarList([mockEvent], 'json');
    const parsed = JSON.parse(result);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe('evt-001');
    expect(parsed[0].subject).toBe('Team Meeting');
  });

  it('should return text format', async () => {
    const result = await formatCalendarList([mockEvent], 'text');
    expect(result).toContain('Team Meeting');
    expect(result).toContain('Conference Room A');
    expect(result).toContain('[Online]');
    expect(result).toContain('evt-001');
  });

  it('should return table format', async () => {
    const result = await formatCalendarList([mockEvent, mockEventNoLocation], 'table');
    expect(result).toContain('Team Meeting');
    expect(result).toContain('Quick Chat');
  });

  it('should handle empty data in JSON format', async () => {
    const result = await formatCalendarList([], 'json');
    expect(JSON.parse(result)).toEqual([]);
  });

  it('should handle empty data in text format', async () => {
    const result = await formatCalendarList([], 'text');
    expect(result).toBe('');
  });

  it('should handle event without location in text format', async () => {
    const result = await formatCalendarList([mockEventNoLocation], 'text');
    expect(result).toContain('Quick Chat');
    expect(result).toContain('N/A');
  });
});

// --- Calendar Detail Tests ---
describe('formatCalendarDetail', () => {
  it('should return JSON format', async () => {
    const result = await formatCalendarDetail(mockEvent, 'json');
    const parsed = JSON.parse(result);
    expect(parsed.id).toBe('evt-001');
    expect(parsed.subject).toBe('Team Meeting');
  });

  it('should return text format with full details', async () => {
    const result = await formatCalendarDetail(mockEvent, 'text');
    expect(result).toContain('Subject:');
    expect(result).toContain('Team Meeting');
    expect(result).toContain('Start:');
    expect(result).toContain('End:');
    expect(result).toContain('Location:');
    expect(result).toContain('Conference Room A');
    expect(result).toContain('Organizer:');
    expect(result).toContain('Boss');
    expect(result).toContain('Online:');
    expect(result).toContain('Yes');
    expect(result).toContain('Meet URL:');
    expect(result).toContain('Attendees:');
    expect(result).toContain('member@example.com');
    expect(result).toContain('Weekly sync meeting');
  });

  it('should handle event without optional fields', async () => {
    const result = await formatCalendarDetail(mockEventNoLocation, 'text');
    expect(result).toContain('Quick Chat');
    expect(result).toContain('N/A');
    expect(result).toContain('No');
    expect(result).not.toContain('Meet URL:');
    expect(result).not.toContain('Attendees:');
  });

  it('should show table format (same as text for detail)', async () => {
    const result = await formatCalendarDetail(mockEvent, 'table');
    expect(result).toContain('Subject:');
    expect(result).toContain('Team Meeting');
  });
});
