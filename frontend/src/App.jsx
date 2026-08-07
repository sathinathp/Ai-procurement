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
import Login from './components/Login';
import { Bot, RefreshCw, Database, Menu } from 'lucide-react';
import { dbService } from './services/api';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('activeTab') || 'dashboard';
  });
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
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
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      
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
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        
        {/* Top Header navbar */}
        <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shadow-sm shrink-0 z-30">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="xl:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none mr-1"
              title="Toggle Sidebar Menu"
            >
              <Menu size={18} />
            </button>
            <span className="text-slate-400 font-bold capitalize text-xs hidden sm:inline">workspace /</span>
            <span className="text-slate-800 font-bold capitalize text-xs truncate max-w-[150px] sm:max-w-none">
              {getTabTitle(activeTab)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            
            {/* Database seed trigger */}
            <button 
              onClick={handleReSeedDb}
              disabled={reseeding}
              className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40"
              title="Click to reset the database and regenerate mock history"
            >
              <Database size={12} className={reseeding ? 'animate-spin text-[#0078d4]' : 'text-slate-400'} />
              <span>{reseeding ? 'Reset & Seed DB' : 'Reset & Seed DB'}</span>
            </button>

            {/* Toggle AI Copilot button */}
            <button 
              onClick={() => setCopilotOpen(!copilotOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                copilotOpen 
                  ? 'bg-blue-50 border-blue-200 text-[#0078d4]' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Bot size={14} className="text-[#0078d4]" />
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
            />
          )}

          {activeTab === 'suppliers' && (
            <SupplierSearch 
              onSendRfqRedirect={handleSendRfqRedirect} 
            />
          )}

          {activeTab === 'email' && (
            <EmailAutomation 
              redirectSupplierId={emailRedirectSupplierId} 
              onNavigate={handleNavigate}
            />
          )}

          {activeTab === 'comparison' && (
            <QuoteComparison />
          )}

          {activeTab === 'purchase_orders' && (
            <PurchaseOrders />
          )}

          {activeTab === 'rfp_campaign' && (
            <RfpCampaign />
          )}

          {activeTab === 'ai_agent' && (
            <AiAgentWorkflow />
          )}

          {activeTab === 'copilot' && (
            <CopilotChat inlineMode={true} />
          )}

          {['prod_planning', 'demand_forecast', 'inventory_forecast', 'mfg_ai', 'quality_vision', 'eng_copilot', 'erp_link', 'power_bi', 'grn_matching', 'audit_reports'].includes(activeTab) && (
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

    </div>
  );
}
