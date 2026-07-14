import React, { useState } from 'react';
import { Lock, Mail, Bot, AlertCircle } from 'lucide-react';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@neproplast.com');
  const [password, setPassword] = useState('neproplast2026');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Mock validation
    setTimeout(() => {
      if (email === 'admin@neproplast.com' && password === 'neproplast2026') {
        onLogin({
          name: 'Sathinath',
          email: 'admin@neproplast.com',
          role: 'Lead Procurement Manager'
        });
      } else {
        setError('Invalid email or password. Use the demo credentials provided below.');
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col p-8 space-y-6 animate-in fade-in zoom-in duration-300">
        
        {/* Brand/Branding header */}
        <div className="text-center space-y-3">
          <img src="/favicon.png" alt="Neproplast Logo" className="w-14 h-14 object-contain rounded-2xl mx-auto shadow-md bg-white p-1 border border-slate-100" />
          <h1 className="text-xl font-bold text-slate-800">Neproplast Procurement AI</h1>
          <p className="text-xs text-slate-400">Enterprise AI-Driven Supply Chain Management</p>
        </div>

        {/* Credentials Box */}
        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-[11px] text-slate-600 leading-relaxed space-y-1">
          <div className="font-bold text-[#0078d4] flex items-center gap-1 mb-1">
            <Bot size={14} />
            <span>Demo User Access Credentials</span>
          </div>
          <div>Login Email: <span className="font-semibold select-all text-slate-850">admin@neproplast.com</span></div>
          <div>Password: <span className="font-semibold select-all text-slate-850">neproplast2026</span></div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-700 px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
          
          <div className="flex flex-col space-y-1">
            <label className="text-slate-500 font-semibold">Email Address</label>
            <div className="relative">
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. admin@neproplast.com"
                className="w-full pl-9 pr-3 py-2.5 border border-slate-350 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0078d4]/30 focus:border-[#0078d4]"
                required
              />
              <Mail className="absolute left-3 top-3 text-slate-400" size={14} />
            </div>
          </div>

          <div className="flex flex-col space-y-1">
            <label className="text-slate-500 font-semibold">Security Password</label>
            <div className="relative">
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 border border-slate-350 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0078d4]/30 focus:border-[#0078d4]"
                required
              />
              <Lock className="absolute left-3 top-3 text-slate-400" size={14} />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-[#0078d4] hover:bg-[#106ebe] text-white py-2.5 rounded-lg text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:bg-[#0078d4] mt-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                <span>Securing session...</span>
              </>
            ) : (
              'Sign In Workspace'
            )}
          </button>

        </form>

        <div className="text-[10px] text-slate-400 text-center font-medium pt-2 border-t border-slate-100">
          Neproplast Logistics Portal v1.0.0
        </div>

      </div>
    </div>
  );
}
