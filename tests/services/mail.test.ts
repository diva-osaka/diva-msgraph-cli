import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock graph-client
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockTop = vi.fn().mockReturnThis();
const mockOrderby = vi.fn().mockReturnThis();
const mockSelect = vi.fn().mockReturnThis();
const mockFilter = vi.fn().mockReturnThis();
const mockSearch = vi.fn().mockReturnThis();
const mockApi = vi.fn(() => ({
  top: mockTop,
  orderby: mockOrderby,
  select: mockSelect,
  filter: mockFilter,
  search: mockSearch,
  get: mockGet,
  post: mockPost,
}));

vi.mock('../../src/services/graph-client', () => ({
  getGraphClient: vi.fn(() =>
    Promise.resolve({
      api: mockApi,
    })
  ),
}));

// Mock date utils
vi.mock('../../src/utils/date', () => ({
  parseSinceOption: vi.fn((since: string) => {
    if (since === 'last60min') {
      return { start: '2025-06-15T11:00:00.000Z' };
    }
    if (since === 'yesterday') {
      return { start: '2025-06-14T00:00:00.000Z', end: '2025-06-14T23:59:59.999Z' };
    }
    return { start: since };
  }),
}));

import { MailService } from '../../src/services/mail';

describe('MailService', () => {
  let mailService: MailService;

  beforeEach(() => {
    vi.clearAllMocks();
    mailService = new MailService();

    // Reset chain - each method call returns the full chain object
    const chainObj = {
      top: mockTop,
      orderby: mockOrderby,
      select: mockSelect,
      filter: mockFilter,
      search: mockSearch,
      get: mockGet,
      post: mockPost,
    };
    mockApi.mockReturnValue(chainObj);
    mockTop.mockReturnValue(chainObj);
    mockOrderby.mockReturnValue(chainObj);
    mockSelect.mockReturnValue(chainObj);
    mockFilter.mockReturnValue(chainObj);
    mockSearch.mockReturnValue(chainObj);
  });

  describe('listMessages', () => {
    it('should call API with correct default parameters', async () => {
      mockGet.mockResolvedValue({ value: [] });

      await mailService.listMessages({});

      expect(mockApi).toHaveBeenCalledWith('/me/messages');
      expect(mockTop).toHaveBeenCalledWith(25);
      expect(mockOrderby).toHaveBeenCalledWith('receivedDateTime desc');
      expect(mockSelect).toHaveBeenCalledWith(
        'id,subject,from,toRecipients,receivedDateTime,isRead,hasAttachments,bodyPreview'
      );
    });

    it('should use custom top value', async () => {
      mockGet.mockResolvedValue({ value: [] });

      await mailService.listMessages({ top: 10 });

      expect(mockTop).toHaveBeenCalledWith(10);
    });

    it('should set filter when since is provided', async () => {
      mockGet.mockResolvedValue({ value: [] });

      await mailService.listMessages({ since: 'last60min' });

      expect(mockFilter).toHaveBeenCalledWith(
        'receivedDateTime ge 2025-06-15T11:00:00.000Z'
      );
    });

    it('should combine since and filter', async () => {
      mockGet.mockResolvedValue({ value: [] });

      await mailService.listMessages({
        since: 'last60min',
        filter: "isRead eq false",
      });

      expect(mockFilter).toHaveBeenCalledWith(
        'receivedDateTime ge 2025-06-15T11:00:00.000Z and isRead eq false'
      );
    });

    it('should set both start and end filter for yesterday', async () => {
      mockGet.mockResolvedValue({ value: [] });

      await mailService.listMessages({ since: 'yesterday' });

      expect(mockFilter).toHaveBeenCalledWith(
        'receivedDateTime ge 2025-06-14T00:00:00.000Z and receivedDateTime le 2025-06-14T23:59:59.999Z'
      );
    });

    it('should apply filter without since', async () => {
      mockGet.mockResolvedValue({ value: [] });

      await mailService.listMessages({ filter: "isRead eq false" });

      expect(mockFilter).toHaveBeenCalledWith("isRead eq false");
    });

    it('should apply search', async () => {
      mockGet.mockResolvedValue({ value: [] });

      await mailService.listMessages({ search: 'important' });

      expect(mockSearch).toHaveBeenCalledWith('important');
    });

    it('should return messages from response', async () => {
      const mockMessages = [
        { id: '1', subject: 'Test' },
        { id: '2', subject: 'Test 2' },
      ];
      mockGet.mockResolvedValue({ value: mockMessages });

      const result = await mailService.listMessages({});

      expect(result).toEqual(mockMessages);
    });
  });

  describe('readMessage', () => {
    it('should call correct API path', async () => {
      const mockMessage = { id: 'msg-123', subject: 'Test' };
      mockGet.mockResolvedValue(mockMessage);

      const result = await mailService.readMessage('msg-123');

      expect(mockApi).toHaveBeenCalledWith('/me/messages/msg-123');
      expect(result).toEqual(mockMessage);
    });
  });

  describe('sendMessage', () => {
    it('should send with correct body for text content', async () => {
      mockPost.mockResolvedValue(undefined);

      await mailService.sendMessage(
        ['recipient@example.com'],
        'Test Subject',
        'Test body'
      );

      expect(mockApi).toHaveBeenCalledWith('/me/sendMail');
      expect(mockPost).toHaveBeenCalledWith({
        message: {
          subject: 'Test Subject',
          body: {
            contentType: 'Text',
            content: 'Test body',
          },
          toRecipients: [
            { emailAddress: { address: 'recipient@example.com' } },
          ],
        },
      });
    });

    it('should send with HTML content type', async () => {
      mockPost.mockResolvedValue(undefined);

      await mailService.sendMessage(
        ['user@example.com'],
        'HTML Email',
        '<p>Hello</p>',
        'html'
      );

      expect(mockPost).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.objectContaining({
            body: {
              contentType: 'HTML',
              content: '<p>Hello</p>',
            },
          }),
        })
      );
    });

    it('should handle multiple recipients', async () => {
      mockPost.mockResolvedValue(undefined);

      await mailService.sendMessage(
        ['a@example.com', 'b@example.com'],
        'Multi',
        'body'
      );

      expect(mockPost).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.objectContaining({
            toRecipients: [
              { emailAddress: { address: 'a@example.com' } },
              { emailAddress: { address: 'b@example.com' } },
            ],
          }),
        })
      );
    });
  });
});
