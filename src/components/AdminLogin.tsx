import React, { useState } from 'react';
import { Lock, Mail, Shield, AlertCircle, Loader2 } from 'lucide-react';
import { AdminUser } from '../types';
import { rtdb, ref, get } from '../firebase';

interface AdminLoginProps {
  onLoginSuccess: (user: AdminUser) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    
    setLoading(true);
    setError('');

    try {
      // Super Admin check (Hardcoded fallback)
      if (cleanEmail === 'deepshop@gmail.com' && password === '95872555sS') {
        onLoginSuccess({
          email: 'deepshop@gmail.com',
          role: 'superadmin',
          gatewayTag: 'all',
        });
        return;
      }

      // Fetch admins from RTDB
      const snapshot = await get(ref(rtdb, 'admins'));
      if (snapshot.exists()) {
        const admins: Record<string, AdminUser> = snapshot.val();
        const matchedAdmin = Object.values(admins).find(
          (a) => a.email.toLowerCase() === cleanEmail && a.password === password
        );

        if (matchedAdmin) {
          onLoginSuccess(matchedAdmin);
          return;
        }
      }

      // Legacy sub-user fallback
      if (
        cleanEmail === 'paymentdomaingetway@gmail.com' &&
        password === '01959684488@@'
      ) {
        onLoginSuccess({
          email: 'paymentdomaingetway@gmail.com',
          role: 'subuser',
          gatewayTag: 'p9k2m7',
        });
        return;
      }

      setError('Invalid email or password. Please try again.');
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/30 mb-3">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Admin Gateway Login</h1>
          <p className="text-xs text-slate-400 mt-1">Authorized personnel access only</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-95 text-sm mt-2 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};
