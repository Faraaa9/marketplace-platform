#!/usr/bin/env python3
"""Minimal validation for category_intelligence_adapter.

Runnable directly (`python3 test_category_intelligence_adapter.py`) or via
pytest. No third-party deps. Asserts the safety contract from the brief:
loads, empty-on-no-match, finds 'bėga vanduo', 'lietvamzdis' does NOT blindly
boost Santechnika, ambiguous phrases trigger review, a strong phrase boosts.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from category_intelligence_adapter import CategoryIntelligence, fold  # noqa: E402

_CI = None


def ci() -> CategoryIntelligence:
    global _CI
    if _CI is None:
        _CI = CategoryIntelligence()
    return _CI


def _boost_for(boosts: dict, name_substr: str) -> float:
    key = fold(name_substr)
    return sum(v for c, v in boosts.items() if key in fold(c))


def test_loads_json():
    assert ci().n_phrases > 1000, "phrase brain should load thousands of phrases"


def test_empty_on_no_match():
    sig = ci().analyze("zzqq", "wwxx yyzz")
    assert sig.matched_phrases == []
    assert sig.category_boosts == {}
    assert sig.should_trigger_review is False
    assert "No intelligence phrases" in sig.explanation


def test_finds_bega_vanduo():
    sig = ci().analyze("Bėga vanduo", "bėga vanduo per vamzdį po kriaukle")
    phrases = [m["phrase"] for m in sig.matched_phrases]
    assert any("bega vanduo" == fold(p) for p in phrases), phrases


def test_lietvamzdis_not_blindly_santechnika():
    # "lietvamzdis nuo stogo" must NOT push Santechnika up; the curated redirect
    # should suppress it (<= 0) and a redirect hint should fire toward Stogdengiai.
    sig = ci().analyze("Lietvamzdis", "lietvamzdis nuo stogo bėga vanduo lietaus")
    santech = _boost_for(sig.category_boosts, "santechnik")
    assert santech <= 0.0, f"Santechnika should not be boosted, got {santech}"
    assert any(h["token"] == "lietvamzdis" for h in sig.redirect_hints), \
        sig.redirect_hints
    assert any(fold("stogdeng") in fold(h["to"]) for h in sig.redirect_hints)


def test_ambiguous_triggers_review():
    sig = ci().analyze("Bėga vanduo", "bėga vanduo")
    assert sig.matched_phrases, "expected an ambiguous match"
    assert any(m["strength"] == "ambiguous" for m in sig.matched_phrases)
    assert sig.should_trigger_review is True


def test_strong_phrase_boosts_santechnika():
    sig = ci().analyze("Kanalizacijos valymas",
                       "reikia išvalyti kanalizacijos vamzdžius")
    santech = _boost_for(sig.category_boosts, "santechnik")
    assert santech > 0.0, f"strong phrase should boost Santechnika, got {santech}"


def _run_all() -> int:
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    failed = 0
    for t in tests:
        try:
            t()
            print(f"PASS  {t.__name__}")
        except AssertionError as e:
            failed += 1
            print(f"FAIL  {t.__name__}: {e}")
        except Exception as e:  # noqa: BLE001
            failed += 1
            print(f"ERROR {t.__name__}: {type(e).__name__}: {e}")
    print(f"\n{len(tests) - failed}/{len(tests)} passed")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(_run_all())
