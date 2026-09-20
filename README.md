# PaslaugųRinka — Service Marketplace MVP

Platforma, jungianti paslaugų tiekėjus su klientais Lietuvoje. Klientai pateikia užklausas (be registracijos), tiekėjai gauna ir atsako. Monetizacija per tiekėjų prenumeratą (Stripe).

## Tech Stack

- **Frontend/Backend:** Next.js 16 (App Router) + TypeScript
- **Styling:** Tailwind CSS (mobile-first, dark mode)
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** NextAuth.js (Credentials, JWT)
- **Payments:** Stripe (subscriptions, webhooks, customer portal)
- **Email:** Resend (transactional emails)
- **Icons:** Lucide React

## Setup

### 1. Clone & Install

```bash
git clone <repo-url>
cd marketplace-platform
pnpm install
```

### 2. Environment Variables

```bash
cp .env.example .env.local
```

Fill in all variables in `.env.local`. See `.env.example` for the full list.

### 3. Database

```bash
# Push schema to database
npx prisma db push

# Seed with test data
pnpm db:seed

# Open Prisma Studio (optional)
pnpm db:studio
```

### 4. Stripe Setup

1. Create products in Stripe Dashboard:
   - **Bazinis** plan: €29/month → copy Price ID to `STRIPE_BASIC_PRICE_ID`
   - **PRO** plan: €59/month → copy Price ID to `STRIPE_PRO_PRICE_ID`
2. Set up webhook endpoint: `https://your-domain.com/api/stripe/webhook`
   - Events to listen: `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`
   - Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### 5. Run

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@platform.lt | Admin123! |
| Provider | jonas@example.lt | Provider123! |
| Provider | petras@example.lt | Provider123! |
| Provider | ona@example.lt | Provider123! |

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, Register pages
│   ├── admin/           # Admin panel (dashboard, providers, requests)
│   ├── api/             # API routes
│   ├── kontaktai/       # Contact page
│   ├── paskyra/         # Client account pages
│   ├── privatumas/      # Privacy policy
│   ├── tiekejams/       # Provider landing page
│   ├── tiekėjas/        # Provider dashboard, requests, profile, plans
│   ├── uzklausos/       # Request creation and tracking
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Landing page
├── components/
│   ├── layout/          # Header, Footer, NotificationBell
│   └── ui/              # Reusable UI components
├── lib/
│   ├── auth.ts          # NextAuth configuration
│   ├── constants.ts     # Categories, cities, plan limits
│   ├── email.ts         # Email sending helpers
│   ├── prisma.ts        # Prisma client singleton
│   ├── utils.ts         # Utility functions
│   └── validations.ts   # Zod schemas
└── middleware.ts        # Route protection
```

## Deployment (Vercel)

1. Connect repository to Vercel
2. Set all environment variables
3. Deploy — `vercel.json` is pre-configured
4. Set up Stripe webhook with production URL

## Features

- Client request submission (no auth required)
- 3-step request form with review
- Request tracking via direct link
- Provider registration and profile management
- Provider dashboard with stats
- Request browsing with filters and pagination
- Response and messaging system
- Stripe subscription plans (FREE/BASIC/PRO)
- Admin panel (stats, provider management, request management)
- In-app notifications with bell dropdown
- Email notifications (Resend)
- Mobile-responsive design
- Dark mode support
- Lithuanian language UI
