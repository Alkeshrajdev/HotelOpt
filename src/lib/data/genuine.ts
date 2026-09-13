/**
 * Genuine Performance — did the building actually get more efficient, or did the weather
 * and the guests just move?
 *
 * The honest answer needs a model of what consumption *should* have been. We fit one on
 * the property's own baseline year — an ordinary least-squares regression of monthly
 * consumption on the drivers that are outside the operator's control (degree days) and
 * the ones that are outside the engineer's control (rooms sold, covers served, laundry
 * washed). Apply the fitted model to the reporting year's drivers and you get Expected.
 * Measured minus Expected, as a percentage, is what management actually did.
 *
 *     Genuine % = (Measured − Expected) / Expected      negative = a real saving
 *
 * Three things separate this from arithmetic dressed up as analysis:
 *
 *   The model has to earn the right to be used.  ASHRAE Guideline 14 fit criteria gate
 *   it — CV(RMSE) and NMBE, plus a degrees-of-freedom floor. A model that fails the gates
 *   is not quietly used anyway; the result falls to a simpler tier and says so.
 *
 *   A number inside its own noise is not a finding.  Every Expected carries a prediction
 *   interval. If Measured sits inside it, the verdict is "within the expected range",
 *   not a spurious 1.8 % win.
 *
 *   When the data cannot support a regression, say which weaker method was used.
 *   Tier 1 regression → tier 2 ratio normalisation (per occupied room night) → tier 3
 *   raw year-on-year. Each result names its tier and why it did not qualify for the one
 *   above. This is the same rule the factor library follows: state the gap, never
 *   substitute silently.
 *
 * Reporting years run May → April, the product's convention everywhere.
 */

import { useEffect, useMemo, useState } from "react";
import {
  listActivity,
  listRecords,
  listWeatherMonthly,
  type ActivityRecord,
  type RecordWithProperty,
  type WeatherMonth,
} from "@/lib/api";

/* ─────────────────────────── tunables, all documented ─────────────────────────── */

/**
 * ASHRAE Guideline 14 monthly criteria are CV(RMSE) ≤ 15 % and NMBE ≤ ±5 %. The product
 * runs the CV(RMSE) gate at 25 %, which is IPMVP's looser whole-building allowance: a
 * hotel's monthly consumption carries real operational noise (a refit, a closed floor, a
 * conference) that a five-driver model should not be expected to explain. The number is
 * always shown next to the result so a reader can apply their own standard.
 */
const MAX_CVRMSE = 25;
const MAX_NMBE = 5;
/** Below this many degrees of freedom the fit is describing noise, whatever it scores. */
const MIN_DOF = 6;
/** Fewer reporting months than this and an annual claim is not worth making. */
const MIN_REPORTING_MONTHS = 6;
/** A saving smaller than this is not worth claiming even when it clears the interval. */
const MATERIALITY_PCT = 3;
/** Two-sided confidence for the prediction interval. */
const CONFIDENCE = 0.95;

export type GpTier = "regression" | "ratio" | "raw";
export type GpPillar = "energy" | "water" | "waste";

export const GP_PILLAR_META: Record<GpPillar, { label: string; unit: string }> = {
  energy: { label: "Energy", unit: "MWh" },
  water: { label: "Water", unit: "m³" },
  waste: { label: "Waste", unit: "t" },
};

export type DriverKey = "cdd" | "hdd" | "orn" | "covers" | "laundry";

const DRIVER_META: Record<DriverKey, { label: string; unit: string }> = {
  cdd: { label: "Cooling degree days", unit: "°C·day" },
  hdd: { label: "Heating degree days", unit: "°C·day" },
  orn: { label: "Occupied room nights", unit: "ORN" },
  covers: { label: "F&B covers", unit: "covers" },
  laundry: { label: "Laundry", unit: "kg" },
};

export type GpFit = {
  n: number;
  k: number;
  dof: number;
  r2: number;
  adjR2: number;
  /** Scatter of the baseline fit, as a percentage of mean consumption. */
  cvrmse: number;
  /**
   * Bias of the baseline fit. For OLS with an intercept this is zero by construction —
   * it is reported only so nobody mistakes its absence for an omission. The gate runs on
   * `nmbeCv`, which can actually fail.
   */
  nmbe: number;
  /** Leave-one-out cross-validated bias: what the model does on a month it never saw. */
  nmbeCv: number;
  /** Leave-one-out cross-validated scatter. Always ≥ `cvrmse`; the gap is overfitting. */
  cvrmseCv: number;
  passes: boolean;
  failures: string[];
};

