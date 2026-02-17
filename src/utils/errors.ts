export class GraphCliError extends Error {
  public code: string;
  public statusCode?: number;

  constructor(message: string, code: string, statusCode?: number) {
    super(message);
    this.name = 'GraphCliError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  InvalidAuthenticationToken: 'Authentication token is invalid or expired. Please run "d-msgraph auth login" again.',
  Authorization_RequestDenied: 'Access denied. You do not have permission to perform this operation.',
  Request_ResourceNotFound: 'The requested resource was not found.',
  ErrorItemNotFound: 'The specified item was not found.',
  ErrorAccessDenied: 'Access denied. Check your permissions.',
  ErrorInvalidRecipients: 'One or more recipients are invalid.',
  ErrorSendAsDenied: 'You do not have permission to send as this user.',
  ErrorMailboxNotEnabledForRESTAPI: 'The mailbox is not enabled for REST API access.',
  ErrorMailboxMoveInProgress: 'The mailbox is currently being moved. Please try again later.',
  AuthenticationRequiredError: 'Authentication is required. Please run "d-msgraph auth login".',
};

export function handleError(error: unknown, verbose?: boolean): void {
  if (error instanceof GraphCliError) {
    const friendlyMessage = ERROR_MESSAGES[error.code] || error.message;
    console.error(`Error: ${friendlyMessage}`);
    if (verbose) {
      console.error(`  Code: ${error.code}`);
      if (error.statusCode) {
        console.error(`  Status: ${error.statusCode}`);
      }
      console.error(`  Stack: ${error.stack}`);
    }
    return;
  }

  if (error instanceof Error) {
    // Check for MSAL errors
    const msalError = error as Error & { errorCode?: string };
    if (msalError.errorCode) {
      const friendlyMessage = ERROR_MESSAGES[msalError.errorCode] || msalError.message;
      console.error(`Error: ${friendlyMessage}`);
      if (verbose) {
        console.error(`  Code: ${msalError.errorCode}`);
        console.error(`  Stack: ${error.stack}`);
      }
      return;
    }

    console.error(`Error: ${error.message}`);
    if (verbose) {
      console.error(`  Stack: ${error.stack}`);
    }
    return;
  }

  console.error('An unexpected error occurred.');
  if (verbose) {
    console.error(String(error));
  }
}
