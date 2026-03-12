import { useState, useMemo } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { buildDeathDistribution, getScaledRate, getGradedScaledRate, getGradedBenefitFactor } from '../calculations';
import { fmt, fmtPct, fmtLarge } from '../utils/formatters';
import InputGroup from '../components/InputGroup';
import NumberInput from '../components/NumberInput';
import Chevron from '../components/Chevron';
import {
  AGENT_RATES, SEMI_ANNUAL_TIERS, MONTHLY_BONUSES, ANNUAL_BONUSES,
  ROLE_DEFAULTS, BUCKET_DEFAULTS, AFTERCARE_DEFAULTS,
  calcSemiAnnualBonus,
} from '../commissionConstants';

/* ─── Validation Badge ─── */
function SumBadge({ values, label }) {
  const sum = values.reduce((a, b) => a + b, 0);
  const ok = Math.abs(sum - 100) < 0.01;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {label}: {sum.toFixed(1)}%
    </span>
  );
}

/* ─── Constants ─── */
const AGE_BANDS = ['40-60', '61-65', '66-70', '71-75', '76-80', '81-85', '86-90'];
const AGE_MIDPOINTS = { '40-60': 50, '61-65': 63, '66-70': 68, '71-75': 73, '76-80': 78, '81-85': 83, '86-90': 88 };
const TERM_KEYS = [3, 5, 10, 20];

const DEFAULTS = {
  initialProduction: 20000000,
  growthRate: 3,
  projectionYears: 20,
  startYear: 2027,
  mixWL: 35, mixAnnuity: 35, mixGraded: 20, mixTrust: 10,
  mix3Pay: 15, mix5Pay: 35, mix10Pay: 35, mix20Pay: 15,
  mixAge40_60: 20, mixAge61_65: 25, mixAge66_70: 30, mixAge71_75: 15, mixAge76_80: 7, mixAge81_85: 2, mixAge86_90: 1,
  earnRate: 4.5, guaranteedRate: 2,
  financeChargeRate: 7, passThroughTaxRate: 37, premiumTaxRate: 0.875, corporateTaxRate: 21,
  serviceDeliveryCost: 70, chargebackRate: 5,
  volumePerCloser: 2000000, volumePerSetter: 6000000, productionPerAftercare: 10000000,
  closerHourlyWage: ROLE_DEFAULTS.closer.hourlyWage, setterHourlyWage: ROLE_DEFAULTS.setter.hourlyWage,
  aftercareHourlyWage: ROLE_DEFAULTS.aftercare.hourlyWage,
  leaderBaseSalary: 125982,
  pctSetterSourced: BUCKET_DEFAULTS.pctSetterSourced, closerSplitPct: BUCKET_DEFAULTS.closerSplitPct,
  aftercareAnnualVolume: BUCKET_DEFAULTS.aftercareAnnualVolume,
  aftercareLeadPct: AFTERCARE_DEFAULTS.aftercareLeadPct, specialistShare: AFTERCARE_DEFAULTS.specialistShare,
  additionalOverridePct: 0,
  cemeteryMix: 50, perpCareRate: 15, cemeteryMargin: 70,
};

