import React from 'react';
import { 
  BarChart2, FileText, Search, Mail, Sparkles, 
  Bot, Clock, HelpCircle, Lock, ShieldAlert, LogOut
} from 'lucide-react';

export default function Sidebar({ activeTab, onSelectTab, onLogout, user }) {
  const menuItems = [
    { id: 'dashboard', label: 'Operations Dashboard', icon: <BarChart2 size={16} /> },
    { id: 'rfqs', label: 'RFQs & Assistant', icon: <FileText size={16} /> },
    { id: 'rfp_campaign', label: 'RFP Campaign Simulator', icon: <Sparkles size={16} className="text-amber-500" /> },
    { id: 'suppliers', label: 'Supplier Search', icon: <Search size={16} /> },
    { id: 'email', label: 'Email Automation', icon: <Mail size={16} /> },
    { id: 'comparison', label: 'Quote Comparison', icon: <Sparkles size={16} /> },
    { id: 'copilot', label: 'AI Copilot Chat', icon: <Bot size={16} /> }
  ];

  const comingSoonItems = [
    { id: 'prod_planning', label: 'Production Planning' },
    { id: 'demand_forecast', label: 'Demand Forecasting' },
    { id: 'inventory_forecast', label: 'Inventory Forecasting' },
    { id: 'mfg_ai', label: 'Manufacturing AI' },
    { id: 'quality_vision', label: 'Quality Vision AI' },
    { id: 'eng_copilot', label: 'Engineering Copilot' },
    { id: 'erp_link', label: 'Live ERP Link' },
    { id: 'power_bi', label: 'Power BI' }
  ];

  return (
    <div className="w-[240px] bg-slate-900 text-slate-300 flex flex-col h-full shrink-0 border-r border-slate-800">
      
      {/* Brand Logo */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-2.5">
        <img src="/favicon.png" alt="Neproplast Logo" className="w-8 h-8 object-contain rounded-lg bg-white/10 p-0.5" />
        <div>
          <h1 className="text-sm font-bold text-white leading-tight">Neproplast AI</h1>
          <span className="text-[10px] text-slate-500 font-semibold block uppercase">Procurement Copilot</span>
        </div>
      </div>

      {/* Main Navigation Menu */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <span className="text-[10px] font-bold text-slate-500 block px-2.5 mb-2 uppercase tracking-wider">Main Modules</span>
        
        {menuItems.map((item, idx) => (
          <button 
            key={idx}
            onClick={() => onSelectTab(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === item.id 
                ? 'bg-[#0078d4] text-white' 
                : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}

        {/* Coming soon section */}
        <div className="pt-6 space-y-2">
          <span className="text-[10px] font-bold text-slate-500 block px-2.5 uppercase tracking-wider flex items-center gap-1">
            <Sparkles size={10} className="text-[#0078d4]" /> Phase 2 AI Modules
          </span>
          <div className="grid grid-cols-1 gap-1 px-1">
            {comingSoonItems.map((item, i) => (
              <button 
                key={i} 
                onClick={() => onSelectTab(item.id)}
                className={`w-full text-left text-[10px] font-semibold px-2 py-1.5 rounded flex items-center justify-between transition-colors ${
                  activeTab === item.id 
                    ? 'bg-indigo-750 text-white font-bold' 
                    : 'hover:bg-slate-800 hover:text-slate-200 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <div className={`w-1.5 h-1.5 rounded-full ${activeTab === item.id ? 'bg-indigo-400' : 'bg-slate-650'}`}></div>
                  <span className="truncate">{item.label}</span>
                </div>
                <span className="text-[8px] bg-indigo-950 text-indigo-300 font-bold px-1 rounded-sm uppercase scale-90">Beta</span>
              </button>
            ))}
          </div>
        </div>


      </div>

      {/* User profile / Logout */}
      {user && (
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#0078d4] text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">{user.name}</div>
              <div className="text-[10px] text-slate-500 truncate">{user.role}</div>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-slate-800 hover:text-white text-[10px] font-semibold text-slate-500 transition-colors"
          >
            <LogOut size={12} /> Sign Out Demo
          </button>
        </div>
      )}

    </div>
  );
}
