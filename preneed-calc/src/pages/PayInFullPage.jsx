import { useState, useMemo } from 'react';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LabelList,
} from 'recharts';
import { calculateAllPayInFull, getLifeExpectancy, buildDeathDistribution, runMortalitySimulation } from '../calculations';
import { fmt, fmtPct, fmtLarge } from '../utils/formatters';
import InputGroup from '../components/InputGroup';
import NumberInput from '../components/NumberInput';
import RangeWithValue from '../components/RangeWithValue';
import Chevron from '../components/Chevron';

const POLICY_COUNT = 1000;

export default function PayInFullPage({
  faceValue, setFaceValue,
  customerAge, setCustomerAge,
  earnRate, setEarnRate,
  yearsUntilClaim, setYearsUntilClaim,
  tjmTaxRate, setTjmTaxRate,
  trustTaxRate, setTrustTaxRate,
  passThroughTaxRate, setPassThroughTaxRate,
  dividendExitTaxRate, setDividendExitTaxRate,
  guaranteedRate, setGuaranteedRate,
  trustEarnRate, setTrustEarnRate,
}) {
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [dacOpen, setDacOpen] = useState(false);
  const [premiumTaxRate, setPremiumTaxRate] = useState(0.875);

  function resetDefaults() {
    setFaceValue(10000);
    setCustomerAge(65);
    setEarnRate(4.5);
    setYearsUntilClaim(10);
    setTjmTaxRate(5);
    setTrustTaxRate(10);
    setPassThroughTaxRate(37);
    setDividendExitTaxRate(20);
    setGuaranteedRate(2);
    setTrustEarnRate(4.5);
    setPremiumTaxRate(0.875);
  }

  const inputs = useMemo(
    () => ({
      faceValue, customerAge,
      earnRate: earnRate / 100, yearsUntilClaim,
      tjmTaxRate: tjmTaxRate / 100, trustTaxRate: trustTaxRate / 100,
      passThroughTaxRate: passThroughTaxRate / 100,
      dividendExitTaxRate: dividendExitTaxRate / 100,
      guaranteedRate: guaranteedRate / 100,
      trustEarnRate: trustEarnRate / 100,
      premiumTaxRate: premiumTaxRate / 100,
    }),
    [faceValue, customerAge, earnRate, yearsUntilClaim,
      tjmTaxRate, trustTaxRate, passThroughTaxRate,
      dividendExitTaxRate, guaranteedRate, trustEarnRate, premiumTaxRate]
  );

  const results = useMemo(() => calculateAllPayInFull(inputs), [inputs]);

  // Mortality-weighted portfolio simulation
  const deathDist = useMemo(() => buildDeathDistribution(customerAge, POLICY_COUNT, 35), [customerAge]);
  const lifeExp = getLifeExpectancy(customerAge);
  const mortalitySim = useMemo(() => runMortalitySimulation(inputs, deathDist, calculateAllPayInFull), [inputs, deathDist]);

  // Dynamic insight text
  const annuitySim = mortalitySim.products.find((p) => p.product === 'Single-Pay Annuity');
  const trustSim = mortalitySim.products.find((p) => p.product === 'Single-Pay Trust');
  const wlSim = mortalitySim.products.find((p) => p.product === 'Single-Pay Whole Life');
  const annuityVsTrustDollar = annuitySim && trustSim ? annuitySim.totalPortfolioNetGrowth - trustSim.totalPortfolioNetGrowth : 0;
  const annuityVsWlDollar = annuitySim && wlSim ? annuitySim.totalPortfolioNetGrowth - wlSim.totalPortfolioNetGrowth : 0;

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
              <InputGroup label="Years Until Claim">
                <RangeWithValue value={yearsUntilClaim} onChange={setYearsUntilClaim} min={1} max={30} />
                {(() => {
                  const le = getLifeExpectancy(customerAge);
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
              <InputGroup label="Investment Earn Rate"><NumberInput value={earnRate} onChange={setEarnRate} min={0} max={20} step={0.1} suffix="%" /></InputGroup>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <InputGroup label="Guaranteed Rate to FH"><NumberInput value={guaranteedRate} onChange={setGuaranteedRate} min={0} max={10} step={0.1} suffix="%" /></InputGroup>
              <InputGroup label="TJM Life Annual Tax Rate"><NumberInput value={tjmTaxRate} onChange={setTjmTaxRate} min={0} max={50} step={0.5} suffix="%" /></InputGroup>
              <InputGroup label="Trust Annual Tax Rate"><NumberInput value={trustTaxRate} onChange={setTrustTaxRate} min={0} max={50} step={0.5} suffix="%" /></InputGroup>
              <InputGroup label="Trust Investment Rate"><NumberInput value={trustEarnRate} onChange={setTrustEarnRate} min={0} max={20} step={0.1} suffix="%" /></InputGroup>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <InputGroup label="Pass-Through / Ordinary Income Rate"><NumberInput value={passThroughTaxRate} onChange={setPassThroughTaxRate} min={0} max={50} step={0.5} suffix="%" /></InputGroup>
              <InputGroup label="Dividend Exit Tax Rate"><NumberInput value={dividendExitTaxRate} onChange={setDividendExitTaxRate} min={0} max={50} step={0.5} suffix="%" /></InputGroup>
              <InputGroup label="TX Premium Tax Rate (WL only)">
                <NumberInput value={premiumTaxRate} onChange={setPremiumTaxRate} min={0} max={5} step={0.125} suffix="%" />
                <span className="text-xs text-navy-400 mt-1">Texas state premium tax on whole life</span>
              </InputGroup>
            </div>
          </div>
        )}
      </section>

      {/* Product Cards */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-lg font-semibold text-navy-800">Single-Pay Product Comparison</h2>
          <p className="text-xs text-navy-500">Ranked by net growth after all taxes (highest first)</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {results.map((r) => {
          const isAnnuity = r.product === 'Single-Pay Annuity';
          const isWholeLife = r.product === 'Single-Pay Whole Life';
          const isTrust = r.product === 'Single-Pay Trust';
          const hasGuaranteed = r.guaranteedGrowth > 0;
          const rankColor = r.rank === 1 ? 'text-teal-400' : r.rank === 2 ? 'text-amber-400' : 'text-red-400';
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
                {/* Customer Pays In */}
                <div>
                  <h3 className="text-xs font-semibold text-navy-500 uppercase tracking-wide mb-2">Customer Pays In</h3>
                  <p className="text-sm text-navy-800">
                    <span className="font-mono font-semibold">{fmt(faceValue)}</span> single premium
                    <span className="text-navy-500"> (1:1 rate &mdash; premium = face value)</span>
                  </p>
                  {isWholeLife && (
                    <div className="mt-1 text-xs text-navy-500 space-y-0.5">
                      <p>&rarr; TX Premium Tax @ {premiumTaxRate}%: <span className="font-mono text-red-500">-{fmt(r.premiumTax)}</span></p>
                      <p>&rarr; Net into TJM Life: <span className="font-mono font-semibold">{fmt(r.netDeposit)}</span></p>
                    </div>
                  )}
                </div>

                {/* Growth */}
                <div>
                  <h3 className="text-xs font-semibold text-navy-500 uppercase tracking-wide mb-2">Growth</h3>
                  <div className="flex gap-8 text-sm">
                    {yearsUntilClaim >= 5 && <div><span className="text-navy-500">Acct. @ Yr 5: </span><span className="font-mono font-semibold text-navy-800">{fmt(r.yearlyValues[4])}</span></div>}
                    <div><span className="text-navy-500">Acct. @ Yr {yearsUntilClaim}: </span><span className="font-mono font-semibold text-navy-800">{fmt(potAtClaim)}</span></div>
                  </div>
                </div>

                {/* Claim Settlement */}
                <div>
                  <h3 className="text-xs font-semibold text-navy-500 uppercase tracking-wide mb-2">Claim Settlement</h3>
                  <div>
                    <div className="flex justify-between text-sm py-0.5">
                      <span className="text-navy-600">Account at Claim</span>
                      <span className="font-mono text-navy-800">{fmt(potAtClaim)}</span>
                    </div>
                    <div className="flex justify-between text-sm py-0.5">
                      <span className="text-navy-600">Face Value</span>
                      <span className="font-mono text-navy-800">-{fmt(faceValue)}</span>
                    </div>
                    <div className="border-t border-navy-300 my-1"></div>
                    <div className="flex justify-between text-sm py-0.5 font-semibold">
                      <span className="text-navy-800">Policy Gain</span>
                      <span className="font-mono text-navy-800">{fmt(r.policyGain)}</span>
                    </div>
                  </div>

                  {/* Tax Streams */}
                  <p className="text-xs text-navy-500 mt-4 mb-2">
                    Taxed in {(isAnnuity || isWholeLife) && hasGuaranteed ? 'two streams' : 'one stream'}:
                  </p>
                  <div className="space-y-3">
                    {/* Guaranteed Stream (blue) — annuity & whole life */}
                    {(isAnnuity || isWholeLife) ? (
                      hasGuaranteed ? (
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
                          <p className="text-xs text-navy-400 italic">No guaranteed growth (rate set to 0%)</p>
                        </div>
                      )
                    ) : (
                      <div className="rounded-lg border border-navy-200 bg-navy-50 p-3">
                        <p className="text-xs text-navy-400 italic">No guaranteed growth &mdash; trust has no credited rate</p>
                      </div>
                    )}

                    {/* Growth Stream (green) */}
                    <div className="rounded-lg border-2 p-3" style={{ borderColor: '#22c55e', backgroundColor: 'rgba(220,252,231,0.5)' }}>
                      <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#16a34a' }}>
                        {isWholeLife ? 'TJM Life: Whole Life Growth' : isAnnuity ? 'TJM Life: Annuity Growth' : 'Trust Growth'}
                      </h4>
                      <div className="space-y-0.5 text-sm">
                        {isWholeLife && (
                          <div className="flex justify-between"><span className="text-navy-600">Premium Tax Cost</span><span className="font-mono text-red-600">-{fmt(r.premiumTax)}</span></div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-navy-600">{isWholeLife ? 'WL' : isAnnuity ? 'Annuity' : 'Trust'} Growth</span>
                          <span className="font-mono">{fmt(r.grossInterest - r.guaranteedGrowth)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-navy-600">Exit Tax @ {fmtPct(r.exitTaxRate * 100)}</span>
                          <span className="font-mono text-red-600">-{fmt(r.exitTax)}</span>
                        </div>
                        <div className="flex justify-between font-semibold border-t border-green-200 pt-1 mt-1">
                          <span>Net</span>
                          <span className="font-mono text-teal-700">{fmt(r.grossInterest - r.guaranteedGrowth - r.exitTax - (isWholeLife ? r.premiumTax : 0))}</span>
                        </div>
                      </div>
                    </div>


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

        {/* Best Product callout */}
        <div className="px-6 py-5">
          <div className="bg-teal-900/40 border border-teal-700 rounded-lg p-4 text-center max-w-md mx-auto">
            <p className="text-teal-300 text-xs uppercase tracking-wide font-semibold mb-1">Mortality-Weighted Best Product</p>
            <p className="text-2xl font-bold text-teal-400">{mortalitySim.bestProduct}</p>
            <p className="text-xl font-mono mt-1">{fmtLarge(mortalitySim.products[0]?.totalPortfolioNetGrowth)}</p>
            <p className="text-teal-400 text-xs mt-1">total portfolio net growth</p>
          </div>
        </div>

        {/* Horizontal bar chart */}
        <div className="px-6 pb-6">
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={mortalitySim.products.map((p) => ({
                  product: p.product.replace('Single-Pay ', 'SP '),
                  fullName: p.product,
                  netGrowth: p.totalPortfolioNetGrowth,
                  color: p.color,
                }))}
                layout="vertical"
                margin={{ top: 5, right: 80, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334e68" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}k`} stroke="#9fb3c8" tick={{ fill: '#9fb3c8' }} />
                <YAxis type="category" dataKey="product" width={160} stroke="#9fb3c8" tick={{ fill: '#c6f7e2', fontSize: 12 }} />
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
                    <th key={p.product} className="py-2 text-right" style={{ color: p.color }}>{p.product.replace('Single-Pay ', 'SP ')}</th>
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
              <p><span className="text-navy-100 font-medium">Source:</span> SSA 2021 Period Life Table (combined sexes)</p>
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

        {/* Key insight callout */}
        <div className="px-6 pb-6">
          <div className="bg-navy-800 rounded-lg p-5 border border-navy-600">
            <h3 className="text-amber-400 font-semibold text-sm mb-3">Key Insight: Why Single-Pay Annuity Wins in a Vertically Integrated System</h3>
            <div className="text-xs text-navy-200 space-y-3 leading-relaxed">
              <p>
                <span className="font-semibold text-blue-400">Single-Pay Annuity</span> outperforms whole life by{' '}
                <span className="font-mono font-semibold text-teal-400">{fmtLarge(Math.abs(annuityVsWlDollar))}</span>{' '}
                and outperforms the trust by{' '}
                <span className="font-mono font-semibold text-teal-400">{fmtLarge(Math.abs(annuityVsTrustDollar))}</span>{' '}
                across the {POLICY_COUNT.toLocaleString()}-policy portfolio.
              </p>

              <p className="font-semibold text-navy-100 border-b border-navy-600 pb-1">Annuity vs. Whole Life</p>
              <p>
                <span className="font-semibold text-teal-400">1. No Premium Tax:</span>{' '}
                The annuity avoids the {premiumTaxRate}% Texas state premium tax that costs whole life {fmt(faceValue * premiumTaxRate / 100)} per policy.
                That's {fmt(faceValue * premiumTaxRate / 100 * POLICY_COUNT)} across the portfolio before compounding.
              </p>
              <p>
                <span className="font-semibold text-teal-400">2. Lower DAC Capitalization:</span>{' '}
                Annuity capitalizes 2.09% of premiums vs. 9.20% for whole life (4.4x more deferred). Less capital tied up in year-one tax timing means better cash flow.
              </p>
              <p>
                <span className="font-semibold text-teal-400">3. Zero Mortality Risk:</span>{' '}
                Annuity pays back account value only &mdash; family covers any shortfall. Whole life owes full {fmt(faceValue)} face value from day 1.
                Early deaths cost TJM Life real money on whole life ({wlSim ? wlSim.policiesNegative.toLocaleString() : '—'} policies with losses in this simulation) while annuity shows zero TJM losses.
              </p>

              <p className="font-semibold text-navy-100 border-b border-navy-600 pb-1">Annuity vs. Trust</p>
              <p>
                <span className="font-semibold text-teal-400">4. Lower Tax Drag:</span>{' '}
                The annuity compounds at {tjmTaxRate}% annual tax vs. the trust's {trustTaxRate}%.
                Lower annual tax means more capital stays invested and compounds over time.
              </p>
              <p>
                <span className="font-semibold text-teal-400">5. Favorable Exit Tax:</span>{' '}
                Annuity growth exits at {dividendExitTaxRate}% (dividend rate) vs. trust at {passThroughTaxRate}% (ordinary income).
                This {passThroughTaxRate - dividendExitTaxRate} percentage point difference preserves significantly more value at claim.
              </p>
              <p>
                <span className="font-semibold text-teal-400">6. Guaranteed Credited Rate:</span>{' '}
                The annuity credits the funeral home a guaranteed {fmtPct(guaranteedRate)} annual return on face value. The trust offers no such guarantee.
              </p>

              <p className="border-t border-navy-600 pt-2">
                <span className="font-semibold text-amber-400">Bottom line:</span>{' '}
                In a vertically integrated system where TJM Life and the funeral home are under common ownership, the single-pay annuity delivers
                the same economics as whole life with better tax treatment, no premium tax, and zero mortality risk. The trust loses on tax drag and exit rates.
                There is no reason to use single-pay whole life when you own both sides.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* DAC Explainer Note */}
      <section className="bg-white rounded-xl shadow-sm border border-navy-100 overflow-hidden">
        <button onClick={() => setDacOpen(!dacOpen)}
          className="flex items-center justify-between w-full px-6 py-4 text-left hover:opacity-80 transition-opacity">
          <h2 className="text-lg font-semibold text-navy-800">Deferred Acquisition Costs (DAC) &mdash; Educational Note</h2>
          <Chevron open={dacOpen} />
        </button>
        {dacOpen && (
          <div className="px-6 pb-6 border-t border-navy-100 pt-4">
            <div className="text-sm text-navy-700 space-y-4 leading-relaxed max-w-4xl">
              <div>
                <h3 className="font-semibold text-navy-800 mb-1">What is DAC?</h3>
                <p>
                  The IRS requires insurance companies to capitalize (defer) a portion of acquisition costs rather than deducting them immediately in year one.
                  Under IRC Section 848, a percentage of net premiums must be capitalized and amortized over a 10-year period.
                  This is a <span className="font-semibold">timing difference</span>, not a permanent cost &mdash; the total deduction is the same over 10 years.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-navy-800 mb-1">Example: $10,000 Single-Pay Annuity</h3>
                <div className="bg-navy-50 rounded-lg p-4 text-xs font-mono space-y-1">
                  <p>Premium received:           $10,000</p>
                  <p>DAC capitalization (2.09%):  $209</p>
                  <p>Annual amortization:         ~$20.90/yr over 10 years</p>
                  <p>Year-one deduction lost:     $209 - $20.90 = $188.10</p>
                  <p>Extra tax at 21% corp rate:  $188.10 x 21% = ~$39.50</p>
                </div>
                <p className="text-xs text-navy-500 mt-2">
                  Note: The $39.50 is a timing cost, not a permanent cost. The deduction is recovered over the remaining 9 years.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-navy-800 mb-1">Why Annuity Beats Whole Life on DAC</h3>
                <p>
                  Annuity contracts capitalize only <span className="font-semibold">2.09%</span> of premiums under IRC 848,
                  while whole life insurance capitalizes <span className="font-semibold">9.20%</span> &mdash; that's <span className="font-semibold">4.4x more deferred</span> for whole life.
                  On a $10,000 premium: annuity defers $209 vs. whole life deferring $920.
                  The year-one tax impact difference at a 21% corporate rate is approximately $149.
                </p>
              </div>
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                <h3 className="font-semibold text-teal-800 mb-1">Key Takeaway</h3>
                <p className="text-teal-700">
                  DAC is a timing difference, not a permanent difference &mdash; the total deduction over 10 years is the same.
                  However, the lower 2.09% annuity rate vs. 9.20% whole life rate means significantly less cash flow disruption in year one.
                  This is another structural advantage of the single-pay annuity in a vertically integrated system.
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="text-center text-xs text-navy-400 pb-8 px-4">
        <p>This tool is for internal comparison purposes only. Consult with your actuary and tax advisor before making product decisions. Tax rates are approximations.</p>
      </footer>
    </main>
  );
}
