import { Command } from 'commander';
import { AuthService } from '../services/auth';
import { handleError } from '../utils/errors';

async function loadChalk() {
  return (await import('chalk')).default;
}

async function loadOra() {
  return (await import('ora')).default;
}

export function createAuthCommand(): Command {
  const auth = new Command('auth').description('Authentication management');

  auth
    .command('login')
    .description('Login to Microsoft Graph')
    .option('--client-credentials', 'Use client credentials flow')
    .action(async (options) => {
      const verbose = auth.parent?.opts().verbose;
      const chalk = await loadChalk();
      const ora = await loadOra();

      try {
        const authService = AuthService.getInstance();

        if (options.clientCredentials) {
          const spinner = ora('Authenticating with client credentials...').start();
          try {
            const result = await authService.loginWithClientCredentials();
            spinner.succeed(
              chalk.green('Successfully authenticated with client credentials.')
            );
            if (verbose) {
              console.log(
                chalk.gray(`  Token expires: ${result.expiresOn?.toISOString()}`)
              );
            }
          } catch (error) {
            spinner.fail('Authentication failed.');
            throw error;
          }
        } else {
          console.log(chalk.blue('Starting device code authentication...'));
          console.log();
          const result = await authService.loginWithDeviceCode();
          console.log();
          console.log(
            chalk.green(
              `Successfully logged in as ${result.account?.username || 'unknown user'}.`
            )
          );
          if (verbose && result.expiresOn) {
            console.log(
              chalk.gray(`  Token expires: ${result.expiresOn.toISOString()}`)
            );
          }
        }
      } catch (error) {
        handleError(error, verbose);
        process.exitCode = 1;
      }
    });

  auth
    .command('logout')
    .description('Logout and clear cached tokens')
    .action(async () => {
      const verbose = auth.parent?.opts().verbose;
      const chalk = await loadChalk();

      try {
        const authService = AuthService.getInstance();
        await authService.logout();
        console.log(chalk.green('Successfully logged out. Token cache cleared.'));
      } catch (error) {
        handleError(error, verbose);
        process.exitCode = 1;
      }
    });

  auth
    .command('status')
    .description('Show current authentication status')
    .action(async () => {
      const verbose = auth.parent?.opts().verbose;
      const chalk = await loadChalk();

      try {
        const authService = AuthService.getInstance();
        const status = await authService.getStatus();

        if (status.authenticated) {
          console.log(chalk.green('Authenticated'));
          if (status.account) {
            console.log(`  User: ${status.account.username || 'N/A'}`);
            console.log(`  Name: ${status.account.name || 'N/A'}`);
            console.log(`  Tenant: ${status.account.tenantId || 'N/A'}`);
          }
          if (status.expiresOn) {
            console.log(`  Token expires: ${status.expiresOn.toISOString()}`);
          }
        } else {
          console.log(chalk.yellow('Not authenticated'));
          if (status.account) {
            console.log(
              chalk.gray(
                `  Last known account: ${status.account.username} (token expired)`
              )
            );
          }
          console.log(
            chalk.gray('  Run "d-msgraph auth login" to authenticate.')
          );
        }
      } catch (error) {
        handleError(error, verbose);
        process.exitCode = 1;
      }
    });

  return auth;
}
