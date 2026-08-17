import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import RfqAssistant from './components/RfqAssistant';
import SupplierSearch from './components/SupplierSearch';
import EmailAutomation from './components/EmailAutomation';
import QuoteComparison from './components/QuoteComparison';
import CopilotChat from './components/CopilotChat';
import Phase2Modules from './components/Phase2Modules';
import RfpCampaign from './components/RfpCampaign';
import AiAgentWorkflow from './components/AiAgentWorkflow';
import PurchaseOrders from './components/PurchaseOrders';
import EmailBot from './components/EmailBot';
import Login from './components/Login';
import { Bot, RefreshCw, Database, Menu, Plus } from 'lucide-react';
import { dbService } from './services/api';
import FloatingRfqModal from './components/FloatingRfqModal';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('activeTab') || 'dashboard';
  });
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      if (parsed.name === 'Sathinath' && parsed.role === 'Junior AI Engineer') {
        parsed.role = 'Senior AI Developer';
        localStorage.setItem('user', JSON.stringify(parsed));
      }
      return parsed;
    }
    return null;
  });
  
  // Copilot right-hand drawer state
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [rfqContext, setRfqContext] = useState(null);
  
  // Mobile responsive sidebar open state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Redirect params
  const [emailRedirectSupplierId, setEmailRedirectSupplierId] = useState(null);
  const [openCreateRfq, setOpenCreateRfq] = useState(false);
  const [reseeding, setReseeding] = useState(false);
  const [initialSearchQuery, setInitialSearchQuery] = useState('');
  const [activeRfqNum, setActiveRfqNum] = useState(localStorage.getItem('activeRfqNum') || 'RFQ-2026-1003');
  const [showFloatingRfqModal, setShowFloatingRfqModal] = useState(false);
  const [initialSelectedRfq, setInitialSelectedRfq] = useState(null);

  const handleSearchSuppliers = (query) => {
    setInitialSearchQuery(query);
    setActiveTab('suppliers');
  };

  React.useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  const handleLogin = (userInfo) => {
    setUser(userInfo);
    setIsLoggedIn(true);
    localStorage.setItem('user', JSON.stringify(userInfo));
    localStorage.setItem('isLoggedIn', 'true');
  };

  const handleLogout = () => {
    setUser(null);
    setIsLoggedIn(false);
    setActiveTab('dashboard');
    setCopilotOpen(false);
    localStorage.removeItem('user');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('activeTab');
  };

  const handleNavigate = (tabId, params = {}) => {
    setActiveTab(tabId);
    if (params.openCreateModal) {
      setOpenCreateRfq(true);
    } else {
      setOpenCreateRfq(false);
    }
    if (params.selectRfqNum) {
      setInitialSelectedRfq(params.selectRfqNum);
      setActiveRfqNum(params.selectRfqNum);
      localStorage.setItem('activeRfqNum', params.selectRfqNum);
      setRfqContext(params.selectRfqNum);
    } else {
      setInitialSelectedRfq(null);
    }
  };

  const handleSendRfqRedirect = (supplierId) => {
    setEmailRedirectSupplierId(supplierId);
    setActiveTab('email');
  };

  // Re-seed DB trigger
  const handleReSeedDb = () => {
    setReseeding(true);
    dbService.seed()
      .then((res) => {
        alert(res.data.message);
        setReseeding(false);
        // Refresh page to sync data
        window.location.reload();
      })
      .catch((err) => {
        console.error(err);
        alert('Seeding database failed.');
        setReseeding(false);
      });
  };

  const getTabTitle = (id) => {
    const mapping = {
      dashboard: 'Operations Dashboard',
      rfqs: 'RFQs & Assistant',
      ai_agent: 'Autonomous AI Agent',
      email_bot: 'Email Bot Console',
      rfp_campaign: 'RFP Campaign Simulator',
      suppliers: 'Supplier Search',
      email: 'Email Automation',
      comparison: 'Quote Comparison',
      purchase_orders: 'Purchase Orders',
      copilot: 'AI Copilot Chat',
      prod_planning: 'Production Planning & Scheduling (Phase 2)',
      demand_forecast: 'Sales & Demand Forecasting (Phase 2)',
      inventory_forecast: 'Inventory & Reorder Projections (Phase 2)',
      mfg_ai: 'Manufacturing Machine AI Telemetry (Phase 2)',
      quality_vision: 'Quality Vision AI Defect Scanner (Phase 2)',
      eng_copilot: 'Engineering Copilot Drawing Analyst (Phase 2)',
      erp_link: 'Dynamics 365 ERP Sync Console (Phase 2)',
      power_bi: 'Power BI Spend Analytics (Phase 2)',
      grn_matching: 'Goods Receipt Note (GRN) & 3-Way Matching',
      audit_reports: 'Executive Procurement PDF Audit Reports'
    };
    return mapping[id] || id;
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gradient-to-tr from-[#f6f8fb] via-[#f1f5f9] to-[#e9eff6]">
      
      {/* Left Sidebar - Collapsible on mobile */}
      <div className={`fixed inset-y-0 left-0 z-40 transform xl:relative xl:translate-x-0 transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } xl:block`}>
        <Sidebar 
          activeTab={activeTab} 
          onSelectTab={(tabId) => {
            setActiveTab(tabId);
            setOpenCreateRfq(false);
            setSidebarOpen(false); // Close sidebar on selection (mobile)
          }}
          onLogout={handleLogout} 
          user={user} 
        />
      </div>

      {/* Backdrop overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 xl:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative bg-transparent">
        
        {/* Top Header navbar - Restyled as a clean glass panel */}
        <header className="h-14 bg-white/45 backdrop-blur-md border-b border-slate-200/50 px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 shadow-sm">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="xl:hidden p-1.5 rounded-lg text-slate-650 hover:bg-white/80 hover:text-slate-900 focus:outline-none mr-1 border border-slate-200 bg-white/50 backdrop-blur-sm shadow-sm transition-all"
              title="Toggle Sidebar Menu"
            >
              <Menu size={18} />
            </button>
            <span className="text-slate-500 font-bold capitalize text-[10px] uppercase tracking-wider hidden sm:inline">Workspace /</span>
            <span className="text-slate-800 font-extrabold capitalize text-xs tracking-wide truncate max-w-[150px] sm:max-w-none">
              {getTabTitle(activeTab)}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            
            {/* Database seed trigger */}
            <button 
              onClick={handleReSeedDb}
              disabled={reseeding}
              className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 bg-white/80 hover:bg-white border border-slate-250/50 px-3.5 py-1.5 rounded-xl transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 cursor-pointer"
              title="Click to reset the database and regenerate mock history"
            >
              <Database size={12} className={reseeding ? 'animate-spin text-[#0078d4] stroke-[2px]' : 'text-slate-550 stroke-[1.5px]'} />
              <span>{reseeding ? 'Resetting DB...' : 'Reset & Seed DB'}</span>
            </button>

            {/* Toggle AI Copilot button */}
            <button 
              onClick={() => setCopilotOpen(!copilotOpen)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98] ${
                copilotOpen 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-[0_4px_10px_rgba(59,130,246,0.2)]' 
                  : 'bg-white/80 text-slate-700 hover:bg-white border-slate-250/50'
              }`}
            >
              <Bot size={14} className={copilotOpen ? 'text-white stroke-[2px]' : 'text-indigo-600 stroke-[2.5px]'} />
              <span>AI Copilot</span>
            </button>

          </div>
        </header>

        {/* View Workspace switcher */}
        <div className="flex-1 overflow-hidden flex">
          
          {activeTab === 'dashboard' && (
            <Dashboard 
              onNavigate={handleNavigate} 
              onOpenCopilot={() => setCopilotOpen(true)}
              onImportTrigger={() => handleNavigate('rfqs', { openCreateModal: true })}
            />
          )}

          {activeTab === 'rfqs' && (
            <RfqAssistant 
              initialOpenCreate={openCreateRfq} 
              initialSelectedRfq={initialSelectedRfq}
              onSearchSuppliers={handleSearchSuppliers}
              onSelectRfq={(rfqNum) => {
                setActiveRfqNum(rfqNum);
                localStorage.setItem('activeRfqNum', rfqNum);
                setRfqContext(rfqNum);
              }}
            />
          )}

          {activeTab === 'suppliers' && (
            <SupplierSearch 
              onSendRfqRedirect={handleSendRfqRedirect} 
              initialQuery={initialSearchQuery}
              clearInitialQuery={() => setInitialSearchQuery('')}
            />
          )}

          {activeTab === 'email' && (
            <EmailAutomation 
              redirectSupplierId={emailRedirectSupplierId} 
              onNavigate={handleNavigate}
              activeRfqNum={activeRfqNum}
            />
          )}

          {activeTab === 'comparison' && (
            <QuoteComparison activeRfqNum={activeRfqNum} />
          )}

          {activeTab === 'purchase_orders' && (
            <PurchaseOrders />
          )}

          {activeTab === 'rfp_campaign' && (
            <RfpCampaign activeRfqNum={activeRfqNum} />
          )}

          {activeTab === 'ai_agent' && (
            <AiAgentWorkflow />
          )}

          {activeTab === 'email_bot' && (
            <EmailBot />
          )}

          {activeTab === 'copilot' && (
            <CopilotChat inlineMode={true} />
          )}

          {['prod_planning', 'demand_forecast', 'inventory_forecast', 'mfg_ai', 'quality_vision', 'eng_copilot', 'erp_link', 'power_bi'].includes(activeTab) && (
            <Phase2Modules tab={activeTab} />
          )}

        </div>

      </div>

      {/* Floating sliding right-hand Copilot chat drawer (Microsoft Copilot Style) */}
      {copilotOpen && activeTab !== 'copilot' && (
        <CopilotChat 
          inlineMode={false} 
          rfqContextNumber={rfqContext}
        />
      )}

      {/* Persistent Floating Action Button (FAB) at bottom-right corner */}
      <div className="fixed bottom-8 right-16 z-50">
        <button
          onClick={() => setShowFloatingRfqModal(true)}
          className="w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-750 hover:to-indigo-750 text-white rounded-full flex items-center justify-center shadow-[0_4px_16px_rgba(59,130,246,0.3)] hover:shadow-[0_6px_22px_rgba(59,130,246,0.45)] hover:scale-108 active:scale-95 transition-all duration-300 cursor-pointer p-0"
          title="Create / Upload RFQ"
        >
          <Plus size={28} className="stroke-[3px] shrink-0 text-white" />
        </button>
      </div>

      <FloatingRfqModal 
        isOpen={showFloatingRfqModal} 
        onClose={() => setShowFloatingRfqModal(false)} 
        onRfqCreated={(rfqNum) => {
          // If in any view, trigger event to reload data
          window.dispatchEvent(new CustomEvent('ai_agent_update'));
        }} 
      />

    </div>
  );
}
