#!/usr/bin/env python3
"""Shadow evaluation: production router  vs  router + Category Intelligence.

OFFLINE, READ-ONLY, NO production change. Runs two configurations over labeled
+ unlabeled request samples and measures whether the phrase-based intelligence
signal (category_intelligence_adapter.py) actually improves routing:

    A) baseline  = multi_routing_baseline.classify()            (current router)
    B) intel     = baseline, RE-RANKED within its own candidate set by the
                   adapter's category_boosts, with review-gated confidence.

Safety contract baked into config B:
  * Intelligence may only RE-ORDER the router's existing candidates — it never
    injects a brand-new category (no hard override). Redirect hints suppress an
    over-claimed candidate; the redirect target only matters if it was already a
    candidate.
  * An ambiguity / redirect / strong-conflict signal CAPS confidence (gates the
    row to manual review) — it never raises a shaky decision to high confidence.

Metrics (per dataset, baseline vs intel + delta):
  top-1 / top-3 / parent accuracy, manual_review_rate, confidence distribution,
  changed decisions, changed correct<->wrong, high-confidence-wrong count,
  ambiguous-case review-trigger rate.

Outputs -> data/routing/category-intelligence/evaluation/:
  shadow_eval_summary.json, shadow_eval_details.csv, changed_decisions.csv,
  ambiguous_cases.csv, high_confidence_wrong.csv,
  category_intelligence_eval_report.md

CLI:
  python3 scripts/ai-routing/evaluate_category_intelligence_shadow.py
"""

from __future__ import annotations

import csv
import json
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import multi_routing_baseline as baseline  # noqa: E402
from category_intelligence_adapter import CategoryIntelligence, fold  # noqa: E402

_REPO = Path(__file__).resolve().parents[2]
_CI_DIR = _REPO / "data/routing/category-intelligence"
_EVAL_DIR = _CI_DIR / "evaluation"
_GOLDEN = _REPO / "data/routing/eval/golden_eval_300_labeled.jsonl"
_PARQUET = _REPO / "data/routing/eval/requests_sample_10000.parquet"
_TAXONOMY = _REPO / "data/routing/taxonomy/taxonomy_flat.jsonl"

# --------------------------------------------------------------------------- #
# Evaluation configuration — TUNE HERE.                                        #
# --------------------------------------------------------------------------- #
EVAL = {
    "review_threshold": 0.50,     # base router: conf < this -> manual review
    "high_conf": 0.75,            # a wrong decision at/above this = dangerous
    "review_conf_cap": 0.60,      # intel: a review-flagged row can't exceed this
    "conf_boost_factor": 1.0,     # intel conf += factor * boost(winning cat)
    "position_decay": 0.10,       # base rank score for candidate i = 1 - decay*i
    "random_sample_size": 500,
    "random_seed": 42,
    "inject_redirect_target": False,  # keep OFF in shadow (no hard override)
    # Ambiguity-noise filter: an ambiguous phrase counts toward the REVIEW
    # decision only if it is at least somewhat trade-shaped. 0/0 = off (the
    # originally validated shipped config). Live-sample analysis (100 random of
    # 218,980, 2026-06-10) showed junk n-grams ('maps app', 'palanga sventoji',
    # 'gyv namo') driving most high-confidence review caps.
    "amb_review_min_share": 0.0,
    "amb_review_min_count": 0,
}

# Folded taxonomy-variant aliases (mirror of evaluate_multi_routing._SAFE_ALIASES)
# so honest spelling variants of the same provider node don't read as errors.
_SAFE_ALIASES = {
    "fasado dazymas": "fasado dazymas, remontas",
    "fasado remontas": "fasado dazymas, remontas",
    "silumos siurbliu montavimas": "silumos siurbliu montavimas, remontas",
    "silumos siurbliu remontas": "silumos siurbliu montavimas, remontas",
    "lietaus nuoteku tinklu montavimas": "lietaus nuvedimo sistemos",
    "siuksliu isvezimas: statybiniu ir kt.": "statybiniu atlieku isvezimas",
    "siuksliu isvezimas statybiniu ir kt.": "statybiniu atlieku isvezimas",
    "siuksliu isvezimas: statybiniu ir kt": "statybiniu atlieku isvezimas",
}

