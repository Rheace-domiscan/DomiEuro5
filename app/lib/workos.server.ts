import { WorkOS } from '@workos-inc/node';

if (!process.env.WORKOS_API_KEY) {
  throw new Error(
    'WORKOS_API_KEY environment variable is required. ' +
      'Please copy .env.example to .env and add your WorkOS credentials. ' +
      'See WORKOS_SETUP.md for detailed setup instructions.'
  );
}

if (!process.env.WORKOS_CLIENT_ID) {
  throw new Error(
    'WORKOS_CLIENT_ID environment variable is required. ' +
      'Please copy .env.example to .env and add your WorkOS credentials. ' +
      'See WORKOS_SETUP.md for detailed setup instructions.'
  );
}

export const workos = new WorkOS(process.env.WORKOS_API_KEY);

export const WORKOS_CLIENT_ID = process.env.WORKOS_CLIENT_ID;
export const WORKOS_REDIRECT_URI =
  process.env.WORKOS_REDIRECT_URI || 'http://localhost:5173/auth/callback';
