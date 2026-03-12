/**
 * Year 1 Detailed Breakdown — Current Headcount-Scaled Comp Model
 * Reproduces EnterprisePnlPage.jsx Year 1 with all intermediate values.
 *
 * Usage: node preneed-calc/scripts/year1-breakdown.mjs
 */

import {
  buildDeathDistribution,
  getScaledRate,
  getGradedScaledRate,
  getGradedBenefitFactor,
} from '../src/calculations.js';

import {
  AGENT_RATES, SEMI_ANNUAL_TIERS, MONTHLY_BONUSES, ANNUAL_BONUSES,
  ROLE_DEFAULTS, BUCKET_DEFAULTS, AFTERCARE_DEFAULTS,
  calcSemiAnnualBonus,
} from '../src/commissionConstants.js';

/* ─── Constants (identical to EnterprisePnlPage.jsx DEFAULTS) ─── */
const AGE_BANDS = ['40-60', '61-65', '66-70', '71-75', '76-80', '81-85', '86-90'];
const AGE_MIDPOINTS = { '40-60': 50, '61-65': 63, '66-70': 68, '71-75': 73, '76-80': 78, '81-85': 83, '86-90': 88 };
const TERM_KEYS = [3, 5, 10, 20];

const D = {
  initialProduction: 20_000_000,
  growthRate: 3,
  projectionYears: 20,
  startYear: 2027,
  mixWL: 35, mixAnnuity: 35, mixGraded: 20, mixTrust: 10,
  mix3Pay: 15, mix5Pay: 35, mix10Pay: 35, mix20Pay: 15,
  mixAge40_60: 20, mixAge61_65: 25, mixAge66_70: 30, mixAge71_75: 15, mixAge76_80: 7, mixAge81_85: 2, mixAge86_90: 1,
  earnRate: 4.5, guaranteedRate: 2,
  financeChargeRate: 7, passThroughTaxRate: 37, premiumTaxRate: 0.875, corporateTaxRate: 21,
  serviceDeliveryCost: 75, chargebackRate: 5,
  volumePerCloser: 2_000_000, volumePerSetter: 6_000_000, aftercareCount: 1,
  closerHourlyWage: ROLE_DEFAULTS.closer.hourlyWage,
  setterHourlyWage: ROLE_DEFAULTS.setter.hourlyWage,
  aftercareHourlyWage: ROLE_DEFAULTS.aftercare.hourlyWage,
  leaderBaseSalary: 125_982,
  pctSetterSourced: BUCKET_DEFAULTS.pctSetterSourced,
  closerSplitPct: BUCKET_DEFAULTS.closerSplitPct,
  aftercareAnnualVolume: BUCKET_DEFAULTS.aftercareAnnualVolume,
  aftercareLeadPct: AFTERCARE_DEFAULTS.aftercareLeadPct,
  specialistShare: AFTERCARE_DEFAULTS.specialistShare,
  cemeteryMix: 50, perpCareRate: 10, cemeteryMargin: 50,
};

const fmt = (v) => v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmtD = (v) => v.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (v) => `${v.toFixed(2)}%`;

/* ─── Setup (same as EnterprisePnlPage.jsx) ─── */
const ageMixes = {};
for (const band of AGE_BANDS) ageMixes[band] = D[`mixAge${band.replace('-', '_')}`] / 100;
const termMixes = { 3: D.mix3Pay / 100, 5: D.mix5Pay / 100, 10: D.mix10Pay / 100, 20: D.mix20Pay / 100 };
const prodMixes = { wl: D.mixWL / 100, annuity: D.mixAnnuity / 100, graded: D.mixGraded / 100, trust: D.mixTrust / 100 };
const maxYears = D.projectionYears + 5;

// Mortality
const mortalityCurves = {};
for (const band of AGE_BANDS) {
  mortalityCurves[band] = buildDeathDistribution(AGE_MIDPOINTS[band], 10000, maxYears).deaths;
}
const blendedDeathFrac = new Array(maxYears + 1).fill(0);
const blendedSurvival = new Array(maxYears + 1).fill(0);
for (let y = 1; y <= maxYears; y++) {
  for (const band of AGE_BANDS) {
    const entry = mortalityCurves[band].find(d => d.year === y);
    if (entry) blendedDeathFrac[y] += (entry.deaths / 10000) * ageMixes[band];
  }
}
blendedSurvival[0] = 1.0;
for (let y = 1; y <= maxYears; y++) {
  blendedSurvival[y] = Math.max(0, blendedSurvival[y - 1] - blendedDeathFrac[y]);
}

