import * as fs from 'fs';
import * as msal from '@azure/msal-node';
import {
  ensureConfigDir,
  getTokenCachePath,
  getAuthConfig,
  getScopes,
} from '../utils/config';
import { GraphCliError } from '../utils/errors';

function createCachePlugin(): msal.ICachePlugin {
  const cachePath = getTokenCachePath();
  return {
    beforeCacheAccess: async (cacheContext: msal.TokenCacheContext) => {
      if (fs.existsSync(cachePath)) {
        cacheContext.tokenCache.deserialize(
          fs.readFileSync(cachePath, 'utf-8')
        );
      }
    },
    afterCacheAccess: async (cacheContext: msal.TokenCacheContext) => {
      if (cacheContext.cacheHasChanged) {
        ensureConfigDir();
        fs.writeFileSync(
          cachePath,
          cacheContext.tokenCache.serialize(),
          'utf-8'
        );
        // Secure file permissions on Linux/Mac (owner read/write only)
        if (process.platform !== 'win32') {
          fs.chmodSync(cachePath, 0o600);
        }
      }
    },
  };
}

export class AuthService {
  private static instance: AuthService;
  private publicApp: msal.PublicClientApplication | null = null;
  private confidentialApp: msal.ConfidentialClientApplication | null = null;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private async getPublicApp(): Promise<msal.PublicClientApplication> {
    if (!this.publicApp) {
      const authConfig = getAuthConfig();
      this.publicApp = new msal.PublicClientApplication({
        auth: {
          clientId: authConfig.clientId,
          authority: `https://login.microsoftonline.com/${authConfig.tenantId}`,
        },
        cache: {
          cachePlugin: createCachePlugin(),
        },
      });
    }
    return this.publicApp;
  }

  private async getConfidentialApp(): Promise<msal.ConfidentialClientApplication> {
    if (!this.confidentialApp) {
      const authConfig = getAuthConfig();
      if (!authConfig.clientSecret) {
        throw new GraphCliError(
          'Client secret is required for client credentials flow. Set AZURE_CLIENT_SECRET environment variable.',
          'MissingClientSecret'
        );
      }
      this.confidentialApp = new msal.ConfidentialClientApplication({
        auth: {
          clientId: authConfig.clientId,
          authority: `https://login.microsoftonline.com/${authConfig.tenantId}`,
          clientSecret: authConfig.clientSecret,
        },
        cache: {
          cachePlugin: createCachePlugin(),
        },
      });
    }
    return this.confidentialApp;
  }

  async loginWithDeviceCode(): Promise<msal.AuthenticationResult> {
    const app = await this.getPublicApp();
    const request: msal.DeviceCodeRequest = {
      scopes: getScopes(),
      deviceCodeCallback: (response) => {
        console.log(response.message);
      },
    };

    const result = await app.acquireTokenByDeviceCode(request);
    if (!result) {
      throw new GraphCliError(
        'Failed to acquire token via device code flow.',
        'DeviceCodeFlowFailed'
      );
    }
    return result;
  }

  async loginWithClientCredentials(): Promise<msal.AuthenticationResult> {
    const app = await this.getConfidentialApp();
    const request: msal.ClientCredentialRequest = {
      scopes: ['https://graph.microsoft.com/.default'],
    };

    const result = await app.acquireTokenByClientCredential(request);
    if (!result) {
      throw new GraphCliError(
        'Failed to acquire token via client credentials flow.',
        'ClientCredentialsFlowFailed'
      );
    }
    return result;
  }

  async acquireTokenSilent(): Promise<msal.AuthenticationResult> {
    const app = await this.getPublicApp();
    const tokenCache = app.getTokenCache();
    const accounts = await tokenCache.getAllAccounts();

    if (accounts.length === 0) {
      throw new GraphCliError(
        'No cached accounts found. Please run "d-msgraph auth login" first.',
        'AuthenticationRequiredError'
      );
    }

    const request: msal.SilentFlowRequest = {
      account: accounts[0],
      scopes: getScopes(),
    };

    try {
      const result = await app.acquireTokenSilent(request);
      return result;
    } catch (error) {
      throw new GraphCliError(
        'Token expired or invalid. Please run "d-msgraph auth login" again.',
        'AuthenticationRequiredError'
      );
    }
  }

  async logout(): Promise<void> {
    const cachePath = getTokenCachePath();
    if (fs.existsSync(cachePath)) {
      fs.unlinkSync(cachePath);
    }
    this.publicApp = null;
    this.confidentialApp = null;
  }

  async getStatus(): Promise<{
    authenticated: boolean;
    account?: msal.AccountInfo;
    expiresOn?: Date;
  }> {
    try {
      const app = await this.getPublicApp();
      const tokenCache = app.getTokenCache();
      const accounts = await tokenCache.getAllAccounts();

      if (accounts.length === 0) {
        return { authenticated: false };
      }

      try {
        const result = await this.acquireTokenSilent();
        return {
          authenticated: true,
          account: result.account ?? undefined,
          expiresOn: result.expiresOn ?? undefined,
        };
      } catch {
        return {
          authenticated: false,
          account: accounts[0],
        };
      }
    } catch {
      return { authenticated: false };
    }
  }
}
