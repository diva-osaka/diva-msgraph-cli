import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock graph-client
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockTop = vi.fn().mockReturnThis();
const mockOrderby = vi.fn().mockReturnThis();
const mockSelect = vi.fn().mockReturnThis();
const mockQuery = vi.fn().mockReturnThis();
const mockHeader = vi.fn().mockReturnThis();
const mockApi = vi.fn(() => ({
  top: mockTop,
  orderby: mockOrderby,
  select: mockSelect,
  query: mockQuery,
  header: mockHeader,
  get: mockGet,
  post: mockPost,
  patch: mockPatch,
}));

vi.mock('../../src/services/graph-client', () => ({
  getGraphClient: vi.fn(() =>
    Promise.resolve({
      api: mockApi,
    })
  ),
}));

import { CalendarService } from '../../src/services/calendar';

describe('CalendarService', () => {
  let calendarService: CalendarService;

  beforeEach(() => {
    vi.clearAllMocks();
    calendarService = new CalendarService();

    // Reset chain
    const chainObj = {
      top: mockTop,
      orderby: mockOrderby,
      select: mockSelect,
      query: mockQuery,
      header: mockHeader,
      get: mockGet,
      post: mockPost,
      patch: mockPatch,
    };
    mockApi.mockReturnValue(chainObj);
    mockTop.mockReturnValue(chainObj);
    mockOrderby.mockReturnValue(chainObj);
    mockSelect.mockReturnValue(chainObj);
    mockQuery.mockReturnValue(chainObj);
    mockHeader.mockReturnValue(chainObj);
  });

  describe('listEvents', () => {
    it('should call API with correct parameters', async () => {
      mockGet.mockResolvedValue({ value: [] });

      await calendarService.listEvents(
        '2025-06-15T00:00:00',
        '2025-06-22T00:00:00',
        undefined,
        'Asia/Tokyo'
      );

      expect(mockApi).toHaveBeenCalledWith('/me/calendarView');
      expect(mockQuery).toHaveBeenCalledWith({
        startDateTime: '2025-06-15T00:00:00',
        endDateTime: '2025-06-22T00:00:00',
      });
      expect(mockHeader).toHaveBeenCalledWith('Prefer', 'outlook.timezone="Asia/Tokyo"');
      expect(mockSelect).toHaveBeenCalledWith(
        'id,subject,start,end,location,organizer,isOnlineMeeting,onlineMeetingUrl,attendees'
      );
      expect(mockOrderby).toHaveBeenCalledWith('start/dateTime');
    });

    it('should apply top when provided', async () => {
      mockGet.mockResolvedValue({ value: [] });

      await calendarService.listEvents(
        '2025-06-15T00:00:00',
        '2025-06-22T00:00:00',
        5,
        'UTC'
      );

      expect(mockTop).toHaveBeenCalledWith(5);
    });

    it('should not call top when not provided', async () => {
      mockGet.mockResolvedValue({ value: [] });

      await calendarService.listEvents(
        '2025-06-15T00:00:00',
        '2025-06-22T00:00:00',
        undefined,
        'UTC'
      );

      expect(mockTop).not.toHaveBeenCalled();
    });

    it('should return events from response', async () => {
      const mockEvents = [
        { id: 'evt-1', subject: 'Meeting' },
        { id: 'evt-2', subject: 'Lunch' },
      ];
      mockGet.mockResolvedValue({ value: mockEvents });

      const result = await calendarService.listEvents(
        '2025-06-15T00:00:00',
        '2025-06-22T00:00:00',
        undefined,
        'UTC'
      );

      expect(result).toEqual(mockEvents);
    });
  });

  describe('getEvent', () => {
    it('should call correct API path with Prefer header', async () => {
      const mockEvent = { id: 'evt-123', subject: 'Test' };
      mockGet.mockResolvedValue(mockEvent);

      const result = await calendarService.getEvent('evt-123', 'Asia/Tokyo');

      expect(mockApi).toHaveBeenCalledWith('/me/events/evt-123');
      expect(mockHeader).toHaveBeenCalledWith('Prefer', 'outlook.timezone="Asia/Tokyo"');
      expect(result).toEqual(mockEvent);
    });
  });

  describe('createEvent', () => {
    it('should create a normal event with correct body', async () => {
      const mockCreated = { id: 'new-evt', subject: 'New Meeting' };
      mockPost.mockResolvedValue(mockCreated);

      const result = await calendarService.createEvent({
        subject: 'New Meeting',
        start: '2025-06-20T10:00:00',
        end: '2025-06-20T11:00:00',
        timeZone: 'Asia/Tokyo',
        body: 'Meeting notes',
        location: 'Room A',
        attendees: ['user@example.com'],
      });

      expect(mockApi).toHaveBeenCalledWith('/me/events');
      expect(mockPost).toHaveBeenCalledWith({
        subject: 'New Meeting',
        start: {
          dateTime: '2025-06-20T10:00:00',
          timeZone: 'Asia/Tokyo',
        },
        end: {
          dateTime: '2025-06-20T11:00:00',
          timeZone: 'Asia/Tokyo',
        },
        body: {
          contentType: 'text',
          content: 'Meeting notes',
        },
        location: {
          displayName: 'Room A',
        },
        attendees: [
          {
            emailAddress: { address: 'user@example.com' },
            type: 'required',
          },
        ],
      });
      expect(result).toEqual(mockCreated);
    });

    it('should create an all-day event', async () => {
      mockPost.mockResolvedValue({ id: 'allday-evt' });

      await calendarService.createEvent(
        {
          subject: 'Holiday',
          start: '2025-06-20',
          end: '2025-06-21',
          timeZone: 'UTC',
        },
        true
      );

      expect(mockPost).toHaveBeenCalledWith(
        expect.objectContaining({
          isAllDay: true,
        })
      );
    });

    it('should create an online meeting event', async () => {
      mockPost.mockResolvedValue({ id: 'online-evt' });

      await calendarService.createEvent({
        subject: 'Online Meeting',
        start: '2025-06-20T10:00:00',
        end: '2025-06-20T11:00:00',
        timeZone: 'UTC',
        isOnlineMeeting: true,
      });

      expect(mockPost).toHaveBeenCalledWith(
        expect.objectContaining({
          isOnlineMeeting: true,
        })
      );
    });

    it('should create event with minimal fields', async () => {
      mockPost.mockResolvedValue({ id: 'min-evt' });

      await calendarService.createEvent({
        subject: 'Simple Event',
        start: '2025-06-20T10:00:00',
        end: '2025-06-20T11:00:00',
        timeZone: 'UTC',
      });

      const postedBody = mockPost.mock.calls[0][0];
      expect(postedBody.subject).toBe('Simple Event');
      expect(postedBody.body).toBeUndefined();
      expect(postedBody.location).toBeUndefined();
      expect(postedBody.attendees).toBeUndefined();
      expect(postedBody.isOnlineMeeting).toBeUndefined();
      expect(postedBody.isAllDay).toBeUndefined();
    });
  });

  describe('updateEvent', () => {
    it('should only PATCH changed fields - subject', async () => {
      mockPatch.mockResolvedValue({ id: 'evt-123', subject: 'Updated' });

      await calendarService.updateEvent({
        eventId: 'evt-123',
        subject: 'Updated',
      });

      expect(mockApi).toHaveBeenCalledWith('/me/events/evt-123');
      const patchedBody = mockPatch.mock.calls[0][0];
      expect(patchedBody.subject).toBe('Updated');
      expect(patchedBody.body).toBeUndefined();
      expect(patchedBody.start).toBeUndefined();
      expect(patchedBody.end).toBeUndefined();
      expect(patchedBody.location).toBeUndefined();
    });

    it('should PATCH start and end times', async () => {
      mockPatch.mockResolvedValue({ id: 'evt-123' });

      await calendarService.updateEvent({
        eventId: 'evt-123',
        start: '2025-06-20T14:00:00',
        end: '2025-06-20T15:00:00',
        timeZone: 'Asia/Tokyo',
      });

      const patchedBody = mockPatch.mock.calls[0][0];
      expect(patchedBody.start).toEqual({
        dateTime: '2025-06-20T14:00:00',
        timeZone: 'Asia/Tokyo',
      });
      expect(patchedBody.end).toEqual({
        dateTime: '2025-06-20T15:00:00',
        timeZone: 'Asia/Tokyo',
      });
    });

    it('should PATCH location', async () => {
      mockPatch.mockResolvedValue({ id: 'evt-123' });

      await calendarService.updateEvent({
        eventId: 'evt-123',
        location: 'New Room',
      });

      const patchedBody = mockPatch.mock.calls[0][0];
      expect(patchedBody.location).toEqual({
        displayName: 'New Room',
      });
    });

    it('should PATCH attendees', async () => {
      mockPatch.mockResolvedValue({ id: 'evt-123' });

      await calendarService.updateEvent({
        eventId: 'evt-123',
        attendees: ['a@example.com', 'b@example.com'],
      });

      const patchedBody = mockPatch.mock.calls[0][0];
      expect(patchedBody.attendees).toEqual([
        { emailAddress: { address: 'a@example.com' }, type: 'required' },
        { emailAddress: { address: 'b@example.com' }, type: 'required' },
      ]);
    });

    it('should PATCH isOnlineMeeting', async () => {
      mockPatch.mockResolvedValue({ id: 'evt-123' });

      await calendarService.updateEvent({
        eventId: 'evt-123',
        isOnlineMeeting: true,
      });

      const patchedBody = mockPatch.mock.calls[0][0];
      expect(patchedBody.isOnlineMeeting).toBe(true);
    });

    it('should PATCH body', async () => {
      mockPatch.mockResolvedValue({ id: 'evt-123' });

      await calendarService.updateEvent({
        eventId: 'evt-123',
        body: 'Updated description',
      });

      const patchedBody = mockPatch.mock.calls[0][0];
      expect(patchedBody.body).toEqual({
        contentType: 'text',
        content: 'Updated description',
      });
    });
  });
});
