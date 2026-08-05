import React, { useState } from 'react';
import { Lock, Mail, AlertCircle, ArrowRight, Shield, Check } from 'lucide-react';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      
      // Delay transitioning to dashboard to allow success animations to finish smoothly
      setTimeout(() => {
        onLogin({
          name: 'Sathinath',
          email: email || 'admin@neproplast.com',
          role: 'Junior AI Engineer'
        });
      }, 1100);
    }, 800);
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-[#04060a] overflow-hidden relative font-sans p-4">
      
      {/* Custom Styles optimized for GPU acceleration and zero-lag rendering */}
      <style>{`
        @keyframes rotate-slow {
          0% { transform: translate3d(0,0,0) rotate(0deg); }
          100% { transform: translate3d(0,0,0) rotate(360deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { transform: scale(1) translate3d(0,0,0); opacity: 0.55; }
          50% { transform: scale(1.015) translate3d(0,0,0); opacity: 0.75; }
        }
        @keyframes login-success-card {
          0% { transform: scale(1) translate3d(0, 0, 0); opacity: 1; }
          100% { transform: scale(0.94) translate3d(0, -10px, 0); opacity: 0; }
        }
        @keyframes portal-active {
          0% { transform: scale(1) translate3d(0,0,0); opacity: 0.55; }
          100% { transform: scale(1.15) translate3d(0,0,0); opacity: 0.85; }
        }
        .animate-rotate-slow {
          animation: rotate-slow 60s linear infinite;
          will-change: transform;
        }
        .animate-pulse-glow {
          animation: pulse-glow 8s ease-in-out infinite;
          will-change: transform, opacity;
        }
        .animate-success-card {
          animation: login-success-card 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          will-change: transform, opacity;
        }
        .animate-portal-active {
          animation: portal-active 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          will-change: transform, opacity;
        }
        .animate-svg-rev {
          animation: rotate-slow 25s linear infinite reverse;
          will-change: transform;
        }
        .animate-svg-fwd {
          animation: rotate-slow 20s linear infinite;
          will-change: transform;
        }
        .neon-portal-bg {
          position: absolute;
          width: 480px;
          height: 480px;
          border-radius: 50%;
          border: 1.5px solid rgba(59, 130, 246, 0.15);
          box-shadow: 
            0 0 15px rgba(59, 130, 246, 0.1),
            inset 0 0 15px rgba(59, 130, 246, 0.1),
            0 0 35px rgba(99, 102, 241, 0.05),
            inset 0 0 35px rgba(99, 102, 241, 0.05);
        }
        .neon-portal-bg::before {
          content: '';
          position: absolute;
          inset: -10px;
          border-radius: 50%;
          border: 1px solid rgba(99, 102, 241, 0.08);
        }
        .inner-orbit {
          position: absolute;
          inset: -25px;
          border: 1px dashed rgba(59, 130, 246, 0.06);
          border-radius: 50%;
          animation: rotate-slow 70s linear infinite reverse;
          will-change: transform;
        }
        .glow-point {
          position: absolute;
          width: 4px;
          height: 4px;
          background: #60a5fa;
          border-radius: 50%;
          opacity: 0.65;
          box-shadow: 0 0 6px #60a5fa;
        }
      `}</style>

      {/* Ambient Radial Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/5 blur-[130px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/5 blur-[130px] pointer-events-none animate-pulse" />
      
      {/* ── BACKGROUND PORTAL RING FRAME (Centered behind the form) ── */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] flex items-center justify-center pointer-events-none z-0 ${
        success ? 'animate-portal-active' : 'animate-pulse-glow'
      }`}>
        
        {/* SVG Tech HUD Overlay (Centered and scaled behind form) */}
        <svg className="absolute w-[520px] h-[520px] pointer-events-none" viewBox="0 0 100 100">
          {/* Ticks */}
          <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(99, 102, 241, 0.06)" strokeWidth="0.8" strokeDasharray="0.5 3" className="origin-center animate-svg-fwd" />
          {/* Segmented rotating layers */}
          <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(59, 130, 246, 0.15)" strokeWidth="1.2" strokeDasharray="20 40 10 30" className="origin-center animate-svg-rev" />
          <circle cx="50" cy="50" r="41" fill="none" stroke="rgba(99, 102, 241, 0.1)" strokeWidth="0.6" strokeDasharray="4 8" className="origin-center animate-svg-fwd" />
        </svg>

        {/* Outer Neon Ring */}
        <div className="neon-portal-bg flex items-center justify-center">
          {/* Particle orbits */}
          <div className="inner-orbit" />
          <div className="inner-orbit" style={{ animationDuration: '45s', inset: '-40px', borderColor: 'rgba(99, 102, 241, 0.05)' }} />
          
          <div className="absolute w-[460px] h-[460px] animate-rotate-slow">
            <div className="glow-point top-12 left-1/2 -ml-0.5" />
            <div className="glow-point bottom-24 left-16" />
            <div className="glow-point top-36 right-12" />
          </div>
          
          {/* Crosshairs lines visible on the outer edges of the portal */}
          <div className="absolute w-[400px] h-[400px] border border-slate-900/10 rounded-full" />
          <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-slate-800/10 to-transparent" />
          <div className="absolute w-[1px] h-full bg-gradient-to-b from-transparent via-slate-800/10 to-transparent" />
        </div>

      </div>

      {/* ── CENTRED SIGN IN FORM (In front of the portal ring background) ── */}
      <div className={`w-full max-w-[390px] bg-[#0c0f17]/70 backdrop-blur-xl border border-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-2xl p-7 sm:p-8 space-y-6 z-10 transition-all duration-300 hover:border-blue-500/20 relative ${
        success ? 'animate-success-card' : ''
      }`}>
        
        {/* Logo and Branding header */}
        <div className="flex flex-col items-center text-center space-y-3.5">
          <div className="relative group">
            {/* Soft glowing aura around logo */}
            <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 blur opacity-30 group-hover:opacity-45 transition-opacity" />
            <img 
              src="/favicon.png" 
              alt="Neproplast Logo" 
              className="w-12 h-12 object-contain rounded-xl bg-[#07090f] p-1.5 border border-slate-800/80 relative z-10" 
            />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-extrabold text-white tracking-wide uppercase">Neproplast Portal</h2>
            <p className="text-[10px] text-blue-400 font-bold tracking-widest uppercase">Procurement AI</p>
          </div>
        </div>

        <div className="space-y-1.5 text-center">
          <h1 className="text-lg font-bold text-white tracking-tight">Sign In Workspace</h1>
          <p className="text-[11px] text-slate-400">Please enter your credentials to log in.</p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
          
          <div className="flex flex-col space-y-1.5">
            <label className="text-slate-400">Email Address</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                readOnly
                onFocus={(e) => e.target.removeAttribute('readonly')}
                autoComplete="off"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950/45 border border-slate-900 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all font-medium"
                required
              />
              <Mail className="absolute left-3 top-3.5 text-slate-500" size={13} />
            </div>
          </div>

          <div className="flex flex-col space-y-1.5">
            <label className="text-slate-400">Security Password</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                readOnly
                onFocus={(e) => e.target.removeAttribute('readonly')}
                autoComplete="new-password"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950/45 border border-slate-900 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all font-medium"
                required
              />
              <Lock className="absolute left-3 top-3.5 text-slate-500" size={13} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className={`w-full text-white py-2.5 rounded-lg text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 mt-1 ${
              success ? 'bg-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.3)] border border-emerald-500/20' : 'bg-[#2563eb] hover:bg-[#1d4ed8]'
            }`}
          >
            {success ? (
              <>
                <Check size={13} className="animate-bounce" />
                <span>Access Granted</span>
              </>
            ) : loading ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                <span>Verifying Identity...</span>
              </>
            ) : (
              <>
                <span>Sign In Workspace</span>
                <ArrowRight size={13} />
              </>
            )}
          </button>

        </form>

        <div className="flex items-center justify-center gap-1.5 text-[9px] text-slate-500 text-center font-bold pt-4 border-t border-slate-900/40">
          <Shield size={10} className="text-blue-500/50" />
          <span>Neproplast Logistics Portal v1.0.0</span>
        </div>

      </div>

    </div>
  );
}
