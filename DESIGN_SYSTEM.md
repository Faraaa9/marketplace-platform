# Design System — paslaugurinka.lt

Status: **Step 1 approved (2026-06-12).** Category (b) token set approved; decisions D1/D2/D3/D5 ruled. Proceeding to Step 2.

**Approved decisions:**
- **(b) tokens:** full set approved (3 semantic colors + `--surface-paper` + warm `shadow.sm/md/lg` + motion + `--font-display` alias).
- **D1 (cool slate/blue):** consolidate into warm `surface`. No cool-neutral scale, no `info` token.
- **D2/D3 (teal, purple/indigo):** retire to `brand` (teal "verified" → `success`). No new accent tokens.
- **D4 (`--brand` var `#c29b74` ≠ `brand-500`):** fix the var to `brand-500` during migration.
- **D5 (`/chat-preview`):** delete the dead route in Step 3 (not migrated).

## 0. Principle: extend the existing system, do not fork it

A token system already exists in [`tailwind.config.ts`](tailwind.config.ts) (`brand` + `surface` scales) and is consumed by `src/components/ui/*`. The job is to **map every hardcoded value onto that system, fill genuine gaps, and enforce it** — not to introduce a parallel layer. Every audited literal is classified as:

- **(a) Duplicate / approximate** of an existing `brand`/`surface` token → collapse into it.
- **(b) Genuine gap** — a role the existing scales cannot express → add ONE token (the only category that needs approval).
- **(c) Delete / retire** — dead code, off-brand accent, or a value handled elsewhere.

Source data: 920 hex occurrences (~280 distinct) + the arbitrary-value sweep from [`DESIGN_AUDIT.md`](DESIGN_AUDIT.md), extracted from `src/**/*.{tsx,ts}`.

---

## 1. Existing tokens (the canonical scales — do not duplicate)

**`brand` (terracotta, the single accent):**
`50 #faeee7 · 100 #f3dccd · 200 #e7bfa7 · 300 #d89e79 · 400 #cb7d53 · 500 #c25e3a · 600 #a94e2f · 700 #8a3f26 · 800 #6e3220 · 900 #5a2a1c · 950 #32150b`

**`surface` (warm cream → taupe → charcoal neutrals):**
`0 #ece9e2 · 50 #f5f3ef · 100 #e3dfd4 · 200 #d6d0c3 · 300 #c0b9a8 · 400 #a29b8b · 500 #7e7768 · 600 #5f584c · 700 #463f35 · 800 #312d25 · 900 #25221e · 950 #1a1813`

---

## 2. Mapping table (every audited value → target)

Each row is a **target**; the right column lists the audited literals that collapse into it. This proves coverage and that no proposed new token duplicates an existing one.

### 2a. Warm neutrals → `surface` (category **a** — duplicate/approximate)

