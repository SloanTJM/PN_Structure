/**
 * Enterprise P&L Audit — Year 3 (2029) Verification Script
 *
 * Reproduces the exact projection loop from EnterprisePnlPage.jsx with default
 * parameters, logs all intermediate values for Years 1-3, and runs 10 checks.
 *
 * Usage: node preneed-calc/scripts/audit-year3.mjs
 */

import {
  buildDeathDistribution,
  getScaledRate,
  getGradedScaledRate,
  getGradedBenefitFactor,
} from '../src/calculations.js';

/* ─── Constants (identical to EnterprisePnlPage.jsx) ─── */
const AGE_BANDS = ['40-60', '61-65', '66-70', '71-75', '76-80', '81-85', '86-90'];
const AGE_MIDPOINTS = { '40-60': 50, '61-65': 63, '66-70': 68, '71-75': 73, '76-80': 78, '81-85': 83, '86-90': 88 };
const TERM_KEYS = [3, 5, 10, 20];

const AGENT_RATES = {
  single: {
    '40-60': [10.00], '61-65': [9.40], '66-70': [7.80],
    '71-75': [6.00], '76-80': [4.60], '81-85': [2.40], '86-90': [1.25],
  },
  '3pay': {
    '40-60': [6.72, 2.24, 2.24], '61-65': [6.34, 2.11, 2.11],
    '66-70': [5.66, 1.89, 1.89], '71-75': [5.00, 1.67, 1.67],
    '76-80': [4.33, 1.44, 1.44], '81-85': [3.34, 1.11, 1.11], '86-90': [2.16, 0.72, 0.72],
  },
  '5pay': {
    '40-60': [7.16, 2.39, 2.39], '61-65': [6.80, 2.27, 2.27],
    '66-70': [6.48, 2.16, 2.16], '71-75': [6.00, 2.00, 2.00],
    '76-80': [5.40, 1.80, 1.80], '81-85': [4.08, 1.36, 1.36],
  },
  '10pay': {
    '40-60': [8.16, 2.72, 2.72], '61-65': [7.68, 2.56, 2.56],
    '66-70': [7.44, 2.48, 2.48], '71-75': [6.84, 2.28, 2.28],
    '76-80': [6.14, 2.05, 2.05], '81-85': [4.08, 1.36, 1.36],
  },
  '20pay': {
    '40-60': [6.00, 2.00, 2.00], '61-65': [5.64, 1.88, 1.88],
    '66-70': [4.68, 1.56, 1.56], '71-75': [3.60, 1.20, 1.20],
    '76-80': [2.76, 0.92, 0.92],
  },
};

const DEFAULTS = {
  initialProduction: 20_000_000,
  growthRate: 3,
  projectionYears: 20,
  startYear: 2027,
  mixWL: 35, mixAnnuity: 35, mixGraded: 20, mixTrust: 10,
  mix3Pay: 15, mix5Pay: 35, mix10Pay: 35, mix20Pay: 15,
  mixAge40_60: 20, mixAge61_65: 25, mixAge66_70: 30, mixAge71_75: 15, mixAge76_80: 7, mixAge81_85: 2, mixAge86_90: 1,
  earnRate: 4.5, guaranteedRate: 2,
  financeChargeRate: 7, passThroughTaxRate: 37, premiumTaxRate: 0.875, corporateTaxRate: 21,
  serviceDeliveryCost: 75, baseAdminCost: 200_000, adminGrowthRate: 3, chargebackRate: 5,
  cemeteryMix: 50, perpCareRate: 10, cemeteryMargin: 50, cemeteryCommRate: 7.5,
};

/* ─── Helpers ─── */
const fmt = (v) => v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmtD = (v) => v.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (v) => `${v.toFixed(4)}%`;
const close = (a, b, tol = 0.01) => Math.abs(a - b) <= Math.max(tol, Math.abs(b) * 1e-9);

let passCount = 0;
let failCount = 0;

function check(label, actual, expected, tolerance = 0.01) {
  const ok = close(actual, expected, tolerance);
  if (ok) {
    passCount++;
    console.log(`  ✓ ${label}: ${fmtD(actual)}`);
  } else {
    failCount++;
    console.log(`  ✗ ${label}: got ${fmtD(actual)}, expected ${fmtD(expected)} (diff: ${fmtD(actual - expected)})`);
  }
  return ok;
}

