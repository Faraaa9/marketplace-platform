# PaslaugųRinka Design System

This document is the strict visual contract for paslaugurinka.lt. It is based on
the current repository audit and should be used before changing any public,
provider, auth, admin, messaging, or request-tracking UI.

## Current Weakest Design Areas

1. **Fragmented visual language**
   - The product currently mixes a premium marketplace style, a paper-note
     request board, Stripe-like cards, Magic UI gradients, glass panels, and
     many hard-coded colors in individual pages.
   - Examples: `src/app/page.tsx`, `src/app/uzklausos/page.tsx`,
     `src/app/tiekejams/page.tsx`, `src/app/globals.css`, and messaging
     screens all use different card treatments, shadows, radii, and accent
     colors.
   - Risk: users move between pages that feel like separate products.

2. **Inconsistent typography hierarchy**
   - Tailwind defines semantic type tokens, but many screens use arbitrary
     `text-[...]`, mixed `font-serif`, display-scale headings inside compact
     contexts, and page-specific letter spacing.
   - The serif paper-board style is distinctive, but it is spreading into
     functional controls where the product should feel fast and operational.
   - Risk: headings, labels, metadata, and calls to action compete instead of
     forming a predictable scan path.

3. **Spacing and component density drift**
   - Repeated UI surfaces use `rounded-xl`, `rounded-2xl`, `rounded-3xl`, custom
     shadows, `p-4` through `p-12`, and page-specific layout widths without a
     clear system.
   - Cards frequently become the default page structure, while operational
     screens need tighter, quieter list and table layouts.
   - Risk: visual polish depends on each page author instead of shared defaults,
     and mobile screens can feel either cramped or over-padded.

## Brand Direction

PaslaugųRinka should feel clean, professional, trustworthy, Lithuanian, and
fast. The interface is a service marketplace, not a campaign microsite.

The default product feel is:

- Calm operational UI.
- Warm but not beige-heavy.
- Dense enough for repeated work.
- Clear hierarchy over decorative motion.
- Mobile-first touch ergonomics.
- Premium through restraint, alignment, and precise spacing.

## Non-Negotiable Rules

- Do not add new arbitrary hex colors in page or component JSX.
- Do not add new arbitrary font sizes unless extending Tailwind tokens first.
- Do not use `font-serif` in buttons, filters, tabs, form labels, navigation,
  metadata rows, tables, admin screens, messaging, or provider dashboards.
- Do not use cards as page sections. Cards are for repeated items, tool panels,
  dialogs, and grouped form surfaces.
- Do not nest cards inside cards.
- Do not introduce new decorative gradients, glows, glass effects, or animated
  flourishes without a clear product reason.
- All mobile touch targets must be at least 44 by 44 px.
- Use `next/image` for images. Do not add raw `<img>` tags.
- Interactive UI must stay fast: hover and active effects should be transform,
  color, opacity, shadow, or border only.

## Tokens

### Color

Use only these roles in product UI:

- `surface-0`: app background.
- `white`: elevated panels and cards in light mode.
- `surface-50`: subtle panel fill, skeletons, inactive controls.
- `surface-100`: stronger muted fill.
- `surface-200`: default borders.
- `surface-400`: placeholder and quiet metadata.
- `surface-500`: secondary text.
- `surface-700`: strong secondary text.
- `surface-900`: primary text and dark buttons.
- `brand-50`: soft brand background.
- `brand-100`: selected soft brand background.
- `brand-600`: primary action.
- `brand-700`: primary action hover.

Semantic status colors are allowed only through shared components:

- success: emerald
- warning: amber
- danger: red
- info: blue

Page-level JSX must use Tailwind tokens (`brand-*`, `surface-*`, semantic
status tokens), not raw hex values.

### Typography

Default font:

- Use `font-sans` everywhere unless explicitly allowed below.

Allowed type scale:

- Display: `text-display` or `text-display-xl`
  - Use only on public marketing heroes.
- Page title: `text-heading-1`
  - Use once per page view.
- Section title: `text-heading-2`
  - Use for major sections.
- Card title: `text-heading-3`
  - Use for cards, panels, and list group headings.