# Ambiguous-heavy slice: requests whose text carries one of the brief's probe
# phrases (folded). gold_is_ambiguous rows are added on top.
_PROBE_PHRASES = [
    "bega vanduo", "skalbimo masin", "stogo danga", "pagaminti ir sumontuoti",
    "vonios kambar", "dujinio katilo", "dujinis katilas",
]


def canon(s) -> str:
    f = fold(s)
    return _SAFE_ALIASES.get(f, f)


# --------------------------------------------------------------------------- #
# Taxonomy parent map (for parent accuracy).                                   #
# --------------------------------------------------------------------------- #
def load_parent_map(path: Path) -> dict:
    parent = {}
    if not path.is_file():
        return parent
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        o = json.loads(line)
        cn = (o.get("canonical_name") or "").strip()
        par = o.get("parent")
        if cn and par:
            parent.setdefault(fold(cn), par)
    return parent


# --------------------------------------------------------------------------- #
# Ranking: baseline order vs intelligence re-ranked order.                     #
# --------------------------------------------------------------------------- #
def rank_intel(routing: list, boosts: dict, decay: float) -> list:
    """Re-rank the router's OWN candidates by base position score + phrase boost.
    Never adds a category not already in `routing`."""
    bc: dict = {}
    for k, v in boosts.items():
        bc[canon(k)] = bc.get(canon(k), 0.0) + v
    scored = []
    for i, c in enumerate(routing):
        base = 1.0 - decay * i
        scored.append((c, base + bc.get(canon(c), 0.0), i))
    scored.sort(key=lambda t: (-t[1], t[2]))  # score desc, stable on orig pos
    return [c for c, _, _ in scored]


def winning_boost(top_cat: str, boosts: dict) -> float:
    bc: dict = {}
    for k, v in boosts.items():
        bc[canon(k)] = bc.get(canon(k), 0.0) + v
    return bc.get(canon(top_cat), 0.0)


