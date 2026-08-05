import React, { useState } from 'react';
import { 
  Lock, Mail, Bot, AlertCircle, Sparkles, FileText, 
  Cpu, Database, CheckCircle2, Globe, Layers, ArrowRight, ShieldCheck
} from 'lucide-react';

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
        setError('Invalid email or password. Use the demo credentials provided.');
        setLoading(false);
      }
    }, 1200);
  };

  return (
    <div className="min-h-screen w-screen flex flex-col md:flex-row bg-[#080b11] text-slate-200 overflow-hidden font-sans relative">
      
      {/* Custom Styles for 3D Motion and Animations */}
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(1deg); }
        }
        @keyframes float-medium {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-18px) rotate(-1.5deg); }
        }
        @keyframes float-fast {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(0.5deg); }
        }
        @keyframes grid-move {
          0% { background-position: 0 0; }
          100% { background-position: 0 40px; }
        }
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes radar-pulse {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.1); opacity: 0.4; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
        .animate-float-slow {
          animation: float-slow 7s ease-in-out infinite;
        }
        .animate-float-medium {
          animation: float-medium 5s ease-in-out infinite;
        }
        .animate-float-fast {
          animation: float-fast 4s ease-in-out infinite;
        }
        .animate-grid {
          animation: grid-move 20s linear infinite;
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient-shift 6s ease infinite;
        }
        .animate-radar {
          animation: radar-pulse 3s infinite ease-in-out;
        }
        .perspective-lg {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .glass-panel {
          background: rgba(19, 25, 36, 0.7);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .glass-card-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .glass-card-hover:hover {
          transform: translateY(-5px) scale(1.02);
          border-color: rgba(99, 102, 241, 0.4);
          box-shadow: 0 10px 30px -10px rgba(99, 102, 241, 0.3);
        }
      `}</style>

      {/* Ambient Glow Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-[30%] left-[40%] w-[350px] h-[350px] rounded-full bg-emerald-600/5 blur-[90px] pointer-events-none animate-pulse" />

      {/* ── LEFT PANEL: Immersive 3D Motion SaaS Showcase ── */}
      <div className="hidden md:flex md:w-[55%] flex-col justify-between p-12 relative overflow-hidden bg-[#0a0d16] border-r border-slate-800/40">
        
        {/* Animated Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] opacity-[0.15] animate-grid pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080b11] via-transparent to-transparent pointer-events-none" />

        {/* Top Header Logo */}
        <div className="flex items-center gap-3 z-10">
          <div className="relative">
            <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 blur opacity-60 animate-pulse" />
            <img src="/favicon.png" alt="Neproplast Logo" className="w-10 h-10 object-contain rounded-xl bg-[#0d111a] p-1.5 border border-slate-700 relative z-10" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-100">Neproplast</h2>
            <p className="text-[10px] text-indigo-400 font-bold tracking-widest uppercase">Procurement AI</p>
          </div>
        </div>

        {/* 3D Motion Flow Visualizer */}
        <div className="my-auto relative flex flex-col items-center justify-center perspective-lg transform-style-3d py-10 z-10">
          
          {/* Central Glow Core */}
          <div className="absolute w-48 h-48 rounded-full bg-indigo-500/10 blur-[60px] animate-pulse pointer-events-none" />

          {/* Visual Component 1: RFQ Processing Card */}
          <div className="w-80 glass-panel rounded-2xl p-4 shadow-2xl border border-slate-700/30 animate-float-slow transform-style-3d mb-5 relative glass-card-hover">
            <div className="absolute -top-3 -left-3 w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <FileText size={16} />
            </div>
            <div className="pl-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-200">RFQ-2026-004.pdf</span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-extrabold animate-pulse">Parsed 100%</span>
              </div>
              <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full w-[100%] rounded-full" />
              </div>
              <div className="text-[9px] text-slate-400 flex items-center gap-1.5">
                <Sparkles size={10} className="text-violet-400" />
                <span>Extracted: PVC Resin, 500 MT, Riyadh WH</span>
              </div>
            </div>
          </div>

          {/* Visual Component 2: Oppora AI Search Card */}
          <div className="w-80 glass-panel rounded-2xl p-4 shadow-2xl border border-slate-700/30 animate-float-medium transform-style-3d ml-12 mb-5 relative glass-card-hover" style={{ animationDelay: '0.8s' }}>
            <div className="absolute -top-3 -left-3 w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-violet-400">
              <Globe size={16} />
            </div>
            <div className="pl-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-200">Oppora AI Discovery</span>
                <span className="flex items-center gap-1 text-[9px] text-violet-400 font-extrabold uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-radar" /> Live Search
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-violet-300">⚡</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold text-slate-350 truncate">Maggie Mulholland</div>
                  <div className="text-[9px] text-slate-400 truncate">Sales Manager · Petrochemicals</div>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Component 3: ERP Integration / 3-Way Match */}
          <div className="w-80 glass-panel rounded-2xl p-4 shadow-2xl border border-slate-700/30 animate-float-fast transform-style-3d mb-2 relative glass-card-hover" style={{ animationDelay: '1.6s' }}>
            <div className="absolute -top-3 -left-3 w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Database size={16} />
            </div>
            <div className="pl-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-200">ERP Synchronizer</span>
                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">Synced</span>
              </div>
              <div className="flex justify-between items-center text-[9px] text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800/40">
                <div className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <CheckCircle2 size={10} /> 3-Way Match
                </div>
                <div>Odoo PO #009382</div>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Description */}
        <div className="z-10 max-w-md space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/40 border border-slate-700/40 text-[10px] text-indigo-400 font-semibold uppercase tracking-wider">
            <Cpu size={12} className="animate-pulse" /> Autonomous Supply Workflows
          </div>
          <h1 className="text-xl font-bold text-slate-100">Optimized Procurement, Supercharged by AI</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Extract RFQ parameters, query B2B supplier contact repositories like Oppora, orchestrate multi-round negotiations, and sync to ERP systems instantly.
          </p>
        </div>

      </div>

      {/* ── RIGHT PANEL: Glassmorphism Login Form ── */}
      <div className="w-full md:w-[45%] flex items-center justify-center p-6 sm:p-12 z-10 bg-[#080b11]">
        
        {/* Glass Box Wrapper */}
        <div className="w-full max-w-md bg-[#0f1420]/70 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-6 sm:p-8 space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.4)] transition-all duration-300 hover:border-violet-500/20">
          
          {/* Logo showing only on mobile */}
          <div className="flex md:hidden items-center justify-center gap-2 mb-2">
            <img src="/favicon.png" alt="Neproplast Logo" className="w-8 h-8 object-contain rounded-lg" />
            <span className="font-extrabold text-xs uppercase tracking-wider text-slate-100">Neproplast Procurement AI</span>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
              Sign In Workspace <Sparkles className="text-violet-400 animate-pulse" size={16} />
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">Access your enterprise procurement command center.</p>
          </div>

          {/* Credentials Box */}
          <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-4 text-[11px] text-slate-300 leading-relaxed space-y-1.5 relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="font-bold text-indigo-400 flex items-center gap-1.5">
              <Bot size={14} className="animate-bounce" />
              <span>Demo User Access Credentials</span>
            </div>
            <div className="flex flex-col gap-0.5 border-t border-slate-800/40 pt-1.5 mt-1.5">
              <div>Email: <span className="font-mono font-bold select-all text-slate-100 bg-slate-900/60 px-1 py-0.5 rounded border border-slate-800/50">admin@neproplast.com</span></div>
              <div>Password: <span className="font-mono font-bold select-all text-slate-100 bg-slate-900/60 px-1 py-0.5 rounded border border-slate-800/50">neproplast2026</span></div>
            </div>
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
              <div className="relative group">
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@neproplast.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                  required
                />
                <Mail className="absolute left-3 top-3 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={14} />
              </div>
            </div>

            <div className="flex flex-col space-y-1.5">
              <label className="text-slate-400">Security Password</label>
              <div className="relative group">
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                  required
                />
                <Lock className="absolute left-3 top-3 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={14} />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full relative overflow-hidden bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg hover:shadow-indigo-500/20 flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                  <span>Securing session...</span>
                </>
              ) : (
                <>
                  <span>Sign In Workspace</span>
                  <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

          </form>

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 text-center font-bold pt-4 border-t border-slate-800/40">
            <ShieldCheck size={11} className="text-indigo-500/60" />
            <span>Neproplast Logistics Portal v1.0.0</span>
          </div>

        </div>
      </div>
      
    </div>
  );
}

