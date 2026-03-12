/**
 * Debug: 20-year override breakdown at 5%
 * Exactly mirrors EnterprisePnlPage.jsx logic
 * Usage: node preneed-calc/scripts/override-debug.mjs
 */
import { buildDeathDistribution, getScaledRate, getGradedScaledRate, getGradedBenefitFactor } from '../src/calculations.js';
import {
  AGENT_RATES, SEMI_ANNUAL_TIERS, MONTHLY_BONUSES, ANNUAL_BONUSES,
  ROLE_DEFAULTS, BUCKET_DEFAULTS, AFTERCARE_DEFAULTS, calcSemiAnnualBonus,
} from '../src/commissionConstants.js';

const AGE_BANDS = ['40-60','61-65','66-70','71-75','76-80','81-85','86-90'];
const AGE_MIDPOINTS = {'40-60':50,'61-65':63,'66-70':68,'71-75':73,'76-80':78,'81-85':83,'86-90':88};
const TERM_KEYS = [3,5,10,20];

// Match DEFAULTS from EnterprisePnlPage.jsx exactly
const initialProduction = 20000000;
const growthRate = 3;
const projectionYears = 20;
const startYear = 2027;
const mixWL = 35, mixAnnuity = 35, mixGraded = 20, mixTrust = 10;
const mix3Pay = 15, mix5Pay = 35, mix10Pay = 35, mix20Pay = 15;
const mixAge40_60 = 20, mixAge61_65 = 25, mixAge66_70 = 30, mixAge71_75 = 15, mixAge76_80 = 7, mixAge81_85 = 2, mixAge86_90 = 1;
const earnRate = 4.5, guaranteedRate = 2;
const financeChargeRate = 7, passThroughTaxRate = 37, premiumTaxRate = 0.875, corporateTaxRate = 21;
const serviceDeliveryCost = 70, chargebackRate = 5;
const volumePerCloser = 2000000, volumePerSetter = 6000000, productionPerAftercare = 10000000;
const closerHourlyWage = ROLE_DEFAULTS.closer.hourlyWage;
const setterHourlyWage = ROLE_DEFAULTS.setter.hourlyWage;
const aftercareHourlyWage = ROLE_DEFAULTS.aftercare.hourlyWage;
const leaderBaseSalary = 125982;
const pctSetterSourced = BUCKET_DEFAULTS.pctSetterSourced;
const closerSplitPct = BUCKET_DEFAULTS.closerSplitPct;
const aftercareAnnualVolume = BUCKET_DEFAULTS.aftercareAnnualVolume;
const aftercareLeadPct = AFTERCARE_DEFAULTS.aftercareLeadPct;
const specialistShare = AFTERCARE_DEFAULTS.specialistShare;
const additionalOverridePct = 5;
const cemeteryMix = 50, perpCareRate = 15, cemeteryMargin = 70;

const fmt = v => '$' + (v/1e3).toFixed(0) + 'K';
const fmtM = v => '$' + (v/1e6).toFixed(2) + 'M';

// ── SETUP (matches page useMemo) ──
const ageMixes = {};
for (const b of AGE_BANDS) ageMixes[b] = ({mixAge40_60,mixAge61_65,mixAge66_70,mixAge71_75,mixAge76_80,mixAge81_85,mixAge86_90})[`mixAge${b.replace('-','_')}`] / 100;
const termMixes = {3:mix3Pay/100,5:mix5Pay/100,10:mix10Pay/100,20:mix20Pay/100};
const prodMixes = {wl:mixWL/100,annuity:mixAnnuity/100,graded:mixGraded/100,trust:mixTrust/100};
const maxYears = projectionYears + 5;

const mortalityCurves = {};
for (const b of AGE_BANDS) mortalityCurves[b] = buildDeathDistribution(AGE_MIDPOINTS[b], 10000, maxYears).deaths;
const blendedDeathFrac = new Array(maxYears+1).fill(0);
const blendedSurvival = new Array(maxYears+1).fill(0);
for (let y=1;y<=maxYears;y++) for (const b of AGE_BANDS) {
  const e = mortalityCurves[b].find(d => d.year === y);
  if (e) blendedDeathFrac[y] += (e.deaths / 10000) * ageMixes[b];
}
blendedSurvival[0] = 1;
for (let y=1;y<=maxYears;y++) blendedSurvival[y] = Math.max(0, blendedSurvival[y-1] - blendedDeathFrac[y]);