export type GpDriverEffect = {
  key: DriverKey;
  label: string;
  unit: string;
  /** Consumption units per driver unit. */
  coefficient: number;
  /** How much of the change in Expected this driver accounts for, in consumption units. */
  contribution: number;
};

export type GpMonth = {
  month: string;
  measured: number | null;
  expected: number | null;
  low: number | null;
  high: number | null;
};

export type GpResult = {
  pillar: GpPillar;
  unit: string;
  tier: GpTier;
  /** Why this tier, in a sentence a non-analyst can act on. */
  why: string;
  baselineYear: number;
  reportingYear: number;
  measured: number;
  expected: number;
  /** Null when no method could produce an Expected at all. */
  genuinePct: number | null;
  /** Raw year-on-year, for contrast: how much of the headline was just drivers moving. */
  rawPct: number | null;
  interval: { low: number; high: number; confidence: number } | null;
  /** Measured is outside the prediction interval and past the materiality floor. */
  significant: boolean;
  verdict: string;
  drivers: GpDriverEffect[];
  fit: GpFit | null;
  months: GpMonth[];
  /** Anything the reader needs to know before trusting the number. */
  gaps: string[];
};

/* ───────────────────────────────── linear algebra ───────────────────────────────── */

/** Gauss-Jordan inverse with partial pivoting. Returns null if the matrix is singular. */
function invert(a: number[][]): number[][] | null {
  const n = a.length;
  const m = a.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  // Scale reference for the singularity test, so it is relative rather than absolute.
  const scale = Math.max(...a.flat().map(Math.abs), 1e-12);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    if (Math.abs(m[pivot][col]) < scale * 1e-10) return null; // collinear drivers
    [m[col], m[pivot]] = [m[pivot], m[col]];
    const d = m[col][col];
    for (let j = 0; j < 2 * n; j++) m[col][j] /= d;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = m[r][col];
      if (f === 0) continue;
      for (let j = 0; j < 2 * n; j++) m[r][j] -= f * m[col][j];
    }
  }
  return m.map((row) => row.slice(n));
}

type Ols = {
  intercept: number;
  beta: number[];
  /** Inverse of the centred cross-product matrix — needed for prediction intervals. */
  covInv: number[][];
  means: number[];
  n: number;
  k: number;
  sigma2: number;
  fitted: number[];
};

/**
 * Ordinary least squares, fitted on centred data. Centring removes the intercept from the
 * system being solved, which both conditions the matrix better and hands back exactly the
 * covariance term the prediction interval needs.
 */
function ols(X: number[][], y: number[]): Ols | null {
  const n = y.length;
  const k = X[0]?.length ?? 0;
  if (!k || n <= k + 1) return null;

  const means = Array.from({ length: k }, (_, j) => X.reduce((s, r) => s + r[j], 0) / n);
  const yMean = y.reduce((s, v) => s + v, 0) / n;
  const Xc = X.map((r) => r.map((v, j) => v - means[j]));
  const yc = y.map((v) => v - yMean);

  const A = Array.from({ length: k }, (_, i) =>
    Array.from({ length: k }, (_, j) => Xc.reduce((s, r) => s + r[i] * r[j], 0)));
  const b = Array.from({ length: k }, (_, i) => Xc.reduce((s, r, t) => s + r[i] * yc[t], 0));

  const Ainv = invert(A);
  if (!Ainv) return null;

  const beta = Ainv.map((row) => row.reduce((s, v, j) => s + v * b[j], 0));
  const intercept = yMean - beta.reduce((s, bj, j) => s + bj * means[j], 0);
  const fitted = X.map((r) => intercept + r.reduce((s, v, j) => s + v * beta[j], 0));
  const sse = y.reduce((s, v, i) => s + (v - fitted[i]) ** 2, 0);
  const dof = n - k - 1;
  return { intercept, beta, covInv: Ainv, means, n, k, sigma2: sse / dof, fitted };
}

const predictWith = (m: Ols, x: number[]) => m.intercept + x.reduce((s, v, j) => s + v * m.beta[j], 0);

