# React Router + WorkOS + Convex Starter Template

A production-ready, full-stack B2B SaaS starter template with enterprise authentication and real-time database.

## 🎯 What's Included

This template provides everything you need to build a modern B2B SaaS application:

- **🔐 Enterprise Authentication** - WorkOS integration with organization/multi-tenant support
- **💳 Stripe Billing** - Complete subscription management with 3 tiers, seat-based pricing, and annual billing
- **👥 Role-Based Access Control** - 5 custom roles (Owner, Admin, Manager, Sales, Team Member)
- **📊 Real-time Database** - Convex for reactive, type-safe data operations
- **⚡️ Modern Stack** - React Router v7, React 19, TailwindCSS v4
- **🚀 SSR & HMR** - Server-side rendering with hot module replacement
- **🔒 TypeScript** - Full type safety across frontend, backend, and database
- **✨ Production Ready** - Error handling, session management, and security best practices

## 🏗️ Tech Stack

- **Frontend**: React Router v7, React 19, TailwindCSS v4
- **Authentication**: WorkOS (SSO, organization management, AuthKit, RBAC)
- **Billing**: Stripe (subscriptions, customer portal, webhooks)
- **Database**: Convex (real-time, serverless)
- **Styling**: TailwindCSS with Vite plugin
- **Build**: Vite + React Router plugin
- **Language**: TypeScript (strict mode)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
```

Then edit `.env` and add your credentials (see setup guides below).

### 3. Initialize Convex

```bash
npx convex dev
```

This will provide you with `CONVEX_URL` and `VITE_CONVEX_URL` to add to your `.env` file.

### 4. Start Development Server

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## 📚 Documentation

### Core Setup

- **[WorkOS Setup](./WORKOS_SETUP.md)** - Configure authentication and organizations
- **[Convex Setup](./CONVEX_SETUP.md)** - Database schema and usage
- **[Template Customization](./TEMPLATE_USAGE.md)** - How to customize or remove features
- **[Claude Code Guide](./CLAUDE.md)** - AI assistance and development workflow

### Billing Features

#### Quick Start

1. Copy `.env.example` to `.env` and add your Convex, Stripe, and WorkOS credentials.
2. Follow `STRIPE_SETUP.md` to create products, prices, and webhook endpoints in Stripe.
3. Configure the 5 WorkOS roles (`owner`, `admin`, `manager`, `sales`, `team_member`) using `WORKOS_RBAC_SETUP.md`.
4. Run `npm run dev` and confirm the pricing and billing settings routes load without type or lint errors.

#### Documentation

- **[Billing Roadmap](./BILLING_ROADMAP.md)** - Step-by-step implementation guide (~100 tasks)
- **[Stripe Setup](./STRIPE_SETUP.md)** - Configure Stripe products, webhooks, and portal
- **[WorkOS RBAC Setup](./WORKOS_RBAC_SETUP.md)** - Configure 5 user roles in WorkOS
- **[Billing Guide](./BILLING_GUIDE.md)** - System architecture and how it works
- **[Feature Gates](./FEATURE_GATES.md)** - Implement tier-based feature access

## 🎨 Key Features

### Multi-Tier Billing System

- **3 pricing tiers:** Free (1 seat), Starter (£50/mo, 5-19 seats), Professional (£250/mo, 20-40 seats)
- **Flexible seat pricing:** £10/seat/month for additional seats
- **Annual billing:** 10x monthly price (2 months free)
- **Self-service portal:** Stripe Customer Portal for subscription management
- **Graceful downgrades:** Warnings instead of blocking, owner controls timing
- **Failed payment handling:** 28-day grace period with automatic retries

### Role-Based Access Control

- **5 user roles:** Owner, Admin, Manager, Sales, Team Member
- **WorkOS RBAC integration:** Roles managed in WorkOS Dashboard
- **Permission system:** Granular control over billing, user management, and features
- **Feature gates:** Tier-based access to premium features with upgrade prompts

### Multi-Tenant Organization Support

- Automatic organization creation during signup
- Organization selection for existing members
- User-organization relationship management
- Isolated data per organization

### Secure Authentication Flow

1. User signs in via WorkOS AuthKit
2. Organization creation or selection
3. User synced to Convex database
4. Secure session management with encrypted cookies

### Real-Time Database

- Type-safe Convex queries and mutations
- Automatic React hooks generation
- Server-side and client-side data access
- Real-time updates across clients

## 🛠️ Development Commands

```bash
npm run dev          # Start development server with HMR
npm run build        # Create production build
npm run start        # Start production server from build
npm run typecheck    # Run TypeScript type checking
npm run lint         # Run ESLint
npm run lint:fix     # Run ESLint with auto-fix
npm run format       # Format code with Prettier
npm run format:check # Check code formatting
```

### Convex Commands

```bash
npx convex dev      # Start Convex development server
npx convex deploy   # Deploy Convex functions to production
npx convex codegen  # Regenerate TypeScript types
```

### Stripe CLI Testing

Use the Stripe CLI to replay webhook events against your local server before merging billing changes:

```bash
stripe listen --forward-to http://localhost:5173/webhooks/stripe

