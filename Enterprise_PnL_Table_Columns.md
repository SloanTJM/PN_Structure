# Enterprise P&L — Year-by-Year Projection Table: Column Definitions

This document describes every column in the Year-by-Year Projection table on the Enterprise P&L page, how each value is calculated, and what assumptions drive it.

The table has two views: **Simple View** and **Detailed View**. Detailed-only columns are marked with `[DETAIL]`.

---

## Production Split

Total annual production is split between cemetery and preneed insurance based on the **Cemetery Mix %** (default 50%).

```
insuranceFace = totalProduction * (1 - cemeteryMix%)
cemeteryFace  = totalProduction * cemeteryMix%
```

The insurance portion is further split by the **Product Mix** (WL 35%, Single-Pay Annuity 35%, Graded 20%, Trust 10%).

---

## Column Definitions

### Year
The calendar year (e.g., 2027, 2028...). Starting year is configurable.

### New Prod. (New Production)
Total new face value sold that year — **both insurance and cemetery combined**.

```
newProduction = initialProduction * (1 + growthRate%)^(year - 1)
```

Default: $20M initial, growing at 3%/year.

### In-Force
Total surviving insurance face value across all vintages (prior year cohorts). Does **not** include cemetery — cemetery has no in-force concept.

```
inForce = SUM over all vintages: vintage.totalFace * blendedSurvival[yearsElapsed]
```

Where `blendedSurvival` is derived from SSA 2021 mortality tables, weighted by the age distribution mix. As policyholders die each year, in-force shrinks for that vintage.

### Reserves
The TJM Life reserve pool — the accumulated asset base that generates investment income. This is NOT earnings; it's a liability (money owed to policyholders).

```
reserves = priorReserves + netPremiumsToReserves + investmentIncome - claimsPaid
```

Where `netPremiumsToReserves = annuityPremiums + multiPayNetPremiums`. Only the **net premium** (actuarial cost = face / payment term per year) flows into reserves. The **loading** (gross premium - net premium) stays with TJM Life as revenue.

- **Net premiums in**: actuarial cost portion of premiums — funds future death benefits
- **Investment income**: full earn rate applied to prior year's reserves (grows the pool)
- **Claims out**: death benefits paid to beneficiaries, depleting the pool

Note: Single-pay annuity premiums have no loading (premium = face value), so the full amount goes to reserves.

### Gross Income
Total income for 1120-L tax purposes. Sum of investment income and premium income.

```
grossIncome = investmentIncome + totalPremiums
```

### `[DETAIL]` Inv. Income (Investment Income)
Total investment return on the reserve pool. The full earn rate applied to prior year's reserves.

```
investmentIncome = priorYearReserves * earnRate%
```

Default earn rate: 4.5%. This is the primary source of TJM Life cash earnings — the larger the reserve pool, the more investment income it generates.

### `[DETAIL]` Premiums
Total **gross** premium income collected that year. Includes single-pay annuity premiums (face value paid upfront in year of issue) and multi-pay WL + Graded premiums from all active vintages still within their payment term. Used in 1120-L gross income calculation.

### `[DETAIL]` Loading (Premium Loading)
The markup above actuarial cost in multi-pay premiums. This is TJM Life revenue — it funds commissions and profit. Only multi-pay WL and Graded policies have loading; single-pay annuity has none (premium = face value).

```
grossPremium = survivingFace * monthlyRate * 12
netPremium   = survivingFace / paymentTerm
loading      = grossPremium - netPremium
```

For a 10-pay WL policy at age 50: monthly rate = 0.01404, so annual gross = 16.85% of face, annual net = 10% of face (1/10), loading = 6.85% of face per year (~41% of the gross premium is loading).

Loading is what makes TJM Life profitable from near day one. Without recognizing loading, commissions would be charged against investment income (which is near zero in early years), creating artificial losses.

### Deductions
Total 1120-L deductions that offset gross income for tax purposes.

```
totalDeductions = section807 + claimsPaid + commissions + adminCosts + premiumTax
```