| Target token | Approx. value | Audited literals that collapse into it |
|---|---|---|
| `white` / `surface-50` | `#ffffff` / `#f5f3ef` | `#fff` `#ffffff` `#fffdf8` `#fdfeff` `#fdfcf9` `#fcfbf8` `#fbfaf6`* `#faf9f6` `#fbf9f4` `#f8f7f4` `#f8f2ea` `#f7f1e8` `#f6f1e6` `#f5f2ed` `#f4f1ea` `#f4efe6` `#f3ece7` `#f2eee8` `#f2efe8` `#f1efec` `#f0ece6` `#f5f3ef`(=50 exact) |
| `surface-0` | `#ece9e2` | `#ece9e2`(exact) `#efece6` `#efece5` `#eae6dd` `#eae5da` `#ece7df` `#e8e3d8` `#e4dfd8` `#e5ded6` `#efe8dd` |
| `surface-100` | `#e3dfd4` | `#e2ddd2`(near-dup) `#e9e4d9` `#e7dec5` `#e1d8bd` `#e0dacb` `#dbd6cb` `#ded8cf` `#f1ede4` `#f1e7da` `#efe7db` `#efe8d3` `#efe0d6` `#ebe2cb` `#ebe3cc` `#ece6d7` `#e6d9c7` `#e1d4c4` `#e4d8c9` `#e4d2be` `#ded2c1` |
| `surface-200` | `#d6d0c3` | `#d8d2c6`(near-dup) `#d7c7b6` `#ddd3c5` `#d9d3cb` `#d8cda6` `#d8c4a8` `#d3c6a2` `#d2c5a1` `#cdc09f` `#cfc9bc` `#d9c9b8` `#d3ccbd` `#d4cec6` `#cfc5b9` `#c7ba92` `#ddca9c` `#cdbe8f` |
| `surface-300` | `#c0b9a8` | `#c6bfb0` `#c5b7a4` `#c7aaa0` `#e0c0b0` `#dcab93` |
| `surface-400` | `#a29b8b` | `#a79a8f` `#9c8d92` `#95868d` `#9a958b` `#b5afa2` `#b3aea3` `#a89668` `#9b8a5f` `#9f7b66` `#9b8f76` `#9a6440` `#b58e74` `#b99170` `#c98f65` `#9a958b` |
| `surface-500` | `#7e7768` | `#6b6760`(38×, =`--chat-muted`) `#6f6258` `#8a796b` `#8c877d` `#7b746d` `#7a746a` `#7b746d` `#6f6042` `#6c5d3c` `#6f5646` |
| `surface-600` | `#5f584c` | `#57534c` `#5c3525` `#5b4a26` |
| `surface-700` | `#463f35` | `#4e463f` `#4a463f` `#4a463f` `#473919` `#43271c` |
| `surface-800` | `#312d25` | `#3b2d24` `#3f3a32` `#3d3a35` `#3a3631` `#3a3128` |
| `surface-900` | `#25221e` | `#25221e`(exact) `#26231f`(36×, near-dup) `#2a2723`(header CTA) |
| `surface-950` | `#1a1813` | `#1e1b18`(33×, =`--foreground`) |

\* `#fbfaf6` is also the **board paper sheet** — see §3 `--surface-paper` (category b, themed). Where it is just a light card bg, it collapses to `surface-50`.

### 2b. Terracotta → `brand` (category **a**)

| Target | Audited literals |
|---|---|
| `brand-500` | `#c25e3a`(exact, 31×) |
| `brand-600`/`700` | `#b4451f` `#9a4427` `#9a6440` |
| `brand-300`/`400` | `#c29b74`(12×, the conflicting `--brand` var — see Decision D4) `#dcab93` `#e0c0b0` |

Warm-brown **chat-bubble** palette (`#8a6653` own-bubble, `#7b5d49` `#a7826d` `#e6d9c7` `#6f5646` `#3b2d24`) → map onto `brand-800`/`surface-700`–`800` per role (these are warm, in-system; no new token).

### 2c. Semantic colors → **NEW** (category **b** — needs approval, see §3)

| Proposed token | Value | Audited literals it absorbs |
|---|---|---|
| `danger` (formalizes existing `bg-red-600`) | `#dc2626` | `#dc2626`(5×) `#991b1b` `#fecaca` `#fef2f2` |
| `success` | `#16a34a` | `#16a34a` `#5e8c50` `#9cc088` `#d4e5cd` `#bbd3b0` `#26331f` `#3a4d30` |
| `warning` | `#d9920b` (amber) | `#f4e6a8` `#f2e7c9` `#d8bd80` `#896224` `#b08a2e` `#7c6b2e` `#5b4a26` `#473919` |

### 2d. Cool slate / blue family — **DECISION D1** (off-system)

Not expressible by the warm `surface` scale. ~15 distinct, high-frequency, concentrated in admin + marketing graphics.

