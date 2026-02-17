import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

// Mock config
vi.mock('../../src/utils/config', () => ({
  ensureConfigDir: vi.fn(),
  getTokenCachePath: vi.fn(() => '/tmp/.d-msgraph-cli/token-cache.json'),
  getAuthConfig: vi.fn(() => ({
    clientId: 'test-client-id',
    tenantId: 'test-tenant-id',
    clientSecret: 'test-client-secret',
  })),
}));

// Mock msal-node
const mockAcquireTokenByDeviceCode = vi.fn();
const mockAcquireTokenByClientCredential = vi.fn();
const mockAcquireTokenSilent = vi.fn();
const mockGetAllAccounts = vi.fn();
const mockGetTokenCache = vi.fn(() => ({
  getAllAccounts: mockGetAllAccounts,
}));

vi.mock('@azure/msal-node', () => ({
  PublicClientApplication: vi.fn().mockImplementation(function (this: any) {
    this.acquireTokenByDeviceCode = mockAcquireTokenByDeviceCode;
    this.acquireTokenSilent = mockAcquireTokenSilent;
    this.getTokenCache = mockGetTokenCache;
  }),
  ConfidentialClientApplication: vi.fn().mockImplementation(function (this: any) {
    this.acquireTokenByClientCredential = mockAcquireTokenByClientCredential;
  }),
}));

import * as fs from 'fs';
import { AuthService } from '../../src/services/auth';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the singleton by accessing the static property
    (AuthService as any).instance = undefined;
    authService = AuthService.getInstance();
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = AuthService.getInstance();
      const instance2 = AuthService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('loginWithDeviceCode', () => {
    it('should call acquireTokenByDeviceCode with correct scopes', async () => {
      const mockResult = {
        accessToken: 'test-token',
        account: { username: 'test@example.com' },
      };
      mockAcquireTokenByDeviceCode.mockResolvedValue(mockResult);

      const result = await authService.loginWithDeviceCode();

      expect(mockAcquireTokenByDeviceCode).toHaveBeenCalledWith(
        expect.objectContaining({
          scopes: ['User.Read', 'Mail.Read', 'Mail.Send', 'Calendars.ReadWrite'],
          deviceCodeCallback: expect.any(Function),
        })
      );
      expect(result).toBe(mockResult);
    });

    it('should throw when acquireTokenByDeviceCode returns null', async () => {
      mockAcquireTokenByDeviceCode.mockResolvedValue(null);

      await expect(authService.loginWithDeviceCode()).rejects.toThrow(
        'Failed to acquire token via device code flow.'
      );
    });
  });

  describe('loginWithClientCredentials', () => {
    it('should call acquireTokenByClientCredential with .default scope', async () => {
      const mockResult = {
        accessToken: 'test-app-token',
      };
      mockAcquireTokenByClientCredential.mockResolvedValue(mockResult);

      const result = await authService.loginWithClientCredentials();

      expect(mockAcquireTokenByClientCredential).toHaveBeenCalledWith(
        expect.objectContaining({
          scopes: ['https://graph.microsoft.com/.default'],
        })
      );
      expect(result).toBe(mockResult);
    });

    it('should throw when acquireTokenByClientCredential returns null', async () => {
      mockAcquireTokenByClientCredential.mockResolvedValue(null);

      await expect(authService.loginWithClientCredentials()).rejects.toThrow(
        'Failed to acquire token via client credentials flow.'
      );
    });
  });

  describe('acquireTokenSilent', () => {
    it('should acquire token when accounts exist', async () => {
      const mockAccount = {
        homeAccountId: 'home-id',
        environment: 'login.microsoftonline.com',
        tenantId: 'test-tenant-id',
        username: 'test@example.com',
      };
      mockGetAllAccounts.mockResolvedValue([mockAccount]);

      const mockResult = {
        accessToken: 'silent-token',
        account: mockAccount,
      };
      mockAcquireTokenSilent.mockResolvedValue(mockResult);

      const result = await authService.acquireTokenSilent();

      expect(mockAcquireTokenSilent).toHaveBeenCalledWith(
        expect.objectContaining({
          account: mockAccount,
          scopes: ['User.Read', 'Mail.Read', 'Mail.Send', 'Calendars.ReadWrite'],
        })
      );
      expect(result).toBe(mockResult);
    });

    it('should throw when no accounts exist', async () => {
      mockGetAllAccounts.mockResolvedValue([]);

      await expect(authService.acquireTokenSilent()).rejects.toThrow(
        'No cached accounts found.'
      );
    });

    it('should throw when silent acquisition fails', async () => {
      const mockAccount = {
        homeAccountId: 'home-id',
        environment: 'login.microsoftonline.com',
        tenantId: 'test-tenant-id',
        username: 'test@example.com',
      };
      mockGetAllAccounts.mockResolvedValue([mockAccount]);
      mockAcquireTokenSilent.mockRejectedValue(new Error('Token expired'));

      await expect(authService.acquireTokenSilent()).rejects.toThrow(
        'Token expired or invalid.'
      );
    });
  });

  describe('logout', () => {
    it('should delete cache file if it exists', async () => {
      (fs.existsSync as any).mockReturnValue(true);

      await authService.logout();

      expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/.d-msgraph-cli/token-cache.json');
    });

    it('should not throw if cache file does not exist', async () => {
      (fs.existsSync as any).mockReturnValue(false);

      await authService.logout();

      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('should return authenticated true when token is valid', async () => {
      const mockAccount = {
        homeAccountId: 'home-id',
        environment: 'login.microsoftonline.com',
        tenantId: 'test-tenant-id',
        username: 'test@example.com',
      };
      mockGetAllAccounts.mockResolvedValue([mockAccount]);

      const mockResult = {
        accessToken: 'valid-token',
        account: mockAccount,
        expiresOn: new Date('2025-12-31'),
      };
      mockAcquireTokenSilent.mockResolvedValue(mockResult);

      const status = await authService.getStatus();

      expect(status.authenticated).toBe(true);
      expect(status.account).toBe(mockAccount);
      expect(status.expiresOn).toEqual(new Date('2025-12-31'));
    });

    it('should return authenticated false when no accounts', async () => {
      mockGetAllAccounts.mockResolvedValue([]);

      const status = await authService.getStatus();

      expect(status.authenticated).toBe(false);
    });
  });
});
