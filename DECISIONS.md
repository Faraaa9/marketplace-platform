# Decisions Log

## 2026-04-07

### Stack
- **Next.js 14 App Router** — chosen for SSR, API routes, and middleware in one codebase
- **Prisma + PostgreSQL** — type-safe ORM, migrations, easy seeding
- **NextAuth Credentials** — simple JWT auth, no external OAuth needed for MVP
- **Stripe Checkout + Webhooks** — standard subscription flow, customer portal for management
- **Resend** — simple transactional email API (falls back to console.log if no key)
- **Tailwind CSS** — utility-first, mobile-first, dark mode support via class strategy

### Architecture
- Lithuanian UI language throughout (routes, labels, content)
- URL-encoded Lithuanian characters in routes (e.g., /tiekėjas/)
- Client requests work without auth — only email required
- Provider accounts require registration and admin activation
- Zod v4 used for validation (uses `.issues` instead of `.errors`)
- Stripe v22 — some types changed, used type assertions for compatibility

### Auth
- Credentials provider only (email + bcrypt password)
- JWT strategy with user.id and user.role in token
- Middleware protects /admin/*, /tiekėjas/*, /paskyra/* routes
- Registration auto-creates ProviderProfile for PROVIDER role

### Stripe Integration
- Two price tiers: BASIC (€29/mo) and PRO (€59/mo)
- Webhook handles: checkout.session.completed, subscription.deleted, invoice.payment_failed
- Price IDs configured via env variables
- Customer portal for subscription management

### Email
- Graceful degradation: if RESEND_API_KEY missing, logs to console
- Templates inline HTML (no react-email dependency needed for MVP)
- 5 email types: request confirmation, new response, new request alert, provider activated, subscription confirmation

### Safety
- All env variables have fallback behavior — app starts without crashing
- API routes validate with Zod schemas
- Admin routes verify ADMIN role server-side
- Provider routes verify PROVIDER role server-side