### `[DETAIL]` Section 807
Federal tax deduction for life insurance companies when reserves increase. The full reserve increase amount is the deduction (not a tax credit — a deduction from taxable income).

```
section807 = max(0, reserveChange)
```

Where `reserveChange = currentReserves - priorYearReserves`. This is typically the largest deduction and is what shelters most of TJM Life's income from federal tax during growth years. Only applies when reserves increased.

### `[DETAIL]` Claims
Total death benefits paid out across all product types for all vintages where deaths occurred that year.

```
claimsPaid = wlClaims + annuityClaims + gradedClaims
```

- **WL claims**: face value at 100%
- **Annuity claims**: face value * (1 + guaranteedRate%)^yearsElapsed (grows over time)
- **Graded claims**: face value * graded benefit factor (reduced in early years, full after vesting)

Claims are driven by the blended mortality curve (SSA 2021 data weighted by age distribution). Claims flow through reserves — they are NOT part of TJM Life cash earnings.

### `[DETAIL]` Commissions
Agent compensation paid on new and renewal production. Calculated per-vintage with year-specific rates:

- **Year 1**: New WL + Graded production at blended Yr1 rate, annuity at single-pay rate, trust at 3.75% flat
- **Year 2**: Prior year's WL + Graded vintage at Yr2 renewal rate
- **Year 3**: Two-year-old WL + Graded vintage at Yr3 renewal rate
- **Chargeback**: All commissions reduced by chargeback rate (default 5%)

```
commissions = (newWL + newGraded) * commYr1
            + newAnnuity * singlePayCommRate
            + newTrust * 0.0375
            + priorVintageWL+Graded * commYr2
            + olderVintageWL+Graded * commYr3

commissions *= (1 - chargebackRate%)
```

Commission rates come from the AGENT_RATES tables, weighted by age band and payment term mix.

### `[DETAIL]` Admin
Fixed administrative overhead that grows with inflation, independent of reserve size.

```
adminCosts = baseAdminCost * (1 + adminGrowthRate%)^(year - 1)
```

Default: $200,000 base growing at 3%/year. Produces $200K in year 1, ~$361K by year 20. This is more realistic for a small life insurance company than a percentage of reserves, which produces unrealistically large admin costs as reserves grow into the hundreds of millions.

### `[DETAIL]` Prem. Tax (Premium Tax)
State premium tax on multi-pay WL + Graded premiums only (not on single-pay annuity).

```
premiumTax = multiPayPremiums * premiumTaxRate%
```

Default: 0.875%.

### Taxable Inc. (Taxable Income)
The 1120-L tax base: gross income minus all deductions.

```
taxableIncome = grossIncome - totalDeductions
```

**Negative taxable income does not mean TJM Life is losing money.** It means the Section 807 reserve deduction from new business growth fully shelters investment income, resulting in zero tax owed. Negative taxable income may generate net operating loss (NOL) carryforwards that shelter future tax liability. TJM Life's cash position is fine — premiums are invested, reserves are growing, and the "loss" is purely a tax calculation.

### Tax Paid
Federal income tax owed. Zero when taxable income is negative.

```
taxPaid = max(0, taxableIncome) * corporateTaxRate%
```

Default corporate tax rate: 21%.

### Tax Rate (Effective Tax Rate on Gross Income)
Tax paid as a percentage of total gross income — shows how much of TJM Life's income actually goes to federal tax after the Section 807 reserve deduction shelters most of it.

```
taxRate = taxPaid / grossIncome * 100
```

This rate is always ≤ 21% (the statutory corporate rate). During growth years, it's typically well under 21% because the §807 deduction (driven by reserve growth from new premiums) offsets most gross income. Investment income cancels out of the tax equation entirely during growth — it appears in gross income and equally in §807 (via reserve change). What's actually taxed is premium loading minus operating costs, divided here by the full gross income base.

### TJM Life Net
The actual earnings TJM Life retains — investment income plus premium loading minus operating costs and tax. **Does not include net premiums or claims** — those are reserve flows, not earnings.

```
tjmNet = investmentIncome + premiumLoading - commissions - adminCosts - premiumTax - taxPaid
```