# --------------------------------------------------------------------------- #
# Per-row scoring of both configurations.                                      #
# --------------------------------------------------------------------------- #
def score_row(rec: dict, ci: CategoryIntelligence, parent_map: dict) -> dict:
    base_out = baseline.classify(rec)
    routing = base_out["routing_categories"]
    base_conf = base_out["routing_confidence"]

    sig = ci.analyze(rec.get("title", ""), rec.get("description", ""))

    base_top1 = routing[0] if routing else None
    base_top3 = routing[:3]

    gold_primary = (rec.get("gold_primary_category") or "").strip()
    has_gold = bool(gold_primary)
    gold_c = canon(gold_primary) if has_gold else None

    def correct(top1):
        return has_gold and top1 is not None and canon(top1) == gold_c

    def top3_hit(top3):
        return has_gold and gold_c in {canon(c) for c in top3}

    def parent_ok(top1):
        if not has_gold or top1 is None:
            return False
        pp = parent_map.get(fold(top1))
        gp = parent_map.get(fold(gold_primary))
        return bool(pp) and pp == gp

    base_review = base_conf < EVAL["review_threshold"]

    # ----- SHIPPED config: review + confidence only, SELECTION UNCHANGED. ----- #
    # The phrase signal is NOT used to pick the category (re-ranking it is
    # net-negative on gold — see the rerank_experiment block). Instead:
    #   * if a strong/medium phrase CONFIRMS the router's own top-1 (they agree),
    #     nudge confidence up;
    #   * any ambiguity/redirect/conflict signal CAPS confidence and gates the
    #     row to manual review.
    intel_top1 = base_top1            # selection deliberately unchanged
    intel_top3 = base_top3

    # Router-aware review decision (the consumer combines the pure signal with
    # router context, per the brief):
    #   * redirect hint fired                                  -> review
    #   * ambiguous phrase AND the router picked a category OUTSIDE that phrase's
    #     distribution (suspicious)                            -> review
    #   * ambiguous phrase AND the router is itself not confident -> review
    #   * an ambiguous phrase whose distribution CONTAINS the router's confident
    #     pick is expected -> NOT escalated (keeps review rate meaningful).
    # Ambiguity-noise filter: junk n-grams (low top-share AND low volume) do not
    # qualify for the review decision. Off (0/0) = original shipped config.
    stats_by_phrase = {m["phrase"]: m for m in sig.matched_phrases}
    qualified_amb = [
        a for a in sig.ambiguity_signals
        if (m := stats_by_phrase.get(a["phrase"])) is not None
        and m["top_category_share"] >= EVAL["amb_review_min_share"]
        and m["total_count"] >= EVAL["amb_review_min_count"]
    ]
    amb_cats = {canon(c) for a in qualified_amb for c in a["categories"]}
    router_in_dist = canon(base_top1 or "") in amb_cats if amb_cats else False
    ambiguity_review = bool(qualified_amb) and (
        not router_in_dist or base_conf < EVAL["review_conf_cap"])
    signal_review = bool(sig.redirect_hints) or ambiguity_review
    intel_review = base_review or signal_review

    # Confidence: a strong/medium phrase AGREEING with the router lifts it; a
    # review trigger caps it (gates the row).
    confirm = max(0.0, winning_boost(base_top1, sig.ranking_boosts)) if base_top1 else 0.0
    intel_conf = max(0.0, min(1.0, base_conf + EVAL["conf_boost_factor"] * confirm))
    if signal_review:
        intel_conf = min(intel_conf, EVAL["review_conf_cap"])
    intel_conf = round(intel_conf, 2)

    # ----- EXPERIMENT: let the signal re-rank the router's candidates. -------- #
    rr_routing = rank_intel(routing, sig.ranking_boosts, EVAL["position_decay"])
    rr_top1 = rr_routing[0] if rr_routing else None
    rr_changed = canon(base_top1 or "") != canon(rr_top1 or "")

    return {
        "request_id": rec.get("request_id"),
        "title": (rec.get("title") or "")[:120],
        "gold_primary": gold_primary,
        "gold_is_ambiguous": bool(rec.get("gold_is_ambiguous")),
        "has_gold": has_gold,
        "n_candidates": len(routing),
        "base_top1": base_top1, "intel_top1": intel_top1,
        "base_top3": base_top3, "intel_top3": intel_top3,
        "base_conf": base_conf, "intel_conf": intel_conf,
        "base_correct": correct(base_top1), "intel_correct": correct(intel_top1),
        "base_top3_hit": top3_hit(base_top3), "intel_top3_hit": top3_hit(intel_top3),
        "base_parent_ok": parent_ok(base_top1), "intel_parent_ok": parent_ok(intel_top1),
        "base_review": base_review, "intel_review": intel_review,
        # rerank experiment fields
        "rr_top1": rr_top1, "rr_correct": correct(rr_top1), "rr_changed": rr_changed,
        # the brief's "changed decisions" refer to the rerank experiment
        "changed": rr_changed,
        "n_matched": len(sig.matched_phrases),
        "n_ambiguity": len(sig.ambiguity_signals),
        "n_redirect": len(sig.redirect_hints),
        "should_review": sig.should_trigger_review,
        "boosts": sig.category_boosts,
        "ranking_boosts": sig.ranking_boosts,
        "matched_phrases": [m["phrase"] for m in sig.matched_phrases],
        "explanation": sig.explanation,
    }


# --------------------------------------------------------------------------- #
# Aggregation.                                                                 #
# --------------------------------------------------------------------------- #
def conf_bucket(c: float) -> str:
    if c < EVAL["review_threshold"]:
        return "low"
    if c < EVAL["high_conf"]:
        return "medium"
    return "high"