const weightedWLRate = {}, weightedGradedRate = {};
for (const t of TERM_KEYS) {
  let w=0, g=0;
  for (const b of AGE_BANDS) {
    const m = AGE_MIDPOINTS[b];
    const wr = getScaledRate(m, t);
    const gr = getGradedScaledRate(m, t);
    if (wr != null) w += wr * ageMixes[b];
    if (gr != null) g += gr * ageMixes[b];
  }
  weightedWLRate[t] = w;
  weightedGradedRate[t] = g;
}

const avgPayTerm = 3*termMixes[3] + 5*termMixes[5] + 10*termMixes[10] + 20*termMixes[20];

// ── Commission helpers (exactly as in page) ──
const commPageTermKeys = ['single', '3pay', '5pay', '10pay', '20pay'];
const insuranceShareOfTotal = 1 - cemeteryMix / 100;
const cemeteryShareOfTotal = cemeteryMix / 100;
const insurProdPct = prodMixes.wl + prodMixes.annuity + prodMixes.graded + prodMixes.trust;
const preneedPctOfTotal = insurProdPct > 0
  ? (prodMixes.wl + prodMixes.annuity + prodMixes.graded) / insurProdPct * insuranceShareOfTotal * 100 : 0;
const trustPctOfTotal = insurProdPct > 0
  ? prodMixes.trust / insurProdPct * insuranceShareOfTotal * 100 : 0;
const multiPayProdPct = prodMixes.wl + prodMixes.graded;
const annuityProdPct = prodMixes.annuity;
const totalPreneedProd = multiPayProdPct + annuityProdPct;
const singlePayPctOfPreneed = totalPreneedProd > 0 ? (annuityProdPct / totalPreneedProd) * 100 : 0;
const multiPayPctOfPreneed = 100 - singlePayPctOfPreneed;
const cemeteryPerpCareFrac = perpCareRate / 100;

