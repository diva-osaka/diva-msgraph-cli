import { Command } from 'commander';
import Table from 'cli-table3';
import { CalendarService } from '../services/calendar';
import { CalendarEvent, CalendarInfo } from '../types';
import { handleError } from '../utils/errors';

async function loadChalk() {
  return (await import('chalk')).default;
}

async function loadOra() {
  return (await import('ora')).default;
}

function getLocalTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function formatEventDateTime(event: CalendarEvent): string {
  const startDate = new Date(event.start.dateTime);
  const endDate = new Date(event.end.dateTime);

  const dateStr = startDate.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const startTime = startDate.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const endTime = endDate.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return `${dateStr} ${startTime}-${endTime}`;
}

function formatEventsTable(events: CalendarEvent[]): string {
  const table = new Table({
    head: ['Date/Time', 'Subject', 'Location', 'Organizer'],
    style: { head: ['cyan'] },
    wordWrap: true,
  });

  for (const event of events) {
    table.push([
      formatEventDateTime(event),
      event.subject || '',
      event.location?.displayName || '',
      event.organizer?.emailAddress?.name || event.organizer?.emailAddress?.address || '',
    ]);
  }

  return table.toString();
}

function getDefaultStartDate(): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

function getDefaultEndDate(): string {
  const now = new Date();
  now.setDate(now.getDate() + 7);
  now.setHours(23, 59, 59, 999);
  return now.toISOString();
}