- Body: `text-body`
  - Use for primary readable text.
- Small body: `text-body-sm`
  - Use for compact descriptions, forms, and metadata groups.
- Caption: `text-caption`
  - Use for labels, badges, and helper text.
- Micro: `text-micro`
  - Use only for dense metadata, counters, and small badges.

Serif usage:

- `font-serif` is reserved for editorial article moments and the public request
  board visual concept.
- Do not use serif typography in reusable primitives or core app workflows.
- A page using serif must still keep buttons, filters, forms, and navigation in
  sans-serif.

### Spacing

Use this spacing rhythm:

- Page horizontal padding: `px-4 sm:px-6 lg:px-8`.
- Page top padding after header: `pt-8 sm:pt-10`.
- Major section vertical padding: `py-12 sm:py-16`.
- Dense operational section spacing: `space-y-4` or `gap-4`.
- Marketing section spacing: `space-y-6` or `gap-6`.
- Card padding:
  - Compact list card: `p-4`.
  - Standard panel/card: `p-5`.
  - Marketing card: `p-6`.
  - Avoid `p-8+` except for empty states and hero-adjacent CTA panels.

### Radius

Use only:

- Inputs, buttons, chips, small controls: `rounded-lg`.
- Standard cards and panels: `rounded-xl`.
- Modals and hero-adjacent feature panels: `rounded-2xl`.
- Avoid `rounded-3xl` and larger in product UI.
- `rounded-full` is allowed for avatars, pills, and icon dots only.

### Borders And Shadows

Default product surfaces:

- Border: `border border-surface-200/60 dark:border-surface-700/50`.
- Background: `bg-white dark:bg-surface-900/50`.
- Shadow: no shadow by default.

Allowed shadows:

- `shadow-soft`: elevated cards that need separation.
- `shadow-card`: hover state for clickable cards.
- `shadow-elevated`: dialogs, popovers, and sticky overlays only.

Do not use custom arbitrary shadow values in new JSX.

### Layout Widths

Use consistent containers:

- Reading or form flow: `max-w-3xl`.
- Operational list view: `max-w-5xl`.
- Standard marketplace page: `max-w-7xl`.
- Full-width app shell: only for admin, messaging, and split-pane workflows.

Do not create a new max width unless the layout has a specific, documented
reason.

## Component Rules

### Buttons

Use `src/components/ui/Button.tsx` for all `<button>` elements and button-like
actions where possible.

Rules:

- Primary action: `variant="primary"`.
- Secondary action: `variant="secondary"`.
- Neutral bordered action: `variant="outline"`.
- Low-emphasis icon or text action: `variant="ghost"`.
- Destructive action: `variant="danger"`.
- Default size must meet 44 px touch targets on mobile. If `size="sm"` is used,
  it must be inside a dense desktop-only context or have an alternate mobile
  size.

### Links That Look Like Buttons

If a `Link` visually behaves like a button, match the Button token exactly:

- `inline-flex items-center justify-center`
- minimum height `h-11` on mobile
- `rounded-lg` or `rounded-xl`
- same variant colors as `Button`

### Cards

Use `src/components/ui/Card.tsx` or match its token set.

Card rules:

- No page-section cards.
- No nested cards.
- Clickable cards may use `hover:shadow-card`.
- Avoid hover translate on dense operational lists unless it does not shift the
  perceived scan line.

### Badges And Chips

Use `src/components/ui/Badge.tsx` for statuses.

Rules:

- One primary status badge per row/card.
- Category chips should be quiet: `brand` or neutral, not multiple saturated
  colors.
- Competition, urgency, and ownership states must use semantic variants.

### Forms

Use shared form primitives (`Input`, `Textarea`, `Select`, `Button`) before
adding page-specific styling.

Rules:

- Labels use `text-body-sm font-medium`.
- Helper/error text uses `text-micro`.
- Inputs use `h-11` for mobile comfort unless the context is desktop-only.
- Error messages must be clear and safe.

### Navigation

Header and mobile navigation must remain visually stable across pages.

Rules:

- Header links use sans-serif.
- Active states should be explicit.
- Avoid large visual concepts inside the navigation bar.
- Keep mobile menu targets at least 44 px tall.

