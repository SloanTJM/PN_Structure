import {
  AGENT_RATES, MONTHLY_BONUSES, ANNUAL_BONUSES,
  calcSemiAnnualBonus,
} from './commissionConstants';

const TERM_KEYS = ['single', '3pay', '5pay', '10pay', '20pay'];
const AGE_BANDS = ['40-60', '61-65', '66-70', '71-75', '76-80', '81-85', '86-90'];

/* ─── Role display labels (used across admin + demo pages) ─── */
export const ROLE_LABELS = { closer: 'Preneed Specialist', setter: 'Appointment Specialist', aftercare: 'Aftercare Specialist' };
export const ROLE_COLORS = { closer: '#2563eb', setter: '#7c3aed', aftercare: '#059669' };
export const ROLE_KEYS = ['closer', 'setter', 'aftercare'];

/* ─── Calculations ─── */
export function calcGrossCommission(annualFaceValue, s, simplified = false) {
  if (simplified) {
    const cemVolume = annualFaceValue * (s.mixCemetery / 100);
    const nonCemComm = (annualFaceValue - cemVolume) * 0.075;
    const propertyComm = cemVolume * 0.70 * 0.85 * 0.075;
    const markerComm = cemVolume * 0.30 * 0.075;
    const cemeteryComm = propertyComm + markerComm;
    const grossComm = nonCemComm + cemeteryComm;
    return { preneedYr1: nonCemComm, preneedYr2: 0, preneedYr3: 0, totalPreneed: nonCemComm, cemeteryComm, trustComm: 0, terminalComm: 0, grossComm };
  }

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

  const cemeteryVolume = annualFaceValue * (s.mixCemetery / 100);
  const propertyComm = cemeteryVolume * 0.70 * 0.85 * 0.075;
  const markerComm = cemeteryVolume * 0.30 * 0.075;
  const cemeteryComm = propertyComm + markerComm;
  const trustComm = annualFaceValue * (s.mixTrust / 100) * 0.0375;
  const terminalComm = annualFaceValue * (s.mixTerminal / 100) * 0.01;

  const totalPreneed = preneedYr1 + preneedYr2 + preneedYr3;
  const grossComm = totalPreneed + cemeteryComm + trustComm + terminalComm;

  return { preneedYr1, preneedYr2, preneedYr3, totalPreneed, cemeteryComm, trustComm, terminalComm, grossComm };
}

export function calcCloserComp(s, buckets, simplified = false) {
  const totalVolume = buckets.closerAnnualVolume;
  const setterPct = buckets.pctSetterSourced / 100;
  const closerSplit = buckets.closerSplitPct / 100;

  const directVolume = totalVolume * (1 - setterPct);
  const setterSourcedVolume = totalVolume * setterPct;

  const directComm = calcGrossCommission(directVolume, s, simplified);
  const sharedComm = calcGrossCommission(setterSourcedVolume, s, simplified);

  const grossComm = directComm.grossComm + sharedComm.grossComm * closerSplit;
  const chargebacks = (grossComm - directComm.terminalComm - sharedComm.terminalComm * closerSplit) * (s.chargebackRate / 100);
  const netComm = grossComm - chargebacks;

  const blendedRate = totalVolume > 0 ? (grossComm / totalVolume) * 100 : 0;

  const cemeteryVolume = totalVolume * (s.mixCemetery / 100);
  const cemeteryNetVolume = cemeteryVolume * 0.70 * 0.85 + cemeteryVolume * 0.30;

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

export function calcSetterComp(s, buckets, simplified = false) {
  const totalVolume = buckets.setterVolumeEach;
  const setterPct = buckets.pctSetterSourced / 100;
  const setterSplit = (100 - buckets.closerSplitPct) / 100;

  const setterSourcedVolume = totalVolume * setterPct;
  const sharedComm = calcGrossCommission(setterSourcedVolume, s, simplified);

  const grossComm = sharedComm.grossComm * setterSplit;
  const chargebacks = (grossComm - sharedComm.terminalComm * setterSplit) * (s.chargebackRate / 100);
  const netComm = grossComm - chargebacks;

  const blendedRate = setterSourcedVolume > 0 ? (grossComm / setterSourcedVolume) * 100 : 0;

  const cemeteryVolume = setterSourcedVolume * (s.mixCemetery / 100);
  const cemeteryNetVolume = cemeteryVolume * 0.70 * 0.85 + cemeteryVolume * 0.30;

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

export function calcAftercareComp(s, buckets, aftercareLeadPct, specialistShare, simplified = false) {
  const annualFaceValue = buckets.aftercareAnnualVolume;
  const comm = calcGrossCommission(annualFaceValue, s, simplified);

  const grossComm = comm.grossComm;
  const chargebacks = (grossComm - comm.terminalComm) * (s.chargebackRate / 100);
  const acsChargebacks = chargebacks * 0.60;
  const fdChargebacks = chargebacks * 0.40;
  const netComm = grossComm - chargebacks;

  const blendedRate = annualFaceValue > 0 ? (grossComm / annualFaceValue) * 100 : 0;

  const leadPct = aftercareLeadPct / 100;
  const specShare = specialistShare / 100;
  const aftercarePortion = netComm * leadPct * specShare;
  const nonAftercarePortion = netComm * (1 - leadPct);
  const effectiveNetComm = aftercarePortion + nonAftercarePortion;
  const fdReferralShare = netComm * leadPct * (1 - specShare);

  const cemeteryVolume = annualFaceValue * (s.mixCemetery / 100);
  const cemeteryNetVolume = cemeteryVolume * 0.70 * 0.85 + cemeteryVolume * 0.30;

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

export function calcLeaderComp(s, roles, buckets) {
  const closerVolume = roles.closer.teamCount * buckets.closerAnnualVolume;
  const aftercareVolume = roles.aftercare.teamCount * buckets.aftercareAnnualVolume;
  const teamVolume = closerVolume + aftercareVolume;

  const perpCareFrac = (s.mixCemetery / 100) * 0.70 * 0.15;
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

export function buildChartData(sharedState, roles, buckets, aftercareLeadPct, specialistShare, simplified = false) {
  const points = [];
  for (let fv = 0; fv <= 5000000; fv += 100000) {
    const point = { faceValue: fv };
    const bk = { ...buckets, closerAnnualVolume: fv, aftercareAnnualVolume: fv };

    const closerSt = { ...sharedState, hourlyWage: roles.closer.hourlyWage, hoursPerWeek: roles.closer.hoursPerWeek, weeksPerYear: roles.closer.weeksPerYear };
    point.total_closer = calcCloserComp(closerSt, bk, simplified).totalAgentComp;

    const setterSt = { ...sharedState, hourlyWage: roles.setter.hourlyWage, hoursPerWeek: roles.setter.hoursPerWeek, weeksPerYear: roles.setter.weeksPerYear };
    point.total_setter = calcSetterComp(setterSt, bk, simplified).totalAgentComp;

    const aftercareSt = { ...sharedState, hourlyWage: roles.aftercare.hourlyWage, hoursPerWeek: roles.aftercare.hoursPerWeek, weeksPerYear: roles.aftercare.weeksPerYear };
    point.total_aftercare = calcAftercareComp(aftercareSt, bk, aftercareLeadPct, specialistShare, simplified).totalAgentComp;

    points.push(point);
  }
  return points;
}
