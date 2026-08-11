import { 
  BarChart2, FileText, Search, Mail, Sparkles, 
  Bot, Clock, HelpCircle, Lock, ShieldAlert, LogOut, ShoppingCart
} from 'lucide-react';

export default function Sidebar({ activeTab, onSelectTab, onLogout, user }) {
  const menuItems = [
    { id: 'dashboard', label: 'Operations Dashboard', icon: <BarChart2 size={16} /> },
    { id: 'rfqs', label: 'RFQs & Assistant', icon: <FileText size={16} /> },
    { id: 'email_bot', label: 'Email Bot Console', icon: <Bot size={16} className="text-amber-500" /> },
    { id: 'suppliers', label: 'Supplier Search', icon: <Search size={16} /> },
    { id: 'email', label: 'Email Automation', icon: <Mail size={16} /> },
    { id: 'comparison', label: 'Quote Comparison', icon: <Sparkles size={16} /> },
    { id: 'purchase_orders', label: 'Purchase Orders', icon: <ShoppingCart size={16} className="text-emerald-400" /> },
    { id: 'copilot', label: 'AI Copilot Chat', icon: <Bot size={16} /> },
    { id: 'ai_agent', label: 'Autonomous AI Agent', icon: <Bot size={16} /> }
  ];

  return (
    <div className="w-[240px] bg-slate-900 text-slate-300 flex flex-col h-full shrink-0 border-r border-slate-800">
      
      {/* Brand Logo */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#0078d4] to-violet-650 flex items-center justify-center shrink-0 shadow-md">
          <Sparkles size={16} className="text-white" />
        </div>
        <div>
          <h1 className="text-sm font-extrabold text-white leading-tight tracking-wide">AI Procurement</h1>
          <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Enterprise Copilot</span>
        </div>
      </div>

      {/* Main Navigation Menu */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <span className="text-[10px] font-bold text-slate-500 block px-2.5 mb-2 uppercase tracking-wider">Main Modules</span>
        
        {menuItems.map((item, idx) => {
          const isAiAgent = item.id === 'ai_agent';
          const isActive = activeTab === item.id;

          if (isAiAgent) {
            return (
              <button 
                key={idx}
                onClick={() => onSelectTab(item.id)}
                className={`group w-[calc(100%-8px)] mx-1 flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 border-2 ${
                  isActive 
                    ? 'bg-[#ffde43] text-slate-950 border-slate-950 shadow-[3px_3px_0px_0px_#0078d4]' 
                    : 'bg-slate-800/40 text-slate-300 border-transparent hover:bg-[#ffde43] hover:text-slate-950 hover:border-slate-950 hover:shadow-[4px_4px_0px_0px_#0078d4] hover:-translate-y-0.5 hover:-translate-x-0.5 active:translate-x-0 active:translate-y-0 active:shadow-none'
                }`}
              >
                <Bot 
                  size={16} 
                  className={`transition-colors duration-200 ${
                    isActive ? 'text-slate-950' : 'text-[#0078d4] group-hover:text-slate-950'
                  }`} 
                />
                <span>{item.label}</span>
              </button>
            );
          }

          return (
            <button 
              key={idx}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                isActive 
                  ? 'bg-[#0078d4] text-white' 
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}




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