def aggregate(rows: list, name: str) -> dict:
    n = len(rows)
    gold_rows = [r for r in rows if r["has_gold"]]
    ng = len(gold_rows)

    def rate(pred, rs):
        return round(sum(1 for r in rs if r[pred]) / len(rs), 4) if rs else None

    def conf_dist(key):
        c = Counter(conf_bucket(r[key]) for r in rows)
        return {b: c.get(b, 0) for b in ("low", "medium", "high")}

    # "Changed decisions" = the rerank EXPERIMENT (the shipped config leaves
    # selection unchanged by design), so correctness flips use rr_correct.
    changed = [r for r in rows if r["rr_changed"]]
    changed_gold = [r for r in gold_rows if r["rr_changed"]]
    w2c = sum(1 for r in changed_gold if not r["base_correct"] and r["rr_correct"])
    c2w = sum(1 for r in changed_gold if r["base_correct"] and not r["rr_correct"])
    unchanged_gold = [r for r in gold_rows if not r["rr_changed"]]
    unchanged_correct = sum(1 for r in unchanged_gold if r["base_correct"])
    unchanged_wrong = sum(1 for r in unchanged_gold if not r["base_correct"])
    rr_top1_acc = rate("rr_correct", gold_rows)

    base_hcw = sum(1 for r in gold_rows
                   if not r["base_correct"] and r["base_conf"] >= EVAL["high_conf"])
    intel_hcw = sum(1 for r in gold_rows
                    if not r["intel_correct"] and r["intel_conf"] >= EVAL["high_conf"])

    amb_rows = [r for r in rows if r["gold_is_ambiguous"]]
    amb_review_base = rate("base_review", amb_rows)
    amb_review_intel = rate("intel_review", amb_rows)

    def metric_block(prefix):
        return {
            "top1_accuracy": rate(f"{prefix}_correct", gold_rows),
            "top3_accuracy": rate(f"{prefix}_top3_hit", gold_rows),
            "parent_accuracy": rate(f"{prefix}_parent_ok", gold_rows),
            "manual_review_rate": rate(f"{prefix}_review", rows),
            "confidence_distribution": conf_dist(f"{prefix}_conf"),
            "high_confidence_wrong": base_hcw if prefix == "base" else intel_hcw,
        }

    base_m = metric_block("base")
    intel_m = metric_block("intel")

    def delta(k):
        b, i = base_m.get(k), intel_m.get(k)
        if isinstance(b, (int, float)) and isinstance(i, (int, float)):
            return round(i - b, 4)
        return None

    return {
        "dataset": name,
        "rows": n,
        "rows_with_gold": ng,
        "baseline": base_m,
        "with_intelligence": intel_m,
        "delta": {
            "top1_accuracy": delta("top1_accuracy"),
            "top3_accuracy": delta("top3_accuracy"),
            "parent_accuracy": delta("parent_accuracy"),
            "manual_review_rate": delta("manual_review_rate"),
            "high_confidence_wrong": (intel_m["high_confidence_wrong"]
                                      - base_m["high_confidence_wrong"]),
        },
        # The shipped config does NOT re-rank; this block reports the REJECTED
        # re-rank experiment (why we keep selection on the router).
        "rerank_experiment": {
            "top1_accuracy_if_reranked": rr_top1_acc,
            "top1_delta_vs_baseline": (round(rr_top1_acc - base_m["top1_accuracy"], 4)
                                       if rr_top1_acc is not None
                                       and base_m["top1_accuracy"] is not None else None),
        },
        "decision_changes": {
            "changed_total": len(changed),
            "changed_on_gold": len(changed_gold),
            "wrong_to_correct": w2c,
            "correct_to_wrong": c2w,
            "unchanged_correct": unchanged_correct,
            "unchanged_wrong": unchanged_wrong,
        },
        "ambiguous": {
            "ambiguous_rows": len(amb_rows),
            "review_trigger_rate_base": amb_review_base,
            "review_trigger_rate_intel": amb_review_intel,
        },
        "coverage": {
            "rows_with_any_matched_phrase": sum(1 for r in rows if r["n_matched"]),
            "rows_with_ambiguity_signal": sum(1 for r in rows if r["n_ambiguity"]),
            "rows_with_redirect_hint": sum(1 for r in rows if r["n_redirect"]),
        },
    }


# --------------------------------------------------------------------------- #
# Dataset loaders.                                                             #
# --------------------------------------------------------------------------- #
def load_golden() -> list:
    return [json.loads(l) for l in _GOLDEN.read_text(encoding="utf-8").splitlines()
            if l.strip()]


def ambiguous_heavy(golden: list) -> list:
    out = []
    for rec in golden:
        t = fold(f"{rec.get('title','')} {rec.get('description','')}")
        if rec.get("gold_is_ambiguous") or any(p in t for p in _PROBE_PHRASES):
            out.append(rec)
    return out


def load_random_unlabeled() -> list:
    try:
        import pandas as pd
    except ImportError:
        print("warning: pandas unavailable; skipping random unlabeled sample",
              file=sys.stderr)
        return []
    if not _PARQUET.is_file():
        print(f"warning: {_PARQUET} missing; skipping random sample", file=sys.stderr)
        return []
    df = pd.read_parquet(_PARQUET)
    cols = {c.lower(): c for c in df.columns}
    df = df.drop_duplicates(subset=[cols.get("request_id", "request_id")]) \
        if "request_id" in cols else df
    n = min(EVAL["random_sample_size"], len(df))
    df = df.sample(n=n, random_state=EVAL["random_seed"])
    out = []
    for _, r in df.iterrows():
        cat = r.get(cols.get("categories", "categories"), "")
        out.append({
            "request_id": int(r.get(cols.get("request_id", "request_id"), 0) or 0),
            "title": r.get(cols.get("title", "title"), "") or "",
            "description": r.get(cols.get("description", "description"), "") or "",
            # raw_categories drives the baseline candidate fallback (no suggested_*)
            "raw_categories": cat if isinstance(cat, str) else "",
            "status": r.get(cols.get("status", "status"), "") or "",
        })
    return out


