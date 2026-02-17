import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AuthConfig } from '../types';

const CONFIG_DIR_NAME = '.d-msgraph-cli';

export function getConfigDir(): string {
  return path.join(os.homedir(), CONFIG_DIR_NAME);
}

export function ensureConfigDir(): void {
  const configDir = getConfigDir();
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
}

export function getConfigPath(): string {
  return path.join(getConfigDir(), 'config.json');
}

export function getTokenCachePath(): string {
  return path.join(getConfigDir(), 'token-cache.json');
}

export function loadConfig(): Record<string, string> {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    return {};
  }
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

export function saveConfig(config: Record<string, string>): void {
  ensureConfigDir();
  const configPath = getConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

export function getConfigValue(key: string, cliValue?: string): string | undefined {
  // Priority: CLI flags > environment variables > config file
  if (cliValue) {
    return cliValue;
  }

  const envMap: Record<string, string> = {
    clientId: 'AZURE_CLIENT_ID',
    tenantId: 'AZURE_TENANT_ID',
    clientSecret: 'AZURE_CLIENT_SECRET',
  };

  const envKey = envMap[key];
  if (envKey && process.env[envKey]) {
    return process.env[envKey];
  }

  const config = loadConfig();
  return config[key];
}

export function getAuthConfig(): AuthConfig {
  const clientId = getConfigValue('clientId');
  const tenantId = getConfigValue('tenantId');

  if (!clientId || !tenantId) {
    throw new Error(
      'Missing required configuration. Set AZURE_CLIENT_ID and AZURE_TENANT_ID environment variables or run configuration setup.'
    );
  }

  return {
    clientId,
    tenantId,
    clientSecret: getConfigValue('clientSecret'),
  };
}
