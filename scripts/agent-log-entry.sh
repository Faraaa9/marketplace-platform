#!/usr/bin/env bash
# Prepend an AGENT_LOG.md entry for the current HEAD commit.
#
# Usage:
#   bash scripts/agent-log-entry.sh <AgentName>
#
# Examples:
#   bash scripts/agent-log-entry.sh Claude
#   bash scripts/agent-log-entry.sh Codex
#
# Idempotent: if the latest commit hash already appears in the top of
# AGENT_LOG.md, the script is a no-op. Safe to call from PostToolUse hooks
# on every git commit.

set -euo pipefail

AGENT="${1:-unknown}"
LOG_FILE="AGENT_LOG.md"
MARKER="<!-- AGENT_LOG:ENTRIES -->"

# Run from repo root regardless of CWD.
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

# Need at least one commit to log anything.
if ! git rev-parse HEAD >/dev/null 2>&1; then
  exit 0
fi

HASH="$(git rev-parse --short HEAD)"
SUBJECT="$(git log -1 --pretty=%s)"
STAT="$(git show --shortstat --pretty="" HEAD | tr -s ' ' | sed 's/^ //; s/ $//' | head -1)"
FILES_LIST="$(git show --name-only --pretty="" HEAD | grep -v '^$' | head -12 | sed 's/^/- /')"
TS="$(date '+%Y-%m-%d %H:%M')"

# Pushed status — only if upstream exists and matches local HEAD.
PUSHED=""
if upstream="$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null)"; then
  if [ "$(git rev-parse HEAD)" = "$(git rev-parse "$upstream" 2>/dev/null || echo none)" ]; then
    PUSHED=" · push'inta"
  else
    PUSHED=" · lokalus"
  fi
fi

# Idempotency: bail if the hash already appears in the top half-page of the log.
if [ -f "$LOG_FILE" ] && head -40 "$LOG_FILE" | grep -qw "$HASH"; then
  exit 0
fi

ENTRY="## ${TS} — ${AGENT}

**Commit:** \`${HASH}\` — ${SUBJECT}${PUSHED}

**Pakeitimai:** ${STAT}

**Failai:**
${FILES_LIST}

**Toliau:** _(papildyk ranka kai aišku)_
"

# Insert the entry right after the entries marker, or create the file with
# a minimal header if it doesn't exist yet.
if [ ! -f "$LOG_FILE" ]; then
  cat > "$LOG_FILE" <<EOF
# Agent activity log

Append-only žurnalas Claude + Codex sesijoms.

${MARKER}

${ENTRY}
EOF
  exit 0
fi

if grep -q "$MARKER" "$LOG_FILE"; then
  awk -v entry="$ENTRY" -v marker="$MARKER" '
    {
      print
      if (index($0, marker) > 0 && !inserted) {
        print ""
        print entry
        inserted = 1
      }
    }
  ' "$LOG_FILE" > "$LOG_FILE.tmp"
  mv "$LOG_FILE.tmp" "$LOG_FILE"
else
  # Marker missing — just append at end so we don't lose the entry.
  printf '\n%s\n' "$ENTRY" >> "$LOG_FILE"
fi
