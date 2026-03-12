import { useState, useMemo } from 'react';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { fmt, fmtPct, fmtLarge } from '../utils/formatters';
import InputGroup from '../components/InputGroup';
import NumberInput from '../components/NumberInput';
import {
  MONTHLY_BONUSES, ANNUAL_BONUSES,
  ROLE_DEFAULTS, BUCKET_DEFAULTS, AFTERCARE_DEFAULTS,
} from '../commissionConstants';
import {
  ROLE_LABELS, ROLE_COLORS, ROLE_KEYS,
  calcGrossCommission, calcCloserComp, calcSetterComp, calcAftercareComp, buildChartData,
} from '../commissionCalcs';

/* Fixed demo defaults — no user inputs */
const DEMO_DEFAULTS = {
  chargebackRate: 5,
  modelingYear: 1,
  leaderBaseSalary: 125982,
  mixPreneed: 40, mixCemetery: 50, mixTrust: 5, mixTerminal: 5,
  mixSinglePay: 30, mix3Pay: 15, mix5Pay: 25, mix10Pay: 20, mix20Pay: 10,
  mixAge40_60: 20, mixAge61_65: 25, mixAge66_70: 30, mixAge71_75: 15, mixAge76_80: 7, mixAge81_85: 2, mixAge86_90: 1,
};

const DEMO_CLOSER_VOLUME = 3000000;
const DEMO_AFTERCARE_VOLUME = 1000000;

function Row({ label, sublabel, value }) {
  return (
    <tr>
      <td className="py-1.5 text-navy-700">
        {label}
        {sublabel && <span className="block text-xs text-navy-400">{sublabel}</span>}
      </td>
      <td className="py-1.5 text-right font-medium text-navy-800">{fmt(value)}</td>
    </tr>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-navy-300 font-semibold mb-1">{fmtLarge(label)} Face Value</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {fmt(p.value)}</p>
      ))}
    </div>
  );
}

/* ─── Role Description Cards ─── */
const ROLE_DESCRIPTIONS = {
  closer: {
    title: 'What does a Preneed Specialist do?',
    points: [
      'Handles face-to-face sales presentations with families',
      'Products: whole life, annuities, graded benefit, cemetery, trust',
      'Guides families through the right product based on health status and payment preference',
    ],
  },
  setter: {
    title: 'What does an Appointment Specialist do?',
    points: [
      'Handles the majority of prospecting, outreach, and appointment scheduling (80%+ of appointments)',
      'Qualifies leads and matches families to the right salesperson for their needs',
    ],
  },
  aftercare: {
    title: 'What does an Aftercare Specialist do?',
    points: [
      'Works with families after a funeral to discuss preplanning for other family members',
      'Unique lead source with strong close rates (warm referrals)',
      'FD referral partnership \u2014 funeral directors provide warm introductions',
    ],
  },
};