// Premium rates
const weightedWLRate = {};
const weightedGradedRate = {};
for (const term of TERM_KEYS) {
  let wlSum = 0, gradedSum = 0;
  for (const band of AGE_BANDS) {
    const midAge = AGE_MIDPOINTS[band];
    const wlRate = getScaledRate(midAge, term);
    const gRate = getGradedScaledRate(midAge, term);
    if (wlRate != null) wlSum += wlRate * ageMixes[band];
    if (gRate != null) gradedSum += gRate * ageMixes[band];
  }
  weightedWLRate[term] = wlSum;
  weightedGradedRate[term] = gradedSum;
}

const avgPayTerm = 3 * termMixes[3] + 5 * termMixes[5] + 10 * termMixes[10] + 20 * termMixes[20];

// Commission helper (same as EnterprisePnlPage.jsx)
const commPageTermKeys = ['single', '3pay', '5pay', '10pay', '20pay'];
const insurProdPct = (prodMixes.wl + prodMixes.annuity + prodMixes.graded + prodMixes.trust);
const preneedPct = insurProdPct > 0 ? (prodMixes.wl + prodMixes.annuity + prodMixes.graded) / insurProdPct * 100 : 0;
const trustPctOfInsurance = insurProdPct > 0 ? prodMixes.trust / insurProdPct * 100 : 0;
const multiPayProdPct = prodMixes.wl + prodMixes.graded;
const annuityProdPct = prodMixes.annuity;
const totalPreneedProd = multiPayProdPct + annuityProdPct;
const singlePayPctOfPreneed = totalPreneedProd > 0 ? (annuityProdPct / totalPreneedProd) * 100 : 0;
const multiPayPctOfPreneed = 100 - singlePayPctOfPreneed;

function calcGrossCommForVolume(annualFaceValue, modelingYear) {
  const mixSinglePay = singlePayPctOfPreneed;
  const termMixScale = multiPayPctOfPreneed / 100;
  const commTermMixes = {
    single: mixSinglePay,
    '3pay': D.mix3Pay * termMixScale,
    '5pay': D.mix5Pay * termMixScale,
    '10pay': D.mix10Pay * termMixScale,
    '20pay': D.mix20Pay * termMixScale,
  };
  const commAgeMixes = {
    '40-60': D.mixAge40_60, '61-65': D.mixAge61_65, '66-70': D.mixAge66_70,
    '71-75': D.mixAge71_75, '76-80': D.mixAge76_80, '81-85': D.mixAge81_85,
  };

  let preneedYr1 = 0, preneedYr2 = 0, preneedYr3 = 0;
  for (const term of commPageTermKeys) {
    const termTable = AGENT_RATES[term];
    for (const age of AGE_BANDS) {
      if (!termTable[age]) continue;
      const weight = (commAgeMixes[age] / 100) * (commTermMixes[term] / 100) * (preneedPct / 100);
      const volume = annualFaceValue * weight;
      const rates = termTable[age];
      preneedYr1 += volume * (rates[0] / 100);
      if (modelingYear >= 2 && rates[1]) preneedYr2 += volume * (rates[1] / 100);
      if (modelingYear >= 3 && rates[2]) preneedYr3 += volume * (rates[2] / 100);
    }
  }
  const trustComm = annualFaceValue * (trustPctOfInsurance / 100) * 0.0375;
  const grossComm = preneedYr1 + preneedYr2 + preneedYr3 + trustComm;
  return { preneedYr1, preneedYr2, preneedYr3, trustComm, grossComm };
}

function calcMonthlyBonusAnnual(volume) {
  const monthlyAvg = volume / 12;
  for (const tier of MONTHLY_BONUSES) {
    if (monthlyAvg >= tier.threshold) return tier.bonus * 12;
  }
  return 0;
}
function calcAnnualBonus(volume) {
  let bonus = 0;
  for (const tier of ANNUAL_BONUSES) {
    if (volume >= tier.threshold) bonus += tier.bonus;
  }
  return bonus;
}

