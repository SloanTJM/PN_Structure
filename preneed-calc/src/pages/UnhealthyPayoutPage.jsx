import { useState, useMemo } from 'react';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, LabelList,
} from 'recharts';
import { calculateAllUnhealthy, getLifeExpectancy, getGradedBenefitFactor, getGradedScaledRate, getGradedMaxAgeForTerm, buildDeathDistribution, runMortalitySimulation } from '../calculations';
import { fmt, fmtD, fmtPct, fmtLarge, fmtRate } from '../utils/formatters';
import InputGroup from '../components/InputGroup';
import NumberInput from '../components/NumberInput';
import RangeWithValue from '../components/RangeWithValue';
import Chevron from '../components/Chevron';

const UNHEALTHY_PRODUCTS = ['Graded Death Benefit', 'Financed Annuity (Actual)', 'Trust + Finance Charges'];
const TERM_OPTIONS = [3, 5, 10, 20];
const POLICY_COUNT = 1000;

export default function UnhealthyPayoutPage({
  faceValue, setFaceValue,
  customerAge, setCustomerAge,
  paymentTermYears, setPaymentTermYears,
  earnRate, setEarnRate,
  yearsUntilClaim, setYearsUntilClaim,
  financeChargeRate, setFinanceChargeRate,
  tjmTaxRate, setTjmTaxRate,
  trustTaxRate, setTrustTaxRate,
  passThroughTaxRate, setPassThroughTaxRate,
  dividendExitTaxRate, setDividendExitTaxRate,
  guaranteedRate, setGuaranteedRate,
  trustEarnRate, setTrustEarnRate,
}) {
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [mortalityMultiplier, setMortalityMultiplier] = useState(1.5);
  const [returnOfPremium, setReturnOfPremium] = useState(true);
  const [gradedCommissionRate, setGradedCommissionRate] = useState(7.5);

  function resetDefaults() {
    setFaceValue(10000);
    setCustomerAge(65);
    setPaymentTermYears(5);
    setEarnRate(4.5);
    setYearsUntilClaim(10);
    setFinanceChargeRate(7);
    setTjmTaxRate(5);
    setTrustTaxRate(10);
    setPassThroughTaxRate(37);
    setDividendExitTaxRate(20);
    setGuaranteedRate(2);
    setTrustEarnRate(4.5);
    setMortalityMultiplier(1.5);
    setReturnOfPremium(true);
    setGradedCommissionRate(7.5);
  }

  const inputs = useMemo(
    () => ({
      faceValue, customerAge, paymentTermYears,
      earnRate: earnRate / 100, yearsUntilClaim,
      financeChargeRate: financeChargeRate / 100,
      tjmTaxRate: tjmTaxRate / 100, trustTaxRate: trustTaxRate / 100,
      passThroughTaxRate: passThroughTaxRate / 100,
      dividendExitTaxRate: dividendExitTaxRate / 100,
      guaranteedRate: guaranteedRate / 100,
      trustEarnRate: trustEarnRate / 100,
      returnOfPremium,
      gradedCommissionRate: gradedCommissionRate / 100,
    }),
    [faceValue, customerAge, paymentTermYears, earnRate, yearsUntilClaim,
      financeChargeRate, tjmTaxRate, trustTaxRate, passThroughTaxRate,
      dividendExitTaxRate, guaranteedRate, trustEarnRate,
      returnOfPremium, gradedCommissionRate]
  );

  const results = useMemo(() => calculateAllUnhealthy(inputs), [inputs]);

  const gradedRate = getGradedScaledRate(customerAge, paymentTermYears);
  const gradedMaxAge = getGradedMaxAgeForTerm(paymentTermYears);
  const gradedFactor = getGradedBenefitFactor(yearsUntilClaim);

  // Mortality-weighted portfolio simulation
  const deathDist = useMemo(() => buildDeathDistribution(customerAge, POLICY_COUNT, 35, mortalityMultiplier), [customerAge, mortalityMultiplier]);
  const lifeExp = getLifeExpectancy(customerAge, mortalityMultiplier);
  const mortalitySim = useMemo(() => runMortalitySimulation(inputs, deathDist, calculateAllUnhealthy), [inputs, deathDist]);

  const payMonths = paymentTermYears * 12;

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Settings Panel */}
      <section className="bg-white rounded-xl shadow-sm border border-navy-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4">
          <button onClick={() => setSettingsOpen(!settingsOpen)}
            className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity">
            <h2 className="text-lg font-semibold text-navy-800">Assumptions &amp; Inputs</h2>
            <Chevron open={settingsOpen} />
          </button>
          <button onClick={resetDefaults}
            className="text-xs font-medium text-navy-500 hover:text-teal-600 border border-navy-200 hover:border-teal-400 rounded-lg px-3 py-1.5 transition-colors">
            Reset Defaults
          </button>
        </div>
        {settingsOpen && (
          <div className="px-6 pb-6 border-t border-navy-100 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <InputGroup label="Face Value"><NumberInput value={faceValue} onChange={setFaceValue} min={1000} step={1000} prefix="$" /></InputGroup>
              <InputGroup label="Customer Age"><RangeWithValue value={customerAge} onChange={setCustomerAge} min={30} max={90} /></InputGroup>
              <InputGroup label="Payment Term (Years)">
                <select value={paymentTermYears} onChange={(e) => setPaymentTermYears(Number(e.target.value))}
                  className="rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                  {TERM_OPTIONS.map((t) => <option key={t} value={t}>{t} years</option>)}
                </select>
              </InputGroup>
              <InputGroup label="Years Until Claim">
                <RangeWithValue value={yearsUntilClaim} onChange={setYearsUntilClaim} min={1} max={30} />
                {(() => {
                  const le = getLifeExpectancy(customerAge, mortalityMultiplier);
                  const suggestion = Math.min(30, Math.round(le.remainingYears));
                  if (suggestion < 1) return <span className="text-xs text-navy-400 mt-1">Life expectancy data not applicable</span>;
                  return (
                    <span className="text-xs text-navy-400 mt-1 flex items-center gap-1.5">
                      Avg. life expectancy: ~{Math.round(le.remainingYears)} yrs from now (age {Math.round(le.expectedAge)})
                      <button type="button" onClick={() => setYearsUntilClaim(suggestion)}
                        className="text-teal-600 hover:text-teal-800 font-semibold underline underline-offset-2 cursor-pointer">Use</button>
                    </span>
                  );
                })()}
              </InputGroup>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <InputGroup label="Investment Earn Rate"><NumberInput value={earnRate} onChange={setEarnRate} min={0} max={20} step={0.1} suffix="%" /></InputGroup>
              <InputGroup label="Guaranteed Rate to FH"><NumberInput value={guaranteedRate} onChange={setGuaranteedRate} min={0} max={10} step={0.1} suffix="%" /></InputGroup>
              <InputGroup label="Finance Charge Rate (Add-on)"><NumberInput value={financeChargeRate} onChange={setFinanceChargeRate} min={0} max={30} step={0.5} suffix="%" /></InputGroup>
              <InputGroup label="TJM Life Annual Tax Rate"><NumberInput value={tjmTaxRate} onChange={setTjmTaxRate} min={0} max={50} step={0.5} suffix="%" /></InputGroup>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <InputGroup label="Trust Annual Tax Rate"><NumberInput value={trustTaxRate} onChange={setTrustTaxRate} min={0} max={50} step={0.5} suffix="%" /></InputGroup>
              <InputGroup label="Trust Investment Rate"><NumberInput value={trustEarnRate} onChange={setTrustEarnRate} min={0} max={20} step={0.1} suffix="%" /></InputGroup>
              <InputGroup label="Pass-Through / Ordinary Income Rate"><NumberInput value={passThroughTaxRate} onChange={setPassThroughTaxRate} min={0} max={50} step={0.5} suffix="%" /></InputGroup>
              <InputGroup label="Dividend Exit Tax Rate"><NumberInput value={dividendExitTaxRate} onChange={setDividendExitTaxRate} min={0} max={50} step={0.5} suffix="%" /></InputGroup>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <InputGroup label="Mortality Multiplier">
                <NumberInput value={mortalityMultiplier} onChange={setMortalityMultiplier} min={1.0} max={5.0} step={0.1} suffix="×" />
                <span className="text-xs text-navy-400 mt-1">Adjusts SSA mortality rates for substandard risk (1.0× = standard)</span>
              </InputGroup>
              <InputGroup label="Return of Premium (ROP)">
                <button type="button" onClick={() => setReturnOfPremium(!returnOfPremium)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${returnOfPremium ? 'bg-teal-500' : 'bg-navy-300'}`}>
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${returnOfPremium ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-xs text-navy-400 mt-1">During graded window (Yr 1-3), benefit = max(graded %, premiums paid)</span>
              </InputGroup>
              <InputGroup label="Graded DB Commission Rate">
                <NumberInput value={gradedCommissionRate} onChange={setGradedCommissionRate} min={0} max={20} step={0.5} suffix="%" />
                <span className="text-xs text-navy-400 mt-1">Applied to first year premiums. 2% override is added automatically.</span>
              </InputGroup>
            </div>
          </div>
        )}
      </section>

      {/* Product Cards */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-lg font-semibold text-navy-800">Unhealthy Product Comparison</h2>
          <p className="text-xs text-navy-500">Ranked by net growth after all taxes (highest first)</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {results.map((r) => {
          const isTwoPot = r.components != null;
          const isTrust = r.product === 'Trust + Finance Charges';
          const isGraded = r.product === 'Graded Death Benefit';
          const hasGuaranteed = r.guaranteedGrowth > 0;
          const rankColor = r.rank === 1 ? 'text-teal-400' : r.rank === 2 ? 'text-amber-400' : 'text-red-400';
          const exitRate = isTwoPot ? r.components.a.exitTaxRate : r.exitTaxRate;
          const potAtClaim = r.yearlyValues[yearsUntilClaim - 1];

          return (
            <div key={r.product} className="bg-white rounded-xl shadow-sm border border-navy-100 overflow-hidden flex flex-col">
              {/* Card Header */}
              <div className="bg-navy-800 text-white px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${r.rank === 1 ? 'bg-teal-500 text-navy-900' : 'bg-navy-600 text-navy-200'}`} style={r.rank === 1 ? { boxShadow: '0 0 8px 3px rgba(20,184,166,0.6), 0 0 16px 6px rgba(20,184,166,0.3)' } : undefined}>#{r.rank}</span>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm uppercase tracking-wide leading-tight">{r.product}</div>
                    <div className="text-navy-400 text-xs">Age {r.customerAge}</div>
                  </div>
                </div>
                <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-navy-700">
                  <span className="text-navy-400 text-xs uppercase tracking-wide">Net Return</span>
                  <span className={`font-bold text-lg font-mono ${rankColor}`}>{fmtPct(r.netReturnPct)}</span>
                </div>
              </div>

              <div className="px-4 py-4 space-y-4 flex-1">
                {/* Graded Benefit Notice */}
                {isGraded && (
                  <div className="rounded-lg bg-purple-50 border border-purple-200 p-3">
                    <h3 className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1">Graded Death Benefit</h3>
                    <div className="text-xs text-purple-600 space-y-0.5">
                      <p>Yr 1: 25% &bull; Yr 2: 50% &bull; Yr 3: 75% &bull; Yr 4+: 100%</p>
                      <p className="font-semibold">Current ({yearsUntilClaim}yr claim): {Math.round(r.gradedFactor * 100)}% = {fmt(r.gradedPercentBenefit)} graded benefit</p>
                      {r.ropApplied && (
                        <p className="font-semibold text-teal-700">ROP Override: {fmt(r.actualPremiumsPaid)} premiums paid &gt; {fmt(r.gradedPercentBenefit)} graded &rarr; benefit = {fmt(r.gradedFaceValue)}</p>
                      )}
                      {returnOfPremium && yearsUntilClaim <= 3 && !r.ropApplied && (
                        <p className="text-purple-500">ROP active but graded % ({fmt(r.gradedPercentBenefit)}) already exceeds premiums paid ({fmt(r.actualPremiumsPaid)})</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Customer Pays In */}
                <div>
                  <h3 className="text-xs font-semibold text-navy-500 uppercase tracking-wide mb-2">Customer Pays In</h3>
                  <p className="text-sm text-navy-800">
                    <span className="font-mono font-semibold">{fmtD(r.monthlyPayment)}</span>/mo
                    <span className="text-navy-500"> × </span>
                    {payMonths} months
                    <span className="text-navy-500"> = </span>
                    <span className="font-mono font-semibold">{fmt(r.totalPaid)}</span> total
                  </p>
                  {isTwoPot && (
                    <div className="mt-1 text-xs text-navy-500 space-y-0.5">
                      <p>&rarr; {fmt(r.components.a.amountIntoPot)} principal to {isTrust ? 'Trust' : 'TJM Life (annuity)'}</p>
                      <p>&rarr; {fmt(r.components.b.amountIntoPot)} finance charges to Funeral Home <span className="text-red-500 font-medium">(taxed annually @ {passThroughTaxRate}%)</span></p>
                    </div>
                  )}
                </div>

                {/* Growth */}
                <div>
                  <h3 className="text-xs font-semibold text-navy-500 uppercase tracking-wide mb-2">Growth</h3>
                  {!isTwoPot ? (
                    <div className="flex gap-8 text-sm">
                      {yearsUntilClaim >= 5 && <div><span className="text-navy-500">Acct. @ Yr 5:</span><span className="font-mono font-semibold text-navy-800">{fmt(r.yearlyValues[4])}</span></div>}
                      <div><span className="text-navy-500">Acct. @ Yr {yearsUntilClaim}:</span><span className="font-mono font-semibold text-navy-800">{fmt(potAtClaim)}</span></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-y-1 text-sm">
                      {yearsUntilClaim >= 5 && (
                        <>
                          <div><span className="text-navy-500">{r.detail.potALabel.split(' ')[0]} Acct. @ Yr 5:</span><span className="font-mono text-navy-800">{fmt(r.detail.potA.yearDetails[4]?.potValue)}</span></div>
                          <div><span className="text-navy-500">FC Acct. @ Yr 5:</span><span className="font-mono text-navy-800">{fmt(r.detail.potB.yearDetails[4]?.potValue)}</span></div>
                        </>
                      )}
                      <div><span className="text-navy-500">{r.detail.potALabel.split(' ')[0]} Acct. @ Yr {yearsUntilClaim}:</span><span className="font-mono text-navy-800">{fmt(r.detail.potA.finalPot)}</span></div>
                      <div><span className="text-navy-500">FC Acct. @ Yr {yearsUntilClaim}:</span><span className="font-mono text-navy-800">{fmt(r.detail.potB.finalPot)}</span></div>
                    </div>
                  )}
                </div>

                {/* Claim Settlement */}
                <div>
                  <h3 className="text-xs font-semibold text-navy-500 uppercase tracking-wide mb-2">Claim Settlement</h3>
                  <div>
                    <div className="flex justify-between text-sm py-0.5">
                      <span className="text-navy-600">{isTwoPot ? 'Combined Value' : 'Acct.'} at Claim</span>
                      <span className="font-mono text-navy-800">{fmt(potAtClaim)}</span>
                    </div>
                    <div className="flex justify-between text-sm py-0.5">
                      <span className="text-navy-600">{isGraded ? `Death Benefit (${r.ropApplied ? 'ROP' : Math.round(r.gradedFactor * 100) + '%'})` : 'Face Value'}</span>
                      <span className="font-mono text-navy-800">-{fmt(isGraded ? r.gradedFaceValue : faceValue)}</span>
                    </div>
                    {isGraded && (
                      <>
                        <div className="flex justify-between text-sm py-0.5">
                          <span className="text-navy-600">Commission ({fmtPct(gradedCommissionRate)} of 1st yr)</span>
                          <span className="font-mono text-red-600">-{fmt(r.commission)}</span>
                        </div>
                        <div className="flex justify-between text-sm py-0.5">
                          <span className="text-navy-600">Override (2% of 1st yr)</span>
                          <span className="font-mono text-red-600">-{fmt(r.override)}</span>
                        </div>
                        <div className="flex justify-between text-sm py-0.5">
                          <span className="text-navy-600">Premium Tax (0.875%)</span>
                          <span className="font-mono text-red-600">-{fmt(r.premiumTax)}</span>
                        </div>
                      </>
                    )}
                    <div className="border-t border-navy-300 my-1"></div>
                    <div className="flex justify-between text-sm py-0.5 font-semibold">
                      <span className={isGraded && r.policyGain < 0 ? 'text-red-700' : 'text-navy-800'}>{isGraded ? 'TJM Gain/Loss' : 'Policy Gain'}</span>
                      <span className={`font-mono ${isGraded && r.policyGain < 0 ? 'text-red-600' : 'text-navy-800'}`}>{fmt(r.policyGain)}</span>
                    </div>
                  </div>

                  {/* Streams */}
                  <p className="text-xs text-navy-500 mt-4 mb-2">
                    Taxed in {isGraded ? (hasGuaranteed ? 'two' : 'one') : (hasGuaranteed ? 'three' : 'two')} stream{(isGraded && !hasGuaranteed) ? '' : 's'}:
                  </p>
                  <div className="space-y-3">
                    {/* Guaranteed Stream (blue) */}
                    {hasGuaranteed ? (
                      <div className="rounded-lg border-2 p-3" style={{ borderColor: '#3b82f6', backgroundColor: 'rgba(219,234,254,0.5)' }}>
                        <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#2563eb' }}>Funeral Home: Guaranteed Growth</h4>
                        <div className="space-y-0.5 text-sm">
                          <div className="flex justify-between"><span className="text-navy-600">Guaranteed Growth ({fmtPct(guaranteedRate)})</span><span className="font-mono">{fmt(r.guaranteedGrowth)}</span></div>
                          <div className="flex justify-between"><span className="text-navy-600">Tax @ {passThroughTaxRate}%</span><span className="font-mono text-red-600">-{fmt(r.guaranteedTax)}</span></div>
                          <div className="flex justify-between font-semibold border-t border-blue-200 pt-1 mt-1"><span>Net</span><span className="font-mono text-teal-700">{fmt(r.netGuaranteed)}</span></div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-navy-200 bg-navy-50 p-3">
                        <p className="text-xs text-navy-400 italic">No guaranteed growth — trust has no credited rate</p>
                      </div>
                    )}

                    {/* Growth Stream (green) */}
                    <div className="rounded-lg border-2 p-3" style={{ borderColor: '#22c55e', backgroundColor: 'rgba(220,252,231,0.5)' }}>
                      <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#16a34a' }}>
                        {isGraded ? 'TJM Life Stream' : isTrust ? 'Trust Growth' : 'TJM Life: Annuity Growth'}
                      </h4>
                      <div className="space-y-0.5 text-sm">
                        {isGraded ? (
                          <div className="flex justify-between"><span className="text-navy-600">Remaining Gain</span><span className="font-mono">{fmt(r.policyGain - r.guaranteedGrowth)}</span></div>
                        ) : (
                          <div className="flex justify-between"><span className="text-navy-600">{isTrust ? 'Trust' : 'Annuity'} Growth</span><span className="font-mono">{fmt(r.grossInterest - r.guaranteedGrowth)}</span></div>
                        )}
                        <div className="flex justify-between"><span className="text-navy-600">Exit Tax @ {fmtPct((exitRate || 0) * 100)}</span><span className="font-mono text-red-600">-{fmt(r.exitTax)}</span></div>
                        <div className="flex justify-between font-semibold border-t border-green-200 pt-1 mt-1"><span>Net</span><span className="font-mono text-teal-700">{fmt(isGraded ? (r.policyGain - r.guaranteedGrowth - r.exitTax) : (r.grossInterest - r.guaranteedGrowth - r.exitTax))}</span></div>
                      </div>
                    </div>

                    {/* Finance Charges Stream (amber, two-pot only) */}
                    {isTwoPot && (
                      <div className="rounded-lg border-2 p-3" style={{ borderColor: '#f59e0b', backgroundColor: 'rgba(254,243,199,0.5)' }}>
                        <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#d97706' }}>Funeral Home: Finance Charges</h4>
                        <div className="space-y-0.5 text-sm">
                          <div className="flex justify-between"><span className="text-navy-600">Finance Charge Acct.</span><span className="font-mono">{fmt(r.components.b.netGrowth)}</span></div>
                          <div className="flex justify-between"><span className="text-navy-400 text-xs italic">(already taxed @ {passThroughTaxRate}% annually)</span></div>
                          <div className="flex justify-between font-semibold border-t border-amber-200 pt-1 mt-1"><span>Net</span><span className="font-mono text-teal-700">{fmt(r.components.b.netGrowth)}</span></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Total */}
                  <div className="mt-4 pt-3 border-t-2 border-navy-200">
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-navy-800">Total Net Growth</span>
                      <span className="font-mono text-teal-700">{fmt(r.netGrowth)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold mt-0.5">
                      <span className="text-navy-800">Net Return Above Face</span>
                      <span className={`font-mono ${r.netReturnPct >= 0 ? 'text-teal-700' : 'text-red-600'}`}>{fmtPct(r.netReturnPct)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      </section>

      {/* Mortality-Weighted Portfolio Analysis */}
      <section className="bg-navy-900 rounded-xl shadow-lg overflow-hidden text-white">
        <div className="px-6 py-5 border-b border-navy-700">
          <h2 className="text-lg font-semibold">Mortality-Weighted Portfolio Analysis: {POLICY_COUNT.toLocaleString()} Policies</h2>
          <p className="text-navy-300 text-xs mt-1">Distributes {POLICY_COUNT.toLocaleString()} policyholders across different years of death using SSA mortality probabilities</p>
        </div>

        {/* Summary */}
        <div className="px-6 py-5">
          <div className="bg-teal-900/40 border border-teal-700 rounded-lg p-4 text-center max-w-md mx-auto">
            <p className="text-teal-300 text-xs uppercase tracking-wide font-semibold mb-1">Mortality-Weighted Best Product</p>
            <p className="text-2xl font-bold text-teal-400">{mortalitySim.bestProduct}</p>
            <p className="text-xl font-mono mt-1">{fmtLarge(mortalitySim.products[0]?.totalPortfolioNetGrowth)}</p>
            <p className="text-teal-400 text-xs mt-1">total portfolio net growth</p>
          </div>
        </div>
        <div className="px-6 pb-6">
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={mortalitySim.products.map((p) => ({
                  product: p.product.replace('Financed Annuity (Actual)', 'Fin. Annuity').replace('Trust + Finance Charges', 'Trust + FC'),
                  fullName: p.product,
                  netGrowth: p.totalPortfolioNetGrowth,
                  color: p.color,
                }))}
                layout="vertical"
                margin={{ top: 5, right: 80, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334e68" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}k`} stroke="#9fb3c8" tick={{ fill: '#9fb3c8' }} />
                <YAxis type="category" dataKey="product" width={150} stroke="#9fb3c8" tick={{ fill: '#c6f7e2', fontSize: 12 }} />
                <Tooltip formatter={(value) => fmt(value)} contentStyle={{ backgroundColor: '#243b53', border: '1px solid #486581', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#c6f7e2' }} labelStyle={{ color: '#fff', fontWeight: 'bold' }} />
                <Bar dataKey="netGrowth" name="Total Portfolio Net Growth" radius={[0, 6, 6, 0]}>
                  {mortalitySim.products.map((p, idx) => <Cell key={idx} fill={p.color} />)}
                  <LabelList dataKey="netGrowth" position="right" formatter={(v) => fmtLarge(v)} style={{ fill: '#c6f7e2', fontWeight: 'bold', fontSize: 13 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribution histogram */}
        <div className="px-6 pb-6">
          <h3 className="text-sm font-semibold text-navy-200 mb-3">Distribution of Per-Policy Net Growth</h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mortalitySim.histogram} margin={{ top: 10, right: 30, left: 20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334e68" />
                <XAxis dataKey="bucket" stroke="#9fb3c8" tick={{ fill: '#9fb3c8', fontSize: 10 }} angle={-35} textAnchor="end" interval={0} height={60} />
                <YAxis stroke="#9fb3c8" tick={{ fill: '#9fb3c8' }} label={{ value: 'Policies', angle: -90, position: 'insideLeft', fill: '#9fb3c8', fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#243b53', border: '1px solid #486581', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#c6f7e2' }} />
                {mortalitySim.products.map((p) => (
                  <Bar key={p.product} dataKey={p.product} fill={p.color} fillOpacity={0.7} />
                ))}
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Summary stats table */}
        <div className="px-6 pb-6">
          <h3 className="text-sm font-semibold text-navy-200 mb-3">Portfolio Summary Statistics</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-600 text-xs uppercase tracking-wider text-navy-300">
                  <th className="py-2 text-left">Metric</th>
                  {mortalitySim.products.map((p) => (
                    <th key={p.product} className="py-2 text-right" style={{ color: p.color }}>
                      {p.product.replace('Financed Annuity (Actual)', 'Fin. Annuity').replace('Trust + Finance Charges', 'Trust + FC')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-navy-700">
                  <td className="py-2 text-navy-200">Total Portfolio Net Growth</td>
                  {mortalitySim.products.map((p) => <td key={p.product} className="py-2 text-right font-mono font-bold">{fmtLarge(p.totalPortfolioNetGrowth)}</td>)}
                </tr>
                <tr className="border-b border-navy-700">
                  <td className="py-2 text-navy-200">Avg Net Growth per Policy</td>
                  {mortalitySim.products.map((p) => <td key={p.product} className="py-2 text-right font-mono">{fmt(p.avgNetGrowth)}</td>)}
                </tr>
                <tr className="border-b border-navy-700">
                  <td className="py-2 text-navy-200">Avg Net Return %</td>
                  {mortalitySim.products.map((p) => <td key={p.product} className="py-2 text-right font-mono">{fmtPct(p.avgNetReturnPct)}</td>)}
                </tr>
                <tr className="border-b border-navy-700">
                  <td className="py-2 text-navy-200">Policies w/ Positive Return</td>
                  {mortalitySim.products.map((p) => <td key={p.product} className="py-2 text-right font-mono">{p.policiesPositive.toLocaleString()} / {POLICY_COUNT.toLocaleString()}</td>)}
                </tr>
                <tr className="border-b border-navy-700">
                  <td className="py-2 text-navy-200">Policies w/ Negative Return</td>
                  {mortalitySim.products.map((p) => <td key={p.product} className="py-2 text-right font-mono">{p.policiesNegative.toLocaleString()} / {POLICY_COUNT.toLocaleString()}</td>)}
                </tr>
                <tr className="border-b border-navy-700">
                  <td className="py-2 text-navy-200">Breakeven Year</td>
                  {mortalitySim.products.map((p) => <td key={p.product} className="py-2 text-right font-mono">{p.breakevenYear ? `Year ${p.breakevenYear}` : '\u2014'}</td>)}
                </tr>
                <tr className="border-b border-navy-700">
                  <td className="py-2 text-navy-200">Worst Case (Year 1 Death)</td>
                  {mortalitySim.products.map((p) => <td key={p.product} className="py-2 text-right font-mono">{fmt(p.worstCase)}</td>)}
                </tr>
                <tr className="border-b border-navy-700">
                  <td className="py-2 text-navy-200">Best Case (Max Survival)</td>
                  {mortalitySim.products.map((p) => <td key={p.product} className="py-2 text-right font-mono">{fmt(p.bestCase)}</td>)}
                </tr>
                <tr className="border-b border-navy-700">
                  <td className="py-2 text-navy-200">vs. Best Product</td>
                  {mortalitySim.products.map((p, i) => (
                    <td key={p.product} className="py-2 text-right font-mono font-bold">
                      {i === 0 ? <span className="text-teal-400">BEST</span> : <span className="text-red-400">{fmt(p.diffFromBest)}</span>}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-navy-600 bg-navy-800/50">
                  <td className="py-2 text-amber-300 font-medium">Total Family Shortfall</td>
                  {mortalitySim.products.map((p) => (
                    <td key={p.product} className="py-2 text-right font-mono">
                      {p.totalFamilyShortfall === 0 ? <span className="text-teal-400">$0</span> : <span className="text-amber-300">{fmtLarge(p.totalFamilyShortfall)}</span>}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Mortality distribution */}
        <div className="px-6 pb-6">
          <h3 className="text-sm font-semibold text-navy-200 mb-3">Mortality Distribution (SSA 2021 Life Table)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-xs text-navy-300 space-y-2">
              <p><span className="text-navy-100 font-medium">Source:</span> SSA 2021 Period Life Table (combined sexes) × {mortalityMultiplier.toFixed(1)}</p>
              <p><span className="text-navy-100 font-medium">Starting Age:</span> {customerAge}</p>
              <p><span className="text-navy-100 font-medium">Life Expectancy:</span> {lifeExp.expectedAge.toFixed(1)} years old ({lifeExp.remainingYears.toFixed(1)} remaining)</p>
              <p><span className="text-navy-100 font-medium">Simulation Window:</span> {deathDist.capYear} years (to age {customerAge + deathDist.capYear})</p>
              <div className="mt-2">
                <p className="text-navy-100 font-medium mb-1">Deaths by 5-Year Band:</p>
                <div className="space-y-0.5">
                  {deathDist.deathsByBand.map((b) => (
                    <div key={b.label} className="flex justify-between">
                      <span>{b.label}</span>
                      <span className="font-mono">{b.deaths.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deathDist.deaths} margin={{ top: 5, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334e68" />
                  <XAxis dataKey="year" stroke="#9fb3c8" tick={{ fill: '#9fb3c8', fontSize: 10 }} label={{ value: 'Year', position: 'insideBottom', offset: -10, fill: '#9fb3c8', fontSize: 11 }} />
                  <YAxis stroke="#9fb3c8" tick={{ fill: '#9fb3c8', fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#243b53', border: '1px solid #486581', borderRadius: '8px', color: '#fff' }} />
                  <Bar dataKey="deaths" fill="#f59e0b" fillOpacity={0.8} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Key insight */}
        <div className="px-6 pb-6">
          <div className="bg-navy-800 rounded-lg p-5 border border-navy-600">
            <h3 className="text-amber-400 font-semibold text-sm mb-3">Key Insight: Product Comparison for Unhealthy Customers</h3>
            <div className="text-xs text-navy-200 space-y-3 leading-relaxed">
              <p>
                <span className="font-semibold text-purple-400">Graded Death Benefit:</span>{' '}
                Functions like Multi-Pay Whole Life but with a graded benefit schedule (25%/50%/75%/100% over 4 years). Higher premium rates reflect the increased mortality risk. With Return of Premium (ROP) enabled, the death benefit during years 1-3 is the greater of the graded percentage or total premiums paid to date, protecting families from receiving less than they paid in. Acquisition costs (commission, override, premium tax) are included in TJM's gain/loss calculation.
              </p>
              <p>
                <span className="font-semibold text-blue-400">Financed Annuity:</span>{' '}
                The annuity principal compounds at TJM Life's investment rate with a lower annual tax rate, while finance charges are taxed at the pass-through rate at the funeral home. The annuity also benefits from a guaranteed credited rate to the funeral home.
              </p>
              <p>
                <span className="font-semibold text-red-400">Trust + Finance Charges:</span>{' '}
                The trust principal is taxed at the trust tax rate annually and the pass-through rate at exit. There is no guaranteed credited rate — growth depends entirely on market performance. All three products require the family to cover any shortfall between account value and face value at time of need.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footnote */}
      <footer className="text-center text-xs text-navy-400 pb-8 px-4">
        <p>This tool is for internal comparison purposes only. Consult with your actuary and tax advisor before making product decisions. Tax rates are approximations.</p>
      </footer>
    </main>
  );
}
