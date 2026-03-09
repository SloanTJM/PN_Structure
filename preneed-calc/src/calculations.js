/**
 * Preneed Product Comparison Calculator — Calculation Engine
 *
 * METHODOLOGY:
 * - All compounding is monthly (monthlyEarnRate = annualEarnRate / 12)
 * - Annual tax on growth is applied once per year at end of each 12-month cycle
 * - Exit tax is applied once at the end when the claim happens
 * - Premiums arrive monthly during the payment term, then compound with no new money
 *
 * TWO COMPOUNDING MODES:
 * 1. Standard: tax on GROWTH ONLY each year (used for insurance/trust pots)
 * 2. Pass-through: tax on ALL INCOME (new payments + growth) each year (used for FC at funeral home)
 */

/**
 * TJM Life 2025 Rate Card — Monthly premium rates per $1 of face value.
 * Keyed by pay term (3, 5, 10, 20), each an array of { age, rate }.
 */
const RATE_TABLE = {
  3: [
    { age: 30, rate: 0.03001 }, { age: 31, rate: 0.03018 }, { age: 32, rate: 0.03036 },
    { age: 33, rate: 0.03053 }, { age: 34, rate: 0.03071 }, { age: 35, rate: 0.03088 },
    { age: 36, rate: 0.03106 }, { age: 37, rate: 0.03123 }, { age: 38, rate: 0.03153 },
    { age: 39, rate: 0.03183 }, { age: 40, rate: 0.03213 }, { age: 41, rate: 0.03243 },
    { age: 42, rate: 0.03273 }, { age: 43, rate: 0.03288 }, { age: 44, rate: 0.03303 },
    { age: 45, rate: 0.03316 }, { age: 46, rate: 0.03333 }, { age: 47, rate: 0.03348 },
    { age: 48, rate: 0.03373 }, { age: 49, rate: 0.03398 }, { age: 50, rate: 0.03423 },
    { age: 51, rate: 0.03448 }, { age: 52, rate: 0.03473 }, { age: 53, rate: 0.03503 },
    { age: 54, rate: 0.03533 }, { age: 55, rate: 0.03563 }, { age: 56, rate: 0.03588 },
    { age: 57, rate: 0.03613 }, { age: 58, rate: 0.03648 }, { age: 59, rate: 0.03683 },
    { age: 60, rate: 0.03718 }, { age: 61, rate: 0.03754 }, { age: 62, rate: 0.03790 },
    { age: 63, rate: 0.03820 }, { age: 64, rate: 0.03851 }, { age: 65, rate: 0.03882 },
    { age: 66, rate: 0.03913 }, { age: 67, rate: 0.03944 }, { age: 68, rate: 0.03975 },
    { age: 69, rate: 0.04006 }, { age: 70, rate: 0.04037 }, { age: 71, rate: 0.04069 },
    { age: 72, rate: 0.04100 }, { age: 73, rate: 0.04126 }, { age: 74, rate: 0.04152 },
    { age: 75, rate: 0.04178 }, { age: 76, rate: 0.04205 }, { age: 77, rate: 0.04231 },
    { age: 78, rate: 0.04283 }, { age: 79, rate: 0.04333 }, { age: 80, rate: 0.04384 },
    { age: 81, rate: 0.04435 }, { age: 82, rate: 0.04486 }, { age: 83, rate: 0.04542 },
    { age: 84, rate: 0.04598 }, { age: 85, rate: 0.04653 }, { age: 86, rate: 0.04710 },
    { age: 87, rate: 0.04767 }, { age: 88, rate: 0.04824 }, { age: 89, rate: 0.04883 },
    { age: 90, rate: 0.04942 },
  ],
  5: [
    { age: 30, rate: 0.02070 }, { age: 31, rate: 0.02075 }, { age: 32, rate: 0.02080 },
    { age: 33, rate: 0.02085 }, { age: 34, rate: 0.02090 }, { age: 35, rate: 0.02095 },
    { age: 36, rate: 0.02100 }, { age: 37, rate: 0.02105 }, { age: 38, rate: 0.02120 },
    { age: 39, rate: 0.02135 }, { age: 40, rate: 0.02150 }, { age: 41, rate: 0.02165 },
    { age: 42, rate: 0.02180 }, { age: 43, rate: 0.02195 }, { age: 44, rate: 0.02210 },
    { age: 45, rate: 0.02225 }, { age: 46, rate: 0.02240 }, { age: 47, rate: 0.02255 },
    { age: 48, rate: 0.02280 }, { age: 49, rate: 0.02306 }, { age: 50, rate: 0.02331 },
    { age: 51, rate: 0.02356 }, { age: 52, rate: 0.02381 }, { age: 53, rate: 0.02401 },
    { age: 54, rate: 0.02421 }, { age: 55, rate: 0.02441 }, { age: 56, rate: 0.02458 },
    { age: 57, rate: 0.02474 }, { age: 58, rate: 0.02496 }, { age: 59, rate: 0.02518 },
    { age: 60, rate: 0.02539 }, { age: 61, rate: 0.02562 }, { age: 62, rate: 0.02584 },
    { age: 63, rate: 0.02606 }, { age: 64, rate: 0.02628 }, { age: 65, rate: 0.02651 },
    { age: 66, rate: 0.02673 }, { age: 67, rate: 0.02696 }, { age: 68, rate: 0.02713 },
    { age: 69, rate: 0.02731 }, { age: 70, rate: 0.02749 }, { age: 71, rate: 0.02767 },
    { age: 72, rate: 0.02785 }, { age: 73, rate: 0.02813 }, { age: 74, rate: 0.02841 },
    { age: 75, rate: 0.02870 }, { age: 76, rate: 0.02898 }, { age: 77, rate: 0.02927 },
    { age: 78, rate: 0.02965 }, { age: 79, rate: 0.03003 }, { age: 80, rate: 0.03042 },
    { age: 81, rate: 0.03080 }, { age: 82, rate: 0.03118 }, { age: 83, rate: 0.03166 },
    { age: 84, rate: 0.03214 }, { age: 85, rate: 0.03262 },
  ],
  10: [
    { age: 30, rate: 0.01211 }, { age: 31, rate: 0.01221 }, { age: 32, rate: 0.01230 },
    { age: 33, rate: 0.01240 }, { age: 34, rate: 0.01250 }, { age: 35, rate: 0.01259 },
    { age: 36, rate: 0.01269 }, { age: 37, rate: 0.01279 }, { age: 38, rate: 0.01288 },
    { age: 39, rate: 0.01298 }, { age: 40, rate: 0.01308 }, { age: 41, rate: 0.01317 },
    { age: 42, rate: 0.01327 }, { age: 43, rate: 0.01337 }, { age: 44, rate: 0.01346 },
    { age: 45, rate: 0.01356 }, { age: 46, rate: 0.01365 }, { age: 47, rate: 0.01375 },
    { age: 48, rate: 0.01385 }, { age: 49, rate: 0.01394 }, { age: 50, rate: 0.01404 },
    { age: 51, rate: 0.01423 }, { age: 52, rate: 0.01472 }, { age: 53, rate: 0.01491 },
    { age: 54, rate: 0.01510 }, { age: 55, rate: 0.01530 }, { age: 56, rate: 0.01549 },
    { age: 57, rate: 0.01568 }, { age: 58, rate: 0.01583 }, { age: 59, rate: 0.01597 },
    { age: 60, rate: 0.01612 }, { age: 61, rate: 0.01626 }, { age: 62, rate: 0.01641 },
    { age: 63, rate: 0.01660 }, { age: 64, rate: 0.01679 }, { age: 65, rate: 0.01698 },
    { age: 66, rate: 0.01718 }, { age: 67, rate: 0.01737 }, { age: 68, rate: 0.01756 },
    { age: 69, rate: 0.01776 }, { age: 70, rate: 0.01795 }, { age: 71, rate: 0.01814 },
    { age: 72, rate: 0.01834 }, { age: 73, rate: 0.01862 }, { age: 74, rate: 0.01891 },
    { age: 75, rate: 0.01920 }, { age: 76, rate: 0.01949 }, { age: 77, rate: 0.01978 },
    { age: 78, rate: 0.02007 }, { age: 79, rate: 0.02036 }, { age: 80, rate: 0.02065 },
  ],
  20: [
    { age: 30, rate: 0.00817 }, { age: 31, rate: 0.00827 }, { age: 32, rate: 0.00837 },
    { age: 33, rate: 0.00846 }, { age: 34, rate: 0.00856 }, { age: 35, rate: 0.00866 },
    { age: 36, rate: 0.00875 }, { age: 37, rate: 0.00885 }, { age: 38, rate: 0.00895 },
    { age: 39, rate: 0.00904 }, { age: 40, rate: 0.00914 }, { age: 41, rate: 0.00924 },
    { age: 42, rate: 0.00933 }, { age: 43, rate: 0.00950 }, { age: 44, rate: 0.00965 },
    { age: 45, rate: 0.00981 }, { age: 46, rate: 0.00997 }, { age: 47, rate: 0.01013 },
    { age: 48, rate: 0.01023 }, { age: 49, rate: 0.01033 }, { age: 50, rate: 0.01042 },
    { age: 51, rate: 0.01052 }, { age: 52, rate: 0.01062 }, { age: 53, rate: 0.01081 },
    { age: 54, rate: 0.01100 }, { age: 55, rate: 0.01119 }, { age: 56, rate: 0.01139 },
    { age: 57, rate: 0.01158 }, { age: 58, rate: 0.01171 }, { age: 59, rate: 0.01184 },
    { age: 60, rate: 0.01197 }, { age: 61, rate: 0.01210 }, { age: 62, rate: 0.01223 },
    { age: 63, rate: 0.01252 }, { age: 64, rate: 0.01281 }, { age: 65, rate: 0.01310 },
    { age: 66, rate: 0.01338 }, { age: 67, rate: 0.01367 }, { age: 68, rate: 0.01387 },
    { age: 69, rate: 0.01406 }, { age: 70, rate: 0.01425 }, { age: 71, rate: 0.01445 },
    { age: 72, rate: 0.01464 }, { age: 73, rate: 0.01493 }, { age: 74, rate: 0.01522 },
    { age: 75, rate: 0.01551 },
  ],
};