function checkPct(label, actual, expected, tolerance = 0.0001) {
  const ok = Math.abs(actual - expected) <= tolerance;
  if (ok) {
    passCount++;
    console.log(`  ✓ ${label}: ${pct(actual)}`);
  } else {
    failCount++;
    console.log(`  ✗ ${label}: got ${pct(actual)}, expected ${pct(expected)}`);
  }
  return ok;
}

/* ─── Reproduce Projection Engine ─── */
const D = DEFAULTS;
const ageMixes = {
  '40-60': D.mixAge40_60 / 100, '61-65': D.mixAge61_65 / 100, '66-70': D.mixAge66_70 / 100,
  '71-75': D.mixAge71_75 / 100, '76-80': D.mixAge76_80 / 100, '81-85': D.mixAge81_85 / 100,
};
const termMixes = { 3: D.mix3Pay / 100, 5: D.mix5Pay / 100, 10: D.mix10Pay / 100, 20: D.mix20Pay / 100 };
const prodMixes = { wl: D.mixWL / 100, annuity: D.mixAnnuity / 100, graded: D.mixGraded / 100, trust: D.mixTrust / 100 };
const maxYears = D.projectionYears + 5;

// Step 1: Blended mortality
const mortalityCurves = {};
for (const band of AGE_BANDS) {
  const midAge = AGE_MIDPOINTS[band];
  const dist = buildDeathDistribution(midAge, 10000, maxYears);
  mortalityCurves[band] = dist.deaths;
}

const blendedDeathFrac = new Array(maxYears + 1).fill(0);
const blendedSurvival = new Array(maxYears + 1).fill(0);

for (let y = 1; y <= maxYears; y++) {
  for (const band of AGE_BANDS) {
    const deaths = mortalityCurves[band];
    const entry = deaths.find(d => d.year === y);
    if (entry) blendedDeathFrac[y] += (entry.deaths / 10000) * ageMixes[band];
  }
}
blendedSurvival[0] = 1.0;
for (let y = 1; y <= maxYears; y++) {
  blendedSurvival[y] = blendedSurvival[y - 1] - blendedDeathFrac[y];
  if (blendedSurvival[y] < 0) blendedSurvival[y] = 0;
}

// Step 2: Weighted average premium rates
const weightedWLRate = {};
const weightedGradedRate = {};
for (const term of TERM_KEYS) {
  let wlSum = 0, gradedSum = 0;
  for (const band of AGE_BANDS) {
    const midAge = AGE_MIDPOINTS[band];
    const wlRate = getScaledRate(midAge, term);
    const gRate = getGradedScaledRate(midAge, term);
    const w = ageMixes[band];
    if (wlRate != null) wlSum += wlRate * w;
    if (gRate != null) gradedSum += gRate * w;
  }
  weightedWLRate[term] = wlSum;
  weightedGradedRate[term] = gradedSum;
}

// Weighted average commission rates
let commYr1 = 0, commYr2 = 0, commYr3 = 0;
let singlePayCommRate = 0;
for (const band of AGE_BANDS) {
  const rates = AGENT_RATES.single[band];
  if (rates) singlePayCommRate += (rates[0] / 100) * ageMixes[band];
}
for (const term of TERM_KEYS) {
  const termKey = `${term}pay`;
  const termTable = AGENT_RATES[termKey];
  if (!termTable) continue;
  for (const band of AGE_BANDS) {
    const rates = termTable[band];
    if (!rates) continue;
    const w = ageMixes[band] * termMixes[term];
    commYr1 += (rates[0] / 100) * w;
    if (rates[1]) commYr2 += (rates[1] / 100) * w;
    if (rates[2]) commYr3 += (rates[2] / 100) * w;
  }
}
const trustCommRate = 0.0375;
const avgPayTerm = 3 * termMixes[3] + 5 * termMixes[5] + 10 * termMixes[10] + 20 * termMixes[20];

// Step 3: Projection loop (Years 1-3)
const vintages = [];
const yearData = [];
let priorReserves = 0;

