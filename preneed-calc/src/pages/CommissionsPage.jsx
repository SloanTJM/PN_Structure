import { useState, useMemo } from 'react';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { fmt, fmtPct, fmtLarge } from '../utils/formatters';
import InputGroup from '../components/InputGroup';
import NumberInput from '../components/NumberInput';
import Chevron from '../components/Chevron';
import {
  AGENT_RATES, SEMI_ANNUAL_TIERS, MONTHLY_BONUSES, ANNUAL_BONUSES,
  ROLE_DEFAULTS, BUCKET_DEFAULTS, AFTERCARE_DEFAULTS,
  calcSemiAnnualBonus,
} from '../commissionConstants';

const TERM_KEYS = ['single', '3pay', '5pay', '10pay', '20pay'];
const TERM_LABELS = { single: 'Single Pay', '3pay': '3-Pay', '5pay': '5-Pay', '10pay': '10-Pay', '20pay': '20-Pay' };
const AGE_BANDS = ['40-60', '61-65', '66-70', '71-75', '76-80', '81-85', '86-90'];

/* ─── Role Constants (local to this page) ─── */
const ROLE_KEYS = ['closer', 'setter', 'aftercare'];
const ROLE_LABELS = { closer: 'Closer', setter: 'Setter', aftercare: 'Aftercare Specialist' };
const ROLE_COLORS = { closer: '#2563eb', setter: '#7c3aed', aftercare: '#059669' };

const DEFAULTS = {
  chargebackRate: 5,
  modelingYear: 1,
  leaderBaseSalary: 125982,
  mixSinglePay: 30, mix3Pay: 15, mix5Pay: 25, mix10Pay: 20, mix20Pay: 10,
  mixAge40_60: 20, mixAge61_65: 25, mixAge66_70: 30, mixAge71_75: 15, mixAge76_80: 7, mixAge81_85: 2, mixAge86_90: 1,
  mixPreneed: 40, mixCemetery: 50, mixTrust: 5, mixTerminal: 5,
};

/* ─── Calculations ─── */
function calcGrossCommission(annualFaceValue, s) {
  const termMixes = { single: s.mixSinglePay, '3pay': s.mix3Pay, '5pay': s.mix5Pay, '10pay': s.mix10Pay, '20pay': s.mix20Pay };
  const ageMixes = { '40-60': s.mixAge40_60, '61-65': s.mixAge61_65, '66-70': s.mixAge66_70, '71-75': s.mixAge71_75, '76-80': s.mixAge76_80, '81-85': s.mixAge81_85, '86-90': s.mixAge86_90 };

  let preneedYr1 = 0, preneedYr2 = 0, preneedYr3 = 0;

  for (const term of TERM_KEYS) {
    const termTable = AGENT_RATES[term];
    for (const age of AGE_BANDS) {
      if (!termTable[age]) continue;
      const weight = (ageMixes[age] / 100) * (termMixes[term] / 100) * (s.mixPreneed / 100);
      const volume = annualFaceValue * weight;
      const rates = termTable[age];
      preneedYr1 += volume * (rates[0] / 100);
      if (s.modelingYear >= 2 && rates[1]) preneedYr2 += volume * (rates[1] / 100);
      if (s.modelingYear >= 3 && rates[2]) preneedYr3 += volume * (rates[2] / 100);
    }
  }

  const cemeteryComm = annualFaceValue * (s.mixCemetery / 100) * 0.85 * 0.075; // after 15% perpetual care
  const trustComm = annualFaceValue * (s.mixTrust / 100) * 0.0375;
  const terminalComm = annualFaceValue * (s.mixTerminal / 100) * 0.01;

  const totalPreneed = preneedYr1 + preneedYr2 + preneedYr3;
  const grossComm = totalPreneed + cemeteryComm + trustComm + terminalComm;

  return { preneedYr1, preneedYr2, preneedYr3, totalPreneed, cemeteryComm, trustComm, terminalComm, grossComm };
}

function calcCloserComp(s, buckets) {
  const totalVolume = buckets.closerAnnualVolume;
  const setterPct = buckets.pctSetterSourced / 100;
  const closerSplit = buckets.closerSplitPct / 100;

  const directVolume = totalVolume * (1 - setterPct);
  const setterSourcedVolume = totalVolume * setterPct;

  const directComm = calcGrossCommission(directVolume, s);
  const sharedComm = calcGrossCommission(setterSourcedVolume, s);

  // Closer keeps 100% on direct + their split on setter-sourced
  const grossComm = directComm.grossComm + sharedComm.grossComm * closerSplit;
  const chargebacks = (grossComm - directComm.terminalComm - sharedComm.terminalComm * closerSplit) * (s.chargebackRate / 100);
  const netComm = grossComm - chargebacks;

  const blendedRate = totalVolume > 0 ? (grossComm / totalVolume) * 100 : 0;

  // Cemetery volume breakdown
  const cemeteryVolume = totalVolume * (s.mixCemetery / 100);
  const cemeteryNetVolume = cemeteryVolume * 0.85; // after 15% perpetual care

  // Bonuses based on net volume (after cemetery perpetual care deduction)
  const netVolume = totalVolume - cemeteryVolume + cemeteryNetVolume;
  const monthlyAvg = netVolume / 12;
  let monthlyBonus = 0;
  for (const tier of MONTHLY_BONUSES) {
    if (monthlyAvg >= tier.threshold) { monthlyBonus = tier.bonus; break; }
  }
  const annualMonthlyBonusTotal = monthlyBonus * 12;

  let annualBonus = 0;
  for (const tier of ANNUAL_BONUSES) {
    if (netVolume >= tier.threshold) { annualBonus = tier.bonus; break; }
  }

  const baseWage = s.hourlyWage * s.hoursPerWeek * s.weeksPerYear;
  const totalAgentComp = baseWage + netComm + annualMonthlyBonusTotal + annualBonus;

  return {
    baseWage, totalVolume, netVolume, cemeteryVolume, cemeteryNetVolume,
    directVolume, setterSourcedVolume,
    directComm: directComm.grossComm, sharedCommGross: sharedComm.grossComm,
    closerShareOfShared: sharedComm.grossComm * closerSplit,
    grossComm, chargebacks, netComm, blendedRate,
    monthlyBonus, annualMonthlyBonusTotal, annualBonus, totalAgentComp,
  };
}

