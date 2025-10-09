# WorkOS Authentication Setup Guide

Your React Router app is now configured with WorkOS authentication! Follow these steps to complete the setup:

## 1. Create a WorkOS Account

1. Go to [workos.com](https://workos.com) and create an account
2. Create a new project in your WorkOS dashboard

## 2. Configure WorkOS Application

1. In your WorkOS dashboard, go to "Applications"
2. Create a new application or select an existing one
3. Note down your:
   - **API Key** (found in API Keys section)
   - **Client ID** (found in your application settings)

## 3. Set Up Redirect URI

1. In your WorkOS application settings, add the redirect URI:
   ```
   http://localhost:5173/auth/callback
   ```
2. For production, update this to your production domain

## 4. Create and Update Environment Variables

1. Copy the example environment file to create your local `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open the `.env` file in your project root
3. Replace the placeholder values with your actual WorkOS credentials:
```env
WORKOS_API_KEY=your_actual_api_key_here
WORKOS_CLIENT_ID=your_actual_client_id_here
WORKOS_REDIRECT_URI=http://localhost:5173/auth/callback
SESSION_SECRET=generate_a_random_string_here
```

Need additional environment profiles? Use `npm run env:copy staging`, `npm run env:activate staging`, and `npm run env:sync staging`—see `docs/ENVIRONMENTS.md` for the full workflow.

## 5. Generate Session Secret

Generate a random string for the session secret. You can use:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 6. Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```
2. Visit http://localhost:5173
3. Click "Sign In with WorkOS"
4. You should be redirected to WorkOS for authentication
5. After completing the flow, confirm the authenticated TopNav renders with the Settings dropdown (Billing, Team, Pricing) and that `/settings` loads without Stripe/WorkOS import errors.
6. If you have multiple organizations, flip the new organization switcher under the Settings dropdown and ensure the role syncs without errors.

## Available Routes

- `/` - Home page (shows auth state)
- `/auth/login` - Login page
- `/auth/logout` - Logout endpoint
- `/dashboard` - Protected route (requires authentication)

## Features Included

- ✅ WorkOS OAuth integration
- ✅ Session management with secure cookies
- ✅ Protected routes
- ✅ Automatic redirects for unauthenticated users
- ✅ User information display
- ✅ Logout functionality

## WorkOS Dashboard Configuration

### Required Settings for Organization Support

1. **Enable AuthKit**
   - Go to: WorkOS Dashboard → AuthKit
   - Ensure AuthKit is enabled for your environment
   - This is required for the authentication flow to work

2. **Allow Organization Creation**
   - Go to: WorkOS Dashboard → Organizations → Settings
   - Enable "Allow users to create organizations"
   - Without this, users will see permission errors during signup

3. **Configure Identity Providers** (Optional)
   - Go to: WorkOS Dashboard → Authentication → Connections
   - Add providers like Google, Microsoft, GitHub, etc.
   - If no providers are configured, users will use email/password authentication

### Alternative: Organization Selection Only

If you want users to join existing organizations instead of creating new ones:

1. Pre-create organizations in WorkOS Dashboard → Organizations
2. Disable "Allow users to create organizations"
3. Modify `app/routes/auth/callback.tsx` to skip the create-organization flow
4. Users will be presented with organization selection during authentication

## Development Mode

For local testing without a full WorkOS setup:

1. **Use WorkOS Test Mode**
   - WorkOS provides test API keys for development
   - Test mode data is isolated from production

2. **Test Organization Creation**
   - Create test users with `test_` prefix emails
   - These won't send actual emails during authentication

## Shared Provider Services

- Route loaders/actions import WorkOS helpers from `app/services/providers.server.ts` (`rbacService`, `requireUser`, etc.).
- Keep those imports inside loaders/actions so the WorkOS Node SDK stays server-only and avoids bundling issues in the browser.
- When you add custom WorkOS flows (e.g., role sync, organization automation), update `app/services/providers.server.ts` and the related tests to keep all settings pages aligned.

## Next Steps

- Configure your WorkOS application with identity providers (Google, Microsoft, etc.)
- Customize the login and dashboard pages
- Add additional protected routes as needed
- Set up production environment variables
- Disable or remove the `/test-workos` diagnostic route before sharing publicly (it is dev-only by default)
- Run `npm run lint`, `npm run typecheck`, `npm run test:run`, and `npm run test:e2e` after any auth changes to confirm the shared service layer still passes tests.

## Troubleshooting

### "Organization creation is not enabled" error

- Check WorkOS Dashboard → Organizations → Settings
- Ensure "Allow users to create organizations" is enabled
- Verify your API key has the correct permissions

### "Session expired" errors

- Sessions are stored in encrypted cookies
- Ensure `SESSION_SECRET` is set in your `.env` file
- Session expires after inactivity

### Authentication redirects to login

- Verify `WORKOS_REDIRECT_URI` matches your WorkOS dashboard configuration
- Check that the redirect URI includes the correct protocol (http/https)

Need help? Check the [WorkOS documentation](https://workos.com/docs) for more details!