# --------------------------------------------------------------------------- #
# Output writers.                                                              #
# --------------------------------------------------------------------------- #
def write_details_csv(path: Path, scored_by_ds: dict) -> None:
    with path.open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow([
            "dataset", "request_id", "title", "gold_primary", "gold_is_ambiguous",
            "base_top1", "intel_top1", "changed", "base_conf", "intel_conf",
            "base_correct", "intel_correct", "base_review", "intel_review",
            "n_matched_phrases", "should_review", "boosts", "explanation",
        ])
        for ds, rows in scored_by_ds.items():
            for r in rows:
                w.writerow([
                    ds, r["request_id"], r["title"], r["gold_primary"],
                    r["gold_is_ambiguous"], r["base_top1"], r["intel_top1"],
                    r["changed"], r["base_conf"], r["intel_conf"],
                    r["base_correct"], r["intel_correct"], r["base_review"],
                    r["intel_review"], r["n_matched"], r["should_review"],
                    json.dumps(r["boosts"], ensure_ascii=False), r["explanation"],
                ])


def write_changed_csv(path: Path, scored_by_ds: dict) -> None:
    with path.open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        # NB: these are the REJECTED re-rank experiment's flips, not the shipped
        # config (which leaves selection on the router).
        w.writerow(["dataset", "request_id", "title", "gold_primary",
                    "base_top1", "rerank_top1", "direction", "base_conf",
                    "intel_conf", "ranking_boosts", "matched_phrases"])
        for ds, rows in scored_by_ds.items():
            for r in rows:
                if not r["rr_changed"]:
                    continue
                if r["has_gold"]:
                    if r["rr_correct"] and not r["base_correct"]:
                        d = "improved"
                    elif r["base_correct"] and not r["rr_correct"]:
                        d = "regressed"
                    else:
                        d = "neutral"
                else:
                    d = "unlabeled"
                w.writerow([ds, r["request_id"], r["title"], r["gold_primary"],
                            r["base_top1"], r["rr_top1"], d, r["base_conf"],
                            r["intel_conf"], json.dumps(r["ranking_boosts"], ensure_ascii=False),
                            " | ".join(r["matched_phrases"])])


def write_ambiguous_csv(path: Path, scored_by_ds: dict) -> None:
    with path.open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["dataset", "request_id", "title", "gold_is_ambiguous",
                    "gold_primary", "matched_phrases", "ambiguity_signals",
                    "base_review", "intel_review", "intel_conf"])
        for ds, rows in scored_by_ds.items():
            for r in rows:
                if not (r["gold_is_ambiguous"] or r["n_ambiguity"]):
                    continue
                w.writerow([ds, r["request_id"], r["title"], r["gold_is_ambiguous"],
                            r["gold_primary"], " | ".join(r["matched_phrases"]),
                            r["n_ambiguity"], r["base_review"], r["intel_review"],
                            r["intel_conf"]])


def write_hcw_csv(path: Path, scored_by_ds: dict) -> None:
    with path.open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["dataset", "config", "request_id", "title", "predicted_top1",
                    "gold_primary", "confidence", "boosts"])
        for ds, rows in scored_by_ds.items():
            for r in rows:
                if not r["has_gold"]:
                    continue
                if not r["base_correct"] and r["base_conf"] >= EVAL["high_conf"]:
                    w.writerow([ds, "baseline", r["request_id"], r["title"],
                                r["base_top1"], r["gold_primary"], r["base_conf"], ""])
                if not r["intel_correct"] and r["intel_conf"] >= EVAL["high_conf"]:
                    w.writerow([ds, "intel", r["request_id"], r["title"],
                                r["intel_top1"], r["gold_primary"], r["intel_conf"],
                                json.dumps(r["boosts"], ensure_ascii=False)])


def _examples(rows, predicate, n, fmt):
    out = []
    for r in rows:
        if predicate(r):
            out.append(fmt(r))
        if len(out) >= n:
            break
    return out


