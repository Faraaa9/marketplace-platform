/**
 * Margin → confidence calibration for category suggestions.
 *
 * The deterministic suggester ranks candidates by a lexical score. Raw score is
 * not a probability, so the old confidence (0.3 + ratio*0.65, capped 0.95) was
 * meaningless — the #1 always scored 0.95 because its ratio-to-itself is 1.
 *
 * Instead we use the SEPARATION between the #1 and #2 final candidates as the
 * signal: a runaway #1 is trustworthy, a near-tie is not.
 *
 *   margin = (s1 - s2) / s1     (in [0,1]; 1.0 when there is no runner-up)
 *
 * `ISOTONIC` below is a monotonic non-decreasing fit of margin → empirical
 * P(top-1 == gold_primary), fitted OFFLINE on the labeled golden_300 set with
 * pool-adjacent-violators (PAV). It is a piecewise-constant step function.
 *
 * The fitted P(correct) tops out near 0.75 (Stage-1's ceiling) and bottoms near
 * 0.12. We then linearly rescale that monotone range into a DISPLAY band
 * [DISPLAY_FLOOR, DISPLAY_CEIL]. Why a floor instead of emitting raw P(correct):
 * the eval/runtime ambiguity gate hedges when confidence < 0.6. On this scorer,
 * ambiguous and non-ambiguous requests have statistically indistinguishable
 * margins (both median ≈ 0.08) — there is a large mass of exact ties at
 * margin ≈ 0 in BOTH classes. So any sub-0.6 confidence drives the false-alarm
 * rate to ~80-90% without lifting ambiguity recall in proportion. Flooring the
 * display at 0.6 keeps the false-alarm rate at the structural baseline (~13%)
 * while preserving the full ORDERING for downstream per-label selection. The
 * ambiguity gate therefore stays driven by the structural heuristic until a
 * stronger retriever (Phase 2/3) can actually separate ambiguity from
 * scorer-weakness. See scripts/fit-confidence-calibration.ts.
 *
 * Regenerate ISOTONIC offline if the scorer or golden set changes.
 */

export interface CalibrationPoint {
  /** lower bound of the margin bin (inclusive) */
  m: number;
  /** fitted empirical P(top-1 correct) for margins in [m, next.m) */
  p: number;
}

/** PAV isotonic fit on golden_300 (margin → P(top-1 correct)). Deduped to the
 *  last p per distinct m. Fitted by scripts/fit-confidence-calibration.ts. */
export const ISOTONIC: CalibrationPoint[] = [
  { m: 0, p: 0.121 },
  { m: 0.03, p: 0.125 },
  { m: 0.04, p: 0.24 },
  { m: 0.24, p: 0.333 },
  { m: 0.29, p: 0.471 },
  { m: 0.36, p: 0.667 },
  { m: 0.41, p: 0.75 },
];

const ISO_PMIN = 0.121;
const ISO_PMAX = 0.75;
// Display band: floor at 0.6 so the (fixed) conf<0.6 ambiguity gate is not
// tripped mechanically by Stage-1's many near-ties (see header note).
const DISPLAY_FLOOR = 0.6;
const DISPLAY_CEIL = 0.95;

/** Raw isotonic lookup: margin → fitted P(correct). */
function isotonicP(margin: number): number {
  const m = Number.isFinite(margin) ? Math.max(0, Math.min(1, margin)) : 0;
  let p = ISOTONIC[0]?.p ?? 0;
  for (const bp of ISOTONIC) {
    if (m >= bp.m) p = bp.p;
    else break;
  }
  return p;
}

/**
 * Map a margin to the production confidence in [DISPLAY_FLOOR, DISPLAY_CEIL].
 * Monotonic in margin; preserves the isotonic ordering. Clamped, deterministic.
 */
export function calibrate(margin: number): number {
  const m = Number.isFinite(margin) ? Math.max(0, Math.min(1, margin)) : 0;
  // Offline calibration-fitting hook: emit the raw margin so the fitter can pair
  // it with correctness. Never set in production. (scripts/fit-confidence-calibration.)
  if (process.env.CATEGORY_CALIB_RAW === "1") return m;
  const p = isotonicP(m);
  const t = Math.max(0, Math.min(1, (p - ISO_PMIN) / (ISO_PMAX - ISO_PMIN)));
  const display = DISPLAY_FLOOR + t * (DISPLAY_CEIL - DISPLAY_FLOOR);
  return Math.round(display * 1000) / 1000;
}

/**
 * Margin between the top two final candidate scores. `s1` is the picked #1,
 * `s2` the picked #2 (0 if there is none). Pure, hot-path safe.
 */
export function marginOfScores(s1: number, s2: number): number {
  if (!(s1 > 0)) return 0;
  const second = s2 > 0 ? s2 : 0;
  const margin = (s1 - second) / s1;
  return Math.max(0, Math.min(1, margin));
}