/**
 * SSA 2021 Period Life Table — remaining life expectancy by age (combined sexes).
 * Key = age, value = expected remaining years.
 */
const LIFE_EXPECTANCY = {
  30: 51.82, 31: 50.87, 32: 49.92, 33: 48.97, 34: 48.02,
  35: 47.07, 36: 46.13, 37: 45.18, 38: 44.24, 39: 43.30,
  40: 42.36, 41: 41.42, 42: 40.49, 43: 39.56, 44: 38.64,
  45: 37.72, 46: 36.81, 47: 35.90, 48: 35.00, 49: 34.11,
  50: 33.22, 51: 32.34, 52: 31.47, 53: 30.61, 54: 29.75,
  55: 28.90, 56: 28.06, 57: 27.22, 58: 26.39, 59: 25.57,
  60: 24.75, 61: 23.94, 62: 23.14, 63: 22.35, 64: 21.56,
  65: 20.78, 66: 20.01, 67: 19.24, 68: 18.49, 69: 17.74,
  70: 17.00, 71: 16.27, 72: 15.56, 73: 14.86, 74: 14.17,
  75: 13.50, 76: 12.83, 77: 12.19, 78: 11.56, 79: 10.95,
  80: 10.35, 81:  9.77, 82:  9.21, 83:  8.67, 84:  8.15,
  85:  7.64, 86:  7.16, 87:  6.70, 88:  6.27, 89:  5.85,
  90:  5.46,
};

/**
 * SSA 2021 Period Life Table — probability of death within one year (qx).
 * Ages 30–49 use a flat approximation; ages 50–100 use exact SSA values.
 */
export const SSA_QX = {
  30: 0.002, 31: 0.002, 32: 0.002, 33: 0.002, 34: 0.002,
  35: 0.002, 36: 0.002, 37: 0.002, 38: 0.002, 39: 0.002,
  40: 0.002, 41: 0.002, 42: 0.002, 43: 0.002, 44: 0.002,
  45: 0.002, 46: 0.002, 47: 0.002, 48: 0.002, 49: 0.002,
  50: 0.004539, 51: 0.004943, 52: 0.005376, 53: 0.005843, 54: 0.006342,
  55: 0.006873, 56: 0.007446, 57: 0.008068, 58: 0.008742, 59: 0.009487,
  60: 0.010298, 61: 0.011162, 62: 0.012090, 63: 0.013109, 64: 0.014210,
  65: 0.014553, 66: 0.015875, 67: 0.017310, 68: 0.018873, 69: 0.020581,
  70: 0.022448, 71: 0.024493, 72: 0.026727, 73: 0.029166, 74: 0.031826,
  75: 0.034759, 76: 0.037972, 77: 0.041486, 78: 0.045325, 79: 0.049517,
  80: 0.054098, 81: 0.059114, 82: 0.064607, 83: 0.070620, 84: 0.077211,
  85: 0.084432, 86: 0.092334, 87: 0.100986, 88: 0.110455, 89: 0.120811,
  90: 0.132137, 91: 0.144514, 92: 0.158038, 93: 0.172808, 94: 0.188929,
  95: 0.206516, 96: 0.225685, 97: 0.246566, 98: 0.269294, 99: 0.294014,
  100: 1.0,
};

/**
 * Distribute policyCount lives across years of death using SSA qx.
 * Returns { deaths[], capYear, deathsByBand[] }
 */
export function buildDeathDistribution(startAge, policyCount = 1000, maxYears = 35, mortalityMultiplier = 1.0) {
  const capYear = Math.min(maxYears, 100 - startAge);
  let survivors = policyCount;
  const deaths = [];

  for (let y = 1; y <= capYear; y++) {
    const age = startAge + y - 1;
    const qx = Math.min(1.0, (SSA_QX[Math.min(age, 100)] || SSA_QX[100]) * mortalityMultiplier);
    if (y === capYear) {
      // Final year: all remaining survivors claim
      deaths.push({ year: y, age: age + 1, deaths: survivors });
      survivors = 0;
    } else {
      const died = Math.round(survivors * qx);
      deaths.push({ year: y, age: age + 1, deaths: died });
      survivors -= died;
    }
  }

  // Aggregate into 5-year bands
  const deathsByBand = [];
  for (let i = 0; i < deaths.length; i += 5) {
    const band = deaths.slice(i, i + 5);
    const startYr = band[0].year;
    const endYr = band[band.length - 1].year;
    const total = band.reduce((s, d) => s + d.deaths, 0);
    deathsByBand.push({ label: startYr === endYr ? `Yr ${startYr}` : `Yr ${startYr}–${endYr}`, deaths: total });
  }

  return { deaths, capYear, deathsByBand };
}

/**
 * Run mortality-weighted portfolio simulation across all death years.
 */
