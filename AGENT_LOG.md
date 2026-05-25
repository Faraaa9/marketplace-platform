# Agent activity log

Append-only žurnalas darbui tarp Claude ir Codex sesijų. Abu agentai
skaito viršutinį įrašą sesijos pradžioje (per `AGENTS.md` instrukciją)
ir prideda naują įrašą pabaigus reikšmingą darbo etapą.

**Automatika:** `scripts/agent-log-entry.sh` prideda stub įrašą po
kiekvieno `git commit` (Claude per `.claude/hooks/post-commit-log.sh`,
Codex per instrukciją šiame faile).

**Manualiai:** `bash scripts/agent-log-entry.sh <Claude|Codex>` arba
Claude'e `/log` slash komanda.

**Konvencija:** užpildyk **Toliau** lauką ranka kai aišku, ką kitas
agentas turėtų daryti. Be to laukas lieka tuščias ir kitas agentas pats
sprendžia kontekstą iš diff'o.

<!-- AGENT_LOG:ENTRIES -->

## 2026-05-25 17:35 — Claude

**Commit:** `fa50b61` — Add AI category suggestions and finish taxonomy unification wiring · push'inta

**Pakeitimai:** 21 files, +1903 / −129

**Failai (esmė):**
- `src/lib/category-suggestions.ts` (naujas) — deterministic Lt-aware scoringas + AI rerank
- `src/app/api/category-suggestions/route.ts` (naujas) — POST endpointas, zod + rate-limit
- `src/components/ai/CategorySuggestions.tsx` (naujas) — chip UI komponentas
- `src/app/uzklausos/nauja/page.tsx` — chips virš `GroupedCategoryPicker`
- `src/app/tiekejas/profilis/page.tsx` — chips virš `CategoryChecklist` + `MAX 6→20`
- `src/lib/validations.ts` — `categorySuggestionsSchema`
- `AI_CATEGORY_ASSISTANT_PROMPTS.md` (naujas) — orig spec
- Įtraukti ~500 eilučių iš anksčiau pradėto taxonomy unification (kitos sesijos WIP, kuris jau buvo working tree)

**Toliau:**
- Patikrinti deploy: https://vercel.com/dashboard (commit `fa50b61` push'intas į `main`)
- Naršyklėje paspausti naujus mygtukus `/uzklausos/nauja` ir `/tiekejas/profilis`
- Po dienos — pasižiūrėti ar `/api/category-suggestions` realiai naudojamas (logs)
- Pridėti `CategoryAlias` įrašus dažniausioms paieškoms (sinonimai)
- Cache'inti `getServiceCategoryGroups()` per `unstable_cache` su 1h TTL
- Praplėsti chip UI į: hero search, `/uzklausos/sekti/[id]/redaguoti`, `/meistrai/kurti-profili`

**Pastabos kitam agentui:**
- Jei tavo Codex windows turėjo unfinished WIP src/lib/service-categories.ts, src/lib/category-matching.ts, src/lib/ai-improve.ts ar provider/category UI failuose — patikrink `git diff fa50b61~1 fa50b61` ir įsitikink kad nieko esminio neatkirpta. Jei reikia, atstatyk savo branch'ą su `git reset`.