/* ─── YEAR 1 CALCULATION ─── */
const Y = 1;
const newFace = D.initialProduction;
const insuranceFace = newFace * (1 - D.cemeteryMix / 100);
const cemeteryFace = newFace * (D.cemeteryMix / 100);
const wlFace = insuranceFace * prodMixes.wl;
const annFace = insuranceFace * prodMixes.annuity;
const gradedFace = insuranceFace * prodMixes.graded;
const trustFace = insuranceFace * prodMixes.trust;

const vintages = [{ year: 1, wlFace, annFace, gradedFace, trustFace, totalFace: insuranceFace }];

// PREMIUMS
const annuityPremiums = annFace;
let multiPayPremiums = 0, multiPayNetPremiums = 0;
for (const V of vintages) {
  const n = Y - V.year; // = 0
  for (const term of TERM_KEYS) {
    if (n >= term) continue;
    const survivingWL = V.wlFace * termMixes[term] * blendedSurvival[n];
    multiPayPremiums += survivingWL * (weightedWLRate[term] || 0) * 12;
    multiPayNetPremiums += survivingWL / term;
    const survivingGraded = V.gradedFace * termMixes[term] * blendedSurvival[n];
    multiPayPremiums += survivingGraded * (weightedGradedRate[term] || 0) * 12;
    multiPayNetPremiums += survivingGraded / term;
  }
}
const totalPremiums = annuityPremiums + multiPayPremiums;
const premiumLoading = multiPayPremiums - multiPayNetPremiums;

// IN-FORCE
let inForceFace = 0;
for (const V of vintages) inForceFace += V.totalFace * blendedSurvival[Y - V.year];

// CLAIMS (Year 1: n=0 for all vintages, so no deaths yet — n < 1 skips)
let wlClaims = 0, annuityClaims = 0, gradedClaims = 0, totalClaimValue = 0;

// HEADCOUNT
const closerCount = Math.ceil(newFace / D.volumePerCloser);
const setterCount = Math.ceil(newFace / D.volumePerSetter);
const { aftercareCount, leaderBaseSalary } = D;
const leaderCount = 1;
const totalHeadcount = closerCount + setterCount + aftercareCount + leaderCount;

// COMP
const modelYear = Math.min(Y, 3); // = 1

// A. Closer
const closerVolume = D.volumePerCloser;
const setterPctFrac = D.pctSetterSourced / 100;
const closerSplit = D.closerSplitPct / 100;
const closerDirectVolume = closerVolume * (1 - setterPctFrac);
const closerSetterSourcedVolume = closerVolume * setterPctFrac;
const closerDirectComm = calcGrossCommForVolume(closerDirectVolume, modelYear);
const closerSharedComm = calcGrossCommForVolume(closerSetterSourcedVolume, modelYear);
const closerGrossComm = closerDirectComm.grossComm + closerSharedComm.grossComm * closerSplit;
const closerChargebacks = closerGrossComm * (D.chargebackRate / 100);
const closerNetComm = closerGrossComm - closerChargebacks;
const closerBaseWage = D.closerHourlyWage * 40 * 52;
const closerMonthlyBonus = calcMonthlyBonusAnnual(closerVolume);
const closerAnnualBonus = calcAnnualBonus(closerVolume);
const closerCompEach = closerBaseWage + closerNetComm + closerMonthlyBonus + closerAnnualBonus;
const closerTotalCost = closerCompEach * closerCount;

// B. Setter
const setterSupportedVolume = D.volumePerSetter;
const setterSplit = (100 - D.closerSplitPct) / 100;
const setterSourcedVolume = setterSupportedVolume * setterPctFrac;
const setterSharedComm = calcGrossCommForVolume(setterSourcedVolume, modelYear);
const setterGrossComm = setterSharedComm.grossComm * setterSplit;
const setterChargebacks = setterGrossComm * (D.chargebackRate / 100);
const setterNetComm = setterGrossComm - setterChargebacks;
const setterBaseWage = D.setterHourlyWage * 40 * 52;
// Setters: base wage + commission split only, no bonuses
const setterCompEach = setterBaseWage + setterNetComm;
const setterTotalCost = setterCompEach * setterCount;