/** Student t, two-sided 95 %. Table to 30 dof, then the normal limit. */
const T95: Record<number, number> = {
  1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571, 6: 2.447, 7: 2.365, 8: 2.306,
  9: 2.262, 10: 2.228, 11: 2.201, 12: 2.179, 13: 2.160, 14: 2.145, 15: 2.131,
  16: 2.120, 17: 2.110, 18: 2.101, 19: 2.093, 20: 2.086, 21: 2.080, 22: 2.074,
  23: 2.069, 24: 2.064, 25: 2.060, 26: 2.056, 27: 2.052, 28: 2.048, 29: 2.045, 30: 2.042,
};
const tValue = (dof: number) => T95[dof] ?? 1.96;

/* ─────────────────────────────────── the engine ─────────────────────────────────── */

export type GpMonthlyPoint = {
  month: string;             // YYYY-MM
  consumption: number | null;
  cdd: number | null;
  hdd: number | null;
  orn: number | null;
  covers: number | null;
  laundry: number | null;
};

const driverValue = (p: GpMonthlyPoint, d: DriverKey) => p[d];

/**
 * Which drivers a pillar is allowed to use. Not every correlation is a mechanism: heating
 * degree days do not drive waste, and a fit that says otherwise has found a coincidence in
 * twelve points. Restricting the candidates first is cheaper than explaining a spurious
 * coefficient later.
 */
const PILLAR_DRIVERS: Record<GpPillar, DriverKey[]> = {
  energy: ["cdd", "hdd", "orn", "covers", "laundry"],
  water: ["cdd", "orn", "covers", "laundry"],   // heating degree days do not draw water
  waste: ["orn", "covers", "laundry"],          // weather does not generate waste
};

/**
 * Choose drivers by forward selection on adjusted R², which penalises a predictor that
 * does not pay for the degree of freedom it costs. With twelve baseline months there is
 * room for two or three drivers, not five — a model with more parameters than the data
 * can support will fit the noise and then fail on the reporting year.
 */