`#64748b`(18×) `#2563eb`(17×) `#111827`(17×) `#6b7280`(16×) `#475569`(12×) `#6b7078`(11×) `#0f172a`(7×) `#d8dee7` `#d5dae3` `#f8fafc` `#f2f5f9` `#eff3f8` `#d3d8e0` `#aeb7c4` `#94a3b8` `#334155` `#1e293b` `#020617` `#e2e8f0` `#e5e7eb` `#f3f4f6` `#60646c` `#555b64` `#7b8088` `#20242b`(6×) `#30343b` `#516678` `#44525d` `#33414c` `#222d3b` `#374559` `#a8b0bc` `#9db5d6` `#bcccdf` `#aebfca` `#5a79a4` `#516678` `#e1e6ee` `#e6ebf2` `#e8edf4` `#dde3ec` `#d5e0ec` `#e3e8ec` `#eef2f7` `#c4cfd6` `#f7f9fc` `#f5f7fa` `#f3f6fa` `#166fe5`
→ **Recommended (c):** consolidate cool neutrals into warm `surface`; if links/info genuinely need blue, add **at most one** `info` token. **Do not** add a cool-neutral scale (that is a second system).

### 2e. Teal / cyan family — **DECISION D2** (off-system)

`#17615e`(9×) `#0f766e`(7×) `#14b8a6` `#0b5f59` `#0f766e` `#67b7b0` `#8fb4b1` `#c9dddc`(6×) `#dff4f2` `#d8e7e6` `#cfe4e2` `#bfdad8` `#e3eeee` `#e8f7f5` `#eaf7f6` `#f0faf9` `#f3fbfa` `#f8fcfc` `#cfe4e2`
→ **Recommended (c):** retire to the single `brand` accent (or `success` where it means "verified/positive"). No new teal token.

### 2f. Purple / indigo / pink — **DECISION D3** (off-brand)

`#7c6aa6`(2×) `#b3a3d6` `#cabfe0` `#e1daec` `#2e2740` `#43395f` `#6366f1`(4×) `#4f46e5`(4×) `#a855f7` `#ec4899` `#9db5d6`
→ **Recommended (c):** retire to `brand`/`surface`. The memory note "terracotta as single accent" makes purple/indigo off-brand. (Indigo `#6366f1` is also the source of the `glow` shadow in `tailwind.config.ts:80` — see shadow note.)

### 2g. Third-party brand assets — **KEEP (exempt)**

Google `#4285f4 #ea4335 #fbbc05 #34a853`, Telegram `#229ed9 #1b8cc2`, Facebook `#166fe5`. These are external logos/marks — document as exempt, not tokens.

### 2h. CTA color rotation — **LEAVE (Prompt 3)**