function calcSetterComp(s, buckets) {
  const totalVolume = buckets.setterVolumeEach;
  const setterPct = buckets.pctSetterSourced / 100;
  const setterSplit = (100 - buckets.closerSplitPct) / 100;

  const setterSourcedVolume = totalVolume * setterPct;
  const sharedComm = calcGrossCommission(setterSourcedVolume, s);

  const grossComm = sharedComm.grossComm * setterSplit;
  const chargebacks = (grossComm - sharedComm.terminalComm * setterSplit) * (s.chargebackRate / 100);
  const netComm = grossComm - chargebacks;

  const blendedRate = setterSourcedVolume > 0 ? (grossComm / setterSourcedVolume) * 100 : 0;

  // Cemetery volume breakdown (on setter-sourced volume)
  const cemeteryVolume = setterSourcedVolume * (s.mixCemetery / 100);
  const cemeteryNetVolume = cemeteryVolume * 0.85; // after 15% perpetual care

  // Setters: base wage + commission split only, no bonuses
  const monthlyBonus = 0;
  const annualMonthlyBonusTotal = 0;
  const annualBonus = 0;

  const baseWage = s.hourlyWage * s.hoursPerWeek * s.weeksPerYear;
  const totalAgentComp = baseWage + netComm;

  return {
    baseWage, setterSourcedVolume, cemeteryVolume, cemeteryNetVolume,
    sharedCommGross: sharedComm.grossComm,
    setterShareOfShared: grossComm,
    grossComm, chargebacks, netComm, blendedRate,
    monthlyBonus, annualMonthlyBonusTotal, annualBonus, totalAgentComp,
    bonusVolume: totalVolume,
  };
}

function calcAftercareComp(s, buckets, aftercareLeadPct, specialistShare) {
  const annualFaceValue = buckets.aftercareAnnualVolume;
  const comm = calcGrossCommission(annualFaceValue, s);

  const grossComm = comm.grossComm;
  const chargebacks = (grossComm - comm.terminalComm) * (s.chargebackRate / 100);
  const acsChargebacks = chargebacks * 0.60;
  const fdChargebacks = chargebacks * 0.40;
  const netComm = grossComm - chargebacks;

  const blendedRate = annualFaceValue > 0 ? (grossComm / annualFaceValue) * 100 : 0;

  // Aftercare split — specialist keeps their share, FD gets referral kickback
  const leadPct = aftercareLeadPct / 100;
  const specShare = specialistShare / 100;
  const aftercarePortion = netComm * leadPct * specShare;
  const nonAftercarePortion = netComm * (1 - leadPct);
  const effectiveNetComm = aftercarePortion + nonAftercarePortion;
  const fdReferralShare = netComm * leadPct * (1 - specShare);

  // Cemetery volume breakdown
  const cemeteryVolume = annualFaceValue * (s.mixCemetery / 100);
  const cemeteryNetVolume = cemeteryVolume * 0.85; // after 15% perpetual care

  // Bonuses based on net volume (after cemetery perpetual care deduction)
  const netVolume = annualFaceValue - cemeteryVolume + cemeteryNetVolume;
  const monthlyAvg = netVolume / 12;
  let monthlyBonus = 0;
  for (const tier of MONTHLY_BONUSES) {
    if (monthlyAvg >= tier.threshold) { monthlyBonus = tier.bonus; break; }
  }
  const annualMonthlyBonusTotal = monthlyBonus * 12;

  let annualBonus = 0;
  for (const tier of ANNUAL_BONUSES) {
    if (netVolume >= tier.threshold) { annualBonus = tier.bonus; break; }
  }

  const baseWage = s.hourlyWage * s.hoursPerWeek * s.weeksPerYear;
  const totalAgentComp = baseWage + effectiveNetComm + annualMonthlyBonusTotal + annualBonus;

  return {
    baseWage, annualFaceValue, netVolume, cemeteryVolume, cemeteryNetVolume,
    preneedYr1: comm.preneedYr1, preneedYr2: comm.preneedYr2, preneedYr3: comm.preneedYr3,
    totalPreneed: comm.totalPreneed, cemeteryComm: comm.cemeteryComm, trustComm: comm.trustComm, terminalComm: comm.terminalComm,
    grossComm, chargebacks, acsChargebacks, fdChargebacks, netComm, effectiveNetComm, fdReferralShare, blendedRate,
    monthlyBonus, annualMonthlyBonusTotal, annualBonus, totalAgentComp,
  };
}

function calcLeaderComp(s, roles, buckets) {
  // Only closers and aftercare generate actual sales volume — setter volume is a subset of closer volume
  const closerVolume = roles.closer.teamCount * buckets.closerAnnualVolume;
  const aftercareVolume = roles.aftercare.teamCount * buckets.aftercareAnnualVolume;
  const teamVolume = closerVolume + aftercareVolume;

  // Leader comp is on net volume (after cemetery perpetual care deduction)
  const perpCareFrac = (s.mixCemetery / 100) * 0.15;
  const teamNetVolume = teamVolume * (1 - perpCareFrac);

  const grossMonthlyOverride = teamNetVolume * 0.01;
  const feeDeductions = 0;
  const netMonthlyOverride = grossMonthlyOverride;

  const volumePerPeriod = teamNetVolume / 2;
  const bonusPerPeriod = calcSemiAnnualBonus(volumePerPeriod);
  const annualSemiBonus = bonusPerPeriod * 2;

  const totalLeaderComp = s.leaderBaseSalary + netMonthlyOverride + annualSemiBonus;

  return {
    teamVolume, teamNetVolume, grossMonthlyOverride, feeDeductions, netMonthlyOverride,
    volumePerPeriod, bonusPerPeriod, annualSemiBonus, totalLeaderComp,
  };
}

