paslaugurinka.lt | Claude Entry Point

This project uses `AGENTS.md` as the shared, vendor-neutral operating guide for
all AI agents.

Before making changes, read and follow `AGENTS.md` completely. It contains the
project context, agent personas, architecture rules, security rules, QA
checklist, and the Codex-compatible instructions.

Claude-specific local settings remain in `.claude/`. Project MCP settings for
Claude are in `.mcp.json`; Codex mirrors the same Supabase MCP endpoint in
`.codex/config.toml`.

## Design system (enforced)

All styling MUST use tokens from `DESIGN_SYSTEM.md`. Never hardcode colors,
spacing, radii, shadows, or font sizes. Use the existing `brand`/`surface`
scales, the `danger`/`success`/`warning` semantic colors, `shadow-sm/md/lg`,
`rounded-lg/2xl/full`, `duration-base`/`ease-standard`, and the `text-*` type
scale (`font-sans` default, `font-display` for H1s). Do not introduce new tokens
or a parallel palette — extend the existing one. The only allowed raw hex values
are the documented exceptions in `DESIGN_SYSTEM.md` §6 (canvas/CSS-var/metadata/
brand-mark/board-theme).