// C. Aftercare
const aftercareVolume = D.aftercareAnnualVolume;
const aftercareComm = calcGrossCommForVolume(aftercareVolume, modelYear);
const aftercareGrossComm = aftercareComm.grossComm;
const aftercareChargebacks = aftercareGrossComm * (D.chargebackRate / 100);
const aftercareNetComm = aftercareGrossComm - aftercareChargebacks;
const aftercareLeadFrac = D.aftercareLeadPct / 100;
const aftercareSpecFrac = D.specialistShare / 100;
const aftercareEffectiveComm = aftercareNetComm * aftercareLeadFrac * aftercareSpecFrac
  + aftercareNetComm * (1 - aftercareLeadFrac);
const aftercareBaseWage = D.aftercareHourlyWage * 40 * 52;
const aftercareMonthlyBonus = calcMonthlyBonusAnnual(aftercareVolume);
const aftercareAnnualBonusAmt = calcAnnualBonus(aftercareVolume);
const aftercareCompEach = aftercareBaseWage + aftercareEffectiveComm + aftercareMonthlyBonus + aftercareAnnualBonusAmt;
const aftercareTotalCost = aftercareCompEach * aftercareCount;

// D. Leader
const teamSalesVolume = closerCount * closerVolume + aftercareCount * aftercareVolume;
const grossMonthlyOverride = teamSalesVolume * 0.01;
const netMonthlyOverride = grossMonthlyOverride;
const leaderVolumePerPeriod = teamSalesVolume / 2;
const leaderBonusPerPeriod = calcSemiAnnualBonus(leaderVolumePerPeriod);
const leaderAnnualSemiBonus = leaderBonusPerPeriod * 2;
const leaderTotalCost = leaderBaseSalary + netMonthlyOverride + leaderAnnualSemiBonus;

// E. Total
const totalSalesComp = closerTotalCost + setterTotalCost + aftercareTotalCost + leaderTotalCost;

// ENTITY SPLIT (single split that sums to totalSalesComp)
const cemeteryShare = D.cemeteryMix / 100;
const insuranceShare = 1 - cemeteryShare;
const tjmShareOfInsurance = (prodMixes.wl + prodMixes.annuity + prodMixes.graded);
const fhShareOfInsurance = prodMixes.trust;
const cemeteryComp = totalSalesComp * cemeteryShare;
const tjmLifeComp = totalSalesComp * insuranceShare * tjmShareOfInsurance;
const fhComp = totalSalesComp * insuranceShare * fhShareOfInsurance + aftercareTotalCost;

// TJM LIFE P&L
const priorReserves = 0;
const investmentIncome = priorReserves * (D.earnRate / 100);
const grossIncome = investmentIncome + totalPremiums;
const netPremiumsToReserves = annuityPremiums + multiPayNetPremiums;
const reserves = priorReserves + netPremiumsToReserves + investmentIncome;
const reserveChange = reserves - priorReserves;
const section807 = reserveChange;
const premTax = multiPayPremiums * (D.premiumTaxRate / 100);
const totalDeductions = section807 + 0 + tjmLifeComp + premTax; // claims = 0 in Y1
const taxableIncome = grossIncome - totalDeductions;
const taxPaid = Math.max(0, taxableIncome) * (D.corporateTaxRate / 100);
const tjmNet = investmentIncome + premiumLoading - tjmLifeComp - premTax - taxPaid;

// FH P&L
const atNeedMargin = totalClaimValue * (1 - D.serviceDeliveryCost / 100); // 0 in Y1
const financeChargeBase = trustFace * blendedSurvival[0]; // n=0 < avgPayTerm
const financeChargeIncome = financeChargeBase * (D.financeChargeRate / 100);
const fhTax = financeChargeIncome * (D.passThroughTaxRate / 100);
const fhNet = atNeedMargin + financeChargeIncome - fhTax - fhComp;

// CEMETERY P&L
const cemeteryGrossProfit = cemeteryFace * (D.cemeteryMargin / 100);
const cemeteryPerpCare = cemeteryFace * (D.perpCareRate / 100);
const cemeteryPreTax = cemeteryGrossProfit - cemeteryPerpCare - cemeteryComp;
const cemeteryTax = cemeteryPreTax * (D.passThroughTaxRate / 100);
const cemeteryNet = cemeteryPreTax - cemeteryTax;

const combinedNet = tjmNet + fhNet + cemeteryNet;

