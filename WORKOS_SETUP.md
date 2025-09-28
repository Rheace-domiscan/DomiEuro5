# WorkOS Authentication Setup Guide

Your Remix app is now configured with WorkOS authentication! Follow these steps to complete the setup:

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

## 4. Update Environment Variables
1. Open the `.env` file in your project root
2. Replace the placeholder values with your actual WorkOS credentials:
   ```env
   WORKOS_API_KEY=your_actual_api_key_here
   WORKOS_CLIENT_ID=your_actual_client_id_here
   WORKOS_REDIRECT_URI=http://localhost:5173/auth/callback
   SESSION_SECRET=generate_a_random_string_here
   ```

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

## Next Steps
- Configure your WorkOS application with identity providers (Google, Microsoft, etc.)
- Customize the login and dashboard pages
- Add additional protected routes as needed
- Set up production environment variables

Need help? Check the [WorkOS documentation](https://workos.com/docs) for more details!