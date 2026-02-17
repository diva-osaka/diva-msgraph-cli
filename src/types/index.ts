export interface AuthConfig {
  clientId: string;
  tenantId: string;
  clientSecret?: string;
}

export interface TokenCache {
  accessToken: string;
  expiresOn: Date;
  account?: {
    homeAccountId: string;
    environment: string;
    tenantId: string;
    username: string;
    name?: string;
  };
}

export interface MailMessage {
  id: string;
  subject: string;
  from: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  toRecipients: Array<{
    emailAddress: {
      name: string;
      address: string;
    };
  }>;
  body: {
    contentType: string;
    content: string;
  };
  receivedDateTime: string;
  isRead: boolean;
  hasAttachments: boolean;
}

export interface MailListOptions {
  top?: number;
  skip?: number;
  filter?: string;
  orderBy?: string;
  search?: string;
  folder?: string;
}

export interface CalendarEvent {
  id: string;
  subject: string;
  body?: {
    contentType: string;
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
  };
  attendees?: Array<{
    emailAddress: {
      name: string;
      address: string;
    };
    type: string;
  }>;
  organizer?: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  isOnlineMeeting?: boolean;
  onlineMeetingUrl?: string;
}

export interface CalendarListOptions {
  top?: number;
  skip?: number;
  startDateTime?: string;
  endDateTime?: string;
  filter?: string;
  orderBy?: string;
}

export interface CalendarCreateOptions {
  subject: string;
  body?: string;
  start: string;
  end: string;
  timeZone?: string;
  location?: string;
  attendees?: string[];
  isOnlineMeeting?: boolean;
}

export interface CalendarEditOptions {
  eventId: string;
  subject?: string;
  body?: string;
  start?: string;
  end?: string;
  timeZone?: string;
  location?: string;
  attendees?: string[];
  isOnlineMeeting?: boolean;
}

export interface CommandOptions {
  verbose?: boolean;
  format?: FormatType;
  clientCredentials?: boolean;
}

export type FormatType = 'table' | 'json' | 'text';