Per instructions, untouched this pass: `CTA_TONES` olive/gold `#6f7d4d #616d43 #4a5430 #a17b44 #8c6a3b #6b5028 #793821` ([`uzklausos/page.tsx:337`](src/app/uzklausos/page.tsx#L337)) and the `Math.random()` twin `#a84e2e #933f22 #6e813f #5c6e33 #a0834f #8a6e40` ([`InlineListingCard.tsx:33`](src/components/uzklausos-v2/InlineListingCard.tsx#L33)). Also board decorative olive `#5c6d3b #37422a #4c5a36 #c4d0a6 #bccb9c #e6ecd9 #d4e5cd` (competition chips).

### 2i. Non-color arbitrary values

| Concern | Audited values | Target |
|---|---|---|
| **Radius** | `rounded-[28px]` `rounded-[1.75rem]`(5×) `rounded-[2rem]` `rounded-t-[28px]` `rounded-b-[1.75rem]` `rounded-[28px_28px_18px_18px]` | collapse → `rounded-2xl` (16px, cards) / `rounded-lg` (8px, inputs+buttons) / `rounded-full` (pills). `rounded-[inherit]`/`[calc(1rem-1px)]` keep (structural). |
| **Font size** | `text-[10px]`(24×) `text-[11px]`(31×) `text-[12px]` `text-[12.5px]` `text-[13px]` `text-[15px]` `text-[17px]` `text-[0.6–0.95rem]` `text-[1.05–4.25rem]` | map onto the existing `fontSize` scale (`micro`/`caption`/`body-sm`/`body`/`heading-*`/`display*`, `tailwind.config.ts:61-72`). |
| **Shadow** | warm `shadow-[…rgba(93,70,54,…)…]` (8 recipes), generic `rgba(0,0,0,…)`/`rgba(15,23,42,…)` | derive **NEW** `shadow.sm/md/lg` from the warm `rgba(93,70,54)` recipe (category b, §3). Keep the warm hue. |
| **Spacing** | arbitrary `px`/`rem` paddings & gaps | enforce existing Tailwind 4px grid (`1=4 2=8 3=12 4=16 6=24 8=32 12=48 16=64`). No new token. |

---

## 3. Category (b) — proposed NEW tokens (THE APPROVAL GATE)

Minimal, one-per-role. Nothing here duplicates a `brand`/`surface` value (table §2 proves it).

**Semantic colors (3 roles):**
| Token | DEFAULT | soft (bg) | strong (hover/text) |
|---|---|---|---|
| `danger` | `#dc2626` | `#fef2f2` | `#991b1b` |
| `success` | `#16a34a` | `#ecfdf3` | `#15803d` |
| `warning` | `#d9920b` | `#fdf6e3` | `#a66c08` |

**Themed board surface (formalizes existing `globals.css` paper-note CSS, not new design):**
| Token | Value | Role |
|---|---|---|
| `--surface-paper` | `#fbfaf6` (dark `#2b2720`) | Užklausų-lenta paper sheet bg |
| `--paper-ink` | `surface-500`–`600` | board body text on paper |
| board assets | (named) | torn-edge mask, `.pin` brass gradient, `.found-stamp`, `.polaroid` — namespaced as the board theme |

**Shadow scale (3 steps, warm hue kept):**
| Token | Value (derived from `rgba(93,70,54)`) |
|---|---|
| `shadow.sm` | `0 1px 2px rgba(93,70,54,0.08)` |
| `shadow.md` | `0 4px 14px rgba(93,70,54,0.10)` |
| `shadow.lg` | `0 16px 36px -12px rgba(93,70,54,0.14)` |

**Motion (2 tokens):** `--duration-base: 150ms` · `--ease-standard: cubic-bezier(0.4, 0, 0.2, 1)`

**Typography (alias, NOT a new font):** `--font-display` = alias of existing `--font-serif` (Lora). Rule (applied visually in Prompt 2): **page-level H1 → display/serif; all other text → Inter.** Flip Lora to `preload: true`. Delete orphaned `src/app/fonts/GeistVF.woff` + `GeistMonoVF.woff`.

---

## 4. Open decisions (need a ruling before Step 2)

| # | Decision | Recommendation |
|---|---|---|
| **D1** | Cool slate/blue family (admin + marketing) | (c) consolidate into warm `surface`; add **one** `info` token only if links must stay blue. No cool-neutral scale. |
| **D2** | Teal/cyan family (trust/stories) | (c) retire to `brand` (or `success` for "verified"). No teal token. |
| **D3** | Purple/indigo/pink (homepage hero graphic, AI glow, `glow` shadow) | (c) retire to `brand`/`surface`. No purple token. |
| **D4** | `--brand` CSS var = `#c29b74` ≠ `brand-500` `#c25e3a` | Fix the var to `brand-500` (or retire it); it is a latent inconsistency, not a token. |
| **D5** | `/chat-preview` route (~113 hex, **no inbound links**) | Delete in Step 3 rather than migrate (confirm before deleting). |

---

## 5. Pending (after approval)

- Step 2 — add category (b) tokens to `tailwind.config.ts` + `globals.css`; enforce radius/spacing/shadow/motion/type.
- Step 3 — migrate file-by-file per §2 (logical commits); leave CTA rotation; resolve D5.
- Step 4 — finalize this doc's token reference + add the enforcement rule to `CLAUDE.md`.