for (let Y = 1; Y <= 3; Y++) {
  const newFace = D.initialProduction * Math.pow(1 + D.growthRate / 100, Y - 1);
  const insuranceFace = newFace * (1 - D.cemeteryMix / 100);
  const cemeteryFace = newFace * (D.cemeteryMix / 100);

  const wlFace = insuranceFace * prodMixes.wl;
  const annFace = insuranceFace * prodMixes.annuity;
  const gradedFace = insuranceFace * prodMixes.graded;
  const trustFace = insuranceFace * prodMixes.trust;

  vintages.push({ year: Y, wlFace, annFace, gradedFace, trustFace, totalFace: insuranceFace });

  // ── PREMIUMS ──
  let totalPremiums = 0;
  const annuityPremiums = annFace;
  totalPremiums += annuityPremiums;

  let multiPayPremiums = 0;
  let multiPayNetPremiums = 0;
  for (const V of vintages) {
    const n = Y - V.year;
    for (const term of TERM_KEYS) {
      if (n >= term) continue;
      const survivingFace = V.wlFace * termMixes[term] * blendedSurvival[n];
      multiPayPremiums += survivingFace * (weightedWLRate[term] || 0) * 12;
      multiPayNetPremiums += survivingFace / term;
    }
    for (const term of TERM_KEYS) {
      if (n >= term) continue;
      const survivingFace = V.gradedFace * termMixes[term] * blendedSurvival[n];
      multiPayPremiums += survivingFace * (weightedGradedRate[term] || 0) * 12;
      multiPayNetPremiums += survivingFace / term;
    }
  }
  totalPremiums += multiPayPremiums;
  const premiumLoading = multiPayPremiums - multiPayNetPremiums;

  // ── IN-FORCE ──
  let inForceFace = 0;
  for (const V of vintages) {
    const n = Y - V.year;
    inForceFace += V.totalFace * blendedSurvival[n];
  }

  // ── CLAIMS ──
  let wlClaims = 0, annuityClaims = 0, gradedClaims = 0, totalClaimValue = 0;
  for (const V of vintages) {
    const n = Y - V.year;
    if (n < 1) continue;
    const deathFrac = blendedDeathFrac[n];
    if (!deathFrac) continue;

    wlClaims += V.wlFace * deathFrac * 1.0;
    annuityClaims += V.annFace * deathFrac * Math.pow(1 + D.guaranteedRate / 100, n);
    gradedClaims += V.gradedFace * deathFrac * getGradedBenefitFactor(n);
    totalClaimValue += V.wlFace * deathFrac
      + V.annFace * deathFrac * Math.pow(1 + D.guaranteedRate / 100, n)
      + V.gradedFace * deathFrac * getGradedBenefitFactor(n)
      + V.trustFace * deathFrac;
  }
  const claimsPaid = wlClaims + annuityClaims + gradedClaims;

  // ── TJM LIFE P&L ──
  const investmentIncome = priorReserves * (D.earnRate / 100);
  const grossIncome = investmentIncome + totalPremiums;

  const netPremiumsToReserves = annuityPremiums + multiPayNetPremiums;
  const reserves = priorReserves + netPremiumsToReserves + investmentIncome - claimsPaid;
  const reserveChange = reserves - priorReserves;
  const section807 = reserveChange; // no max(0) clamp

  let commissions = 0;
  commissions += (wlFace + gradedFace) * commYr1;
  commissions += annFace * singlePayCommRate;
  // trust commission NOT charged to TJM Life — moved to FH
  if (Y >= 2) {
    const v1 = vintages.find(v => v.year === Y - 1);
    if (v1) commissions += (v1.wlFace + v1.gradedFace) * commYr2;
  }
  if (Y >= 3) {
    const v2 = vintages.find(v => v.year === Y - 2);
    if (v2) commissions += (v2.wlFace + v2.gradedFace) * commYr3;
  }
  commissions *= (1 - D.chargebackRate / 100);

  const adminCosts = D.baseAdminCost * Math.pow(1 + D.adminGrowthRate / 100, Y - 1);
  const premTax = multiPayPremiums * (D.premiumTaxRate / 100);

  const totalDeductions = section807 + claimsPaid + commissions + adminCosts + premTax;
  const taxableIncome = grossIncome - totalDeductions;
  const taxPaid = Math.max(0, taxableIncome) * (D.corporateTaxRate / 100);
  const effectiveRate = grossIncome > 0 ? (taxPaid / grossIncome) * 100 : 0;

  const tjmNet = investmentIncome + premiumLoading - commissions - adminCosts - premTax - taxPaid;

  // ── FUNERAL HOME P&L ──
  const atNeedMargin = totalClaimValue * (1 - D.serviceDeliveryCost / 100);

  let financeChargeBase = 0;
  for (const V of vintages) {
    const n = Y - V.year;
    if (n >= avgPayTerm) continue;
    financeChargeBase += V.trustFace * blendedSurvival[n];
  }
  const financeChargeIncome = financeChargeBase * (D.financeChargeRate / 100);

  // ── CEMETERY P&L ──
  const cemeteryGrossProfit = cemeteryFace * (D.cemeteryMargin / 100);
  const cemeteryPerpCare = cemeteryFace * (D.perpCareRate / 100);
  const cemeteryComm = (cemeteryFace - cemeteryPerpCare) * (D.cemeteryCommRate / 100);
  const cemeteryPreTax = cemeteryGrossProfit - cemeteryPerpCare - cemeteryComm;
  const cemeteryTax = cemeteryPreTax * (D.passThroughTaxRate / 100);
  const cemeteryNet = cemeteryPreTax - cemeteryTax;

  const trustComm = trustFace * trustCommRate;
  const fhTax = financeChargeIncome * (D.passThroughTaxRate / 100);
  const fhNet = atNeedMargin + financeChargeIncome - fhTax - trustComm;

  const combinedNet = tjmNet + fhNet + cemeteryNet;

  yearData.push({
    year: Y,
    calendarYear: D.startYear + Y - 1,
    newFace, insuranceFace, cemeteryFace,
    wlFace, annFace, gradedFace, trustFace,
    inForceFace,
    totalPremiums, annuityPremiums, multiPayPremiums, multiPayNetPremiums, premiumLoading,
    reserves, priorReserves: priorReserves, reserveChange, section807,
    investmentIncome, grossIncome,
    commissions, adminCosts, premTax,
    claimsPaid, wlClaims, annuityClaims, gradedClaims, totalClaimValue,
    totalDeductions, taxableIncome, taxPaid, effectiveRate,
    tjmNet,
    atNeedMargin, financeChargeIncome, financeChargeBase, trustComm, fhTax, fhNet,
    cemeteryGrossProfit, cemeteryPerpCare, cemeteryComm, cemeteryPreTax, cemeteryTax, cemeteryNet,
    combinedNet,
  });

  priorReserves = reserves;
}

