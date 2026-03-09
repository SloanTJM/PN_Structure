import { useState, useMemo } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { buildDeathDistribution, getScaledRate, getGradedScaledRate, getGradedBenefitFactor } from '../calculations';
import { fmt, fmtPct, fmtLarge } from '../utils/formatters';
import InputGroup from '../components/InputGroup';
import NumberInput from '../components/NumberInput';
import Chevron from '../components/Chevron';

/* ─── Commission Rate Tables (duplicated from CommissionsPage — not exported) ─── */
const AGENT_RATES = {
  single: {
    '40-60': [10.00], '61-65': [9.40], '66-70': [7.80],
    '71-75': [6.00], '76-80': [4.60], '81-85': [2.40],
  },
  '3pay': {
    '40-60': [6.72, 2.24, 2.24], '61-65': [6.34, 2.11, 2.11],
    '66-70': [5.66, 1.89, 1.89], '71-75': [5.00, 1.67, 1.67],
    '76-80': [4.33, 1.44, 1.44], '81-85': [3.34, 1.11, 1.11],
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
const AGE_BANDS = ['40-60', '61-65', '66-70', '71-75', '76-80', '81-85'];
const AGE_MIDPOINTS = { '40-60': 50, '61-65': 63, '66-70': 68, '71-75': 73, '76-80': 78, '81-85': 83 };
const TERM_KEYS = [3, 5, 10, 20];

const DEFAULTS = {
  initialProduction: 20000000,
  growthRate: 3,
  projectionYears: 20,
  startYear: 2027,
  mixWL: 35, mixAnnuity: 35, mixGraded: 20, mixTrust: 10,
  mix3Pay: 15, mix5Pay: 35, mix10Pay: 35, mix20Pay: 15,
  mixAge40_60: 20, mixAge61_65: 25, mixAge66_70: 30, mixAge71_75: 15, mixAge76_80: 7, mixAge81_85: 3,
  earnRate: 4.5, guaranteedRate: 2,
  financeChargeRate: 7, passThroughTaxRate: 37, premiumTaxRate: 0.875, corporateTaxRate: 21,
  serviceDeliveryCost: 75, baseAdminCost: 200000, adminGrowthRate: 3, chargebackRate: 5,
  cemeteryMix: 50, perpCareRate: 10, cemeteryMargin: 50, cemeteryCommRate: 7.5,
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

  // Financial assumptions
  const [earnRate, setEarnRate] = useState(DEFAULTS.earnRate);
  const [guaranteedRate, setGuaranteedRate] = useState(DEFAULTS.guaranteedRate);
  const [financeChargeRate, setFinanceChargeRate] = useState(DEFAULTS.financeChargeRate);
  const [passThroughTaxRate, setPassThroughTaxRate] = useState(DEFAULTS.passThroughTaxRate);
  const [premiumTaxRate, setPremiumTaxRate] = useState(DEFAULTS.premiumTaxRate);
  const [corporateTaxRate, setCorporateTaxRate] = useState(DEFAULTS.corporateTaxRate);

  // Operating assumptions
  const [serviceDeliveryCost, setServiceDeliveryCost] = useState(DEFAULTS.serviceDeliveryCost);
  const [baseAdminCost, setBaseAdminCost] = useState(DEFAULTS.baseAdminCost);
  const [adminGrowthRate, setAdminGrowthRate] = useState(DEFAULTS.adminGrowthRate);
  const [chargebackRate, setChargebackRate] = useState(DEFAULTS.chargebackRate);

  // Cemetery
  const [cemeteryMix, setCemeteryMix] = useState(DEFAULTS.cemeteryMix);
  const [perpCareRate, setPerpCareRate] = useState(DEFAULTS.perpCareRate);
  const [cemeteryMargin, setCemeteryMargin] = useState(DEFAULTS.cemeteryMargin);
  const [cemeteryCommRate, setCemeteryCommRate] = useState(DEFAULTS.cemeteryCommRate);

  function resetDefaults() {
    setInitialProduction(DEFAULTS.initialProduction); setGrowthRate(DEFAULTS.growthRate);
    setProjectionYears(DEFAULTS.projectionYears); setStartYear(DEFAULTS.startYear);
    setMixWL(DEFAULTS.mixWL); setMixAnnuity(DEFAULTS.mixAnnuity);
    setMixGraded(DEFAULTS.mixGraded); setMixTrust(DEFAULTS.mixTrust);
    setMix3Pay(DEFAULTS.mix3Pay); setMix5Pay(DEFAULTS.mix5Pay);
    setMix10Pay(DEFAULTS.mix10Pay); setMix20Pay(DEFAULTS.mix20Pay);
    setMixAge40_60(DEFAULTS.mixAge40_60); setMixAge61_65(DEFAULTS.mixAge61_65);
    setMixAge66_70(DEFAULTS.mixAge66_70); setMixAge71_75(DEFAULTS.mixAge71_75);
    setMixAge76_80(DEFAULTS.mixAge76_80); setMixAge81_85(DEFAULTS.mixAge81_85);
    setEarnRate(DEFAULTS.earnRate); setGuaranteedRate(DEFAULTS.guaranteedRate);
    setFinanceChargeRate(DEFAULTS.financeChargeRate); setPassThroughTaxRate(DEFAULTS.passThroughTaxRate);
    setPremiumTaxRate(DEFAULTS.premiumTaxRate); setCorporateTaxRate(DEFAULTS.corporateTaxRate);
    setServiceDeliveryCost(DEFAULTS.serviceDeliveryCost); setBaseAdminCost(DEFAULTS.baseAdminCost);
    setAdminGrowthRate(DEFAULTS.adminGrowthRate); setChargebackRate(DEFAULTS.chargebackRate);
    setCemeteryMix(DEFAULTS.cemeteryMix); setPerpCareRate(DEFAULTS.perpCareRate);
    setCemeteryMargin(DEFAULTS.cemeteryMargin); setCemeteryCommRate(DEFAULTS.cemeteryCommRate);
  }

  /* ─── Calculation Engine ─── */
  const projection = useMemo(() => {
    const ageMixes = {
      '40-60': mixAge40_60 / 100, '61-65': mixAge61_65 / 100, '66-70': mixAge66_70 / 100,
      '71-75': mixAge71_75 / 100, '76-80': mixAge76_80 / 100, '81-85': mixAge81_85 / 100,
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

    // Step 3: Projection loop
    const vintages = [];
    const yearData = [];
    let priorReserves = 0;
    let cumulativeTotal = 0;
    let cumulativeTJM = 0;
    let cumulativeFH = 0;

    for (let Y = 1; Y <= projectionYears; Y++) {
      const newFace = initialProduction * Math.pow(1 + growthRate / 100, Y - 1);
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
      // Gross premiums = what customers actually pay (loaded rates)
      // Net premiums = actuarial cost portion (face / term) — goes into reserves
      // Loading = gross - net — TJM Life revenue that funds commissions and profit
      let multiPayPremiums = 0;
      let multiPayNetPremiums = 0;
      for (const V of vintages) {
        const n = Y - V.year;
        // WL premiums
        for (const term of TERM_KEYS) {
          if (n >= term) continue; // payment term expired
          const survivingFace = V.wlFace * termMixes[term] * blendedSurvival[n];
          multiPayPremiums += survivingFace * (weightedWLRate[term] || 0) * 12;
          multiPayNetPremiums += survivingFace / term;
        }
        // Graded premiums
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
        if (n < 1) continue; // no deaths in year of issue (n=0)
        const deathFrac = blendedDeathFrac[n];
        if (!deathFrac) continue;

        wlClaims += V.wlFace * deathFrac * 1.0;
        annuityClaims += V.annFace * deathFrac * Math.pow(1 + guaranteedRate / 100, n);
        gradedClaims += V.gradedFace * deathFrac * getGradedBenefitFactor(n);
        // Actual payout values for FH margin (includes trust at face)
        totalClaimValue += V.wlFace * deathFrac
          + V.annFace * deathFrac * Math.pow(1 + guaranteedRate / 100, n)
          + V.gradedFace * deathFrac * getGradedBenefitFactor(n)
          + V.trustFace * deathFrac;
      }
      const claimsPaid = wlClaims + annuityClaims + gradedClaims;

      // ── TJM LIFE P&L (1120-L mechanics) ──

      // Gross income (1120-L uses total premiums collected)
      const investmentIncome = priorReserves * (earnRate / 100);
      const grossIncome = investmentIncome + totalPremiums;

      // Reserves use NET premiums (loading stays with TJM Life as revenue)
      // Annuity premiums have no loading (single-pay = face value)
      const netPremiumsToReserves = annuityPremiums + multiPayNetPremiums;
      const reserves = priorReserves + netPremiumsToReserves + investmentIncome - claimsPaid;
      const reserveChange = reserves - priorReserves;
      const section807 = reserveChange; // §807: positive = deduction, negative = income inclusion

      // Operating expenses
      let commissions = 0;
      commissions += (wlFace + gradedFace) * commYr1;
      commissions += annFace * singlePayCommRate;
      if (Y >= 2) {
        const v1 = vintages.find(v => v.year === Y - 1);
        if (v1) commissions += (v1.wlFace + v1.gradedFace) * commYr2;
      }
      if (Y >= 3) {
        const v2 = vintages.find(v => v.year === Y - 2);
        if (v2) commissions += (v2.wlFace + v2.gradedFace) * commYr3;
      }
      commissions *= (1 - chargebackRate / 100);

      const adminCosts = baseAdminCost * Math.pow(1 + adminGrowthRate / 100, Y - 1);
      const premTax = multiPayPremiums * (premiumTaxRate / 100);

      // 1120-L tax calculation
      const totalDeductions = section807 + claimsPaid + commissions + adminCosts + premTax;
      const taxableIncome = grossIncome - totalDeductions;
      const taxPaid = Math.max(0, taxableIncome) * (corporateTaxRate / 100);
      const effectiveRate = grossIncome > 0 ? (taxPaid / grossIncome) * 100 : 0;

      // TJM Life Net: investment income + premium loading - operating costs - tax
      // Loading funds commissions; investment income funds long-term profit
      // When taxable income < 0: tjmNet = taxable income (no tax, §807 shelters)
      // When taxable income > 0: tjmNet = taxable income × (1 - 21%)
      const tjmNet = investmentIncome + premiumLoading - commissions - adminCosts - premTax - taxPaid;

      // ── FUNERAL HOME P&L ──
      const atNeedMargin = totalClaimValue * (1 - serviceDeliveryCost / 100);

      // Finance charge income: trust contracts in-force during payment term
      let financeChargeBase = 0;
      for (const V of vintages) {
        const n = Y - V.year;
        if (n >= avgPayTerm) continue; // past payment term
        financeChargeBase += V.trustFace * blendedSurvival[n];
      }
      const financeChargeIncome = financeChargeBase * (financeChargeRate / 100);

      // Guaranteed rate growth is captured in annuity claims: face * (1 + guaranteedRate%)^years
      // No separate annual FH line — it becomes FH income at claim via the larger death benefit

      // ── CEMETERY P&L ──
      const cemeteryGrossProfit = cemeteryFace * (cemeteryMargin / 100);
      const cemeteryPerpCare = cemeteryFace * (perpCareRate / 100);
      const cemeteryComm = (cemeteryFace - cemeteryPerpCare) * (cemeteryCommRate / 100);
      const cemeteryPreTax = cemeteryGrossProfit - cemeteryPerpCare - cemeteryComm;
      const cemeteryTax = cemeteryPreTax * (passThroughTaxRate / 100);
      const cemeteryNet = cemeteryPreTax - cemeteryTax;

      const trustComm = trustFace * trustCommRate;
      const fhTax = financeChargeIncome * (passThroughTaxRate / 100);
      const fhNet = atNeedMargin + financeChargeIncome - fhTax - trustComm;

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
        commissions,
        claimsPaid,
        reserveChange,
        section807,
        adminCosts,
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
      });

      priorReserves = reserves;
    }

    return { yearData };
  }, [
    initialProduction, growthRate, projectionYears, startYear,
    mixWL, mixAnnuity, mixGraded, mixTrust,
    mix3Pay, mix5Pay, mix10Pay, mix20Pay,
    mixAge40_60, mixAge61_65, mixAge66_70, mixAge71_75, mixAge76_80, mixAge81_85,
    earnRate, guaranteedRate,
    financeChargeRate, passThroughTaxRate, premiumTaxRate, corporateTaxRate,
    serviceDeliveryCost, baseAdminCost, adminGrowthRate, chargebackRate,
    cemeteryMix, perpCareRate, cemeteryMargin, cemeteryCommRate,
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
                <InputGroup label="Perpetual Care"><NumberInput value={perpCareRate} onChange={setPerpCareRate} min={0} max={25} step={1} suffix="%" /></InputGroup>
                <InputGroup label="Cemetery Margin"><NumberInput value={cemeteryMargin} onChange={setCemeteryMargin} min={0} max={100} step={1} suffix="%" /></InputGroup>
                <InputGroup label="Cemetery Commission"><NumberInput value={cemeteryCommRate} onChange={setCemeteryCommRate} min={0} max={20} step={0.5} suffix="%" /></InputGroup>
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
                <SumBadge values={[mixAge40_60, mixAge61_65, mixAge66_70, mixAge71_75, mixAge76_80, mixAge81_85]} label="Sum" />
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                <InputGroup label="40-60"><NumberInput value={mixAge40_60} onChange={setMixAge40_60} min={0} max={100} step={1} suffix="%" /></InputGroup>
                <InputGroup label="61-65"><NumberInput value={mixAge61_65} onChange={setMixAge61_65} min={0} max={100} step={1} suffix="%" /></InputGroup>
                <InputGroup label="66-70"><NumberInput value={mixAge66_70} onChange={setMixAge66_70} min={0} max={100} step={1} suffix="%" /></InputGroup>
                <InputGroup label="71-75"><NumberInput value={mixAge71_75} onChange={setMixAge71_75} min={0} max={100} step={1} suffix="%" /></InputGroup>
                <InputGroup label="76-80"><NumberInput value={mixAge76_80} onChange={setMixAge76_80} min={0} max={100} step={1} suffix="%" /></InputGroup>
                <InputGroup label="81-85"><NumberInput value={mixAge81_85} onChange={setMixAge81_85} min={0} max={100} step={1} suffix="%" /></InputGroup>
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
                <InputGroup label="Base Admin Cost"><NumberInput value={baseAdminCost} onChange={setBaseAdminCost} min={0} step={10000} prefix="$" /></InputGroup>
                <InputGroup label="Admin Growth Rate"><NumberInput value={adminGrowthRate} onChange={setAdminGrowthRate} min={0} max={20} step={0.5} suffix="%" /></InputGroup>
                <InputGroup label="Chargeback Rate"><NumberInput value={chargebackRate} onChange={setChargebackRate} min={0} max={50} step={0.5} suffix="%" /></InputGroup>
              </div>
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
              <Line type="monotone" dataKey="combinedNet" name="Combined Net" stroke="#ffffff" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
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
            commissions: acc.commissions + d.commissions,
            adminCosts: acc.adminCosts + d.adminCosts,
            premiumTax: acc.premiumTax + d.premiumTax,
            taxableIncome: acc.taxableIncome + d.taxableIncome,
            taxPaid: acc.taxPaid + d.taxPaid,
            tjmNet: acc.tjmNet + d.tjmNet,
            cemeteryNet: acc.cemeteryNet + d.cemeteryNet,
            fhNet: acc.fhNet + d.fhNet,
            combinedNet: acc.combinedNet + d.combinedNet,
          }), {
            newProduction: 0, grossIncome: 0, investmentIncome: 0, totalPremiums: 0,
            premiumLoading: 0, totalDeductions: 0, section807: 0, claimsPaid: 0, commissions: 0,
            adminCosts: 0, premiumTax: 0, taxableIncome: 0, taxPaid: 0,
            tjmNet: 0, cemeteryNet: 0, fhNet: 0, combinedNet: 0,
          });

          return (
            <table className="w-full text-xs border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-navy-100 text-navy-700">
                  <th className="px-3 py-2 text-left font-semibold sticky left-0 bg-navy-100 z-10">Year</th>
                  <th className="px-3 py-2 text-right font-semibold">New Prod.</th>
                  <th className="px-3 py-2 text-right font-semibold">In-Force</th>
                  <th className="px-3 py-2 text-right font-semibold">Reserves</th>
                  <th className="px-3 py-2 text-right font-semibold">Gross Income</th>
                  {detail && <th className="px-3 py-2 text-right font-semibold text-navy-500">Inv. Income</th>}
                  {detail && <th className="px-3 py-2 text-right font-semibold text-navy-500">Premiums</th>}
                  {detail && <th className="px-3 py-2 text-right font-semibold text-navy-500">Loading</th>}
                  <th className="px-3 py-2 text-right font-semibold">Deductions</th>
                  {detail && <th className="px-3 py-2 text-right font-semibold text-navy-500">&sect;807</th>}
                  {detail && <th className="px-3 py-2 text-right font-semibold text-navy-500">Claims</th>}
                  {detail && <th className="px-3 py-2 text-right font-semibold text-navy-500">Commissions</th>}
                  {detail && <th className="px-3 py-2 text-right font-semibold text-navy-500">Admin</th>}
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
                    <td className="px-3 py-1.5 text-right text-navy-800">{fmtLarge(d.inForce)}</td>
                    <td className="px-3 py-1.5 text-right text-navy-800">{fmtLarge(d.reserves)}</td>
                    <td className="px-3 py-1.5 text-right text-navy-800">{fmtLarge(d.grossIncome)}</td>
                    {detail && <td className="px-3 py-1.5 text-right text-navy-600">{fmtLarge(d.investmentIncome)}</td>}
                    {detail && <td className="px-3 py-1.5 text-right text-navy-600">{fmtLarge(d.totalPremiums)}</td>}
                    {detail && <td className="px-3 py-1.5 text-right text-navy-600">{fmtLarge(d.premiumLoading)}</td>}
                    <td className="px-3 py-1.5 text-right text-navy-800">{fmtLarge(d.totalDeductions)}</td>
                    {detail && <td className="px-3 py-1.5 text-right text-navy-600">{fmtLarge(d.section807)}</td>}
                    {detail && <td className="px-3 py-1.5 text-right text-navy-600">{fmtLarge(d.claimsPaid)}</td>}
                    {detail && <td className="px-3 py-1.5 text-right text-navy-600">{fmtLarge(d.commissions)}</td>}
                    {detail && <td className="px-3 py-1.5 text-right text-navy-600">{fmtLarge(d.adminCosts)}</td>}
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
                    <td className="px-3 py-2 text-right text-navy-500">{'\u2014'}</td>
                    <td className="px-3 py-2 text-right text-navy-500">{'\u2014'}</td>
                    <td className="px-3 py-2 text-right text-navy-800">{fmtLarge(totals.grossIncome)}</td>
                    {detail && <td className="px-3 py-2 text-right text-navy-800">{fmtLarge(totals.investmentIncome)}</td>}
                    {detail && <td className="px-3 py-2 text-right text-navy-800">{fmtLarge(totals.totalPremiums)}</td>}
                    {detail && <td className="px-3 py-2 text-right text-navy-800">{fmtLarge(totals.premiumLoading)}</td>}
                    <td className="px-3 py-2 text-right text-navy-800">{fmtLarge(totals.totalDeductions)}</td>
                    {detail && <td className="px-3 py-2 text-right text-navy-800">{fmtLarge(totals.section807)}</td>}
                    {detail && <td className="px-3 py-2 text-right text-navy-800">{fmtLarge(totals.claimsPaid)}</td>}
                    {detail && <td className="px-3 py-2 text-right text-navy-800">{fmtLarge(totals.commissions)}</td>}
                    {detail && <td className="px-3 py-2 text-right text-navy-800">{fmtLarge(totals.adminCosts)}</td>}
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
                  TJM Life Net = investment income + premium loading &minus; operating costs &minus; tax.
                  Premium loading (gross premiums &minus; actuarial cost) is TJM Life revenue that funds commissions and profit; only the net premium portion flows into reserves.
                  Tax follows 1120-L mechanics: gross income &minus; deductions (&sect;807, claims, operating costs) = taxable income &times; 21%.
                  Negative taxable income means &sect;807 fully shelters income &mdash; no federal tax owed. May generate NOL carryforwards.
                  Tax Rate shows tax paid as a percentage of gross income &mdash; typically well under 21% because the &sect;807 reserve deduction shelters most income during growth years.
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