- **Premium loading** funds commissions and profit in early years (when reserves and investment income are small)
- **Investment income** becomes the dominant revenue source in later years as the reserve pool grows
- When taxable income is negative, `taxPaid` is $0 (§807 shelters income)
- When taxable income is positive: `tjmNet = taxableIncome × (1 - 21%)`
- **Near breakeven in year 1**: loading roughly covers commissions; slight deficit from admin costs
- **Grows steadily**: as reserves compound, investment income increasingly exceeds operating costs

### Cemetery Net
After-tax profit from cemetery property and marker sales. Recognized immediately at time of sale — no mortality, no reserves, no compounding.

```
cemeteryGrossProfit   = cemeteryFace * cemeteryMargin%
cemeteryPerpCare      = cemeteryFace * perpCareRate%
cemeteryCommission    = (cemeteryFace - cemeteryPerpCare) * cemeteryCommRate%
cemeteryPreTax        = cemeteryGrossProfit - cemeteryPerpCare - cemeteryCommission
cemeteryTax           = cemeteryPreTax * passThroughTaxRate%
cemeteryNet           = cemeteryPreTax - cemeteryTax
```

- **Cemetery margin** (default 50%): Gross profit percentage (sale price minus COGS). Perpetual care and commissions are additional costs subtracted from this margin.
- **Perpetual care** (default 10%): Required by Texas law, goes into irrevocable trust, not revenue. Applied to gross sales.
- **Cemetery commission** (default 7.5%): Agent commission on after-perpetual-care sales (gross sales minus perp care).
- **Pass-through tax** (default 37%): FH entity tax rate

Cemetery provides steady cash flow from day one. It does not compound like insurance.

### FH Net (Funeral Home Net)
After-tax funeral home income from insurance-related activities (excludes cemetery, which is separate).

```
fhNet = claimsServicingProfit + financeChargeIncome - fhTax
```

Components:

- **Claims Servicing Profit**: Margin earned when servicing claimed policies. When a policyholder dies, the funeral home delivers services at cost and keeps the margin. For annuity products, the death benefit grows at the guaranteed rate (`face * (1 + guaranteedRate%)^years`), so larger payouts over time mean larger servicing profit — this is how guaranteed growth becomes FH income.
  ```
  claimsServicingProfit = totalDeathFace * (1 - serviceDeliveryCost%)
  ```
  Default service delivery cost: 75% (so 25% margin). `totalDeathFace` includes the guaranteed-rate-enhanced annuity death benefits.

- **Finance Charge Income**: Interest income on trust contracts during the payment term.
  ```
  financeChargeIncome = trustInForce * financeChargeRate%
  ```
  Only applies to Trust + Interest contracts (not WL or Graded — their premiums are already loaded). Default: 7%.

- **FH Tax**: Pass-through entity tax on finance charge income.
  ```
  fhTax = financeChargeIncome * passThroughTaxRate%
  ```
  Note: Claims servicing profit is not included in the FH tax base.

### Combined
Total enterprise net income for the year — all three business lines.

```
combined = tjmNet + cemeteryNet + fhNet
```

This is the bottom line: how much the entire enterprise (TJM Life + Cemetery + Funeral Home) earned in a given year after all costs and taxes.

---

## 1120-L Tax Mechanics

The TJM Life tax calculation follows IRS Form 1120-L (U.S. Life Insurance Company Income Tax Return):

```
Gross Income        = Investment Income + Premium Income
                    = (priorReserves * earnRate%) + totalPremiums

Deductions          = Section 807 Reserve Increase
                    + Claims Paid (death benefits)
                    + Commissions
                    + Administrative Costs
                    + Premium Tax

Taxable Income      = Gross Income - Deductions

Tax Paid            = max(0, Taxable Income) * 21%
```

**Why taxable income is often negative during growth years:**

During rapid growth, the Section 807 deduction (equal to the reserve increase) is very large because new premiums flowing in exceed claims going out. Combined with claims and operating costs, total deductions exceed gross income. This is normal and expected — it means TJM Life owes no federal tax and may generate NOL carryforwards.