/* ─── Log All Values ─── */
console.log('═══════════════════════════════════════════════════════════════');
console.log('  Enterprise P&L Audit — Years 1-3 Intermediate Values');
console.log('═══════════════════════════════════════════════════════════════\n');

for (const d of yearData) {
  console.log(`── Year ${d.year} (${d.calendarYear}) ──`);
  console.log(`  New Production:       ${fmt(d.newFace)}`);
  console.log(`  Insurance Face:       ${fmt(d.insuranceFace)}  (WL: ${fmt(d.wlFace)}, Ann: ${fmt(d.annFace)}, Grad: ${fmt(d.gradedFace)}, Trust: ${fmt(d.trustFace)})`);
  console.log(`  Cemetery Face:        ${fmt(d.cemeteryFace)}`);
  console.log(`  In-Force:             ${fmt(d.inForceFace)}`);
  console.log(`  Premiums — Total:     ${fmt(d.totalPremiums)}  (Annuity: ${fmt(d.annuityPremiums)}, MultiPay: ${fmt(d.multiPayPremiums)})`);
  console.log(`  MultiPay Net:         ${fmt(d.multiPayNetPremiums)}  Loading: ${fmt(d.premiumLoading)}`);
  console.log(`  Investment Income:    ${fmt(d.investmentIncome)}`);
  console.log(`  Gross Income:         ${fmt(d.grossIncome)}`);
  console.log(`  Reserves:             ${fmt(d.reserves)}  (prior: ${fmt(d.priorReserves)}, change: ${fmt(d.reserveChange)})`);
  console.log(`  §807 Deduction:       ${fmt(d.section807)}`);
  console.log(`  Claims:               ${fmt(d.claimsPaid)}  (WL: ${fmt(d.wlClaims)}, Ann: ${fmt(d.annuityClaims)}, Grad: ${fmt(d.gradedClaims)})`);
  console.log(`  Total Claim Value:    ${fmt(d.totalClaimValue)}  (incl. trust for FH margin)`);
  console.log(`  Commissions:          ${fmt(d.commissions)}`);
  console.log(`  Admin:                ${fmt(d.adminCosts)}  Premium Tax: ${fmt(d.premTax)}`);
  console.log(`  Total Deductions:     ${fmt(d.totalDeductions)}`);
  console.log(`  Taxable Income:       ${fmt(d.taxableIncome)}`);
  console.log(`  Tax Paid:             ${fmt(d.taxPaid)}  Effective Rate: ${d.effectiveRate.toFixed(2)}%`);
  console.log(`  TJM Life Net:         ${fmt(d.tjmNet)}`);
  console.log(`  At-Need Margin:       ${fmt(d.atNeedMargin)}  FC Income: ${fmt(d.financeChargeIncome)}  Trust Comm: ${fmt(d.trustComm)}`);
  console.log(`  FH Tax:               ${fmt(d.fhTax)}  FH Net: ${fmt(d.fhNet)}`);
  console.log(`  Cemetery Net:         ${fmt(d.cemeteryNet)}  (GP: ${fmt(d.cemeteryGrossProfit)}, PC: ${fmt(d.cemeteryPerpCare)}, Comm: ${fmt(d.cemeteryComm)}, PreTax: ${fmt(d.cemeteryPreTax)}, Tax: ${fmt(d.cemeteryTax)})`);
  console.log(`  Combined Net:         ${fmt(d.combinedNet)}`);
  console.log('');
}