function buildChartData(sharedState, roles, buckets, aftercareLeadPct, specialistShare) {
  const points = [];
  for (let fv = 0; fv <= 5000000; fv += 100000) {
    const point = { faceValue: fv };
    const bk = { ...buckets, closerAnnualVolume: fv, aftercareAnnualVolume: fv };

    const closerSt = { ...sharedState, hourlyWage: roles.closer.hourlyWage, hoursPerWeek: roles.closer.hoursPerWeek, weeksPerYear: roles.closer.weeksPerYear };
    point.total_closer = calcCloserComp(closerSt, bk).totalAgentComp;

    const setterSt = { ...sharedState, hourlyWage: roles.setter.hourlyWage, hoursPerWeek: roles.setter.hoursPerWeek, weeksPerYear: roles.setter.weeksPerYear };
    point.total_setter = calcSetterComp(setterSt, bk).totalAgentComp;

    const aftercareSt = { ...sharedState, hourlyWage: roles.aftercare.hourlyWage, hoursPerWeek: roles.aftercare.hoursPerWeek, weeksPerYear: roles.aftercare.weeksPerYear };
    point.total_aftercare = calcAftercareComp(aftercareSt, bk, aftercareLeadPct, specialistShare).totalAgentComp;

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

  const [rateTablesOpen, setRateTablesOpen] = useState(false);

  // Role-based state
  const [roles, setRoles] = useState(ROLE_DEFAULTS);
  const [aftercareLeadPct, setAftercareLeadPct] = useState(AFTERCARE_DEFAULTS.aftercareLeadPct);
  const [specialistShare, setSpecialistShare] = useState(AFTERCARE_DEFAULTS.specialistShare);

  // Lead bucket state
  const [closerAnnualVolume, setCloserAnnualVolume] = useState(BUCKET_DEFAULTS.closerAnnualVolume);
  const [pctSetterSourced, setPctSetterSourced] = useState(BUCKET_DEFAULTS.pctSetterSourced);
  const [closerSplitPct, setCloserSplitPct] = useState(BUCKET_DEFAULTS.closerSplitPct);
  const [aftercareAnnualVolume, setAftercareAnnualVolume] = useState(BUCKET_DEFAULTS.aftercareAnnualVolume);

  function updateRole(roleKey, field, value) {
    setRoles(prev => ({ ...prev, [roleKey]: { ...prev[roleKey], [field]: value } }));
  }

  // Shared state
  const [chargebackRate, setChargebackRate] = useState(DEFAULTS.chargebackRate);
  const [modelingYear, setModelingYear] = useState(DEFAULTS.modelingYear);
  const [leaderBaseSalary, setLeaderBaseSalary] = useState(DEFAULTS.leaderBaseSalary);


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
  const [mixAge86_90, setMixAge86_90] = useState(DEFAULTS.mixAge86_90);

  const sharedState = {
    chargebackRate, modelingYear, leaderBaseSalary,
    mixPreneed, mixCemetery, mixTrust, mixTerminal,
    mixSinglePay, mix3Pay, mix5Pay, mix10Pay, mix20Pay,
    mixAge40_60, mixAge61_65, mixAge66_70, mixAge71_75, mixAge76_80, mixAge81_85, mixAge86_90,
  };

  const closerTotalProduction = closerAnnualVolume * roles.closer.teamCount;
  const setterCap = 6000000;
  const setterCount = Math.ceil(closerTotalProduction / setterCap);
  const setterVolumeEach = setterCount > 0 ? closerTotalProduction / setterCount : 0;
  const buckets = { closerAnnualVolume, closerTotalProduction, setterVolumeEach, pctSetterSourced, closerSplitPct, aftercareAnnualVolume };

  const commByRole = useMemo(() => {
    const closerSt = { ...sharedState, hourlyWage: roles.closer.hourlyWage, hoursPerWeek: roles.closer.hoursPerWeek, weeksPerYear: roles.closer.weeksPerYear };
    const setterSt = { ...sharedState, hourlyWage: roles.setter.hourlyWage, hoursPerWeek: roles.setter.hoursPerWeek, weeksPerYear: roles.setter.weeksPerYear };
    const aftercareSt = { ...sharedState, hourlyWage: roles.aftercare.hourlyWage, hoursPerWeek: roles.aftercare.hoursPerWeek, weeksPerYear: roles.aftercare.weeksPerYear };

    return {
      closer: calcCloserComp(closerSt, buckets),
      setter: calcSetterComp(setterSt, buckets),
      aftercare: calcAftercareComp(aftercareSt, buckets, aftercareLeadPct, specialistShare),
    };
  }, [roles, aftercareLeadPct, specialistShare,
    closerAnnualVolume, pctSetterSourced, closerSplitPct, aftercareAnnualVolume,
    chargebackRate, modelingYear,
    mixPreneed, mixCemetery, mixTrust, mixTerminal,
    mixSinglePay, mix3Pay, mix5Pay, mix10Pay, mix20Pay,
    mixAge40_60, mixAge61_65, mixAge66_70, mixAge71_75, mixAge76_80, mixAge81_85, mixAge86_90,
  ]);

  const leader = useMemo(() => calcLeaderComp(sharedState, roles, buckets), [
    roles, leaderBaseSalary, closerAnnualVolume, aftercareAnnualVolume,
  ]);

  const chartData = useMemo(() => buildChartData(sharedState, roles, buckets, aftercareLeadPct, specialistShare), [
    roles, aftercareLeadPct, specialistShare,
    closerAnnualVolume, pctSetterSourced, closerSplitPct, aftercareAnnualVolume,
    chargebackRate, modelingYear,
    mixPreneed, mixCemetery, mixTrust, mixTerminal,
    mixSinglePay, mix3Pay, mix5Pay, mix10Pay, mix20Pay,
    mixAge40_60, mixAge61_65, mixAge66_70, mixAge71_75, mixAge76_80, mixAge81_85, mixAge86_90,
  ]);

  function resetDefaults() {
    setRoles(ROLE_DEFAULTS);
    setAftercareLeadPct(AFTERCARE_DEFAULTS.aftercareLeadPct);
    setSpecialistShare(AFTERCARE_DEFAULTS.specialistShare);
    setCloserAnnualVolume(BUCKET_DEFAULTS.closerAnnualVolume);
    setPctSetterSourced(BUCKET_DEFAULTS.pctSetterSourced); setCloserSplitPct(BUCKET_DEFAULTS.closerSplitPct);
    setAftercareAnnualVolume(BUCKET_DEFAULTS.aftercareAnnualVolume);
    setChargebackRate(DEFAULTS.chargebackRate); setModelingYear(DEFAULTS.modelingYear);
    setLeaderBaseSalary(DEFAULTS.leaderBaseSalary);
    setMixPreneed(DEFAULTS.mixPreneed); setMixCemetery(DEFAULTS.mixCemetery);
    setMixTrust(DEFAULTS.mixTrust); setMixTerminal(DEFAULTS.mixTerminal);
    setMixSinglePay(DEFAULTS.mixSinglePay); setMix3Pay(DEFAULTS.mix3Pay);
    setMix5Pay(DEFAULTS.mix5Pay); setMix10Pay(DEFAULTS.mix10Pay); setMix20Pay(DEFAULTS.mix20Pay);
    setMixAge40_60(DEFAULTS.mixAge40_60); setMixAge61_65(DEFAULTS.mixAge61_65);
    setMixAge66_70(DEFAULTS.mixAge66_70); setMixAge71_75(DEFAULTS.mixAge71_75);
    setMixAge76_80(DEFAULTS.mixAge76_80); setMixAge81_85(DEFAULTS.mixAge81_85); setMixAge86_90(DEFAULTS.mixAge86_90);
  }

  // Active bonus tiers (use closer NET volume as reference for highlighting)
  const perpCareFrac = (mixCemetery / 100) * 0.15;
  const closerNetVolume = closerAnnualVolume * (1 - perpCareFrac);
  const closerMonthlyAvg = closerNetVolume / 12;
  const activeMonthlyTier = MONTHLY_BONUSES.find(t => closerMonthlyAvg >= t.threshold)?.threshold;
  const activeAnnualTier = ANNUAL_BONUSES.find(t => closerNetVolume >= t.threshold)?.threshold;
  const activeAnnualTiers = activeAnnualTier ? [activeAnnualTier] : [];

  // Volume references for bonus dots — use net volumes (after cemetery perp care)
  const aftercareNetVolume = aftercareAnnualVolume * (1 - perpCareFrac);
  const roleVolumes = {
    closer: closerNetVolume,
    aftercare: aftercareNetVolume,
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold text-navy-800">Commissions & Compensation Model</h2>
        <p className="text-sm text-navy-500 mt-1">Model role-based comp across three lead buckets: Archived Leads (setter → closer), Aftercare (post-funeral preplanning), and Trade Shows (setter → closer). Closer/setter splits, aftercare specialist share, and sales leader override.</p>
      </div>

      {/* ── Hiring Rules ── */}
      <div className="bg-navy-50 border border-navy-200 rounded-xl p-5">
        <h3 className="text-xs font-bold text-navy-700 uppercase tracking-wide mb-2">Hiring Rules (Enterprise P&L Scaling)</h3>
        <table className="w-full text-xs text-navy-600">
          <tbody>
            <tr className="border-b border-navy-100">
              <td className="py-1.5 font-semibold text-navy-700 w-1/4">Closers</td>
              <td className="py-1.5">1 hired per {fmtLarge(closerAnnualVolume)} in closer production (rounded up)</td>
            </tr>
            <tr className="border-b border-navy-100">
              <td className="py-1.5 font-semibold text-navy-700">Setters</td>
              <td className="py-1.5">1 hired per $6M closer production (rounded up)</td>
            </tr>
            <tr className="border-b border-navy-100">
              <td className="py-1.5 font-semibold text-navy-700">Aftercare Specialist</td>
              <td className="py-1.5">1 per $10M total production (rounded down, min 1). Each specialist handles {fmtLarge(aftercareAnnualVolume)} in aftercare volume.</td>
            </tr>
            <tr>
              <td className="py-1.5 font-semibold text-navy-700">Sales Leader</td>
              <td className="py-1.5">Fixed &mdash; always 1 regardless of production. Earns 1% override on total team volume + semi-annual bonus tiers.</td>
            </tr>
          </tbody>
        </table>
        <p className="text-xs text-navy-400 mt-2">
          This page models comp for a single agent in each role. The Enterprise P&L derives headcount bottom-up: total production = closer production + aftercare production, with headcount scaling automatically as production grows.
        </p>
      </div>

      {/* ── Section 2: Role Compensation Comparison (3-column) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─ Closer Card ─ */}
        {(() => {
          const comm = commByRole.closer;
          const role = roles.closer;
          return (
            <section className="bg-white rounded-xl shadow-sm border border-navy-100 overflow-hidden">
              <div className="px-6 py-3" style={{ backgroundColor: ROLE_COLORS.closer }}>
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">Closer</h3>
              </div>
              <div className="px-6 py-4 space-y-4">
                {/* Inputs */}
                <div className="bg-navy-50 rounded-lg p-4 space-y-3">
                  <InputGroup label="Annual Volume">
                    <NumberInput value={closerAnnualVolume} onChange={setCloserAnnualVolume} min={0} step={100000} prefix="$" />
                  </InputGroup>
                  <div className="grid grid-cols-2 gap-3">
                    <InputGroup label="% Setter-Sourced">
                      <NumberInput value={pctSetterSourced} onChange={setPctSetterSourced} min={0} max={100} step={1} suffix="%" />
                    </InputGroup>
                    <InputGroup label="Closer Split on Shared">
                      <NumberInput value={closerSplitPct} onChange={setCloserSplitPct} min={0} max={100} step={1} suffix="%" />
                    </InputGroup>
                  </div>
                  <InputGroup label="Base Hourly Wage">
                    <NumberInput value={roles.closer.hourlyWage} onChange={v => updateRole('closer', 'hourlyWage', v)} min={0} step={0.50} prefix="$" />
                  </InputGroup>
                  <div className="grid grid-cols-3 gap-3">
                    <InputGroup label="Hours / Week">
                      <NumberInput value={roles.closer.hoursPerWeek} onChange={v => updateRole('closer', 'hoursPerWeek', v)} min={0} max={80} step={1} />
                    </InputGroup>
                    <InputGroup label="Weeks / Year">
                      <NumberInput value={roles.closer.weeksPerYear} onChange={v => updateRole('closer', 'weeksPerYear', v)} min={0} max={52} step={1} />
                    </InputGroup>
                    <InputGroup label="Team Count">
                      <NumberInput value={roles.closer.teamCount} onChange={v => updateRole('closer', 'teamCount', v)} min={1} max={50} step={1} />
                    </InputGroup>
                  </div>
                </div>
                {/* Comp Breakdown */}
                <table className="w-full text-sm">
                  <tbody>
                    <tr>
                      <td className="py-1.5 font-semibold text-navy-700">Volume per Closer</td>
                      <td className="py-1.5 text-right font-semibold text-navy-700">{fmtLarge(closerAnnualVolume)}</td>
                    </tr>
                    {role.teamCount > 1 && (
                      <tr>
                        <td className="py-1 text-navy-500 text-xs">Total Production ({fmtLarge(closerAnnualVolume)} &times; {role.teamCount})</td>
                        <td className="py-1 text-right text-navy-500 text-xs">{fmtLarge(closerTotalProduction)}</td>
                      </tr>
                    )}
                    <tr className="border-t border-navy-100 bg-amber-50">
                      <td className="py-1 text-navy-500 text-xs">Cemetery Sold ({mixCemetery}%)</td>
                      <td className="py-1 text-right text-navy-500 text-xs">{fmtLarge(comm.cemeteryVolume)}</td>
                    </tr>
                    <tr className="bg-amber-50">
                      <td className="py-1 text-navy-500 text-xs">After 15% Perp. Care (commissionable)</td>
                      <td className="py-1 text-right text-navy-500 text-xs">{fmtLarge(comm.cemeteryNetVolume)}</td>
                    </tr>
                    <tr className="bg-amber-50 border-b border-navy-100">
                      <td className="py-1 text-navy-600 text-xs font-semibold">Net Volume (for bonuses)</td>
                      <td className="py-1 text-right text-navy-600 text-xs font-semibold">{fmtLarge(comm.netVolume)}</td>
                    </tr>
                    <Row label="Base Wage" sublabel={`$${role.hourlyWage}/hr x ${role.hoursPerWeek}hrs x ${role.weeksPerYear}wks`} value={comm.baseWage} />
                    <tr className="border-t border-navy-100">
                      <td className="py-1.5 text-navy-600">Self-Sourced ({100 - pctSetterSourced}%)</td>
                      <td className="py-1.5 text-right text-navy-500 text-xs">{fmtLarge(comm.directVolume)} volume</td>
                    </tr>
                    <Row label="  Commission (100%)" value={comm.directComm} />
                    <tr className="border-t border-navy-100">
                      <td className="py-1.5 text-navy-600">Setter-Sourced ({pctSetterSourced}%)</td>
                      <td className="py-1.5 text-right text-navy-500 text-xs">{fmtLarge(comm.setterSourcedVolume)} volume</td>
                    </tr>
                    <Row label={`  Closer Split (${closerSplitPct}%)`} value={comm.closerShareOfShared} />
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
                    <Row label="Monthly Bonuses" sublabel={comm.monthlyBonus > 0 ? `${fmt(comm.monthlyBonus)}/mo x 12` : 'Below threshold'} value={comm.annualMonthlyBonusTotal} />
                    <Row label="Annual Bonuses" sublabel="Highest qualifying tier" value={comm.annualBonus} />
                    <tr className="border-t-2" style={{ borderColor: ROLE_COLORS.closer }}>
                      <td className="py-3 font-bold text-base" style={{ color: ROLE_COLORS.closer }}>COMP PER CLOSER</td>
                      <td className="py-3 text-right font-bold text-lg" style={{ color: ROLE_COLORS.closer }}>{fmt(comm.totalAgentComp)}</td>
                    </tr>
                    {role.teamCount > 1 && (
                      <tr className="bg-navy-50">
                        <td className="py-2 font-bold text-navy-800">TOTAL TEAM COST <span className="font-normal text-navy-500 text-xs">({role.teamCount} closers)</span></td>
                        <td className="py-2 text-right font-bold text-lg text-navy-900">{fmt(comm.totalAgentComp * role.teamCount)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })()}

        {/* ─ Setter Card ─ */}
        {(() => {
          const comm = commByRole.setter;
          const role = roles.setter;
          return (
            <section className="bg-white rounded-xl shadow-sm border border-navy-100 overflow-hidden">
              <div className="px-6 py-3" style={{ backgroundColor: ROLE_COLORS.setter }}>
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">Setter</h3>
              </div>
              <div className="px-6 py-4 space-y-4">
                {/* Inputs */}
                <div className="bg-navy-50 rounded-lg p-4 space-y-3">
                  <InputGroup label="Setter Kickback">
                    <div className="w-full rounded-lg border border-navy-200 bg-navy-50 px-3 py-2 text-sm text-navy-500">
                      {100 - closerSplitPct}%
                    </div>
                  </InputGroup>
                  <InputGroup label="Base Hourly Wage">
                    <NumberInput value={roles.setter.hourlyWage} onChange={v => updateRole('setter', 'hourlyWage', v)} min={0} step={0.50} prefix="$" />
                  </InputGroup>
                  <div className="grid grid-cols-3 gap-3">
                    <InputGroup label="Hours / Week">
                      <NumberInput value={roles.setter.hoursPerWeek} onChange={v => updateRole('setter', 'hoursPerWeek', v)} min={0} max={80} step={1} />
                    </InputGroup>
                    <InputGroup label="Weeks / Year">
                      <NumberInput value={roles.setter.weeksPerYear} onChange={v => updateRole('setter', 'weeksPerYear', v)} min={0} max={52} step={1} />
                    </InputGroup>
                  </div>
                </div>
                {/* Comp Breakdown */}
                <table className="w-full text-sm">
                  <tbody>
                    <tr>
                      <td className="py-1.5 font-semibold text-navy-700">Supported Volume <span className="font-normal text-navy-400 text-xs">(max $6M/setter)</span></td>
                      <td className="py-1.5 text-right font-semibold text-navy-700">{fmtLarge(comm.bonusVolume)}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-navy-500 text-xs">Closer Production: {fmtLarge(closerTotalProduction)} &rarr; {setterCount} setter{setterCount > 1 ? 's' : ''}</td>
                      <td className="py-1 text-right text-navy-500 text-xs">{fmtLarge(closerTotalProduction)} / {setterCount}</td>
                    </tr>
                    <tr className="border-t border-navy-100 bg-amber-50">
                      <td className="py-1 text-navy-500 text-xs">Cemetery Sold ({mixCemetery}%)</td>
                      <td className="py-1 text-right text-navy-500 text-xs">{fmtLarge(comm.cemeteryVolume)}</td>
                    </tr>
                    <tr className="bg-amber-50 border-b border-navy-100">
                      <td className="py-1 text-navy-500 text-xs">After 15% Perp. Care (commissionable)</td>
                      <td className="py-1 text-right text-navy-500 text-xs">{fmtLarge(comm.cemeteryNetVolume)}</td>
                    </tr>
                    <Row label="Base Wage" sublabel={`$${role.hourlyWage}/hr x ${role.hoursPerWeek}hrs x ${role.weeksPerYear}wks`} value={comm.baseWage} />
                    <tr className="border-t border-navy-100">
                      <td className="py-1.5 text-navy-600">Setter-Sourced ({pctSetterSourced}% of volume)</td>
                      <td className="py-1.5 text-right text-navy-500 text-xs">{fmtLarge(comm.setterSourcedVolume)} volume</td>
                    </tr>
                    <Row label={`  Setter Split (${100 - closerSplitPct}%)`} sublabel="Share of commission on sourced deals" value={comm.setterShareOfShared} />
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
                    <Row label="Monthly Bonuses" sublabel={comm.monthlyBonus > 0 ? `${fmt(comm.monthlyBonus)}/mo x 12` : 'Below threshold'} value={comm.annualMonthlyBonusTotal} />
                    <Row label="Annual Bonuses" sublabel="Highest qualifying tier" value={comm.annualBonus} />
                    <tr className="border-t-2" style={{ borderColor: ROLE_COLORS.setter }}>
                      <td className="py-3 font-bold text-base" style={{ color: ROLE_COLORS.setter }}>COMP PER SETTER</td>
                      <td className="py-3 text-right font-bold text-lg" style={{ color: ROLE_COLORS.setter }}>{fmt(comm.totalAgentComp)}</td>
                    </tr>
                    {setterCount > 1 && (
                      <tr className="bg-navy-50">
                        <td className="py-2 font-bold text-navy-800">TOTAL TEAM COST <span className="font-normal text-navy-500 text-xs">({setterCount} setters)</span></td>
                        <td className="py-2 text-right font-bold text-lg text-navy-900">{fmt(comm.totalAgentComp * setterCount)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })()}

        {/* ─ Aftercare Card ─ */}
        {(() => {
          const comm = commByRole.aftercare;
          const role = roles.aftercare;
          return (
            <section className="bg-white rounded-xl shadow-sm border border-navy-100 overflow-hidden">
              <div className="px-6 py-3" style={{ backgroundColor: ROLE_COLORS.aftercare }}>
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">Aftercare Specialist</h3>
              </div>
              <div className="px-6 py-4 space-y-4">
                {/* Inputs */}
                <div className="bg-navy-50 rounded-lg p-4 space-y-3">
                  <InputGroup label="Aftercare Volume">
                    <NumberInput value={aftercareAnnualVolume} onChange={setAftercareAnnualVolume} min={0} step={100000} prefix="$" />
                  </InputGroup>
                  <InputGroup label="Base Hourly Wage">
                    <NumberInput value={roles.aftercare.hourlyWage} onChange={v => updateRole('aftercare', 'hourlyWage', v)} min={0} step={0.50} prefix="$" />
                  </InputGroup>
                  <div className="grid grid-cols-3 gap-3">
                    <InputGroup label="Hours / Week">
                      <NumberInput value={roles.aftercare.hoursPerWeek} onChange={v => updateRole('aftercare', 'hoursPerWeek', v)} min={0} max={80} step={1} />
                    </InputGroup>
                    <InputGroup label="Weeks / Year">
                      <NumberInput value={roles.aftercare.weeksPerYear} onChange={v => updateRole('aftercare', 'weeksPerYear', v)} min={0} max={52} step={1} />
                    </InputGroup>
                  </div>
                </div>
                {/* Comp Breakdown */}
                <table className="w-full text-sm">
                  <tbody>
                    <Row label="Base Wage" sublabel={`$${role.hourlyWage}/hr x ${role.hoursPerWeek}hrs x ${role.weeksPerYear}wks`} value={comm.baseWage} />
                    <tr className="border-t border-navy-100">
                      <td className="py-1.5 text-navy-600">Aftercare Volume</td>
                      <td className="py-1.5 text-right text-navy-500 text-xs">{fmtLarge(comm.annualFaceValue)}</td>
                    </tr>
                    <tr className="border-t border-navy-100 bg-amber-50">
                      <td className="py-1 text-navy-500 text-xs">Cemetery Sold ({mixCemetery}%)</td>
                      <td className="py-1 text-right text-navy-500 text-xs">{fmtLarge(comm.cemeteryVolume)}</td>
                    </tr>
                    <tr className="bg-amber-50">
                      <td className="py-1 text-navy-500 text-xs">After 15% Perp. Care (commissionable)</td>
                      <td className="py-1 text-right text-navy-500 text-xs">{fmtLarge(comm.cemeteryNetVolume)}</td>
                    </tr>
                    <tr className="bg-amber-50 border-b border-navy-100">
                      <td className="py-1 text-navy-600 text-xs font-semibold">Net Volume (for bonuses)</td>
                      <td className="py-1 text-right text-navy-600 text-xs font-semibold">{fmtLarge(comm.netVolume)}</td>
                    </tr>
                    <tr className="border-t border-navy-200">
                      <td className="py-2 font-semibold text-navy-800">Gross Commission</td>
                      <td className="py-2 text-right font-semibold text-navy-800">
                        {fmt(comm.grossComm)} <span className="text-navy-400 text-xs ml-1">({fmtPct(comm.blendedRate)} eff.)</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 text-red-600">Total Chargebacks ({chargebackRate}%)</td>
                      <td className="py-1 text-right text-red-600">-{fmt(comm.chargebacks)}</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 text-red-500 text-xs pl-3">ACS Share (60%)</td>
                      <td className="py-0.5 text-right text-red-500 text-xs">-{fmt(comm.acsChargebacks)}</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 text-red-500 text-xs pl-3">FD Share (40%)</td>
                      <td className="py-0.5 text-right text-red-500 text-xs">-{fmt(comm.fdChargebacks)}</td>
                    </tr>
                    <tr className="border-t border-navy-200">
                      <td className="py-2 font-semibold text-navy-800">Net Commission</td>
                      <td className="py-2 text-right font-semibold text-navy-800">{fmt(comm.netComm)}</td>
                    </tr>
                    {aftercareLeadPct > 0 && (
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
                    <Row label="Annual Bonuses" sublabel="Highest qualifying tier" value={comm.annualBonus} />
                    <tr className="border-t-2" style={{ borderColor: ROLE_COLORS.aftercare }}>
                      <td className="py-3 font-bold text-base" style={{ color: ROLE_COLORS.aftercare }}>TOTAL COMP</td>
                      <td className="py-3 text-right font-bold text-lg" style={{ color: ROLE_COLORS.aftercare }}>{fmt(comm.totalAgentComp)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          );
        })()}
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
              <tr>
                <td className="py-1 pl-4 text-navy-600">
                  <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: ROLE_COLORS.closer }}></span>
                  Closers
                </td>
                <td className="py-1 text-right text-navy-800">
                  {roles.closer.teamCount} x {fmtLarge(closerAnnualVolume)} = <span className="font-semibold">{fmtLarge(roles.closer.teamCount * closerAnnualVolume)}</span>
                </td>
              </tr>
              <tr>
                <td className="py-1 pl-4 text-navy-600">
                  <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: ROLE_COLORS.aftercare }}></span>
                  Aftercare Specialists
                </td>
                <td className="py-1 text-right text-navy-800">
                  {roles.aftercare.teamCount} x {fmtLarge(aftercareAnnualVolume)} = <span className="font-semibold">{fmtLarge(roles.aftercare.teamCount * aftercareAnnualVolume)}</span>
                </td>
              </tr>
              <tr className="border-t border-navy-200">
                <td className="py-2 font-semibold text-navy-800 pl-4">Total Team Volume</td>
                <td className="py-2 text-right font-semibold text-navy-800">{fmtLarge(leader.teamVolume)}</td>
              </tr>
              <tr className="bg-amber-50">
                <td className="py-1 text-navy-500 text-xs pl-4">Net Volume (after 15% perp. care on {mixCemetery}% cemetery)</td>
                <td className="py-1 text-right text-navy-600 text-xs font-semibold">{fmtLarge(leader.teamNetVolume)}</td>
              </tr>
              <Row label="Monthly Override (1% of net)" value={leader.grossMonthlyOverride} />
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
              {ROLE_KEYS.filter(k => k !== 'aftercare').map(key => (
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
            <p className="text-xs text-navy-400 mt-0.5">Closers & Aftercare Specialists only</p>
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
                          const qualifies = (roleVolumes[key] / 12) >= t.threshold;
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
            <p className="text-xs text-navy-400 mt-0.5">Closers & Aftercare Specialists only</p>
          </div>
          <div className="px-6 py-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-navy-500 text-xs uppercase">
                  <th className="pb-2 text-left font-semibold">Annual Volume</th>
                  <th className="pb-2 text-right font-semibold">Bonus</th>
                  <th className="pb-2 text-right font-semibold">Roles</th>
                </tr>
              </thead>
              <tbody>
                {[...ANNUAL_BONUSES].reverse().map((t) => {
                  const active = activeAnnualTiers.includes(t.threshold);
                  return (
                    <tr key={t.threshold} className={active ? 'bg-teal-50' : ''}>
                      <td className={`py-1.5 ${active ? 'font-semibold text-teal-700' : 'text-navy-700'}`}>{fmtLarge(t.threshold)}</td>
                      <td className={`py-1.5 text-right ${active ? 'font-semibold text-teal-700' : 'text-navy-800'}`}>{fmt(t.bonus)}</td>
                      <td className="py-1.5 text-right">
                        <span className="inline-flex gap-1">
                          {ROLE_KEYS.map(key => {
                            const qualifies = roleVolumes[key] >= t.threshold;
                            return qualifies ? <span key={key} className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: ROLE_COLORS[key] }} title={ROLE_LABELS[key]}></span> : null;
                          })}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-xs text-navy-400 mt-2">Non-cumulative: highest qualifying tier only. Colored dots show qualifying roles.</p>
          </div>
        </section>

        {/* Semi-Annual Bonus Tiers */}
        <section className="bg-white rounded-xl shadow-sm border border-navy-100 overflow-hidden">
          <div className="bg-navy-100 px-6 py-3">
            <h3 className="text-xs font-bold text-navy-700 uppercase tracking-wide">Semi-Annual Bonus Tiers</h3>
            <p className="text-xs text-navy-400 mt-0.5">Sales Leader only</p>
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

      {/* ── Fixed Assumptions ── */}
      <section className="bg-white rounded-xl shadow-sm border border-navy-100 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-navy-700 uppercase tracking-wide">Settings & Fixed Assumptions</h3>
          <button onClick={resetDefaults} className="px-4 py-2 text-sm font-medium text-navy-600 bg-navy-100 hover:bg-navy-200 rounded-lg transition-colors">
            Reset Defaults
          </button>
        </div>

        {/* Global Settings */}
        <div>
          <span className="text-xs font-semibold text-navy-600 uppercase tracking-wide">Global Settings</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
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
          </div>
        </div>

        {/* Aftercare Lead Split */}
        <div>
          <span className="text-xs font-semibold text-navy-600 uppercase tracking-wide">Aftercare Lead Commission Split</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-2">
            <InputGroup label="% Sales from Aftercare Leads">
              <div className="w-full rounded-lg border border-navy-200 bg-navy-50 px-3 py-2 text-sm text-navy-500">{aftercareLeadPct}%</div>
            </InputGroup>
            <InputGroup label="Specialist Share">
              <div className="w-full rounded-lg border border-navy-200 bg-navy-50 px-3 py-2 text-sm text-navy-500">{specialistShare}%</div>
            </InputGroup>
            <InputGroup label="FD Referral Share">
              <div className="w-full rounded-lg border border-navy-200 bg-navy-50 px-3 py-2 text-sm text-navy-500">{100 - specialistShare}%</div>
            </InputGroup>
          </div>
          <p className="text-xs text-navy-400 mt-1">Split only applies to aftercare-sourced leads. FD referral kickback incentivizes warm handoffs.</p>
        </div>

        {/* Product Category Mix */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-semibold text-navy-600 uppercase tracking-wide">Product Category Mix</span>
            <SumBadge values={[DEFAULTS.mixPreneed, DEFAULTS.mixCemetery, DEFAULTS.mixTrust, DEFAULTS.mixTerminal]} label="Sum" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <InputGroup label="Preneed"><div className="w-full rounded-lg border border-navy-200 bg-navy-50 px-3 py-2 text-sm text-navy-500">{DEFAULTS.mixPreneed}%</div></InputGroup>
            <InputGroup label="Cemetery"><div className="w-full rounded-lg border border-navy-200 bg-navy-50 px-3 py-2 text-sm text-navy-500">{DEFAULTS.mixCemetery}%</div></InputGroup>
            <InputGroup label="Trust + Interest"><div className="w-full rounded-lg border border-navy-200 bg-navy-50 px-3 py-2 text-sm text-navy-500">{DEFAULTS.mixTrust}%</div></InputGroup>
            <InputGroup label="Terminal"><div className="w-full rounded-lg border border-navy-200 bg-navy-50 px-3 py-2 text-sm text-navy-500">{DEFAULTS.mixTerminal}%</div></InputGroup>
          </div>
        </div>

        {/* Payment Term Mix */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-semibold text-navy-600 uppercase tracking-wide">Preneed Payment Term Mix</span>
            <SumBadge values={[DEFAULTS.mixSinglePay, DEFAULTS.mix3Pay, DEFAULTS.mix5Pay, DEFAULTS.mix10Pay, DEFAULTS.mix20Pay]} label="Sum" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <InputGroup label="Single Pay"><div className="w-full rounded-lg border border-navy-200 bg-navy-50 px-3 py-2 text-sm text-navy-500">{DEFAULTS.mixSinglePay}%</div></InputGroup>
            <InputGroup label="3-Pay"><div className="w-full rounded-lg border border-navy-200 bg-navy-50 px-3 py-2 text-sm text-navy-500">{DEFAULTS.mix3Pay}%</div></InputGroup>
            <InputGroup label="5-Pay"><div className="w-full rounded-lg border border-navy-200 bg-navy-50 px-3 py-2 text-sm text-navy-500">{DEFAULTS.mix5Pay}%</div></InputGroup>
            <InputGroup label="10-Pay"><div className="w-full rounded-lg border border-navy-200 bg-navy-50 px-3 py-2 text-sm text-navy-500">{DEFAULTS.mix10Pay}%</div></InputGroup>
            <InputGroup label="20-Pay"><div className="w-full rounded-lg border border-navy-200 bg-navy-50 px-3 py-2 text-sm text-navy-500">{DEFAULTS.mix20Pay}%</div></InputGroup>
          </div>
        </div>

        {/* Age Distribution */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-semibold text-navy-600 uppercase tracking-wide">Preneed Age Distribution</span>
            <SumBadge values={[DEFAULTS.mixAge40_60, DEFAULTS.mixAge61_65, DEFAULTS.mixAge66_70, DEFAULTS.mixAge71_75, DEFAULTS.mixAge76_80, DEFAULTS.mixAge81_85, DEFAULTS.mixAge86_90]} label="Sum" />
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-4">
            <InputGroup label="40-60"><div className="w-full rounded-lg border border-navy-200 bg-navy-50 px-3 py-2 text-sm text-navy-500">{DEFAULTS.mixAge40_60}%</div></InputGroup>
            <InputGroup label="61-65"><div className="w-full rounded-lg border border-navy-200 bg-navy-50 px-3 py-2 text-sm text-navy-500">{DEFAULTS.mixAge61_65}%</div></InputGroup>
            <InputGroup label="66-70"><div className="w-full rounded-lg border border-navy-200 bg-navy-50 px-3 py-2 text-sm text-navy-500">{DEFAULTS.mixAge66_70}%</div></InputGroup>
            <InputGroup label="71-75"><div className="w-full rounded-lg border border-navy-200 bg-navy-50 px-3 py-2 text-sm text-navy-500">{DEFAULTS.mixAge71_75}%</div></InputGroup>
            <InputGroup label="76-80"><div className="w-full rounded-lg border border-navy-200 bg-navy-50 px-3 py-2 text-sm text-navy-500">{DEFAULTS.mixAge76_80}%</div></InputGroup>
            <InputGroup label="81-85"><div className="w-full rounded-lg border border-navy-200 bg-navy-50 px-3 py-2 text-sm text-navy-500">{DEFAULTS.mixAge81_85}%</div></InputGroup>
            <InputGroup label="86-90"><div className="w-full rounded-lg border border-navy-200 bg-navy-50 px-3 py-2 text-sm text-navy-500">{DEFAULTS.mixAge86_90}%</div></InputGroup>
          </div>
        </div>
      </section>

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
