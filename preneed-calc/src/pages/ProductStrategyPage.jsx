/* ─── Commission Rate Tables (% of face, agent only, excludes override) ─── */
const AGENT_RATES = {
  single: {
    '40-60': [10.00], '61-65': [9.40], '66-70': [7.80],
    '71-75': [6.00], '76-80': [4.60], '81-85': [2.40],
  },
  '3pay': {
    '40-60': [6.72, 2.24, 2.24], '61-65': [6.34, 2.11, 2.11],
    '66-70': [5.66, 1.89, 1.89], '71-75': [5.00, 1.67, 1.67],
    '76-80': [4.33, 1.44, 1.44], '81-85': [3.34, 1.11, 1.11],
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

const TERM_KEYS = ['single', '3pay', '5pay', '10pay', '20pay'];
const TERM_LABELS = { single: 'Single Pay', '3pay': '3-Pay', '5pay': '5-Pay', '10pay': '10-Pay', '20pay': '20-Pay' };
const AGE_BANDS = ['40-60', '61-65', '66-70', '71-75', '76-80', '81-85'];

export default function ProductStrategyPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold text-navy-800">Product Strategy Decision Tree</h2>
        <p className="text-sm text-navy-500 mt-1">Use this flowchart to determine the right preneed product based on customer health status and payment preference.</p>
      </div>

      {/* Decision Tree Flowchart */}
      <section className="bg-white rounded-xl shadow-sm border border-navy-100 p-6 overflow-x-auto">
        <div className="min-w-[900px] flex flex-col items-center gap-0">
          {/* Start Node */}
          <div className="bg-navy-800 text-white px-6 py-3 rounded-xl font-semibold text-sm shadow-md">
            New Preneed Customer
          </div>

          {/* Connector */}
          <div className="w-0.5 h-8 bg-navy-300"></div>

          {/* Health Question */}
          <div className="bg-amber-50 border-2 border-amber-400 px-6 py-3 rounded-xl text-sm font-semibold text-amber-800 shadow-sm">
            What is the customer's health status?
          </div>

          {/* Three-way branch */}
          <div className="flex items-start w-full max-w-4xl">
            {/* Left branch — Healthy */}
            <div className="flex-1 flex flex-col items-center">
              <div className="w-0.5 h-8 bg-green-400"></div>
              <div className="text-xs font-bold text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-300">HEALTHY</div>
              <div className="w-0.5 h-8 bg-green-400"></div>

              <div className="bg-blue-50 border-2 border-blue-400 px-4 py-2.5 rounded-xl text-xs font-semibold text-blue-800 shadow-sm text-center">
                Payment preference?
              </div>

              <div className="flex items-start w-full">
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-0.5 h-8 bg-blue-300"></div>
                  <div className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">Pay In Full</div>
                  <div className="w-0.5 h-6 bg-blue-300"></div>
                  <div className="bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-bold shadow text-center leading-tight">
                    Route A<br />
                    <span className="font-normal text-green-100 text-[10px]">&le;80: SP Whole Life</span><br />
                    <span className="font-normal text-green-100 text-[10px]">80+: SP Annuity</span>
                  </div>
                </div>
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-0.5 h-8 bg-blue-300"></div>
                  <div className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">Monthly</div>
                  <div className="w-0.5 h-6 bg-blue-300"></div>
                  <div className="bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-bold shadow text-center leading-tight">
                    Route B<br />
                    <span className="font-normal text-green-100 text-[10px]">A: Multi-Pay WL</span><br />
                    <span className="font-normal text-green-100 text-[10px]">B: Trust + Interest</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Center branch — Answer Yes to Health Qs */}
            <div className="flex-1 flex flex-col items-center">
              <div className="w-0.5 h-8 bg-amber-400"></div>
              <div className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-300 text-center leading-tight">ANSWER YES<br/><span className="font-normal text-[10px]">to health questions</span></div>
              <div className="w-0.5 h-8 bg-amber-400"></div>

              <div className="bg-blue-50 border-2 border-blue-400 px-4 py-2.5 rounded-xl text-xs font-semibold text-blue-800 shadow-sm text-center">
                Payment preference?
              </div>

              <div className="flex items-start w-full">
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-0.5 h-8 bg-blue-300"></div>
                  <div className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">Pay In Full</div>
                  <div className="w-0.5 h-6 bg-blue-300"></div>
                  <div className="bg-amber-600 text-white px-3 py-2 rounded-lg text-xs font-bold shadow text-center leading-tight">
                    Route C<br />
                    <span className="font-normal text-amber-100">Single-Pay Annuity</span>
                  </div>
                </div>
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-0.5 h-8 bg-blue-300"></div>
                  <div className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">Monthly</div>
                  <div className="w-0.5 h-6 bg-blue-300"></div>
                  <div className="bg-amber-600 text-white px-3 py-2 rounded-lg text-xs font-bold shadow text-center leading-tight">
                    Route D<br />
                    <span className="font-normal text-amber-100 text-[10px]">A: Graded Death Benefit</span><br />
                    <span className="font-normal text-amber-100 text-[10px]">B: Trust + Interest</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right branch — Terminal */}
            <div className="flex-1 flex flex-col items-center">
              <div className="w-0.5 h-8 bg-red-400"></div>
              <div className="text-xs font-bold text-red-700 bg-red-50 px-3 py-1 rounded-full border border-red-300">TERMINAL</div>
              <div className="w-0.5 h-8 bg-red-400"></div>

              <div className="bg-blue-50 border-2 border-blue-400 px-4 py-2.5 rounded-xl text-xs font-semibold text-blue-800 shadow-sm text-center">
                Payment preference?
              </div>

              <div className="flex items-start w-full">
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-0.5 h-8 bg-blue-300"></div>
                  <div className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">Pay In Full</div>
                  <div className="w-0.5 h-6 bg-blue-300"></div>
                  <div className="bg-red-600 text-white px-3 py-2 rounded-lg text-xs font-bold shadow text-center leading-tight">
                    Route E<br />
                    <span className="font-normal text-red-100">Single-Pay Annuity</span>
                  </div>
                </div>
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-0.5 h-8 bg-blue-300"></div>
                  <div className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">Monthly</div>
                  <div className="w-0.5 h-6 bg-blue-300"></div>
                  <div className="bg-red-600 text-white px-3 py-2 rounded-lg text-xs font-bold shadow text-center leading-tight">
                    Route F<br />
                    <span className="font-normal text-red-100">Trust + Interest</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Route Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Route A */}
        <div className="bg-white rounded-xl shadow-sm border border-navy-100 overflow-hidden">
          <div className="bg-green-700 text-white px-5 py-3 flex items-center gap-3">
            <span className="bg-green-500 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shadow">A</span>
            <div>
              <div className="font-semibold text-sm">Single-Pay (Age-Based)</div>
              <div className="text-xs opacity-80">Healthy + Pay In Full</div>
            </div>
          </div>

          <div className="px-5 py-3 bg-green-50 border-b border-green-200">
            <h4 className="text-xs font-bold text-green-700 uppercase tracking-wide mb-1">Age &le; 80 — Single-Pay Whole Life</h4>
            <p className="text-xs text-green-600">Full death benefit from day 1. Insurance product with mortality risk to TJM Life.</p>
          </div>
          <div className="overflow-x-auto border-b border-navy-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-navy-50 text-navy-600 text-xs uppercase tracking-wider">
                  <th className="px-4 py-2 text-left">Condition</th>
                  <th className="px-4 py-2 text-left">Product Detail</th>
                  <th className="px-4 py-2 text-right">Commission</th>
                  <th className="px-4 py-2 text-right">Override</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { condition: 'Customer \u2264 80 & healthy', product: 'Single-Pay Whole Life', commission: '7.5%+', override: 'See schedule' },
                ].map((row, i) => (
                  <tr key={i} className={`border-b border-navy-100 ${i % 2 === 0 ? 'bg-white' : 'bg-navy-50'}`}>
                    <td className="px-4 py-2 text-navy-700">{row.condition}</td>
                    <td className="px-4 py-2 text-navy-600">{row.product}</td>
                    <td className="px-4 py-2 text-right font-mono text-navy-800 font-medium">{row.commission}</td>
                    <td className="px-4 py-2 text-right font-mono text-navy-800 font-medium">{row.override}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 bg-blue-50 border-b border-blue-200">
            <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">Age 81+ — Single-Pay Annuity</h4>
            <p className="text-xs text-blue-600">Lower commission. Payout = account value; family covers any shortfall.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-navy-50 text-navy-600 text-xs uppercase tracking-wider">
                  <th className="px-4 py-2 text-left">Condition</th>
                  <th className="px-4 py-2 text-left">Product Detail</th>
                  <th className="px-4 py-2 text-right">Commission</th>
                  <th className="px-4 py-2 text-right">Override</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { condition: 'Customer > 80 & healthy', product: 'Single-Pay Annuity', commission: '~2.5%', override: 'See schedule' },
                ].map((row, i) => (
                  <tr key={i} className={`border-b border-navy-100 ${i % 2 === 0 ? 'bg-white' : 'bg-navy-50'}`}>
                    <td className="px-4 py-2 text-navy-700">{row.condition}</td>
                    <td className="px-4 py-2 text-navy-600">{row.product}</td>
                    <td className="px-4 py-2 text-right font-mono text-navy-800 font-medium">{row.commission}</td>
                    <td className="px-4 py-2 text-right font-mono text-navy-800 font-medium">{row.override}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Route B */}
        <div className="bg-white rounded-xl shadow-sm border border-navy-100 overflow-hidden">
          <div className="bg-green-700 text-white px-5 py-3 flex items-center gap-3">
            <span className="bg-green-500 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shadow">B</span>
            <div>
              <div className="font-semibold text-sm">Healthy + Monthly Payments</div>
              <div className="text-xs opacity-80">Two product options</div>
            </div>
          </div>

          <div className="px-5 py-3 bg-green-50 border-b border-green-200">
            <h4 className="text-xs font-bold text-green-700 uppercase tracking-wide mb-1">Option A — Multi-Pay Whole Life</h4>
            <p className="text-xs text-green-600">Primary product. Full death benefit from day 1.</p>
          </div>
          <div className="overflow-x-auto border-b border-navy-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-navy-50 text-navy-600 text-xs uppercase tracking-wider">
                  <th className="px-4 py-2 text-left">Condition</th>
                  <th className="px-4 py-2 text-left">Product Detail</th>
                  <th className="px-4 py-2 text-right">Commission</th>
                  <th className="px-4 py-2 text-right">Override</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { condition: 'Customer is healthy', product: 'Multi-Pay Whole Life', commission: '7.5%', override: 'See schedule' },
                ].map((row, i) => (
                  <tr key={i} className={`border-b border-navy-100 ${i % 2 === 0 ? 'bg-white' : 'bg-navy-50'}`}>
                    <td className="px-4 py-2 text-navy-700">{row.condition}</td>
                    <td className="px-4 py-2 text-navy-600">{row.product}</td>
                    <td className="px-4 py-2 text-right font-mono text-navy-800 font-medium">{row.commission}</td>
                    <td className="px-4 py-2 text-right font-mono text-navy-800 font-medium">{row.override}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 bg-amber-50 border-b border-amber-200">
            <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">Option B — Trust + Interest (Backup)</h4>
            <p className="text-xs text-amber-800">For customers who don't want an insurance policy. Commission is half of Multi-Pay WL.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-navy-50 text-navy-600 text-xs uppercase tracking-wider">
                  <th className="px-4 py-2 text-left">Condition</th>
                  <th className="px-4 py-2 text-left">Product Detail</th>
                  <th className="px-4 py-2 text-right">Commission</th>
                  <th className="px-4 py-2 text-right">Override</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { condition: 'Customer refuses insurance', product: 'Trust + Interest', commission: '3.75%', override: 'See schedule' },
                ].map((row, i) => (
                  <tr key={i} className={`border-b border-navy-100 ${i % 2 === 0 ? 'bg-white' : 'bg-navy-50'}`}>
                    <td className="px-4 py-2 text-navy-700">{row.condition}</td>
                    <td className="px-4 py-2 text-navy-600">{row.product}</td>
                    <td className="px-4 py-2 text-right font-mono text-navy-800 font-medium">{row.commission}</td>
                    <td className="px-4 py-2 text-right font-mono text-navy-800 font-medium">{row.override}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Route C */}
        <RouteCard
          route="C"
          title="Single-Pay Annuity"
          subtitle="Answer Yes + Pay In Full"
          color="amber"
          rows={[
            { condition: 'Answers Yes to health Qs', product: 'Single-Pay Annuity', commission: '7.5%', override: 'See schedule' },
          ]}
        />

        {/* Route D */}
        <div className="bg-white rounded-xl shadow-sm border border-navy-100 overflow-hidden">
          <div className="bg-amber-700 text-white px-5 py-3 flex items-center gap-3">
            <span className="bg-amber-500 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shadow">D</span>
            <div>
              <div className="font-semibold text-sm">Answer Yes + Monthly Payments</div>
              <div className="text-xs opacity-80">Two product options</div>
            </div>
          </div>

          {/* Option A: Graded Death Benefit */}
          <div className="px-5 py-3 bg-purple-50 border-b border-purple-200">
            <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-1">Option A — Graded Death Benefit</h4>
            <p className="text-xs text-purple-600">Return of premium during graded period if amount paid in exceeds the amount the family will get credit for.</p>
          </div>
          <div className="overflow-x-auto border-b border-navy-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-navy-50 text-navy-600 text-xs uppercase tracking-wider">
                  <th className="px-4 py-2 text-left">Condition</th>
                  <th className="px-4 py-2 text-left">Product Detail</th>
                  <th className="px-4 py-2 text-right">Commission</th>
                  <th className="px-4 py-2 text-right">Override</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { condition: 'Answers Yes to health Qs', product: 'Graded Death Benefit', commission: '7.5%', override: 'See schedule' },
                ].map((row, i) => (
                  <tr key={i} className={`border-b border-navy-100 ${i % 2 === 0 ? 'bg-white' : 'bg-navy-50'}`}>
                    <td className="px-4 py-2 text-navy-700">{row.condition}</td>
                    <td className="px-4 py-2 text-navy-600">{row.product}</td>
                    <td className="px-4 py-2 text-right font-mono text-navy-800 font-medium">{row.commission}</td>
                    <td className="px-4 py-2 text-right font-mono text-navy-800 font-medium">{row.override}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Option B: Trust + Interest */}
          <div className="px-5 py-3 bg-amber-50 border-b border-amber-200">
            <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">Option B — Trust + Interest</h4>
            <p className="text-xs text-amber-800">Commission is half of Multi-Pay WL (3.75%). Backup solution for customers who don't want an insurance policy.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-navy-50 text-navy-600 text-xs uppercase tracking-wider">
                  <th className="px-4 py-2 text-left">Condition</th>
                  <th className="px-4 py-2 text-left">Product Detail</th>
                  <th className="px-4 py-2 text-right">Commission</th>
                  <th className="px-4 py-2 text-right">Override</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { condition: 'Answers Yes to health Qs', product: 'Trust + Interest', commission: '3.75%', override: 'See schedule' },
                ].map((row, i) => (
                  <tr key={i} className={`border-b border-navy-100 ${i % 2 === 0 ? 'bg-white' : 'bg-navy-50'}`}>
                    <td className="px-4 py-2 text-navy-700">{row.condition}</td>
                    <td className="px-4 py-2 text-navy-600">{row.product}</td>
                    <td className="px-4 py-2 text-right font-mono text-navy-800 font-medium">{row.commission}</td>
                    <td className="px-4 py-2 text-right font-mono text-navy-800 font-medium">{row.override}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Route E */}
        <RouteCard
          route="E"
          title="Single-Pay Annuity"
          subtitle="Terminal + Pay In Full"
          color="red"
          rows={[
            { condition: 'Customer is terminal', product: 'Single-Pay Annuity', commission: '1%', override: 'See schedule' },
          ]}
        />

        {/* Route F */}
        <RouteCard
          route="F"
          title="Trust + Interest"
          subtitle="Terminal + Monthly Payments"
          color="red"
          rows={[
            { condition: 'Customer is terminal', product: 'Trust + Interest', commission: '1%', override: 'See schedule' },
          ]}
        />
      </div>

      {/* Commission Scales */}
      <section className="bg-white rounded-xl shadow-sm border border-navy-100 overflow-hidden">
        <div className="bg-navy-800 text-white px-6 py-4">
          <h2 className="text-lg font-semibold">Insurance Commission Scales</h2>
          <p className="text-navy-300 text-xs mt-1">Agent commission rates by payment term and age band (% of face value). Excludes override. Route card percentages are weighted proxies — see full scales below.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-navy-50 text-navy-600 text-xs uppercase tracking-wider">
                <th className="px-4 py-2.5 text-left">Term</th>
                <th className="px-4 py-2.5 text-left">Age Band</th>
                <th className="px-4 py-2.5 text-right">Year 1</th>
                <th className="px-4 py-2.5 text-right">Year 2</th>
                <th className="px-4 py-2.5 text-right">Year 3</th>
                <th className="px-4 py-2.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {TERM_KEYS.map((term) =>
                AGE_BANDS.filter(age => AGENT_RATES[term][age]).map((age, i) => {
                  const rates = AGENT_RATES[term][age];
                  const total = rates.reduce((a, b) => a + b, 0);
                  return (
                    <tr key={`${term}-${age}`} className={`border-b border-navy-100 ${i === 0 ? 'border-t-2 border-navy-200' : ''}`}>
                      {i === 0 && (
                        <td className="px-4 py-1.5 font-semibold text-navy-700" rowSpan={AGE_BANDS.filter(a => AGENT_RATES[term][a]).length}>
                          {TERM_LABELS[term]}
                        </td>
                      )}
                      <td className="px-4 py-1.5 text-navy-600">{age}</td>
                      <td className="px-4 py-1.5 text-right font-mono text-navy-800">{rates[0].toFixed(2)}%</td>
                      <td className="px-4 py-1.5 text-right font-mono text-navy-800">{rates[1] != null ? `${rates[1].toFixed(2)}%` : '\u2014'}</td>
                      <td className="px-4 py-1.5 text-right font-mono text-navy-800">{rates[2] != null ? `${rates[2].toFixed(2)}%` : '\u2014'}</td>
                      <td className="px-4 py-1.5 text-right font-mono font-semibold text-navy-800">{total.toFixed(2)}%</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 bg-navy-50 border-t border-navy-200">
          <h4 className="text-xs font-bold text-navy-600 uppercase tracking-wide mb-2">Other Product Commission Rates</h4>
          <table className="text-xs">
            <tbody>
              <tr><td className="pr-6 py-1 text-navy-600">Cemetery (Markers & Property)</td><td className="py-1 font-semibold font-mono text-navy-800">7.50%</td><td className="pl-4 py-1 text-navy-500">Flat rate on sale price</td></tr>
              <tr><td className="pr-6 py-1 text-navy-600">Trust + Interest</td><td className="py-1 font-semibold font-mono text-navy-800">3.75%</td><td className="pl-4 py-1 text-navy-500">Half of insurance rate</td></tr>
              <tr><td className="pr-6 py-1 text-navy-600">Terminal (any product)</td><td className="py-1 font-semibold font-mono text-navy-800">1.00%</td><td className="pl-4 py-1 text-navy-500">Flat</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Override Schedule */}
      <section className="bg-white rounded-xl shadow-sm border border-navy-100 overflow-hidden">
        <div className="bg-navy-800 text-white px-6 py-4">
          <h2 className="text-lg font-semibold">Override Schedule</h2>
          <p className="text-navy-300 text-xs mt-1">Override percentage is based on total annual volume sold. Terminal overrides are a flat $50 regardless of volume. Terminal policies do not contribute to override schedule volume.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy-50 text-navy-600 text-xs uppercase tracking-wider">
                <th className="px-6 py-2.5 text-left">Annual Volume</th>
                <th className="px-6 py-2.5 text-right">Override %</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['$2 Million', '1.0%'],
                ['$3 Million', '1.25%'],
                ['$4 Million', '1.5%'],
                ['$5 Million', '1.75%'],
                ['$6 Million', '2.0%'],
                ['$7 Million', '2.0%'],
                ['$8 Million', '2.25%'],
                ['$9 Million', '2.25%'],
                ['$10 Million+', '2.5%'],
              ].map(([volume, rate], i) => (
                <tr key={volume} className={`border-b border-navy-100 ${i % 2 === 0 ? 'bg-white' : 'bg-navy-50'}`}>
                  <td className="px-6 py-2 text-navy-700 font-medium">{volume}</td>
                  <td className="px-6 py-2 text-right font-mono text-navy-800 font-semibold">{rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Footer note */}
      <footer className="text-center text-xs text-navy-400 pb-8 px-4">
        <p>Commission and override rates are illustrative. Actual rates may vary by state and contract terms.</p>
      </footer>
    </main>
  );
}

function RouteCard({ route, title, subtitle, color, note, rows }) {
  const colorStyles = {
    green: { headerBg: 'bg-green-700', badge: 'bg-green-500' },
    amber: { headerBg: 'bg-amber-700', badge: 'bg-amber-500' },
    red: { headerBg: 'bg-red-700', badge: 'bg-red-500' },
  };
  const styles = colorStyles[color] || colorStyles.green;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-navy-100 overflow-hidden">
      <div className={`${styles.headerBg} text-white px-5 py-3 flex items-center gap-3`}>
        <span className={`${styles.badge} w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shadow`}>
          {route}
        </span>
        <div>
          <div className="font-semibold text-sm">{title}</div>
          <div className="text-xs opacity-80">{subtitle}</div>
        </div>
      </div>
      {note && (
        <div className="px-5 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-800">
          {note}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-navy-50 text-navy-600 text-xs uppercase tracking-wider">
              <th className="px-4 py-2 text-left">Condition</th>
              <th className="px-4 py-2 text-left">Product Detail</th>
              <th className="px-4 py-2 text-right">Commission</th>
              <th className="px-4 py-2 text-right">Override</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={`border-b border-navy-100 ${i % 2 === 0 ? 'bg-white' : 'bg-navy-50'}`}>
                <td className="px-4 py-2 text-navy-700">{row.condition}</td>
                <td className="px-4 py-2 text-navy-600">{row.product}</td>
                <td className="px-4 py-2 text-right font-mono text-navy-800 font-medium">{row.commission}</td>
                <td className="px-4 py-2 text-right font-mono text-navy-800 font-medium">{row.override}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