export function runMortalitySimulation(inputs, deathDistribution, calculatorFn = calculateAll) {
  const { deaths, capYear } = deathDistribution;
  const products = {};
  const yearlyDetail = [];

  // Run calculations for each possible death year
  for (let y = 1; y <= capYear; y++) {
    const yearResults = calculatorFn({ ...inputs, yearsUntilClaim: y });
    const deathEntry = deaths[y - 1];
    const count = deathEntry.deaths;

    const resultsByProduct = {};
    yearResults.forEach((r) => {
      const isInsurance = r.product === 'Multi-Pay Whole Life' || r.product === 'Graded Death Benefit' || r.product === 'Single-Pay Whole Life';
      // Annuity/Trust: TJM only pays back account value, never absorbs shortfall
      const tjmNetGrowth = isInsurance ? r.netGrowth : Math.max(0, r.netGrowth);
      // Family shortfall: for annuity/trust, the gap families must cover out of pocket
      const familyShortfall = (!isInsurance && r.netGrowth < 0) ? Math.abs(r.netGrowth) : 0;

      resultsByProduct[r.product] = {
        netGrowth: tjmNetGrowth,
        netReturnPct: isInsurance ? r.netReturnPct : Math.max(0, r.netReturnPct),
        familyShortfall,
      };

      if (!products[r.product]) {
        products[r.product] = {
          product: r.product,
          totalPortfolioNetGrowth: 0,
          totalFamilyShortfall: 0,
          weightedPolicies: 0,
          policiesPositive: 0,
          policiesNegative: 0,
          breakevenYear: null,
          worstCase: tjmNetGrowth,
          bestCase: tjmNetGrowth,
          color: null,
        };
      }
      const p = products[r.product];
      p.totalPortfolioNetGrowth += tjmNetGrowth * count;
      p.totalFamilyShortfall += familyShortfall * count;
      p.weightedPolicies += count;
      if (tjmNetGrowth >= 0) p.policiesPositive += count;
      else p.policiesNegative += count;
      if (p.breakevenYear === null && tjmNetGrowth >= 0) p.breakevenYear = y;
      if (y === 1) p.worstCase = tjmNetGrowth;
      p.bestCase = tjmNetGrowth; // last year is always best
    });

    yearlyDetail.push({ year: y, deaths: count, age: deathEntry.age, results: resultsByProduct });
  }

  // Finalize product stats
  const productList = Object.values(products);
  const PRODUCT_COLORS = {
    'Multi-Pay Whole Life': '#16a34a',
    'Financed Annuity (Actual)': '#2563eb',
    'Trust + Finance Charges': '#dc2626',
    'Graded Death Benefit': '#7c3aed',
    'Single-Pay Whole Life': '#16a34a',
    'Single-Pay Annuity': '#2563eb',
    'Single-Pay Trust': '#dc2626',
  };

  productList.forEach((p) => {
    p.avgNetGrowth = p.totalPortfolioNetGrowth / p.weightedPolicies;
    p.avgNetReturnPct = (p.avgNetGrowth / inputs.faceValue) * 100;
    p.color = PRODUCT_COLORS[p.product] || '#666';
  });

  productList.sort((a, b) => b.totalPortfolioNetGrowth - a.totalPortfolioNetGrowth);
  const bestProduct = productList[0].product;

  productList.forEach((p) => {
    p.diffFromBest = p.totalPortfolioNetGrowth - productList[0].totalPortfolioNetGrowth;
  });

  // Build histogram with dynamic bucket widths
  const allGrowths = [];
  yearlyDetail.forEach((yd) => {
    Object.keys(yd.results).forEach((prod) => {
      if (yd.deaths > 0) allGrowths.push(yd.results[prod].netGrowth);
    });
  });
  const minG = Math.min(...allGrowths);
  const maxG = Math.max(...allGrowths);
  const range = maxG - minG;
  const bucketWidth = range > 0 ? Math.max(100, Math.ceil(range / 15 / 100) * 100) : 500;

  function fmtBucket(v) {
    if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(0)}k`;
    return `$${v}`;
  }

  const bucketStart = Math.floor(minG / bucketWidth) * bucketWidth;
  const bucketEnd = Math.ceil(maxG / bucketWidth) * bucketWidth;
  const histogram = [];
  for (let b = bucketStart; b < bucketEnd; b += bucketWidth) {
    const entry = { bucket: `${fmtBucket(b)} to ${fmtBucket(b + bucketWidth)}` };
    Object.keys(products).forEach((prod) => { entry[prod] = 0; });
    histogram.push(entry);
  }

  yearlyDetail.forEach((yd) => {
    if (yd.deaths === 0) return;
    Object.keys(yd.results).forEach((prod) => {
      const g = yd.results[prod].netGrowth;
      const idx = Math.min(
        Math.floor((g - bucketStart) / bucketWidth),
        histogram.length - 1
      );
      if (idx >= 0) histogram[idx][prod] += yd.deaths;
    });
  });

  return { products: productList, yearlyDetail, bestProduct, histogram };
}

export function getLifeExpectancy(age, mortalityMultiplier = 1.0) {
  const clamped = Math.max(30, Math.min(90, Math.round(age)));
  if (mortalityMultiplier === 1.0) {
    const remainingYears = LIFE_EXPECTANCY[clamped];
    return { expectedAge: clamped + remainingYears, remainingYears };
  }
  // Compute from SSA_QX with multiplier applied
  let survivors = 1.0;
  let totalYearsLived = 0;
  for (let a = clamped; a <= 100; a++) {
    const qx = Math.min(1.0, (SSA_QX[a] || SSA_QX[100]) * mortalityMultiplier);
    const died = survivors * qx;
    totalYearsLived += died * (a - clamped + 0.5);
    survivors -= died;
  }
  if (survivors > 0) totalYearsLived += survivors * (101 - clamped);
  return { expectedAge: clamped + totalYearsLived, remainingYears: totalYearsLived };
}

export function getRateForAgeTerm(age, termYears) {
  const table = RATE_TABLE[termYears];
  if (!table) return null;
  const entry = table.find((r) => r.age === age);
  return entry ? entry.rate : null;
}

export function getScaledRate(age, termYears) {
  return getRateForAgeTerm(age, termYears) ?? null;
}

export function getMaxAgeForTerm(termYears) {
  const table = RATE_TABLE[termYears];
  if (!table || table.length === 0) return 90;
  return table[table.length - 1].age;
}

export function getMonthlyPremium(faceValue, age, termYears, overrideRate) {
  const rate = overrideRate != null ? overrideRate : getScaledRate(age, termYears);
  if (rate == null) return null;
  return faceValue * rate;
}

// ---------------------------------------------------------------------------
// Compounding functions — now return monthly values + year-by-year detail
// ---------------------------------------------------------------------------

/**
 * STANDARD COMPOUNDING — tax on GROWTH ONLY each year.
 *
 * Returns:
 *   monthlyValues[] — pot value at end of each month (index 0 = month 0 = $0)
 *   yearDetails[]   — one entry per year with breakdown
 *   finalPot, totalPaid
 */
function compoundStandard(monthlyPayment, payMonths, totalMonths, monthlyEarnRate, annualTaxRate) {
  let pot = 0;
  const monthlyValues = [0];
  const yearDetails = [];
  let cumulativePaid = 0;

  let potAtStartOfYear = 0;
  let premiumsThisYear = 0;

  for (let month = 1; month <= totalMonths; month++) {
    if ((month - 1) % 12 === 0) {
      potAtStartOfYear = pot;
      premiumsThisYear = 0;
    }

    if (month <= payMonths) {
      pot += monthlyPayment;
      premiumsThisYear += monthlyPayment;
      cumulativePaid += monthlyPayment;
    }

    pot *= 1 + monthlyEarnRate;
    monthlyValues.push(pot);

    if (month % 12 === 0) {
      const growth = pot - potAtStartOfYear - premiumsThisYear;
      const tax = growth > 0 ? growth * annualTaxRate : 0;
      pot -= tax;
      monthlyValues[monthlyValues.length - 1] = pot; // update last month's value after tax

      yearDetails.push({
        year: month / 12,
        paymentsThisYear: premiumsThisYear,
        cumulativePayments: cumulativePaid,
        growthThisYear: growth,
        taxThisYear: tax,
        potValue: pot,
      });
    }
  }

  const totalPaid = monthlyPayment * payMonths;
  return { monthlyValues, yearDetails, finalPot: pot, totalPaid };
}

/**
 * PASS-THROUGH COMPOUNDING — tax on ALL INCOME (payments + growth) each year.
 *
 * Returns same shape as compoundStandard, with yearDetails showing
 * income received, gross growth, total taxable, and tax.
 */
function compoundPassThrough(monthlyPayment, payMonths, totalMonths, monthlyEarnRate, annualTaxRate) {
  let pot = 0;
  const monthlyValues = [0];
  const yearDetails = [];
  let cumulativeReceived = 0;

  let potAtStartOfYear = 0;
  let incomeThisYear = 0;

  for (let month = 1; month <= totalMonths; month++) {
    if ((month - 1) % 12 === 0) {
      potAtStartOfYear = pot;
      incomeThisYear = 0;
    }

    if (month <= payMonths) {
      pot += monthlyPayment;
      incomeThisYear += monthlyPayment;
      cumulativeReceived += monthlyPayment;
    }

    pot *= 1 + monthlyEarnRate;
    monthlyValues.push(pot);

    if (month % 12 === 0) {
      const investmentGrowth = pot - potAtStartOfYear - incomeThisYear;
      const totalTaxableIncome = incomeThisYear + investmentGrowth;
      const tax = totalTaxableIncome > 0 ? totalTaxableIncome * annualTaxRate : 0;
      pot -= tax;
      monthlyValues[monthlyValues.length - 1] = pot;

      yearDetails.push({
        year: month / 12,
        incomeThisYear,
        cumulativeReceived,
        grossGrowth: investmentGrowth,
        totalTaxableIncome,
        taxThisYear: tax,
        potValue: pot,
      });
    }
  }

  const totalPaid = monthlyPayment * payMonths;
  return { monthlyValues, yearDetails, finalPot: pot, totalPaid };
}

/**
 * GUARANTEED GROWTH ON PREMIUMS — each monthly payment compounds at the
 * guaranteed rate from the month it was received until the claim date.
 */
function calcGuaranteedOnPremiums(monthlyPayment, payMonths, totalMonths, annualGuaranteedRate) {
  if (!annualGuaranteedRate) return { guaranteedAmount: 0, guaranteedGrowth: 0 };
  const monthlyRate = annualGuaranteedRate / 12;
  let guaranteedAmount = 0;
  for (let m = 1; m <= payMonths; m++) {
    guaranteedAmount += monthlyPayment * Math.pow(1 + monthlyRate, totalMonths - m);
  }
  const totalPaid = monthlyPayment * payMonths;
  return { guaranteedAmount, guaranteedGrowth: guaranteedAmount - totalPaid };
}

// ---------------------------------------------------------------------------
// Product calculators
// ---------------------------------------------------------------------------

/** Product 1: Multi-Pay Whole Life */
export function calcMultiPayWholeLife(inputs) {
  const {
    faceValue, customerAge, paymentTermYears, earnRate,
    yearsUntilClaim, tjmTaxRate, dividendExitTaxRate, overrideMonthlyRate,
  } = inputs;

  const monthlyPremium = getMonthlyPremium(faceValue, customerAge, paymentTermYears, overrideMonthlyRate);
  const payMonths = paymentTermYears * 12;
  const totalMonths = yearsUntilClaim * 12;
  const monthlyEarnRate = earnRate / 12;

  const result = compoundStandard(monthlyPremium, payMonths, totalMonths, monthlyEarnRate, tjmTaxRate);

  const grossGrowth = result.finalPot - result.totalPaid;
  const exitTax = Math.max(0, grossGrowth * dividendExitTaxRate);
  const netValueAfterTax = result.finalPot - exitTax;

  // Guaranteed rate: grows inside TJM Life reserves (tax-sheltered), taxed at tjmTaxRate
  const gRate = inputs.guaranteedRate || 0;
  const guaranteedGrowth = faceValue * (Math.pow(1 + gRate, yearsUntilClaim) - 1);
  const guaranteedTax = guaranteedGrowth * tjmTaxRate;
  const netGuaranteed = guaranteedGrowth - guaranteedTax;

  const policyGain = result.finalPot - faceValue;
  const netGrowthAboveFace = netValueAfterTax - faceValue - guaranteedTax;

  return {
    product: 'Multi-Pay Whole Life',
    monthlyPayment: monthlyPremium,
    totalPaid: result.totalPaid,
    policyGain,
    annualTaxRate: tjmTaxRate,
    annualTaxLabel: `${(tjmTaxRate * 100).toFixed(0)}%`,
    growthBeforeExitTax: grossGrowth,
    exitTaxRate: dividendExitTaxRate,
    exitTaxLabel: `${(dividendExitTaxRate * 100).toFixed(0)}%`,
    exitTax,
    grossInterest: grossGrowth,
    paidToFH: faceValue,
    guaranteedGrowth,
    guaranteedTax,
    netGuaranteed,
    netGrowth: netGrowthAboveFace,
    netReturnPct: (netGrowthAboveFace / faceValue) * 100,
    yearlyValues: result.yearDetails.map((d) => d.potValue),
    monthlyValues: result.monthlyValues,
    customerAge,
    earnRateDisplay: earnRate * 100,
    components: null,
    // Detail data for "under the hood" tables
    detail: {
      type: 'wholelife',
      yearDetails: result.yearDetails,
      settlement: {
        potAtClaim: result.finalPot,
        totalPremiumsPaid: result.totalPaid,
        growthAbovePremiums: grossGrowth,
        exitTaxRate: dividendExitTaxRate,
        exitTax,
        valueAfterAllTaxes: netValueAfterTax,
        faceValue,
        guaranteedGrowth,
        guaranteedTax,
        netGuaranteed,
        netRetainedAboveFace: netGrowthAboveFace,
        netReturnPct: (netGrowthAboveFace / faceValue) * 100,
      },
    },
  };
}

/** Product 2: Financed Annuity (Actual Tax Treatment) */
export function calcFinancedAnnuityActual(inputs) {
  const {
    faceValue, paymentTermYears, earnRate, yearsUntilClaim,
    tjmTaxRate, financeChargeRate, passThroughTaxRate, dividendExitTaxRate,
  } = inputs;

  const payMonths = paymentTermYears * 12;
  const totalMonths = yearsUntilClaim * 12;
  const monthlyEarnRate = earnRate / 12;

  // Pot A: Annuity principal
  const monthlyPrincipal = faceValue / payMonths;
  const potA = compoundStandard(monthlyPrincipal, payMonths, totalMonths, monthlyEarnRate, tjmTaxRate);
  const potAGrowth = potA.finalPot - faceValue;
  const potAExitTax = Math.max(0, potAGrowth * dividendExitTaxRate);
  const netA = potA.finalPot - potAExitTax;

  // Pot B: Finance charges (pass-through)
  const totalFC = faceValue * financeChargeRate * paymentTermYears;
  const monthlyFC = totalFC / payMonths;
  const potB = compoundPassThrough(monthlyFC, payMonths, totalMonths, monthlyEarnRate, passThroughTaxRate);
  const netB = potB.finalPot;

  // Combined
  const monthlyPayment = monthlyPrincipal + monthlyFC;
  const totalPaid = potA.totalPaid + potB.totalPaid;
  const growthBeforeExitTax = potAGrowth + potB.finalPot - potB.totalPaid;
  const exitTax = potAExitTax;

  // Guaranteed rate: grows inside TJM Life reserves (tax-sheltered), taxed at tjmTaxRate
  const gRate = inputs.guaranteedRate || 0;
  const { guaranteedGrowth } = calcGuaranteedOnPremiums(monthlyPrincipal, payMonths, totalMonths, gRate);
  const guaranteedTax = guaranteedGrowth * tjmTaxRate;
  const netGuaranteed = guaranteedGrowth - guaranteedTax;

  const policyGain = (potA.finalPot + potB.finalPot) - faceValue;
  const netGrowthAboveFace = (netA - faceValue) + netB - guaranteedTax;

  const yearlyValues = potA.yearDetails.map((d, i) =>
    d.potValue + (potB.yearDetails[i] ? potB.yearDetails[i].potValue : 0)
  );
  const monthlyValues = potA.monthlyValues.map((v, i) => v + (potB.monthlyValues[i] || 0));

  return {
    product: 'Financed Annuity (Actual)',
    policyGain,
    monthlyPayment,
    totalPaid,
    annualTaxRate: null,
    annualTaxLabel: `blended (${(tjmTaxRate * 100).toFixed(0)}%/${(passThroughTaxRate * 100).toFixed(0)}%)`,
    growthBeforeExitTax,
    exitTaxRate: null,
    exitTaxLabel: `blended (${(dividendExitTaxRate * 100).toFixed(0)}%/0%)`,
    exitTax,
    grossInterest: potAGrowth,
    paidToFH: faceValue,
    guaranteedGrowth,
    guaranteedTax,
    netGuaranteed,
    netGrowth: netGrowthAboveFace,
    netReturnPct: (netGrowthAboveFace / faceValue) * 100,
    yearlyValues,
    monthlyValues,
    customerAge: inputs.customerAge,
    earnRateDisplay: earnRate * 100,
    components: {
      a: {
        name: 'Annuity Principal',
        amountIntoPot: faceValue,
        annualTaxRate: tjmTaxRate,
        growthBeforeExitTax: potAGrowth,
        exitTaxRate: dividendExitTaxRate,
        exitTax: potAExitTax,
        netGrowth: netA - faceValue,
      },
      b: {
        name: 'Finance Charges',
        amountIntoPot: potB.totalPaid,
        annualTaxRate: passThroughTaxRate,
        growthBeforeExitTax: potB.finalPot - potB.totalPaid,
        exitTaxRate: 0,
        exitTax: 0,
        netGrowth: netB,
      },
    },
    detail: {
      type: 'twopot',
      potALabel: 'Annuity Principal in TJM Life',
      potBLabel: 'Finance Charges at Funeral Home',
      potA: { yearDetails: potA.yearDetails, finalPot: potA.finalPot, totalPaid: potA.totalPaid },
      potB: { yearDetails: potB.yearDetails, finalPot: potB.finalPot, totalPaid: potB.totalPaid, isPassThrough: true },
      settlement: {
        potAValue: potA.finalPot,
        potAGrowth: potAGrowth,
        potAExitTaxRate: dividendExitTaxRate,
        potAExitTax: potAExitTax,
        potANet: netA,
        potBValue: potB.finalPot,
        potBExitTax: 0,
        potBNet: netB,
        combinedValue: potA.finalPot + potB.finalPot,
        combinedExitTax: potAExitTax,
        combinedNet: netA + netB,
        faceValue,
        guaranteedGrowth,
        guaranteedTax,
        netGuaranteed,
        netRetainedAboveFace: netGrowthAboveFace,
        netReturnPct: (netGrowthAboveFace / faceValue) * 100,
      },
    },
  };
}


/** Product 4: Trust + Finance Charges */
export function calcTrustPlusFC(inputs) {
  const {
    faceValue, paymentTermYears, earnRate, yearsUntilClaim,
    trustTaxRate, financeChargeRate, passThroughTaxRate,
    trustEarnRate,
  } = inputs;

  const effectiveEarnRate = trustEarnRate != null ? trustEarnRate : earnRate;

  const payMonths = paymentTermYears * 12;
  const totalMonths = yearsUntilClaim * 12;
  const monthlyEarnRate = effectiveEarnRate / 12;

  const monthlyPrincipal = faceValue / payMonths;
  const potA = compoundStandard(monthlyPrincipal, payMonths, totalMonths, monthlyEarnRate, trustTaxRate);
  const potAGrowth = potA.finalPot - faceValue;
  const potAExitTax = Math.max(0, potAGrowth * passThroughTaxRate);
  const netA = potA.finalPot - potAExitTax;

  const totalFC = faceValue * financeChargeRate * paymentTermYears;
  const monthlyFC = totalFC / payMonths;
  const potB = compoundPassThrough(monthlyFC, payMonths, totalMonths, monthlyEarnRate, passThroughTaxRate);
  const netB = potB.finalPot;

  const monthlyPayment = monthlyPrincipal + monthlyFC;
  const totalPaid = potA.totalPaid + potB.totalPaid;
  const growthBeforeExitTax = potAGrowth + potB.finalPot - potB.totalPaid;
  const exitTax = potAExitTax;
  const policyGain = (potA.finalPot + potB.finalPot) - faceValue;
  const netGrowthAboveFace = (netA - faceValue) + netB;

  const yearlyValues = potA.yearDetails.map((d, i) =>
    d.potValue + (potB.yearDetails[i] ? potB.yearDetails[i].potValue : 0)
  );
  const monthlyValues = potA.monthlyValues.map((v, i) => v + (potB.monthlyValues[i] || 0));

  return {
    product: 'Trust + Finance Charges',
    policyGain,
    monthlyPayment,
    totalPaid,
    annualTaxRate: null,
    annualTaxLabel: `blended (${(trustTaxRate * 100).toFixed(0)}%/${(passThroughTaxRate * 100).toFixed(0)}%)`,
    growthBeforeExitTax,
    exitTaxRate: null,
    exitTaxLabel: `blended (${(passThroughTaxRate * 100).toFixed(0)}%/0%)`,
    exitTax,
    grossInterest: potAGrowth,
    paidToFH: potA.finalPot + potB.finalPot,
    netGrowth: netGrowthAboveFace,
    netReturnPct: (netGrowthAboveFace / faceValue) * 100,
    yearlyValues,
    monthlyValues,
    customerAge: inputs.customerAge,
    earnRateDisplay: effectiveEarnRate * 100,
    guaranteedGrowth: 0,
    guaranteedTax: 0,
    netGuaranteed: 0,
    components: {
      a: {
        name: 'Trust Principal',
        amountIntoPot: faceValue,
        annualTaxRate: trustTaxRate,
        growthBeforeExitTax: potAGrowth,
        exitTaxRate: passThroughTaxRate,
        exitTax: potAExitTax,
        netGrowth: netA - faceValue,
      },
      b: {
        name: 'Finance Charges',
        amountIntoPot: potB.totalPaid,
        annualTaxRate: passThroughTaxRate,
        growthBeforeExitTax: potB.finalPot - potB.totalPaid,
        exitTaxRate: 0,
        exitTax: 0,
        netGrowth: netB,
      },
    },
    detail: {
      type: 'twopot',
      potALabel: 'Trust Principal',
      potBLabel: 'Finance Charges at Funeral Home',
      potA: { yearDetails: potA.yearDetails, finalPot: potA.finalPot, totalPaid: potA.totalPaid },
      potB: { yearDetails: potB.yearDetails, finalPot: potB.finalPot, totalPaid: potB.totalPaid, isPassThrough: true },
      settlement: {
        potAValue: potA.finalPot,
        potAGrowth: potAGrowth,
        potAExitTaxRate: passThroughTaxRate,
        potAExitTax: potAExitTax,
        potANet: netA,
        potBValue: potB.finalPot,
        potBExitTax: 0,
        potBNet: netB,
        combinedValue: potA.finalPot + potB.finalPot,
        combinedExitTax: potAExitTax,
        combinedNet: netA + netB,
        faceValue,
        guaranteedGrowth: 0,
        guaranteedTax: 0,
        netGuaranteed: 0,
        netRetainedAboveFace: netGrowthAboveFace,
        netReturnPct: (netGrowthAboveFace / faceValue) * 100,
      },
    },
  };
}

/** Run all product calculations and return sorted by net growth descending. */
export function calculateAll(inputs) {
  const results = [
    calcMultiPayWholeLife(inputs),
    calcFinancedAnnuityActual(inputs),
    calcTrustPlusFC(inputs),
  ];
  results.sort((a, b) => b.netGrowth - a.netGrowth);
  return results.map((r, i) => ({ ...r, rank: i + 1 }));
}

// ---------------------------------------------------------------------------
// Graded Death Benefit — rate table and calculator
// ---------------------------------------------------------------------------

const GRADED_RATE_TABLE = {
  3: [
    { age: 30, rate: 0.03106 }, { age: 31, rate: 0.03124 }, { age: 32, rate: 0.03143 },
    { age: 33, rate: 0.03160 }, { age: 34, rate: 0.03179 }, { age: 35, rate: 0.03198 },
    { age: 36, rate: 0.03215 }, { age: 37, rate: 0.03233 }, { age: 38, rate: 0.03264 },
    { age: 39, rate: 0.03295 }, { age: 40, rate: 0.03326 }, { age: 41, rate: 0.03357 },
    { age: 42, rate: 0.03388 }, { age: 43, rate: 0.03403 }, { age: 44, rate: 0.03419 },
    { age: 45, rate: 0.03434 }, { age: 46, rate: 0.03450 }, { age: 47, rate: 0.03465 },
    { age: 48, rate: 0.03491 }, { age: 49, rate: 0.03517 }, { age: 50, rate: 0.03543 },
    { age: 51, rate: 0.03563 }, { age: 52, rate: 0.03595 }, { age: 53, rate: 0.03626 },
    { age: 54, rate: 0.03657 }, { age: 55, rate: 0.03688 }, { age: 56, rate: 0.03714 },
    { age: 57, rate: 0.03740 }, { age: 58, rate: 0.03776 }, { age: 59, rate: 0.03812 },
    { age: 60, rate: 0.03848 }, { age: 61, rate: 0.03885 }, { age: 62, rate: 0.03922 },
    { age: 63, rate: 0.03954 }, { age: 64, rate: 0.03986 }, { age: 65, rate: 0.04018 },
    { age: 66, rate: 0.04050 }, { age: 67, rate: 0.04082 }, { age: 68, rate: 0.04134 },
    { age: 69, rate: 0.04187 }, { age: 70, rate: 0.04239 }, { age: 71, rate: 0.04272 },
    { age: 72, rate: 0.04305 }, { age: 73, rate: 0.04332 }, { age: 74, rate: 0.04360 },
    { age: 75, rate: 0.04387 }, { age: 76, rate: 0.04415 }, { age: 77, rate: 0.04443 },
    { age: 78, rate: 0.04497 }, { age: 79, rate: 0.04550 }, { age: 80, rate: 0.04603 },
    { age: 81, rate: 0.04657 }, { age: 82, rate: 0.04711 }, { age: 83, rate: 0.04792 },
    { age: 84, rate: 0.04873 }, { age: 85, rate: 0.04933 }, { age: 86, rate: 0.04992 },
    { age: 87, rate: 0.05053 }, { age: 88, rate: 0.05114 }, { age: 89, rate: 0.05178 },
    { age: 90, rate: 0.05238 },
  ],
  5: [
    { age: 30, rate: 0.02142 }, { age: 31, rate: 0.02148 }, { age: 32, rate: 0.02153 },
    { age: 33, rate: 0.02158 }, { age: 34, rate: 0.02163 }, { age: 35, rate: 0.02168 },
    { age: 36, rate: 0.02174 }, { age: 37, rate: 0.02173 }, { age: 38, rate: 0.02194 },
    { age: 39, rate: 0.02210 }, { age: 40, rate: 0.02225 }, { age: 41, rate: 0.02241 },
    { age: 42, rate: 0.02257 }, { age: 43, rate: 0.02272 }, { age: 44, rate: 0.02288 },
    { age: 45, rate: 0.02303 }, { age: 46, rate: 0.02319 }, { age: 47, rate: 0.02334 },
    { age: 48, rate: 0.02360 }, { age: 49, rate: 0.02386 }, { age: 50, rate: 0.02412 },
    { age: 51, rate: 0.02438 }, { age: 52, rate: 0.02464 }, { age: 53, rate: 0.02485 },
    { age: 54, rate: 0.02506 }, { age: 55, rate: 0.02526 }, { age: 56, rate: 0.02544 },
    { age: 57, rate: 0.02561 }, { age: 58, rate: 0.02583 }, { age: 59, rate: 0.02606 },
    { age: 60, rate: 0.02628 }, { age: 61, rate: 0.02651 }, { age: 62, rate: 0.02674 },
    { age: 63, rate: 0.02637 }, { age: 64, rate: 0.02720 }, { age: 65, rate: 0.02743 },
    { age: 66, rate: 0.02767 }, { age: 67, rate: 0.02790 }, { age: 68, rate: 0.02822 },
    { age: 69, rate: 0.02854 }, { age: 70, rate: 0.02886 }, { age: 71, rate: 0.02905 },
    { age: 72, rate: 0.02925 }, { age: 73, rate: 0.02954 }, { age: 74, rate: 0.02984 },
    { age: 75, rate: 0.03013 }, { age: 76, rate: 0.03043 }, { age: 77, rate: 0.03073 },
    { age: 78, rate: 0.03113 }, { age: 79, rate: 0.03153 }, { age: 80, rate: 0.03194 },
    { age: 81, rate: 0.03234 }, { age: 82, rate: 0.03274 }, { age: 83, rate: 0.03340 },
    { age: 84, rate: 0.03407 }, { age: 85, rate: 0.03458 },
  ],
  10: [
    { age: 30, rate: 0.01266 }, { age: 31, rate: 0.01276 }, { age: 32, rate: 0.01286 },
    { age: 33, rate: 0.01296 }, { age: 34, rate: 0.01306 }, { age: 35, rate: 0.01316 },
    { age: 36, rate: 0.01326 }, { age: 37, rate: 0.01336 }, { age: 38, rate: 0.01346 },
    { age: 39, rate: 0.01356 }, { age: 40, rate: 0.01366 }, { age: 41, rate: 0.01377 },
    { age: 42, rate: 0.01387 }, { age: 43, rate: 0.01397 }, { age: 44, rate: 0.01407 },
    { age: 45, rate: 0.01417 }, { age: 46, rate: 0.01427 }, { age: 47, rate: 0.01437 },
    { age: 48, rate: 0.01447 }, { age: 49, rate: 0.01457 }, { age: 50, rate: 0.01467 },
    { age: 51, rate: 0.01488 }, { age: 52, rate: 0.01538 }, { age: 53, rate: 0.01558 },
    { age: 54, rate: 0.01578 }, { age: 55, rate: 0.01538 }, { age: 56, rate: 0.01619 },
    { age: 57, rate: 0.01639 }, { age: 58, rate: 0.01654 }, { age: 59, rate: 0.01669 },
    { age: 60, rate: 0.01684 }, { age: 61, rate: 0.01639 }, { age: 62, rate: 0.01714 },
    { age: 63, rate: 0.01735 }, { age: 64, rate: 0.01755 }, { age: 65, rate: 0.01775 },
    { age: 66, rate: 0.01795 }, { age: 67, rate: 0.01815 }, { age: 68, rate: 0.01835 },
    { age: 69, rate: 0.01856 }, { age: 70, rate: 0.01876 }, { age: 71, rate: 0.01896 },
    { age: 72, rate: 0.01916 }, { age: 73, rate: 0.01946 }, { age: 74, rate: 0.01977 },
    { age: 75, rate: 0.02007 }, { age: 76, rate: 0.02037 }, { age: 77, rate: 0.02067 },
    { age: 78, rate: 0.02098 }, { age: 79, rate: 0.02128 }, { age: 80, rate: 0.02158 },
  ],
  20: [
    { age: 30, rate: 0.00854 }, { age: 31, rate: 0.00864 }, { age: 32, rate: 0.00874 },
    { age: 33, rate: 0.00884 }, { age: 34, rate: 0.00894 }, { age: 35, rate: 0.00905 },
    { age: 36, rate: 0.00915 }, { age: 37, rate: 0.00925 }, { age: 38, rate: 0.00935 },
    { age: 39, rate: 0.00945 }, { age: 40, rate: 0.00955 }, { age: 41, rate: 0.00965 },
    { age: 42, rate: 0.00975 }, { age: 43, rate: 0.00992 }, { age: 44, rate: 0.01008 },
    { age: 45, rate: 0.01026 }, { age: 46, rate: 0.01042 }, { age: 47, rate: 0.01053 },
    { age: 48, rate: 0.01063 }, { age: 49, rate: 0.01073 }, { age: 50, rate: 0.01083 },
    { age: 51, rate: 0.01093 }, { age: 52, rate: 0.01109 }, { age: 53, rate: 0.01130 },
    { age: 54, rate: 0.01150 }, { age: 55, rate: 0.01170 }, { age: 56, rate: 0.01190 },
    { age: 57, rate: 0.01210 }, { age: 58, rate: 0.01223 }, { age: 59, rate: 0.01237 },
    { age: 60, rate: 0.01250 }, { age: 61, rate: 0.01265 }, { age: 62, rate: 0.01278 },
    { age: 63, rate: 0.01308 }, { age: 64, rate: 0.01338 }, { age: 65, rate: 0.01368 },
    { age: 66, rate: 0.01399 }, { age: 67, rate: 0.01429 }, { age: 68, rate: 0.01449 },
    { age: 69, rate: 0.01463 }, { age: 70, rate: 0.01490 }, { age: 71, rate: 0.01510 },
    { age: 72, rate: 0.01530 }, { age: 73, rate: 0.01560 }, { age: 74, rate: 0.01590 },
    { age: 75, rate: 0.01621 },
  ],
};

export function getGradedBenefitFactor(yearsUntilClaim) {
  if (yearsUntilClaim <= 1) return 0.25;
  if (yearsUntilClaim <= 2) return 0.50;
  if (yearsUntilClaim <= 3) return 0.75;
  return 1.00;
}

export function getGradedScaledRate(age, termYears) {
  const table = GRADED_RATE_TABLE[termYears];
  if (!table) return null;
  const entry = table.find((r) => r.age === age);
  return entry ? entry.rate : null;
}

export function getGradedMaxAgeForTerm(termYears) {
  const table = GRADED_RATE_TABLE[termYears];
  if (!table || table.length === 0) return 90;
  return table[table.length - 1].age;
}

/** Product: Graded Death Benefit — same tax treatment as Multi-Pay WL, graded payout */
export function calcGradedDeathBenefit(inputs) {
  const {
    faceValue, customerAge, paymentTermYears, earnRate,
    yearsUntilClaim, tjmTaxRate, dividendExitTaxRate,
    returnOfPremium,
  } = inputs;

  const rate = getGradedScaledRate(customerAge, paymentTermYears);
  const monthlyPremium = rate != null ? faceValue * rate : null;
  const payMonths = paymentTermYears * 12;
  const totalMonths = yearsUntilClaim * 12;
  const monthlyEarnRate = earnRate / 12;

  // Actual premiums paid at claim time (result.totalPaid is always full-term total)
  const actualPremiumsPaid = monthlyPremium != null
    ? monthlyPremium * Math.min(totalMonths, payMonths) : 0;

  // Acquisition costs (always applied)
  const commissionRate = inputs.gradedCommissionRate || 0.075;
  const overrideRate = 0.02;
  const firstYearPremiums = monthlyPremium != null
    ? monthlyPremium * Math.min(12, payMonths) : 0;
  const commission = firstYearPremiums * commissionRate;
  const override = firstYearPremiums * overrideRate;
  const premiumTax = actualPremiumsPaid * 0.00875;
  const totalAcquisitionCost = commission + override + premiumTax;

  // Graded benefit with optional Return of Premium
  const gradedFactor = getGradedBenefitFactor(yearsUntilClaim);
  const gradedPercentBenefit = faceValue * gradedFactor;
  let gradedFaceValue;
  let ropApplied = false;
  if (returnOfPremium && yearsUntilClaim <= 3) {
    gradedFaceValue = Math.max(gradedPercentBenefit, actualPremiumsPaid);
    ropApplied = actualPremiumsPaid > gradedPercentBenefit;
  } else {
    gradedFaceValue = gradedPercentBenefit;
  }

  const result = compoundStandard(monthlyPremium, payMonths, totalMonths, monthlyEarnRate, tjmTaxRate);

  const grossGrowth = result.finalPot - result.totalPaid;
  const exitTax = Math.max(0, grossGrowth * dividendExitTaxRate);
  const netValueAfterTax = result.finalPot - exitTax;

  // Guaranteed rate: grows inside TJM Life reserves (tax-sheltered), taxed at tjmTaxRate
  const gRate = inputs.guaranteedRate || 0;
  const guaranteedGrowth = gradedFaceValue * (Math.pow(1 + gRate, yearsUntilClaim) - 1);
  const guaranteedTax = guaranteedGrowth * tjmTaxRate;
  const netGuaranteed = guaranteedGrowth - guaranteedTax;

  const policyGain = result.finalPot - gradedFaceValue - totalAcquisitionCost;
  const netGrowthAboveFace = netValueAfterTax - gradedFaceValue - guaranteedTax - totalAcquisitionCost;

  return {
    product: 'Graded Death Benefit',
    monthlyPayment: monthlyPremium,
    totalPaid: result.totalPaid,
    policyGain,
    annualTaxRate: tjmTaxRate,
    annualTaxLabel: `${(tjmTaxRate * 100).toFixed(0)}%`,
    growthBeforeExitTax: grossGrowth,
    exitTaxRate: dividendExitTaxRate,
    exitTaxLabel: `${(dividendExitTaxRate * 100).toFixed(0)}%`,
    exitTax,
    grossInterest: grossGrowth,
    paidToFH: gradedFaceValue,
    gradedFactor,
    gradedFaceValue,
    gradedPercentBenefit,
    ropApplied,
    actualPremiumsPaid,
    commission,
    override,
    premiumTax,
    totalAcquisitionCost,
    firstYearPremiums,
    guaranteedGrowth,
    guaranteedTax,
    netGuaranteed,
    netGrowth: netGrowthAboveFace,
    netReturnPct: (netGrowthAboveFace / faceValue) * 100,
    yearlyValues: result.yearDetails.map((d) => d.potValue),
    monthlyValues: result.monthlyValues,
    customerAge,
    earnRateDisplay: earnRate * 100,
    components: null,
    detail: {
      type: 'wholelife',
      yearDetails: result.yearDetails,
      settlement: {
        potAtClaim: result.finalPot,
        totalPremiumsPaid: result.totalPaid,
        growthAbovePremiums: grossGrowth,
        exitTaxRate: dividendExitTaxRate,
        exitTax,
        valueAfterAllTaxes: netValueAfterTax,
        faceValue: gradedFaceValue,
        commission,
        override,
        premiumTax,
        totalAcquisitionCost,
        guaranteedGrowth,
        guaranteedTax,
        netGuaranteed,
        netRetainedAboveFace: netGrowthAboveFace,
        netReturnPct: (netGrowthAboveFace / faceValue) * 100,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Single-Pay (Pay In Full) calculators
// ---------------------------------------------------------------------------

/** Single-Pay Whole Life: lump sum faceValue deposited month 1, minus TX premium tax.
 *  Insurance product — TJM Life owes full face value from day 1 regardless of when death occurs. */
export function calcSinglePayWholeLife(inputs) {
  const {
    faceValue, customerAge, earnRate, yearsUntilClaim,
    tjmTaxRate, dividendExitTaxRate, passThroughTaxRate,
  } = inputs;

  const premiumTaxRate = inputs.premiumTaxRate || 0.00875;
  const premiumTax = faceValue * premiumTaxRate;
  const netDeposit = faceValue - premiumTax;

  const totalMonths = yearsUntilClaim * 12;
  const monthlyEarnRate = earnRate / 12;

  const result = compoundStandard(netDeposit, 1, totalMonths, monthlyEarnRate, tjmTaxRate);

  const grossGrowth = result.finalPot - netDeposit;
  const exitTax = Math.max(0, grossGrowth * dividendExitTaxRate);
  const netValueAfterTax = result.finalPot - exitTax;

  // Guaranteed rate: grows inside TJM Life reserves (tax-sheltered), taxed at tjmTaxRate
  const gRate = inputs.guaranteedRate || 0;
  const guaranteedGrowth = faceValue * (Math.pow(1 + gRate, yearsUntilClaim) - 1);
  const guaranteedTax = guaranteedGrowth * tjmTaxRate;
  const netGuaranteed = guaranteedGrowth - guaranteedTax;

  const policyGain = result.finalPot - faceValue;
  const netGrowthAboveFace = netValueAfterTax - faceValue - guaranteedTax;

  return {
    product: 'Single-Pay Whole Life',
    monthlyPayment: null,
    totalPaid: faceValue,
    premiumTax,
    netDeposit,
    policyGain,
    annualTaxRate: tjmTaxRate,
    annualTaxLabel: `${(tjmTaxRate * 100).toFixed(0)}%`,
    growthBeforeExitTax: grossGrowth,
    exitTaxRate: dividendExitTaxRate,
    exitTaxLabel: `${(dividendExitTaxRate * 100).toFixed(0)}%`,
    exitTax,
    grossInterest: grossGrowth,
    paidToFH: faceValue,
    guaranteedGrowth,
    guaranteedTax,
    netGuaranteed,
    netGrowth: netGrowthAboveFace,
    netReturnPct: (netGrowthAboveFace / faceValue) * 100,
    yearlyValues: result.yearDetails.map((d) => d.potValue),
    monthlyValues: result.monthlyValues,
    customerAge,
    earnRateDisplay: earnRate * 100,
    components: null,
    detail: {
      type: 'singlepay',
      yearDetails: result.yearDetails,
      settlement: {
        potAtClaim: result.finalPot,
        totalPremiumsPaid: faceValue,
        premiumTax,
        netDeposit,
        growthAbovePremiums: grossGrowth,
        exitTaxRate: dividendExitTaxRate,
        exitTax,
        valueAfterAllTaxes: netValueAfterTax,
        faceValue,
        guaranteedGrowth,
        guaranteedTax,
        netGuaranteed,
        netRetainedAboveFace: netGrowthAboveFace,
        netReturnPct: (netGrowthAboveFace / faceValue) * 100,
      },
    },
  };
}

/** Single-Pay Annuity: lump sum faceValue deposited month 1 into TJM Life */
export function calcSinglePayAnnuity(inputs) {
  const {
    faceValue, customerAge, earnRate, yearsUntilClaim,
    tjmTaxRate, dividendExitTaxRate, passThroughTaxRate,
  } = inputs;

  const totalMonths = yearsUntilClaim * 12;
  const monthlyEarnRate = earnRate / 12;

  const result = compoundStandard(faceValue, 1, totalMonths, monthlyEarnRate, tjmTaxRate);

  const grossGrowth = result.finalPot - faceValue;
  const exitTax = Math.max(0, grossGrowth * dividendExitTaxRate);
  const netValueAfterTax = result.finalPot - exitTax;

  // Guaranteed rate: grows inside TJM Life reserves (tax-sheltered), taxed at tjmTaxRate
  const gRate = inputs.guaranteedRate || 0;
  const guaranteedGrowth = faceValue * (Math.pow(1 + gRate, yearsUntilClaim) - 1);
  const guaranteedTax = guaranteedGrowth * tjmTaxRate;
  const netGuaranteed = guaranteedGrowth - guaranteedTax;

  const policyGain = result.finalPot - faceValue;
  const netGrowthAboveFace = netValueAfterTax - faceValue - guaranteedTax;

  return {
    product: 'Single-Pay Annuity',
    monthlyPayment: null,
    totalPaid: faceValue,
    policyGain,
    annualTaxRate: tjmTaxRate,
    annualTaxLabel: `${(tjmTaxRate * 100).toFixed(0)}%`,
    growthBeforeExitTax: grossGrowth,
    exitTaxRate: dividendExitTaxRate,
    exitTaxLabel: `${(dividendExitTaxRate * 100).toFixed(0)}%`,
    exitTax,
    grossInterest: grossGrowth,
    paidToFH: faceValue,
    guaranteedGrowth,
    guaranteedTax,
    netGuaranteed,
    netGrowth: netGrowthAboveFace,
    netReturnPct: (netGrowthAboveFace / faceValue) * 100,
    yearlyValues: result.yearDetails.map((d) => d.potValue),
    monthlyValues: result.monthlyValues,
    customerAge,
    earnRateDisplay: earnRate * 100,
    components: null,
    detail: {
      type: 'singlepay',
      yearDetails: result.yearDetails,
      settlement: {
        potAtClaim: result.finalPot,
        totalPremiumsPaid: faceValue,
        growthAbovePremiums: grossGrowth,
        exitTaxRate: dividendExitTaxRate,
        exitTax,
        valueAfterAllTaxes: netValueAfterTax,
        faceValue,
        guaranteedGrowth,
        guaranteedTax,
        netGuaranteed,
        netRetainedAboveFace: netGrowthAboveFace,
        netReturnPct: (netGrowthAboveFace / faceValue) * 100,
      },
    },
  };
}

/** Single-Pay Trust: lump sum faceValue deposited month 1 into trust */
export function calcSinglePayTrust(inputs) {
  const {
    faceValue, customerAge, earnRate, yearsUntilClaim,
    trustTaxRate, passThroughTaxRate, trustEarnRate,
  } = inputs;

  const effectiveEarnRate = trustEarnRate != null ? trustEarnRate : earnRate;
  const totalMonths = yearsUntilClaim * 12;
  const monthlyEarnRate = effectiveEarnRate / 12;

  const result = compoundStandard(faceValue, 1, totalMonths, monthlyEarnRate, trustTaxRate);

  const grossGrowth = result.finalPot - faceValue;
  const exitTax = Math.max(0, grossGrowth * passThroughTaxRate);
  const netValueAfterTax = result.finalPot - exitTax;

  const policyGain = result.finalPot - faceValue;
  const netGrowthAboveFace = netValueAfterTax - faceValue;

  return {
    product: 'Single-Pay Trust',
    monthlyPayment: null,
    totalPaid: faceValue,
    policyGain,
    annualTaxRate: trustTaxRate,
    annualTaxLabel: `${(trustTaxRate * 100).toFixed(0)}%`,
    growthBeforeExitTax: grossGrowth,
    exitTaxRate: passThroughTaxRate,
    exitTaxLabel: `${(passThroughTaxRate * 100).toFixed(0)}%`,
    exitTax,
    grossInterest: grossGrowth,
    paidToFH: result.finalPot,
    guaranteedGrowth: 0,
    guaranteedTax: 0,
    netGuaranteed: 0,
    netGrowth: netGrowthAboveFace,
    netReturnPct: (netGrowthAboveFace / faceValue) * 100,
    yearlyValues: result.yearDetails.map((d) => d.potValue),
    monthlyValues: result.monthlyValues,
    customerAge,
    earnRateDisplay: effectiveEarnRate * 100,
    components: null,
    detail: {
      type: 'singlepay',
      yearDetails: result.yearDetails,
      settlement: {
        potAtClaim: result.finalPot,
        totalPremiumsPaid: faceValue,
        growthAbovePremiums: grossGrowth,
        exitTaxRate: passThroughTaxRate,
        exitTax,
        valueAfterAllTaxes: netValueAfterTax,
        faceValue,
        guaranteedGrowth: 0,
        guaranteedTax: 0,
        netGuaranteed: 0,
        netRetainedAboveFace: netGrowthAboveFace,
        netReturnPct: (netGrowthAboveFace / faceValue) * 100,
      },
    },
  };
}

/** Run all single-pay calculators and return sorted by net growth descending. */
export function calculateAllPayInFull(inputs) {
  const results = [
    calcSinglePayWholeLife(inputs),
    calcSinglePayAnnuity(inputs),
    calcSinglePayTrust(inputs),
  ];
  results.sort((a, b) => b.netGrowth - a.netGrowth);
  return results.map((r, i) => ({ ...r, rank: i + 1 }));
}

/** Run unhealthy product calculations: Graded + Annuity + Trust */
export function calculateAllUnhealthy(inputs) {
  const results = [
    calcGradedDeathBenefit(inputs),
    calcFinancedAnnuityActual(inputs),
    calcTrustPlusFC(inputs),
  ];
  results.sort((a, b) => b.netGrowth - a.netGrowth);
  return results.map((r, i) => ({ ...r, rank: i + 1 }));
}