/* ─── 10 Verification Checks (Year 3) ─── */
const y3 = yearData[2]; // Year 3
const y1 = yearData[0];
const y2 = yearData[1];

console.log('═══════════════════════════════════════════════════════════════');
console.log('  10 VERIFICATION CHECKS — Year 3 (2029)');
console.log('═══════════════════════════════════════════════════════════════\n');

// ── CHECK 1: Production Split ──
console.log('CHECK 1: Production Split');
const expectedProd = D.initialProduction * Math.pow(1 + D.growthRate / 100, 2);
check('Total production = $20M × 1.03²', y3.newFace, expectedProd);
check('Insurance face = prod × 50%', y3.insuranceFace, y3.newFace * 0.5);
check('Cemetery face = prod × 50%', y3.cemeteryFace, y3.newFace * 0.5);
const productMixSum = prodMixes.wl + prodMixes.annuity + prodMixes.graded + prodMixes.trust;
checkPct('Product mix sums to 100%', productMixSum * 100, 100);
check('WL face = ins × 35%', y3.wlFace, y3.insuranceFace * 0.35);
check('Annuity face = ins × 35%', y3.annFace, y3.insuranceFace * 0.35);
check('Graded face = ins × 20%', y3.gradedFace, y3.insuranceFace * 0.20);
check('Trust face = ins × 10%', y3.trustFace, y3.insuranceFace * 0.10);
console.log('');

// ── CHECK 2: Premium Collection ──
console.log('CHECK 2: Premium Collection');
// Recalculate manually for Year 3
let manualMultiPay = 0;
let manualMultiPayNet = 0;
for (const V of vintages) {
  const n = 3 - V.year;
  for (const term of TERM_KEYS) {
    if (n >= term) continue;
    const survWL = V.wlFace * termMixes[term] * blendedSurvival[n];
    manualMultiPay += survWL * (weightedWLRate[term] || 0) * 12;
    manualMultiPayNet += survWL / term;
    const survGraded = V.gradedFace * termMixes[term] * blendedSurvival[n];
    manualMultiPay += survGraded * (weightedGradedRate[term] || 0) * 12;
    manualMultiPayNet += survGraded / term;
  }
}
check('Multi-pay premiums match', y3.multiPayPremiums, manualMultiPay);
check('Multi-pay net premiums match', y3.multiPayNetPremiums, manualMultiPayNet);
check('Total premiums = annuity + multi-pay', y3.totalPremiums, y3.annuityPremiums + y3.multiPayPremiums);
check('Loading = gross - net', y3.premiumLoading, y3.multiPayPremiums - y3.multiPayNetPremiums);
// Verify 3-pay vintages from Y1 still active (n=2 < 3)
console.log(`  ℹ Vintage 1 at Y3: n=2 (3-pay active: ${2 < 3}), Vintage 2 at Y3: n=1 (active: ${1 < 3}), Vintage 3 at Y3: n=0 (active: ${0 < 3})`);
console.log('');

