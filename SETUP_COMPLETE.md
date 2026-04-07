# Setup Complete — PaslaugųRinka MVP

## What was built

### Pages (20 total)
- `/` — Landing page with hero, categories, stats, CTA
- `/prisijungti` — Login form
- `/registruotis` — Provider registration
- `/slaptazodis` — Forgot password form
- `/slaptazodis/reset` — Password reset form (with token)
- `/patvirtinti` — Email verification status page
- `/uzklausos/nauja` — 3-step request form (no auth needed)
- `/uzklausos/sekti/[id]` — Request tracking (no auth needed)
- `/paskyra/uzklausos` — Client's requests list
- `/tiekėjas` — Provider dashboard with stats + remaining responses
- `/tiekėjas/uzklausos` — Request browsing with filters
- `/tiekėjas/uzklausos/[id]` — Request detail + response form + messaging
- `/tiekėjas/profilis` — Profile editing with Cloudinary image upload
- `/tiekėjas/planai` — Subscription plans + Stripe checkout
- `/admin` — Admin dashboard with bar chart
- `/admin/tiekėjai` — Provider management with pagination
- `/admin/uzklausos` — Request management with pagination
- `/tiekejams` — Provider landing page
- `/privatumas` — Privacy policy
- `/kontaktai` — Contact page

### API Routes (20 total)
- `POST /api/auth/register` — Provider registration + email verification
- `GET/POST /api/auth/[...nextauth]` — NextAuth
- `POST /api/auth/forgot-password` — Send password reset email
- `POST /api/auth/reset-password` — Reset password with token
- `GET /api/auth/verify-email` — Verify email with token
- `POST /api/requests` — Create service request (rate limited, XSS sanitized)
- `GET /api/requests/[id]` — Get request details
- `POST /api/requests/[id]/messages` — Send message in thread (XSS sanitized)
- `GET /api/paskyra/uzklausos` — Client's requests
- `GET /api/tiekėjas/stats` — Provider statistics + remaining responses
- `GET /api/tiekėjas/uzklausos` — Browse requests (with filters)
- `GET/POST /api/tiekėjas/uzklausos/[id]` — Get request / submit response (plan limited, email verified)
- `GET/PUT /api/tiekėjas/profilis` — Get/update provider profile (XSS sanitized)
- `POST /api/provider/upload-image` — Upload image to Cloudinary
- `DELETE /api/provider/images/[publicId]` — Delete image from Cloudinary
- `POST /api/stripe/create-checkout` — Create Stripe checkout session
- `POST /api/stripe/webhook` — Stripe webhook handler
- `GET /api/stripe/portal` — Stripe customer portal
- `GET /api/admin/stats` — Admin statistics
- `GET/PATCH /api/admin/tiekėjai` — Admin provider management (paginated)
- `GET/PATCH /api/admin/uzklausos` — Admin request management (paginated)
- `GET/PATCH /api/notifications` — In-app notifications

### Production Hardening
- **PostgreSQL** — Migrated from SQLite with indexes on key fields
- **Rate Limiting** — In-memory limiter on request creation and auth endpoints
- **Security Headers** — X-Frame-Options, CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **Password Reset** — Secure token-based flow with 1-hour expiry, enumeration-resistant
- **Email Verification** — 24-hour token, blocks unverified providers from responding
- **Cloudinary Upload** — Drag-and-drop image upload, 5MB limit, max 5 images per provider
- **Plan Limits** — FREE: 3/mo, BASIC: 30/mo, PRO: unlimited responses enforced at API level
- **XSS Prevention** — HTML entity escaping on all user-submitted text fields
- **SEO** — generateMetadata on public pages, sitemap.ts, robots.ts, OpenGraph tags
- **Admin Pagination** — Server-side pagination on providers and requests admin pages

### Components
- 10 reusable UI components (Button, Input, Textarea, Select, Badge, Card, Modal, LoadingSpinner, EmptyState, Pagination)
- Layout components (Header with mobile menu, Footer, NotificationBell)
- Session provider wrapper

### Database
- 9 models: User, ProviderProfile, ServiceRequest, Response, Message, Subscription, Notification, PasswordResetToken, EmailVerificationToken
- Seed data: 1 admin, 3 providers, 5 sample requests
- Indexes on ServiceRequest (status, category, location), Response (providerId), Notification (userId, isRead)

## .env.local — Required Variables

```
DATABASE_URL=postgresql://user:password@host:5432/marketplace
NEXTAUTH_SECRET=<generate with: openssl rand -hex 32>
NEXTAUTH_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_BASIC_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
CLOUDINARY_CLOUD_NAME=<your cloud name>
CLOUDINARY_API_KEY=<your api key>
CLOUDINARY_API_SECRET=<your api secret>
RESEND_API_KEY=re_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Stripe Webhook Setup

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy signing secret to `STRIPE_WEBHOOK_SECRET`

For local testing:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Default Admin Credentials

- **Email:** admin@platform.lt
- **Password:** Admin123!

## Post-Setup Commands

```bash
# Push database schema
npx prisma db push

# Seed database
npm run db:seed

# Start dev server
npm run dev

# Build for production
npm run build
```
