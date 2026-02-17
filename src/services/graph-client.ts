import { Client } from '@microsoft/microsoft-graph-client';
import { AuthService } from './auth';

export async function getGraphClient(): Promise<Client> {
  const authService = AuthService.getInstance();

  const client = Client.init({
    authProvider: async (done) => {
      try {
        const tokenResponse = await authService.acquireTokenSilent();
        done(null, tokenResponse.accessToken);
      } catch (error) {
        done(error as Error, null);
      }
    },
  });

  return client;
}
