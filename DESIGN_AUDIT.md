# Frontend Design Audit — paslaugurinka.lt

Read-only audit of the entire frontend (`src/`, 247 `.tsx` files). No code was changed; this document is the only new file.

Date: 2026-06-12 · Branch: `feat/routing-review-queue-schema`

## Foundation (reference for all sections)

- **Design tokens** live in [`tailwind.config.ts`](tailwind.config.ts):
  - `brand` = terracotta scale (`#c25e3a` family), `tailwind.config.ts:14-26`
  - `surface` = warm cream/taupe neutrals (`#ece9e2` → `#1a1813`), `tailwind.config.ts:28-41`
  - Fonts: `sans` = Inter stack (`:44-52`), `serif` = `var(--font-serif)` + Georgia fallback (`:53-59`)
  - Type scale `fontSize` (`:61-72`), `boxShadow` xs/soft/card/elevated/stripe/glow (`:73-82`), `borderRadius` 2xl/3xl/4xl (`:83-87`)
- **Global CSS** lives in [`src/app/globals.css`](src/app/globals.css): CSS custom props (`:6-39`), component classes (`.card-stripe`, `.layout-grid`, `.glass`, `.bg-grid`), and the entire **paper-note / pin / polaroid / found-stamp** system for the Užklausų lenta (`:243-593`).
- **Fonts loaded** in [`src/app/layout.tsx:3`](src/app/layout.tsx#L3): only **Inter** (`display:"optional"`, applied globally to `<body>`) and **Lora** (`display:"swap"`, `variable:"--font-serif"`, `preload:false`). `src/app/fonts/GeistVF.woff` / `GeistMonoVF.woff` exist but are **not imported anywhere** (orphaned).
- **Two parallel styling systems coexist:** (1) a token-based system via the shared primitives in `src/components/ui/` (`Button`, `Card`, `EmptyState`, `Badge`…), used mostly by admin, the provider dashboard, account, and auth; and (2) a large set of **bespoke, hardcoded-hex** surfaces (homepage, landing, Užklausų lenta, Meistrai listings, chat/inbox) that do not consume the primitives or tokens.

---

## Section 1 — Styling approach & hardcoded values

### 1.1 Where the system is defined

| Concern | Defined in | Notes |
|---|---|---|
| Colors | `tailwind.config.ts:12-41` (+ `globals.css:6-39` CSS vars) | `brand` + `surface` scales; CSS vars duplicate some (`--brand:#c29b74` differs from `brand-*`) |
| Spacing | Tailwind defaults (no custom scale) | Arbitrary `px`/`rem`/`vh` values used ad hoc instead |
| Fonts | `tailwind.config.ts:43-60` + `layout.tsx:24-38` | Inter + Lora only |
| Radii | `tailwind.config.ts:83-87` | 2xl/3xl/4xl extensions; components still use `rounded-[28px]` etc. |
| Shadows | `tailwind.config.ts:73-82` | 7 named shadows; many components hardcode `shadow-[…rgba…]` instead |

### 1.2 Hardcoded color literals in TSX/TS (hex / rgb / rgba)

~168 hex literals and ~77 `rgb/rgba` literals across source (outside `globals.css`/`tailwind.config.ts`). Worst offenders:

| File | Approx. count | Representative lines |
|---|---|---|
| [`src/app/chat-preview/page.tsx`](src/app/chat-preview/page.tsx) | ~56 hex | `#D38331` (`:20`), `#B58E74` (`:29`), `#A36545` (`:90`), `#EFE7DB`/`#6F6258` (`:92`), `#DDD3C5`/`#FFFDF8` (`:151-159`) |
| [`src/app/uzklausos/page.tsx`](src/app/uzklausos/page.tsx) | ~19 hex | competition-badge palette `#e6ecd9`/`#5c6d3b` (`:310`), `#896224`/`#d8bd80` (`:322`), `#6f6042`/`#d3c6a2` (`:441`) |
| [`src/components/uzklausos-v2/InlineListingCard.tsx`](src/components/uzklausos-v2/InlineListingCard.tsx) | ~16 hex | `#ebe2cb`/`#6f6042`/`#d3c6a2` (`:242`), `#9b8a5f` (`:257`), `#cdbe8f` (`:273`) |
| [`src/app/page.tsx`](src/app/page.tsx) | ~8 hex | hero accent purples/greens not in palette: `#E1DAEC`/`#CABFE0`/`#7C6AA6` (`:233-234`), `#F6F1E6` (`:215`) |
| [`src/app/tiekejas/zinutes/ProviderInboxClient.tsx`](src/app/tiekejas/zinutes/ProviderInboxClient.tsx) | ~6 hex | mixes external `#111827` (`:803`) with brand `#1E1B18`/`#C29B74`/`#faeee7` (`:803-887`) |
| [`src/app/tiekejas/zinutes/[id]/ThreadView.tsx`](src/app/tiekejas/zinutes/[id]/ThreadView.tsx) | ~6 hex | warm-hex inbox palette |
| [`src/components/messaging/ThreadChat.tsx`](src/components/messaging/ThreadChat.tsx) | ~20 (hex + rgba) | warm-brown shadow tint `rgba(93,70,54,…)`, bubble hexes via inline style |
| [`src/components/marketing/HeroSearch.tsx`](src/components/marketing/HeroSearch.tsx) | ~12 rgba/hex | `#FBFAF6`, `#C25E3A`, `#F1EDE4`, gradient overlays `rgba(40,35,30,…)` |

**Palette duplication (literals that re-state an existing token):** `#C29B74`, `#6F6258`, `#1E1B18`, `#ece9e2`, `#fbfaf6`, `#d8cda6`, `#ebe2cb`, `#6f6042` each recur in 4-6+ files but are not tokenized. **External colors not in the palette at all:** `#111827`, `#0F172A`, `#475569` (Tailwind-default slate) appear in the inbox/chat files.

### 1.3 Inline styles (`style={{…}}`)

~32 usages. **Justified/dynamic** (computed value — keep): progress-bar widths `style={{ width: `${pct}%` }}` ([`ProfileForm.tsx:250`](src/app/paskyra/profilis/ProfileForm.tsx#L250), [`tiekejas/profilis/page.tsx:490,892`](src/app/tiekejas/profilis/page.tsx#L490), [`ProfileCompletenessCard.tsx:68`](src/app/tiekejas/sections/ProfileCompletenessCard.tsx#L68)); random photo tilt [`PinnedRequestPhotos.tsx:68,89`](src/components/requests/PinnedRequestPhotos.tsx#L68); magicui CSS-var animation params ([`marquee.tsx:33`](src/components/magicui/marquee.tsx#L33), [`border-beam.tsx:26,38`](src/components/magicui/border-beam.tsx#L26), [`magic-card.tsx:43`](src/components/magicui/magic-card.tsx#L43)); chat bubble colors from constants ([`ThreadChat.tsx:719,770`](src/components/messaging/ThreadChat.tsx#L719)); admin particle positions ([`admin/page.tsx:194,201,409`](src/app/admin/page.tsx#L194)).

**Static values that should be classes:** animation delays hardcoded inline — [`kontaktai/AIProfileSetup.tsx:447-449`](src/app/kontaktai/AIProfileSetup.tsx#L447) (`"0ms"/"150ms"/"300ms"`) and [`tiekejams/page.tsx:295,299,303`](src/app/tiekejams/page.tsx#L295); static absolute positions/transforms [`page.tsx:232,237,245`](src/app/page.tsx#L232); footer `clipPath` polygon [`Footer.tsx:28`](src/components/layout/Footer.tsx#L28).

### 1.4 Arbitrary Tailwind values (bracket notation)

~256 instances. **Arbitrary colors** (`bg-[#…]`, `text-[#…]`, `ring-[#…]`) concentrate in the same worst-offender files: [`chat-preview/page.tsx`](src/app/chat-preview/page.tsx) (~57), [`uzklausos/page.tsx`](src/app/uzklausos/page.tsx) (~20), [`page.tsx`](src/app/page.tsx) (~18), [`InlineListingCard.tsx`](src/components/uzklausos-v2/InlineListingCard.tsx) (~16), [`ProviderInboxClient.tsx`](src/app/tiekejas/zinutes/ProviderInboxClient.tsx) (~12).

**Arbitrary sizes/spacing bypassing the scale:**
- Font sizes off-scale: `text-[13px]`/`text-[15px]`/`text-[11px]`/`text-[10px]` (40+/30+/20+/15+ uses), `text-[0.78rem]`, `text-[0.92rem]`, `text-[2.35rem]` ([`uzklausos/page.tsx:356,441,477`](src/app/uzklausos/page.tsx#L356), [`ListingPreview.tsx:57,65,76,108`](src/components/requests/ListingPreview.tsx#L57))
- Viewport heights: `h-[85vh]`/`max-h-[72vh]` ([`RequestFilterBar.tsx:211,232`](src/components/uzklausos/RequestFilterBar.tsx#L211)), `max-h-[70vh]` ([`MultiStoryViewer.tsx:192`](src/components/stories/MultiStoryViewer.tsx#L192))
- Custom radii: `rounded-[28px]`/`rounded-[1.75rem]` ([`ProviderListingClient.tsx:764`](src/components/tiekejai/ProviderListingClient.tsx#L764))
- Custom shadows inline: `shadow-[0_2.5px_0_#793821]` ([`uzklausos/page.tsx:338`](src/app/uzklausos/page.tsx#L338)) and 50+ other `shadow-[…rgba…]` recipes

**Worst-offender summary (most style-saturated files):**
1. [`src/app/chat-preview/page.tsx`](src/app/chat-preview/page.tsx) — ~113 hardcoded/arbitrary values
2. [`src/app/uzklausos/page.tsx`](src/app/uzklausos/page.tsx) — ~39
3. [`src/components/uzklausos-v2/InlineListingCard.tsx`](src/components/uzklausos-v2/InlineListingCard.tsx) — ~32
4. [`src/components/tiekejai/ProviderListingClient.tsx`](src/components/tiekejai/ProviderListingClient.tsx) — ~30
5. [`src/app/page.tsx`](src/app/page.tsx) — ~26
6. [`src/components/marketing/HeroSearch.tsx`](src/components/marketing/HeroSearch.tsx) — ~25
7. [`src/components/messaging/ThreadChat.tsx`](src/components/messaging/ThreadChat.tsx) — ~20
8. [`src/app/tiekejas/zinutes/ProviderInboxClient.tsx`](src/app/tiekejas/zinutes/ProviderInboxClient.tsx) — ~18

---

## Section 2 — Button variants

### 2.1 Shared primitive

[`src/components/ui/Button.tsx`](src/components/ui/Button.tsx) — 5 variants × 3 sizes:

| Variant | Background | Text | Defined at |
|---|---|---|---|
| primary | `bg-brand-600` (terracotta) → hover `brand-700` | white | `Button.tsx:16-17` |
| secondary | `bg-surface-100` (taupe) | `surface-800` | `Button.tsx:18-19` |
| outline | transparent + `border-surface-200` | `surface-700` | `Button.tsx:20-21` |
| ghost | transparent | `surface-600` | `Button.tsx:22-23` |
| danger | `bg-red-600` | white | `Button.tsx:24-25` |

Sizes: `sm` → `h-8 px-3 rounded-lg`, `md` → `h-10 px-4 rounded-xl`, `lg` → `h-12 px-6 rounded-xl` (`Button.tsx:28-32`). A second primitive, [`interactive-hover-button.tsx:20-36`](src/components/magicui/interactive-hover-button.tsx#L20) (white → slides to `surface-800` on hover, `rounded-xl`), is used on Meistrai contact CTAs.

### 2.2 Variant catalog (distinct stylings)

| File:line | Area | Label | Background | Text | Radius | Padding | Notes |
|---|---|---|---|---|---|---|---|
| [`ui/Button.tsx:16`](src/components/ui/Button.tsx#L16) | shared | — | `bg-brand-600` | white | `rounded-xl` | `h-10 px-4` | **primary** |
| [`page.tsx:558`](src/app/page.tsx#L558) | homepage | "Pateikti užklausą" | `bg-[#ECE9E2]` cream | `#26231F` | `rounded-full` | `px-7 py-3.5` | bespoke — not brand |
| [`page.tsx:413`](src/app/page.tsx#L413) | homepage | "Visos užklausos" | `bg-[#FBFAF6]` + border | `#26231F` | `rounded-full` | `px-5 py-2.5` | bespoke outline |
| [`Header.tsx:81`](src/components/layout/Header.tsx#L81) | global header | signup CTA | `bg-[#2A2723]` charcoal | `#F2EFE8` | `rounded-full` | `px-4 py-2` | bespoke charcoal pill |
| [`ServiceLanding.tsx:178`](src/components/landing/ServiceLanding.tsx#L178) | landing | request CTA | `bg-brand-600` | white | `rounded-xl` | `px-6 py-3` | hand-rolled primary (duplicates token) |
| [`ServiceLanding.tsx:182`](src/components/landing/ServiceLanding.tsx#L182) | landing | browse | `bg-white` + border | `surface-800` | `rounded-xl` | `px-6 py-3` | outline-like |
| [`ServiceLanding.tsx:385`](src/components/landing/ServiceLanding.tsx#L385) | landing (dark) | request CTA | `bg-white` | `text-brand-700` | `rounded-xl` | `px-7 py-3` | inverted |
| [`uzklausos/page.tsx:519`](src/app/uzklausos/page.tsx#L519) | request board | **"Pateikti pasiūlymą"** | **rotates `brand-600`/`#6f7d4d`/`#a17b44`** | white | `rounded-lg` | `px-4 py-2` | **THE BUG (see 2.3)** |
| [`uzklausos/page.tsx:519`](src/app/uzklausos/page.tsx#L519) | request board | "Valdyti užklausą" (own) | `bg-[#ebe3cc]` | `#6c5d3c` | `rounded-lg` | `px-4 py-2` | fixed taupe |
| [`uzklausos/page.tsx:515`](src/app/uzklausos/page.tsx#L515) | request board | "Pasiūlymai nepriimami" | `bg-[#ece6d7]` | `#9b8f76` | `rounded-lg` | `px-4 py-2` | disabled |
| [`uzklausos/page.tsx:569`](src/app/uzklausos/page.tsx#L569) | board empty | "Tapti tiekėju" | `bg-brand-600` + `shadow-[0_2.5px_0_#793821]` | white | `rounded-lg` | `px-6 py-2.5` | paper-note style |
| [`InlineListingCard.tsx:455`](src/components/uzklausos-v2/InlineListingCard.tsx#L455) | board v2 | "Tvarkyti aprašymą su AI" | **random `#A84E2E`/`#6E813F`/`#A0834F`** | white | `rounded-md` | `px-4 py-2` | **same anti-pattern, random** |
| [`DirectInquiryWidget.tsx:578`](src/app/meistrai/[slug]/components/DirectInquiryWidget.tsx#L578) | Meistrai profile | "Rašyti žinutę" | InteractiveHoverButton (white→charcoal) | surface-700 | `rounded-xl` | `h-10 px-5` | shared hover button |
| [`DirectInquiryWidget.tsx:521`](src/app/meistrai/[slug]/components/DirectInquiryWidget.tsx#L521) | inquiry form | submit | `<Button>` primary (sm) | white | `rounded-lg` | `h-8 px-3` | shared |
| [`tiekejas/planai/page.tsx:167`](src/app/tiekejas/planai/page.tsx#L167) | credits | "Pirkti" | `<Button>` primary | white | `rounded-xl` | md | shared |
| [`UnlockCard.tsx:107`](src/app/tiekejas/uzklausa/[id]/UnlockCard.tsx#L107) | lead unlock | "Atrakinti" | `<Button>` primary | white | `rounded-xl` | md | shared |
| [`prisijungti/page.tsx:212`](src/app/(auth)/prisijungti/page.tsx#L212) | auth | "Prisijungti" | `<Button>` primary `w-full` | white | `rounded-xl` | md | shared |
| [`ThreadChat.tsx:875`](src/components/messaging/ThreadChat.tsx#L875) | chat | send (icon) | `bg-[#E6D9C7]`→`#A7826D` | `#7B5D49`→white | `rounded-xl` | `h-10 w-10` | bespoke warm |
| [`ThreadChat.tsx:658`](src/components/messaging/ThreadChat.tsx#L658) | chat | quick action | `bg-[#FFFDF8]` + border | `#6F5646` | `rounded-full` | `px-4` | bespoke pill |

(Provider dashboard, account, and auth forms consistently use the shared `<Button>` — primary `rounded-xl` terracotta; outline/ghost for secondary actions. Full list above is representative of each distinct styling, not every instance.)

### 2.3 The color bug — root cause (DEFINITIVE)

**"Pateikti pasiūlymą" has no fixed color. Its background is chosen by the card's list index, cycling terracotta → olive → gold. This is deliberate code, not a one-off.**

The board defines a 3-tone rotation array ([`uzklausos/page.tsx:337-341`](src/app/uzklausos/page.tsx#L337)):

```
const CTA_TONES = [
  "bg-brand-600 hover:bg-brand-700 shadow-[0_2.5px_0_#793821]",   // [0] TERRACOTTA
  "bg-[#6f7d4d] hover:bg-[#616d43] shadow-[0_2.5px_0_#4a5430]",   // [1] OLIVE GREEN
  "bg-[#a17b44] hover:bg-[#8c6a3b] shadow-[0_2.5px_0_#6b5028]",   // [2] GOLD/OCHRE
];
```

The tone is selected by the map index `i` ([`uzklausos/page.tsx:425-428`](src/app/uzklausos/page.tsx#L425), `i` from `.map((r, i) => …)` at `:413`), and applied to the `<Link>` at `:519-525`:

```
const ctaTone = isOwnRequest
  ? "bg-[#ebe3cc] text-[#6c5d3c] …"
  : `text-white ${CTA_TONES[i % CTA_TONES.length]}`;
```

So `CTA_TONES[i % 3]` makes card 0 terracotta, card 1 **olive green** (`#6f7d4d`), card 2 gold, repeating — the label and `href` are identical; only `ctaTone` differs by position. **That index rotation is the entire cause** of the same action rendering terracotta on one card and olive on the next.

**A second instance of the same anti-pattern:** [`InlineListingCard.tsx:33-37`](src/components/uzklausos-v2/InlineListingCard.tsx#L33) defines an identical terracotta/olive/gold triad `AI_BUTTON_VARIANTS` (`#A84E2E`/`#6E813F`/`#A0834F`), picked with `Math.random()` per mount (`:138-140`) for the "Tvarkyti aprašymą su AI" button (`:455-474`) — so that button changes color on every page visit. Other green hits in the repo (`#5c6d3b` competition chip `:310`, `emerald-500` trust icons) are semantic, not CTAs.

---

## Section 3 — Card patterns

### 3.1 Shared `Card` primitive

[`src/components/ui/Card.tsx:13`](src/components/ui/Card.tsx#L13): `rounded-2xl border border-surface-200/60 bg-white p-6 shadow-soft` (+ dark variants); optional `hover` → `hover:shadow-card`. Imported by **~20 files** — all in admin, provider-dashboard `sections/`, and provider request/thread detail. The big public-facing card families (Meistrai listings, Užklausų lenta, chat) import it **zero** times.

### 3.2 Inventory

| File:line | What it is | Background | Border | Radius | Shadow | Padding |
|---|---|---|---|---|---|---|
| [`ui/Card.tsx:13`](src/components/ui/Card.tsx#L13) | shared primitive | `bg-white` | `border-surface-200/60` | `rounded-2xl` | `shadow-soft` | `p-6` |
| [`StatsGrid.tsx:169`](src/app/tiekejas/sections/StatsGrid.tsx#L169) | dashboard "today" shell | `bg-white` | `border-surface-200/60` | `rounded-2xl` | `shadow-soft` | `p-5 sm:p-6` |
| [`StatsGrid.tsx:278`](src/app/tiekejas/sections/StatsGrid.tsx#L278) | metric tile | `bg-surface-50/70` | `border-surface-200/70` | `rounded-xl` | none | `p-3` |
| [`AccountCard.tsx:99`](src/app/tiekejas/sections/AccountCard.tsx#L99) | pending-claim alert | `bg-amber-50` | `border-amber-200/60` | `rounded-2xl` | none | `p-5` |
| [`admin/page.tsx:321`](src/app/admin/page.tsx#L321) | stat card | `<Card>` | inherited | `rounded-2xl` | `shadow-soft` | `p-6` |
| [`admin/page.tsx:369`](src/app/admin/page.tsx#L369) | inner sub-tile | `bg-surface-50` | `border-surface-200/60` | `rounded-xl` | none | `p-3` |
| [`MarketplaceIntelligenceCard.tsx:54`](src/app/admin/MarketplaceIntelligenceCard.tsx#L54) | inner panel | transparent | `border-surface-200` | `rounded-lg` | none | `p-4` |
| [`ProviderListingClient.tsx:644`](src/components/tiekejai/ProviderListingClient.tsx#L644) | **provider list-row** | `bg-white` | `ring-1 ring-black/[0.06]` | `rounded-2xl` | hardcoded `shadow-[…]` | `p-3` |
| [`ProviderListingClient.tsx:764`](src/components/tiekejai/ProviderListingClient.tsx#L764) | **provider grid card** | `bg-white` | `ring-1 ring-black/[0.06]` | `rounded-[28px]` | hardcoded `shadow-[…]` | `0` (image bleed) |
| [`uzklausos/page.tsx:431`](src/app/uzklausos/page.tsx#L431) | **request card (paper-note)** | `.paper-note__sheet` → `#fbfaf6` | none (torn SVG mask) | torn mask (no radius) | `.paper-note__shadow` drop-shadow | `px-6 pb-8 pt-8` |
| [`InlineListingCard.tsx:224`](src/components/uzklausos-v2/InlineListingCard.tsx#L224) | editable request (paper-note) | `.paper-note__sheet` | none (mask) | torn mask | drop-shadow | `px-6 pb-9 pt-11` |
| [`SentInquiriesView.tsx:175`](src/app/paskyra/zinutes/SentInquiriesView.tsx#L175) | **sent-inquiry row** | `bg-white` | bare `border` (default gray) | `rounded-2xl` | `hover:shadow-md` | `p-4 sm:p-5` |
| [`ProviderInboxClient.tsx:718`](src/app/tiekejas/zinutes/ProviderInboxClient.tsx#L718) | **inbox shell** | `bg-[#FFFDF8]` | `border-[#DDD3C5]` | `rounded-2xl` | `shadow-[0_12px_40px_rgba(93,70,54,0.10)]` | `0` |
| [`ProviderInboxClient.tsx:785`](src/app/tiekejas/zinutes/ProviderInboxClient.tsx#L785) | inbox conversation row | `bg-[#FFFDF8]`, sel. `#F1E7DA` | `border-b border-[#DDD3C5]` | `rounded-xl` (sel.) | sel. `shadow-[…]` | `px-3 py-3.5` |
| [`ConversationList.tsx:276`](src/app/tiekejas/zinutes/ConversationList.tsx#L276) | conversation row (alt) | `bg-white`, hover `#faeee7` | `border-b border-[#EAEAEA]` | none | none | row padding |
| [`ThreadChat.tsx:758`](src/components/messaging/ThreadChat.tsx#L758) | **message bubble** | inline `#8A6653`/`#F1ECE4`/`#FEF2F2` | inline `#7B5D49`/… | `rounded-2xl` + asymmetric tail | hardcoded `shadow-[…rgba(93,70,54)…]` | `px-4 py-2.5` |
| [`ThreadChat.tsx:817`](src/components/messaging/ThreadChat.tsx#L817) | chat composer | `bg-[#EFE4D5]` | `border-[#E1D4C4]` | `rounded-2xl` | `shadow-[0_16px_34px_rgba(93,70,54,0.12)]` | `p-3` |

### 3.3 Structural & stylistic differences

- **Shared vs bespoke:** only admin + dashboard helpers consume `<Card>`. The three most-visible families (Meistrai cards, request board, chat/inbox) are entirely bespoke. Even `StatsGrid.tsx:169` and `ProfileCompletenessCard.tsx:50` **copy-paste the primitive's class string inline** instead of importing it.
- **Radius spans four values:** `rounded-2xl` (house default) vs `rounded-[28px]` (Meistrai grid + empty state, `ProviderListingClient.tsx:764,884`) vs `rounded-xl` (inner tiles, inbox rows) vs `rounded-lg` (admin panels) vs **no radius** (paper-note cards use an SVG torn-edge mask).
- **Shadow is the least consistent dimension:** token `shadow-soft`/`shadow-card` vs Tailwind `hover:shadow-md` (sent-inquiry rows) vs three different hardcoded `shadow-[…rgba…]` recipes (provider cards, chat bubbles, inbox), the chat cluster using a warm-brown `rgba(93,70,54,…)` tint found nowhere else; several cards carry no shadow.
- **Border vs ring vs mask:** token `border-surface-200/60` vs `ring-1 ring-black/[0.06]` (Meistrai) vs hardcoded hex borders `#DDD3C5`/`#EAEAEA`/`#E1D4C4` (chat/inbox) vs no border (paper-note).
- **Backgrounds:** token cards stay `bg-white`/`bg-surface-50`; the two themed surfaces bake hardcoded hex (`#fbfaf6` paper, `#FFFDF8`/`#F1E7DA`/`#EFE4D5`/`#8A6653` chat). The chat/inbox surface reuses the board's **warm hex palette but stays sans-serif** — effectively a third visual treatment.

---

## Section 4 — Fonts

### 4.1 Setup

Loaded via `next/font/google` in [`layout.tsx:3`](src/app/layout.tsx#L3) — **two families only:**
- **Inter** (`layout.tsx:24-28`): `display:"optional"`, applied globally via `inter.className` on `<body>` (`:83`). This is the app default — no per-component `font-sans` needed.
- **Lora** (the serif) (`layout.tsx:33-38`): `display:"swap"`, `variable:"--font-serif"`, `preload:false`. Comment at `:30-32` calls it "a decorative serif used on a handful of pages (uzklausos listing cards etc.)." Wired as a **CSS variable only** via `lora.variable` on `<body>` (`:83`), never as a default class.
- **Orphans:** `src/app/fonts/GeistVF.woff` + `GeistMonoVF.woff` exist but are imported nowhere. Georgia/Cambria/Times are fallbacks only (no font files).
- **Tailwind binding** (`tailwind.config.ts:43-60`): `font-serif` → `var(--font-serif)` → Lora. `font-mono` is undefined in config; its one use ([`admin/ai/page.tsx:493`](src/app/admin/ai/page.tsx#L493)) falls back to browser mono.

### 4.2 `font-serif` usages — all inside the Užklausų-lenta ecosystem

There are **no `font-serif` usages anywhere else in the app**:
- [`app/uzklausos/page.tsx`](src/app/uzklausos/page.tsx) — 13 hits: H1 `:356`, italic subtitle `:359`, card title `:464`, category chip `:441`, CTA/pagination buttons `:515,521,562,569,588,593,599,620`, empty heading `:611`
- [`InlineListingCard.tsx`](src/components/uzklausos-v2/InlineListingCard.tsx) — chips `:239,269`, title `<h3>` + input `:295,303`
- [`ListingPreview.tsx`](src/components/requests/ListingPreview.tsx) — chip `:57`, title `:65`
- [`PinnedRequestPhotos.tsx:92`](src/components/requests/PinnedRequestPhotos.tsx#L92) — "+N" polaroid label
- [`RequestFilterBar.tsx:314`](src/components/uzklausos/RequestFilterBar.tsx#L314) — board filter pills

### 4.3 Why the Užklausų lenta looks different (exact files/styles)

Three independent layers, all confined to `app/uzklausos/**` + `components/requests|uzklausos-v2/**`:

**(a) The serif font, opted-in per node via `font-serif`.** Because Lora is only a CSS variable (not a default), the board sets `font-serif` explicitly on every text node — exactly the files in 4.2. The rest of the app never sets it, so it stays Inter. That single class is the entire serif/sans split.

**(b) The paper-texture CSS in [`globals.css`](src/app/globals.css):**
- `.paper-note` `:246-248`; `.paper-note__shadow` `:252-256`; **`.paper-note__sheet` `:259-274`** — the `#fbfaf6` sheet with the **torn-bottom-edge `mask`/`-webkit-mask` SVG zig-zag** (data-URI path at `:264,267`)
- **`.pin` (brass thumbtack) `:277-297`** — radial-gradient aged-brass disc + highlight
- **`.found-stamp` (rotated "Tiekėjas rastas" rubber stamp) `:304-358`** — `rotate(-13deg)`, terracotta `#c0744f` border
- **`.polaroid*` family `:364-443`** + a `html[data-density="compact"]` override block `:446-593`

Applied by: [`uzklausos/page.tsx`](src/app/uzklausos/page.tsx) (`paper-note uzklausa-card` `:431`, `__shadow` `:432`, `__sheet` `:433`, `found-stamp` `:532-534`, `pin` `:538,578,628`); [`InlineListingCard.tsx`](src/components/uzklausos-v2/InlineListingCard.tsx) (`:224,225,229,537,538`); [`ListingPreview.tsx`](src/components/requests/ListingPreview.tsx) (`:49,50,51,134,135`); [`PinnedRequestPhotos.tsx`](src/components/requests/PinnedRequestPhotos.tsx) (`polaroid*` `:60,67,70,71,88,91,92`).

**(c) The serif binding** traces `font-serif` → `var(--font-serif)` (`tailwind.config.ts:54`) → `lora.variable` on `<body>` (`layout.tsx:36,83`) → Lora (`display:"swap"`, `preload:false`). Because Lora isn't preloaded, the board can briefly flash Georgia before Lora swaps in.

**Net:** the board's distinct look = explicit `font-serif`→Lora in 5 files + the `.paper-note*`/`.pin`/`.found-stamp`/`.polaroid*` CSS (`globals.css:243-593`) applied by 4 TSX files + hardcoded warm hexes baked into those classes (`#fbfaf6`, brass pins, `#c0744f` stamp). Nothing outside that ecosystem references these classes or `font-serif`.

---

## Section 5 — Empty / zero states

### 5.1 Uses of the shared `EmptyState`

[`EmptyState.tsx`](src/components/ui/EmptyState.tsx) = icon in a `#F4EFE6` circle (`:15`) + title + optional description + optional `action`.

| Context | file:line | title | action? |
|---|---|---|---|
| Guest token chat — not found | [`TokenClient.tsx:109`](src/app/zinutes/[token]/TokenClient.tsx#L109) | "Pokalbis nerastas" | — |
| Account → my requests, zero | [`MyRequestsList.tsx:88`](src/app/paskyra/uzklausos/MyRequestsList.tsx#L88) | "Neturite užklausų" | **"Pateikti užklausą"** → /uzklausos/nauja |
| Account → sent inquiries | [`SentInquiriesView.tsx:155`](src/app/paskyra/zinutes/SentInquiriesView.tsx#L155) | "Neperskaitytų atsakymų nėra" / "Dar nesate išsiuntę žinučių" | — |
| Tracker → not found | [`not-found.tsx:6`](src/app/uzklausos/sekti/[id]/not-found.tsx#L6) | "Užklausa nerasta" | — |
| Tracker → zero proposals | [`ProposalsClient.tsx:247`](src/app/uzklausos/sekti/[id]/ProposalsClient.tsx#L247) | "Kol kas pasiūlymų nėra" | (sibling grid, not `action`) |
| Request edit — load error | [`redaguoti/page.tsx:214`](src/app/uzklausos/sekti/[id]/redaguoti/page.tsx#L214) | "Užklausa nerasta" | — (description = raw `{loadError}`) |
| Provider thread — not found | [`ThreadView.tsx:117`](src/app/tiekejas/zinutes/[id]/ThreadView.tsx#L117) | "Pokalbis nerastas" | — |
| Provider inbox — empty | [`ProviderInboxClient.tsx:773`](src/app/tiekejas/zinutes/ProviderInboxClient.tsx#L773) | "Žinučių dar nėra" | — |
| Provider inbox — search miss | [`ProviderInboxClient.tsx:775`](src/app/tiekejas/zinutes/ProviderInboxClient.tsx#L775) | "Pokalbių nerasta" | — |
| Conversation list — filtered | [`ConversationList.tsx:245`](src/app/tiekejas/zinutes/ConversationList.tsx#L245) | "Archyve tuščia" / "Neperskaitytų žinučių nėra" / "Žinučių dar nėra" | — |

**Only 1 of these (MyRequestsList) passes an `action` CTA.**

### 5.2 Bespoke empty states (NOT shared)

| Context | file:line | What renders |
|---|---|---|
| Request board — no results | [`uzklausos/page.tsx:551`](src/app/uzklausos/page.tsx#L551) | themed paper-note card: Search icon + serif heading + sub-text + CTA ("Išvalyti filtrus" / "Tapti tiekėju") |
| Account requests — filtered tab | [`MyRequestsList.tsx:144`](src/app/paskyra/uzklausos/MyRequestsList.tsx#L144) | dashed card, **bare text** "Šioje kategorijoje užklausų nėra"; no icon/CTA |
| Tracker — all answered | [`ProposalsClient.tsx:308`](src/app/uzklausos/sekti/[id]/ProposalsClient.tsx#L308) | plain card text + text button; no icon |
| Meistrai catalog — empty | [`ProviderListingClient.tsx:884`](src/components/tiekejai/ProviderListingClient.tsx#L884) | dashed `rounded-[28px]` card, Search icon + 3 text variants + contextual CTAs |
| Meistrai profile — reviews | [`ReviewsSection.tsx:137`](src/app/meistrai/[slug]/components/ReviewsSection.tsx#L137) | Star icon + bare "Atsiliepimų kol kas nėra"; no CTA |
| Provider profile — stories | [`tiekejas/profilis/page.tsx:912`](src/app/tiekejas/profilis/page.tsx#L912) | inline text "Neturite aktyvių story" |
| Notification bell | [`NotificationBell.tsx:328`](src/components/layout/NotificationBell.tsx#L328) | bare "Nėra pranešimų" |
| Provider follow-ups | [`ProviderFollowUpsCard.tsx:40`](src/app/tiekejas/ProviderFollowUpsCard.tsx#L40) | returns `null` (card vanishes) |
| Category picker | [`GroupedCategoryPicker.tsx:418`](src/components/categories/GroupedCategoryPicker.tsx#L418) | inline "Kategorijų nerasta" |
| Filter bars — count label | [`RequestFilterBar.tsx:161`](src/components/uzklausos/RequestFilterBar.tsx#L161), [`ProviderFilterBar.tsx:32`](src/components/tiekejai/ProviderFilterBar.tsx#L32) | bare "Nerasta" |
| Provider plans — no packs | [`planai/page.tsx:145`](src/app/tiekejas/planai/page.tsx#L145) | bare "Šiuo metu paketų nėra…" |

**Admin — all bare `<p class="text-surface-500">`, no icon/CTA:** claims [`claims/page.tsx:204`](src/app/admin/claims/page.tsx#L204), AI errors/calls [`admin/page.tsx:437,444`](src/app/admin/page.tsx#L437), follow-up agent [`FollowUpAgentCard.tsx:102,153`](src/app/admin/FollowUpAgentCard.tsx#L102), telegram [`telegram/page.tsx:418,514`](src/app/admin/telegram/page.tsx#L418), moderation [`moderacija/page.tsx:215`](src/app/admin/moderacija/page.tsx#L215), credit packs [`CreditPacksCard.tsx:202`](src/app/admin/nustatymai/CreditPacksCard.tsx#L202), emails [`laiskai/page.tsx:111`](src/app/admin/laiskai/page.tsx#L111), users [`naudotojai/page.tsx:239`](src/app/admin/naudotojai/page.tsx#L239), intel [`MarketplaceIntelligenceCard.tsx:84`](src/app/admin/MarketplaceIntelligenceCard.tsx#L84).

### 5.3 Zero-value stat cards

| Card | file:line | Behavior at 0 |
|---|---|---|
| Provider metric tiles (Pokalbiai/Kreditai/Priimti) | [`StatsGrid.tsx:283`](src/app/tiekejas/sections/StatsGrid.tsx#L283) | renders literal "**0**" (tabular-nums). Kreditai tile switches brand→**amber** when balance 0 (`:215`) |
| Dashboard next-action CTA | [`StatsGrid.tsx:65`](src/app/tiekejas/sections/StatsGrid.tsx#L65) | when credits 0, surfaces "Papildykite kreditus" |
| Admin stat cards | [`admin/page.tsx:327`](src/app/admin/page.tsx#L327) | renders raw `{value}` → "**0**" |
| Admin alert banners | [`admin/page.tsx:288`](src/app/admin/page.tsx#L288) | gated on `> 0` — **hidden** at 0 |
| Sparkline | [`Sparkline.tsx:16`](src/components/ui/Sparkline.tsx#L16) | returns `null` when empty |
| Admin latency/last-run | [`admin/page.tsx:103`](src/app/admin/page.tsx#L103) | `null` → "nėra" / "dar nėra" (not "0") |

### 5.4 Inconsistencies

- **Shared vs bespoke split by surface:** messaging + tracker + account use shared `EmptyState`; the request board, Meistrai catalog, reviews, plans, and **all of admin** roll their own (admin uniformly a bare `<p>`, no icon/CTA).
- **CTA presence inconsistent:** only 3 empty states offer an action (account-requests, board, Meistrai catalog). Functionally similar inbox/sent-inquiry empties have none.
- **"Not found" tone differs:** friendly public copy vs terse provider ("Pokalbis nerastas", no description) vs raw `{loadError}` dump on the edit page.
- **Lexical variants mixed even within one component:** "nerasta" / "nėra" / "tuščia" / "kol kas nėra" / "dar nėra" co-occur in [`ConversationList.tsx:248-251`](src/app/tiekejas/zinutes/ConversationList.tsx#L248).
- **Card-hidden vs visible-empty:** `ProviderFollowUpsCard` + `Sparkline` return `null`; admin follow-up agent shows an explicit "…nėra" line — opposite conventions.

---

## Section 6 — Primary CTA copy

### 6.1 Inventory (by area)

| Area | CTA text | file:line |
|---|---|---|
| Homepage | "Registruotis nemokamai" / "Eiti į valdymo panelę" | [`page.tsx:566,561`](src/app/page.tsx#L561) |
| Homepage | "Nauja užklausa" | [`page.tsx:258`](src/app/page.tsx#L258) |
| Homepage | "Pateikti užklausą" | [`page.tsx:558`](src/app/page.tsx#L558) |
| Landing | "Gauti pasiūlymus nemokamai" | [`ServiceLanding.tsx:179`](src/components/landing/ServiceLanding.tsx#L179) |
| Landing | "Paskelbti užklausą" / "Susisiekti" | [`ServiceLanding.tsx:386,390`](src/components/landing/ServiceLanding.tsx#L386) |
| Header/footer | "Pateikti užklausą" / "Prisijungti" / "Registruotis" | [`Header.tsx:17,77,83`](src/components/layout/Header.tsx#L17), [`Footer.tsx:46`](src/components/layout/Footer.tsx#L46) |
| Request board | "Pateikti pasiūlymą" / "Valdyti užklausą" | [`uzklausos/page.tsx:425`](src/app/uzklausos/page.tsx#L425) |
| Request board empty | "Tapti tiekėju" | [`uzklausos/page.tsx:571,622`](src/app/uzklausos/page.tsx#L571) |
| Meistrai profile | "Rašyti žinutę" | [`ContactButton.tsx:34`](src/app/meistrai/[slug]/components/ContactButton.tsx#L34), [`DirectInquiryWidget.tsx:579`](src/app/meistrai/[slug]/components/DirectInquiryWidget.tsx#L579) |
| Meistrai story | "Susisiekti" | [`StoryViewer.tsx:181`](src/components/stories/StoryViewer.tsx#L181), [`MultiStoryViewer.tsx:232`](src/components/stories/MultiStoryViewer.tsx#L232) |
| Meistrai inquiry | "Siųsti žinutę" / "Tęsti" | [`DirectInquiryWidget.tsx:523`](src/app/meistrai/[slug]/components/DirectInquiryWidget.tsx#L523) |
| Provider dashboard | "Sukurti profilį su AI" | [`tiekejas/page.tsx:101`](src/app/tiekejas/page.tsx#L101), [`tiekejams/page.tsx:95,476`](src/app/tiekejams/page.tsx#L95) |
| Provider profile | "Išsaugoti" / "Atrakinti už N kr." | [`tiekejas/profilis/page.tsx:1084,713`](src/app/tiekejas/profilis/page.tsx#L1084) |
| Provider plans | "Pirkti kreditų" / "Pirkti" | [`planai/page.tsx:143,172`](src/app/tiekejas/planai/page.tsx#L143) |
| Lead unlock | "Atrakinti — 1 kreditas" / "Pirkti kreditų" | [`UnlockCard.tsx:109,85`](src/app/tiekejas/uzklausa/[id]/UnlockCard.tsx#L109) |
| Response | "Siųsti ir pradėti pokalbį" | [`ResponseForm.tsx:111`](src/app/tiekejas/uzklausa/[id]/ResponseForm.tsx#L111) |
| Account | "Pateikti užklausą" / "Išsaugoti profilį" | [`MyRequestsList.tsx:94`](src/app/paskyra/uzklausos/MyRequestsList.tsx#L94), [`ProfileForm.tsx:202`](src/app/paskyra/profilis/ProfileForm.tsx#L202) |
| Tracker | "Pateikti atsiliepimą" / "Peržiūrėti pasiūlymus" | [`ReviewForm.tsx:121`](src/app/uzklausos/sekti/[id]/components/ReviewForm.tsx#L121), [`RequestHeader.tsx:189`](src/app/uzklausos/sekti/[id]/sections/RequestHeader.tsx#L189) |
| Auth | "Prisijungti" / "Sukurti paskyrą" / "Registruotis su Google" | [`prisijungti/page.tsx:213`](src/app/(auth)/prisijungti/page.tsx#L213), [`registruotis/page.tsx:22,122`](src/app/(auth)/registruotis/page.tsx#L22) |
| Auth | "Tęsti su Google" | [`GoogleSignInButton.tsx:16`](src/components/auth/GoogleSignInButton.tsx#L16) |
| Claim | "Pateikti prašymą" / "Sukurti tiekėjo paskyrą" | [`ClaimForm.tsx:154`](src/app/claim/[slug]/ClaimForm.tsx#L154), [`ClaimAccountStep.tsx:197`](src/app/claim/verify/ClaimAccountStep.tsx#L197) |
| Messaging | "Peržiūrėti" | [`RequestBriefDrawer.tsx:45`](src/components/messaging/RequestBriefDrawer.tsx#L45) |
| Contact | "Siųsti" | [`ContactForm.tsx:141`](src/app/kontaktai/ContactForm.tsx#L141) |
| AI helper | "Sukurti pasiūlymą su AI" | [`GenerateProposalButton.tsx:103`](src/components/ai/GenerateProposalButton.tsx#L103) |

### 6.2 Inconsistency clusters (same action, different wording)

- **A. Create a request — 5 strings:** "Pateikti užklausą" ([`Header.tsx:17`](src/components/layout/Header.tsx#L17), [`Footer.tsx:46`](src/components/layout/Footer.tsx#L46), [`MyRequestsList.tsx:94`](src/app/paskyra/uzklausos/MyRequestsList.tsx#L94)) / "Paskelbti užklausą" ([`ServiceLanding.tsx:386`](src/components/landing/ServiceLanding.tsx#L386)) / "Gauti pasiūlymus nemokamai" ([`ServiceLanding.tsx:179`](src/components/landing/ServiceLanding.tsx#L179)) / "Nauja užklausa" ([`page.tsx:258`](src/app/page.tsx#L258)) / homepage hero conflates signup ([`page.tsx:548,566`](src/app/page.tsx#L548)).
- **B. Contact a provider — 3 strings:** "Rašyti žinutę" ([`ContactButton.tsx:34`](src/app/meistrai/[slug]/components/ContactButton.tsx#L34), [`DirectInquiryWidget.tsx:579`](src/app/meistrai/[slug]/components/DirectInquiryWidget.tsx#L579)) / "Susisiekti" ([`StoryViewer.tsx:181`](src/components/stories/StoryViewer.tsx#L181), [`ServiceLanding.tsx:390`](src/components/landing/ServiceLanding.tsx#L390)) / "Siųsti žinutę" ([`DirectInquiryWidget.tsx:523`](src/app/meistrai/[slug]/components/DirectInquiryWidget.tsx#L523)).
- **C. Become a provider:** "Tapti tiekėju" ([`uzklausos/page.tsx:571`](src/app/uzklausos/page.tsx#L571)) / "Registruotis nemokamai" ([`page.tsx:566`](src/app/page.tsx#L566)) / "Sukurti tiekėjo paskyrą" ([`ClaimAccountStep.tsx:197`](src/app/claim/verify/ClaimAccountStep.tsx#L197)) / "Sukurti profilį su AI" ([`tiekejas/page.tsx:101`](src/app/tiekejas/page.tsx#L101)). (No broken "Tapti tiekeju" variant found.)
- **D. Buy credits:** "Pirkti kreditų" ([`planai/page.tsx:143`](src/app/tiekejas/planai/page.tsx#L143), [`UnlockCard.tsx:85`](src/app/tiekejas/uzklausa/[id]/UnlockCard.tsx#L85)) vs bare "Pirkti" ([`planai/page.tsx:172`](src/app/tiekejas/planai/page.tsx#L172)).
- **E. Save — 5 variants:** "Išsaugoti" / "Išsaugoti pakeitimus" / "Išsaugoti profilį" / "Išsaugoti juodraštį" / "Išsaugoti pastabą" ([`profilis/page.tsx:1084`](src/app/tiekejas/profilis/page.tsx#L1084), [`redaguoti/page.tsx:390`](src/app/uzklausos/sekti/[id]/redaguoti/page.tsx#L390), [`ProfileForm.tsx:202`](src/app/paskyra/profilis/ProfileForm.tsx#L202), [`admin/ai/page.tsx:514`](src/app/admin/ai/page.tsx#L514), [`naudotojai/page.tsx:311`](src/app/admin/naudotojai/page.tsx#L311)).
- **F. Submit a form — "Pateikti" vs "Siųsti" interchangeable:** "Siųsti" ([`ContactForm.tsx:141`](src/app/kontaktai/ContactForm.tsx#L141)) / "Pateikti prašymą" ([`ClaimForm.tsx:154`](src/app/claim/[slug]/ClaimForm.tsx#L154)) / "Pateikti atsiliepimą" ([`ReviewForm.tsx:121`](src/app/uzklausos/sekti/[id]/components/ReviewForm.tsx#L121)) / "Siųsti ir pradėti pokalbį" ([`ResponseForm.tsx:111`](src/app/tiekejas/uzklausa/[id]/ResponseForm.tsx#L111)).
- **G. "Tęsti" overloaded** across unrelated actions: hero-search submit ([`HeroSearch.tsx:273`](src/components/marketing/HeroSearch.tsx#L273)), OAuth ([`GoogleSignInButton.tsx:16`](src/components/auth/GoogleSignInButton.tsx#L16)), verify-flow ([`patvirtinti/page.tsx:102`](src/app/(auth)/patvirtinti/page.tsx#L102)), guest inquiry submit ([`DirectInquiryWidget.tsx:523`](src/app/meistrai/[slug]/components/DirectInquiryWidget.tsx#L523)).

---

## Cross-cutting summary

1. **Two design systems.** Token-based primitives (admin/dashboard/account/auth) vs hardcoded-hex bespoke surfaces (homepage/landing/board/Meistrai/chat). The same "primary submit" reads terracotta in forms, charcoal `#2A2723` in the header, and cream `#ECE9E2` on the homepage.
2. **The reported CTA bug is intentional color rotation,** not a token mismatch — `CTA_TONES[i % 3]` ([`uzklausos/page.tsx:337`](src/app/uzklausos/page.tsx#L337)), with a `Math.random()` twin in [`InlineListingCard.tsx:33`](src/components/uzklausos-v2/InlineListingCard.tsx#L33).
3. **Token drift:** ~168 hex + ~256 arbitrary Tailwind values restate or bypass the `brand`/`surface` scales; off-scale font sizes and 50+ hardcoded shadows.
4. **The Užklausų lenta is a deliberately separate aesthetic** (Lora serif + paper-note/pin/polaroid/found-stamp CSS in `globals.css:243-593`), self-contained to `app/uzklausos/**` + `components/requests|uzklausos-v2/**`.
5. **Empty states and CTA copy are inconsistent** in component (shared vs bare `<p>`), CTA presence, tone, and wording (5 ways to say "create a request", 3 to "contact a provider").