function calcGrossCommForVolume(annualFaceValue, modelingYear) {
  const mixSinglePay = singlePayPctOfPreneed;
  const termMixScale = multiPayPctOfPreneed / 100;
  const commTermMixes = {
    single: mixSinglePay,
    '3pay': mix3Pay * termMixScale,
    '5pay': mix5Pay * termMixScale,
    '10pay': mix10Pay * termMixScale,
    '20pay': mix20Pay * termMixScale,
  };
  const commAgeMixes = {
    '40-60': mixAge40_60, '61-65': mixAge61_65, '66-70': mixAge66_70,
    '71-75': mixAge71_75, '76-80': mixAge76_80, '81-85': mixAge81_85, '86-90': mixAge86_90,
  };

  let preneedYr1 = 0, preneedYr2 = 0, preneedYr3 = 0;
  for (const term of commPageTermKeys) {
    const termTable = AGENT_RATES[term];
    for (const age of AGE_BANDS) {
      if (!termTable[age]) continue;
      const weight = (commAgeMixes[age] / 100) * (commTermMixes[term] / 100) * (preneedPctOfTotal / 100);
      const volume = annualFaceValue * weight;
      const rates = termTable[age];
      preneedYr1 += volume * (rates[0] / 100);
      if (modelingYear >= 2 && rates[1]) preneedYr2 += volume * (rates[1] / 100);
      if (modelingYear >= 3 && rates[2]) preneedYr3 += volume * (rates[2] / 100);
    }
  }
  const trustComm = annualFaceValue * (trustPctOfTotal / 100) * 0.0375;
  const cemFace = annualFaceValue * cemeteryShareOfTotal;
  const cemPropertyComm = cemFace * 0.70 * (1 - cemeteryPerpCareFrac) * 0.075;
  const cemMarkerComm = cemFace * 0.30 * 0.075;
  const cemeteryComm = cemPropertyComm + cemMarkerComm;
  const grossComm = preneedYr1 + preneedYr2 + preneedYr3 + trustComm + cemeteryComm;
  return { grossComm };
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

// ── RUN 20-YEAR PROJECTION ──
const vintages = [];
let priorReserves = 0;

console.log('Yr CalYr  tjmPreTax   tjmOvr   fhPreTax    fhOvr   cemPreTax   cemOvr   TOTAL_OVR  combinedNet');
console.log('─'.repeat(105));

for (let Y = 1; Y <= projectionYears; Y++) {
  const totalProduction = initialProduction * Math.pow(1 + growthRate / 100, Y - 1);
  const aftercareCount = Math.max(1, Math.floor(totalProduction / productionPerAftercare));
  const aftercareProduction = aftercareCount * aftercareAnnualVolume;
  const closerProduction = totalProduction - aftercareProduction;
  const newFace = totalProduction;
  const insuranceFace = newFace * (1 - cemeteryMix / 100);
  const cemeteryFace = newFace * (cemeteryMix / 100);
  const wlFace = insuranceFace * prodMixes.wl;
  const annFace = insuranceFace * prodMixes.annuity;
  const gradedFace = insuranceFace * prodMixes.graded;
  const trustFace = insuranceFace * prodMixes.trust;

  vintages.push({ year: Y, wlFace, annFace, gradedFace, trustFace, totalFace: insuranceFace });

  // Premiums
  const annuityPremiums = annFace;
  let multiPayPremiums = 0, multiPayNetPremiums = 0;
  for (const V of vintages) {
    const n = Y - V.year;
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

  // Claims
  let wlClaims = 0, annuityClaims = 0, gradedClaims = 0, totalClaimValue = 0;
  for (const V of vintages) {
    const n = Y - V.year;
    if (n < 1) continue;
    const deathFrac = blendedDeathFrac[n];
    if (!deathFrac) continue;
    wlClaims += V.wlFace * deathFrac;
    annuityClaims += V.annFace * deathFrac * Math.pow(1 + guaranteedRate / 100, n);
    gradedClaims += V.gradedFace * deathFrac * getGradedBenefitFactor(n);
    totalClaimValue += V.wlFace * deathFrac
      + V.annFace * deathFrac * Math.pow(1 + guaranteedRate / 100, n)
      + V.gradedFace * deathFrac * getGradedBenefitFactor(n)
      + V.trustFace * deathFrac;
  }
  const claimsPaid = wlClaims + annuityClaims + gradedClaims;

  // Headcount
  const closerCount = Math.ceil(closerProduction / volumePerCloser);
  const setterCount = Math.ceil(closerProduction / volumePerSetter);
  const leaderCount = 1;

  // Comp
  const modelYear = Math.min(Y, 3);
  const closerVolume = volumePerCloser;
  const setterPct = pctSetterSourced / 100;
  const closerSplit = closerSplitPct / 100;
  const closerDirectVolume = closerVolume * (1 - setterPct);
  const closerSetterSourcedVolume = closerVolume * setterPct;
  const closerDirectComm = calcGrossCommForVolume(closerDirectVolume, modelYear);
  const closerSharedComm = calcGrossCommForVolume(closerSetterSourcedVolume, modelYear);
  const closerGrossComm = closerDirectComm.grossComm + closerSharedComm.grossComm * closerSplit;
  const closerNetComm = closerGrossComm * (1 - chargebackRate / 100);
  const closerBaseWage = closerHourlyWage * 40 * 52;
  const closerCompEach = closerBaseWage + closerNetComm + calcMonthlyBonusAnnual(closerVolume) + calcAnnualBonus(closerVolume);
  const closerTotalCost = closerCompEach * closerCount;

  const setterSourcedVolume = volumePerSetter * setterPct;
  const setterSharedComm = calcGrossCommForVolume(setterSourcedVolume, modelYear);
  const setterGrossComm = setterSharedComm.grossComm * ((100 - closerSplitPct) / 100);
  const setterNetComm = setterGrossComm * (1 - chargebackRate / 100);
  const setterBaseWage = setterHourlyWage * 40 * 52;
  const setterCompEach = setterBaseWage + setterNetComm;
  const setterTotalCost = setterCompEach * setterCount;

  const aftercareVolume = aftercareAnnualVolume;
  const acComm = calcGrossCommForVolume(aftercareVolume, modelYear);
  const acNet = acComm.grossComm * (1 - chargebackRate / 100);
  const acLeadFrac = aftercareLeadPct / 100;
  const acSpecFrac = specialistShare / 100;
  const acEffComm = acNet * acLeadFrac * acSpecFrac + acNet * (1 - acLeadFrac);
  const acBase = aftercareHourlyWage * 40 * 52;
  const acCompEach = acBase + acEffComm + calcMonthlyBonusAnnual(aftercareVolume) + calcAnnualBonus(aftercareVolume);
  const aftercareTotalCost = acCompEach * aftercareCount;

  const teamSalesVolume = closerCount * closerVolume + aftercareCount * aftercareVolume;
  const teamNetVolume = teamSalesVolume * (1 - (cemeteryMix / 100) * 0.70 * (perpCareRate / 100));
  const leaderTotalCost = leaderBaseSalary + teamNetVolume * 0.01 + calcSemiAnnualBonus(teamNetVolume / 2) * 2;
  const totalSalesComp = closerTotalCost + setterTotalCost + aftercareTotalCost + leaderTotalCost;

  // Entity split
  const cemCommBase = cemeteryFace * 0.70 * (1 - perpCareRate / 100) + cemeteryFace * 0.30;
  const totalCommBase = insuranceFace + cemCommBase;
  const cemShare = totalCommBase > 0 ? cemCommBase / totalCommBase : 0;
  const insShare = 1 - cemShare;
  const tjmSh = prodMixes.wl + prodMixes.annuity + prodMixes.graded;
  const fhSh = prodMixes.trust;
  const fieldComp = totalSalesComp - aftercareTotalCost;
  const cemeteryComp = fieldComp * cemShare;
  const tjmLifeComp = fieldComp * insShare * tjmSh;
  const fhComp = fieldComp * insShare * fhSh + aftercareTotalCost;

  // TJM Life P&L
  const investmentIncome = priorReserves * (earnRate / 100);
  const grossIncome = investmentIncome + totalPremiums;
  const netPremToRes = annuityPremiums + multiPayNetPremiums;
  const reserves = priorReserves + netPremToRes + investmentIncome - claimsPaid;
  const section807 = reserves - priorReserves;
  const premTax = multiPayPremiums * (premiumTaxRate / 100);

  const tjmPreTax = investmentIncome + premiumLoading - tjmLifeComp - premTax;
  const tjmOverride = Math.max(0, tjmPreTax) * (additionalOverridePct / 100);
  const totalDeductions = section807 + claimsPaid + tjmLifeComp + premTax + tjmOverride;
  const taxableIncome = grossIncome - totalDeductions;
  const taxPaid = Math.max(0, taxableIncome) * (corporateTaxRate / 100);
  const tjmNet = tjmPreTax - tjmOverride - taxPaid;

  // FH P&L
  const atNeedMargin = totalClaimValue * (1 - serviceDeliveryCost / 100);
  let fcBase = 0;
  for (const V of vintages) {
    const n = Y - V.year;
    if (n >= avgPayTerm) continue;
    fcBase += V.trustFace * blendedSurvival[n];
  }
  const fcIncome = fcBase * (financeChargeRate / 100);
  const fhPreTax = atNeedMargin + fcIncome - fhComp;
  const fhOverride = Math.max(0, fhPreTax) * (additionalOverridePct / 100);
  const fhTax = Math.max(0, fcIncome - fhOverride) * (passThroughTaxRate / 100);
  const fhNet = fhPreTax - fhOverride - fhTax;

  // Cemetery P&L
  const propFace = cemeteryFace * 0.70;
  const markFace = cemeteryFace * 0.30;
  const cemGross = propFace * (cemeteryMargin / 100) + markFace * 0.70;
  const cemPerp = propFace * (perpCareRate / 100);
  const cemPreTax = cemGross - cemPerp - cemeteryComp;
  const cemOverride = Math.max(0, cemPreTax) * (additionalOverridePct / 100);
  const cemTax = Math.max(0, cemPreTax - cemOverride) * (passThroughTaxRate / 100);
  const cemNet = cemPreTax - cemOverride - cemTax;

  const totalOverride = tjmOverride + fhOverride + cemOverride;
  const combinedNet = tjmNet + fhNet + cemNet;

  console.log(
    String(Y).padStart(2) + ' ' + (startYear+Y-1) +
    '  ' + fmt(tjmPreTax).padStart(9) +
    ' ' + fmt(tjmOverride).padStart(8) +
    '  ' + fmt(fhPreTax).padStart(9) +
    ' ' + fmt(fhOverride).padStart(8) +
    '  ' + fmt(cemPreTax).padStart(9) +
    ' ' + fmt(cemOverride).padStart(8) +
    '  ' + fmt(totalOverride).padStart(9) +
    '  ' + fmt(combinedNet).padStart(10)
  );

  priorReserves = reserves;
}
