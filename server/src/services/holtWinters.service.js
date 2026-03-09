/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Innovation #C: Holt-Winters Exponential Smoothing (Triple ES)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Replaces the simple OLS linear regression volume forecast with Holt-Winters
 * Triple Exponential Smoothing, which captures:
 *   • Level   (L) — baseline complaint volume
 *   • Trend   (T) — upward / downward momentum
 *   • Season  (S) — day-of-week periodicity (m = 7)
 *
 * Additive Holt-Winters update equations:
 *   Lₜ = α (yₜ − Sₜ₋ₘ) + (1−α)(Lₜ₋₁ + Tₜ₋₁)
 *   Tₜ = β (Lₜ − Lₜ₋₁)  + (1−β) Tₜ₋₁
 *   Sₜ = γ (yₜ − Lₜ)    + (1−γ) Sₜ₋ₘ
 *
 * Forecast for h steps ahead:
 *   Ŷₜ₊ₕ = Lₜ + h·Tₜ + Sₜ₋ₘ₊₁₊((h−1) % m)
 *
 * Optimal (α, β, γ) found via grid-search minimising SSE on a 30-day history.
 * ─────────────────────────────────────────────────────────────────────────────
 */
'use strict';

const Complaint = require('../models/Complaint');

const MS_PER_DAY = 86400000;
const SEASON_LEN = 7;          // weekly seasonality

// ─── Parameter grid for optimisation ─────────────────────────────────────────
const ALPHA_GRID = [0.1, 0.2, 0.3, 0.4, 0.5];
const BETA_GRID  = [0.0, 0.1, 0.2, 0.3];
const GAMMA_GRID = [0.1, 0.2, 0.3, 0.4];

// ─── Core Holt-Winters Implementation ────────────────────────────────────────

/**
 * holtsWinters
 * ────────────
 * Additive triple exponential smoothing.
 * @param {number[]} y      — time series (≥ 2 × SEASON_LEN points recommended)
 * @param {number}   alpha  — level smoothing
 * @param {number}   beta   — trend smoothing
 * @param {number}   gamma  — season smoothing
 * @param {number}   h      — forecast horizon
 * @returns {{ fitted: number[], forecast: number[], L: number, T: number, S: number[] }}
 */
const holtsWinters = (y, alpha, beta, gamma, h = 7) => {
  const m = SEASON_LEN;
  const n = y.length;
  if (n < m * 2) return null;   // not enough data

  // ── Initialisation ──
  // Level: average of first season
  let L = y.slice(0, m).reduce((a, b) => a + b, 0) / m;
  // Trend: average slope over first two seasons
  let T = 0;
  for (let i = 0; i < m; i++) T += (y[m + i] - y[i]) / m;
  T /= m;
  // Seasonal: ratio of each period to the average
  const S = [];
  const firstAvg = L;
  for (let i = 0; i < m; i++) S.push(y[i] - firstAvg);

  // ── Fitting pass ──
  const fitted = [];
  for (let t = m; t < n; t++) {
    const prevL = L, prevT = T;
    const sFactor = S[(t - m) % m] || 0;
    const fit = prevL + prevT + sFactor;
    fitted.push(Math.max(0, fit));

    L = alpha * (y[t] - sFactor) + (1 - alpha) * (prevL + prevT);
    T = beta  * (L - prevL)      + (1 - beta)  * prevT;
    S[(t % m)] = gamma * (y[t] - L) + (1 - gamma) * sFactor;
  }

  // ── Forecast ──
  const forecast = [];
  for (let step = 1; step <= h; step++) {
    const sFactor = S[(n - m + ((step - 1) % m)) % m] || 0;
    forecast.push(Math.max(0, Math.round(L + step * T + sFactor)));
  }

  return { fitted, forecast, L, T, S: [...S] };
};

// ─── Grid-search to find optimal (α, β, γ) ───────────────────────────────────

const sse = (fitted, actual, offsetStart) => {
  let s = 0;
  fitted.forEach((f, i) => { const e = f - (actual[offsetStart + i] || 0); s += e * e; });
  return s;
};

const optimise = (y) => {
  let bestSSE = Infinity;
  let bestParams = { alpha: 0.2, beta: 0.1, gamma: 0.2 };

  for (const a of ALPHA_GRID) {
    for (const b of BETA_GRID) {
      for (const g of GAMMA_GRID) {
        const res = holtsWinters(y, a, b, g, 0);
        if (!res) continue;
        const s = sse(res.fitted, y, SEASON_LEN);
        if (s < bestSSE) { bestSSE = s; bestParams = { alpha: a, beta: b, gamma: g }; }
      }
    }
  }
  return bestParams;
};

