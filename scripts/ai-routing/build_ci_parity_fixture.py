#!/usr/bin/env python3
"""Generate the TS<->Python parity fixture for the Category Intelligence port.

Runs the validated Python adapter over the 6 probe cases + a deterministic
sample of golden_eval_300 requests and records the signal pieces the TS port
must reproduce: matched folded phrases, ranking_boosts, ambiguity phrases,
redirect tokens.

The adapter's exact-display lookup is disabled (folded-only), because the
compact TS artifact is keyed by folded phrase — with that, both sides resolve
fold-collisions to the same highest-count record, so the comparison is exact.

Output: src/lib/routing/__tests__/fixtures/ci-parity.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

_REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_REPO / "scripts/ai-routing"))

from category_intelligence_adapter import CategoryIntelligence, fold  # noqa: E402

_GOLDEN = _REPO / "data/routing/eval/golden_eval_300_labeled.jsonl"
_OUT = _REPO / "src/lib/routing/__tests__/fixtures/ci-parity.json"

PROBES = [
    ("Bėga vanduo", "bėga vanduo iš po kriauklės"),
    ("Skalbimo mašinos remontas", "neveikia skalbimo mašina, bėga vanduo"),
    ("Stogo danga", "reikia pakeisti stogo dangą, čerpės"),
    ("Vonios kambario remontas", "vonios kambaryje plytelės ir santechnika"),
    ("Dujinio katilo remontas", "neveikia dujinis katilas, šildymas"),
    ("Lietvamzdis", "lietvamzdis nuo stogo bėga vanduo lietaus"),
]
GOLDEN_SAMPLE_EVERY = 5  # every 5th row -> 60 cases, deterministic
DESC_TRIM = 200


def main() -> int:
    ci = CategoryIntelligence()
    ci._by_phrase = {}  # folded-only lookup — matches the compact TS artifact

    cases = list(PROBES)
    for i, line in enumerate(
            _GOLDEN.read_text(encoding="utf-8").splitlines()):
        if not line.strip() or i % GOLDEN_SAMPLE_EVERY:
            continue
        rec = json.loads(line)
        cases.append((rec.get("title") or "",
                      (rec.get("description") or "")[:DESC_TRIM]))

    out = []
    for title, desc in cases:
        sig = ci.analyze(title, desc)
        out.append({
            "title": title,
            "description": desc,
            "matchedFolded": sorted(fold(m["phrase"])
                                    for m in sig.matched_phrases),
            "rankingBoosts": {k: round(v, 4)
                              for k, v in sorted(sig.ranking_boosts.items())},
            "ambiguityPhrases": sorted(fold(a["phrase"])
                                       for a in sig.ambiguity_signals),
            "redirectTokens": sorted(h["token"] for h in sig.redirect_hints),
        })

    _OUT.parent.mkdir(parents=True, exist_ok=True)
    _OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1),
                    encoding="utf-8")
    print(f"wrote {_OUT} ({len(out)} cases)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
