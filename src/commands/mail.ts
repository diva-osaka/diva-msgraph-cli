import { Command } from 'commander';
import { MailService } from '../services/mail';
import { handleError } from '../utils/errors';
import { formatMailList, formatMailDetail } from '../utils/format';
import { FormatType } from '../types';

async function loadChalk() {
  return (await import('chalk')).default;
}

async function loadOra() {
  return (await import('ora')).default;
}

export function createMailCommand(): Command {
  const mail = new Command('mail').description('Mail operations');

  mail
    .command('list')
    .description('List mail messages')
    .option('-n, --top <number>', 'Number of messages to show', '25')
    .option('--since <timespec>', 'Filter by time (last60min, last6hours, yesterday, today, last7days, or ISO date)')
    .option('--format <format>', 'Output format (table, json, text)', 'table')
    .action(async (options) => {
      const verbose = mail.parent?.opts().verbose;
      const ora = await loadOra();

      try {
        const spinner = ora('Fetching messages...').start();
        const mailService = new MailService();
        const messages = await mailService.listMessages({
          top: parseInt(options.top, 10),
          since: options.since,
        });
        spinner.stop();

        if (messages.length === 0) {
          const chalk = await loadChalk();
          console.log(chalk.yellow('No messages found.'));
          return;
        }

        const output = await formatMailList(messages, options.format as FormatType);
        console.log(output);
      } catch (error) {
        handleError(error, verbose);
        process.exitCode = 1;
      }
    });

  mail
    .command('read <messageId>')
    .description('Read a specific mail message')
    .option('--format <format>', 'Output format (text, json)', 'text')
    .action(async (messageId: string, options) => {
      const verbose = mail.parent?.opts().verbose;
      const ora = await loadOra();

      try {
        const spinner = ora('Fetching message...').start();
        const mailService = new MailService();
        const message = await mailService.readMessage(messageId);
        spinner.stop();

        const output = await formatMailDetail(message, options.format as FormatType);
        console.log(output);
      } catch (error) {
        handleError(error, verbose);
        process.exitCode = 1;
      }
    });

  mail
    .command('send')
    .description('Send a mail message')
    .requiredOption('-t, --to <addresses>', 'Recipient email addresses (comma-separated)')
    .requiredOption('-s, --subject <subject>', 'Mail subject')
    .option('-b, --body <body>', 'Mail body', '')
    .option('--html', 'Send body as HTML')
    .action(async (options) => {
      const verbose = mail.parent?.opts().verbose;
      const chalk = await loadChalk();
      const ora = await loadOra();

      try {
        const toAddresses = options.to.split(',').map((a: string) => a.trim());
        const contentType = options.html ? 'html' : 'text';

        const spinner = ora('Sending message...').start();
        const mailService = new MailService();
        await mailService.sendMessage(toAddresses, options.subject, options.body, contentType);
        spinner.succeed(chalk.green('Message sent successfully.'));
      } catch (error) {
        handleError(error, verbose);
        process.exitCode = 1;
      }
    });

  return mail;
}