// ── CHECK 3: Reserve Calculation ──
console.log('CHECK 3: Reserve Calculation');
const expectedReserves = y2.reserves + y3.annuityPremiums + y3.multiPayNetPremiums + y3.investmentIncome - y3.claimsPaid;
check('Reserves = prior + netPrem + invIncome - claims', y3.reserves, expectedReserves);
check('Prior reserves = Y2 reserves', y3.priorReserves, y2.reserves);
check('Reserve change = current - prior', y3.reserveChange, y3.reserves - y3.priorReserves);
console.log(`  ℹ Loading excluded from reserves: ${fmt(y3.premiumLoading)}`);
console.log('');

// ── CHECK 4: §807 Deduction ──
console.log('CHECK 4: §807 Deduction');
check('§807 = reserve change (no max(0) clamp)', y3.section807, y3.reserveChange);
{
  const wouldBeClipped = Math.max(0, y3.reserveChange);
  const delta = y3.section807 - wouldBeClipped;
  if (Math.abs(delta) < 0.01) {
    console.log('  ℹ Reserve change is positive this year — max(0) would not have mattered');
  } else {
    console.log(`  ℹ max(0) would have clipped §807 by ${fmtD(delta)}`);
  }
}
console.log('');

// ── CHECK 5: Tax Calculation ──
console.log('CHECK 5: Tax Calculation');
check('Gross income = inv income + total premiums', y3.grossIncome, y3.investmentIncome + y3.totalPremiums);
const expectedDeductions = y3.section807 + y3.claimsPaid + y3.commissions + y3.adminCosts + y3.premTax;
check('Total deductions = §807 + claims + comm + admin + premTax', y3.totalDeductions, expectedDeductions);
check('Taxable income = gross - deductions', y3.taxableIncome, y3.grossIncome - y3.totalDeductions);
const expectedTax = Math.max(0, y3.taxableIncome) * (D.corporateTaxRate / 100);
check('Tax paid = max(0, taxable) × 21%', y3.taxPaid, expectedTax);
// Verify loading ≈ deductions - §807 for the "loading funds commissions" intuition
console.log(`  ℹ Loading: ${fmt(y3.premiumLoading)} vs Operating costs (comm+admin+premTax): ${fmt(y3.commissions + y3.adminCosts + y3.premTax)}`);
console.log('');

// ── CHECK 6: TJM Life Net ──
console.log('CHECK 6: TJM Life Net');
const expectedTjmNet = y3.investmentIncome + y3.premiumLoading - y3.commissions - y3.adminCosts - y3.premTax - y3.taxPaid;
check('TJM Net = invIncome + loading - comm - admin - premTax - taxPaid', y3.tjmNet, expectedTjmNet);
// Cross-check: when taxable < 0, tjmNet should equal taxableIncome (no tax)
if (y3.taxableIncome < 0) {
  check('When taxable < 0: tjmNet ≈ taxableIncome', y3.tjmNet, y3.taxableIncome, 1.0);
}
console.log('');

