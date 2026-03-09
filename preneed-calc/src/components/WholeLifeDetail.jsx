import { fmt, fmtPct } from '../utils/formatters';

export default function WholeLifeDetail({ result }) {
  const d = result.detail;
  const s = d.settlement;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-navy-100 text-navy-700 text-xs uppercase tracking-wider">
            <th className="px-4 py-2 text-center">Year</th>
            <th className="px-4 py-2 text-right">Premiums Paid This Year</th>
            <th className="px-4 py-2 text-right">Cumulative Premiums</th>
            <th className="px-4 py-2 text-right">Investment Growth</th>
            <th className="px-4 py-2 text-right">Tax on Growth ({fmtPct(result.annualTaxRate * 100)})</th>
            <th className="px-4 py-2 text-right">Pot Value (After Tax)</th>
          </tr>
        </thead>
        <tbody>
          {d.yearDetails.map((yr, i) => (
            <tr key={yr.year} className={`border-b border-navy-100 ${i % 2 === 0 ? 'bg-white' : 'bg-navy-50'}`}>
              <td className="px-4 py-1.5 text-center font-medium">{yr.year}</td>
              <td className="px-4 py-1.5 text-right font-mono">{fmt(yr.paymentsThisYear)}</td>
              <td className="px-4 py-1.5 text-right font-mono">{fmt(yr.cumulativePayments)}</td>
              <td className="px-4 py-1.5 text-right font-mono">{fmt(yr.growthThisYear)}</td>
              <td className="px-4 py-1.5 text-right font-mono text-red-600">{fmt(yr.taxThisYear)}</td>
              <td className="px-4 py-1.5 text-right font-mono font-semibold">{fmt(yr.potValue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Settlement */}
      <div className="bg-navy-800 text-white p-4 mt-0">
        <h4 className="text-sm font-semibold mb-2 uppercase tracking-wide text-navy-300">Claim Settlement</h4>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm max-w-lg">
          <span className="text-navy-300">Pot Value at Claim</span><span className="text-right font-mono">{fmt(s.potAtClaim)}</span>
          <span className="text-navy-300">Total Premiums Paid</span><span className="text-right font-mono">{fmt(s.totalPremiumsPaid)}</span>
          <span className="text-navy-300">Growth Above Premiums</span><span className="text-right font-mono">{fmt(s.growthAbovePremiums)}</span>
          <span className="text-navy-300">Exit Tax ({fmtPct(s.exitTaxRate * 100)})</span><span className="text-right font-mono text-red-400">{fmt(s.exitTax)}</span>
          <span className="text-navy-300">Value After All Taxes</span><span className="text-right font-mono">{fmt(s.valueAfterAllTaxes)}</span>
          <span className="text-navy-300">Face Value</span><span className="text-right font-mono">{fmt(s.faceValue)}</span>
          {s.guaranteedGrowth > 0 && (
            <>
              <span className="text-navy-300 mt-2 pt-2 border-t border-navy-600">Guaranteed Growth to FH</span><span className="text-right font-mono mt-2 pt-2 border-t border-navy-600">{fmt(s.guaranteedGrowth)}</span>
              <span className="text-navy-300">Tax on Guaranteed ({fmtPct((s.guaranteedTax / s.guaranteedGrowth) * 100)})</span><span className="text-right font-mono text-red-400">{fmt(s.guaranteedTax)}</span>
              <span className="text-navy-300">Net Guaranteed</span><span className="text-right font-mono text-teal-300">{fmt(s.netGuaranteed)}</span>
            </>
          )}
          <span className="font-bold text-teal-400">Net Retained Above Face</span><span className="text-right font-mono font-bold text-teal-400">{fmt(s.netRetainedAboveFace)}</span>
          <span className="font-bold text-teal-400">Net Return %</span><span className="text-right font-mono font-bold text-teal-400">{fmtPct(s.netReturnPct)}</span>
        </div>
      </div>
    </div>
  );
}
