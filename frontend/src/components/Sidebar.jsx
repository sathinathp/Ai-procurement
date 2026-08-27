import React, { useState } from 'react';
import { 
  BarChart2, FileText, Search, Mail, Sparkles, 
  Bot, Clock, Lock, ShieldAlert, LogOut, ShoppingCart,
  MoreVertical, Zap, Cpu
} from 'lucide-react';

export default function Sidebar({ activeTab, onSelectTab, onLogout, user }) {
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Exclude 'ai_agent' from standard menu to render it uniquely at the bottom
  const menuItems = [
    { id: 'dashboard', label: 'Operations Dashboard', icon: <BarChart2 size={16} /> },
    { id: 'rfqs', label: 'RFQs & Assistant', icon: <FileText size={16} /> },
    { id: 'email_bot', label: 'Email Bot Console', icon: <Bot size={16} className="text-amber-500" /> },
    { id: 'suppliers', label: 'Supplier Search', icon: <Search size={16} /> },
    { id: 'email', label: 'Email Automation', icon: <Mail size={16} /> },
    { id: 'comparison', label: 'Quote Comparison', icon: <Sparkles size={16} /> },
    { id: 'purchase_orders', label: 'Purchase Orders', icon: <ShoppingCart size={16} className="text-emerald-400" /> },
    { id: 'copilot', label: 'AI Copilot Chat', icon: <Bot size={16} /> }
  ];

  return (
    <div className="w-[250px] h-[calc(100vh-24px)] my-3 ml-3 mr-1 rounded-[28px] bg-[#090A0F] border border-zinc-800/80 text-zinc-300 flex flex-col justify-between shrink-0 shadow-[0_12px_40px_rgba(0,0,0,0.65)] relative overflow-hidden font-sidebar">
      
      {/* Premium Animation & Font Keyframes Injection */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playpen+Sans:wght@400;500;600;700;800&display=swap');
        
        .font-sidebar {
          font-family: 'Playpen Sans', cursive, sans-serif !important;
        }
        
        .brand-logo-font {
          font-family: 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif !important;
        }
        
        .sidebar-scroll::-webkit-scrollbar {
          display: none;
        }
        .sidebar-scroll {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translate3d(0, 12px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        @keyframes scaleUp {
          from {
            opacity: 0;
            transform: scale(0.96);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes rotateCW {
          0% { transform: translate3d(-50%, 0, 0) rotate(0deg); }
          100% { transform: translate3d(-50%, 0, 0) rotate(360deg); }
        }
        @keyframes rotateCCW {
          0% { transform: translate3d(-50%, 0, 0) rotate(360deg); }
          100% { transform: translate3d(-50%, 0, 0) rotate(0deg); }
        }
        @keyframes glowPulse {
          0%, 100% { 
            box-shadow: 0 0 12px rgba(16, 185, 129, 0.15); 
            border-color: rgba(16, 185, 129, 0.25);
            background-color: rgba(16, 185, 129, 0.12);
          }
          50% { 
            box-shadow: 0 0 24px rgba(16, 185, 129, 0.45); 
            border-color: rgba(16, 185, 129, 0.55);
            background-color: rgba(16, 185, 129, 0.18);
          }
        }
        @keyframes agentGlow {
          0%, 100% { 
            box-shadow: 0 4px 15px rgba(139, 92, 246, 0.25); 
            border-color: rgba(167, 139, 250, 0.4);
          }
          50% { 
            box-shadow: 0 4px 28px rgba(139, 92, 246, 0.55); 
            border-color: rgba(167, 139, 250, 0.7);
          }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-scaleUp {
          animation: scaleUp 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-rotate-cw {
          animation: rotateCW 35s linear infinite;
        }
        .animate-rotate-ccw {
          animation: rotateCCW 45s linear infinite;
        }
        .animate-badge-glow {
          animation: glowPulse 3s ease-in-out infinite;
        }
        .animate-agent-glow {
          animation: agentGlow 2.5s ease-in-out infinite;
        }
      `}</style>

      {/* Rotating Concentric Circles HUD Background Graphic */}
      <div className="absolute top-0 left-0 right-0 h-40 overflow-hidden pointer-events-none opacity-25">
        <div className="absolute top-[-35px] left-1/2 w-48 h-48 rounded-full border border-dashed border-emerald-500/10 animate-rotate-cw" />
        <div className="absolute top-[-15px] left-1/2 w-36 h-36 rounded-full border border-dashed border-emerald-500/15 animate-rotate-ccw" />
        <div className="absolute top-[5px] left-1/2 w-24 h-24 rounded-full border border-dashed border-emerald-500/20 animate-rotate-cw" />
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        
        {/* Brand Logo & Pill Indicator */}
        <div className="relative pt-7 pb-5 px-6 flex items-center justify-between border-b border-zinc-800/40 shrink-0 select-none">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span className="brand-logo-font text-[12px] font-extrabold text-white uppercase tracking-[0.18em] leading-none">
                ProcureX
              </span>
            </div>
            <span className="brand-logo-font text-[8px] text-zinc-500 font-bold uppercase tracking-[0.22em] mt-2.5 ml-4 leading-none">
              Enterprise Copilot
            </span>
          </div>
        </div>

        {/* Main Navigation Menu */}
        <div className="flex-1 overflow-y-auto py-4 px-3.5 space-y-1.5 sidebar-scroll flex flex-col justify-between">
          
          <div className="space-y-1.5">
            <span className="text-[9px] font-bold text-zinc-600 block px-3 mb-2 uppercase tracking-widest brand-logo-font">Main Modules</span>
            
            {menuItems.map((item, idx) => {
              const isActive = activeTab === item.id;

              return (
                <button 
                  key={idx}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-2 rounded-2xl text-[11px] font-bold transition-all duration-200 group relative border hover:translate-x-1 ${
                    isActive 
                      ? 'bg-zinc-800/80 text-white border-zinc-700/60 shadow-[0_4px_15px_rgba(255,255,255,0.03)] scale-[1.01]' 
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50 border-transparent'
                  }`}
                >
                  {React.cloneElement(item.icon, {
                    size: 15,
                    strokeWidth: 2,
                    className: `shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 ${
                      isActive 
                        ? 'text-emerald-400' 
                        : 'text-[#76E263]/70 group-hover:text-emerald-400'
                    }`
                  })}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Autonomous ProcureX (Special Feature - Rendered last with unique design) */}
          <div className="mt-6 pt-4 border-t border-zinc-800/40 space-y-2">
            <div className="flex items-center justify-between px-3">
              <span className="text-[9px] font-black text-violet-400 uppercase tracking-widest flex items-center gap-1">
                <Zap size={10} className="text-violet-400 animate-bounce" /> Special Feature
              </span>
              <span className="text-[8px] bg-violet-950 text-violet-300 px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wide border border-violet-850">
                Autopilot
              </span>
            </div>

            <button 
              onClick={() => onSelectTab('ai_agent')}
              className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-[11px] font-extrabold transition-all duration-300 group relative border hover:translate-x-1 ${
                activeTab === 'ai_agent' 
                  ? 'bg-gradient-to-r from-violet-650 via-indigo-600 to-purple-650 text-white border-violet-400/50 animate-agent-glow' 
                  : 'text-violet-300 bg-violet-950/5 hover:bg-violet-950/15 border-violet-950/40 hover:border-violet-500/20'
              }`}
            >
              <Bot 
                size={16} 
                strokeWidth={2}
                className={`shrink-0 transition-all duration-300 group-hover:scale-115 group-hover:rotate-12 ${
                  activeTab === 'ai_agent' 
                    ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' 
                    : 'text-violet-400/80 group-hover:text-violet-300'
                }`}
              />
              <span className={activeTab === 'ai_agent' ? 'text-white' : 'text-zinc-200'}>Autonomous ProcureX</span>
            </button>
          </div>

        </div>
      </div>

      {/* Footer Section */}
      <div className="shrink-0">

        {/* User profile / Logout card */}
        {user && (
          <div className="mx-3.5 mb-4 p-3 bg-zinc-900/65 border border-zinc-800/40 rounded-[20px] flex items-center justify-between shadow-lg relative transition-all duration-300 hover:border-zinc-700/50 hover:bg-zinc-900/80">
            <div className="flex items-center gap-2.5">
              <div className="relative flex-shrink-0">
                <img 
                  src="https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=100&q=80" 
                  alt="User Avatar" 
                  className="w-8 h-8 rounded-full object-cover border border-zinc-800 transition-transform duration-500 hover:scale-110"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    if(e.target.nextSibling) {
                      e.target.nextSibling.style.display = 'flex';
                    }
                  }}
                />
                <div className="w-8 h-8 rounded-full bg-[#1b3a13] text-[#76E263] flex items-center justify-center font-extrabold text-xs uppercase border border-zinc-800" style={{ display: 'none' }}>
                  {user.name.charAt(0)}
                </div>
                <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-[#76E263] ring-2 ring-[#090A0F] animate-pulse"></span>
              </div>
              
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate leading-tight tracking-wide">{user.name}</div>
                <div className="text-[9px] text-zinc-550 font-semibold truncate mt-0.5 tracking-wider uppercase">{user.role}</div>
              </div>
            </div>

            <button 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={`p-1.5 rounded-lg text-zinc-400 hover:text-white transition-all duration-150 hover:bg-zinc-800/60 ${showUserMenu ? 'bg-zinc-800 text-white rotate-90' : ''}`}
              title="Profile Options"
            >
              <MoreVertical size={14} />
            </button>
            
            {/* Float Dropdown for Sign Out */}
            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute bottom-14 right-2 bg-[#0c0d12]/95 backdrop-blur-md border border-zinc-800/80 rounded-xl shadow-2xl py-1.5 px-1.5 w-40 z-50 animate-fadeInUp">
                  <button 
                    onClick={() => {
                      alert(`Access details:\nUser: ${user.name}\nRole: ${user.role}\nWorkspace: ai-procurement\nConnection: Secure TLS`);
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/65 transition-colors text-left"
                  >
                    <Lock size={12} className="text-zinc-550" /> Account Security
                  </button>
                  
                  <button 
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 transition-colors text-left border-t border-zinc-800/40 mt-1 pt-1.5"
                  >
                    <LogOut size={12} /> Sign Out Demo
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
