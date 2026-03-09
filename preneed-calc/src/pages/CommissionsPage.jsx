import { useState, useMemo } from 'react';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { fmt, fmtPct, fmtLarge } from '../utils/formatters';
import InputGroup from '../components/InputGroup';
import NumberInput from '../components/NumberInput';
import Chevron from '../components/Chevron';

/* ─── Commission Rate Tables (% of face, agent only, excludes override) ─── */
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

/* Semi-annual bonus tiers (marginal/incremental per 6-month period) */
const SEMI_ANNUAL_TIERS = [
  { floor: 2000000, ceiling: 3000000,    rate: 1.00 },
  { floor: 3000000, ceiling: 4000000,    rate: 1.25 },
  { floor: 4000000, ceiling: 5000000,    rate: 1.50 },
  { floor: 5000000, ceiling: 6000000,    rate: 1.75 },
  { floor: 6000000, ceiling: 7000000,    rate: 2.00 },
  { floor: 7000000, ceiling: 8000000,    rate: 2.00 },
  { floor: 8000000, ceiling: 9000000,    rate: 2.25 },
  { floor: 9000000, ceiling: 10000000,   rate: 2.25 },
  { floor: 10000000, ceiling: Infinity,  rate: 2.50 },
];

function calcSemiAnnualBonus(volumePerPeriod) {
  let bonus = 0;
  for (const tier of SEMI_ANNUAL_TIERS) {
    if (volumePerPeriod <= tier.floor) break;
    const taxable = Math.min(volumePerPeriod, tier.ceiling) - tier.floor;
    bonus += taxable * (tier.rate / 100);
  }
  return bonus;
}

const TERM_KEYS = ['single', '3pay', '5pay', '10pay', '20pay'];
const TERM_LABELS = { single: 'Single Pay', '3pay': '3-Pay', '5pay': '5-Pay', '10pay': '10-Pay', '20pay': '20-Pay' };
const AGE_BANDS = ['40-60', '61-65', '66-70', '71-75', '76-80', '81-85'];

const MONTHLY_BONUSES = [
  { threshold: 300000, bonus: 2500 },
  { threshold: 250000, bonus: 1500 },
  { threshold: 200000, bonus: 1000 },
  { threshold: 150000, bonus: 500 },
];

const ANNUAL_BONUSES = [
  { threshold: 5000000, bonus: 100000 },
  { threshold: 4000000, bonus: 75000 },
  { threshold: 3000000, bonus: 55000 },
  { threshold: 2500000, bonus: 25000 },
  { threshold: 2000000, bonus: 5000 },
];

/* ─── Role Constants ─── */
const ROLE_KEYS = ['closer', 'setter', 'aftercare'];
const ROLE_LABELS = { closer: 'Closer', setter: 'Setter', aftercare: 'Aftercare Specialist' };
const ROLE_COLORS = { closer: '#2563eb', setter: '#7c3aed', aftercare: '#059669' };

const ROLE_DEFAULTS = {
  closer:    { hourlyWage: 13.50, hoursPerWeek: 40, weeksPerYear: 52, annualFaceValue: 2000000, teamCount: 2, teamAvgVolume: 2000000 },
  setter:    { hourlyWage: 17.00, hoursPerWeek: 40, weeksPerYear: 52, annualFaceValue: 1200000, teamCount: 2, teamAvgVolume: 1200000 },
  aftercare: { hourlyWage: 17.00, hoursPerWeek: 40, weeksPerYear: 52, annualFaceValue: 1000000, teamCount: 1, teamAvgVolume: 1000000 },
};

const AFTERCARE_DEFAULTS = {
  aftercareLeadPct: 65,
  specialistShare: 70,
};

const DEFAULTS = {
  chargebackRate: 5,
  modelingYear: 1,
  leaderBaseSalary: 125982,
  leaderFeeRate: 3,
  mixSinglePay: 30, mix3Pay: 15, mix5Pay: 25, mix10Pay: 20, mix20Pay: 10,
  mixAge40_60: 20, mixAge61_65: 25, mixAge66_70: 30, mixAge71_75: 15, mixAge76_80: 7, mixAge81_85: 3,
  mixPreneed: 40, mixCemetery: 50, mixTrust: 5, mixTerminal: 5,
};

