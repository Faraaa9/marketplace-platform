#!/usr/bin/env python3
"""Category Intelligence scoring adapter — OFFLINE, SHADOW-ONLY.

Turns the phrase-level "category brain" produced by
`analyze_category_phrases.py` (phrase_category_stats.json +
category_phrase_summary.json) into a structured *signal* for a single request:
matched phrases, soft category boosts, ambiguity signals, redirect hints, and a
review trigger.

DESIGN CONTRACT (do not weaken without re-running the shadow eval):
  * This is a SCORING / AMBIGUITY signal, never a hard rule. It NEVER selects a
    category on its own and NEVER overrides the production router.
  * Strong phrases may raise a category's score (moderate boost).
  * Medium phrases give a small boost only.
  * Ambiguous phrases do NOT get an aggressive boost — they raise
    `should_trigger_review` / ambiguity signals and ask for context.
  * Weak phrases are ignored (debug only).
  * Redirect hints act as a *corrective* nudge (suppress the wrong category,
    nudge the better one), only when the redirect token is literally present.

The text normalization + phrase extraction here is a faithful mirror of
`scripts/ai-routing/analyze_category_phrases.py` in the
"KATEGORIJOS + 200K-uzklausu" project, so extracted phrases match the dataset
keys exactly. Keep the two in sync if the analysis side changes.

NOT wired into any production router, API route, lead-sending, DB, or UI.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path

# --------------------------------------------------------------------------- #
# Scoring configuration — TUNE HERE. Everything that controls how aggressive   #
# the phrase signal is lives in this one block.                                #
# --------------------------------------------------------------------------- #
SCORING = {
    # A strong phrase only boosts when it is this confident about its top cat.
    "strong_min_share": 0.85,
    "strong_boost": 0.18,          # moderate; must not single-handedly win
    "medium_boost": 0.06,          # small supporting signal
    # Ambiguous phrases: tiny distribution-weighted boost, only for the
    # categories that own a meaningful share. They mainly raise review.
    "ambiguous_share_floor": 0.10,  # ignore distribution tails below this
    "ambiguous_boost_scale": 0.08,  # boost = scale * share (so <= ~0.08)
    "ambiguous_top_k": 3,           # how many distribution cats to surface
    # Redirect hints (corrective): suppress the over-claimed category, nudge the
    # better one. Applied only when the redirect token is literally in the text.
    "redirect_suppress": 0.15,
    "redirect_boost": 0.12,
    # Hard cap on the net boost any single category can accumulate.
    "max_boost_per_category": 0.25,
    # Review triggers.
    "review_on_ambiguous": True,    # any ambiguous matched phrase -> review
    "review_on_redirect": True,     # a fired redirect hint -> review
    "review_on_strong_conflict": True,  # 2+ strong phrases, different cats
}

# Default data locations (repo-relative). Override via CategoryIntelligence(...).
_REPO_ROOT = Path(__file__).resolve().parents[2]
_DEFAULT_STATS = _REPO_ROOT / "data/routing/category-intelligence/phrase_category_stats.json"
_DEFAULT_SUMMARY = _REPO_ROOT / "data/routing/category-intelligence/category_phrase_summary.json"

# --------------------------------------------------------------------------- #
# Lithuanian text helpers — MIRROR of analyze_category_phrases.py.             #
# --------------------------------------------------------------------------- #
_DIA = str.maketrans("ąčęėįšųūž", "aceeisuuz")


def fold(s) -> str:
    """Diacritic-fold + lowercase, for matching (not for display)."""
    return ("" if s is None else str(s)).strip().lower().translate(_DIA)


_NORM_RX = re.compile(r"[^0-9a-ząčęėįšųūž\s]")
_WS_RX = re.compile(r"\s+")


def normalize(s) -> str:
    s = ("" if s is None else str(s)).lower()
    s = _NORM_RX.sub(" ", s)
    return _WS_RX.sub(" ", s).strip()


NGRAM_SIZES = (2, 3, 4, 5)
MIN_TOKEN_LEN = 3

STOPWORDS = set(fold(w) for w in """
ir bei ar arba o bet kad kaip kai jei jeigu tai yra būti nėra reikia reikalinga
reikalingas reikalingi reikalinga noriu norėčiau ieškau ieškome domina prašau
prašome sveiki labas laba diena dieną aš mes jūs jūsų mano mūsų savo su be iš į
iki nuo per po prie už apie taip ne nei gal galima galite galėtumėte kiek kaina
kainos kainą kainuoja kainuotų kuris kuri kurie kurią tas ta to tą bus turi turiu
turime labai daug mažiau daugiau tik jau dar viso visa visas tiek tada čia ten
man jam jai mums jiems kas ką dėl ant tarp prie pas net gi taigi nes todėl
""".split())

GEO_WORDS = set(fold(w) for w in """
vilnius vilniaus vilniuje kaunas kauno kaune klaipėda klaipėdos klaipėdoje
šiauliai šiaulių šiauliuose panevėžys panevėžio panevėžyje alytus alytaus
marijampolė mažeikiai utena telšiai tauragė ukmergė visaginas plungė kretinga
raj rajonas rajone rajoną rajonai mieste miestas miestą mst apylinkėse vieta
vieta vietoje adresas adresu
""".split())

FILLER_WORDS = set(fold(w) for w in """
pasiūlymų pasiūlymą pasiūlymas pasiūlymai pasiūlyti pasiūlymus kainomis kainą
skubiai skubiau greičiau greitai metu šiuo šiandien gerai būtų galėtų galėtumėte
galima atlikti atlikti kokia koks kokios kokie kokį reikėtų norėtume galėtume
lauksiu laukiu domina kreiptis suteikti paslauga paslaugos paslaugą darbus
darbai darbų darbas variantą variantai galimybę galimybės informaciją informacija
klausimas klausimai sąmatą sąmata pasakyti parašyti susisiekti atsakyti
pridedu nuotraukas nuotrauką nuotraukos savaitę savaitės savaitgalį bendras
plotas planuoju reikalinga reikalingas šiandien rytoj
""".split())

_NONSIGNAL = STOPWORDS | GEO_WORDS | FILLER_WORDS

_JUNK_FOLDED = set(fold(p) for p in [
    "kiek kainuotu", "kiek kainuoja", "kiek kainuos", "domina kaina",
    "kokia kaina", "kokia butu kaina", "laba diena", "labas vakaras",
    "ieskau meistro", "reikalingas meistras", "reikalinga pagalba",
    "kreiptis telefonu", "del kainos", "kaina kada", "kada galetumete",
    "aciu uz", "is anksto aciu", "geros dienos",
])
_JUNK_RX = re.compile(r"\b(tel|telefonu|nr|el pastas|gmail|http|https|www|@)\b")


def junk_phrase(folded_phrase: str) -> bool:
    return folded_phrase in _JUNK_FOLDED or bool(_JUNK_RX.search(folded_phrase))


def request_text(title, description) -> str:
    title = "" if title is None else str(title).strip()
    desc = "" if description is None else str(description).strip()
    if title and desc and fold(desc).startswith(fold(title)):
        return normalize(desc)
    if title and desc:
        return normalize(title + ". " + desc)
    return normalize(title or desc)


def phrases_in(text: str) -> set[str]:
    """Distinct, deduped 2-5 word n-grams worth scoring for one request.
    Byte-for-byte the same filter as analyze_category_phrases.phrases_in."""
    toks = text.split()
    out: set[str] = set()
    n_tok = len(toks)
    for n in NGRAM_SIZES:
        for i in range(n_tok - n + 1):
            g = toks[i:i + n]
            first, last = g[0], g[-1]
            if len(first) < MIN_TOKEN_LEN or len(last) < MIN_TOKEN_LEN:
                continue
            if fold(first) in _NONSIGNAL or fold(last) in _NONSIGNAL:
                continue
            if all(fold(w) in _NONSIGNAL for w in g):
                continue
            if not any(len(w) >= 4 and fold(w) not in _NONSIGNAL for w in g):
                continue
            phrase = " ".join(g)
            if junk_phrase(fold(phrase)):
                continue
            out.add(phrase)
    return out


# --------------------------------------------------------------------------- #
# Curated redirect lexicon — MIRROR of analyze_category_phrases.REDIRECT_LEXICON.
# token (folded substring in the request text) -> better target category. Keyed
# by the category the token tends to be wrongly attached to ("from").
# --------------------------------------------------------------------------- #
REDIRECT_LEXICON = {
    "Santechnikai, santechnikos darbai": {
        "lietvamzdis": "Stogdengiai, stogo darbai",
        "latakas": "Stogdengiai, stogo darbai",
        "latakai": "Stogdengiai, stogo darbai",
        "stogas": "Stogdengiai, stogo darbai",
        "radiatorius": "Katilų montavimas, remontas",
        "radiatoriai": "Katilų montavimas, remontas",
        # Adapter-side additions beyond the analysis mirror — the brief asks that
        # heating gear ("radiatorius, katilas, šildymas") not collapse into the
        # generic Santechnika node when a more specific category exists.
        "katilas": "Katilų montavimas, remontas",
        "katilo": "Katilų montavimas, remontas",
        "katila": "Katilų montavimas, remontas",
        "sildymas": "Katilų montavimas, remontas",
        "rekuperatorius": "Ventiliacija, vėdinimo sistemos",
        "vedinimas": "Ventiliacija, vėdinimo sistemos",
    },
    "Stogdengiai, stogo darbai": {
        "kanalizacija": "Santechnikai, santechnikos darbai",
        "vamzdis": "Santechnikai, santechnikos darbai",
    },
    "Elektrikai, elektros darbai": {
        "rekuperatorius": "Ventiliacija, vėdinimo sistemos",
        "radiatorius": "Katilų montavimas, remontas",
    },
}


# --------------------------------------------------------------------------- #
# Structured signal returned per request.                                      #
# --------------------------------------------------------------------------- #
@dataclass
class CategorySignal:
    matched_phrases: list = field(default_factory=list)
    # Full soft signal incl. ambiguous distribution boosts — for transparency.
    category_boosts: dict = field(default_factory=dict)
    # SAFE-to-re-rank subset: strong + medium + redirect only. Ambiguous phrases
    # are deliberately excluded here so they can never PROMOTE a category — they
    # only raise review. A consumer that re-ranks should use this, not
    # category_boosts. (Brief: ambiguous != selector.)
    ranking_boosts: dict = field(default_factory=dict)
    ambiguity_signals: list = field(default_factory=list)
    redirect_hints: list = field(default_factory=list)
    should_trigger_review: bool = False
    explanation: str = ""

    def to_dict(self) -> dict:
        return {
            "matched_phrases": self.matched_phrases,
            "category_boosts": self.category_boosts,
            "ranking_boosts": self.ranking_boosts,
            "ambiguity_signals": self.ambiguity_signals,
            "redirect_hints": self.redirect_hints,
            "should_trigger_review": self.should_trigger_review,
            "explanation": self.explanation,
        }


class CategoryIntelligence:
    """Loads the phrase brain once, scores requests against it."""

    def __init__(self, stats_path: Path | str = _DEFAULT_STATS,
                 summary_path: Path | str | None = _DEFAULT_SUMMARY,
                 scoring: dict | None = None):
        self.scoring = dict(SCORING)
        if scoring:
            self.scoring.update(scoring)
        self.stats_path = Path(stats_path)
        self.summary_path = Path(summary_path) if summary_path else None
        # phrase index: keyed by BOTH the exact normalized phrase and its folded
        # form, so a query missing diacritics still matches the dataset key.
        self._by_phrase: dict[str, dict] = {}
        self._by_folded: dict[str, dict] = {}
        self.summary: dict = {}
        self._load()

    def _load(self) -> None:
        if not self.stats_path.is_file():
            raise FileNotFoundError(f"phrase stats not found: {self.stats_path}")
        records = json.loads(self.stats_path.read_text(encoding="utf-8"))
        for r in records:
            p = r.get("phrase")
            if not p:
                continue
            self._by_phrase[p] = r
            self._by_folded.setdefault(fold(p), r)
        if self.summary_path and self.summary_path.is_file():
            self.summary = json.loads(self.summary_path.read_text(encoding="utf-8"))

    @property
    def n_phrases(self) -> int:
        return len(self._by_phrase)

    def _lookup(self, phrase: str) -> dict | None:
        return self._by_phrase.get(phrase) or self._by_folded.get(fold(phrase))

    # --- core API --------------------------------------------------------- #
    def analyze(self, title: str = "", description: str = "") -> CategorySignal:
        text = request_text(title, description)
        return self.analyze_text(text)

    def analyze_text(self, normalized_text: str) -> CategorySignal:
        cfg = self.scoring
        sig = CategorySignal()
        boosts: dict[str, float] = {}        # full signal (incl. ambiguous)
        rank_boosts: dict[str, float] = {}   # safe-to-re-rank (no ambiguous)

        def add_boost(cat: str, amount: float, rankable: bool) -> None:
            boosts[cat] = boosts.get(cat, 0.0) + amount
            if rankable:
                rank_boosts[cat] = rank_boosts.get(cat, 0.0) + amount

        # Sort matched phrases by total_count desc so the explanation leads with
        # the most-evidenced signal. Dedup by phrase record id.
        matched_records: list[dict] = []
        seen_phrases: set[str] = set()
        for phrase in phrases_in(normalized_text):
            rec = self._lookup(phrase)
            if not rec or rec["phrase"] in seen_phrases:
                continue
            seen_phrases.add(rec["phrase"])
            matched_records.append(rec)
        matched_records.sort(key=lambda r: -r.get("total_count", 0))

        strong_cats: list[str] = []
        for rec in matched_records:
            strength = rec["strength"]
            top_cat = rec["top_category"]
            share = float(rec.get("top_category_share", 0.0))
            dist = {c: v["share"] for c, v in
                    list(rec.get("category_distribution", {}).items())}
            sig.matched_phrases.append({
                "phrase": rec["phrase"],
                "strength": strength,
                "top_category": top_cat,
                "top_category_share": round(share, 4),
                "category_distribution": {
                    c: round(s, 4) for c, s in
                    list(dist.items())[:cfg["ambiguous_top_k"]]
                },
                "needs_context": bool(rec.get("needs_context", strength != "strong")),
                "total_count": rec.get("total_count", 0),
            })

            if strength == "strong" and share >= cfg["strong_min_share"]:
                add_boost(top_cat, cfg["strong_boost"], rankable=True)
                strong_cats.append(top_cat)
            elif strength == "medium":
                add_boost(top_cat, cfg["medium_boost"], rankable=True)
            elif strength == "ambiguous":
                # Ambiguous: distribution-weighted boost goes into the FULL signal
                # only (transparency) — NOT into rank_boosts, so an ambiguous
                # phrase can never promote a category over the router's pick.
                cats_here = []
                for c, s in list(dist.items())[:cfg["ambiguous_top_k"]]:
                    if s >= cfg["ambiguous_share_floor"]:
                        add_boost(c, cfg["ambiguous_boost_scale"] * s, rankable=False)
                        cats_here.append(c)
                if len(cats_here) >= 2:
                    sig.ambiguity_signals.append({
                        "phrase": rec["phrase"],
                        "categories": cats_here,
                    })
            # weak -> ignored (debug only)

        # Redirect hints: corrective nudge, only when token literally present and
        # the "from" category is in play (matched or already boosted).
        folded_text = fold(normalized_text)
        in_play = set(boosts) | {r["top_category"] for r in matched_records}
        for from_cat, mapping in REDIRECT_LEXICON.items():
            if from_cat not in in_play:
                continue
            for token, to_cat in mapping.items():
                if re.search(rf"\b{re.escape(fold(token))}\b", folded_text):
                    add_boost(from_cat, -cfg["redirect_suppress"], rankable=True)
                    add_boost(to_cat, cfg["redirect_boost"], rankable=True)
                    sig.redirect_hints.append({
                        "token": token, "from": from_cat, "to": to_cat,
                        "source": "curated",
                    })

        # Clamp net boost per category to the configured ceiling (both signs).
        cap = cfg["max_boost_per_category"]

        def _clamp(d: dict) -> dict:
            return {c: round(max(-cap, min(cap, v)), 4)
                    for c, v in d.items() if abs(v) >= 1e-9}
        sig.category_boosts = _clamp(boosts)
        sig.ranking_boosts = _clamp(rank_boosts)

        # Review triggers. Ambiguity only escalates to review when the request is
        # NOT already resolved by a strong phrase — a strong signal that pins one
        # category makes a co-occurring ambiguous n-gram irrelevant. This keeps
        # the review rate meaningful instead of firing on nearly every request.
        reasons: list[str] = []
        if (cfg["review_on_ambiguous"] and sig.ambiguity_signals
                and not strong_cats):
            reasons.append(
                "ambiguous phrase(s): "
                + ", ".join(f"'{a['phrase']}'" for a in sig.ambiguity_signals))
        if cfg["review_on_redirect"] and sig.redirect_hints:
            reasons.append(
                "redirect hint(s): "
                + ", ".join(f"'{h['token']}'->{h['to']}" for h in sig.redirect_hints))
        if cfg["review_on_strong_conflict"] and len(set(strong_cats)) >= 2:
            reasons.append("conflicting strong phrases: " + ", ".join(sorted(set(strong_cats))))
        sig.should_trigger_review = bool(reasons)

        if sig.matched_phrases:
            lead = sig.matched_phrases[0]
            sig.explanation = (
                f"Matched {len(sig.matched_phrases)} phrase(s); "
                f"top '{lead['phrase']}' ({lead['strength']}) -> {lead['top_category']}."
            )
            if reasons:
                sig.explanation += " Review: " + "; ".join(reasons) + "."
        else:
            sig.explanation = "No intelligence phrases matched."
        return sig


# Small CLI for manual inspection: echo the signal for a title/description.
def _cli() -> int:
    import argparse
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--title", default="")
    ap.add_argument("--description", default="")
    ap.add_argument("--stats", default=str(_DEFAULT_STATS))
    args = ap.parse_args()
    ci = CategoryIntelligence(stats_path=args.stats)
    sig = ci.analyze(args.title, args.description)
    print(json.dumps(sig.to_dict(), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(_cli())
