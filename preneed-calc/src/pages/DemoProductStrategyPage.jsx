export default function DemoProductStrategyPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold text-navy-800">Product Strategy Decision Tree</h2>
        <p className="text-sm text-navy-500 mt-1">Use this flowchart to determine the right preneed product based on customer health status and payment preference.</p>
      </div>

      {/* Decision Tree Flowchart (identical to admin) */}
      <section className="bg-white rounded-xl shadow-sm border border-navy-100 p-6 overflow-x-auto">
        <div className="min-w-[900px] flex flex-col items-center gap-0">
          {/* Start Node */}
          <div className="bg-navy-800 text-white px-6 py-3 rounded-xl font-semibold text-sm shadow-md">
            New Preneed Customer
          </div>
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

      {/* Route Tables (no Override column) */}
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
          <DemoRouteTable rows={[{ condition: 'Customer \u2264 80 & healthy', product: 'Single-Pay Whole Life', commission: '7.5%' }]} />
          <div className="px-5 py-3 bg-blue-50 border-b border-blue-200">
            <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">Age 81+ — Single-Pay Annuity</h4>
            <p className="text-xs text-blue-600">Lower commission. Payout = account value; family covers any shortfall.</p>
          </div>
          <DemoRouteTable rows={[{ condition: 'Customer > 80 & healthy', product: 'Single-Pay Annuity', commission: '~1.83%' }]} />
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
          <DemoRouteTable rows={[{ condition: 'Customer is healthy', product: 'Multi-Pay Whole Life', commission: '7.5%' }]} />
          <div className="px-5 py-3 bg-amber-50 border-b border-amber-200">
            <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">Option B — Trust + Interest (Backup)</h4>
            <p className="text-xs text-amber-800">For customers who don't want an insurance policy. Commission is half of Multi-Pay WL.</p>
          </div>
          <DemoRouteTable rows={[{ condition: 'Customer refuses insurance', product: 'Trust + Interest', commission: '3.75%' }]} />
        </div>

        {/* Route C */}
        <DemoRouteCard route="C" title="Single-Pay Annuity" subtitle="Answer Yes + Pay In Full" color="amber"
          rows={[{ condition: 'Answers Yes to health Qs', product: 'Single-Pay Annuity', commission: '7.5%' }]} />

        {/* Route D */}
        <div className="bg-white rounded-xl shadow-sm border border-navy-100 overflow-hidden">
          <div className="bg-amber-700 text-white px-5 py-3 flex items-center gap-3">
            <span className="bg-amber-500 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shadow">D</span>
            <div>
              <div className="font-semibold text-sm">Answer Yes + Monthly Payments</div>
              <div className="text-xs opacity-80">Two product options</div>
            </div>
          </div>
          <div className="px-5 py-3 bg-purple-50 border-b border-purple-200">
            <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-1">Option A — Graded Death Benefit</h4>
            <p className="text-xs text-purple-600">Return of premium during graded period if amount paid in exceeds the amount the family will get credit for.</p>
          </div>
          <DemoRouteTable rows={[{ condition: 'Answers Yes to health Qs', product: 'Graded Death Benefit', commission: '7.5%' }]} />
          <div className="px-5 py-3 bg-amber-50 border-b border-amber-200">
            <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">Option B — Trust + Interest</h4>
            <p className="text-xs text-amber-800">Commission is half of Multi-Pay WL (3.75%). Backup solution for customers who don't want an insurance policy.</p>
          </div>
          <DemoRouteTable rows={[{ condition: 'Answers Yes to health Qs', product: 'Trust + Interest', commission: '3.75%' }]} />
        </div>

        {/* Route E */}
        <DemoRouteCard route="E" title="Single-Pay Annuity" subtitle="Terminal + Pay In Full" color="red"
          rows={[{ condition: 'Customer is terminal', product: 'Single-Pay Annuity', commission: '1%' }]} />

        {/* Route F */}
        <DemoRouteCard route="F" title="Trust + Interest" subtitle="Terminal + Monthly Payments" color="red"
          rows={[{ condition: 'Customer is terminal', product: 'Trust + Interest', commission: '1%' }]} />
      </div>

      {/* Simplified Commission Summary (replaces detailed rate tables + override schedule) */}
      <section className="bg-white rounded-xl shadow-sm border border-navy-100 overflow-hidden">
        <div className="bg-navy-800 text-white px-6 py-4">
          <h2 className="text-lg font-semibold">Commission Rates</h2>
          <p className="text-navy-300 text-xs mt-1">Simplified commission rates by product type.</p>
        </div>
        <div className="px-6 py-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy-50 text-navy-600 text-xs uppercase tracking-wider">
                <th className="px-4 py-2.5 text-left">Product</th>
                <th className="px-4 py-2.5 text-right">Commission</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-navy-100">
                <td className="px-4 py-2 text-navy-700">Insurance Products</td>
                <td className="px-4 py-2 text-right font-mono font-semibold text-navy-800">7.5%</td>
              </tr>
              <tr className="border-b border-navy-100 bg-navy-50">
                <td className="px-4 py-2 text-navy-700">Cemetery (Markers & Property)</td>
                <td className="px-4 py-2 text-right font-mono font-semibold text-navy-800">7.5%</td>
              </tr>
              <tr className="border-b border-navy-100">
                <td className="px-4 py-2 text-navy-700">Trust + Interest</td>
                <td className="px-4 py-2 text-right font-mono font-semibold text-navy-800">3.75%</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-navy-700">Terminal</td>
                <td className="px-4 py-2 text-right font-mono font-semibold text-navy-800">1.0%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Footer note */}
      <footer className="text-center text-xs text-navy-400 pb-8 px-4">
        <p>Commission rates are illustrative. Actual rates may vary by state and contract terms.</p>
      </footer>
    </main>
  );
}

/* ─── Helper: route table (no Override column) ─── */
function DemoRouteTable({ rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-navy-50 text-navy-600 text-xs uppercase tracking-wider">
            <th className="px-4 py-2 text-left">Condition</th>
            <th className="px-4 py-2 text-left">Product Detail</th>
            <th className="px-4 py-2 text-right">Commission</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={`border-b border-navy-100 ${i % 2 === 0 ? 'bg-white' : 'bg-navy-50'}`}>
              <td className="px-4 py-2 text-navy-700">{row.condition}</td>
              <td className="px-4 py-2 text-navy-600">{row.product}</td>
              <td className="px-4 py-2 text-right font-mono text-navy-800 font-medium">{row.commission}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Helper: route card (no Override column) ─── */
function DemoRouteCard({ route, title, subtitle, color, rows }) {
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
      <DemoRouteTable rows={rows} />
    </div>
  );
}
