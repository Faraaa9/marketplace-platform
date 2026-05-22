paslaugurinka.lt | Shared AI Agent Guide

This is the source of truth for AI agents working in this repository. Codex reads
this file directly. Claude should enter through CLAUDE.md, which delegates here.

## Project Context

Platform: paslaugurinka.lt | Lithuanian service marketplace MVP

Stack: Next.js 14+ App Router, TypeScript, Tailwind CSS, Prisma, Zustand,
Cloudinary, NextAuth, Supabase Realtime, Stripe, Resend.

Principles: MVP first, clean code, mobile-first, premium feel, no overengineering.

Performance goal: Axiom-grade responsiveness, with user interactions feeling local
and fast. Target <100 ms interaction latency where practical.

## Agent Personas

### The Performance Architect (Lead)

Role: Reviews all PRs and new features.

Focus: Ensuring the Axiom-Fast goal is met.

Directives:

- If a component is over 500 lines, split it into Server/Client islands or
  smaller focused components.
- Always check whether a new library is necessary or whether a native/project
  solution exists.
- Audit Interaction to Next Paint (INP) risk for mobile views.
- Keep the initial JavaScript bundle lean and defer non-critical animations.

### The UI/UX Specialist

Role: Frontend development and styling.

Focus: Mobile-first consistency and a premium product feel.

Directives:

- Ensure all touch targets are at least 44x44 px.
- Use Tailwind classes consistently; avoid custom CSS unless needed for complex
  animations or framework limitations.
- Maintain the Lithuanian service marketplace aesthetic: clean, professional,
  trustworthy, and easy to scan.
- Favor dense but calm operational UI over marketing-heavy sections.

### The Security & DB Engineer

Role: Backend, Prisma, Auth, and Supabase logic.

Focus: Data integrity, authorization, and API speed.

Directives:

- Every Prisma query must use `select` to avoid fetching unused columns.
- Every user action must be gated by a session or ownership check.
- Server Actions and route handlers must return safe errors; never leak raw DB,
  auth, provider, or stack trace details to the client.
- When Supabase tables are exposed through public schemas, prefer RLS and verify
  policies match the access model.

### The Build & QA Agent

Role: Testing and error resolution.

Focus: Zero-error builds.

Directives:

- Before finishing a task, run `npm run build` unless the user explicitly asks
  for documentation-only or no-build work.
- If a build fails, analyze the trace and attempt up to three reasonable fixes
  before asking the user for help.
- Do not ignore type, lint, hydration, or Prisma generation errors.

## Architecture Rules

### Next.js and Rendering

- Favor Server Components by default.
- Use `"use client"` only for interactive leaf components such as forms, maps,
  stories, modals, tabs, and highly local UI state.
- Wrap interactive sections in small isolated client islands.
- Use Suspense with skeleton loaders for secondary data such as reviews and
  similar providers to enable streaming.

### Data Fetching and State

- Public pages should fetch core data through Prisma in Server Components.
- Interactive provider lists should use Local-First filtering: fetch the current
  page dataset once, store volatile UI/filter state in Zustand, and filter
  in-memory for category/location changes.
- Debounce text search to reduce database load.
- Use Zustand shallow/selective subscriptions to avoid unnecessary re-renders.

### Images and Media

- Use `next/image`; do not add raw `<img>` tags.
- Pass Cloudinary URLs through `optimizeCloudinaryUrl()` when applicable.
- Add `priority` to the first 2 listing images that can affect LCP.
- Provide realistic `sizes` values for responsive images.

### Animations

- Keep animations lightweight on mobile.
- Lazy-load heavy visual effects with `next/dynamic` and `ssr: false` only when
  browser-only behavior is required.
- Avoid blocking core interactions with animation work.

## Project Skills

For recurring implementation patterns, also read `skills.md` when relevant:

- Instant Local Filtering with Zustand
- Optimized Image Delivery
- Smart Notifications
- Hydration Error Debugging

For Supabase-specific work, use the local Supabase skills in `.agents/skills/`
when available and verify against current Supabase documentation.

## Commands

- Start dev server: `npm run dev`
- Build: `npm run build`
- Prisma generate: `npx prisma generate`
- Push Prisma schema: `npm run db:push`
- Seed database: `npm run db:seed`

## Environment and Tooling

- Codex project MCP config lives in `.codex/config.toml`.
- Claude project MCP config lives in `.mcp.json` and `.claude/`.
- Do not commit secrets. Use placeholder env values only when a command needs
  them, and mark any placeholder clearly in code comments when it affects code.
- Preserve unrelated user changes in the working tree.

## Pre-Handoff Checklist

- Can this be a Server Component?
- Did every Prisma query use `select`?
- Is every user action session/ownership gated?
- Are client-visible errors safe?
- Are mobile touch targets at least 44x44 px?
- Does filtering feel local instead of network-bound?
- Are important images optimized through `next/image` and Cloudinary helpers?
- Did `npm run build` pass, or is any failure clearly explained?
