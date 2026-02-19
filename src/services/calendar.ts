import { getGraphClient } from './graph-client';
import { CalendarEvent, CalendarInfo, CalendarCreateOptions, CalendarEditOptions } from '../types';
import { GraphCliError } from '../utils/errors';

function getLocalTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export class CalendarService {
  async listCalendars(): Promise<CalendarInfo[]> {
    const client = await getGraphClient();
    const response = await client
      .api('/me/calendars')
      .select('id,name,owner,isDefaultCalendar,canEdit')
      .get();
    return response.value as CalendarInfo[];
  }

  async resolveCalendarId(name: string): Promise<string> {
    const calendars = await this.listCalendars();
    const matches = calendars.filter(
      (c) => c.name.toLowerCase().includes(name.toLowerCase())
    );

    if (matches.length === 0) {
      throw new GraphCliError(
        `Calendar not found: "${name}"`,
        'CalendarNotFound'
      );
    }
    if (matches.length > 1) {
      const names = matches.map((c) => c.name).join(', ');
      throw new GraphCliError(
        `Multiple calendars matched "${name}": ${names}. Please specify a more specific name.`,
        'AmbiguousCalendar'
      );
    }
    return matches[0].id;
  }

  async listEvents(
    startDateTime: string,
    endDateTime: string,
    top?: number,
    timeZone?: string,
    calendarId?: string
  ): Promise<CalendarEvent[]> {
    const client = await getGraphClient();
    const tz = timeZone || getLocalTimeZone();

    const apiPath = calendarId
      ? `/me/calendars/${calendarId}/calendarView`
      : '/me/calendarView';

    let request = client
      .api(apiPath)
      .query({
        startDateTime,
        endDateTime,
      })
      .header('Prefer', `outlook.timezone="${tz}"`)
      .select('id,subject,start,end,location,organizer,isOnlineMeeting,onlineMeetingUrl,attendees')
      .orderby('start/dateTime');

    if (top) {
      request = request.top(top);
    }

    const response = await request.get();
    return response.value as CalendarEvent[];
  }

  async getEvent(eventId: string, timeZone?: string): Promise<CalendarEvent> {
    if (!eventId || !eventId.trim()) {
      throw new GraphCliError('Event ID cannot be empty.', 'InvalidEventId');
    }
    const client = await getGraphClient();
    const tz = timeZone || getLocalTimeZone();

    const event = await client
      .api(`/me/events/${eventId}`)
      .header('Prefer', `outlook.timezone="${tz}"`)
      .get();

    return event as CalendarEvent;
  }

  async createEvent(
    options: CalendarCreateOptions,
    isAllDay?: boolean,
    calendarId?: string
  ): Promise<CalendarEvent> {
    const client = await getGraphClient();
    const tz = options.timeZone || getLocalTimeZone();

    const body: Record<string, unknown> = {
      subject: options.subject,
      start: {
        dateTime: options.start,
        timeZone: tz,
      },
      end: {
        dateTime: options.end,
        timeZone: tz,
      },
    };

    if (options.body) {
      body.body = {
        contentType: 'text',
        content: options.body,
      };
    }

    if (options.location) {
      body.location = {
        displayName: options.location,
      };
    }

    if (options.attendees && options.attendees.length > 0) {
      for (const email of options.attendees) {
        if (!email.includes('@')) {
          throw new GraphCliError(`Invalid attendee email address: "${email}"`, 'InvalidRecipient');
        }
      }
      body.attendees = options.attendees.map((email) => ({
        emailAddress: { address: email },
        type: 'required',
      }));
    }

    if (options.isOnlineMeeting) {
      body.isOnlineMeeting = true;
    }

    if (isAllDay) {
      body.isAllDay = true;
    }

    const apiPath = calendarId
      ? `/me/calendars/${calendarId}/events`
      : '/me/events';

    const event = await client.api(apiPath).post(body);
    return event as CalendarEvent;
  }

  async updateEvent(options: CalendarEditOptions): Promise<CalendarEvent> {
    if (!options.eventId || !options.eventId.trim()) {
      throw new GraphCliError('Event ID cannot be empty.', 'InvalidEventId');
    }
    const client = await getGraphClient();
    const tz = options.timeZone || getLocalTimeZone();

    const body: Record<string, unknown> = {};

    if (options.subject) {
      body.subject = options.subject;
    }

    if (options.body) {
      body.body = {
        contentType: 'text',
        content: options.body,
      };
    }

    if (options.start) {
      body.start = {
        dateTime: options.start,
        timeZone: tz,
      };
    }

    if (options.end) {
      body.end = {
        dateTime: options.end,
        timeZone: tz,
      };
    }

    if (options.location) {
      body.location = {
        displayName: options.location,
      };
    }

    if (options.attendees && options.attendees.length > 0) {
      body.attendees = options.attendees.map((email) => ({
        emailAddress: { address: email },
        type: 'required',
      }));
    }

    if (options.isOnlineMeeting !== undefined) {
      body.isOnlineMeeting = options.isOnlineMeeting;
    }

    const event = await client.api(`/me/events/${options.eventId}`).patch(body);
    return event as CalendarEvent;
  }
}