**Key insight:** Negative taxable income does not mean the business is unprofitable. TJM Life's actual earnings (investment income + premium loading - operating costs) are positive or near breakeven from year one. The 1120-L structure simply means the government subsidizes reserve growth through the Section 807 deduction.

## Premium Loading

Multi-pay WL and Graded policies charge customers significantly more than the face value. The excess is **premium loading** — it funds commissions, administration, and profit.

```
Gross premium = face × monthlyRate × 12     (what the customer pays per year)
Net premium   = face / paymentTerm           (actuarial cost per year, approximate)
Loading       = gross premium - net premium  (TJM Life revenue)
```

**Example:** 10-pay WL, age 50, $10,000 face:
- Annual gross premium: $10,000 × 0.01404 × 12 = $1,685
- Annual net premium: $10,000 / 10 = $1,000
- Annual loading: $685 (41% of gross premium)
- Total loading over 10 years: $6,850

Single-pay annuity has **no loading** — the customer pays face value exactly, so 100% goes to reserves.

Only net premiums flow into reserves. Loading stays with TJM Life as operating revenue. This correctly reflects that commissions are funded by premium loading, not by investment income.

**Sanity check with 2023 actuals:**

| Line | Amount |
|---|---|
| Investment income | $721,216 |
| + Total premiums | $1,237,204 |
| **= Gross income** | **$1,958,420** |
| - Section 807 reserve increase | ($500,000) |
| - Claims paid | ($1,266,377) |
| - Operating costs | (~$133,238) |
| **= Taxable income** | **~$58,805** |
| x 21% corporate rate | |
| **= Tax paid** | **~$12,349** |
| Tax rate on gross income | **0.6%** |

---

## Key Assumptions & Defaults

| Assumption | Default | Description |
|---|---|---|
| Initial Production | $20,000,000 | Total annual face value (cemetery + insurance) |
| Growth Rate | 3% | Annual production growth |
| Cemetery Mix | 50% | % of production that is cemetery |
| Perpetual Care | 10% | TX law requirement, irrevocable trust |
| Cemetery Margin | 50% | Blended gross margin after COGS |
| Cemetery Commission | 7.5% | Agent commission on cemetery sales |
| Earn Rate | 4.5% | Investment yield on reserves |
| Premium Tax | 0.875% | State tax on multi-pay premiums |
| Corporate Tax | 21% | Federal rate for 1120-L calculation |
| Base Admin Cost | $200,000 | Fixed annual admin cost (year 1) |
| Admin Growth Rate | 3% | Annual inflation on admin cost |
| Chargeback Rate | 5% | Commission clawback rate |
| Service Delivery Cost | 75% | FH cost to service a claim (25% margin) |
| Finance Charge Rate | 7% | Interest on trust contracts |
| Guaranteed Rate | 2% | Growth rate on annuity death benefits |
| Pass-Through Tax | 37% | FH/cemetery entity tax rate |

## Mortality
Death rates are derived from SSA 2021 period life tables, blended by the age distribution mix (default: 40-60: 20%, 61-65: 25%, 66-70: 30%, 71-75: 15%, 76-80: 7%, 81-85: 3%). The `buildDeathDistribution` function generates per-year death fractions from a cohort of 10,000 lives at each age midpoint.

## Product Mix (Insurance Portion Only)
| Product | Default | Payment | Premium Structure |
|---|---|---|---|
| Multi-Pay WL | 35% | 3/5/10/20-pay | Monthly premiums with loaded rates |
| Single-Pay Annuity | 35% | Single | Face value paid upfront |
| Graded Death Benefit | 20% | 3/5/10/20-pay | Monthly premiums, reduced benefit early years |
| Trust + Interest | 10% | Multi-pay | Finance charges apply during payment term |

## Payment Term Mix (WL/Graded)
| Term | Default |
|---|---|
| 3-Pay | 15% |
| 5-Pay | 35% |
| 10-Pay | 35% |
| 20-Pay | 15% |
