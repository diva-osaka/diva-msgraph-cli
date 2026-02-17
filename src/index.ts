#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { createAuthCommand } from './commands/auth';
import { createMailCommand } from './commands/mail';
import { createCalendarCommand } from './commands/calendar';

dotenv.config();

const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

const program = new Command();

program
  .name('d-msgraph')
  .description('Microsoft Graph CLI - Mail and Calendar operations')
  .version(packageJson.version)
  .option('--verbose', 'Enable verbose output');

program.addCommand(createAuthCommand());
program.addCommand(createMailCommand());
program.addCommand(createCalendarCommand());

program.parse(process.argv);
