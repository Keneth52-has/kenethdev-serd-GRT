import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, User, Lock, ArrowRight, AlertCircle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!employeeId || !password) {
      setError('Please provide both Employee ID and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(employeeId, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (empId, pass) => {
    setEmployeeId(empId);
    setPassword(pass);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-8 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle Background Glow Elements */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Brand Icon & Heading */}
        <div className="text-center">
          <div className="mx-auto w-24 h-24 rounded-3xl bg-white p-1.5 flex items-center justify-center shadow-2xl shadow-emerald-950/60 ring-4 ring-emerald-500/30 overflow-hidden">
            <img
              src="/serd-logo.jpg"
              alt="SERD FOUNDATION"
              className="w-full h-full object-contain"
            />
          </div>
          <h2 className="mt-4 text-2xl sm:text-3xl font-black text-white tracking-tight">
            SERD FOUNDATION
          </h2>
          <div className="inline-block mt-1 px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/30">
            GRT FORM (Group Recognition Test)
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            Field Member Photo & GPS Geotag Verification Portal
          </p>
        </div>

        {/* Login Box */}
        <div className="mt-7 bg-slate-800/90 backdrop-blur-md border border-slate-700/80 py-7 px-5 sm:px-8 shadow-2xl rounded-2xl">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Employee ID / Username
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="e.g. EMP001 or ADMIN001"
                  className="w-full pl-10 pr-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold rounded-xl text-sm shadow-lg shadow-emerald-950/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Sign In to SERD Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Login Selectors */}
          <div className=" hidden mt-7 pt-6 border-t border-slate-700/60">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5 text-center">
              Quick Demo Login
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('EMP001', 'field123')}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-700/60 text-left transition-all group"
              >
                <div>
                  <div className="text-xs font-bold text-emerald-400 group-hover:text-emerald-300">
                    Field Officer
                  </div>
                  <div className="text-[11px] text-slate-400">Ramesh K. (EMP001)</div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-slate-600 group-hover:text-emerald-400" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('ADMIN001', 'admin123')}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-700/60 text-left transition-all group"
              >
                <div>
                  <div className="text-xs font-bold text-amber-400 group-hover:text-amber-300">
                    System Admin
                  </div>
                  <div className="text-[11px] text-slate-400">Admin (ADMIN001)</div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-slate-600 group-hover:text-amber-400" />
              </button>
            </div>
          </div>

        </div>

        {/* Security Footer Notice */}
        <p className="mt-6 text-center text-xs text-slate-500">
          SERD FOUNDATION • Microfinance & Rural Development Services
        </p>
      </div>
    </div>
  );
}
