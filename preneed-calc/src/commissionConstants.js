/* ─── Commission Rate Tables (% of face, agent only, excludes override) ─── */
export const AGENT_RATES = {
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

/* Semi-annual bonus tiers (marginal/incremental per 6-month period) */
export const SEMI_ANNUAL_TIERS = [
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

export const MONTHLY_BONUSES = [
  { threshold: 300000, bonus: 5750 },
  { threshold: 275000, bonus: 5000 },
  { threshold: 250000, bonus: 4250 },
  { threshold: 225000, bonus: 3500 },
  { threshold: 200000, bonus: 2750 },
  { threshold: 175000, bonus: 2000 },
  { threshold: 150000, bonus: 1500 },
  { threshold: 125000, bonus: 1000 },
  { threshold: 100000, bonus: 750 },
  { threshold: 75000, bonus: 500 },
];

export const ANNUAL_BONUSES = [
  { threshold: 3500000, bonus: 60000 },
  { threshold: 3250000, bonus: 50000 },
  { threshold: 3000000, bonus: 40000 },
  { threshold: 2750000, bonus: 32500 },
  { threshold: 2500000, bonus: 25000 },
  { threshold: 2250000, bonus: 20000 },
  { threshold: 2000000, bonus: 15000 },
  { threshold: 1750000, bonus: 12000 },
  { threshold: 1500000, bonus: 9000 },
  { threshold: 1250000, bonus: 6500 },
  { threshold: 1000000, bonus: 4000 },
  { threshold: 750000, bonus: 2000 },
];

export const ROLE_DEFAULTS = {
  closer:    { hourlyWage: 13.00, hoursPerWeek: 40, weeksPerYear: 52, teamCount: 3 },
  setter:    { hourlyWage: 16.00, hoursPerWeek: 40, weeksPerYear: 52, teamCount: 2 },
  aftercare: { hourlyWage: 18.00, hoursPerWeek: 40, weeksPerYear: 52, teamCount: 1 },
};

export const BUCKET_DEFAULTS = {
  closerAnnualVolume: 2500000,
  pctSetterSourced: 0,
  closerSplitPct: 80,
  aftercareAnnualVolume: 1000000,
};

export const AFTERCARE_DEFAULTS = {
  aftercareLeadPct: 100,
  specialistShare: 60,
};

/* Shared helper: calculate semi-annual bonus for a given 6-month volume */
export function calcSemiAnnualBonus(volumePerPeriod) {
  let bonus = 0;
  for (const tier of SEMI_ANNUAL_TIERS) {
    if (volumePerPeriod <= tier.floor) break;
    const taxable = Math.min(volumePerPeriod, tier.ceiling) - tier.floor;
    bonus += taxable * (tier.rate / 100);
  }
  return bonus;
}