// Entity revenue
const tjmRevenue = investmentIncome + premiumLoading;
const cemeteryRevenue = cemeteryGrossProfit - cemeteryPerpCare;
const fhRevenue = atNeedMargin + financeChargeIncome;

/* ─── OUTPUT ─── */
console.log('');
console.log('╔══════════════════════════════════════════════════════════════════════════╗');
console.log('║          YEAR 1 DETAILED BREAKDOWN — HEADCOUNT-SCALED COMP MODEL       ║');
console.log('╚══════════════════════════════════════════════════════════════════════════╝');

console.log('\n═══ PRODUCTION SPLIT ═══');
console.log(`  Total new production:        ${fmt(newFace)}`);
console.log(`  Insurance face (50%):        ${fmt(insuranceFace)}`);
console.log(`    WL (35%):                  ${fmt(wlFace)}`);
console.log(`    Annuity (35%):             ${fmt(annFace)}`);
console.log(`    Graded (20%):              ${fmt(gradedFace)}`);
console.log(`    Trust (10%):               ${fmt(trustFace)}`);
console.log(`  Cemetery face (50%):         ${fmt(cemeteryFace)}`);

console.log('\n═══ HEADCOUNT ═══');
console.log(`  Closers:   ${closerCount}  (ceil($${newFace/1e6}M / $${D.volumePerCloser/1e6}M))`);
console.log(`  Setters:   ${setterCount}  (ceil($${newFace/1e6}M / $${D.volumePerSetter/1e6}M))`);
console.log(`  Aftercare: ${aftercareCount}  (flat input)`);
console.log(`  Leader:    ${leaderCount}  (always 1)`);
console.log(`  TOTAL:     ${totalHeadcount}`);

console.log('\n═══ CLOSER COMP (per closer, x10) ═══');
console.log(`  Volume handled per closer:   ${fmt(closerVolume)}`);
console.log(`  Direct volume (20%):         ${fmt(closerDirectVolume)}  (${pct((1-setterPctFrac)*100)} self-sourced)`);
console.log(`  Setter-sourced volume (80%): ${fmt(closerSetterSourcedVolume)}`);
console.log(`  Direct commission:           ${fmtD(closerDirectComm.grossComm)}  (preneed: ${fmtD(closerDirectComm.preneedYr1)}, trust: ${fmtD(closerDirectComm.trustComm)})`);
console.log(`  Shared commission (full):    ${fmtD(closerSharedComm.grossComm)}`);
console.log(`  Closer share of shared (70%):${fmtD(closerSharedComm.grossComm * closerSplit)}`);
console.log(`  Gross commission:            ${fmtD(closerGrossComm)}`);
console.log(`  Chargebacks (5%):            ${fmtD(closerChargebacks)}`);
console.log(`  Net commission:              ${fmtD(closerNetComm)}`);
console.log(`  Base wage ($${D.closerHourlyWage}/hr):    ${fmtD(closerBaseWage)}`);
console.log(`  Monthly bonus (x12):         ${fmtD(closerMonthlyBonus)}  ($${closerVolume/12|0}/mo avg → ${closerMonthlyBonus > 0 ? '$'+closerMonthlyBonus/12+'k/mo' : 'none'})`);
console.log(`  Annual bonus:                ${fmtD(closerAnnualBonus)}`);
console.log(`  ────────────────────────────`);
console.log(`  TOTAL PER CLOSER:            ${fmtD(closerCompEach)}`);
console.log(`  x ${closerCount} closers =              ${fmt(closerTotalCost)}`);

console.log('\n═══ SETTER COMP (per setter, x4) ═══');
console.log(`  Supported volume per setter: ${fmt(setterSupportedVolume)}`);
console.log(`  Setter-sourced volume (80%): ${fmt(setterSourcedVolume)}`);
console.log(`  Full shared commission:      ${fmtD(setterSharedComm.grossComm)}`);
console.log(`  Setter share (30%):          ${fmtD(setterGrossComm)}`);
console.log(`  Chargebacks (5%):            ${fmtD(setterChargebacks)}`);
console.log(`  Net commission:              ${fmtD(setterNetComm)}`);
console.log(`  Base wage ($${D.setterHourlyWage}/hr):    ${fmtD(setterBaseWage)}`);
console.log(`  Bonuses:                     NONE (removed)`);
console.log(`  ────────────────────────────`);
console.log(`  TOTAL PER SETTER:            ${fmtD(setterCompEach)}`);
console.log(`  x ${setterCount} setters =               ${fmt(setterTotalCost)}`);