/* ─── Calculations ─── */
function calcCommissions(s, options) {
  const termMixes = { single: s.mixSinglePay, '3pay': s.mix3Pay, '5pay': s.mix5Pay, '10pay': s.mix10Pay, '20pay': s.mix20Pay };
  const ageMixes = { '40-60': s.mixAge40_60, '61-65': s.mixAge61_65, '66-70': s.mixAge66_70, '71-75': s.mixAge71_75, '76-80': s.mixAge76_80, '81-85': s.mixAge81_85 };

  let preneedYr1 = 0, preneedYr2 = 0, preneedYr3 = 0;

  for (const term of TERM_KEYS) {
    const termTable = AGENT_RATES[term];
    for (const age of AGE_BANDS) {
      if (!termTable[age]) continue;
      const weight = (ageMixes[age] / 100) * (termMixes[term] / 100) * (s.mixPreneed / 100);
      const volume = s.annualFaceValue * weight;
      const rates = termTable[age];
      preneedYr1 += volume * (rates[0] / 100);
      if (s.modelingYear >= 2 && rates[1]) preneedYr2 += volume * (rates[1] / 100);
      if (s.modelingYear >= 3 && rates[2]) preneedYr3 += volume * (rates[2] / 100);
    }
  }

  const cemeteryComm = s.annualFaceValue * (s.mixCemetery / 100) * 0.075;
  const trustComm = s.annualFaceValue * (s.mixTrust / 100) * 0.0375;
  const terminalComm = s.annualFaceValue * (s.mixTerminal / 100) * 0.01;

  const totalPreneed = preneedYr1 + preneedYr2 + preneedYr3;
  const grossComm = totalPreneed + cemeteryComm + trustComm + terminalComm;
  const chargebacks = (grossComm - terminalComm) * (s.chargebackRate / 100);
  const netComm = grossComm - chargebacks;

  const blendedRate = s.annualFaceValue > 0 ? (grossComm / s.annualFaceValue) * 100 : 0;

  // Aftercare split
  let effectiveNetComm = netComm;
  let fdReferralShare = 0;
  if (options && options.aftercareLeadPct > 0) {
    const leadPct = options.aftercareLeadPct / 100;
    const specShare = options.specialistShare / 100;
    const aftercarePortion = netComm * leadPct * specShare;
    const nonAftercarePortion = netComm * (1 - leadPct);
    effectiveNetComm = aftercarePortion + nonAftercarePortion;
    fdReferralShare = netComm * leadPct * (1 - specShare);
  }

  // Bonuses (based on full volume, not split-adjusted)
  const monthlyAvg = s.annualFaceValue / 12;
  let monthlyBonus = 0;
  for (const tier of MONTHLY_BONUSES) {
    if (monthlyAvg >= tier.threshold) { monthlyBonus = tier.bonus; break; }
  }
  const annualMonthlyBonusTotal = monthlyBonus * 12;

  let annualBonus = 0;
  for (const tier of ANNUAL_BONUSES) {
    if (s.annualFaceValue >= tier.threshold) annualBonus += tier.bonus;
  }

  const baseWage = s.hourlyWage * s.hoursPerWeek * s.weeksPerYear;
  const totalAgentComp = baseWage + effectiveNetComm + annualMonthlyBonusTotal + annualBonus;

  return {
    baseWage, preneedYr1, preneedYr2, preneedYr3, totalPreneed,
    cemeteryComm, trustComm, terminalComm, grossComm, chargebacks,
    netComm, effectiveNetComm, fdReferralShare, blendedRate,
    monthlyBonus, annualMonthlyBonusTotal, annualBonus, totalAgentComp,
  };
}

function calcLeaderComp(s, roles) {
  const teamVolume = ROLE_KEYS.reduce((sum, key) => sum + roles[key].teamCount * roles[key].teamAvgVolume, 0);

  const grossMonthlyOverride = teamVolume * 0.01;
  const feeDeductions = grossMonthlyOverride * (s.leaderFeeRate / 100);
  const netMonthlyOverride = grossMonthlyOverride - feeDeductions;

  const volumePerPeriod = teamVolume / 2;
  const bonusPerPeriod = calcSemiAnnualBonus(volumePerPeriod);
  const annualSemiBonus = bonusPerPeriod * 2;

  const totalLeaderComp = s.leaderBaseSalary + netMonthlyOverride + annualSemiBonus;

  return {
    teamVolume, grossMonthlyOverride, feeDeductions, netMonthlyOverride,
    volumePerPeriod, bonusPerPeriod, annualSemiBonus, totalLeaderComp,
  };
}

function buildChartData(sharedState, roles, aftercareLeadPct, specialistShare) {
  const points = [];
  for (let fv = 0; fv <= 5000000; fv += 100000) {
    const point = { faceValue: fv };
    for (const key of ROLE_KEYS) {
      const role = roles[key];
      const st = { ...sharedState, annualFaceValue: fv, hourlyWage: role.hourlyWage, hoursPerWeek: role.hoursPerWeek, weeksPerYear: role.weeksPerYear };
      const opts = key === 'aftercare' ? { aftercareLeadPct, specialistShare } : null;
      const c = calcCommissions(st, opts);
      point[`total_${key}`] = c.totalAgentComp;
    }
    points.push(point);
  }
  return points;
}

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