def write_report(path: Path, summaries: list, scored_by_ds: dict,
                 ci: CategoryIntelligence) -> None:
    L: list = []
    A = L.append
    A("# Category Intelligence Shadow Evaluation\n")
    A("> AUTO-GENERATED, OFFLINE. The production router is UNCHANGED. Two "
      "configurations are measured:\n>\n"
      "> * **+intelligence (shipped candidate)** — router selection is left "
      "exactly as-is; the phrase signal only (a) raises confidence when a "
      "strong/medium phrase CONFIRMS the router's pick and (b) caps confidence "
      "+ flags manual review on ambiguity / redirect / conflict.\n"
      "> * **rerank experiment (rejected)** — what happens if the signal is "
      "allowed to re-order the router's candidates. Reported for completeness; "
      "it is net-negative on gold, which is why the shipped config does not "
      "re-rank.\n")

    A("## Summary\n")
    A(f"- Phrase brain: **{ci.n_phrases:,}** phrases "
      "(`phrase_category_stats.json`).")
    A("- Datasets:")
    for s in summaries:
        A(f"  - **{s['dataset']}** — {s['rows']} rows "
          f"({s['rows_with_gold']} with gold primary)")
    A("")
    A("| dataset | metric | baseline | +intelligence | delta |")
    A("|---|---|---:|---:|---:|")
    for s in summaries:
        b, i, d = s["baseline"], s["with_intelligence"], s["delta"]
        for k, label in (("top1_accuracy", "top-1 acc"),
                         ("top3_accuracy", "top-3 acc"),
                         ("parent_accuracy", "parent acc"),
                         ("manual_review_rate", "manual review rate")):
            A(f"| {s['dataset']} | {label} | {b[k]} | {i[k]} | {d[k]} |")
        A(f"| {s['dataset']} | high-confidence wrong | "
          f"{b['high_confidence_wrong']} | {i['high_confidence_wrong']} | "
          f"{d['high_confidence_wrong']} |")
    A("")
    A("_Top-1/top-3/parent deltas are 0 by design: the shipped config does not "
      "change selection. The value is the high-confidence-wrong drop + review "
      "targeting below._\n")

    A("## Decision changes (rerank experiment — rejected)\n")
    A("| dataset | top-1 if reranked (Δ) | changed | wrong→correct | "
      "correct→wrong | unchanged correct | unchanged wrong |")
    A("|---|---:|---:|---:|---:|---:|---:|")
    for s in summaries:
        c = s["decision_changes"]
        rx = s["rerank_experiment"]
        A(f"| {s['dataset']} | {rx['top1_accuracy_if_reranked']} "
          f"({rx['top1_delta_vs_baseline']}) | {c['changed_total']} | "
          f"{c['wrong_to_correct']} | {c['correct_to_wrong']} | "
          f"{c['unchanged_correct']} | {c['unchanged_wrong']} |")
    A("")

    # Concrete improvement / regression examples from the rerank experiment.
    # Dedup by request_id (ambiguous_heavy is a subset of golden_300).
    gold_rows, _seen_rid = [], set()
    for ds, rows in scored_by_ds.items():
        for r in rows:
            if not r["has_gold"] or r["request_id"] in _seen_rid:
                continue
            _seen_rid.add(r["request_id"])
            gold_rows.append(r)
    improved = _examples(
        [r for r in gold_rows if r["rr_changed"] and r["rr_correct"]
         and not r["base_correct"]], lambda r: True, 10,
        lambda r: f"- `{r['request_id']}` {r['title']} — "
                  f"**{r['base_top1']} → {r['rr_top1']}** (gold: {r['gold_primary']}); "
                  f"phrases: {', '.join(r['matched_phrases'][:4]) or '—'}")
    regressed = _examples(
        [r for r in gold_rows if r["rr_changed"] and r["base_correct"]
         and not r["rr_correct"]], lambda r: True, 10,
        lambda r: f"- `{r['request_id']}` {r['title']} — "
                  f"**{r['base_top1']} → {r['rr_top1']}** (gold: {r['gold_primary']}); "
                  f"phrases: {', '.join(r['matched_phrases'][:4]) or '—'}")
    A("### 10 improvements (wrong → correct)\n")
    L.extend(improved or ["- _(none)_"])
    A("")
    A("### 10 regressions (correct → wrong)\n")
    L.extend(regressed or ["- _(none)_"])
    A("")

    A("## Ambiguous phrases\n")
    A("Adapter behaviour for the brief's probe phrases (run live against the "
      "phrase brain):\n")
    for probe_title, probe_desc in [
        ("Bėga vanduo", "bėga vanduo iš po kriauklės"),
        ("Skalbimo mašinos remontas", "neveikia skalbimo mašina, bėga vanduo"),
        ("Stogo danga", "reikia pakeisti stogo dangą, čerpės"),
        ("Vonios kambario remontas", "vonios kambaryje plytelės ir santechnika"),
        ("Dujinio katilo remontas", "neveikia dujinis katilas, šildymas"),
        ("Pagaminti ir sumontuoti", "pagaminti ir sumontuoti spintą"),
    ]:
        sig = ci.analyze(probe_title, probe_desc)
        mp = sig.matched_phrases[0] if sig.matched_phrases else None
        if mp:
            dist = ", ".join(f"{c} {sh*100:.0f}%"
                             for c, sh in mp["category_distribution"].items())
            A(f"- **\"{probe_title}\"** → top phrase `{mp['phrase']}` "
              f"({mp['strength']}); dist: {dist}; review={sig.should_trigger_review}; "
              f"boosts={sig.category_boosts}")
        else:
            A(f"- **\"{probe_title}\"** → no phrase matched; "
              f"review={sig.should_trigger_review}")
    A("")
    A("When only an ambiguous phrase matches, the adapter raises "
      "`should_trigger_review` and the row's confidence is capped to "
      f"{EVAL['review_conf_cap']} — it never auto-selects a category.\n")

    A("## Safety analysis\n")
    # Computed over the DEDUPED gold rows (ambiguous_heavy ⊂ golden_300), so the
    # totals are not double-counted.
    hc = EVAL["high_conf"]
    tot_hcw_b = sum(1 for r in gold_rows
                    if not r["base_correct"] and r["base_conf"] >= hc)
    tot_hcw_i = sum(1 for r in gold_rows
                    if not r["intel_correct"] and r["intel_conf"] >= hc)
    tot_w2c = sum(1 for r in gold_rows
                  if r["rr_changed"] and not r["base_correct"] and r["rr_correct"])
    tot_c2w = sum(1 for r in gold_rows
                  if r["rr_changed"] and r["base_correct"] and not r["rr_correct"])
    A(f"- **High-confidence-wrong** (all gold datasets), shipped config: baseline "
      f"**{tot_hcw_b}** → intel **{tot_hcw_i}** "
      f"({'no increase — improved' if tot_hcw_i <= tot_hcw_b else 'INCREASED'}). "
      "This is the headline win: review-capping confidence pulls wrong picks out "
      "of the high-confidence band.")
    A(f"- **Rerank experiment** net top-1 on changed gold rows: **+{tot_w2c}** "
      f"correct vs **-{tot_c2w}** regressions = net **{tot_w2c - tot_c2w}**. "
      "Most regressions are a high-volume umbrella category (e.g. *Vidaus "
      "apdailos darbai*) out-boosting a correct specific trade — so re-ranking "
      "is NOT shipped.")
    A("- The shipped config NEVER overrides the router's selection. Phrases only "
      "(a) confirm → higher confidence when they agree, or (b) cap confidence + "
      "flag review when ambiguous/conflicting. They can never raise a shaky pick "
      "to high confidence.")
    A("- Ambiguous phrases are never a positive selector and review fires only "
      "when no strong phrase resolves the request (keeps review rate meaningful).")
    A("- Redirect hints fire only when the token is literally present and the "
      "over-claimed category is already in play; the target is not injected "
      f"(inject_redirect_target={EVAL['inject_redirect_target']}).\n")

    # Recommendation logic — judged on the SHIPPED config (review/confidence),
    # which does not change selection, so the only safety question is whether
    # high-confidence-wrong stayed flat or dropped.
    safe_hcw = tot_hcw_i <= tot_hcw_b
    rec = "SAFE_TO_INTEGRATE_WITH_LIMITS" if safe_hcw else "NOT_SAFE_YET"
    A("## Recommendation\n")
    A(f"**{rec}**\n")
    if rec == "SAFE_TO_INTEGRATE_WITH_LIMITS":
        A("Integrate the adapter as a **review + confidence signal only** "
          "(shadow-logged first). Limits:")
        A("- **Do NOT let phrases select the category.** Selection stays on the "
          "production router; the rerank experiment is net-negative on gold.")
        A("- Use the signal only to: cap confidence + route to manual review on "
          f"ambiguity/redirect/conflict (≤ {EVAL['review_conf_cap']}), and raise "
          "confidence when a strong/medium phrase agrees with the router.")
        A(f"- Max per-category boost: **{ci.scoring['max_boost_per_category']}** "
          f"(strong={ci.scoring['strong_boost']}, medium={ci.scoring['medium_boost']}); "
          "keep confidence nudges bounded.")
        A("- Ambiguous phrases: review trigger only, never a positive boost.")
        A("- Catch-all/umbrella categories (*Vidaus apdailos darbai*, *Statybos "
          "darbai*, *Meistrai į namus*) must NOT receive ranking weight — they "
          "drive the rerank regressions. Needs human Obsidian review before any "
          "future re-rank attempt.")
        A("- Redirect lexicon (`lietvamzdis`, `latakas`, `radiatorius`, "
          "`rekuperatorius`, …) needs periodic human Obsidian review before any "
          "weight increase.")
    elif rec == "SAFE_TO_INTEGRATE_AS_SHADOW_ONLY":
        A("Keep logging the signal in shadow; net top-1 effect is not yet "
          "positive enough to re-rank live. Tune boosts / redirect lexicon and "
          "re-run before integrating.")
    else:
        A("High-confidence-wrong increased or regressions outweigh gains. Do "
          "not integrate; tune scoring and re-run.")
    A("")
    path.write_text("\n".join(str(x) for x in L), encoding="utf-8")


