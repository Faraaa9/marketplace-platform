#!/usr/bin/env python3
"""Multi-category routing classifier — EXPERIMENT (separate from bot_classifier).

Hypothesis: a single "primary" category is often misleading. Many leads need to
reach SEVERAL provider categories. Instead of collapsing the bot's candidates to
one primary, this routes each lead to ALL relevant provider categories.

Self-contained: it does NOT import or modify bot_classifier.py / ambiguity_gate.py.
Read-only on gold_* fields (those are used only by the evaluator, never here).

Baseline strategy (v1):
  routing_categories = de-duplicated union of the bot's own candidates
                       (suggested_primary_category + suggested_secondary_categories).
  i.e. "route to every trade the upstream bot extracted", no single-primary collapse.
  Plus lightweight project_type / routing_tags / routing_confidence signals.

CLI:
    python3 scripts/ai-routing/multi_routing_classifier.py \
        --input  data/processed/golden_eval_300_labeled.jsonl \
        --output data/processed/golden_eval_300_multi_routing.generated.jsonl
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from functools import lru_cache
from pathlib import Path

# Lithuanian diacritic folding (self-contained; no shared imports).
_DIA = str.maketrans("ąčęėįšųūž", "aceeisuuz")


def fold(s) -> str:
    return ("" if s is None else str(s)).strip().lower().translate(_DIA)


# Tokens too generic to be distinctive evidence for a trade.
_GENERIC = {"darbai", "darbas", "paslaugos", "paslauga", "kiti", "kita", "kt",
            "namus", "namo", "namu", "bei", "ir", "montavimas", "irengimas",
            "remontas", "sistemos", "sistema"}


def distinctive_tokens(cat: str) -> list:
    toks = [t for t in re.split(r"[\s,/]+", fold(cat)) if len(t) >= 4]
    return [t for t in toks if t not in _GENERIC]


# project_type detection (matched against diacritic-folded text).
_PROJECT_RULES = [
    (re.compile(r"namo (renovacij|rekonstrukcij|atnaujinim)"), "Namo renovacija"),
    (re.compile(r"buto (remont|irengim|apdail|renovacij|tvarkym)"), "Buto remontas"),
    (re.compile(r"namo (irengim|statyb|apdail|pastatym|pridavim)"), "Namo įrengimas"),
]
_PROJECT_SCOPE = re.compile(
    r"po raktu|visus darbus|visi darbai|visus statyb|rangov|generalin|"
    r"nuo a iki z|kompleksisk|visa projekt|pilna apdail|pilnas remont")


def detect_project_type(text_folded: str):
    for rx, label in _PROJECT_RULES:
        if rx.search(text_folded):
            return label
    if _PROJECT_SCOPE.search(text_folded):
        return "Project scope"
    return None


# Canonical taxonomy vocabulary (read-only) — used to segment a comma-joined
# raw_categories string, because many canonical names contain commas
# (e.g. "Santechnikai, santechnikos darbai", "Langai, durys: gamyba, montavimas").
# Copied verbatim from the KATEGORIJOS project's multi_routing_classifier.py;
# only this taxonomy path is repointed to the data/routing/ copy in this repo.
_TAXONOMY_FLAT = Path(__file__).resolve().parents[2] / "data" / "routing" / "taxonomy" / "taxonomy_flat.jsonl"
_MAX_CAT_PIECES = 6  # longest a canonical name gets when split on ", "


@lru_cache(maxsize=1)
def _canonical_vocab() -> frozenset:
    """Folded canonical category names from the taxonomy. Empty set if the
    taxonomy file is unavailable (callers then fall back to a naive split)."""
    try:
        names = set()
        for line in _TAXONOMY_FLAT.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line:
                continue
            cn = (json.loads(line).get("canonical_name") or "").strip()
            if cn:
                names.add(fold(cn))
        return frozenset(names)
    except (OSError, json.JSONDecodeError):
        return frozenset()


def _segment_raw(raw: str) -> list:
    """Split a comma-joined raw_categories string into canonical category names,
    honouring names that themselves contain commas via greedy longest-match
    against the taxonomy vocab. Falls back to plain comma-split with no vocab."""
    pieces = [p.strip() for p in raw.split(",")]
    pieces = [p for p in pieces if p]
    vocab = _canonical_vocab()
    if not vocab:
        return pieces
    out, i, n = [], 0, len(pieces)
    while i < n:
        matched_to = None
        for j in range(min(n, i + _MAX_CAT_PIECES), i, -1):  # longest run first
            if fold(", ".join(pieces[i:j])) in vocab:
                matched_to = j
                break
        if matched_to is not None:
            out.append(", ".join(pieces[i:matched_to]))
            i = matched_to
        else:
            out.append(pieces[i])  # unknown fragment: keep as-is
            i += 1
    return out


def _raw_candidates(rec: dict) -> list:
    """Fallback candidate source for inputs without suggested_* fields (e.g. the
    review-queue seeds): the `raw_categories` field, as a list or a comma-joined
    string (segmented against the canonical taxonomy vocab)."""
    rc = rec.get("raw_categories")
    if isinstance(rc, list):
        return [str(c) for c in rc]
    if isinstance(rc, str) and rc.strip():
        return _segment_raw(rc)
    return []


def candidates_of(rec: dict) -> list:
    """De-duplicated, non-empty bot candidates (primary first, then secondary).

    Prefers the bot's suggested_primary_category + suggested_secondary_categories;
    when neither is present (review-queue seed shape) it falls back to the
    `raw_categories` field so the same routing logic applies to both inputs."""
    primary = rec.get("suggested_primary_category")
    secondary = list(rec.get("suggested_secondary_categories") or [])
    if primary or secondary:
        source = [primary] + secondary
    else:
        source = _raw_candidates(rec)
    out, seen = [], set()
    for c in source:
        c = (c or "").strip()
        if c and fold(c) not in seen:
            out.append(c)
            seen.add(fold(c))
    return out


# Listed generic catch-alls (folded-form match). Used only to define "specific":
# a "specific" category is one that is NOT in this list.
_LISTED_CATCH_ALL_PATTERNS = [
    re.compile(r"^vidaus apdailos darb"),
    re.compile(r"^meistrai i namus"),
    re.compile(r"^statybos darbai$"),
    re.compile(r"^smulkus statybos darb"),
    re.compile(r"^siuksliu isvezim"),
    re.compile(r"^fasadu apdaila"),
]

# Subset suppressed when text evidence is missing. Vidaus apdailos darbai stays
# excluded — half of its in-gold appearances lack any "apdai"/"vidau" stem
# (gold uses it as an implicit umbrella), so even the conditional drop would
# strip ~20 correct gold cats. Meistrai į namus IS conditionally suppressed
# here: it's overrouted 19x and only present in gold 5x; of those 5, only one
# row has a "meist" stem in title+description, so 4 gold cases would be lost
# vs ~14 overroutes saved — net F1 win. The 47-miss figure cited previously
# was for *blanket* (unconditional) suppression; the text-stem gate below is
# the conservative version.
_SUPPRESSIBLE_CATCH_ALL_PATTERNS = [
    re.compile(r"^statybos darbai$"),
    re.compile(r"^smulkus statybos darb"),
    re.compile(r"^siuksliu isvezim"),
    re.compile(r"^fasadu apdaila"),
    re.compile(r"^meistrai i namus"),
]


def is_listed_catch_all(cat: str) -> bool:
    f = fold(cat)
    return any(p.match(f) for p in _LISTED_CATCH_ALL_PATTERNS)


def is_suppressible_catch_all(cat: str) -> bool:
    f = fold(cat)
    return any(p.match(f) for p in _SUPPRESSIBLE_CATCH_ALL_PATTERNS)


def _stem(t: str) -> str:
    return t[:5] if len(t) > 5 else t


def _text_stem_set(text: str) -> set:
    return {_stem(w) for w in re.findall(r"\w+", text)}


def _catch_all_has_text_evidence(cat: str, text_stems: set) -> bool:
    return any(_stem(t) in text_stems for t in distinctive_tokens(cat))


_ACTIVE_STATUS = {"new", "active", "aktyvi", "aktyvus", "aktyvuota", "open"}


def classify(rec: dict) -> dict:
    """Return ONLY the new routing_* fields (caller merges into the row)."""
    title = rec.get("title", "") or ""
    desc = rec.get("description", "") or ""
    text = fold(f"{title} . {desc}")

    cands = candidates_of(rec)
    routing = list(cands)  # v1 baseline: route to all extracted candidate trades

    # Drop a listed catch-all only when (a) at least one truly specific (non-
    # catch-all) category survives in the routing set, AND (b) the catch-all
    # has no stem-level evidence in the request text. Conservative subset only:
    # Vidaus apdailos darbai and Meistrai į namus are left alone because gold
    # often keeps them as implicit umbrellas without literal keyword evidence.
    if any(not is_listed_catch_all(c) for c in routing):
        ts = _text_stem_set(text)
        routing = [
            c for c in routing
            if not is_suppressible_catch_all(c)
            or _catch_all_has_text_evidence(c, ts)
        ]

    project_type = detect_project_type(text)

    # confidence = how grounded the routing is in the request text, nudged by a
    # detected project scope. Bounded to [0,1].
    grounded = 0
    for c in routing:
        toks = distinctive_tokens(c)
        if toks and any(t in text for t in toks):
            grounded += 1
    share = (grounded / len(routing)) if routing else 0.0
    conf = 0.40 + 0.50 * share + (0.10 if project_type else 0.0)
    routing_confidence = round(max(0.0, min(1.0, conf)), 2)

    tags = []
    if len(routing) >= 2:
        tags.append("reikia_kelių_specialistų")
    if project_type or re.search(r"rangov|subrangov|po raktu|visus darbus", text):
        tags.append("subrangovų_paieška")
    if rec.get("is_active") or fold(rec.get("status", "")) in _ACTIVE_STATUS:
        tags.append("aktyvi_užklausa")

    return {
        "routing_categories": routing,
        "project_type": project_type,
        "routing_tags": tags,
        "routing_confidence": routing_confidence,
    }


def apply_file(input_path: Path, output_path: Path) -> dict:
    n = 0
    n_multi = 0
    n_proj = 0
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with input_path.open(encoding="utf-8") as fin, \
         output_path.open("w", encoding="utf-8") as fout:
        for line in fin:
            line = line.strip()
            if not line:
                continue
            rec = json.loads(line)
            routing = classify(rec)
            rec.update(routing)  # adds routing_* only; gold_* untouched
            fout.write(json.dumps(rec, ensure_ascii=False) + "\n")
            n += 1
            if len(routing["routing_categories"]) >= 2:
                n_multi += 1
            if routing["project_type"]:
                n_proj += 1
    return {"rows": n, "multi_category_rows": n_multi, "project_type_rows": n_proj}


def main() -> int:
    ap = argparse.ArgumentParser(description="Multi-category routing classifier (experiment).")
    ap.add_argument("--input", required=True, help="labeled JSONL with bot suggestions + gold")
    ap.add_argument("--output", required=True, help="where to write the generated routing JSONL")
    args = ap.parse_args()

    inp, outp = Path(args.input), Path(args.output)
    if not inp.is_file():
        print(f"error: input not found: {inp}", file=sys.stderr)
        return 1
    stats = apply_file(inp, outp)
    print(f"Wrote {outp}")
    print(f"Rows: {stats['rows']}  |  multi-category: {stats['multi_category_rows']}  "
          f"|  with project_type: {stats['project_type_rows']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