// ── CHECK 7: Claims ──
console.log('CHECK 7: Claims Breakdown');
check('Claims paid = WL + annuity + graded', y3.claimsPaid, y3.wlClaims + y3.annuityClaims + y3.gradedClaims);
// Verify by vintage
let manualWL = 0, manualAnn = 0, manualGraded = 0, manualTotalClaim = 0;
for (const V of vintages) {
  const n = 3 - V.year;
  if (n < 1) continue;
  const deathFrac = blendedDeathFrac[n];
  if (!deathFrac) continue;
  manualWL += V.wlFace * deathFrac;
  manualAnn += V.annFace * deathFrac * Math.pow(1 + D.guaranteedRate / 100, n);
  manualGraded += V.gradedFace * deathFrac * getGradedBenefitFactor(n);
  manualTotalClaim += V.wlFace * deathFrac
    + V.annFace * deathFrac * Math.pow(1 + D.guaranteedRate / 100, n)
    + V.gradedFace * deathFrac * getGradedBenefitFactor(n)
    + V.trustFace * deathFrac;
}
check('WL claims by vintage', y3.wlClaims, manualWL);
check('Annuity claims by vintage (grown)', y3.annuityClaims, manualAnn);
check('Graded claims by vintage (factored)', y3.gradedClaims, manualGraded);
check('Total claim value includes trust', y3.totalClaimValue, manualTotalClaim);
// Annuity growth check: Y1 vintage at n=2 → face × 1.02²
console.log(`  ℹ Annuity growth factor at n=2: ${Math.pow(1.02, 2).toFixed(4)} (1.0404)`);
console.log(`  ℹ Graded benefit factor at n=1: ${getGradedBenefitFactor(1)} (25%), n=2: ${getGradedBenefitFactor(2)} (50%)`);
console.log(`  ℹ Trust claims NOT in claimsPaid (separate entity), but included in totalClaimValue for FH margin`);
console.log('');

// ── CHECK 8: Cemetery ──
console.log('CHECK 8: Cemetery P&L');
const expCemGP = y3.cemeteryFace * (D.cemeteryMargin / 100);
const expCemPC = y3.cemeteryFace * (D.perpCareRate / 100);
const expCemComm = (y3.cemeteryFace - expCemPC) * (D.cemeteryCommRate / 100);
const expCemPreTax = expCemGP - expCemPC - expCemComm;
const expCemTax = expCemPreTax * (D.passThroughTaxRate / 100);
const expCemNet = expCemPreTax - expCemTax;
check('Cemetery GP = face × 50%', y3.cemeteryGrossProfit, expCemGP);
check('Cemetery perp care = face × 10%', y3.cemeteryPerpCare, expCemPC);
check('Cemetery comm = (face - perpCare) × 7.5%', y3.cemeteryComm, expCemComm);
check('Cemetery pre-tax = GP - PC - comm', y3.cemeteryPreTax, expCemPreTax);
check('Cemetery tax = preTax × 37%', y3.cemeteryTax, expCemTax);
check('Cemetery net = preTax - tax', y3.cemeteryNet, expCemNet);
console.log('');

// ── CHECK 9: FH Net ──
console.log('CHECK 9: Funeral Home P&L');
const expAtNeed = y3.totalClaimValue * (1 - D.serviceDeliveryCost / 100);
check('At-need margin = totalClaimValue × (1 - 75%)', y3.atNeedMargin, expAtNeed);
// Finance charge
let manualFCBase = 0;
for (const V of vintages) {
  const n = 3 - V.year;
  if (n >= avgPayTerm) continue;
  manualFCBase += V.trustFace * blendedSurvival[n];
}
const expFCIncome = manualFCBase * (D.financeChargeRate / 100);
check('Finance charge income', y3.financeChargeIncome, expFCIncome);
const expTrustComm = y3.trustFace * trustCommRate;
check('Trust commission = trustFace × 3.75%', y3.trustComm, expTrustComm);
const expFHtax = y3.financeChargeIncome * (D.passThroughTaxRate / 100);
check('FH tax = FC income × 37%', y3.fhTax, expFHtax);
const expFHnet = y3.atNeedMargin + y3.financeChargeIncome - y3.fhTax - y3.trustComm;
check('FH net = atNeed + FC - fhTax - trustComm', y3.fhNet, expFHnet);
console.log('');

// ── CHECK 10: Combined ──
console.log('CHECK 10: Combined Net');
const expCombined = y3.tjmNet + y3.fhNet + y3.cemeteryNet;
check('Combined = TJM Life + FH + Cemetery', y3.combinedNet, expCombined);
console.log('');

/* ─── Summary ─── */
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  RESULTS: ${passCount} passed, ${failCount} failed out of ${passCount + failCount} checks`);
console.log('═══════════════════════════════════════════════════════════════');

if (failCount > 0) {
  process.exit(1);
}