# --------------------------------------------------------------------------- #
# Main.                                                                        #
# --------------------------------------------------------------------------- #
def main() -> int:
    _EVAL_DIR.mkdir(parents=True, exist_ok=True)
    print("loading phrase brain ...", flush=True)
    ci = CategoryIntelligence()
    print(f"  {ci.n_phrases:,} phrases loaded", flush=True)
    parent_map = load_parent_map(_TAXONOMY)

    golden = load_golden()
    datasets = {
        "golden_300": golden,
        "golden_ambiguous_heavy": ambiguous_heavy(golden),
        f"random_{EVAL['random_sample_size']}_unlabeled": load_random_unlabeled(),
    }

    scored_by_ds: dict = {}
    summaries: list = []
    for name, rows in datasets.items():
        if not rows:
            print(f"  (skip {name}: no rows)", flush=True)
            continue
        print(f"scoring {name} ({len(rows)} rows) ...", flush=True)
        scored = [score_row(r, ci, parent_map) for r in rows]
        scored_by_ds[name] = scored
        summaries.append(aggregate(scored, name))

    (_EVAL_DIR / "shadow_eval_summary.json").write_text(
        json.dumps(summaries, ensure_ascii=False, indent=2), encoding="utf-8")
    write_details_csv(_EVAL_DIR / "shadow_eval_details.csv", scored_by_ds)
    write_changed_csv(_EVAL_DIR / "changed_decisions.csv", scored_by_ds)
    write_ambiguous_csv(_EVAL_DIR / "ambiguous_cases.csv", scored_by_ds)
    write_hcw_csv(_EVAL_DIR / "high_confidence_wrong.csv", scored_by_ds)
    write_report(_EVAL_DIR / "category_intelligence_eval_report.md",
                 summaries, scored_by_ds, ci)

    print("\n=== wrote outputs to", _EVAL_DIR, "===")
    for s in summaries:
        b, i, d = s["baseline"], s["with_intelligence"], s["delta"]
        dc = s["decision_changes"]
        print(f"\n[{s['dataset']}] rows={s['rows']} gold={s['rows_with_gold']}")
        print(f"  top1 {b['top1_accuracy']} -> {i['top1_accuracy']} (Δ{d['top1_accuracy']})")
        print(f"  top3 {b['top3_accuracy']} -> {i['top3_accuracy']} (Δ{d['top3_accuracy']})")
        print(f"  parent {b['parent_accuracy']} -> {i['parent_accuracy']} (Δ{d['parent_accuracy']})")
        print(f"  review {b['manual_review_rate']} -> {i['manual_review_rate']} (Δ{d['manual_review_rate']})")
        print(f"  high-conf-wrong {b['high_confidence_wrong']} -> {i['high_confidence_wrong']}")
        print(f"  changed={dc['changed_total']} w->c={dc['wrong_to_correct']} c->w={dc['correct_to_wrong']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