// ─── Main: 7-day forecast ─────────────────────────────────────────────────────

/**
 * forecastNextWeekHW
 * ──────────────────
 * Fetches 60 days of daily complaint counts and returns a 7-day forecast.
 *
 * @returns {{
 *   forecast: number,        // total next-7-day volume
 *   dailyForecast: number[], // day-by-day breakdown
 *   trend: 'up'|'down'|'stable',
 *   confidence: number,
 *   method: string,
 *   alpha: number, beta: number, gamma: number
 * }}
 */
const forecastNextWeekHW = async () => {
  const since = new Date(Date.now() - 60 * MS_PER_DAY);

  // Build day-indexed count array from MongoDB aggregation
  const raw = await Complaint.aggregate([
    { $match: { createdAt: { $gte: since }, isActive: true } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  // Fill gaps (days with 0 complaints)
  const countByDate = {};
  raw.forEach(r => { countByDate[r._id] = r.count; });

  const y = [];
  for (let d = 59; d >= 0; d--) {
    const date = new Date(Date.now() - d * MS_PER_DAY);
    const key = date.toISOString().slice(0, 10);
    y.push(countByDate[key] || 0);
  }

  if (y.length < SEASON_LEN * 2) {
    // Fall back to simple average
    const avg = y.reduce((a, b) => a + b, 0) / (y.length || 1);
    return {
      forecast: Math.round(avg * 7),
      dailyForecast: Array(7).fill(Math.round(avg)),
      trend: 'stable',
      confidence: 20,
      method: 'simple_average_fallback',
      alpha: null, beta: null, gamma: null,
    };
  }

  // Optimise hyper-parameters
  const { alpha, beta, gamma } = optimise(y);
  const result = holtsWinters(y, alpha, beta, gamma, 7);

  const lastWeekSum = y.slice(-7).reduce((a, b) => a + b, 0);
  const forecastSum = result.forecast.reduce((a, b) => a + b, 0);

  const pctChange = lastWeekSum === 0 ? 0 : (forecastSum - lastWeekSum) / lastWeekSum;
  const trend = pctChange > 0.05 ? 'up' : pctChange < -0.05 ? 'down' : 'stable';

  // Confidence based on training data density
  const nonZeroDays = y.filter(v => v > 0).length;
  const confidence = Math.min(92, Math.round(40 + (nonZeroDays / 60) * 52));

  return {
    forecast: forecastSum,
    dailyForecast: result.forecast,
    trend,
    confidence,
    lastWeek: lastWeekSum,
    pctChange: Math.round(pctChange * 100),
    method: 'holt_winters',
    alpha, beta, gamma,
  };
};

// ─── Per-category forecast ────────────────────────────────────────────────────

/**
 * forecastByCategory
 * ──────────────────
 * Returns 7-day forecast for each complaint category individually.
 */
const forecastByCategory = async () => {
  const since = new Date(Date.now() - 60 * MS_PER_DAY);
  const raw = await Complaint.aggregate([
    { $match: { createdAt: { $gte: since }, isActive: true } },
    { $group: { _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, category: '$category' }, count: { $sum: 1 } } },
  ]);

  // Group by category
  const byCat = {};
  raw.forEach(r => {
    const { date, category } = r._id;
    if (!byCat[category]) byCat[category] = {};
    byCat[category][date] = r.count;
  });

  const results = [];
  for (const [cat, dateMap] of Object.entries(byCat)) {
    const y = [];
    for (let d = 59; d >= 0; d--) {
      const date = new Date(Date.now() - d * MS_PER_DAY);
      y.push(dateMap[date.toISOString().slice(0, 10)] || 0);
    }
    if (y.length < SEASON_LEN * 2) continue;

    const { alpha, beta, gamma } = optimise(y);
    const res = holtsWinters(y, alpha, beta, gamma, 7);
    if (!res) continue;

    results.push({
      category: cat,
      forecast7: res.forecast.reduce((a, b) => a + b, 0),
      dailyForecast: res.forecast,
      trend: res.T > 0.3 ? 'rising' : res.T < -0.3 ? 'falling' : 'stable',
    });
  }
  return results.sort((a, b) => b.forecast7 - a.forecast7);
};

module.exports = { forecastNextWeekHW, forecastByCategory, holtsWinters };
