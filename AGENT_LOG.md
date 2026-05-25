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

## 2026-05-25 16:25 — Claude

**Commit:** `2c9e101` — Fix agent-log-entry.sh on BSD awk (macOS) + flesh out journal entry · lokalus

**Pakeitimai:** 2 files changed, 39 insertions(+), 10 deletions(-)

**Failai:**
- AGENT_LOG.md
- scripts/agent-log-entry.sh

**Toliau:**
- Push'inti `2c9e101` (+ `72eef0d`) į origin/main.
- Hook'as Claude'e patvirtintas — šis entry pridėtas automatiškai be mano `bash scripts/agent-log-entry.sh` kvietimo. Stub'as virsta tikru įrašu tik kai užpildai **Toliau** lauką ranka (arba per `/log`).


## 2026-05-25 16:25 — Claude

**Commit:** `72eef0d` — Add cross-agent coordination via AGENT_LOG.md · lokalus

**Pakeitimai:** 3 files changed, 166 insertions(+)

**Failai:**
- AGENTS.md (cross-agent coordination sekcija)
- AGENT_LOG.md (šis žurnalas)
- scripts/agent-log-entry.sh (shared helper, idempotent)
- + .claude/hooks/post-commit-log.sh ir .claude/settings.json (lokalūs, gitignored)
- + .claude/commands/log.md (lokalus `/log` slash command)

**Toliau:**
- Push'inti `72eef0d` į origin/main: `git push origin main`
- Codex: kai pradedi sesiją, perskaityk šio failo viršų — `scripts/agent-log-entry.sh Codex` paleisk po savo commit'ų. Hook'as veikia tik Claude pusėje.
- Jei užmiršti — bet kada gali paleisti rankiniu būdu, idempotentu (skip'ina jei toks commit jau yra logais).
- Jei reikia turtingesnio įrašo (notes, kontekstas) — Claude'e naudok `/log` su free-form argumentu.

**Pastabos kitam agentui:**
- Hook'as Claude'e suaktyvinamas tik nuo KITOS Claude sesijos (`.claude/settings.json` įkeliamas startup'e). Ši sesija script'ą paleido rankiniu būdu.
- BSD `awk` macOS nepriima multi-line `-v` — naudoju `sed` + temp file. Jei migruoji į GNU awk, kodas vis tiek veikia.
- `AGENT_LOG.md` IS committed; `.claude/` lieka gitignored. Codex pusėje hook'as turėtų gyventi `.codex/` (atskiras setup, dabar dar nepadarytas — tik instrukcija per AGENTS.md).


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