export function createCalendarCommand(): Command {
  const calendar = new Command('calendar').description('Calendar operations');

  calendar
    .command('list')
    .description('List calendar events')
    .option('--start <date>', 'Start date (ISO 8601)')
    .option('--end <date>', 'End date (ISO 8601)')
    .option('-n, --top <number>', 'Number of events to show')
    .option('--format <format>', 'Output format (table/json)', 'table')
    .option('--timezone <tz>', 'Timezone')
    .option('--calendar <name>', 'Calendar name (partial match)')
    .action(async (options) => {
      const verbose = calendar.parent?.opts().verbose;
      const chalk = await loadChalk();
      const ora = await loadOra();
      const spinner = ora('Fetching calendar events...').start();

      try {
        const service = new CalendarService();
        const startDateTime = options.start || getDefaultStartDate();
        const endDateTime = options.end || getDefaultEndDate();
        const top = options.top ? parseInt(options.top, 10) : undefined;
        const timeZone = options.timezone || undefined;

        let calendarId: string | undefined;
        if (options.calendar) {
          calendarId = await service.resolveCalendarId(options.calendar);
        }

        const events = await service.listEvents(startDateTime, endDateTime, top, timeZone, calendarId);
        spinner.stop();

        if (events.length === 0) {
          console.log(chalk.yellow('No events found for the specified period.'));
          return;
        }

        if (options.format === 'json') {
          console.log(JSON.stringify(events, null, 2));
        } else {
          console.log(formatEventsTable(events));
          console.log(chalk.gray(`${events.length} event(s) found.`));
        }
      } catch (error) {
        spinner.fail('Failed to fetch calendar events.');
        handleError(error, verbose);
        process.exitCode = 1;
      }
    });

  calendar
    .command('get <eventId>')
    .description('Get a specific calendar event')
    .option('--format <format>', 'Output format (table/json)', 'table')
    .option('--timezone <tz>', 'Timezone')
    .action(async (eventId, options) => {
      const verbose = calendar.parent?.opts().verbose;
      const chalk = await loadChalk();
      const ora = await loadOra();
      const spinner = ora('Fetching event details...').start();

      try {
        const service = new CalendarService();
        const timeZone = options.timezone || undefined;
        const event = await service.getEvent(eventId, timeZone);
        spinner.stop();

        if (options.format === 'json') {
          console.log(JSON.stringify(event, null, 2));
        } else {
          console.log(chalk.bold('Event Details'));
          console.log('─'.repeat(40));
          console.log(`  Subject:   ${event.subject}`);
          console.log(`  Start:     ${formatEventDateTime(event)}`);
          if (event.location?.displayName) {
            console.log(`  Location:  ${event.location.displayName}`);
          }
          if (event.organizer?.emailAddress) {
            const org = event.organizer.emailAddress;
            console.log(`  Organizer: ${org.name || org.address}`);
          }
          if (event.attendees && event.attendees.length > 0) {
            console.log('  Attendees:');
            for (const att of event.attendees) {
              console.log(`    - ${att.emailAddress.name || att.emailAddress.address} (${att.type})`);
            }
          }
          if (event.isOnlineMeeting && event.onlineMeetingUrl) {
            console.log(`  Online:    ${event.onlineMeetingUrl}`);
          }
          if (event.body?.content) {
            console.log('  Body:');
            console.log(`    ${event.body.content}`);
          }
        }
      } catch (error) {
        spinner.fail('Failed to fetch event details.');
        handleError(error, verbose);
        process.exitCode = 1;
      }
    });

  calendar
    .command('add')
    .description('Create a new calendar event')
    .requiredOption('-s, --subject <subject>', 'Event subject')
    .requiredOption('--start <dateTime>', 'Start date and time (ISO 8601)')
    .requiredOption('--end <dateTime>', 'End date and time (ISO 8601)')
    .option('--body <body>', 'Event body/description')
    .option('--location <location>', 'Event location')
    .option('--attendees <emails>', 'Attendee email addresses (comma-separated)')
    .option('--online', 'Create as online meeting')
    .option('--all-day', 'Create as all-day event')
    .option('--timezone <tz>', 'Timezone')
    .option('--calendar <name>', 'Calendar name (partial match)')
    .action(async (options) => {
      const verbose = calendar.parent?.opts().verbose;
      const chalk = await loadChalk();
      const ora = await loadOra();
      const spinner = ora('Creating calendar event...').start();

      try {
        const service = new CalendarService();

        let startDateTime = options.start;
        let endDateTime = options.end;

        if (options.allDay) {
          // For all-day events, use YYYY-MM-DD format
          startDateTime = startDateTime.substring(0, 10);
          endDateTime = endDateTime.substring(0, 10);
        }

        const createOptions = {
          subject: options.subject,
          start: startDateTime,
          end: endDateTime,
          body: options.body,
          location: options.location,
          attendees: options.attendees
            ? options.attendees.split(',').map((e: string) => e.trim())
            : undefined,
          isOnlineMeeting: options.online || false,
          timeZone: options.timezone,
        };

        let calendarId: string | undefined;
        if (options.calendar) {
          calendarId = await service.resolveCalendarId(options.calendar);
        }

        const event = await service.createEvent(createOptions, options.allDay || false, calendarId);
        spinner.succeed(chalk.green(`Event created: ${event.subject}`));

        if (verbose) {
          console.log(chalk.gray(`  ID: ${event.id}`));
          console.log(chalk.gray(`  Start: ${event.start.dateTime}`));
          console.log(chalk.gray(`  End: ${event.end.dateTime}`));
        }
      } catch (error) {
        spinner.fail('Failed to create calendar event.');
        handleError(error, verbose);
        process.exitCode = 1;
      }
    });

  calendar
    .command('edit <eventId>')
    .description('Edit an existing calendar event')
    .option('-s, --subject <subject>', 'New event subject')
    .option('--start <dateTime>', 'New start date and time (ISO 8601)')
    .option('--end <dateTime>', 'New end date and time (ISO 8601)')
    .option('--body <body>', 'New event body/description')
    .option('--location <location>', 'New event location')
    .option('--timezone <tz>', 'Timezone')
    .action(async (eventId, options) => {
      const verbose = calendar.parent?.opts().verbose;
      const chalk = await loadChalk();
      const ora = await loadOra();
      const spinner = ora('Updating calendar event...').start();

      try {
        const service = new CalendarService();

        const editOptions = {
          eventId,
          subject: options.subject,
          start: options.start,
          end: options.end,
          body: options.body,
          location: options.location,
          timeZone: options.timezone,
        };

        const event = await service.updateEvent(editOptions);
        spinner.succeed(chalk.green(`Event updated: ${event.subject}`));

        if (verbose) {
          console.log(chalk.gray(`  ID: ${event.id}`));
        }
      } catch (error) {
        spinner.fail('Failed to update calendar event.');
        handleError(error, verbose);
        process.exitCode = 1;
      }
    });

  calendar
    .command('calendars')
    .description('List available calendars')
    .option('--format <format>', 'Output format (table/json)', 'table')
    .action(async (options) => {
      const verbose = calendar.parent?.opts().verbose;
      const chalk = await loadChalk();
      const ora = await loadOra();
      const spinner = ora('Fetching calendars...').start();

      try {
        const service = new CalendarService();
        const calendars = await service.listCalendars();
        spinner.stop();

        if (calendars.length === 0) {
          console.log(chalk.yellow('No calendars found.'));
          return;
        }

        if (options.format === 'json') {
          console.log(JSON.stringify(calendars, null, 2));
        } else {
          const table = new Table({
            head: ['Name', 'Owner', 'Default', 'Can Edit'],
            style: { head: ['cyan'] },
            wordWrap: true,
          });

          for (const cal of calendars) {
            table.push([
              cal.name || '',
              cal.owner?.name || cal.owner?.address || '',
              cal.isDefaultCalendar ? 'Yes' : '',
              cal.canEdit ? 'Yes' : 'No',
            ]);
          }

          console.log(table.toString());
          console.log(chalk.gray(`${calendars.length} calendar(s) found.`));
        }
      } catch (error) {
        spinner.fail('Failed to fetch calendars.');
        handleError(error, verbose);
        process.exitCode = 1;
      }
    });

  return calendar;
}