/* ─── Chart Tooltip ─── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-navy-300 font-semibold mb-1">Year {label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {fmtLarge(p.value)}</p>
      ))}
    </div>
  );
}

/* ─── Main Component ─── */
export default function EnterprisePnlPage() {
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [compHealthOpen, setCompHealthOpen] = useState(true);
  const [showDetail, setShowDetail] = useState(false);
  const [tablePopout, setTablePopout] = useState(false);

  // Production
  const [initialProduction, setInitialProduction] = useState(DEFAULTS.initialProduction);
  const [growthRate, setGrowthRate] = useState(DEFAULTS.growthRate);
  const [projectionYears, setProjectionYears] = useState(DEFAULTS.projectionYears);
  const [startYear, setStartYear] = useState(DEFAULTS.startYear);

  // Product mix
  const [mixWL, setMixWL] = useState(DEFAULTS.mixWL);
  const [mixAnnuity, setMixAnnuity] = useState(DEFAULTS.mixAnnuity);
  const [mixGraded, setMixGraded] = useState(DEFAULTS.mixGraded);
  const [mixTrust, setMixTrust] = useState(DEFAULTS.mixTrust);

  // Payment term mix (WL/Graded)
  const [mix3Pay, setMix3Pay] = useState(DEFAULTS.mix3Pay);
  const [mix5Pay, setMix5Pay] = useState(DEFAULTS.mix5Pay);
  const [mix10Pay, setMix10Pay] = useState(DEFAULTS.mix10Pay);
  const [mix20Pay, setMix20Pay] = useState(DEFAULTS.mix20Pay);

  // Age distribution
  const [mixAge40_60, setMixAge40_60] = useState(DEFAULTS.mixAge40_60);
  const [mixAge61_65, setMixAge61_65] = useState(DEFAULTS.mixAge61_65);
  const [mixAge66_70, setMixAge66_70] = useState(DEFAULTS.mixAge66_70);
  const [mixAge71_75, setMixAge71_75] = useState(DEFAULTS.mixAge71_75);
  const [mixAge76_80, setMixAge76_80] = useState(DEFAULTS.mixAge76_80);
  const [mixAge81_85, setMixAge81_85] = useState(DEFAULTS.mixAge81_85);
  const [mixAge86_90, setMixAge86_90] = useState(DEFAULTS.mixAge86_90);

  // Financial assumptions
  const [earnRate, setEarnRate] = useState(DEFAULTS.earnRate);
  const [guaranteedRate, setGuaranteedRate] = useState(DEFAULTS.guaranteedRate);
  const [financeChargeRate, setFinanceChargeRate] = useState(DEFAULTS.financeChargeRate);
  const [passThroughTaxRate, setPassThroughTaxRate] = useState(DEFAULTS.passThroughTaxRate);
  const [premiumTaxRate, setPremiumTaxRate] = useState(DEFAULTS.premiumTaxRate);
  const [corporateTaxRate, setCorporateTaxRate] = useState(DEFAULTS.corporateTaxRate);

  // Operating assumptions
  const [serviceDeliveryCost, setServiceDeliveryCost] = useState(DEFAULTS.serviceDeliveryCost);
  const [chargebackRate, setChargebackRate] = useState(DEFAULTS.chargebackRate);

  // Sales team scaling
  const [volumePerCloser, setVolumePerCloser] = useState(DEFAULTS.volumePerCloser);
  const [volumePerSetter, setVolumePerSetter] = useState(DEFAULTS.volumePerSetter);
  const [productionPerAftercare, setProductionPerAftercare] = useState(DEFAULTS.productionPerAftercare);
  const [closerHourlyWage, setCloserHourlyWage] = useState(DEFAULTS.closerHourlyWage);
  const [setterHourlyWage, setSetterHourlyWage] = useState(DEFAULTS.setterHourlyWage);
  const [aftercareHourlyWage, setAftercareHourlyWage] = useState(DEFAULTS.aftercareHourlyWage);
  const [leaderBaseSalary, setLeaderBaseSalary] = useState(DEFAULTS.leaderBaseSalary);

  const [pctSetterSourced, setPctSetterSourced] = useState(DEFAULTS.pctSetterSourced);
  const [closerSplitPct, setCloserSplitPct] = useState(DEFAULTS.closerSplitPct);
  const [aftercareAnnualVolume, setAftercareAnnualVolume] = useState(DEFAULTS.aftercareAnnualVolume);
  const [aftercareLeadPct, setAftercareLeadPct] = useState(DEFAULTS.aftercareLeadPct);
  const [specialistShare, setSpecialistShare] = useState(DEFAULTS.specialistShare);
  const [additionalOverridePct, setAdditionalOverridePct] = useState(DEFAULTS.additionalOverridePct);

  // Cemetery
  const [cemeteryMix, setCemeteryMix] = useState(DEFAULTS.cemeteryMix);
  const [perpCareRate, setPerpCareRate] = useState(DEFAULTS.perpCareRate);
  const [cemeteryMargin, setCemeteryMargin] = useState(DEFAULTS.cemeteryMargin);

  function resetDefaults() {
    setInitialProduction(DEFAULTS.initialProduction); setGrowthRate(DEFAULTS.growthRate);
    setProjectionYears(DEFAULTS.projectionYears); setStartYear(DEFAULTS.startYear);
    setMixWL(DEFAULTS.mixWL); setMixAnnuity(DEFAULTS.mixAnnuity);
    setMixGraded(DEFAULTS.mixGraded); setMixTrust(DEFAULTS.mixTrust);
    setMix3Pay(DEFAULTS.mix3Pay); setMix5Pay(DEFAULTS.mix5Pay);
    setMix10Pay(DEFAULTS.mix10Pay); setMix20Pay(DEFAULTS.mix20Pay);
    setMixAge40_60(DEFAULTS.mixAge40_60); setMixAge61_65(DEFAULTS.mixAge61_65);
    setMixAge66_70(DEFAULTS.mixAge66_70); setMixAge71_75(DEFAULTS.mixAge71_75);
    setMixAge76_80(DEFAULTS.mixAge76_80); setMixAge81_85(DEFAULTS.mixAge81_85); setMixAge86_90(DEFAULTS.mixAge86_90);
    setEarnRate(DEFAULTS.earnRate); setGuaranteedRate(DEFAULTS.guaranteedRate);
    setFinanceChargeRate(DEFAULTS.financeChargeRate); setPassThroughTaxRate(DEFAULTS.passThroughTaxRate);
    setPremiumTaxRate(DEFAULTS.premiumTaxRate); setCorporateTaxRate(DEFAULTS.corporateTaxRate);
    setServiceDeliveryCost(DEFAULTS.serviceDeliveryCost); setChargebackRate(DEFAULTS.chargebackRate);
    setVolumePerCloser(DEFAULTS.volumePerCloser); setVolumePerSetter(DEFAULTS.volumePerSetter);
    setProductionPerAftercare(DEFAULTS.productionPerAftercare);
    setCloserHourlyWage(DEFAULTS.closerHourlyWage); setSetterHourlyWage(DEFAULTS.setterHourlyWage);
    setAftercareHourlyWage(DEFAULTS.aftercareHourlyWage);
    setLeaderBaseSalary(DEFAULTS.leaderBaseSalary);
    setPctSetterSourced(DEFAULTS.pctSetterSourced); setCloserSplitPct(DEFAULTS.closerSplitPct);
    setAftercareAnnualVolume(DEFAULTS.aftercareAnnualVolume);
    setAftercareLeadPct(DEFAULTS.aftercareLeadPct); setSpecialistShare(DEFAULTS.specialistShare);
    setAdditionalOverridePct(DEFAULTS.additionalOverridePct);
    setCemeteryMix(DEFAULTS.cemeteryMix); setPerpCareRate(DEFAULTS.perpCareRate);
    setCemeteryMargin(DEFAULTS.cemeteryMargin);
  }

  /* ─── Calculation Engine ─── */
  const projection = useMemo(() => {
    const ageMixes = {
      '40-60': mixAge40_60 / 100, '61-65': mixAge61_65 / 100, '66-70': mixAge66_70 / 100,
      '71-75': mixAge71_75 / 100, '76-80': mixAge76_80 / 100, '81-85': mixAge81_85 / 100, '86-90': mixAge86_90 / 100,
    };
    const termMixes = { 3: mix3Pay / 100, 5: mix5Pay / 100, 10: mix10Pay / 100, 20: mix20Pay / 100 };
    const prodMixes = { wl: mixWL / 100, annuity: mixAnnuity / 100, graded: mixGraded / 100, trust: mixTrust / 100 };
    const maxYears = projectionYears + 5; // extra buffer for mortality tail

    // Step 1: Blended mortality curve
    const mortalityCurves = {};
    for (const band of AGE_BANDS) {
      const midAge = AGE_MIDPOINTS[band];
      const dist = buildDeathDistribution(midAge, 10000, maxYears);
      mortalityCurves[band] = dist.deaths; // [{year, age, deaths}]
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
      let wlSum = 0, gradedSum = 0, totalWeight = 0;
      for (const band of AGE_BANDS) {
        const midAge = AGE_MIDPOINTS[band];
        const wlRate = getScaledRate(midAge, term);
        const gRate = getGradedScaledRate(midAge, term);
        const w = ageMixes[band];
        if (wlRate != null) { wlSum += wlRate * w; totalWeight += w; }
        if (gRate != null) gradedSum += gRate * w;
      }
      weightedWLRate[term] = totalWeight > 0 ? wlSum / totalWeight * totalWeight : wlSum;
      weightedGradedRate[term] = gradedSum;
      // Normalize: keep as weighted-average rate (per $1 face, monthly)
      weightedWLRate[term] = wlSum;
      weightedGradedRate[term] = gradedSum;
    }

    // Weighted average commission rates
    let commYr1 = 0, commYr2 = 0, commYr3 = 0;
    let singlePayCommRate = 0;
    // Single-pay (annuity) commission
    for (const band of AGE_BANDS) {
      const rates = AGENT_RATES.single[band];
      if (rates) singlePayCommRate += (rates[0] / 100) * ageMixes[band];
    }

    // Multi-pay commission rates by term
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
    const trustCommRate = 0.0375; // 3.75% flat

    // Weighted avg payment term
    const avgPayTerm = 3 * termMixes[3] + 5 * termMixes[5] + 10 * termMixes[10] + 20 * termMixes[20];

    // ── Comp helper: calculate gross commission for a given volume using CommissionsPage logic ──
    // Uses the Enterprise P&L product mix mapped to CommissionsPage terms:
    //   preneed = WL + Annuity + Graded portion, cemetery = cemetery portion, trust = trust portion
    // Payment term & age mixes come from the P&L inputs
    const commPageTermKeys = ['single', '3pay', '5pay', '10pay', '20pay'];
    // Map Enterprise product mix to CommissionsPage "mix" percentages
    // Insurance products are a fraction of total production (remainder is cemetery)
    const insuranceShareOfTotal = 1 - cemeteryMix / 100;
    const cemeteryShareOfTotal = cemeteryMix / 100;

    // Preneed/trust as % of TOTAL production (not just insurance)
    const insurProdPct = (prodMixes.wl + prodMixes.annuity + prodMixes.graded + prodMixes.trust);
    const preneedPctOfTotal = insurProdPct > 0
      ? (prodMixes.wl + prodMixes.annuity + prodMixes.graded) / insurProdPct * insuranceShareOfTotal * 100 : 0;
    const trustPctOfTotal = insurProdPct > 0
      ? prodMixes.trust / insurProdPct * insuranceShareOfTotal * 100 : 0;

    // Within preneed: annuity is single-pay, rest split by term mix
    const multiPayProdPct = prodMixes.wl + prodMixes.graded;
    const annuityProdPct = prodMixes.annuity;
    const totalPreneedProd = multiPayProdPct + annuityProdPct;
    const singlePayPctOfPreneed = totalPreneedProd > 0 ? (annuityProdPct / totalPreneedProd) * 100 : 0;
    const multiPayPctOfPreneed = 100 - singlePayPctOfPreneed;

    // Cemetery commissionable base: after perpetual care deduction
    const cemeteryPerpCareFrac = perpCareRate / 100;

    function calcGrossCommForVolume(annualFaceValue, modelingYear) {
      // Commission mix percentages — map Enterprise P&L inputs to CommissionsPage format
      const mixSinglePay = singlePayPctOfPreneed;
      const termMixScale = multiPayPctOfPreneed / 100;
      const commTermMixes = {
        single: mixSinglePay,
        '3pay': (mix3Pay) * termMixScale,
        '5pay': (mix5Pay) * termMixScale,
        '10pay': (mix10Pay) * termMixScale,
        '20pay': (mix20Pay) * termMixScale,
      };
      const commAgeMixes = {
        '40-60': mixAge40_60, '61-65': mixAge61_65, '66-70': mixAge66_70,
        '71-75': mixAge71_75, '76-80': mixAge76_80, '81-85': mixAge81_85, '86-90': mixAge86_90,
      };

      // Preneed commission on insurance portion only
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
      // Trust commission on insurance trust portion
      const trustComm = annualFaceValue * (trustPctOfTotal / 100) * 0.0375;
      // Cemetery commission: 70% property (perp care applies), 30% markers (no perp care)
      const cemFace = annualFaceValue * cemeteryShareOfTotal;
      const cemPropertyComm = cemFace * 0.70 * (1 - cemeteryPerpCareFrac) * 0.075;
      const cemMarkerComm = cemFace * 0.30 * 0.075;
      const cemeteryComm = cemPropertyComm + cemMarkerComm;
      const grossComm = preneedYr1 + preneedYr2 + preneedYr3 + trustComm + cemeteryComm;
      return { preneedYr1, preneedYr2, preneedYr3, trustComm, cemeteryComm, grossComm };
    }

    // Helper: bonuses for a given volume
    function calcMonthlyBonusAnnual(volume) {
      const monthlyAvg = volume / 12;
      for (const tier of MONTHLY_BONUSES) {
        if (monthlyAvg >= tier.threshold) return tier.bonus * 12;
      }
      return 0;
    }
    function calcAnnualBonus(volume) {
      for (const tier of ANNUAL_BONUSES) {
        if (volume >= tier.threshold) return tier.bonus;
      }
      return 0;
    }

    // Step 3: Projection loop
    const vintages = [];
    const yearData = [];
    let priorReserves = 0;
    let cumulativeTotal = 0;
    let cumulativeTJM = 0;
    let cumulativeFH = 0;

    for (let Y = 1; Y <= projectionYears; Y++) {
      // Bottom-up production: aftercare count scales with total production
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

      // ── PREMIUMS ──
      let totalPremiums = 0;

      // Single-pay: annuity premiums = face value (year of issue only)
      const annuityPremiums = annFace;
      totalPremiums += annuityPremiums;

      // Trust premiums NOT on TJM's books — separate entity; trust reserves not on TJM balance sheet

      // Multi-pay premiums from all active vintages
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
        annuityClaims += V.annFace * deathFrac * Math.pow(1 + guaranteedRate / 100, n);
        gradedClaims += V.gradedFace * deathFrac * getGradedBenefitFactor(n);
        totalClaimValue += V.wlFace * deathFrac
          + V.annFace * deathFrac * Math.pow(1 + guaranteedRate / 100, n)
          + V.gradedFace * deathFrac * getGradedBenefitFactor(n)
          + V.trustFace * deathFrac;
      }
      const claimsPaid = wlClaims + annuityClaims + gradedClaims;

      // ── HEADCOUNT SCALING ──
      const closerCount = Math.ceil(closerProduction / volumePerCloser);
      const setterCount = Math.ceil(closerProduction / volumePerSetter);
      const leaderCount = 1;
      const totalHeadcount = closerCount + setterCount + aftercareCount + leaderCount;

      // ── SALES TEAM COMPENSATION ──
      // Modeling year for commission purposes: use min(Y, 3) so by year 3+ we include renewal commissions
      const modelYear = Math.min(Y, 3);

      // A. Closer comp (per closer)
      const closerVolume = volumePerCloser; // each closer handles this volume
      const setterPct = pctSetterSourced / 100;
      const closerSplit = closerSplitPct / 100;
      const closerDirectVolume = closerVolume * (1 - setterPct);
      const closerSetterSourcedVolume = closerVolume * setterPct;
      const closerDirectComm = calcGrossCommForVolume(closerDirectVolume, modelYear);
      const closerSharedComm = calcGrossCommForVolume(closerSetterSourcedVolume, modelYear);
      const closerGrossComm = closerDirectComm.grossComm + closerSharedComm.grossComm * closerSplit;
      const closerChargebacks = closerGrossComm * (chargebackRate / 100);
      const closerNetComm = closerGrossComm - closerChargebacks;
      const closerBaseWage = closerHourlyWage * 40 * 52;
      const closerMonthlyBonus = calcMonthlyBonusAnnual(closerVolume);
      const closerAnnualBonus = calcAnnualBonus(closerVolume);
      const closerCompEach = closerBaseWage + closerNetComm + closerMonthlyBonus + closerAnnualBonus;
      const closerTotalCost = closerCompEach * closerCount;

      // B. Setter comp (per setter)
      // Each setter supports ~3 closers ($6M / $2M), earns split on setter-sourced volume
      const setterSupportedVolume = volumePerSetter; // total closer volume a setter supports
      const setterSplit = (100 - closerSplitPct) / 100;
      const setterSourcedVolume = setterSupportedVolume * setterPct;
      const setterSharedComm = calcGrossCommForVolume(setterSourcedVolume, modelYear);
      const setterGrossComm = setterSharedComm.grossComm * setterSplit;
      const setterChargebacks = setterGrossComm * (chargebackRate / 100);
      const setterNetComm = setterGrossComm - setterChargebacks;
      const setterBaseWage = setterHourlyWage * 40 * 52;
      // Setters: base wage + commission split only, no bonuses
      const setterCompEach = setterBaseWage + setterNetComm;
      const setterTotalCost = setterCompEach * setterCount;

      // C. Aftercare comp (per specialist)
      const aftercareVolume = aftercareAnnualVolume;
      const aftercareComm = calcGrossCommForVolume(aftercareVolume, modelYear);
      const aftercareGrossComm = aftercareComm.grossComm;
      const aftercareChargebacks = aftercareGrossComm * (chargebackRate / 100);
      const aftercareNetComm = aftercareGrossComm - aftercareChargebacks;
      // Aftercare split: specialist keeps their share of aftercare-lead portion
      const aftercareLeadFrac = aftercareLeadPct / 100;
      const aftercareSpecFrac = specialistShare / 100;
      const aftercareEffectiveComm = aftercareNetComm * aftercareLeadFrac * aftercareSpecFrac
        + aftercareNetComm * (1 - aftercareLeadFrac);
      const aftercareBaseWage = aftercareHourlyWage * 40 * 52;
      const aftercareMonthlyBonus = calcMonthlyBonusAnnual(aftercareVolume);
      const aftercareAnnualBonusAmt = calcAnnualBonus(aftercareVolume);
      const aftercareCompEach = aftercareBaseWage + aftercareEffectiveComm + aftercareMonthlyBonus + aftercareAnnualBonusAmt;
      const aftercareTotalCost = aftercareCompEach * aftercareCount;

      // D. Leader comp (on net volume after cemetery perpetual care — property only)
      const teamSalesVolume = closerCount * closerVolume + aftercareCount * aftercareVolume;
      const teamNetVolume = teamSalesVolume * (1 - (cemeteryMix / 100) * 0.70 * (perpCareRate / 100));
      const grossMonthlyOverride = teamNetVolume * 0.01;
      const netMonthlyOverride = grossMonthlyOverride;
      const leaderVolumePerPeriod = teamNetVolume / 2;
      const leaderBonusPerPeriod = calcSemiAnnualBonus(leaderVolumePerPeriod);
      const leaderAnnualSemiBonus = leaderBonusPerPeriod * 2;
      const leaderTotalCost = leaderBaseSalary + netMonthlyOverride + leaderAnnualSemiBonus;

      // E. Total sales comp
      const totalSalesComp = closerTotalCost + setterTotalCost + aftercareTotalCost + leaderTotalCost;

      // ── ENTITY SPLIT (based on commissionable bases, not raw face) ──
      // Property (70%) has perp care deducted, markers (30%) do not
      const cemeteryCommBase = cemeteryFace * 0.70 * (1 - perpCareRate / 100) + cemeteryFace * 0.30;
      const totalCommBase = insuranceFace + cemeteryCommBase;
      const cemeteryShare = totalCommBase > 0 ? cemeteryCommBase / totalCommBase : 0;
      const insuranceShare = 1 - cemeteryShare;
      const tjmShareOfInsurance = (prodMixes.wl + prodMixes.annuity + prodMixes.graded);
      const fhShareOfInsurance = prodMixes.trust;
      const fieldSalesComp = totalSalesComp - aftercareTotalCost;
      const cemeteryComp = fieldSalesComp * cemeteryShare;
      const tjmLifeComp = fieldSalesComp * insuranceShare * tjmShareOfInsurance;
      const fhComp = fieldSalesComp * insuranceShare * fhShareOfInsurance + aftercareTotalCost;

      // ── TJM LIFE P&L (1120-L mechanics) ──
      const investmentIncome = priorReserves * (earnRate / 100);
      const grossIncome = investmentIncome + totalPremiums;

      const netPremiumsToReserves = annuityPremiums + multiPayNetPremiums;
      const reserves = priorReserves + netPremiumsToReserves + investmentIncome - claimsPaid;
      const reserveChange = reserves - priorReserves;
      const section807 = reserveChange;

      const premTax = multiPayPremiums * (premiumTaxRate / 100);

      // TJM Life override — % of positive pre-tax income
      const tjmPreTax = investmentIncome + premiumLoading - tjmLifeComp - premTax;
      const tjmOverride = Math.max(0, tjmPreTax) * (additionalOverridePct / 100);

      // 1120-L tax calculation — override is a deductible expense
      const totalDeductions = section807 + claimsPaid + tjmLifeComp + premTax + tjmOverride;
      const taxableIncome = grossIncome - totalDeductions;
      const taxPaid = Math.max(0, taxableIncome) * (corporateTaxRate / 100);
      const effectiveRate = grossIncome > 0 ? (taxPaid / grossIncome) * 100 : 0;
      const tjmNet = tjmPreTax - tjmOverride - taxPaid;

      // ── FUNERAL HOME P&L ──
      const atNeedMargin = totalClaimValue * (1 - serviceDeliveryCost / 100);

      let financeChargeBase = 0;
      for (const V of vintages) {
        const n = Y - V.year;
        if (n >= avgPayTerm) continue;
        financeChargeBase += V.trustFace * blendedSurvival[n];
      }
      const financeChargeIncome = financeChargeBase * (financeChargeRate / 100);

      const fhPreTax = atNeedMargin + financeChargeIncome - fhComp;
      const fhOverride = Math.max(0, fhPreTax) * (additionalOverridePct / 100);
      const fhTax = Math.max(0, financeChargeIncome - fhOverride) * (passThroughTaxRate / 100);
      const fhNet = fhPreTax - fhOverride - fhTax;

      // ── CEMETERY P&L ──
      // 70% property at cemeteryMargin, 30% markers at 70% margin; perp care only on property
      const propertyFace = cemeteryFace * 0.70;
      const markerFace = cemeteryFace * 0.30;
      const cemeteryGrossProfit = propertyFace * (cemeteryMargin / 100) + markerFace * 0.70;
      const cemeteryPerpCare = propertyFace * (perpCareRate / 100);
      const cemeteryPreTax = cemeteryGrossProfit - cemeteryPerpCare - cemeteryComp;
      const cemeteryOverride = Math.max(0, cemeteryPreTax) * (additionalOverridePct / 100);
      const cemeteryTax = Math.max(0, cemeteryPreTax - cemeteryOverride) * (passThroughTaxRate / 100);
      const cemeteryNet = cemeteryPreTax - cemeteryOverride - cemeteryTax;

      // ── MANAGEMENT OVERRIDE (sum of per-entity) ──
      const additionalOverride = tjmOverride + fhOverride + cemeteryOverride;

      // ── COMBINED ──
      const combinedNet = tjmNet + fhNet + cemeteryNet;
      cumulativeTotal += combinedNet;
      cumulativeTJM += tjmNet;
      cumulativeFH += fhNet;

      yearData.push({
        year: Y,
        calendarYear: startYear + Y - 1,
        newProduction: newFace,
        insuranceFace,
        cemeteryFace,
        inForce: inForceFace,
        reserves,
        investmentIncome,
        grossIncome,
        salesComp: totalSalesComp,
        tjmLifeComp,
        cemeteryComp,
        fhComp,
        claimsPaid,
        reserveChange,
        section807,
        premiumTax: premTax,
        totalDeductions,
        taxableIncome,
        taxPaid,
        effectiveRate,
        totalPremiums,
        premiumLoading,
        tjmNet,
        atNeedMargin,
        financeChargeIncome,
        cemeteryNet,
        fhTax,
        fhNet,
        combinedNet,
        cumulativeTotal,
        cumulativeTJM,
        cumulativeFH,
        // Headcount
        closerCount,
        setterCount,
        aftercareCount: aftercareCount,
        leaderCount,
        totalHeadcount,
        // Per-role comp
        closerTotalCost,
        setterTotalCost,
        aftercareTotalCost,
        leaderTotalCost,
        additionalOverride,
        tjmOverride,
        fhOverride,
        cemeteryOverride,
        // Entity revenue
        tjmRevenue: investmentIncome + premiumLoading,
        cemeteryRevenue: cemeteryGrossProfit - cemeteryPerpCare,
        fhRevenue: atNeedMargin + financeChargeIncome,
        // Comp ratios
        compToRevenuePct: newFace > 0 ? (totalSalesComp / newFace) * 100 : 0,
      });

      priorReserves = reserves;
    }

    return { yearData };
  }, [
    initialProduction, growthRate, projectionYears, startYear,
    mixWL, mixAnnuity, mixGraded, mixTrust,
    mix3Pay, mix5Pay, mix10Pay, mix20Pay,
    mixAge40_60, mixAge61_65, mixAge66_70, mixAge71_75, mixAge76_80, mixAge81_85, mixAge86_90,
    earnRate, guaranteedRate,
    financeChargeRate, passThroughTaxRate, premiumTaxRate, corporateTaxRate,
    serviceDeliveryCost, chargebackRate,
    volumePerCloser, volumePerSetter, productionPerAftercare,
    closerHourlyWage, setterHourlyWage, aftercareHourlyWage,
    leaderBaseSalary,
    pctSetterSourced, closerSplitPct, aftercareAnnualVolume,
    aftercareLeadPct, specialistShare, additionalOverridePct,
    cemeteryMix, perpCareRate, cemeteryMargin,
  ]);

  const { yearData } = projection;
  const lastYear = yearData[yearData.length - 1];

  // Chart data
  const annualNetChartData = yearData.map(d => ({
    year: d.calendarYear,
    tjmNet: d.tjmNet,
    cemeteryNet: d.cemeteryNet,
    fhNet: d.fhNet,
    combinedNet: d.combinedNet,
  }));

  const compHealthChartData = yearData.map(d => ({
    year: d.calendarYear,
    closerCost: d.closerTotalCost,
    setterCost: d.setterTotalCost,
    aftercareCost: d.aftercareTotalCost,
    leaderCost: d.leaderTotalCost,
    combinedNet: d.combinedNet,
    compToRevenuePct: d.compToRevenuePct,
    revenuePerHead: d.newProduction / d.totalHeadcount,
    compPerHead: d.salesComp / d.totalHeadcount,
    tjmRevenue: d.tjmRevenue,
    tjmComp: d.tjmLifeComp,
    tjmNet: d.tjmNet,
    cemeteryRevenue: d.cemeteryRevenue,
    cemeteryComp: d.cemeteryComp,
    cemeteryNet: d.cemeteryNet,
    fhRevenue: d.fhRevenue,
    fhComp: d.fhComp,
    fhNet: d.fhNet,
  }));

  const yr1 = yearData[0];
  const yrN = yearData[yearData.length - 1];

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold text-navy-800">Enterprise P&L Projection</h2>
        <p className="text-sm text-navy-500 mt-1">20-year profitability projection showing TJM Life Insurance + funeral home combined income as preneed production scales.</p>
      </div>

      {/* ── Section 1: Settings Panel ── */}
      <section className="bg-white rounded-xl shadow-sm border border-navy-100">
        <button onClick={() => setSettingsOpen(!settingsOpen)} className="w-full flex items-center justify-between px-6 py-4">
          <h3 className="text-sm font-bold text-navy-700 uppercase tracking-wide">Settings & Assumptions</h3>
          <Chevron open={settingsOpen} />
        </button>
        {settingsOpen && (
          <div className="px-6 pb-6 space-y-6">
            {/* Row 1: Production */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <InputGroup label="Initial Annual Production">
                <NumberInput value={initialProduction} onChange={setInitialProduction} min={0} step={1000000} prefix="$" />
              </InputGroup>
              <InputGroup label="Growth Rate">
                <NumberInput value={growthRate} onChange={setGrowthRate} min={0} max={50} step={1} suffix="%" />
              </InputGroup>
              <InputGroup label="Projection Years">
                <select value={projectionYears} onChange={(e) => setProjectionYears(Number(e.target.value))}
                  className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                  <option value={10}>10 Years</option>
                  <option value={15}>15 Years</option>
                  <option value={20}>20 Years</option>
                  <option value={25}>25 Years</option>
                </select>
              </InputGroup>
              <InputGroup label="Start Year">
                <NumberInput value={startYear} onChange={setStartYear} min={2025} max={2035} step={1} />
              </InputGroup>
            </div>

            {/* Row 2: Cemetery */}
            <div>
              <span className="text-xs font-semibold text-navy-600 uppercase tracking-wide block mb-2">Cemetery</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <InputGroup label="Cemetery Mix"><NumberInput value={cemeteryMix} onChange={setCemeteryMix} min={0} max={100} step={1} suffix="%" /></InputGroup>
                <InputGroup label="Property / Markers">
                  <div className="w-full rounded-lg border border-navy-200 bg-navy-50 px-3 py-2 text-sm text-navy-500">70% / 30%</div>
                </InputGroup>
                <InputGroup label="Perpetual Care (Property Only)">
                  <div className="w-full rounded-lg border border-navy-200 bg-navy-50 px-3 py-2 text-sm text-navy-500">{perpCareRate}%</div>
                </InputGroup>
                <InputGroup label="Property Margin"><NumberInput value={cemeteryMargin} onChange={setCemeteryMargin} min={0} max={100} step={1} suffix="%" /></InputGroup>
                <InputGroup label="Marker Margin">
                  <div className="w-full rounded-lg border border-navy-200 bg-navy-50 px-3 py-2 text-sm text-navy-500">70%</div>
                </InputGroup>
              </div>
            </div>

            {/* Row 3: Product Mix */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-semibold text-navy-600 uppercase tracking-wide">Product Mix</span>
                <SumBadge values={[mixWL, mixAnnuity, mixGraded, mixTrust]} label="Sum" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <InputGroup label="Multi-Pay WL"><NumberInput value={mixWL} onChange={setMixWL} min={0} max={100} step={1} suffix="%" /></InputGroup>
                <InputGroup label="Single-Pay Annuity"><NumberInput value={mixAnnuity} onChange={setMixAnnuity} min={0} max={100} step={1} suffix="%" /></InputGroup>
                <InputGroup label="Graded DB"><NumberInput value={mixGraded} onChange={setMixGraded} min={0} max={100} step={1} suffix="%" /></InputGroup>
                <InputGroup label="Trust + Interest"><NumberInput value={mixTrust} onChange={setMixTrust} min={0} max={100} step={1} suffix="%" /></InputGroup>
              </div>
            </div>

            {/* Row 3: Payment Term Mix */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-semibold text-navy-600 uppercase tracking-wide">Payment Term Mix (WL/Graded)</span>
                <SumBadge values={[mix3Pay, mix5Pay, mix10Pay, mix20Pay]} label="Sum" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <InputGroup label="3-Pay"><NumberInput value={mix3Pay} onChange={setMix3Pay} min={0} max={100} step={1} suffix="%" /></InputGroup>
                <InputGroup label="5-Pay"><NumberInput value={mix5Pay} onChange={setMix5Pay} min={0} max={100} step={1} suffix="%" /></InputGroup>
                <InputGroup label="10-Pay"><NumberInput value={mix10Pay} onChange={setMix10Pay} min={0} max={100} step={1} suffix="%" /></InputGroup>
                <InputGroup label="20-Pay"><NumberInput value={mix20Pay} onChange={setMix20Pay} min={0} max={100} step={1} suffix="%" /></InputGroup>
              </div>
            </div>

            {/* Row 4: Age Distribution */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-semibold text-navy-600 uppercase tracking-wide">Age Distribution</span>
                <SumBadge values={[mixAge40_60, mixAge61_65, mixAge66_70, mixAge71_75, mixAge76_80, mixAge81_85, mixAge86_90]} label="Sum" />
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-4">
                <InputGroup label="40-60"><NumberInput value={mixAge40_60} onChange={setMixAge40_60} min={0} max={100} step={1} suffix="%" /></InputGroup>
                <InputGroup label="61-65"><NumberInput value={mixAge61_65} onChange={setMixAge61_65} min={0} max={100} step={1} suffix="%" /></InputGroup>
                <InputGroup label="66-70"><NumberInput value={mixAge66_70} onChange={setMixAge66_70} min={0} max={100} step={1} suffix="%" /></InputGroup>
                <InputGroup label="71-75"><NumberInput value={mixAge71_75} onChange={setMixAge71_75} min={0} max={100} step={1} suffix="%" /></InputGroup>
                <InputGroup label="76-80"><NumberInput value={mixAge76_80} onChange={setMixAge76_80} min={0} max={100} step={1} suffix="%" /></InputGroup>
                <InputGroup label="81-85"><NumberInput value={mixAge81_85} onChange={setMixAge81_85} min={0} max={100} step={1} suffix="%" /></InputGroup>
                <InputGroup label="86-90"><NumberInput value={mixAge86_90} onChange={setMixAge86_90} min={0} max={100} step={1} suffix="%" /></InputGroup>
              </div>
            </div>

            {/* Row 5: Financial */}
            <div>
              <span className="text-xs font-semibold text-navy-600 uppercase tracking-wide block mb-2">Financial Assumptions</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <InputGroup label="Earn Rate"><NumberInput value={earnRate} onChange={setEarnRate} min={0} max={15} step={0.25} suffix="%" /></InputGroup>
                <InputGroup label="Guaranteed Rate"><NumberInput value={guaranteedRate} onChange={setGuaranteedRate} min={0} max={10} step={0.25} suffix="%" /></InputGroup>
                <InputGroup label="FC Rate"><NumberInput value={financeChargeRate} onChange={setFinanceChargeRate} min={0} max={20} step={0.5} suffix="%" /></InputGroup>
                <InputGroup label="Pass-Through Tax"><NumberInput value={passThroughTaxRate} onChange={setPassThroughTaxRate} min={0} max={50} step={1} suffix="%" /></InputGroup>
                <InputGroup label="Premium Tax"><NumberInput value={premiumTaxRate} onChange={setPremiumTaxRate} min={0} max={5} step={0.125} suffix="%" /></InputGroup>
                <InputGroup label="Corporate Tax"><NumberInput value={corporateTaxRate} onChange={setCorporateTaxRate} min={0} max={40} step={1} suffix="%" /></InputGroup>
              </div>
            </div>

            {/* Row 6: Operating */}
            <div>
              <span className="text-xs font-semibold text-navy-600 uppercase tracking-wide block mb-2">Operating Assumptions</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <InputGroup label="FH Service Cost (% of face)"><NumberInput value={serviceDeliveryCost} onChange={setServiceDeliveryCost} min={0} max={100} step={1} suffix="%" /></InputGroup>
                <InputGroup label="Chargeback Rate"><NumberInput value={chargebackRate} onChange={setChargebackRate} min={0} max={50} step={0.5} suffix="%" /></InputGroup>
              </div>
            </div>

            {/* Row 7: Sales Team Scaling */}
            <div>
              <span className="text-xs font-semibold text-navy-600 uppercase tracking-wide block mb-2">Sales Team Scaling</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <InputGroup label="Volume per Preneed Specialist"><NumberInput value={volumePerCloser} onChange={setVolumePerCloser} min={500000} step={500000} prefix="$" /></InputGroup>
                <InputGroup label="Volume per Appt. Specialist"><NumberInput value={volumePerSetter} onChange={setVolumePerSetter} min={1000000} step={1000000} prefix="$" /></InputGroup>
                <InputGroup label="Prod. per Aftercare"><NumberInput value={productionPerAftercare} onChange={setProductionPerAftercare} min={1000000} step={1000000} prefix="$" /></InputGroup>
                <InputGroup label="Leader (fixed)">
                  <div className="w-full rounded-lg border border-navy-200 bg-navy-50 px-3 py-2 text-sm text-navy-500">1</div>
                </InputGroup>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
                <InputGroup label="Preneed Specialist Wage"><NumberInput value={closerHourlyWage} onChange={setCloserHourlyWage} min={0} max={50} step={0.50} prefix="$" /></InputGroup>
                <InputGroup label="Appt. Specialist Wage"><NumberInput value={setterHourlyWage} onChange={setSetterHourlyWage} min={0} max={50} step={0.50} prefix="$" /></InputGroup>
                <InputGroup label="Aftercare Specialist Wage"><NumberInput value={aftercareHourlyWage} onChange={setAftercareHourlyWage} min={0} max={50} step={0.50} prefix="$" /></InputGroup>
                <InputGroup label="Leader Base Salary"><NumberInput value={leaderBaseSalary} onChange={setLeaderBaseSalary} min={0} step={5000} prefix="$" /></InputGroup>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
                <InputGroup label="% Appt.-Sourced"><NumberInput value={pctSetterSourced} onChange={setPctSetterSourced} min={0} max={100} step={5} suffix="%" /></InputGroup>
                <InputGroup label="Preneed Split %"><NumberInput value={closerSplitPct} onChange={setCloserSplitPct} min={0} max={100} step={5} suffix="%" /></InputGroup>
                <InputGroup label="Aftercare Volume"><NumberInput value={aftercareAnnualVolume} onChange={setAftercareAnnualVolume} min={0} step={100000} prefix="$" /></InputGroup>
                <InputGroup label="Management Override"><NumberInput value={additionalOverridePct} onChange={setAdditionalOverridePct} min={0} max={10} step={0.25} suffix="%" /></InputGroup>
              </div>

              {/* Hiring Rules Callout */}
              {(() => {
                const yr1 = yearData[0];
                const yrN = yearData[yearData.length - 1];
                if (!yr1 || !yrN) return null;
                return (
                  <div className="mt-4 bg-navy-50 border border-navy-200 rounded-lg p-4">
                    <h4 className="text-xs font-bold text-navy-700 uppercase tracking-wide mb-3">Hiring Rules</h4>
                    <table className="w-full text-xs text-navy-600">
                      <thead>
                        <tr className="border-b-2 border-navy-200">
                          <th className="py-1.5 text-left font-semibold text-navy-700 w-1/4">Role</th>
                          <th className="py-1.5 text-left font-semibold text-navy-700">Rule</th>
                          <th className="py-1.5 text-center font-semibold text-navy-700 w-1/6">Year 1</th>
                          <th className="py-1.5 text-center font-semibold text-navy-700 w-1/6">Year {yearData.length}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-navy-100">
                          <td className="py-2 font-semibold text-navy-700">Preneed Specialists</td>
                          <td className="py-2">1 per {fmtLarge(volumePerCloser)} closer production (rounded up)</td>
                          <td className="py-2 text-center font-bold text-navy-800">{yr1.closerCount}</td>
                          <td className="py-2 text-center font-bold text-navy-800">{yrN.closerCount}</td>
                        </tr>
                        <tr className="border-b border-navy-100">
                          <td className="py-2 font-semibold text-navy-700">Appointment Specialists</td>
                          <td className="py-2">1 per {fmtLarge(volumePerSetter)} closer production (rounded up)</td>
                          <td className="py-2 text-center font-bold text-navy-800">{yr1.setterCount}</td>
                          <td className="py-2 text-center font-bold text-navy-800">{yrN.setterCount}</td>
                        </tr>
                        <tr className="border-b border-navy-100">
                          <td className="py-2 font-semibold text-navy-700">Aftercare Specialists</td>
                          <td className="py-2">1 per {fmtLarge(productionPerAftercare)} total production (rounded down, min 1)</td>
                          <td className="py-2 text-center font-bold text-navy-800">{yr1.aftercareCount}</td>
                          <td className="py-2 text-center font-bold text-navy-800">{yrN.aftercareCount}</td>
                        </tr>
                        <tr className="border-b border-navy-200">
                          <td className="py-2 font-semibold text-navy-700">Sales Leader</td>
                          <td className="py-2">Fixed &mdash; always 1</td>
                          <td className="py-2 text-center font-bold text-navy-800">{yr1.leaderCount}</td>
                          <td className="py-2 text-center font-bold text-navy-800">{yrN.leaderCount}</td>
                        </tr>
                        <tr className="bg-navy-100">
                          <td className="py-2 font-bold text-navy-800">Total</td>
                          <td className="py-2 text-navy-500">Production: {fmtLarge(yr1.newProduction)} &rarr; {fmtLarge(yrN.newProduction)} ({growthRate}%/yr)</td>
                          <td className="py-2 text-center font-bold text-navy-900 text-sm">{yr1.totalHeadcount}</td>
                          <td className="py-2 text-center font-bold text-navy-900 text-sm">{yrN.totalHeadcount}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            <div className="flex justify-end">
              <button onClick={resetDefaults} className="px-4 py-2 text-sm font-medium text-navy-600 bg-navy-100 hover:bg-navy-200 rounded-lg transition-colors">
                Reset Defaults
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Section 2: KPI Summary Cards ── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-navy-100 p-5">
          <p className="text-xs font-semibold text-navy-500 uppercase tracking-wide">Cumulative Retained</p>
          <p className="text-2xl font-bold text-teal-600 mt-1">{fmtLarge(lastYear?.cumulativeTotal)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-navy-100 p-5">
          <p className="text-xs font-semibold text-navy-500 uppercase tracking-wide">In-Force at Year {projectionYears}</p>
          <p className="text-2xl font-bold text-navy-800 mt-1">{fmtLarge(lastYear?.inForce)}</p>
        </div>
      </div>

      {/* ── Section 3: Annual Net Income Chart ── */}
      <section className="bg-navy-900 rounded-xl shadow-sm p-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wide mb-4">Annual Net Income</h3>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={annualNetChartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#243b53" />
              <XAxis dataKey="year" stroke="#9fb3c8" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmtLarge} stroke="#9fb3c8" tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#d9e2ec' }} />
              <Bar dataKey="tjmNet" name="TJM Life Net" stackId="net" fill="#2dd4bf" />
              <Bar dataKey="cemeteryNet" name="Cemetery Net" stackId="net" fill="#0891b2" />
              <Bar dataKey="fhNet" name="FH Net" stackId="net" fill="#27ab83" />
              <Line type="monotone" dataKey="combinedNet" name="Combined Profit" stroke="#ffffff" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ── Section 4: Compensation Health Analysis ── */}
      <section className="bg-white rounded-xl shadow-sm border border-navy-100">
        <button onClick={() => setCompHealthOpen(!compHealthOpen)} className="w-full flex items-center justify-between px-6 py-4">
          <h3 className="text-sm font-bold text-navy-700 uppercase tracking-wide">Compensation Health Analysis</h3>
          <Chevron open={compHealthOpen} />
        </button>
        {compHealthOpen && yr1 && yrN && (
          <div className="px-6 pb-6 space-y-6">
            {/* ── KPI Delta Cards ── */}
            {(() => {
              const totalComp = yearData.reduce((s, d) => s + d.salesComp, 0);
              const totalProd = yearData.reduce((s, d) => s + d.newProduction, 0);
              const avgCompPct = totalProd > 0 ? totalComp / totalProd : 0;
              const avgHealthy = avgCompPct < 0.15;
              const kpis = [
                {
                  label: 'Comp / Production',
                  v1: yr1.salesComp / yr1.newProduction,
                  vN: yrN.salesComp / yrN.newProduction,
                  fmt: v => fmtPct(v * 100),
                  lowerBetter: true,
                },
                {
                  label: 'Avg Comp / Production',
                  v1: avgCompPct,
                  vN: null,
                  fmt: v => fmtPct(v * 100),
                  lowerBetter: true,
                  threshold: true,
                },
                {
                  label: 'Profit / Production',
                  v1: yr1.newProduction > 0 ? yr1.combinedNet / yr1.newProduction : 0,
                  vN: yrN.newProduction > 0 ? yrN.combinedNet / yrN.newProduction : 0,
                  fmt: v => fmtPct(v * 100),
                  lowerBetter: false,
                  sublabel: `${fmtLarge(yr1.combinedNet)} / ${fmtLarge(yr1.newProduction)} \u2192 ${fmtLarge(yrN.combinedNet)} / ${fmtLarge(yrN.newProduction)}`,
                },
                {
                  label: 'Net per Head',
                  v1: yr1.combinedNet / yr1.totalHeadcount,
                  vN: yrN.combinedNet / yrN.totalHeadcount,
                  fmt: v => fmtLarge(v),
                  lowerBetter: false,
                },
                {
                  label: 'Total Headcount',
                  v1: yr1.totalHeadcount,
                  vN: yrN.totalHeadcount,
                  fmt: v => String(v),
                  lowerBetter: false,
                  neutral: true,
                },
              ];
              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {kpis.map(k => {
                    const improving = k.neutral || k.threshold ? null : k.lowerBetter ? k.vN < k.v1 : k.vN > k.v1;
                    return (
                      <div key={k.label} className="bg-navy-50 rounded-lg p-3 border border-navy-100">
                        <p className="text-[10px] font-semibold text-navy-500 uppercase tracking-wide">{k.label}</p>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-lg font-bold text-navy-800">{k.fmt(k.v1)}</span>
                          {k.threshold && (
                            <span className={`text-xs font-semibold ${avgHealthy ? 'text-green-600' : 'text-red-600'}`}>
                              {avgHealthy ? '< 15% \u2714' : '\u2265 15% \u26A0'}
                            </span>
                          )}
                          {!k.neutral && !k.threshold && k.vN != null && (
                            <span className={`text-xs font-semibold ${improving ? 'text-green-600' : 'text-red-600'}`}>
                              {k.vN > k.v1 ? '\u2191' : '\u2193'} {k.fmt(k.vN)}
                            </span>
                          )}
                          {k.neutral && (
                            <span className="text-xs font-semibold text-navy-500">
                              {'\u2192'} {k.fmt(k.vN)}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-navy-400 mt-0.5">{k.threshold ? `${yearData.length}-year average` : `Yr 1 \u2192 Yr ${yearData.length}`}</p>
                        {k.sublabel && <p className="text-[10px] text-navy-400">{k.sublabel}</p>}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* ── Chart 2: Comp by Role vs Net Income ── */}
            <div>
              <h4 className="text-xs font-semibold text-navy-600 uppercase tracking-wide mb-2">Compensation by Role vs. Combined Profit</h4>
              <div className="bg-navy-900 rounded-lg p-4">
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={compHealthChartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#243b53" />
                      <XAxis dataKey="year" stroke="#9fb3c8" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={fmtLarge} stroke="#9fb3c8" tick={{ fontSize: 11 }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11, color: '#d9e2ec' }} />
                      <Bar dataKey="closerCost" name="Preneed Specialist" stackId="role" fill="#2563eb" />
                      <Bar dataKey="setterCost" name="Appointment Specialist" stackId="role" fill="#7c3aed" />
                      <Bar dataKey="aftercareCost" name="Aftercare Specialist" stackId="role" fill="#059669" />
                      <Bar dataKey="leaderCost" name="Leader" stackId="role" fill="#0891b2" />
                      <Line type="monotone" dataKey="combinedNet" name="Combined Profit" stroke="#ffffff" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* ── Chart 3: Ratio + Per-Head (side by side) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Chart 3L: Comp/Production % */}
              <div>
                <h4 className="text-xs font-semibold text-navy-600 uppercase tracking-wide mb-2">Comp / Production %</h4>
                <div className="bg-navy-900 rounded-lg p-4">
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={compHealthChartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#243b53" />
                        <XAxis dataKey="year" stroke="#9fb3c8" tick={{ fontSize: 11 }} />
                        <YAxis unit="%" stroke="#9fb3c8" tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v) => fmtPct(v)} labelFormatter={(l) => `Year ${l}`} contentStyle={{ backgroundColor: '#102a43', border: '1px solid #334e68', borderRadius: '8px', fontSize: 12 }} />
                        <ReferenceLine y={12} stroke="#27ab83" strokeDasharray="6 3" label={{ value: 'Target 12%', position: 'right', fill: '#27ab83', fontSize: 10 }} />
                        <ReferenceLine y={18} stroke="#ef4444" strokeDasharray="6 3" label={{ value: 'Warning 18%', position: 'right', fill: '#ef4444', fontSize: 10 }} />
                        <Line type="monotone" dataKey="compToRevenuePct" name="Comp/Production %" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              {/* Chart 3R: Revenue vs Comp per Head */}
              <div>
                <h4 className="text-xs font-semibold text-navy-600 uppercase tracking-wide mb-2">Revenue vs. Comp per Head</h4>
                <div className="bg-navy-900 rounded-lg p-4">
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={compHealthChartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#243b53" />
                        <XAxis dataKey="year" stroke="#9fb3c8" tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={fmtLarge} stroke="#9fb3c8" tick={{ fontSize: 11 }} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11, color: '#d9e2ec' }} />
                        <Line type="monotone" dataKey="revenuePerHead" name="Revenue / Head" stroke="#2dd4bf" strokeWidth={2} dot={{ r: 3, fill: '#2dd4bf' }} />
                        <Line type="monotone" dataKey="compPerHead" name="Comp / Head" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: '#ef4444' }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── Projection Table (shared renderer) ── */}
      {(() => {
        const renderTable = (detail) => {
          const totals = yearData.reduce((acc, d) => ({
            newProduction: acc.newProduction + d.newProduction,
            grossIncome: acc.grossIncome + d.grossIncome,
            investmentIncome: acc.investmentIncome + d.investmentIncome,
            totalPremiums: acc.totalPremiums + d.totalPremiums,
            premiumLoading: acc.premiumLoading + d.premiumLoading,
            totalDeductions: acc.totalDeductions + d.totalDeductions,
            section807: acc.section807 + d.section807,
            claimsPaid: acc.claimsPaid + d.claimsPaid,
            salesComp: acc.salesComp + d.salesComp,
            additionalOverride: acc.additionalOverride + d.additionalOverride,
            premiumTax: acc.premiumTax + d.premiumTax,
            taxableIncome: acc.taxableIncome + d.taxableIncome,
            taxPaid: acc.taxPaid + d.taxPaid,
            tjmNet: acc.tjmNet + d.tjmNet,
            cemeteryNet: acc.cemeteryNet + d.cemeteryNet,
            fhNet: acc.fhNet + d.fhNet,
            combinedNet: acc.combinedNet + d.combinedNet,
          }), {
            newProduction: 0, grossIncome: 0, investmentIncome: 0, totalPremiums: 0,
            premiumLoading: 0, totalDeductions: 0, section807: 0, claimsPaid: 0, salesComp: 0, additionalOverride: 0,
            premiumTax: 0, taxableIncome: 0, taxPaid: 0,
            tjmNet: 0, cemeteryNet: 0, fhNet: 0, combinedNet: 0,
          });

          return (
            <table className="w-full text-xs border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-navy-100 text-navy-700">
                  <th className="px-3 py-2 text-left font-semibold sticky left-0 bg-navy-100 z-10">Year</th>
                  <th className="px-3 py-2 text-right font-semibold">New Prod.</th>
                  {detail && <th className="px-3 py-2 text-right font-semibold text-navy-500">Team</th>}
                  <th className="px-3 py-2 text-right font-semibold">In-Force</th>
                  <th className="px-3 py-2 text-right font-semibold">Reserves</th>
                  <th className="px-3 py-2 text-right font-semibold">Gross Income</th>
                  {detail && <th className="px-3 py-2 text-right font-semibold text-navy-500">Inv. Income</th>}
                  {detail && <th className="px-3 py-2 text-right font-semibold text-navy-500">Premiums</th>}
                  {detail && <th className="px-3 py-2 text-right font-semibold text-navy-500">Loading</th>}
                  <th className="px-3 py-2 text-right font-semibold">Deductions</th>
                  {detail && <th className="px-3 py-2 text-right font-semibold text-navy-500">&sect;807</th>}
                  {detail && <th className="px-3 py-2 text-right font-semibold text-navy-500">Claims</th>}
                  {detail && <th className="px-3 py-2 text-right font-semibold text-navy-500">Sales Comp</th>}
                  {detail && <th className="px-3 py-2 text-right font-semibold text-navy-500">Mgmt Override</th>}
                  {detail && <th className="px-3 py-2 text-right font-semibold text-navy-500">Comp/Rev</th>}
                  {detail && <th className="px-3 py-2 text-right font-semibold text-navy-500">Prem. Tax</th>}
                  <th className="px-3 py-2 text-right font-semibold">Taxable Inc.</th>
                  <th className="px-3 py-2 text-right font-semibold">Tax Paid</th>
                  <th className="px-3 py-2 text-right font-semibold">Tax Rate</th>
                  <th className="px-3 py-2 text-right font-semibold bg-navy-200">TJM Life Net</th>
                  <th className="px-3 py-2 text-right font-semibold">Cemetery Net</th>
                  <th className="px-3 py-2 text-right font-semibold bg-navy-200">FH Net</th>
                  <th className="px-3 py-2 text-right font-semibold bg-teal-100 text-teal-800">Combined</th>
                </tr>
              </thead>
              <tbody>
                {yearData.map((d, i) => (
                  <tr key={d.year} className={`${i % 2 === 0 ? 'bg-white' : 'bg-navy-50'} hover:bg-teal-50 transition-colors`}>
                    <td className={`px-3 py-1.5 font-semibold text-navy-700 sticky left-0 z-10 ${i % 2 === 0 ? 'bg-white' : 'bg-navy-50'}`}>
                      {d.calendarYear}
                    </td>
                    <td className="px-3 py-1.5 text-right text-navy-800">{fmtLarge(d.newProduction)}</td>
                    {detail && <td className="px-3 py-1.5 text-right text-navy-600" title={`${d.closerCount}C ${d.setterCount}S ${d.aftercareCount}A 1L`}>{d.totalHeadcount}</td>}
                    <td className="px-3 py-1.5 text-right text-navy-800">{fmtLarge(d.inForce)}</td>
                    <td className="px-3 py-1.5 text-right text-navy-800">{fmtLarge(d.reserves)}</td>
                    <td className="px-3 py-1.5 text-right text-navy-800">{fmtLarge(d.grossIncome)}</td>
                    {detail && <td className="px-3 py-1.5 text-right text-navy-600">{fmtLarge(d.investmentIncome)}</td>}
                    {detail && <td className="px-3 py-1.5 text-right text-navy-600">{fmtLarge(d.totalPremiums)}</td>}
                    {detail && <td className="px-3 py-1.5 text-right text-navy-600">{fmtLarge(d.premiumLoading)}</td>}
                    <td className="px-3 py-1.5 text-right text-navy-800">{fmtLarge(d.totalDeductions)}</td>
                    {detail && <td className="px-3 py-1.5 text-right text-navy-600">{fmtLarge(d.section807)}</td>}
                    {detail && <td className="px-3 py-1.5 text-right text-navy-600">{fmtLarge(d.claimsPaid)}</td>}
                    {detail && <td className="px-3 py-1.5 text-right text-navy-600">{fmtLarge(d.salesComp)}</td>}
                    {detail && <td className="px-3 py-1.5 text-right text-navy-600">{fmtLarge(d.additionalOverride)}</td>}
                    {detail && <td className={`px-3 py-1.5 text-right font-semibold ${d.compToRevenuePct > 18 ? 'text-red-600' : d.compToRevenuePct > 12 ? 'text-amber-600' : 'text-navy-600'}`}>{fmtPct(d.compToRevenuePct)}</td>}
                    {detail && <td className="px-3 py-1.5 text-right text-navy-600">{fmtLarge(d.premiumTax)}</td>}
                    <td className={`px-3 py-1.5 text-right ${d.taxableIncome < 0 ? 'text-red-600' : 'text-navy-800'}`}>{fmtLarge(d.taxableIncome)}</td>
                    <td className="px-3 py-1.5 text-right text-navy-800">{fmtLarge(d.taxPaid)}</td>
                    <td className={`px-3 py-1.5 text-right ${d.effectiveRate < 0 ? 'text-red-600' : 'text-navy-800'}`}>{fmtPct(d.effectiveRate)}</td>
                    <td className={`px-3 py-1.5 text-right font-semibold ${d.tjmNet < 0 ? 'text-red-600 bg-red-50' : 'text-navy-800 bg-navy-100'}`}>{fmtLarge(d.tjmNet)}</td>
                    <td className="px-3 py-1.5 text-right text-navy-800">{fmtLarge(d.cemeteryNet)}</td>
                    <td className={`px-3 py-1.5 text-right font-semibold ${d.fhNet < 0 ? 'text-red-600 bg-red-50' : 'text-navy-800 bg-navy-100'}`}>{fmtLarge(d.fhNet)}</td>
                    <td className={`px-3 py-1.5 text-right font-bold ${d.combinedNet < 0 ? 'text-red-600' : 'text-teal-700'} bg-teal-50`}>{fmtLarge(d.combinedNet)}</td>
                  </tr>
                ))}
                {yearData.length > 0 && (
                  <tr className="bg-navy-200 font-bold border-t-2 border-navy-400">
                    <td className="px-3 py-2 text-navy-800 sticky left-0 bg-navy-200 z-10">TOTAL</td>
                    <td className="px-3 py-2 text-right text-navy-800">{fmtLarge(totals.newProduction)}</td>
                    {detail && <td className="px-3 py-2 text-right text-navy-500">{'\u2014'}</td>}
                    <td className="px-3 py-2 text-right text-navy-500">{'\u2014'}</td>
                    <td className="px-3 py-2 text-right text-navy-500">{'\u2014'}</td>
                    <td className="px-3 py-2 text-right text-navy-800">{fmtLarge(totals.grossIncome)}</td>
                    {detail && <td className="px-3 py-2 text-right text-navy-800">{fmtLarge(totals.investmentIncome)}</td>}
                    {detail && <td className="px-3 py-2 text-right text-navy-800">{fmtLarge(totals.totalPremiums)}</td>}
                    {detail && <td className="px-3 py-2 text-right text-navy-800">{fmtLarge(totals.premiumLoading)}</td>}
                    <td className="px-3 py-2 text-right text-navy-800">{fmtLarge(totals.totalDeductions)}</td>
                    {detail && <td className="px-3 py-2 text-right text-navy-800">{fmtLarge(totals.section807)}</td>}
                    {detail && <td className="px-3 py-2 text-right text-navy-800">{fmtLarge(totals.claimsPaid)}</td>}
                    {detail && <td className="px-3 py-2 text-right text-navy-800">{fmtLarge(totals.salesComp)}</td>}
                    {detail && <td className="px-3 py-2 text-right text-navy-800">{fmtLarge(totals.additionalOverride)}</td>}
                    {detail && <td className="px-3 py-2 text-right text-navy-800">{totals.newProduction > 0 ? fmtPct((totals.salesComp / totals.newProduction) * 100) : '\u2014'}</td>}
                    {detail && <td className="px-3 py-2 text-right text-navy-800">{fmtLarge(totals.premiumTax)}</td>}
                    <td className={`px-3 py-2 text-right ${totals.taxableIncome < 0 ? 'text-red-600' : 'text-navy-800'}`}>{fmtLarge(totals.taxableIncome)}</td>
                    <td className="px-3 py-2 text-right text-navy-800">{fmtLarge(totals.taxPaid)}</td>
                    <td className="px-3 py-2 text-right text-navy-800">{totals.grossIncome > 0 ? fmtPct((totals.taxPaid / totals.grossIncome) * 100) : '\u2014'}</td>
                    <td className={`px-3 py-2 text-right ${totals.tjmNet < 0 ? 'text-red-600' : 'text-navy-800'} bg-navy-300`}>{fmtLarge(totals.tjmNet)}</td>
                    <td className="px-3 py-2 text-right text-navy-800">{fmtLarge(totals.cemeteryNet)}</td>
                    <td className={`px-3 py-2 text-right ${totals.fhNet < 0 ? 'text-red-600' : 'text-navy-800'} bg-navy-300`}>{fmtLarge(totals.fhNet)}</td>
                    <td className={`px-3 py-2 text-right ${totals.combinedNet < 0 ? 'text-red-600' : 'text-teal-700'} bg-teal-100`}>{fmtLarge(totals.combinedNet)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          );
        };

        return (
          <>
            {/* ── Section 5: Year-by-Year Projection Table ── */}
            <section className="bg-white rounded-xl shadow-sm border border-navy-100 overflow-hidden">
              <div className="bg-navy-800 px-6 py-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">Year-by-Year Projection</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowDetail(!showDetail)}
                    className="px-3 py-1 text-xs font-medium rounded-md bg-navy-700 text-navy-200 hover:bg-navy-600 hover:text-white transition-colors"
                  >
                    {showDetail ? 'Simple View' : 'Detailed View'}
                  </button>
                  <button
                    onClick={() => setTablePopout(true)}
                    className="px-3 py-1 text-xs font-medium rounded-md bg-navy-700 text-navy-200 hover:bg-navy-600 hover:text-white transition-colors"
                  >
                    Expand
                  </button>
                </div>
              </div>
              <div className="px-6 py-3 bg-navy-50 border-b border-navy-100">
                <p className="text-xs text-navy-600 leading-relaxed">
                  TJM Life Net = investment income + premium loading &minus; sales comp (insurance portion) &minus; tax.
                  Sales Comp includes base wages, commissions, monthly/annual bonuses, and leader comp &mdash; scaled by headcount which grows with production.
                  Comp is split by entity: insurance products &rarr; TJM Life, trust/aftercare &rarr; FH, cemetery &rarr; Cemetery.
                  Tax follows 1120-L mechanics: gross income &minus; deductions (&sect;807, claims, sales comp) = taxable income &times; 21%.
                  Negative taxable income means &sect;807 fully shelters income. Team column shows headcount (hover for breakdown).
                </p>
              </div>
              <div className="overflow-x-auto">
                {renderTable(showDetail)}
              </div>
            </section>

            {/* ── Fullscreen Table Popout ── */}
            {tablePopout && (
              <div className="fixed inset-0 z-50 bg-white flex flex-col">
                <div className="bg-navy-800 px-6 py-3 flex items-center justify-between shrink-0">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wide">Year-by-Year Projection — All Columns</h3>
                  <button
                    onClick={() => setTablePopout(false)}
                    className="px-3 py-1 text-xs font-medium rounded-md bg-navy-700 text-navy-200 hover:bg-navy-600 hover:text-white transition-colors"
                  >
                    Close
                  </button>
                </div>
                <div className="overflow-auto flex-1">
                  {renderTable(true)}
                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* ── Section 6: Footer ── */}
      <footer className="text-center text-xs text-navy-400 py-4">
        Projections based on current rate tables and SSA 2021 mortality data. Actual results will vary.
      </footer>
    </main>
  );
}