function selectDrivers(baseline: GpMonthlyPoint[], candidates: DriverKey[]) {
  const y = baseline.map((p) => p.consumption!);
  const n = y.length;
  const usable = candidates.filter((d) => {
    const vals = baseline.map((p) => driverValue(p, d));
    if (vals.some((v) => v == null)) return false;
    const nums = vals as number[];
    const mean = nums.reduce((s, v) => s + v, 0) / n;
    const sd = Math.sqrt(nums.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
    // A driver that never moves explains nothing and makes the matrix singular —
    // heating degree days in Singapore, for instance, are zero every month.
    return sd > Math.max(Math.abs(mean) * 1e-6, 1e-9);
  });

  let chosen: DriverKey[] = [];
  let best: { model: Ols; adjR2: number } | null = null;
  const yMean = y.reduce((s, v) => s + v, 0) / n;
  const sst = y.reduce((s, v) => s + (v - yMean) ** 2, 0);

  for (;;) {
    if (n - (chosen.length + 1) - 1 < MIN_DOF) break; // adding one more would spend the last dof
    let round: { d: DriverKey; model: Ols; adjR2: number } | null = null;
    for (const d of usable) {
      if (chosen.includes(d)) continue;
      const cols = [...chosen, d];
      const X = baseline.map((p) => cols.map((c) => driverValue(p, c) as number));
      const m = ols(X, y);
      if (!m) continue;
      // Every driver here can only push consumption up: more degree days, more rooms
      // sold, more covers, more laundry. A negative coefficient is collinearity talking,
      // not physics, and the model would go on to "explain" a warm year as a saving.
      // IPMVP says the same thing — check the signs before you trust the fit.
      if (m.beta.some((b) => b < 0)) continue;
      const sse = y.reduce((s, v, i) => s + (v - m.fitted[i]) ** 2, 0);
      const r2 = sst > 0 ? 1 - sse / sst : 0;
      const adjR2 = 1 - (1 - r2) * (n - 1) / (n - cols.length - 1);
      if (!round || adjR2 > round.adjR2) round = { d, model: m, adjR2 };
    }
    if (!round) break;
    if (best && round.adjR2 <= best.adjR2 + 1e-6) break; // the extra driver does not pay
    chosen = [...chosen, round.d];
    best = { model: round.model, adjR2: round.adjR2 };
  }
  return best ? { drivers: chosen, model: best.model, adjR2: best.adjR2, sst } : null;
}

/** Leave-one-out cross-validation: the only way to get a bias figure that is not zero. */
function loo(baseline: GpMonthlyPoint[], drivers: DriverKey[]) {
  const y = baseline.map((p) => p.consumption!);
  const n = y.length;
  const preds: number[] = [];
  for (let i = 0; i < n; i++) {
    const rest = baseline.filter((_, j) => j !== i);
    const X = rest.map((p) => drivers.map((d) => driverValue(p, d) as number));
    const m = ols(X, rest.map((p) => p.consumption!));
    if (!m) return null;
    preds.push(predictWith(m, drivers.map((d) => driverValue(baseline[i], d) as number)));
  }
  const mean = y.reduce((s, v) => s + v, 0) / n;
  const errs = y.map((v, i) => v - preds[i]);
  const rmse = Math.sqrt(errs.reduce((s, e) => s + e * e, 0) / n);
  return {
    cvrmse: mean !== 0 ? (rmse / mean) * 100 : Infinity,
    nmbe: mean !== 0 ? (errs.reduce((s, e) => s + e, 0) / n / mean) * 100 : Infinity,
  };
}

/**
 * Build one pillar's genuine-performance result from a monthly series that already spans
 * both years. `baseline` and `reporting` are the two twelve-month windows.
 */
export function buildGenuine(
  pillar: GpPillar,
  baselineYear: number,
  reportingYear: number,
  baseline: GpMonthlyPoint[],
  reporting: GpMonthlyPoint[],
): GpResult {
  const unit = GP_PILLAR_META[pillar].unit;
  const gaps: string[] = [];
  const base = {
    pillar, unit, baselineYear, reportingYear,
    months: [] as GpMonth[], drivers: [] as GpDriverEffect[], fit: null as GpFit | null,
  };

  const bComplete = baseline.filter((p) => p.consumption != null);
  const rComplete = reporting.filter((p) => p.consumption != null);
  const measured = rComplete.reduce((s, p) => s + p.consumption!, 0);
  const baselineTotal = bComplete.reduce((s, p) => s + p.consumption!, 0);
  const rawPct = baselineTotal > 0 ? ((measured - baselineTotal) / baselineTotal) * 100 : null;

  if (!rComplete.length) {
    return {
      ...base, tier: "raw", why: "No approved consumption in the reporting year.",
      measured: 0, expected: 0, genuinePct: null, rawPct: null, interval: null,
      significant: false, verdict: "Nothing to report yet.",
      gaps: ["The reporting year has no approved records."],
    };
  }
  if (bComplete.length < 12) gaps.push(`The baseline year has ${bComplete.length} approved months, not 12.`);
  if (rComplete.length < 12) gaps.push(`The reporting year has ${rComplete.length} approved months so far.`);

  /* ---- tier 1: regression ---- */
  const weatherKnown = bComplete.every((p) => p.cdd != null && p.hdd != null)
    && rComplete.every((p) => p.cdd != null && p.hdd != null);
  let tierWhy = "";

  if (bComplete.length >= 12 && weatherKnown) {
    const picked = selectDrivers(bComplete, PILLAR_DRIVERS[pillar]);
    if (!picked) {
      tierWhy = "No driver in the baseline year moved enough to fit a model against.";
    } else {
      const { drivers, model, sst } = picked;
      const y = bComplete.map((p) => p.consumption!);
      const n = y.length;
      const yMean = y.reduce((s, v) => s + v, 0) / n;
      const sse = y.reduce((s, v, i) => s + (v - model.fitted[i]) ** 2, 0);
      const r2 = sst > 0 ? 1 - sse / sst : 0;
      const dof = n - drivers.length - 1;
      const cvrmse = yMean !== 0 ? (Math.sqrt(sse / dof) / yMean) * 100 : Infinity;
      const cv = loo(bComplete, drivers);

      const failures: string[] = [];
      if (!(cvrmse <= MAX_CVRMSE)) failures.push(`CV(RMSE) is ${cvrmse.toFixed(1)} %, above the ${MAX_CVRMSE} % limit`);
      if (cv && !(Math.abs(cv.nmbe) <= MAX_NMBE)) failures.push(`cross-validated NMBE is ${cv.nmbe.toFixed(1)} %, outside ±${MAX_NMBE} %`);
      if (dof < MIN_DOF) failures.push(`only ${dof} degrees of freedom`);
      if (!cv) failures.push("the model could not be cross-validated");

      const fit: GpFit = {
        n, k: drivers.length, dof, r2,
        adjR2: 1 - (1 - r2) * (n - 1) / dof,
        cvrmse,
        nmbe: 0,
        nmbeCv: cv?.nmbe ?? NaN,
        cvrmseCv: cv?.cvrmse ?? NaN,
        passes: failures.length === 0,
        failures,
      };

      if (fit.passes) {
        // A month the model cannot cover is dropped, not guessed, and named in the gaps.
        // One activity record still in draft should not cost the other eleven months
        // their regression.
        const usableIdx = reporting
          .map((pt, i) => ({ pt, i }))
          .filter(({ pt }) =>
            pt.consumption != null &&
            drivers.every((d) => {
              const v = driverValue(pt, d);
              return v != null && Number.isFinite(v);
            }))
          .map(({ i }) => i);
        const droppedMonths = reporting
          .filter((pt, i) => pt.consumption != null && !usableIdx.includes(i))
          .map((pt) => pt.month);

        if (usableIdx.length >= MIN_REPORTING_MONTHS) {
          const xs = usableIdx.map((i) => drivers.map((d) => driverValue(reporting[i], d) as number));
          const preds = xs.map((x) => predictWith(model, x));
          const expected = preds.reduce((s, v) => s + v, 0);
          // Measured has to cover exactly the months Expected covers, and the raw
          // comparison has to use the same calendar months a year earlier, or the three
          // numbers are not about the same thing.
          const measuredModelled = usableIdx.reduce((s, i) => s + reporting[i].consumption!, 0);
          const baselineSame = usableIdx.every((i) => baseline[i]?.consumption != null)
            ? usableIdx.reduce((s, i) => s + baseline[i].consumption!, 0)
            : null;
          const rawPctSame = baselineSame && baselineSame > 0
            ? ((measuredModelled - baselineSame) / baselineSame) * 100
            : null;
          if (droppedMonths.length) {
            gaps.push(`${droppedMonths.join(", ")} ${droppedMonths.length === 1 ? "is" : "are"} excluded: consumption is approved but a driver for ${droppedMonths.length === 1 ? "that month" : "those months"} is not. Measured and Expected both cover the remaining ${usableIdx.length} months.`);
          }

          // Variance of the predicted TOTAL. The estimation error is shared across months,
          // so the covariance terms matter — summing twelve separate intervals would
          // understate it. Var(Σŷ) = σ²·[ m + Σᵢⱼ (1/n + dᵢᵀA⁻¹dⱼ) ], where d is the
          // month's driver vector centred on the baseline means.
          const d = xs.map((x) => x.map((v, j) => v - model.means[j]));
          let shared = 0;
          for (let i = 0; i < d.length; i++) {
            for (let j = 0; j < d.length; j++) {
              let q = 0;
              for (let a = 0; a < model.k; a++) {
                for (let b2 = 0; b2 < model.k; b2++) q += d[i][a] * model.covInv[a][b2] * d[j][b2];
              }
              shared += 1 / model.n + q;
            }
          }
          const seTotal = Math.sqrt(model.sigma2 * (d.length + shared));
          const t = tValue(dof);
          const low = expected - t * seTotal;
          const high = expected + t * seTotal;

          const genuinePct = expected !== 0 ? ((measuredModelled - expected) / expected) * 100 : null;
          const outside = measuredModelled < low || measuredModelled > high;
          const material = genuinePct != null && Math.abs(genuinePct) >= MATERIALITY_PCT;
          const significant = outside && material;

          // What each driver contributed to the move in Expected, baseline → reporting.
          const driverEffects: GpDriverEffect[] = drivers.map((dk, j) => {
            const bMean = model.means[j];
            const rMean = xs.reduce((s, x) => s + x[j], 0) / xs.length;
            return {
              key: dk, label: DRIVER_META[dk].label, unit: DRIVER_META[dk].unit,
              coefficient: model.beta[j],
              contribution: model.beta[j] * (rMean - bMean) * xs.length,
            };
          });

          const months: GpMonth[] = reporting.map((p) => {
            const idx = usableIdx.indexOf(reporting.indexOf(p));
            if (idx === -1 || p.consumption == null) {
              return { month: p.month, measured: p.consumption, expected: null, low: null, high: null };
            }
            const e = preds[idx];
            const dm = d[idx];
            let q = 0;
            for (let a = 0; a < model.k; a++) {
              for (let b2 = 0; b2 < model.k; b2++) q += dm[a] * model.covInv[a][b2] * dm[b2];
            }
            const se = Math.sqrt(model.sigma2 * (1 + 1 / model.n + q));
            return { month: p.month, measured: p.consumption, expected: e, low: e - t * se, high: e + t * se };
          });

          if (fit.cvrmseCv > fit.cvrmse * 1.5) {
            gaps.push("The model predicts a held-out month noticeably worse than one it was fitted on, which points to overfitting — treat the margin as indicative.");
          }

          return {
            ...base, tier: "regression",
            why: `Fitted on ${n} baseline months against ${drivers.map((x) => DRIVER_META[x].label.toLowerCase()).join(" and ")}; CV(RMSE) ${cvrmse.toFixed(1)} %, cross-validated NMBE ${(cv?.nmbe ?? 0).toFixed(1)} %.`,
            measured: measuredModelled, expected, genuinePct, rawPct: rawPctSame,
            interval: { low, high, confidence: CONFIDENCE },
            significant,
            verdict: !significant
              ? (outside
                ? `Measured is outside the expected range but the gap is under ${MATERIALITY_PCT} %, too small to call a result.`
                : "Measured sits inside the range the model expected. No efficiency change is demonstrated either way.")
              : genuinePct! < 0
              ? `A genuine ${Math.abs(genuinePct!).toFixed(1)} % below what the drivers predict.`
              : `A genuine ${genuinePct!.toFixed(1)} % above what the drivers predict.`,
            drivers: driverEffects, fit, months, gaps,
          };
        }
        tierWhy = `Only ${usableIdx.length} reporting months have every driver the model needs.`;
      } else {
        tierWhy = `The baseline model did not meet the fit criteria (${failures.join("; ")}).`;
      }
      base.fit = fit;
    }
  } else if (!weatherKnown) {
    tierWhy = "Degree days are missing for some months, so weather cannot be held constant.";
  } else {
    tierWhy = `A regression needs 12 baseline months; ${bComplete.length} are approved.`;
  }

  /* ---- tier 2: ratio normalisation on occupied room nights ---- */
  const bOrn = bComplete.reduce((s, p) => s + (p.orn ?? 0), 0);
  const rOrn = rComplete.reduce((s, p) => s + (p.orn ?? 0), 0);
  if (bOrn > 0 && rOrn > 0 && baselineTotal > 0) {
    // Scale the baseline to the reporting year's months so a part year is not compared
    // against a full one.
    const perOrn = baselineTotal / bOrn;
    const expected = perOrn * rOrn;
    const genuinePct = expected !== 0 ? ((measured - expected) / expected) * 100 : null;
    const material = genuinePct != null && Math.abs(genuinePct) >= MATERIALITY_PCT;
    return {
      ...base, tier: "ratio",
      why: `${tierWhy} Normalised on occupied room nights instead — this holds occupancy constant but not weather.`,
      measured, expected, genuinePct, rawPct, interval: null,
      significant: material,
      verdict: !material
        ? `Within ${MATERIALITY_PCT} % of the occupancy-normalised baseline — no result either way.`
        : genuinePct! < 0
        ? `${Math.abs(genuinePct!).toFixed(1)} % below the occupancy-normalised baseline. Weather is not accounted for.`
        : `${genuinePct!.toFixed(1)} % above the occupancy-normalised baseline. Weather is not accounted for.`,
      drivers: [{
        key: "orn", label: DRIVER_META.orn.label, unit: DRIVER_META.orn.unit,
        coefficient: perOrn, contribution: perOrn * (rOrn - bOrn),
      }],
      months: reporting.map((p) => ({
        month: p.month, measured: p.consumption,
        expected: p.orn != null ? perOrn * p.orn : null, low: null, high: null,
      })),
      gaps: [...gaps, "Ratio normalisation assumes consumption is proportional to occupancy and ignores weather, base load and activity mix."],
    };
  }

  /* ---- tier 3: raw year on year ---- */
  return {
    ...base, tier: "raw",
    why: `${tierWhy} No occupancy data either, so this is the raw year-on-year change.`,
    measured, expected: baselineTotal,
    genuinePct: rawPct, rawPct, interval: null,
    significant: rawPct != null && Math.abs(rawPct) >= MATERIALITY_PCT,
    verdict: "Raw year-on-year change. This is not a performance result — none of the drivers are held constant.",
    drivers: [],
    months: reporting.map((p) => ({ month: p.month, measured: p.consumption, expected: null, low: null, high: null })),
    gaps: [...gaps, "No driver data, so weather and occupancy are not accounted for at all."],
  };
}

/* ──────────────────────────── assembling the monthly series ──────────────────────────── */

const MONTH_ORDER = [5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4];
const ymOf = (d: string) => d.slice(0, 7);

/** The twelve YYYY-MM keys of a reporting year, May → April. */
export function reportingMonths(year: number) {
  return MONTH_ORDER.map((m) => `${m >= 5 ? year : year + 1}-${String(m).padStart(2, "0")}`);
}

const PILLAR_UNIT_DIVISOR: Record<GpPillar, number> = { energy: 1000, water: 1, waste: 1000 };

export function monthlySeries(
  months: string[],
  pillar: GpPillar,
  records: RecordWithProperty[],
  activity: ActivityRecord[],
  weather: WeatherMonth[],
): GpMonthlyPoint[] {
  const approved = records.filter((r) => r.status === "approved" && r.pillar === pillar);
  const act = activity.filter((a) => a.status === "approved");
  const byMonth = new Map(weather.map((w) => [ymOf(w.month), w]));
  const divisor = PILLAR_UNIT_DIVISOR[pillar];

  return months.map((ym) => {
    const rows = approved.filter((r) => ymOf(r.period_start) === ym);
    const acts = act.filter((a) => ymOf(a.period_start) === ym);
    const w = byMonth.get(ym);
    const sum = (f: (a: ActivityRecord) => number | null) =>
      acts.length ? acts.reduce((s, a) => s + (f(a) ?? 0), 0) : null;
    return {
      month: ym,
      // No approved record is a gap, not a zero — a zero would read as a month of
      // perfect efficiency and drag the regression with it.
      consumption: rows.length ? rows.reduce((s, r) => s + Number(r.consumption), 0) / divisor : null,
      cdd: w ? Number(w.cdd) : null,
      hdd: w ? Number(w.hdd) : null,
      orn: sum((a) => a.occupied_room_nights),
      covers: sum((a) => a.fb_covers),
      laundry: sum((a) => a.laundry_kg),
    };
  });
}

/* ────────────────────────────────────── hook ────────────────────────────────────── */

export function usePropertyGenuine(propertyId: string | null, reportingYear: number) {
  const [records, setRecords] = useState<RecordWithProperty[]>([]);
  const [activity, setActivity] = useState<ActivityRecord[]>([]);
  const [weather, setWeather] = useState<WeatherMonth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!propertyId) { setLoading(false); return; }
    let live = true;
    setLoading(true);
    setError(null);
    const from = `${reportingYear - 1}-05-01`;
    const to = `${reportingYear + 1}-05-01`;
    Promise.all([
      listRecords({ propertyId, from, to }),
      listActivity({ propertyId, from, to }),
      listWeatherMonthly({ propertyId, from, to }),
    ])
      .then(([r, a, w]) => { if (live) { setRecords(r); setActivity(a); setWeather(w); } })
      .catch((e) => { if (live) setError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [propertyId, reportingYear]);

  const results = useMemo(() => {
    const baselineMonths = reportingMonths(reportingYear - 1);
    const reportMonths = reportingMonths(reportingYear);
    return (Object.keys(GP_PILLAR_META) as GpPillar[]).map((pillar) =>
      buildGenuine(
        pillar, reportingYear - 1, reportingYear,
        monthlySeries(baselineMonths, pillar, records, activity, weather),
        monthlySeries(reportMonths, pillar, records, activity, weather),
      ));
  }, [records, activity, weather, reportingYear]);

  return { results, loading, error };
}