console.log('\n═══ AFTERCARE COMP (x1) ═══');
console.log(`  Volume:                      ${fmt(aftercareVolume)}`);
console.log(`  Gross commission:            ${fmtD(aftercareGrossComm)}  (preneed: ${fmtD(aftercareComm.preneedYr1)}, trust: ${fmtD(aftercareComm.trustComm)})`);
console.log(`  Chargebacks (5%):            ${fmtD(aftercareChargebacks)}`);
console.log(`  Net commission:              ${fmtD(aftercareNetComm)}`);
console.log(`  Aftercare-lead portion (65%):${fmtD(aftercareNetComm * aftercareLeadFrac)}`);
console.log(`    Specialist share (70%):    ${fmtD(aftercareNetComm * aftercareLeadFrac * aftercareSpecFrac)}`);
console.log(`  Non-lead portion (35%):      ${fmtD(aftercareNetComm * (1 - aftercareLeadFrac))}`);
console.log(`  Effective commission:        ${fmtD(aftercareEffectiveComm)}`);
console.log(`  Base wage ($${D.aftercareHourlyWage}/hr):   ${fmtD(aftercareBaseWage)}`);
console.log(`  Monthly bonus (x12):         ${fmtD(aftercareMonthlyBonus)}`);
console.log(`  Annual bonus:                ${fmtD(aftercareAnnualBonusAmt)}`);
console.log(`  ────────────────────────────`);
console.log(`  TOTAL AFTERCARE:             ${fmtD(aftercareCompEach)}`);

console.log('\n═══ LEADER COMP ═══');
console.log(`  Base salary:                 ${fmtD(leaderBaseSalary)}`);
console.log(`  Team volume:                 ${fmt(teamSalesVolume)}  (${closerCount} closers x $${closerVolume/1e6}M + ${aftercareCount} aftercare x $${aftercareVolume/1e6}M)`);
console.log(`  Gross override (1%):         ${fmtD(grossMonthlyOverride)}`);
console.log(`  Override (net):              ${fmtD(netMonthlyOverride)}`);
console.log(`  Semi-annual volume:          ${fmt(leaderVolumePerPeriod)}`);
console.log(`  Semi-annual bonus (each):    ${fmtD(leaderBonusPerPeriod)}`);
console.log(`  Annual semi-annual bonus:    ${fmtD(leaderAnnualSemiBonus)}`);
console.log(`  ────────────────────────────`);
console.log(`  TOTAL LEADER:                ${fmtD(leaderTotalCost)}`);

console.log('\n═══ TOTAL SALES COMPENSATION ═══');
console.log(`  Closer total:                ${fmt(closerTotalCost)}`);
console.log(`  Setter total:                ${fmt(setterTotalCost)}`);
console.log(`  Aftercare total:             ${fmt(aftercareTotalCost)}`);
console.log(`  Leader total:                ${fmt(leaderTotalCost)}`);
console.log(`  ════════════════════════════`);
console.log(`  GRAND TOTAL COMP:            ${fmt(totalSalesComp)}`);
console.log(`  Comp / Production:           ${pct(totalSalesComp / newFace * 100)}`);

console.log('\n═══ ENTITY COMP SPLIT ═══');
console.log(`  Cemetery share:              ${pct(cemeteryShare * 100)}`);
console.log(`  Insurance share:             ${pct(insuranceShare * 100)}`);
console.log(`    TJM share (of insurance):  ${pct(tjmShareOfInsurance * 100)}`);
console.log(`    FH share (of insurance):   ${pct(fhShareOfInsurance * 100)}`);
console.log(`  Cemetery comp:               ${fmt(cemeteryComp)}`);
console.log(`  TJM Life comp:               ${fmt(tjmLifeComp)}`);
console.log(`  FH comp (+aftercare):        ${fmt(fhComp)}`);
console.log(`  CHECK total split:           ${fmt(tjmLifeComp + fhComp + cemeteryComp)}  (should = ${fmt(totalSalesComp + aftercareTotalCost)})`);