### Messaging And Provider Dashboards

These are operational surfaces.

Rules:

- Prefer dense list rows, split panes, and clear empty states.
- Use sans-serif only.
- Use restrained shadows.
- Keep colors functional: unread, selected, urgent, success, muted.
- Avoid marketing gradients, decorative note styles, and oversized cards.

## Page-Type Guidance

### Public Homepage

Allowed:

- One strong hero.
- One primary visual concept.
- `text-display` scale in the hero.
- Light motion if lazy-loaded and non-blocking.

Not allowed:

- Multiple competing decorative systems.
- Arbitrary one-off colors for every hero ornament.
- Cards inside cards.

### Request Board

The paper-note style may remain as a distinct acquisition surface, but it must
be contained.

Rules:

- Paper-note CSS stays scoped to request board/listing preview components.
- Controls, filters, search, pagination, and CTAs stay sans-serif.
- Any hard-coded paper palette should move into named CSS variables or Tailwind
  tokens before expansion.

### Provider App

Provider pages should feel like a fast work queue.

Rules:

- No hero-scale typography.
- No decorative gradients except small progress/status indicators.
- Prioritize scan speed: title, category, location, budget, competition,
  response state, CTA.

### Auth And Account

Rules:

- Keep layouts centered and calm.
- Use one icon or mark at most.
- Avoid heavy gradient cards.
- Prioritize trust, clarity, and form completion.

### Admin

Rules:

- Admin UI is utilitarian.
- Tables and lists should use compact spacing.
- Avoid marketing colors and shadows.
- Status colors must be semantic and consistent.

## Visual Polish Plan

### Phase 1: Token Cleanup

- Align `globals.css` CSS variables with `tailwind.config.ts` brand and surface
  tokens. The current `--brand` value differs from `brand-600`, which creates
  split accent behavior.
- Replace new or recently touched raw hex classes with Tailwind tokens.
- Add lint or review rule: arbitrary hex in JSX requires design-system approval.
- Update `themeColor` in `src/app/layout.tsx` to the active brand token instead
  of the current purple value.

### Phase 2: Typography Reset

- Replace arbitrary text sizes with semantic Tailwind tokens in shared
  primitives first.
- Remove `font-serif` from request board controls, pagination, buttons, and
  filter UI while keeping it for note titles/body where appropriate.
- Normalize page headings:
  - one `text-heading-1` page title
  - `text-heading-2` for sections
  - `text-heading-3` for panels/cards

### Phase 3: Surface And Spacing Standardization

- Update `Card`, `Button`, `Badge`, `Input`, `Textarea`, `Select`, `EmptyState`,
  `Skeleton`, and modal primitives to encode this document.
- Convert repeated hand-authored cards in provider, account, and admin screens
  to shared primitives or identical class recipes.
- Reduce `rounded-3xl`, heavy shadows, and arbitrary hover translations in
  operational screens.

### Phase 4: Page-by-Page Polish

Recommended order:

1. Provider inbox and request workflow.
   - Highest repeated-use value.
   - Tighten list hierarchy, selected states, empty states, and CTAs.
2. Public request board.
   - Keep the distinctive note concept but make controls, spacing, and tokens
     strict.
3. Homepage and provider marketing page.
   - Reduce competing decorations and normalize cards/sections.
4. Auth, account, and admin pages.
   - Apply primitives, spacing, and semantic statuses.

### Phase 5: Verification

For every visual polish PR:

- Check mobile width at 375 px and desktop at 1440 px.
- Verify no text overlaps or clips.
- Verify all touch targets are at least 44 px on mobile.
- Run `npm run build`.
- For interactive pages, verify the main workflow still works after styling
  changes.

## Review Checklist

- Uses shared primitives before page-specific classes.
- No new raw hex colors in JSX.
- No new arbitrary text sizes in JSX.
- No serif typography in operational controls.
- Cards are not used as page sections.
- No nested cards.
- Mobile touch targets are at least 44 px.
- Visual state is clear for hover, focus, active, selected, disabled, loading,
  empty, and error states.
- Prisma, auth, and functionality remain untouched unless the task requires it.
