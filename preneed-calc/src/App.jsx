import { useState } from 'react';
import ProductStrategyPage from './pages/ProductStrategyPage';
import PayInFullPage from './pages/PayInFullPage';
import HealthyPayoutPage from './pages/HealthyPayoutPage';
import UnhealthyPayoutPage from './pages/UnhealthyPayoutPage';
import CommissionsPage from './pages/CommissionsPage';
import EnterprisePnlPage from './pages/EnterprisePnlPage';

const ADMIN_TABS = [
  { key: 'strategy', label: 'Product Strategy' },
  { key: 'payinfull', label: 'Pay In Full' },
  { key: 'healthy', label: 'Healthy Payout' },
  { key: 'unhealthy', label: 'Unhealthy Payout' },
  { key: 'commissions', label: 'Commissions' },
  { key: 'enterprise', label: 'Enterprise P&L' },
];

const DEMO_TABS = [
  { key: 'strategy', label: 'Product Strategy' },
  { key: 'commissions', label: 'Commissions' },
];

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [mode, setMode] = useState('admin'); // 'admin' or 'demo'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState('strategy');

  // Calculator state — persists across tab switches
  const [faceValue, setFaceValue] = useState(10000);
  const [customerAge, setCustomerAge] = useState(65);
  const [paymentTermYears, setPaymentTermYears] = useState(5);
  const [earnRate, setEarnRate] = useState(4.5);
  const [yearsUntilClaim, setYearsUntilClaim] = useState(10);
  const [financeChargeRate, setFinanceChargeRate] = useState(7);
  const [tjmTaxRate, setTjmTaxRate] = useState(4);
  const [trustTaxRate, setTrustTaxRate] = useState(10);
  const [passThroughTaxRate, setPassThroughTaxRate] = useState(37);
  const [dividendExitTaxRate, setDividendExitTaxRate] = useState(20);
  const [overrideMonthlyRate, setOverrideMonthlyRate] = useState('');
  const [guaranteedRate, setGuaranteedRate] = useState(2);
  const [trustEarnRate, setTrustEarnRate] = useState(4.5);

  function handleLogin(e) {
    e.preventDefault();
    if (email === 'Sloan@tjmfuneral.com' && password === 'Hillstone1922**') {
      setLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError('Invalid email or password');
    }
  }

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-teal-500 flex items-center justify-center font-bold text-navy-900 text-2xl mx-auto mb-4">TJM</div>
            <h1 className="text-2xl font-bold text-white tracking-tight">TJM Life Insurance Company</h1>
            <p className="text-navy-300 text-sm mt-1">Preneed Product Comparison Calculator</p>
          </div>
          <form onSubmit={handleLogin} className="bg-white rounded-xl shadow-lg p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
            {/* Admin / Demo Toggle */}
            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setMode('admin')}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  mode === 'admin'
                    ? 'bg-navy-800 text-white'
                    : 'bg-navy-100 text-navy-500 hover:bg-navy-200'
                }`}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => setMode('demo')}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  mode === 'demo'
                    ? 'bg-teal-500 text-navy-900'
                    : 'bg-navy-100 text-navy-500 hover:bg-navy-200'
                }`}
              >
                Demo
              </button>
            </div>
            {loginError && <p className="text-red-600 text-sm font-medium">{loginError}</p>}
            <button
              type="submit"
              className="w-full bg-teal-500 hover:bg-teal-600 text-navy-900 font-semibold py-2.5 rounded-lg transition-colors text-sm"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-50">
      {/* Header */}
      <header className="bg-navy-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 py-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center font-bold text-navy-900 text-lg">TJM</div>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">TJM Life Insurance Company</h1>
              <p className="text-navy-300 text-sm">Preneed Product Comparison Calculator</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="flex gap-1 -mb-px">
            {(mode === 'demo' ? DEMO_TABS : ADMIN_TABS).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === tab.key
                    ? 'bg-navy-50 text-navy-900'
                    : 'text-navy-300 hover:text-white hover:bg-navy-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Page Content */}
      {activeTab === 'strategy' && <ProductStrategyPage />}
      {activeTab === 'payinfull' && (
        <PayInFullPage
          faceValue={faceValue} setFaceValue={setFaceValue}
          customerAge={customerAge} setCustomerAge={setCustomerAge}
          earnRate={earnRate} setEarnRate={setEarnRate}
          yearsUntilClaim={yearsUntilClaim} setYearsUntilClaim={setYearsUntilClaim}
          tjmTaxRate={tjmTaxRate} setTjmTaxRate={setTjmTaxRate}
          trustTaxRate={trustTaxRate} setTrustTaxRate={setTrustTaxRate}
          passThroughTaxRate={passThroughTaxRate} setPassThroughTaxRate={setPassThroughTaxRate}
          dividendExitTaxRate={dividendExitTaxRate} setDividendExitTaxRate={setDividendExitTaxRate}
          guaranteedRate={guaranteedRate} setGuaranteedRate={setGuaranteedRate}
          trustEarnRate={trustEarnRate} setTrustEarnRate={setTrustEarnRate}
        />
      )}
      {activeTab === 'healthy' && (
        <HealthyPayoutPage
          faceValue={faceValue} setFaceValue={setFaceValue}
          customerAge={customerAge} setCustomerAge={setCustomerAge}
          paymentTermYears={paymentTermYears} setPaymentTermYears={setPaymentTermYears}
          earnRate={earnRate} setEarnRate={setEarnRate}
          yearsUntilClaim={yearsUntilClaim} setYearsUntilClaim={setYearsUntilClaim}
          financeChargeRate={financeChargeRate} setFinanceChargeRate={setFinanceChargeRate}
          tjmTaxRate={tjmTaxRate} setTjmTaxRate={setTjmTaxRate}
          trustTaxRate={trustTaxRate} setTrustTaxRate={setTrustTaxRate}
          passThroughTaxRate={passThroughTaxRate} setPassThroughTaxRate={setPassThroughTaxRate}
          dividendExitTaxRate={dividendExitTaxRate} setDividendExitTaxRate={setDividendExitTaxRate}
          overrideMonthlyRate={overrideMonthlyRate} setOverrideMonthlyRate={setOverrideMonthlyRate}
          guaranteedRate={guaranteedRate} setGuaranteedRate={setGuaranteedRate}
          trustEarnRate={trustEarnRate} setTrustEarnRate={setTrustEarnRate}
        />
      )}
      {activeTab === 'unhealthy' && (
        <UnhealthyPayoutPage
          faceValue={faceValue} setFaceValue={setFaceValue}
          customerAge={customerAge} setCustomerAge={setCustomerAge}
          paymentTermYears={paymentTermYears} setPaymentTermYears={setPaymentTermYears}
          earnRate={earnRate} setEarnRate={setEarnRate}
          yearsUntilClaim={yearsUntilClaim} setYearsUntilClaim={setYearsUntilClaim}
          financeChargeRate={financeChargeRate} setFinanceChargeRate={setFinanceChargeRate}
          tjmTaxRate={tjmTaxRate} setTjmTaxRate={setTjmTaxRate}
          trustTaxRate={trustTaxRate} setTrustTaxRate={setTrustTaxRate}
          passThroughTaxRate={passThroughTaxRate} setPassThroughTaxRate={setPassThroughTaxRate}
          dividendExitTaxRate={dividendExitTaxRate} setDividendExitTaxRate={setDividendExitTaxRate}
          guaranteedRate={guaranteedRate} setGuaranteedRate={setGuaranteedRate}
          trustEarnRate={trustEarnRate} setTrustEarnRate={setTrustEarnRate}
        />
      )}
      {activeTab === 'commissions' && <CommissionsPage demoMode={mode === 'demo'} />}
      {activeTab === 'enterprise' && <EnterprisePnlPage />}
    </div>
  );
}
