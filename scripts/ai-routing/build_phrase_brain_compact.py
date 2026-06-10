#!/usr/bin/env python3
"""Compact the 24MB phrase_category_stats.json into a ~1MB artifact the TS
shadow adapter can import (`src/lib/routing/data/phrase-brain.v1.json`).

Keeps ONLY what the shipped (review + confidence) config needs per phrase:
strength, top category + share, total count, and the top-3 category
distribution. Category names are interned into a string table; shares are
stored as integers x10000.

Keying: phrases are keyed by their FOLDED form. The source records are sorted
by total_count descending, and on a fold-collision the first (= highest-count)
record wins — the same winner the Python adapter's `_by_folded` fallback picks.
Exact-diacritic lookups can differ from the Python adapter only on those rare
collisions (reported below); the colliding records' stats are near-identical.

Run after regenerating the phrase brain in the KATEGORIJOS project:
    python3 scripts/ai-routing/build_phrase_brain_compact.py
"""

from __future__ import annotations

import json
from pathlib import Path

_REPO = Path(__file__).resolve().parents[2]
_SRC = _REPO / "data/routing/category-intelligence/phrase_category_stats.json"
_OUT = _REPO / "src/lib/routing/data/phrase-brain.v1.json"

_DIA = str.maketrans("ąčęėįšųūž", "aceeisuuz")
STRENGTH_CODE = {"strong": 0, "medium": 1, "ambiguous": 2, "weak": 3}
DIST_TOP_K = 3


def fold(s) -> str:
    return ("" if s is None else str(s)).strip().lower().translate(_DIA)


def main() -> int:
    records = json.loads(_SRC.read_text(encoding="utf-8"))
    # Source is written sorted by (-total_count, phrase); keep that order so
    # fold-collisions resolve to the highest-count record (first wins).
    cats: list[str] = []
    cat_idx: dict[str, int] = {}

    def intern(name: str) -> int:
        i = cat_idx.get(name)
        if i is None:
            i = len(cats)
            cats.append(name)
            cat_idx[name] = i
        return i

    phrases: dict[str, list] = {}
    collisions = 0
    counts = {"strong": 0, "medium": 0, "ambiguous": 0, "weak": 0}
    for r in records:
        key = fold(r["phrase"])
        if key in phrases:
            collisions += 1
            continue
        dist_flat: list[int] = []
        for c, v in list(r.get("category_distribution", {}).items())[:DIST_TOP_K]:
            dist_flat.append(intern(c))
            dist_flat.append(round(float(v["share"]) * 10000))
        phrases[key] = [
            STRENGTH_CODE[r["strength"]],
            intern(r["top_category"]),
            round(float(r["top_category_share"]) * 10000),
            int(r["total_count"]),
            dist_flat,
        ]
        counts[r["strength"]] += 1

    out = {
        "version": "category-intelligence-v1",
        "generatedFrom": "phrase_category_stats.json (KATEGORIJOS project analyze_category_phrases.py)",
        "counts": {**counts, "phrases": len(phrases), "categories": len(cats),
                   "foldCollisionsDropped": collisions},
        "cats": cats,
        "phrases": phrases,
    }
    _OUT.parent.mkdir(parents=True, exist_ok=True)
    _OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")),
                    encoding="utf-8")
    size_mb = _OUT.stat().st_size / 1e6
    print(f"wrote {_OUT}  ({size_mb:.2f} MB)")
    print(f"phrases={len(phrases)} cats={len(cats)} collisions_dropped={collisions}")
    print(f"strength counts: {counts}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
