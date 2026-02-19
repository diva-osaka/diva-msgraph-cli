import { Client } from '@microsoft/microsoft-graph-client';
import { AuthService } from './auth';

export async function getGraphClient(): Promise<Client> {
  const authService = AuthService.getInstance();

  // Acquire token upfront so auth errors are thrown immediately
  // rather than deferred to the first API call via the callback
  const tokenResponse = await authService.acquireTokenSilent();
  let accessToken = tokenResponse.accessToken;

  const client = Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });

  return client;
}
