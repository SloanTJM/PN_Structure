# Cemetery P&L Breakdown — Year 1 (2027)

## The Question
On $10M in cemetery sales (50% of $20M total production), why is the cemetery net only ~$2.0M?

## Inputs (defaults)

| Parameter | Value |
|---|---|
| Total New Production | $20,000,000 |
| Cemetery Mix | 50% |
| **Cemetery Face** | **$10,000,000** |
| Cemetery Margin | 60% |
| Perpetual Care Rate | 15% (hardcoded) |
| Pass-Through Tax Rate | 37% |

---

## Step-by-Step Waterfall

### 1. Gross Profit
Cemetery margin is 60% — meaning 40% is cost of goods (land, vaults, markers, opening/closing, etc.).

```
$10,000,000 × 60% = $6,000,000 gross profit
$10,000,000 × 40% = $4,000,000 COGS
```

**$4M disappears immediately to COGS.** This is the single biggest cost.

---

### 2. Perpetual Care Obligation (15%)
Texas law requires cemeteries to set aside a percentage of every sale into a perpetual care trust fund. This money is locked — it earns interest for ongoing grounds maintenance but the principal can never be touched.

```
$10,000,000 × 15% = $1,500,000 perpetual care
```

**Another $1.5M is locked away permanently.**

---

### 3. Sales Compensation (Cemetery's Share)
The cemetery bears 50% of total sales team compensation (proportional to its share of production). Here's exactly what the sales team costs:

#### Total Sales Team Comp Breakdown

**Closers (10 people × $2M each)**
| Component | Per Closer | × 10 Closers |
|---|---|---|
| Base Wage ($13.50/hr × 40hrs × 52wks) | $28,080 | $280,800 |
| Net Commission (after 5% chargebacks) | $106,631 | $1,066,310 |
| Monthly Bonuses ($850/mo × 12) | $10,200 | $102,000 |
| Annual Bonus ($2M tier) | $9,000 | $90,000 |
| **Closer Subtotal** | **$153,911** | **$1,539,110** |

Commission detail: Each closer handles $2M. At 80% setter-sourced / 80% closer split:
- Self-sourced (20%): 100% of commission on $400K
- Shared (80%): 80% of commission on $1,600,000
- Blended effective rate: ~5.6% after chargebacks

**Setters (4 people supporting $6M each)**
| Component | Per Setter | × 4 Setters |
|---|---|---|
| Base Wage ($16.00/hr × 40hrs × 52wks) | $33,280 | $133,120 |
| Net Commission (20% split on sourced deals) | $60,932 | $243,728 |
| Monthly/Annual Bonuses | $0 | $0 |
| **Setter Subtotal** | **$94,212** | **$376,848** |

Each setter sources 80% of $6M = $4.8M. Gets 20% of commission on that volume.

**Aftercare Specialist (1 person)**
| Component | Amount |
|---|---|
| Base Wage ($16.00/hr × 40hrs × 52wks) | $33,280 |
| Effective Net Commission (60% specialist share on 65% aftercare-sourced) | $46,968 |
| Monthly Bonuses ($100/mo × 12) | $1,200 |
| Annual Bonus ($1M tier) | $2,250 |
| **Aftercare Subtotal** | **$83,698** |

**Sales Leader (1 person)**
| Component | Amount |
|---|---|
| Base Salary | $125,982 |
| Monthly Override (1% of $21M team volume) | $210,000 |
| Semi-Annual Bonus (tiered on $10.5M/period) | $305,000 |
| **Leader Subtotal** | **$640,982** |

Team volume = 10 closers × $2M + 1 aftercare × $1M = $21M.
The leader's semi-annual bonus is large because $10.5M/period hits the upper tiers (2.25-2.50% marginal rates).

#### Total & Cemetery's Share

| Role | Total Cost |
|---|---|
| Closers (10) | $1,539,110 |
| Setters (4) | $376,848 |
| Aftercare (1) | $83,698 |
| Leader (1) | $640,982 |
| **Total Sales Comp** | **$2,640,639** |
| **Cemetery Share (50%)** | **$1,320,319** |

---

### 4. Pre-Tax Income

```
  Gross Profit:         $6,000,000
- Perpetual Care:      -$1,500,000
- Comp (50% share):    -$1,320,319
= Pre-Tax Income:       $3,179,681
```

---

### 5. Tax (37% Pass-Through)
Cemetery is a pass-through entity taxed at the owner's personal rate.

```
$3,179,681 × 37% = $1,176,482 tax
```

---

### 6. Cemetery Net Income

```
$3,179,681 - $1,176,482 = $2,003,199  (~$2.0M)
```

---

## Visual Waterfall: Where Does $10M Go?

```
$10.0M  Cemetery Sales
 -$4.0M  COGS (40%)                    ████████████████████
 -$1.5M  Perpetual Care (15%)          ███████▌
 -$1.3M  Comp (cemetery's 50% share)   ██████▌
 -$1.2M  Tax (37% of pre-tax)          █████▉
 ────────────────────────────────────────
 =$2.0M  NET INCOME                    ██████████
```

| Category | Amount | % of Sales |
|---|---|---|
| COGS | $4,000,000 | 40.0% |
| Perpetual Care | $1,500,000 | 15.0% |
| Sales Comp | $1,320,319 | 13.2% |
| Tax | $1,176,482 | 11.8% |
| **Net Income** | **$2,003,199** | **20.0%** |
| **Total** | **$10,000,000** | **100%** |

---

## Why Year 1 (2027) May Show MORE Than Later Years

You may notice that cemetery net income is higher in Year 1 than in Years 2-3. This happens because of **headcount step-ups** and **renewal commissions**:

### 1. Headcount Jumps Are Discontinuous
Closers are hired at 1 per $2M (rounded up). At 3% annual growth:

| Year | Production | Closers | Setters | Total HC |
|---|---|---|---|---|
| 2027 | $20.0M | 10 | 4 | 16 |
| 2028 | $20.6M | **11** | 4 | 17 |
| 2029 | $21.2M | **11** | 4 | 17 |
| 2030 | $21.9M | **11** | 4 | 17 |

Year 2 jumps from 10 to 11 closers ($20.6M / $2M = 10.3, rounds up to 11). That 11th closer costs ~$154K but only adds $600K in production. The comp-to-revenue ratio worsens.

### 2. Renewal Commissions Kick In (Years 2-3)
Year 1 only pays first-year commission rates. Year 2 adds renewal commissions (Year 2 rates on Year 1 policies). Year 3 adds Year 3 renewal rates. This increases per-closer commission costs without increasing production.

### 3. Leader Override Grows Proportionally
The leader's 1% override grows with team volume. As closers are added, team volume jumps → override jumps → comp jumps.

### 4. Semi-Annual Bonus Tiers Are Progressive
Higher team volume pushes into higher marginal bonus tiers (2.25%, 2.50%), so the leader's bonus grows faster than production.

**Net effect**: Year 1 has the most efficient headcount (exactly 10 closers for $20M, no slack). Year 2+ pays more per dollar of production due to rounding up headcount and renewal commissions.

---

## Key Takeaway

On $10M in cemetery sales, the cemetery entity keeps **$2.0M (20% net margin)**. The biggest drags are:
1. **COGS (40%)** — the physical cost of cemetery products and services
2. **Perpetual Care (15%)** — legally mandated, untouchable trust fund
3. **Comp (13.2%)** — cemetery's proportional share of the sales team
4. **Tax (11.8%)** — pass-through at 37%

The 60% gross margin sounds great, but after perpetual care, comp, and taxes, only 20 cents of every cemetery dollar reaches the bottom line.
