import React, { useState, useEffect } from 'react';
import { Shield, CreditCard, LogOut, ArrowRight, Activity, CheckCircle, AlertTriangle } from 'lucide-react';

// ==========================================
// 1. Safe SDK Wrapper
// Encapsulates the real cdApi methods for defensive programming.
// ==========================================
const SafeSDK = {
  _currentCSID: 'csid_' + crypto.randomUUID().split('-')[0],

  getCSID: function() {
    return this._currentCSID;
  },

  changeContext: function(contextName) {
    if (window.cdApi && typeof window.cdApi.changeContext === 'function') {
      window.cdApi.changeContext(contextName);
      console.log(`[SDK Call] changeContext('${contextName}')`);
    }
  },

  setCustomerSessionId: function(csid) {
    this._currentCSID = csid;
    if (window.cdApi && typeof window.cdApi.setCustomerSessionId === 'function') {
      window.cdApi.setCustomerSessionId(csid);
      console.log(`[SDK Call] setCustomerSessionId('${csid}')`);
    }
  },

  startNewSession: function() {
    this._currentCSID = 'csid_' + crypto.randomUUID().split('-')[0];
    if (window.cdApi && typeof window.cdApi.startNewSession === 'function') {
      window.cdApi.startNewSession();
    }
  },

  sendMetadata: function(data) {
    if (window.cdApi && typeof window.cdApi.sendMetadata === 'function') {
      window.cdApi.sendMetadata(data);
      console.log('[SDK Call] sendMetadata', data);
    }
  }
};

// ==========================================
// 2. Mock Fetch - Simulating Bank & S2S APIs
// ==========================================
const mockFetch = async (url, options = {}) => {
  await new Promise(resolve => setTimeout(resolve, 800));

  if (url === '/api/login') {
    const body = JSON.parse(options.body);
    if (body.username === 'admin' && body.password === '1234') {
      return { ok: true, json: async () => ({ token: 'fake-jwt-token', user: { id: 'U-9876', name: 'Doriel Aboya', balance: 54300 } }) };
    }
    return { ok: false, status: 401, json: async () => ({ message: 'Invalid username or password' }) };
  }

  if (url === '/api/transfer') {
    const body = JSON.parse(options.body);
    // Simulation: Account "0000" triggers a server-side failure
    if (body.targetAccount === '0000') {
      return { ok: false, status: 400, json: async () => ({ message: 'Insufficient funds or invalid target account.' }) };
    }
    return { ok: true, json: async () => ({ transactionId: `TXN-${Math.floor(Math.random() * 1000000)}`, status: 'success' }) };
  }

  if (url === '/api/biocatch/init') {
    return { ok: true, json: async () => ({ status: 'initialized' }) };
  }

  if (url === '/api/biocatch/getScore') {
    const body = JSON.parse(options.body);
    const riskScore = body.amount > 20000 ? 950 : 150;
    const action = riskScore >= 800 ? 'DENY' : 'ALLOW';
    return { ok: true, json: async () => ({ score: riskScore, action: action }) };
  }

  return { ok: false, status: 404, json: async () => ({ message: 'Not found' }) };
};

// ==========================================
// 3. Main Application Component
// ==========================================
export default function App() {
  const [currentPage, setCurrentPage] = useState('login');
  const [user, setUser] = useState(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://bcdn-4ff4f23f.we-stats.com/scripts/4ff4f23f/4ff4f23f.js'; 
    script.async = true;

    script.onload = () => {
      console.log('✅ SDK script loaded from CDN');
      if (window.cdApi) {
        window.DummySDK = window.cdApi; 
        setSdkLoaded(true);
        SafeSDK.setCustomerSessionId(SafeSDK.getCSID());
      }
    };

    document.head.appendChild(script);
    return () => {
      if (document.head.contains(script)) document.head.removeChild(script);
    };
  }, []); 

  useEffect(() => {
    if (sdkLoaded) SafeSDK.changeContext(currentPage);
  }, [currentPage, sdkLoaded]);

  const handleLoginSuccess = async (userData) => {
    setUser(userData);
    setCurrentPage('dashboard');
    SafeSDK.setCustomerSessionId(SafeSDK.getCSID());
  };

  const handleLogout = () => {
    SafeSDK.startNewSession();
    setUser(null);
    setCurrentPage('login');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans" dir="ltr">
      <header className="bg-blue-900 text-white p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-300" />
          <h1 className="text-xl font-bold tracking-wide">BankApp Secure</h1>
        </div>
        {user && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-blue-200">Hello, {user.name}</span>
            <button onClick={handleLogout} data-bb="logout-btn" className="text-white hover:text-red-300 transition flex items-center gap-1 text-sm">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        )}
      </header>

      <main className="max-w-md mx-auto mt-10 p-4">
        {currentPage === 'login' && <LoginView onLogin={handleLoginSuccess} />}
        {currentPage === 'dashboard' && user && <DashboardView user={user} onNavigate={setCurrentPage} />}
        {currentPage === 'transfer' && user && <TransferView user={user} onNavigate={setCurrentPage} />}
        {currentPage === 'success' && <SuccessView onNavigate={setCurrentPage} />}
      </main>

      <div className="fixed bottom-0 left-0 w-full bg-slate-900 text-green-400 p-2 text-xs font-mono opacity-80 pointer-events-none text-left">
        <div className="flex items-center gap-2 mb-1 text-slate-300">
          <Activity className="w-3 h-3" /> Status: {sdkLoaded ? 'SDK Active' : 'Loading SDK...'}
        </div>
      </div>
    </div>
  );
}

