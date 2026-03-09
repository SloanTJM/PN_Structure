import { fmt, fmtPct } from '../utils/formatters';

export default function TwoPotDetail({ result }) {
  const d = result.detail;
  const s = d.settlement;
  const potAYears = d.potA.yearDetails;
  const potBYears = d.potB.yearDetails;
  return (
    <div>
      {/* Pot A */}
      <div className="px-4 py-2 bg-navy-100 text-sm font-semibold text-navy-700">{d.potALabel}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-navy-50 text-navy-600 text-xs uppercase tracking-wider">
              <th className="px-4 py-2 text-center">Year</th>
              <th className="px-4 py-2 text-right">Paid This Year</th>
              <th className="px-4 py-2 text-right">Cumulative Paid</th>
              <th className="px-4 py-2 text-right">Investment Growth</th>
              <th className="px-4 py-2 text-right">Tax on Growth</th>
              <th className="px-4 py-2 text-right">Pot A Value</th>
            </tr>
          </thead>
          <tbody>
            {potAYears.map((yr, i) => (
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
      </div>

      {/* Pot B */}
      <div className="px-4 py-2 bg-navy-100 text-sm font-semibold text-navy-700 border-t border-navy-200">{d.potBLabel}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-navy-50 text-navy-600 text-xs uppercase tracking-wider">
              <th className="px-4 py-2 text-center">Year</th>
              {d.potB.isPassThrough ? (
                <>
                  <th className="px-4 py-2 text-right">FC Received This Year</th>
                  <th className="px-4 py-2 text-right">Cumulative Received</th>
                  <th className="px-4 py-2 text-right">Gross Inv. Growth</th>
                  <th className="px-4 py-2 text-right">Total Taxable</th>
                  <th className="px-4 py-2 text-right">Tax</th>
                  <th className="px-4 py-2 text-right">Pot B Value</th>
                </>
              ) : (
                <>
                  <th className="px-4 py-2 text-right">Paid This Year</th>
                  <th className="px-4 py-2 text-right">Cumulative Paid</th>
                  <th className="px-4 py-2 text-right">Investment Growth</th>
                  <th className="px-4 py-2 text-right">Tax on Growth</th>
                  <th className="px-4 py-2 text-right">Pot B Value</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {potBYears.map((yr, i) => (
              <tr key={yr.year} className={`border-b border-navy-100 ${i % 2 === 0 ? 'bg-white' : 'bg-navy-50'}`}>
                <td className="px-4 py-1.5 text-center font-medium">{yr.year}</td>
                {d.potB.isPassThrough ? (
                  <>
                    <td className="px-4 py-1.5 text-right font-mono">{fmt(yr.incomeThisYear)}</td>
                    <td className="px-4 py-1.5 text-right font-mono">{fmt(yr.cumulativeReceived)}</td>
                    <td className="px-4 py-1.5 text-right font-mono">{fmt(yr.grossGrowth)}</td>
                    <td className="px-4 py-1.5 text-right font-mono">{fmt(yr.totalTaxableIncome)}</td>
                    <td className="px-4 py-1.5 text-right font-mono text-red-600">{fmt(yr.taxThisYear)}</td>
                    <td className="px-4 py-1.5 text-right font-mono font-semibold">{fmt(yr.potValue)}</td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-1.5 text-right font-mono">{fmt(yr.paymentsThisYear)}</td>
                    <td className="px-4 py-1.5 text-right font-mono">{fmt(yr.cumulativePayments)}</td>
                    <td className="px-4 py-1.5 text-right font-mono">{fmt(yr.growthThisYear)}</td>
                    <td className="px-4 py-1.5 text-right font-mono text-red-600">{fmt(yr.taxThisYear)}</td>
                    <td className="px-4 py-1.5 text-right font-mono font-semibold">{fmt(yr.potValue)}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Combined Settlement */}
      <div className="bg-navy-800 text-white p-4">
        <h4 className="text-sm font-semibold mb-2 uppercase tracking-wide text-navy-300">Combined Settlement</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm mb-3">
            <thead>
              <tr className="text-navy-300 text-xs uppercase border-b border-navy-600">
                <th className="py-1 text-left"></th>
                <th className="py-1 text-right">Pot A</th>
                <th className="py-1 text-right">Pot B</th>
                <th className="py-1 text-right">Combined</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              <tr className="border-b border-navy-700">
                <td className="py-1 text-navy-300">Value at Claim</td>
                <td className="py-1 text-right">{fmt(s.potAValue)}</td>
                <td className="py-1 text-right">{fmt(s.potBValue)}</td>
                <td className="py-1 text-right font-semibold">{fmt(s.combinedValue)}</td>
              </tr>
              <tr className="border-b border-navy-700">
                <td className="py-1 text-navy-300">Growth Above Basis</td>
                <td className="py-1 text-right">{fmt(s.potAGrowth)}</td>
                <td className="py-1 text-right">{'\u2014'}</td>
                <td className="py-1 text-right">{fmt(s.potAGrowth)}</td>
              </tr>
              <tr className="border-b border-navy-700">
                <td className="py-1 text-navy-300">Exit Tax</td>
                <td className="py-1 text-right text-red-400">{fmt(s.potAExitTax)} ({fmtPct((s.potAExitTaxRate || 0) * 100)})</td>
                <td className="py-1 text-right text-navy-400">{fmt(s.potBExitTax || 0)} {s.potBExitTax ? `(${fmtPct((s.potBExitTaxRate || 0) * 100)})` : '(already taxed)'}</td>
                <td className="py-1 text-right text-red-400 font-semibold">{fmt(s.combinedExitTax)}</td>
              </tr>
              <tr className="border-b border-navy-700">
                <td className="py-1 text-navy-300">Value After All Taxes</td>
                <td className="py-1 text-right">{fmt(s.potANet)}</td>
                <td className="py-1 text-right">{fmt(s.potBNet)}</td>
                <td className="py-1 text-right font-semibold">{fmt(s.combinedNet)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm max-w-lg">
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