# Core billing flows to simulate
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_failed
```

See [`test/stripe-test-scenarios.md`](./test/stripe-test-scenarios.md) for the full list of 10 manual billing scenarios to verify during QA.

## 📁 Project Structure

```
├── app/                      # React Router application
│   ├── routes/              # File-based routing
│   │   ├── auth/           # Authentication routes
│   │   ├── dashboard.tsx   # Protected dashboard
│   │   └── home.tsx        # Public home page
│   └── lib/                # Server-side utilities
│       ├── auth.server.ts  # Authentication logic
│       ├── session.server.ts # Session management
│       └── workos.server.ts  # WorkOS client
├── convex/                  # Convex database
│   ├── schema.ts           # Database schema
│   ├── users.ts            # User CRUD operations
│   └── _generated/         # Auto-generated types (gitignored)
├── lib/                     # Client-side utilities
│   ├── convex.server.ts    # Server-side Convex client
│   ├── ConvexProvider.tsx  # Convex React provider
│   └── useConvex.ts        # Database hooks
├── components/              # Reusable React components
├── public/                  # Static assets
└── .env.example            # Environment variables template
```

## 🏭 Building for Production

Create a production build:

```bash
npm run build
```

The build output will be in the `build/` directory:

- `build/client/` - Static assets
- `build/server/` - Server-side code

## 🚢 Deployment

### Docker Deployment

To build and run using Docker:

```bash
docker build -t my-app .

# Run the container
docker run -p 3000:3000 my-app
```

The containerized application can be deployed to any platform that supports Docker, including:

- AWS ECS
- Google Cloud Run
- Azure Container Apps
- Digital Ocean App Platform
- Fly.io
- Railway

### DIY Deployment

If you're familiar with deploying Node applications, the built-in app server is production-ready.

Make sure to deploy the output of `npm run build`

```
├── package.json
├── package-lock.json (or pnpm-lock.yaml, or bun.lockb)
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

### Environment Variables for Production

Before deploying, ensure you have production values for:

- `WORKOS_API_KEY` - Production WorkOS API key
- `WORKOS_CLIENT_ID` - Production WorkOS client ID
- `WORKOS_REDIRECT_URI` - Production callback URL (e.g., `https://yourdomain.com/auth/callback`)
- `SESSION_SECRET` - Strong random string for session encryption
- `CONVEX_URL` - Production Convex deployment URL
- `VITE_CONVEX_URL` - Same as CONVEX_URL (for client-side)

## 🔧 Troubleshooting

### "CONVEX_URL environment variable is required"

- Run `npx convex dev` to initialize Convex and get your deployment URL
- Add the URL to your `.env` file as both `CONVEX_URL` and `VITE_CONVEX_URL`

### "WORKOS_API_KEY environment variable is required"

- Sign up at [workos.com](https://workos.com)
- Create a project and application
- Copy your API key and Client ID to `.env`
- See [WORKOS_SETUP.md](./WORKOS_SETUP.md) for detailed instructions

### Authentication redirects to login repeatedly

- Check that your `WORKOS_REDIRECT_URI` matches your WorkOS dashboard configuration
- Ensure `SESSION_SECRET` is set in your `.env` file
- Verify AuthKit is enabled in your WorkOS dashboard

### TypeScript errors about missing Convex types

- Run `npx convex codegen` to regenerate types
- Ensure `convex/_generated/` directory exists

## 📖 Learn More

- [React Router Documentation](https://reactrouter.com/)
- [WorkOS Documentation](https://workos.com/docs)
- [Convex Documentation](https://docs.convex.dev/)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)

## 🤝 Contributing

This is a starter template. Feel free to fork and customize for your needs!

## 📄 License

This template is open source and available for use in your projects.

---

**Built with ❤️ using React Router, WorkOS, and Convex**