// --- Views ---

function LoginView({ onLogin }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('1234');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await mockFetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok) {
        console.log('🔄 Triggering S2S INIT call...');
        try {
          await fetch('https://hooks.zapier.com/hooks/catch/19247019/uwr0vff/', {
            method: 'POST',
            // mode: 'no-cors',
            body: JSON.stringify({ 
              uuid: crypto.randomUUID(),
              customerId: data.user.id,
              action: 'init',
              customerSessionId: SafeSDK.getCSID(),
              activityType: 'LOGIN',
              brand: 'SD',
              solution: 'ATO',
              iam: 'USER_AUTH_SYSTEM'
            })
          });
        } catch (err) {}

        onLogin(data.user);
      } else {
        setError(data.message || 'Login error');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100">
      <h2 className="text-2xl font-semibold mb-6 text-center text-slate-800">Account Login</h2>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-100">{error}</div>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Username</label>
          <input type="text" data-bb="login-username" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Password</label>
          <input type="password" data-bb="login-password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        </div>
        <button type="submit" data-bb="login-submit" disabled={loading} className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition disabled:opacity-50">
          {loading ? 'Logging in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}

function DashboardView({ user, onNavigate }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 rounded-xl shadow-lg text-white">
        <p className="text-blue-200 text-sm mb-1">Available Balance</p>
        <h2 className="text-3xl font-bold flex justify-between items-center">
          <span>${user.balance.toLocaleString()}</span>
        </h2>
      </div>
      <div className="grid grid-cols-1 mt-4">
        <button onClick={() => onNavigate('transfer')} data-bb="nav-transfer-btn" className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-3 hover:shadow-md transition text-slate-700">
          <div className="bg-blue-50 p-3 rounded-full text-blue-600"><CreditCard className="w-6 h-6" /></div>
          <span className="font-medium">Transfer Funds</span>
        </button>
      </div>
    </div>
  );
}

function TransferView({ user, onNavigate }) {
  const [amount, setAmount] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTransfer = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('🔄 Triggering S2S GET_SCORE call...');
      try {
        await fetch('https://hooks.zapier.com/hooks/catch/19247019/uwr0vff/', {
          method: 'POST',
          // mode: 'no-cors',
          body: JSON.stringify({ 
            uuid: crypto.randomUUID(),
            customerId: user.id,
            action: 'getScore',
            customerSessionId: SafeSDK.getCSID(),
            activityType: 'PAYMENT_TRANSFER',
            brand: 'SD',
            solution: 'ATO',
            iam: 'USER_AUTH_SYSTEM',
            amount: Number(amount) 
          })
        });
      } catch (err) {}
      
      const riskScore = Number(amount) > 20000 ? 950 : 150;
      if (riskScore >= 800) {
        setError(`Transaction blocked by Risk Engine. Suspicious behavior detected (Score: ${riskScore}).`);
        setLoading(false);
        return; 
      }

      // Execute actual transfer
      const response = await mockFetch('/api/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(amount), targetAccount: accountNumber })
      });

      const data = await response.json();

      if (response.ok) {
        // Success path
        SafeSDK.sendMetadata({ action: 'transfer_success', amount: Number(amount) });
        onNavigate('success');
      } else {
        // ERROR HANDLING IMPLEMENTATION: Handle failed payment
        console.error('❌ Transfer failed:', data.message);
        
        // Report failure to the SDK
        SafeSDK.sendMetadata({ 
          action: 'transfer_failed', 
          reason: data.message, 
          errorCode: response.status 
        });

        setError(data.message || 'Transaction failed. Please contact support.');
      }
    } catch (err) {
      setError('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => onNavigate('dashboard')} className="text-slate-400 hover:text-slate-600"><ArrowRight className="w-5 h-5" /></button>
        <h2 className="text-xl font-semibold text-slate-800">Payment Transfer</h2>
      </div>
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-100 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}
      <form onSubmit={handleTransfer} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Amount ($)</label>
          <input type="number" required data-bb="transfer-amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          <p className="text-xs text-slate-400 mt-1">Tip: Use account "0000" to simulate a transfer failure.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Destination Account</label>
          <input type="text" required data-bb="transfer-account" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>
        <button type="submit" data-bb="transfer-submit" disabled={loading || !amount || !accountNumber} className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition disabled:opacity-50">
          {loading ? 'Evaluating Risk...' : 'Confirm Payment'}
        </button>
      </form>
    </div>
  );
}

function SuccessView({ onNavigate }) {
  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 text-center flex flex-col items-center">
      <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
        <CheckCircle className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Payment Successful</h2>
      <button onClick={() => onNavigate('dashboard')} className="text-blue-600 font-medium hover:underline">Return to Dashboard</button>
    </div>
  );
}