/* ─── Chart Tooltip ─── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-navy-300 font-semibold mb-1">{fmtLarge(label)} Face Value</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {fmt(p.value)}</p>
      ))}
    </div>
  );
}

/* ─── Main Component ─── */
export default function CommissionsPage() {
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [rateTablesOpen, setRateTablesOpen] = useState(false);

  // Role-based state
  const [roles, setRoles] = useState(ROLE_DEFAULTS);
  const [aftercareLeadPct, setAftercareLeadPct] = useState(AFTERCARE_DEFAULTS.aftercareLeadPct);
  const [specialistShare, setSpecialistShare] = useState(AFTERCARE_DEFAULTS.specialistShare);

  function updateRole(roleKey, field, value) {
    setRoles(prev => ({ ...prev, [roleKey]: { ...prev[roleKey], [field]: value } }));
  }

  // Shared state
  const [chargebackRate, setChargebackRate] = useState(DEFAULTS.chargebackRate);
  const [modelingYear, setModelingYear] = useState(DEFAULTS.modelingYear);
  const [leaderBaseSalary, setLeaderBaseSalary] = useState(DEFAULTS.leaderBaseSalary);
  const [leaderFeeRate, setLeaderFeeRate] = useState(DEFAULTS.leaderFeeRate);

  // Product mix
  const [mixPreneed, setMixPreneed] = useState(DEFAULTS.mixPreneed);
  const [mixCemetery, setMixCemetery] = useState(DEFAULTS.mixCemetery);
  const [mixTrust, setMixTrust] = useState(DEFAULTS.mixTrust);
  const [mixTerminal, setMixTerminal] = useState(DEFAULTS.mixTerminal);

  // Payment term mix
  const [mixSinglePay, setMixSinglePay] = useState(DEFAULTS.mixSinglePay);
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

  const sharedState = {
    chargebackRate, modelingYear, leaderBaseSalary, leaderFeeRate,
    mixPreneed, mixCemetery, mixTrust, mixTerminal,
    mixSinglePay, mix3Pay, mix5Pay, mix10Pay, mix20Pay,
    mixAge40_60, mixAge61_65, mixAge66_70, mixAge71_75, mixAge76_80, mixAge81_85,
  };

  const commByRole = useMemo(() => {
    const result = {};
    for (const key of ROLE_KEYS) {
      const role = roles[key];
      const s = { ...sharedState, annualFaceValue: role.annualFaceValue, hourlyWage: role.hourlyWage, hoursPerWeek: role.hoursPerWeek, weeksPerYear: role.weeksPerYear };
      const opts = key === 'aftercare' ? { aftercareLeadPct, specialistShare } : null;
      result[key] = calcCommissions(s, opts);
    }
    return result;
  }, [roles, aftercareLeadPct, specialistShare,
    chargebackRate, modelingYear,
    mixPreneed, mixCemetery, mixTrust, mixTerminal,
    mixSinglePay, mix3Pay, mix5Pay, mix10Pay, mix20Pay,
    mixAge40_60, mixAge61_65, mixAge66_70, mixAge71_75, mixAge76_80, mixAge81_85,
  ]);

  const leader = useMemo(() => calcLeaderComp(sharedState, roles), [
    roles, leaderBaseSalary, leaderFeeRate,
  ]);

  const chartData = useMemo(() => buildChartData(sharedState, roles, aftercareLeadPct, specialistShare), [
    roles, aftercareLeadPct, specialistShare,
    chargebackRate, modelingYear,
    mixPreneed, mixCemetery, mixTrust, mixTerminal,
    mixSinglePay, mix3Pay, mix5Pay, mix10Pay, mix20Pay,
    mixAge40_60, mixAge61_65, mixAge66_70, mixAge71_75, mixAge76_80, mixAge81_85,
  ]);

  function resetDefaults() {
    setRoles(ROLE_DEFAULTS);
    setAftercareLeadPct(AFTERCARE_DEFAULTS.aftercareLeadPct);
    setSpecialistShare(AFTERCARE_DEFAULTS.specialistShare);
    setChargebackRate(DEFAULTS.chargebackRate); setModelingYear(DEFAULTS.modelingYear);
    setLeaderBaseSalary(DEFAULTS.leaderBaseSalary); setLeaderFeeRate(DEFAULTS.leaderFeeRate);
    setMixPreneed(DEFAULTS.mixPreneed); setMixCemetery(DEFAULTS.mixCemetery);
    setMixTrust(DEFAULTS.mixTrust); setMixTerminal(DEFAULTS.mixTerminal);
    setMixSinglePay(DEFAULTS.mixSinglePay); setMix3Pay(DEFAULTS.mix3Pay);
    setMix5Pay(DEFAULTS.mix5Pay); setMix10Pay(DEFAULTS.mix10Pay); setMix20Pay(DEFAULTS.mix20Pay);
    setMixAge40_60(DEFAULTS.mixAge40_60); setMixAge61_65(DEFAULTS.mixAge61_65);
    setMixAge66_70(DEFAULTS.mixAge66_70); setMixAge71_75(DEFAULTS.mixAge71_75);
    setMixAge76_80(DEFAULTS.mixAge76_80); setMixAge81_85(DEFAULTS.mixAge81_85);
  }

  // Active bonus tiers (use closer volume as reference for highlighting)
  const closerMonthlyAvg = roles.closer.annualFaceValue / 12;
  const activeMonthlyTier = MONTHLY_BONUSES.find(t => closerMonthlyAvg >= t.threshold)?.threshold;
  const activeAnnualTiers = ANNUAL_BONUSES.filter(t => roles.closer.annualFaceValue >= t.threshold).map(t => t.threshold);

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold text-navy-800">Commissions & Compensation Model</h2>
        <p className="text-sm text-navy-500 mt-1">Model role-based comp (Closer / Setter / Aftercare Specialist) and sales leader override based on face value sold, product mix, and bonus tiers.</p>
      </div>

      {/* ── Section 1: Settings Panel ── */}
      <section className="bg-white rounded-xl shadow-sm border border-navy-100">
        <button onClick={() => setSettingsOpen(!settingsOpen)} className="w-full flex items-center justify-between px-6 py-4">
          <h3 className="text-sm font-bold text-navy-700 uppercase tracking-wide">Settings & Assumptions</h3>
          <Chevron open={settingsOpen} />
        </button>
        {settingsOpen && (
          <div className="px-6 pb-6 space-y-6">
            {/* Shared Settings */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <InputGroup label="Chargeback Rate">
                <NumberInput value={chargebackRate} onChange={setChargebackRate} min={0} max={50} step={0.5} suffix="%" />
              </InputGroup>
              <InputGroup label="Modeling Year">
                <select value={modelingYear} onChange={(e) => setModelingYear(Number(e.target.value))}
                  className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                  <option value={1}>Year 1 (new book)</option>
                  <option value={2}>Year 2 (yr2 renewals)</option>
                  <option value={3}>Year 3+ (steady state)</option>
                </select>
              </InputGroup>
              <InputGroup label="Leader Base Salary">
                <NumberInput value={leaderBaseSalary} onChange={setLeaderBaseSalary} min={0} step={1000} prefix="$" />
              </InputGroup>
              <InputGroup label="Leader Fee Deduction">
                <NumberInput value={leaderFeeRate} onChange={setLeaderFeeRate} min={0} max={100} step={0.5} suffix="%" />
              </InputGroup>
            </div>

            {/* Per-Role Settings */}
            <div>
              <span className="text-xs font-semibold text-navy-600 uppercase tracking-wide">Per-Role Settings</span>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-2">
                {ROLE_KEYS.map(key => (
                  <div key={key} className="border rounded-lg overflow-hidden" style={{ borderColor: ROLE_COLORS[key] + '40' }}>
                    <div className="px-4 py-2 text-sm font-bold text-white" style={{ backgroundColor: ROLE_COLORS[key] }}>
                      {ROLE_LABELS[key]}
                    </div>
                    <div className="px-4 py-3 space-y-3 bg-white">
                      <InputGroup label="Annual Face Value Sold">
                        <NumberInput value={roles[key].annualFaceValue} onChange={v => updateRole(key, 'annualFaceValue', v)} min={0} step={100000} prefix="$" />
                      </InputGroup>
                      <InputGroup label="Base Hourly Wage">
                        <NumberInput value={roles[key].hourlyWage} onChange={v => updateRole(key, 'hourlyWage', v)} min={0} step={0.50} prefix="$" />
                      </InputGroup>
                      <div className="grid grid-cols-2 gap-3">
                        <InputGroup label="Hours / Week">
                          <NumberInput value={roles[key].hoursPerWeek} onChange={v => updateRole(key, 'hoursPerWeek', v)} min={0} max={80} step={1} />
                        </InputGroup>
                        <InputGroup label="Weeks / Year">
                          <NumberInput value={roles[key].weeksPerYear} onChange={v => updateRole(key, 'weeksPerYear', v)} min={0} max={52} step={1} />
                        </InputGroup>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <InputGroup label="Team Count">
                          <NumberInput value={roles[key].teamCount} onChange={v => updateRole(key, 'teamCount', v)} min={0} max={50} step={1} />
                        </InputGroup>
                        <InputGroup label="Team Avg Volume">
                          <NumberInput value={roles[key].teamAvgVolume} onChange={v => updateRole(key, 'teamAvgVolume', v)} min={0} step={100000} prefix="$" />
                        </InputGroup>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Aftercare Lead Split */}
            <div>
              <span className="text-xs font-semibold text-navy-600 uppercase tracking-wide">Aftercare Lead Commission Split</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-2">
                <InputGroup label="% Sales from Aftercare Leads">
                  <NumberInput value={aftercareLeadPct} onChange={setAftercareLeadPct} min={0} max={100} step={1} suffix="%" />
                </InputGroup>
                <InputGroup label="Specialist Share">
                  <NumberInput value={specialistShare} onChange={setSpecialistShare} min={0} max={100} step={1} suffix="%" />
                </InputGroup>
                <InputGroup label="FD Referral Share">
                  <div className="w-full rounded-lg border border-navy-200 bg-navy-50 px-3 py-2 text-sm text-navy-500">
                    {100 - specialistShare}%
                  </div>
                </InputGroup>
              </div>
              <p className="text-xs text-navy-400 mt-1">Split only applies to aftercare-sourced leads. All other leads pay full commission.</p>
            </div>

            {/* Product Category Mix */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-semibold text-navy-600 uppercase tracking-wide">Product Category Mix</span>
                <SumBadge values={[mixPreneed, mixCemetery, mixTrust, mixTerminal]} label="Sum" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <InputGroup label="Preneed"><NumberInput value={mixPreneed} onChange={setMixPreneed} min={0} max={100} step={1} suffix="%" /></InputGroup>
                <InputGroup label="Cemetery"><NumberInput value={mixCemetery} onChange={setMixCemetery} min={0} max={100} step={1} suffix="%" /></InputGroup>
                <InputGroup label="Trust + Interest"><NumberInput value={mixTrust} onChange={setMixTrust} min={0} max={100} step={1} suffix="%" /></InputGroup>
                <InputGroup label="Terminal"><NumberInput value={mixTerminal} onChange={setMixTerminal} min={0} max={100} step={1} suffix="%" /></InputGroup>
              </div>
            </div>

            {/* Payment Term Mix */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-semibold text-navy-600 uppercase tracking-wide">Preneed Payment Term Mix</span>
                <SumBadge values={[mixSinglePay, mix3Pay, mix5Pay, mix10Pay, mix20Pay]} label="Sum" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <InputGroup label="Single Pay"><NumberInput value={mixSinglePay} onChange={setMixSinglePay} min={0} max={100} step={1} suffix="%" /></InputGroup>
                <InputGroup label="3-Pay"><NumberInput value={mix3Pay} onChange={setMix3Pay} min={0} max={100} step={1} suffix="%" /></InputGroup>
                <InputGroup label="5-Pay"><NumberInput value={mix5Pay} onChange={setMix5Pay} min={0} max={100} step={1} suffix="%" /></InputGroup>
                <InputGroup label="10-Pay"><NumberInput value={mix10Pay} onChange={setMix10Pay} min={0} max={100} step={1} suffix="%" /></InputGroup>
                <InputGroup label="20-Pay"><NumberInput value={mix20Pay} onChange={setMix20Pay} min={0} max={100} step={1} suffix="%" /></InputGroup>
              </div>
            </div>

            {/* Age Distribution */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-semibold text-navy-600 uppercase tracking-wide">Preneed Age Distribution</span>
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

            <div className="flex justify-end">
              <button onClick={resetDefaults} className="px-4 py-2 text-sm font-medium text-navy-600 bg-navy-100 hover:bg-navy-200 rounded-lg transition-colors">
                Reset Defaults
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Section 2: Role Compensation Comparison (3-column) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {ROLE_KEYS.map(key => {
          const comm = commByRole[key];
          const role = roles[key];
          const isAftercare = key === 'aftercare';
          return (
            <section key={key} className="bg-white rounded-xl shadow-sm border border-navy-100 overflow-hidden">
              <div className="px-6 py-3" style={{ backgroundColor: ROLE_COLORS[key] }}>
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">{ROLE_LABELS[key]}</h3>
              </div>
              <div className="px-6 py-4">
                <table className="w-full text-sm">
                  <tbody>
                    <Row label="Base Wage" sublabel={`$${role.hourlyWage}/hr x ${role.hoursPerWeek}hrs x ${role.weeksPerYear}wks`} value={comm.baseWage} />
                    <Row label="Preneed Commission (Yr 1)" value={comm.preneedYr1} />
                    {modelingYear >= 2 && <Row label="Preneed Renewals (Yr 2)" value={comm.preneedYr2} />}
                    {modelingYear >= 3 && <Row label="Preneed Renewals (Yr 3)" value={comm.preneedYr3} />}
                    <Row label="Cemetery Commission" sublabel="7.5% of cemetery sales" value={comm.cemeteryComm} />
                    <Row label="Trust + Interest Commission" sublabel="3.75% of trust sales" value={comm.trustComm} />
                    <Row label="Terminal Commission" sublabel="1% flat" value={comm.terminalComm} />
                    <tr className="border-t border-navy-200">
                      <td className="py-2 font-semibold text-navy-800">Gross Commission</td>
                      <td className="py-2 text-right font-semibold text-navy-800">
                        {fmt(comm.grossComm)} <span className="text-navy-400 text-xs ml-1">({fmtPct(comm.blendedRate)} eff.)</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 text-red-600">Chargebacks ({chargebackRate}%)</td>
                      <td className="py-1 text-right text-red-600">-{fmt(comm.chargebacks)}</td>
                    </tr>
                    <tr className="border-t border-navy-200">
                      <td className="py-2 font-semibold text-navy-800">Net Commission</td>
                      <td className="py-2 text-right font-semibold text-navy-800">{fmt(comm.netComm)}</td>
                    </tr>
                    {isAftercare && aftercareLeadPct > 0 && (
                      <>
                        <tr>
                          <td className="py-1 text-orange-600">FD Referral Share ({aftercareLeadPct}% leads x {100 - specialistShare}%)</td>
                          <td className="py-1 text-right text-orange-600">-{fmt(comm.fdReferralShare)}</td>
                        </tr>
                        <tr className="border-t border-navy-200">
                          <td className="py-2 font-semibold text-navy-800">Specialist Net Commission</td>
                          <td className="py-2 text-right font-semibold text-navy-800">{fmt(comm.effectiveNetComm)}</td>
                        </tr>
                      </>
                    )}
                    <Row label="Monthly Bonuses" sublabel={comm.monthlyBonus > 0 ? `${fmt(comm.monthlyBonus)}/mo x 12` : 'Below threshold'} value={comm.annualMonthlyBonusTotal} />
                    <Row label="Annual Bonuses" sublabel="Cumulative milestones" value={comm.annualBonus} />
                    <tr className="border-t-2" style={{ borderColor: ROLE_COLORS[key] }}>
                      <td className="py-3 font-bold text-base" style={{ color: ROLE_COLORS[key] }}>TOTAL COMP</td>
                      <td className="py-3 text-right font-bold text-lg" style={{ color: ROLE_COLORS[key] }}>{fmt(comm.totalAgentComp)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>

      {/* ── Section 3: Sales Leader Compensation (full width) ── */}
      <section className="bg-white rounded-xl shadow-sm border border-navy-100 overflow-hidden">
        <div className="bg-teal-700 px-6 py-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wide">Sales Leader Compensation</h3>
        </div>
        <div className="px-6 py-4">
          <table className="w-full text-sm">
            <tbody>
              <Row label="Base Salary" value={leaderBaseSalary} />
              <tr className="border-t border-navy-100">
                <td className="py-2 text-navy-600" colSpan={2}>
                  <span className="font-semibold text-navy-700">Team Volume Breakdown</span>
                </td>
              </tr>
              {ROLE_KEYS.map(key => (
                <tr key={key}>
                  <td className="py-1 pl-4 text-navy-600">
                    <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: ROLE_COLORS[key] }}></span>
                    {ROLE_LABELS[key]}
                  </td>
                  <td className="py-1 text-right text-navy-800">
                    {roles[key].teamCount} x {fmtLarge(roles[key].teamAvgVolume)} = <span className="font-semibold">{fmtLarge(roles[key].teamCount * roles[key].teamAvgVolume)}</span>
                  </td>
                </tr>
              ))}
              <tr className="border-t border-navy-200">
                <td className="py-2 font-semibold text-navy-800 pl-4">Total Team Volume</td>
                <td className="py-2 text-right font-semibold text-navy-800">{fmtLarge(leader.teamVolume)}</td>
              </tr>
              <Row label="Monthly Override (1% gross)" value={leader.grossMonthlyOverride} />
              <tr>
                <td className="py-1 text-red-600">Fee Deductions ({leaderFeeRate}%)</td>
                <td className="py-1 text-right text-red-600">-{fmt(leader.feeDeductions)}</td>
              </tr>
              <tr className="border-t border-navy-100">
                <td className="py-2 font-semibold text-navy-800">Net Monthly Override</td>
                <td className="py-2 text-right font-semibold text-navy-800">{fmt(leader.netMonthlyOverride)}</td>
              </tr>
              <tr className="border-t border-navy-100">
                <td className="py-2 text-navy-700">
                  Semi-Annual Bonus
                  <span className="block text-xs text-navy-400">{fmtLarge(leader.volumePerPeriod)}/period x 2 = {fmt(leader.bonusPerPeriod)}/period</span>
                </td>
                <td className="py-2 text-right font-medium text-navy-800">{fmt(leader.annualSemiBonus)}</td>
              </tr>
              <tr className="border-t-2 border-teal-400">
                <td className="py-3 font-bold text-teal-700 text-base">TOTAL SALES LEADER COMP</td>
                <td className="py-3 text-right font-bold text-teal-700 text-lg">{fmt(leader.totalLeaderComp)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Section 4: Role Compensation Comparison Chart ── */}
      <section className="bg-navy-900 rounded-xl shadow-sm p-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wide mb-4">Role Compensation Comparison</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#243b53" />
              <XAxis dataKey="faceValue" tickFormatter={fmtLarge} stroke="#9fb3c8" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmtLarge} stroke="#9fb3c8" tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#d9e2ec' }} />
              <ReferenceLine x={2000000} stroke="#627d98" strokeDasharray="4 4" label={{ value: '$2M', fill: '#9fb3c8', fontSize: 10 }} />
              <ReferenceLine x={3000000} stroke="#627d98" strokeDasharray="4 4" label={{ value: '$3M', fill: '#9fb3c8', fontSize: 10 }} />
              <ReferenceLine y={150000} stroke="#3ebd93" strokeDasharray="4 4" label={{ value: '$150K', fill: '#3ebd93', fontSize: 10, position: 'left' }} />
              <ReferenceLine y={300000} stroke="#3ebd93" strokeDasharray="4 4" label={{ value: '$300K', fill: '#3ebd93', fontSize: 10, position: 'left' }} />
              {ROLE_KEYS.map(key => (
                <Line key={key} type="monotone" dataKey={`total_${key}`} name={ROLE_LABELS[key]} stroke={ROLE_COLORS[key]} strokeWidth={2} dot={false} />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ── Section 5: Commission Rate Reference Tables ── */}
      <section className="bg-white rounded-xl shadow-sm border border-navy-100">
        <button onClick={() => setRateTablesOpen(!rateTablesOpen)} className="w-full flex items-center justify-between px-6 py-4">
          <h3 className="text-sm font-bold text-navy-700 uppercase tracking-wide">Commission Rate Reference Tables</h3>
          <Chevron open={rateTablesOpen} />
        </button>
        {rateTablesOpen && (
          <div className="px-6 pb-6 space-y-6">
            {/* Table A: Agent Rates (no override) */}
            <div>
              <h4 className="text-xs font-bold text-navy-600 uppercase tracking-wide mb-2">Table A: Agent Commission Rates (excludes override)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-navy-100">
                      <th className="px-2 py-1.5 text-left text-navy-700 font-semibold">Term</th>
                      <th className="px-2 py-1.5 text-left text-navy-700 font-semibold">Age Band</th>
                      <th className="px-2 py-1.5 text-right text-navy-700 font-semibold">Year 1</th>
                      <th className="px-2 py-1.5 text-right text-navy-700 font-semibold">Year 2</th>
                      <th className="px-2 py-1.5 text-right text-navy-700 font-semibold">Year 3</th>
                      <th className="px-2 py-1.5 text-right text-navy-700 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TERM_KEYS.map((term) =>
                      AGE_BANDS.filter(age => AGENT_RATES[term][age]).map((age, i) => {
                        const rates = AGENT_RATES[term][age];
                        const total = rates.reduce((a, b) => a + b, 0);
                        return (
                          <tr key={`${term}-${age}`} className={i === 0 ? 'border-t border-navy-200' : ''}>
                            {i === 0 && <td className="px-2 py-1 font-semibold text-navy-700" rowSpan={AGE_BANDS.filter(a => AGENT_RATES[term][a]).length}>{TERM_LABELS[term]}</td>}
                            <td className="px-2 py-1 text-navy-600">{age}</td>
                            <td className="px-2 py-1 text-right text-navy-800">{fmtPct(rates[0])}</td>
                            <td className="px-2 py-1 text-right text-navy-800">{rates[1] != null ? fmtPct(rates[1]) : '\u2014'}</td>
                            <td className="px-2 py-1 text-right text-navy-800">{rates[2] != null ? fmtPct(rates[2]) : '\u2014'}</td>
                            <td className="px-2 py-1 text-right font-semibold text-navy-800">{fmtPct(total)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sales Leader Override Note */}
            <div className="bg-navy-50 rounded-lg px-4 py-3">
              <h4 className="text-xs font-bold text-navy-600 uppercase tracking-wide mb-1">Sales Leader Monthly Override</h4>
              <p className="text-xs text-navy-600">Flat 1% of all qualifying team sales (all products), paid monthly in arrears. Deductions for perpetual care fees, credit card fees, chargebacks, and unforeseen fees are applied before payout. The semi-annual bonus tiers (1.0%&ndash;2.5%) are separate and incremental.</p>
            </div>

            {/* Other Product Rates */}
            <div>
              <h4 className="text-xs font-bold text-navy-600 uppercase tracking-wide mb-2">Other Product Commission Rates</h4>
              <table className="text-xs">
                <tbody>
                  <tr><td className="pr-6 py-1 text-navy-600">Cemetery Markers</td><td className="py-1 font-semibold text-navy-800">7.50%</td><td className="pl-4 py-1 text-navy-500">Flat rate on sale price</td></tr>
                  <tr><td className="pr-6 py-1 text-navy-600">Cemetery Property</td><td className="py-1 font-semibold text-navy-800">7.50%</td><td className="pl-4 py-1 text-navy-500">Flat rate on sale price</td></tr>
                  <tr><td className="pr-6 py-1 text-navy-600">Trust + Interest</td><td className="py-1 font-semibold text-navy-800">3.75%</td><td className="pl-4 py-1 text-navy-500">Half of insurance rate</td></tr>
                  <tr><td className="pr-6 py-1 text-navy-600">Terminal (any product)</td><td className="py-1 font-semibold text-navy-800">1.00%</td><td className="pl-4 py-1 text-navy-500">Flat</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ── Section 6: Bonus & Override Reference Tables ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Monthly Bonuses */}
        <section className="bg-white rounded-xl shadow-sm border border-navy-100 overflow-hidden">
          <div className="bg-navy-100 px-6 py-3">
            <h3 className="text-xs font-bold text-navy-700 uppercase tracking-wide">Monthly Bonus Schedule</h3>
          </div>
          <div className="px-6 py-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-navy-500 text-xs uppercase">
                  <th className="pb-2 text-left font-semibold">Monthly Face Value</th>
                  <th className="pb-2 text-right font-semibold">Bonus</th>
                  <th className="pb-2 text-right font-semibold">Roles</th>
                </tr>
              </thead>
              <tbody>
                {[...MONTHLY_BONUSES].reverse().map((t) => (
                  <tr key={t.threshold} className={activeMonthlyTier === t.threshold ? 'bg-teal-50' : ''}>
                    <td className={`py-1.5 ${activeMonthlyTier === t.threshold ? 'font-semibold text-teal-700' : 'text-navy-700'}`}>
                      {t.threshold >= 300000 ? `${fmtLarge(t.threshold)}+` : fmtLarge(t.threshold)}
                    </td>
                    <td className={`py-1.5 text-right ${activeMonthlyTier === t.threshold ? 'font-semibold text-teal-700' : 'text-navy-800'}`}>
                      {fmt(t.bonus)}
                    </td>
                    <td className="py-1.5 text-right">
                      <span className="inline-flex gap-1">
                        {ROLE_KEYS.map(key => {
                          const qualifies = (roles[key].annualFaceValue / 12) >= t.threshold;
                          return qualifies ? <span key={key} className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: ROLE_COLORS[key] }} title={ROLE_LABELS[key]}></span> : null;
                        })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-navy-400 mt-2">Non-cumulative: highest qualifying tier only. Colored dots show qualifying roles.</p>
          </div>
        </section>

        {/* Annual Bonuses */}
        <section className="bg-white rounded-xl shadow-sm border border-navy-100 overflow-hidden">
          <div className="bg-navy-100 px-6 py-3">
            <h3 className="text-xs font-bold text-navy-700 uppercase tracking-wide">Annual Bonus Milestones</h3>
          </div>
          <div className="px-6 py-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-navy-500 text-xs uppercase">
                  <th className="pb-2 text-left font-semibold">Annual Volume</th>
                  <th className="pb-2 text-right font-semibold">Bonus</th>
                  <th className="pb-2 text-right font-semibold">Cumul.</th>
                  <th className="pb-2 text-right font-semibold">Roles</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let cumulative = 0;
                  return [...ANNUAL_BONUSES].reverse().map((t) => {
                    cumulative += t.bonus;
                    const active = activeAnnualTiers.includes(t.threshold);
                    return (
                      <tr key={t.threshold} className={active ? 'bg-teal-50' : ''}>
                        <td className={`py-1.5 ${active ? 'font-semibold text-teal-700' : 'text-navy-700'}`}>{fmtLarge(t.threshold)}</td>
                        <td className={`py-1.5 text-right ${active ? 'font-semibold text-teal-700' : 'text-navy-800'}`}>{fmt(t.bonus)}</td>
                        <td className={`py-1.5 text-right ${active ? 'font-semibold text-teal-700' : 'text-navy-800'}`}>{fmt(cumulative)}</td>
                        <td className="py-1.5 text-right">
                          <span className="inline-flex gap-1">
                            {ROLE_KEYS.map(key => {
                              const qualifies = roles[key].annualFaceValue >= t.threshold;
                              return qualifies ? <span key={key} className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: ROLE_COLORS[key] }} title={ROLE_LABELS[key]}></span> : null;
                            })}
                          </span>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
            <p className="text-xs text-navy-400 mt-2">Cumulative: all qualifying tiers stack. Colored dots show qualifying roles.</p>
          </div>
        </section>

        {/* Semi-Annual Bonus Tiers */}
        <section className="bg-white rounded-xl shadow-sm border border-navy-100 overflow-hidden">
          <div className="bg-navy-100 px-6 py-3">
            <h3 className="text-xs font-bold text-navy-700 uppercase tracking-wide">Semi-Annual Bonus Tiers</h3>
          </div>
          <div className="px-6 py-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-navy-500 text-xs uppercase">
                  <th className="pb-2 text-left font-semibold">Volume Bracket</th>
                  <th className="pb-2 text-right font-semibold">Rate</th>
                </tr>
              </thead>
              <tbody>
                {SEMI_ANNUAL_TIERS.map((t) => {
                  const active = leader.volumePerPeriod > t.floor;
                  return (
                    <tr key={t.floor} className={active ? 'bg-teal-50' : ''}>
                      <td className={`py-1.5 ${active ? 'font-semibold text-teal-700' : 'text-navy-700'}`}>
                        {fmtLarge(t.floor)} {t.ceiling === Infinity ? '+' : `\u2013 ${fmtLarge(t.ceiling)}`}
                      </td>
                      <td className={`py-1.5 text-right ${active ? 'font-semibold text-teal-700' : 'text-navy-800'}`}>
                        {fmtPct(t.rate)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-xs text-navy-400 mt-2">Marginal rates per 6-month period. Current: {fmtLarge(leader.volumePerPeriod)}/period. Monthly override (1%) is separate.</p>
          </div>
        </section>
      </div>

      {/* ── Section 7: Footer ── */}
      <footer className="text-center text-xs text-navy-400 py-4">
        Commission rates and bonus schedules are based on current agreements. Actual rates may vary.
      </footer>
    </main>
  );
}

/* ─── Helper: table row ─── */
function Row({ label, sublabel, value }) {
  return (
    <tr>
      <td className="py-1.5 text-navy-700">
        {label}
        {sublabel && <span className="block text-xs text-navy-400">{sublabel}</span>}
      </td>
      <td className="py-1.5 text-right font-medium text-navy-800">{fmt(value)}</td>
    </tr>
  );
}