console.log('\n═══ TJM LIFE P&L ═══');
console.log(`  Prior reserves:              ${fmt(priorReserves)}`);
console.log(`  Investment income:           ${fmt(investmentIncome)}`);
console.log(`  Annuity premiums:            ${fmt(annuityPremiums)}`);
console.log(`  Multi-pay premiums:          ${fmt(multiPayPremiums)}`);
console.log(`  Multi-pay net premiums:      ${fmt(multiPayNetPremiums)}`);
console.log(`  Premium loading:             ${fmt(premiumLoading)}`);
console.log(`  Total premiums:              ${fmt(totalPremiums)}`);
console.log(`  Gross income:                ${fmt(grossIncome)}`);
console.log(`  Net premiums to reserves:    ${fmt(netPremiumsToReserves)}`);
console.log(`  Reserves (end):              ${fmt(reserves)}`);
console.log(`  Reserve change (§807):       ${fmt(section807)}`);
console.log(`  Claims:                      ${fmt(0)} (no deaths in year 1)`);
console.log(`  TJM Life comp:               ${fmt(tjmLifeComp)}`);
console.log(`  Premium tax:                 ${fmt(premTax)}`);
console.log(`  Total deductions:            ${fmt(totalDeductions)}`);
console.log(`  Taxable income:              ${fmt(taxableIncome)}`);
console.log(`  Tax paid:                    ${fmt(taxPaid)}`);
console.log(`  ────────────────────────────`);
console.log(`  TJM REVENUE (inv inc + load):${fmt(tjmRevenue)}`);
console.log(`  TJM COMP CHARGED:            ${fmt(tjmLifeComp)}`);
console.log(`  TJM Comp/Revenue:            ${tjmRevenue > 0 ? pct(tjmLifeComp / tjmRevenue * 100) : 'N/A (no revenue)'}`);
console.log(`  TJM NET:                     ${fmt(tjmNet)}`);

console.log('\n═══ FUNERAL HOME P&L ═══');
console.log(`  At-need margin:              ${fmt(atNeedMargin)} (no deaths year 1)`);
console.log(`  Finance charge base:         ${fmt(financeChargeBase)}`);
console.log(`  Finance charge income (7%):  ${fmt(financeChargeIncome)}`);
console.log(`  FH comp charged:             ${fmt(fhComp)}`);
console.log(`  FH tax (37%):                ${fmt(fhTax)}`);
console.log(`  ────────────────────────────`);
console.log(`  FH REVENUE:                  ${fmt(fhRevenue)}`);
console.log(`  FH COMP CHARGED:             ${fmt(fhComp)}`);
console.log(`  FH Comp/Revenue:             ${fhRevenue > 0 ? pct(fhComp / fhRevenue * 100) : 'N/A'}`);
console.log(`  FH NET:                      ${fmt(fhNet)}`);

console.log('\n═══ CEMETERY P&L ═══');
console.log(`  Cemetery face:               ${fmt(cemeteryFace)}`);
console.log(`  Gross profit (50%):          ${fmt(cemeteryGrossProfit)}`);
console.log(`  Perpetual care (10%):        ${fmt(cemeteryPerpCare)}`);
console.log(`  Cemetery comp:               ${fmt(cemeteryComp)}`);
console.log(`  Pre-tax:                     ${fmt(cemeteryPreTax)}`);
console.log(`  Tax (37%):                   ${fmt(cemeteryTax)}`);
console.log(`  ────────────────────────────`);
console.log(`  CEMETERY REVENUE:            ${fmt(cemeteryRevenue)}`);
console.log(`  CEMETERY COMP:               ${fmt(cemeteryComp)}`);
console.log(`  Cemetery Comp/Revenue:       ${cemeteryRevenue > 0 ? pct(cemeteryComp / cemeteryRevenue * 100) : 'N/A'}`);
console.log(`  CEMETERY NET:                ${fmt(cemeteryNet)}`);

console.log('\n═══ COMBINED ═══');
console.log(`  TJM Life Net:                ${fmt(tjmNet)}`);
console.log(`  FH Net:                      ${fmt(fhNet)}`);
console.log(`  Cemetery Net:                ${fmt(cemeteryNet)}`);
console.log(`  ════════════════════════════`);
console.log(`  COMBINED NET:                ${fmt(combinedNet)}`);
console.log('');