function RoleDescriptionCard({ roleKey }) {
  const desc = ROLE_DESCRIPTIONS[roleKey];
  return (
    <div className="bg-white rounded-xl shadow-sm border border-navy-100 overflow-hidden">
      <div className="px-6 py-3" style={{ backgroundColor: ROLE_COLORS[roleKey] }}>
        <h3 className="text-sm font-bold text-white">{desc.title}</h3>
      </div>
      <div className="px-6 py-4">
        <ul className="space-y-2">
          {desc.points.map((pt, i) => (
            <li key={i} className="flex gap-2 text-sm text-navy-700">
              <span className="text-teal-500 mt-0.5 flex-shrink-0">&#x2022;</span>
              {pt}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ─── Comp Advantages Section ─── */
const ALL_ADVANTAGES = [
  { key: 'income4',     roles: ['closer', 'aftercare'],         title: 'Four Income Streams', text: 'Earn a guaranteed base wage + commissions + monthly bonuses + annual bonuses. The base pays from day one while you build your book.' },
  { key: 'income2',     roles: ['setter'],                      title: 'Two Income Streams', text: 'Earn a guaranteed base wage ($16/hr) plus a commission split on every deal that closes from your appointments. Income grows as you book more.' },
  { key: 'pipeline',    roles: ['closer', 'setter', 'aftercare'], title: 'Untapped Lead Pipeline', text: 'Over 30,000 unworked contacts in our vault from 13 funeral homes and 3 cemeteries. Plus new leads from tradeshow marketing, outbound initiatives, mailouts, and digital marketing. No recycled leads, no burned territory.' },
  { key: 'dealflow',    roles: ['closer'],                      title: 'Appointment-Driven Deal Flow', text: 'A dedicated Appointment Specialist handles the majority of prospecting and scheduling. You show up to pre-set, qualified appointments and focus on what you do best \u2014 selling.' },
  { key: 'central',     roles: ['setter'],                      title: 'Central Booking Role', text: 'You are the hub that keeps every salesperson\u2019s calendar full. Every appointment you set that converts earns you a 20% commission split \u2014 the more you book, the more you make.' },
  { key: 'products',    roles: ['closer', 'setter', 'aftercare'], title: 'A Product for Every Customer', text: 'Eight product routes cover every health status and payment preference \u2014 healthy, sick, or terminal; pay-in-full or monthly. Nobody walks away because you don\u2019t have the right product.' },
  { key: 'contracting', roles: ['closer', 'setter', 'aftercare'], title: 'Frictionless Contracting', text: 'Actively building streamlined contract generation \u2014 simplified paperwork, digital tools, less admin time. Every minute saved on paperwork is a minute you\u2019re earning.' },
  { key: 'brand',       roles: ['closer', 'setter', 'aftercare'], title: 'Trusted Brand & Premier Facility', text: 'You\u2019re representing a respected funeral home with deep community roots, not a faceless carrier. Families already know and trust TJM. The high-end facility reinforces quality before you say a word.' },
  { key: 'backup',      roles: ['closer', 'aftercare'],         title: 'You Back Up What You Sell', text: 'TJM delivers the product it sells. When a family preplans, your own company serves them \u2014 no third-party disconnect. You can promise quality and mean it.' },
  { key: 'mileage',     roles: ['closer', 'aftercare'],         title: 'Mileage Reimbursement', text: 'All business mileage reimbursed at $0.67/mile \u2014 IRS standard rate. Drive to appointments without eating into your earnings.' },
  { key: 'benefits',    roles: ['closer', 'setter', 'aftercare'], title: 'Full Benefits Package', text: 'Health insurance, PTO, company-paid life insurance, HSA, and 401(k) \u2014 a complete benefits package on top of your compensation.' },
  { key: 'groundfloor', roles: ['closer', 'setter', 'aftercare'], title: 'Ground Floor Opportunity', text: 'The comp model, product strategy, appointment workflow, and contract tools are all being built now. Early team members shape how it gets done \u2014 your voice matters here.' },
];

function CompAdvantages({ roleKey }) {
  const cards = roleKey
    ? ALL_ADVANTAGES.filter(c => c.roles.includes(roleKey))
    : ALL_ADVANTAGES;
  return (
    <div className="bg-white border border-navy-200 rounded-xl overflow-hidden">
      <div className="bg-teal-700 px-5 py-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wide">Compensation & Opportunity Advantages</h3>
      </div>
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((c) => (
          <div key={c.key} className="bg-navy-50 rounded-lg p-4">
            <h4 className="text-xs font-bold text-navy-700 uppercase tracking-wide mb-1">{c.title}</h4>
            <p className="text-xs text-navy-600">{c.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Position Card (read-only comp breakdown) ─── */
function PositionCard({ roleKey, comm, roleDefaults }) {
  const role = roleDefaults;
  const label = ROLE_LABELS[roleKey];
  const color = ROLE_COLORS[roleKey];

  return (
    <section className="bg-white rounded-xl shadow-sm border border-navy-100 overflow-hidden">
      <div className="px-6 py-3" style={{ backgroundColor: color }}>
        <h3 className="text-sm font-bold text-white uppercase tracking-wide">{label}</h3>
      </div>
      <div className="px-6 py-4">
        <table className="w-full text-sm">
          <tbody>
            <Row label="Base Wage" sublabel={`$${role.hourlyWage}/hr x ${role.hoursPerWeek}hrs x ${role.weeksPerYear}wks`} value={comm.baseWage} />
            <tr className="border-t border-navy-200">
              <td className="py-2 font-semibold text-navy-800">
                Gross Commission
                {roleKey === 'setter' && <span className="block text-xs text-navy-400 font-normal">20% of converted sales</span>}
                {roleKey === 'aftercare' && <span className="block text-xs text-navy-400 font-normal">60/40 split — specialist keeps 60%, FD referral 40%</span>}
              </td>
              <td className="py-2 text-right font-semibold text-navy-800">
                {fmt(comm.grossComm)}
              </td>
            </tr>
            <tr>
              <td className="py-1 text-red-600">Chargebacks (5%)</td>
              <td className="py-1 text-right text-red-600">-{fmt(comm.chargebacks)}</td>
            </tr>
            <tr className="border-t border-navy-200">
              <td className="py-2 font-semibold text-navy-800">Net Commission</td>
              <td className="py-2 text-right font-semibold text-navy-800">{fmt(comm.netComm)}</td>
            </tr>
            {roleKey === 'aftercare' && comm.fdReferralShare > 0 && (
              <>
                <tr>
                  <td className="py-1 text-orange-600">FD Referral Share (40%)</td>
                  <td className="py-1 text-right text-orange-600">-{fmt(comm.fdReferralShare)}</td>
                </tr>
                <tr className="border-t border-navy-200">
                  <td className="py-2 font-semibold text-navy-800">Specialist Net Commission (60%)</td>
                  <td className="py-2 text-right font-semibold text-navy-800">{fmt(comm.effectiveNetComm)}</td>
                </tr>
              </>
            )}
            {roleKey !== 'setter' && (
              <>
                <Row label="Monthly Bonuses" sublabel={comm.monthlyBonus > 0 ? `${fmt(comm.monthlyBonus)}/mo x 12` : 'Below threshold'} value={comm.annualMonthlyBonusTotal} />
                <Row label="Annual Bonuses" sublabel="Highest qualifying tier" value={comm.annualBonus} />
              </>
            )}
            <tr className="border-t-2" style={{ borderColor: color }}>
              <td className="py-3 font-bold text-base" style={{ color }}>TOTAL COMP</td>
              <td className="py-3 text-right font-bold text-lg" style={{ color }}>{fmt(comm.totalAgentComp)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ─── Bonus Tables ─── */
function BonusTables({ roleFilter, roleVolumes }) {
  const showRole = (key) => !roleFilter || roleFilter === key;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Monthly Bonuses */}
      <section className="bg-white rounded-xl shadow-sm border border-navy-100 overflow-hidden">
        <div className="bg-navy-100 px-6 py-3">
          <h3 className="text-xs font-bold text-navy-700 uppercase tracking-wide">Monthly Bonus Schedule</h3>
          <p className="text-xs text-navy-400 mt-0.5">Preneed Specialists & Aftercare Specialists only</p>
        </div>
        <div className="px-6 py-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-navy-500 text-xs uppercase">
                <th className="pb-2 text-left font-semibold">Monthly Face Value</th>
                <th className="pb-2 text-right font-semibold">Bonus</th>
                <th className="pb-2 text-right font-semibold">Roles</th>
              </tr>
            </thead>
            <tbody>
              {[...MONTHLY_BONUSES].reverse().map((t) => (
                <tr key={t.threshold}>
                  <td className="py-1.5 text-navy-700">
                    {t.threshold >= 300000 ? `${fmtLarge(t.threshold)}+` : fmtLarge(t.threshold)}
                  </td>
                  <td className="py-1.5 text-right text-navy-800">{fmt(t.bonus)}</td>
                  <td className="py-1.5 text-right">
                    <span className="inline-flex gap-1">
                      {ROLE_KEYS.filter(key => showRole(key) && key !== 'setter').map(key => {
                        const qualifies = roleVolumes[key] && (roleVolumes[key] / 12) >= t.threshold;
                        return qualifies ? <span key={key} className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: ROLE_COLORS[key] }} title={ROLE_LABELS[key]}></span> : null;
                      })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-navy-400 mt-2">Non-cumulative: highest qualifying tier only. Colored dots show qualifying roles.</p>
        </div>
      </section>

      {/* Annual Bonuses */}
      <section className="bg-white rounded-xl shadow-sm border border-navy-100 overflow-hidden">
        <div className="bg-navy-100 px-6 py-3">
          <h3 className="text-xs font-bold text-navy-700 uppercase tracking-wide">Annual Bonus Milestones</h3>
          <p className="text-xs text-navy-400 mt-0.5">Preneed Specialists & Aftercare Specialists only</p>
        </div>
        <div className="px-6 py-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-navy-500 text-xs uppercase">
                <th className="pb-2 text-left font-semibold">Annual Volume</th>
                <th className="pb-2 text-right font-semibold">Bonus</th>
                <th className="pb-2 text-right font-semibold">Roles</th>
              </tr>
            </thead>
            <tbody>
              {[...ANNUAL_BONUSES].reverse().map((t) => (
                <tr key={t.threshold}>
                  <td className="py-1.5 text-navy-700">{fmtLarge(t.threshold)}</td>
                  <td className="py-1.5 text-right text-navy-800">{fmt(t.bonus)}</td>
                  <td className="py-1.5 text-right">
                    <span className="inline-flex gap-1">
                      {ROLE_KEYS.filter(key => showRole(key) && key !== 'setter').map(key => {
                        const qualifies = roleVolumes[key] && roleVolumes[key] >= t.threshold;
                        return qualifies ? <span key={key} className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: ROLE_COLORS[key] }} title={ROLE_LABELS[key]}></span> : null;
                      })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-navy-400 mt-2">Non-cumulative: highest qualifying tier only. Colored dots show qualifying roles.</p>
        </div>
      </section>
    </div>
  );
}

/* ─── Compensation Chart ─── */
function CompChart({ chartData, showRoles }) {
  return (
    <section className="bg-navy-900 rounded-xl shadow-sm p-6">
      <h3 className="text-sm font-bold text-white uppercase tracking-wide mb-4">Compensation Curve</h3>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#243b53" />
            <XAxis dataKey="faceValue" tickFormatter={fmtLarge} stroke="#9fb3c8" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={fmtLarge} stroke="#9fb3c8" tick={{ fontSize: 11 }} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: '#d9e2ec' }} />
            <ReferenceLine x={2000000} stroke="#627d98" strokeDasharray="4 4" label={{ value: '$2M', fill: '#9fb3c8', fontSize: 10 }} />
            <ReferenceLine x={3000000} stroke="#627d98" strokeDasharray="4 4" label={{ value: '$3M', fill: '#9fb3c8', fontSize: 10 }} />
            <ReferenceLine y={150000} stroke="#3ebd93" strokeDasharray="4 4" label={{ value: '$150K', fill: '#3ebd93', fontSize: 10, position: 'left' }} />
            <ReferenceLine y={300000} stroke="#3ebd93" strokeDasharray="4 4" label={{ value: '$300K', fill: '#3ebd93', fontSize: 10, position: 'left' }} />
            {showRoles.includes('closer') && <Line type="monotone" dataKey="total_closer" name={`${ROLE_LABELS.closer} Total Comp`} stroke={ROLE_COLORS.closer} strokeWidth={2} dot={false} />}
            {showRoles.includes('setter') && <Line type="monotone" dataKey="total_setter" name={`${ROLE_LABELS.setter} Total Comp`} stroke={ROLE_COLORS.setter} strokeWidth={2} dot={false} />}
            {showRoles.includes('aftercare') && <Line type="monotone" dataKey="total_aftercare" name={`${ROLE_LABELS.aftercare} Total Comp`} stroke={ROLE_COLORS.aftercare} strokeWidth={2} dot={false} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

/* ─── Closer Demo View (stateful — has volume input + detailed breakdown + chart) ─── */
function CloserDemoView({ roles, sharedState }) {
  const [closerVolume, setCloserVolume] = useState(DEMO_CLOSER_VOLUME);

  const closerComp = useMemo(() => {
    const st = { ...sharedState, hourlyWage: roles.closer.hourlyWage, hoursPerWeek: roles.closer.hoursPerWeek, weeksPerYear: roles.closer.weeksPerYear };
    const bk = {
      closerAnnualVolume: closerVolume,
      closerTotalProduction: closerVolume,
      setterVolumeEach: closerVolume,
      pctSetterSourced: BUCKET_DEFAULTS.pctSetterSourced,
      closerSplitPct: BUCKET_DEFAULTS.closerSplitPct,
      aftercareAnnualVolume: DEMO_AFTERCARE_VOLUME,
    };
    return calcCloserComp(st, bk, true);
  }, [closerVolume]);

  const closerChartData = useMemo(() => {
    const st = { ...sharedState, hourlyWage: roles.closer.hourlyWage, hoursPerWeek: roles.closer.hoursPerWeek, weeksPerYear: roles.closer.weeksPerYear };
    const points = [];
    for (let vol = 0; vol <= 5000000; vol += 100000) {
      const bk = {
        closerAnnualVolume: vol,
        closerTotalProduction: vol,
        setterVolumeEach: vol,
        pctSetterSourced: BUCKET_DEFAULTS.pctSetterSourced,
        closerSplitPct: BUCKET_DEFAULTS.closerSplitPct,
        aftercareAnnualVolume: vol,
      };
      const comp = calcCloserComp(st, bk, true);
      points.push({ faceValue: vol, total_closer: comp.totalAgentComp });
    }
    return points;
  }, []);

  const perpCareFrac = (DEMO_DEFAULTS.mixCemetery / 100) * 0.70 * 0.15;
  const closerNetVolume = closerVolume * (1 - perpCareFrac);
  const roleVolumes = { closer: closerNetVolume };

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-navy-800">{ROLE_LABELS.closer}</h2>
        <p className="text-sm text-navy-500 mt-1">Compensation breakdown with 7.5% simplified commission.</p>
      </div>

      <RoleDescriptionCard roleKey="closer" />

      <CompAdvantages roleKey="closer" />

      {/* Volume Input */}
      <div className="bg-white rounded-xl shadow-sm border border-navy-100 p-6">
        <div className="max-w-xs">
          <InputGroup label="Total Volume Sold (Annual Face Value)">
            <NumberInput value={closerVolume} onChange={setCloserVolume} min={0} max={5000000} step={250000} prefix="$" />
          </InputGroup>
        </div>
      </div>

      {/* Detailed Comp Breakdown */}
      <section className="bg-white rounded-xl shadow-sm border border-navy-100 overflow-hidden">
        <div className="px-6 py-3" style={{ backgroundColor: ROLE_COLORS.closer }}>
          <h3 className="text-sm font-bold text-white uppercase tracking-wide">{ROLE_LABELS.closer} Compensation Breakdown</h3>
        </div>
        <div className="px-6 py-4">
          <table className="w-full text-sm">
            <tbody>
              <Row label="Base Wage" sublabel={`$${roles.closer.hourlyWage}/hr x ${roles.closer.hoursPerWeek}hrs x ${roles.closer.weeksPerYear}wks`} value={closerComp.baseWage} />
              <tr className="border-t border-navy-100">
                <td className="py-1.5 font-semibold text-navy-700">Total Volume Sold</td>
                <td className="py-1.5 text-right font-semibold text-navy-700">{fmtLarge(closerVolume)}</td>
              </tr>
              <tr>
                <td className="py-1 text-navy-500 text-xs pl-3">Insurance & Cemetery commission at 7.5%</td>
                <td className="py-1 text-right text-navy-500 text-xs">{fmt(closerVolume * 0.075)}</td>
              </tr>
              <tr>
                <td className="py-1 text-navy-500 text-xs pl-3">Cemetery perp. care deduction (property portion)</td>
                <td className="py-1 text-right text-navy-500 text-xs">included</td>
              </tr>
              <tr className="border-t border-navy-200">
                <td className="py-2 font-semibold text-navy-800">Gross Commission</td>
                <td className="py-2 text-right font-semibold text-navy-800">{fmt(closerComp.grossComm)}</td>
              </tr>
              <tr>
                <td className="py-1 text-red-600">Chargebacks ({DEMO_DEFAULTS.chargebackRate}%)</td>
                <td className="py-1 text-right text-red-600">-{fmt(closerComp.chargebacks)}</td>
              </tr>
              <tr className="border-t border-navy-200">
                <td className="py-2 font-semibold text-navy-800">Net Commission</td>
                <td className="py-2 text-right font-semibold text-navy-800">{fmt(closerComp.netComm)}</td>
              </tr>
              <Row label="Monthly Bonuses" sublabel={closerComp.monthlyBonus > 0 ? `${fmt(closerComp.monthlyBonus)}/mo x 12` : 'Below threshold'} value={closerComp.annualMonthlyBonusTotal} />
              <Row label="Annual Bonus" sublabel="Highest qualifying tier" value={closerComp.annualBonus} />
              <tr className="border-t-2" style={{ borderColor: ROLE_COLORS.closer }}>
                <td className="py-3 font-bold text-base" style={{ color: ROLE_COLORS.closer }}>TOTAL ANNUAL COMP</td>
                <td className="py-3 text-right font-bold text-lg" style={{ color: ROLE_COLORS.closer }}>{fmt(closerComp.totalAgentComp)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Chart */}
      <section className="bg-navy-900 rounded-xl shadow-sm p-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wide mb-4">{ROLE_LABELS.closer} Compensation Curve</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={closerChartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#243b53" />
              <XAxis dataKey="faceValue" tickFormatter={fmtLarge} stroke="#9fb3c8" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmtLarge} stroke="#9fb3c8" tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#d9e2ec' }} />
              <ReferenceLine x={closerVolume} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: fmtLarge(closerVolume), fill: '#f59e0b', fontSize: 10 }} />
              <ReferenceLine y={150000} stroke="#3ebd93" strokeDasharray="4 4" label={{ value: '$150K', fill: '#3ebd93', fontSize: 10, position: 'left' }} />
              <ReferenceLine y={300000} stroke="#3ebd93" strokeDasharray="4 4" label={{ value: '$300K', fill: '#3ebd93', fontSize: 10, position: 'left' }} />
              <Line type="monotone" dataKey="total_closer" name={`${ROLE_LABELS.closer} Total Comp`} stroke={ROLE_COLORS.closer} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      <BonusTables roleFilter="closer" roleVolumes={roleVolumes} />
    </main>
  );
}

/* ─── Setter Demo View (stateful — has volume input + dedicated chart) ─── */
function SetterDemoView({ roles, sharedState }) {
  const [appointmentVolume, setAppointmentVolume] = useState(3000000);

  const setterSplit = (100 - BUCKET_DEFAULTS.closerSplitPct) / 100; // 20%

  // Calculate setter comp for the input volume
  const setterComp = useMemo(() => {
    const st = { ...sharedState, hourlyWage: roles.setter.hourlyWage, hoursPerWeek: roles.setter.hoursPerWeek, weeksPerYear: roles.setter.weeksPerYear };
    const comm = calcGrossCommission(appointmentVolume, st, true);
    const grossComm = comm.grossComm * setterSplit;
    const chargebacks = (grossComm - comm.terminalComm * setterSplit) * (st.chargebackRate / 100);
    const netComm = grossComm - chargebacks;
    const blendedRate = appointmentVolume > 0 ? (grossComm / appointmentVolume) * 100 : 0;
    const baseWage = roles.setter.hourlyWage * roles.setter.hoursPerWeek * roles.setter.weeksPerYear;
    return {
      baseWage, grossComm, chargebacks, netComm, blendedRate,
      totalAgentComp: baseWage + netComm,
      monthlyBonus: 0, annualMonthlyBonusTotal: 0, annualBonus: 0,
    };
  }, [appointmentVolume]);

  // Chart: $0-$10M appointment volume
  const setterChartData = useMemo(() => {
    const points = [];
    const st = { ...sharedState, hourlyWage: roles.setter.hourlyWage, hoursPerWeek: roles.setter.hoursPerWeek, weeksPerYear: roles.setter.weeksPerYear };
    const baseWage = roles.setter.hourlyWage * roles.setter.hoursPerWeek * roles.setter.weeksPerYear;
    for (let vol = 0; vol <= 10000000; vol += 200000) {
      const comm = calcGrossCommission(vol, st, true);
      const grossComm = comm.grossComm * setterSplit;
      const chargebacks = (grossComm - comm.terminalComm * setterSplit) * (st.chargebackRate / 100);
      const netComm = grossComm - chargebacks;
      points.push({ faceValue: vol, total_setter: baseWage + netComm });
    }
    return points;
  }, []);

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-navy-800">{ROLE_LABELS.setter}</h2>
        <p className="text-sm text-navy-500 mt-1">Compensation based on total face value of appointments you set that close.</p>
      </div>

      <RoleDescriptionCard roleKey="setter" />

      <CompAdvantages roleKey="setter" />

      {/* Volume Input */}
      <div className="bg-white rounded-xl shadow-sm border border-navy-100 p-6">
        <div className="max-w-xs">
          <InputGroup label="Appointments Sold (Annual Face Value)">
            <NumberInput value={appointmentVolume} onChange={setAppointmentVolume} min={0} max={10000000} step={250000} prefix="$" />
          </InputGroup>
        </div>
      </div>

      <PositionCard roleKey="setter" comm={setterComp} roleDefaults={roles.setter} />

      {/* Setter-specific chart: $0-$10M */}
      <section className="bg-navy-900 rounded-xl shadow-sm p-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wide mb-4">{ROLE_LABELS.setter} Compensation Curve</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={setterChartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#243b53" />
              <XAxis dataKey="faceValue" tickFormatter={fmtLarge} stroke="#9fb3c8" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmtLarge} stroke="#9fb3c8" tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#d9e2ec' }} />
              <ReferenceLine x={appointmentVolume} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: fmtLarge(appointmentVolume), fill: '#f59e0b', fontSize: 10 }} />
              <ReferenceLine y={50000} stroke="#3ebd93" strokeDasharray="4 4" label={{ value: '$50K', fill: '#3ebd93', fontSize: 10, position: 'left' }} />
              <ReferenceLine y={100000} stroke="#3ebd93" strokeDasharray="4 4" label={{ value: '$100K', fill: '#3ebd93', fontSize: 10, position: 'left' }} />
              <Line type="monotone" dataKey="total_setter" name={`${ROLE_LABELS.setter} Total Comp`} stroke={ROLE_COLORS.setter} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>
    </main>
  );
}

/* ─── Aftercare Demo View (stateful — has volume input + detailed breakdown + chart) ─── */
function AftercareDemoView({ roles, sharedState }) {
  const [aftercareVolume, setAftercareVolume] = useState(DEMO_AFTERCARE_VOLUME);

  const aftercareComp = useMemo(() => {
    const st = { ...sharedState, hourlyWage: roles.aftercare.hourlyWage, hoursPerWeek: roles.aftercare.hoursPerWeek, weeksPerYear: roles.aftercare.weeksPerYear };
    const bk = {
      closerAnnualVolume: DEMO_CLOSER_VOLUME,
      closerTotalProduction: DEMO_CLOSER_VOLUME,
      setterVolumeEach: DEMO_CLOSER_VOLUME,
      pctSetterSourced: BUCKET_DEFAULTS.pctSetterSourced,
      closerSplitPct: BUCKET_DEFAULTS.closerSplitPct,
      aftercareAnnualVolume: aftercareVolume,
    };
    return calcAftercareComp(st, bk, AFTERCARE_DEFAULTS.aftercareLeadPct, AFTERCARE_DEFAULTS.specialistShare, true);
  }, [aftercareVolume]);

  const aftercareChartData = useMemo(() => {
    const st = { ...sharedState, hourlyWage: roles.aftercare.hourlyWage, hoursPerWeek: roles.aftercare.hoursPerWeek, weeksPerYear: roles.aftercare.weeksPerYear };
    const points = [];
    for (let vol = 0; vol <= 3000000; vol += 50000) {
      const bk = {
        closerAnnualVolume: DEMO_CLOSER_VOLUME,
        closerTotalProduction: DEMO_CLOSER_VOLUME,
        setterVolumeEach: DEMO_CLOSER_VOLUME,
        pctSetterSourced: BUCKET_DEFAULTS.pctSetterSourced,
        closerSplitPct: BUCKET_DEFAULTS.closerSplitPct,
        aftercareAnnualVolume: vol,
      };
      const comp = calcAftercareComp(st, bk, AFTERCARE_DEFAULTS.aftercareLeadPct, AFTERCARE_DEFAULTS.specialistShare, true);
      points.push({ faceValue: vol, total_aftercare: comp.totalAgentComp });
    }
    return points;
  }, []);

  const perpCareFrac = (DEMO_DEFAULTS.mixCemetery / 100) * 0.70 * 0.15;
  const aftercareNetVolume = aftercareVolume * (1 - perpCareFrac);
  const roleVolumes = { aftercare: aftercareNetVolume };

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-navy-800">{ROLE_LABELS.aftercare}</h2>
        <p className="text-sm text-navy-500 mt-1">Compensation breakdown with 7.5% simplified commission.</p>
      </div>

      <RoleDescriptionCard roleKey="aftercare" />

      <CompAdvantages roleKey="aftercare" />

      {/* Volume Input */}
      <div className="bg-white rounded-xl shadow-sm border border-navy-100 p-6">
        <div className="max-w-xs">
          <InputGroup label="Total Volume Sold (Annual Face Value)">
            <NumberInput value={aftercareVolume} onChange={setAftercareVolume} min={0} max={3000000} step={100000} prefix="$" />
          </InputGroup>
        </div>
      </div>

      {/* Detailed Comp Breakdown */}
      <section className="bg-white rounded-xl shadow-sm border border-navy-100 overflow-hidden">
        <div className="px-6 py-3" style={{ backgroundColor: ROLE_COLORS.aftercare }}>
          <h3 className="text-sm font-bold text-white uppercase tracking-wide">{ROLE_LABELS.aftercare} Compensation Breakdown</h3>
        </div>
        <div className="px-6 py-4">
          <table className="w-full text-sm">
            <tbody>
              <Row label="Base Wage" sublabel={`$${roles.aftercare.hourlyWage}/hr x ${roles.aftercare.hoursPerWeek}hrs x ${roles.aftercare.weeksPerYear}wks`} value={aftercareComp.baseWage} />
              <tr className="border-t border-navy-100">
                <td className="py-1.5 font-semibold text-navy-700">Total Volume Sold</td>
                <td className="py-1.5 text-right font-semibold text-navy-700">{fmtLarge(aftercareVolume)}</td>
              </tr>
              <tr>
                <td className="py-1 text-navy-500 text-xs pl-3">Insurance & Cemetery commission at 7.5%</td>
                <td className="py-1 text-right text-navy-500 text-xs">{fmt(aftercareVolume * 0.075)}</td>
              </tr>
              <tr>
                <td className="py-1 text-navy-500 text-xs pl-3">Cemetery perp. care deduction (property portion)</td>
                <td className="py-1 text-right text-navy-500 text-xs">included</td>
              </tr>
              <tr className="border-t border-navy-200">
                <td className="py-2 font-semibold text-navy-800">
                  Gross Commission
                  <span className="block text-xs text-navy-400 font-normal">60/40 split — specialist keeps 60%, FD referral 40%</span>
                </td>
                <td className="py-2 text-right font-semibold text-navy-800">{fmt(aftercareComp.grossComm)}</td>
              </tr>
              <tr>
                <td className="py-1 text-red-600">Chargebacks ({DEMO_DEFAULTS.chargebackRate}%)</td>
                <td className="py-1 text-right text-red-600">-{fmt(aftercareComp.chargebacks)}</td>
              </tr>
              <tr className="border-t border-navy-200">
                <td className="py-2 font-semibold text-navy-800">Net Commission</td>
                <td className="py-2 text-right font-semibold text-navy-800">{fmt(aftercareComp.netComm)}</td>
              </tr>
              <tr>
                <td className="py-1 text-orange-600">FD Referral Share (40%)</td>
                <td className="py-1 text-right text-orange-600">-{fmt(aftercareComp.fdReferralShare)}</td>
              </tr>
              <tr className="border-t border-navy-200">
                <td className="py-2 font-semibold text-navy-800">Specialist Net Commission (60%)</td>
                <td className="py-2 text-right font-semibold text-navy-800">{fmt(aftercareComp.effectiveNetComm)}</td>
              </tr>
              <Row label="Monthly Bonuses" sublabel={aftercareComp.monthlyBonus > 0 ? `${fmt(aftercareComp.monthlyBonus)}/mo x 12` : 'Below threshold'} value={aftercareComp.annualMonthlyBonusTotal} />
              <Row label="Annual Bonus" sublabel="Highest qualifying tier" value={aftercareComp.annualBonus} />
              <tr className="border-t-2" style={{ borderColor: ROLE_COLORS.aftercare }}>
                <td className="py-3 font-bold text-base" style={{ color: ROLE_COLORS.aftercare }}>TOTAL ANNUAL COMP</td>
                <td className="py-3 text-right font-bold text-lg" style={{ color: ROLE_COLORS.aftercare }}>{fmt(aftercareComp.totalAgentComp)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Chart */}
      <section className="bg-navy-900 rounded-xl shadow-sm p-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wide mb-4">{ROLE_LABELS.aftercare} Compensation Curve</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={aftercareChartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#243b53" />
              <XAxis dataKey="faceValue" tickFormatter={fmtLarge} stroke="#9fb3c8" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmtLarge} stroke="#9fb3c8" tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#d9e2ec' }} />
              <ReferenceLine x={aftercareVolume} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: fmtLarge(aftercareVolume), fill: '#f59e0b', fontSize: 10 }} />
              <ReferenceLine y={50000} stroke="#3ebd93" strokeDasharray="4 4" label={{ value: '$50K', fill: '#3ebd93', fontSize: 10, position: 'left' }} />
              <ReferenceLine y={100000} stroke="#3ebd93" strokeDasharray="4 4" label={{ value: '$100K', fill: '#3ebd93', fontSize: 10, position: 'left' }} />
              <Line type="monotone" dataKey="total_aftercare" name={`${ROLE_LABELS.aftercare} Total Comp`} stroke={ROLE_COLORS.aftercare} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      <BonusTables roleFilter="aftercare" roleVolumes={roleVolumes} />
    </main>
  );
}

/* ─── Main Demo Comp Page ─── */
export default function DemoCompPage({ demoRole = 'all' }) {
  const roles = ROLE_DEFAULTS;
  const sharedState = {
    ...DEMO_DEFAULTS,
    hourlyWage: 13,
    hoursPerWeek: 40,
    weeksPerYear: 52,
  };

  const closerTotalProduction = DEMO_CLOSER_VOLUME * roles.closer.teamCount;
  const setterCap = 6000000;
  const setterCount = Math.ceil(closerTotalProduction / setterCap);
  const setterVolumeEach = setterCount > 0 ? closerTotalProduction / setterCount : 0;

  const buckets = {
    closerAnnualVolume: DEMO_CLOSER_VOLUME,
    closerTotalProduction,
    setterVolumeEach,
    pctSetterSourced: BUCKET_DEFAULTS.pctSetterSourced,
    closerSplitPct: BUCKET_DEFAULTS.closerSplitPct,
    aftercareAnnualVolume: DEMO_AFTERCARE_VOLUME,
  };

  const commByRole = useMemo(() => {
    const closerSt = { ...sharedState, hourlyWage: roles.closer.hourlyWage, hoursPerWeek: roles.closer.hoursPerWeek, weeksPerYear: roles.closer.weeksPerYear };
    const setterSt = { ...sharedState, hourlyWage: roles.setter.hourlyWage, hoursPerWeek: roles.setter.hoursPerWeek, weeksPerYear: roles.setter.weeksPerYear };
    const aftercareSt = { ...sharedState, hourlyWage: roles.aftercare.hourlyWage, hoursPerWeek: roles.aftercare.hoursPerWeek, weeksPerYear: roles.aftercare.weeksPerYear };

    return {
      closer: calcCloserComp(closerSt, buckets, true),
      setter: calcSetterComp(setterSt, buckets, true),
      aftercare: calcAftercareComp(aftercareSt, buckets, AFTERCARE_DEFAULTS.aftercareLeadPct, AFTERCARE_DEFAULTS.specialistShare, true),
    };
  }, []);

  const chartData = useMemo(() =>
    buildChartData(sharedState, roles, buckets, AFTERCARE_DEFAULTS.aftercareLeadPct, AFTERCARE_DEFAULTS.specialistShare, true),
  []);

  const perpCareFrac = (DEMO_DEFAULTS.mixCemetery / 100) * 0.70 * 0.15;
  const roleVolumes = {
    closer: DEMO_CLOSER_VOLUME * (1 - perpCareFrac),
    aftercare: DEMO_AFTERCARE_VOLUME * (1 - perpCareFrac),
  };

  if (demoRole === 'all') {
    return (
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-navy-800">Compensation Overview</h2>
          <p className="text-sm text-navy-500 mt-1">All roles at a glance with 7.5% simplified commission rates.</p>
        </div>

        <CompAdvantages />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <PositionCard roleKey="closer" comm={commByRole.closer} roleDefaults={roles.closer} />
          <PositionCard roleKey="setter" comm={commByRole.setter} roleDefaults={roles.setter} />
          <PositionCard roleKey="aftercare" comm={commByRole.aftercare} roleDefaults={roles.aftercare} />
        </div>

        <CompChart chartData={chartData} showRoles={['closer', 'setter', 'aftercare']} />

        <BonusTables roleFilter={null} roleVolumes={roleVolumes} />
      </main>
    );
  }

  if (demoRole === 'closer') {
    return <CloserDemoView roles={roles} sharedState={sharedState} />;
  }

  if (demoRole === 'setter') {
    return <SetterDemoView roles={roles} sharedState={sharedState} />;
  }

  if (demoRole === 'aftercare') {
    return <AftercareDemoView roles={roles} sharedState={sharedState} />;
  }

  return null;
}
