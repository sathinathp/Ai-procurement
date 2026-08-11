import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Mail, RefreshCw, CheckCircle, AlertCircle, 
  Terminal, Settings, Shield, Inbox, Clock, Send, 
  ChevronRight, ArrowRightLeft, FileText, ToggleLeft, ToggleRight
} from 'lucide-react';
import { emailBotService } from '../services/api';

export default function EmailBot() {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'inbound', 'outbound'
  
  const [settings, setSettings] = useState({
    max_negotiation_rounds: 3,
    recipient_email: 'sathinath.padhi@petabytz.com',
    auto_simulate_suppliers: true,
    simulation_delay_seconds: 40
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [triggeringCheck, setTriggeringCheck] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  
  // Selected email detail modal
  const [selectedEmail, setSelectedEmail] = useState(null);

  // Load initial settings and logs
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Load settings
      const settingsRes = await emailBotService.getSettings();
      if (settingsRes.data) {
        setSettings(prev => ({
          ...prev,
          ...settingsRes.data
        }));
      }

      // Load logs
      const logsRes = await emailBotService.getLogs();
      if (logsRes.data) {
        // Merge email_history and negotiation_logs into a unified chronological feed
        const emailHistory = (logsRes.data.email_history || []).map(e => ({
          id: `email_${e.id}`,
          rfq_number: e.rfq_number,
          supplier_id: e.supplier_id,
          direction: 'outbound',
          type: e.type || 'outbound_email',
          subject: e.subject,
          body: e.body,
          sent_at: e.sent_at,
          supplier_email: e.supplier_email
        }));

        const negotiationLogs = (logsRes.data.negotiation_logs || []).map(n => ({
          id: `neg_${n.id}`,
          rfq_number: n.rfq_number,
          supplier_id: n.supplier_id,
          direction: n.direction,
          type: 'negotiation_log',
          subject: n.subject,
          body: n.body,
          sent_at: n.sent_at,
          price: n.price,
          currency: n.currency,
          supplier_email: n.supplier_email
        }));

        // Combine and sort descending by timestamp
        const combined = [...emailHistory, ...negotiationLogs].sort((a, b) => {
          return new Date(b.sent_at) - new Date(a.sent_at);
        });

        setLogs(combined);
      }
    } catch (err) {
      console.error("Failed to load email bot logs or settings:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Poll for new logs every 5 seconds to show real-time changes
  useEffect(() => {
    const interval = setInterval(() => {
      loadData(true);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Apply filters whenever logs or activeFilter change
  useEffect(() => {
    if (activeFilter === 'all') {
      setFilteredLogs(logs);
    } else if (activeFilter === 'inbound') {
      setFilteredLogs(logs.filter(l => l.direction === 'inbound'));
    } else if (activeFilter === 'outbound') {
      setFilteredLogs(logs.filter(l => l.direction === 'outbound'));
    }
  }, [logs, activeFilter]);

  // Handle setting updates
  const handleSettingChange = (name, value) => {
    const updated = { ...settings, [name]: value };
    setSettings(updated);
    emailBotService.saveSettings(updated)
      .then(() => {
        setStatusMessage({ type: 'success', text: 'Settings saved and synced to worker.' });
        setTimeout(() => setStatusMessage(null), 4000);
      })
      .catch(err => {
        console.error("Failed to save settings:", err);
        setStatusMessage({ type: 'error', text: 'Failed to update settings.' });
        setTimeout(() => setStatusMessage(null), 4000);
      });
  };

  // Trigger manual IMAP mailbox poll
  const handleTriggerCheck = async () => {
    setTriggeringCheck(true);
    setStatusMessage({ type: 'info', text: 'Contacting IMAP server & pulling unread messages...' });
    try {
      const res = await emailBotService.triggerCheck();
      if (res.data && res.data.status === 'triggered') {
        // Wait 2 seconds then reload logs
        setTimeout(async () => {
          await loadData(true);
          setStatusMessage({ type: 'success', text: 'IMAP check complete! Logs refreshed.' });
          setTriggeringCheck(false);
          setTimeout(() => setStatusMessage(null), 4000);
        }, 2000);
      } else {
        throw new Error("Trigger unsuccessful");
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.detail || err.message || 'Failed to contact IMAP server.';
      setStatusMessage({ type: 'error', text: errMsg });
      setTriggeringCheck(false);
      setTimeout(() => setStatusMessage(null), 6000);
    }
  };

  // Compute stat card metrics
  const totalEmails = logs.length;
  const inboundCount = logs.filter(l => l.direction === 'inbound').length;
  const outboundCount = logs.filter(l => l.direction === 'outbound').length;
  const activeRfqNumbers = [...new Set(logs.map(l => l.rfq_number).filter(Boolean))].length;

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-50 text-slate-700 flex flex-col lg:flex-row gap-6 h-full">
      
      {/* Left Column: Stats Cards & Main Unified Logs */}
      <div className="flex-1 flex flex-col gap-6 min-w-0">
        
        {/* Top Header Card */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <Shield size={10} /> Active Agent
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">• Real-Time Logging Console</span>
              </div>
              <h1 className="text-xl font-bold text-slate-800">Email Bot Console</h1>
              <p className="text-xs text-slate-500">Monitor active RFQ communication, review unread IMAP checks, and optimize multi-round AI negotiations.</p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                disabled={triggeringCheck}
                onClick={handleTriggerCheck}
                className="bg-[#0078d4] text-white hover:bg-[#106ebe] text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-55"
              >
                <RefreshCw size={14} className={triggeringCheck ? "animate-spin" : ""} />
                <span>{triggeringCheck ? "Checking IMAP..." : "Force Check Inbox"}</span>
              </button>
            </div>
          </div>

          {statusMessage && (
            <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              statusMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
              statusMessage.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
              'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              {statusMessage.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              <span>{statusMessage.text}</span>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Bot State</span>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-semibold text-slate-800">ACTIVE &amp; POLLING</span>
            </div>
            <span className="text-[9px] text-slate-400 block mt-1">Polling interval: 10s</span>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Logs</span>
            <span className="text-2xl font-bold text-[#0078d4] mt-2">{totalEmails}</span>
            <span className="text-[9px] text-slate-400 block mt-1">Messages &amp; Audits</span>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">In / Out Ratio</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-xl font-semibold text-amber-600">{inboundCount}</span>
              <span className="text-xs text-slate-400">/</span>
              <span className="text-xl font-semibold text-blue-600">{outboundCount}</span>
            </div>
            <span className="text-[9px] text-slate-400 block mt-1">Inbound vs Outbound</span>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tracked RFQs</span>
            <span className="text-2xl font-bold text-slate-800 mt-2">{activeRfqNumbers}</span>
            <span className="text-[9px] text-slate-400 block mt-1">Negotiation Threads</span>
          </div>
        </div>

        {/* Logs Terminal Area */}
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl shadow-md overflow-hidden flex flex-col min-h-[400px]">
          
          {/* Terminal Tabs / Header */}
          <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-amber-500" />
              <span className="text-xs font-mono font-bold text-slate-350">System Logs Terminal</span>
            </div>
            
            <div className="flex gap-1">
              {['all', 'inbound', 'outbound'].map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-2 py-1 rounded text-[10px] font-mono font-bold uppercase transition-colors ${
                    activeFilter === f
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Terminal Logs Scroll Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 font-mono text-[11px] leading-relaxed">
            {loading ? (
              <div className="h-full flex items-center justify-center text-slate-500 gap-2">
                <RefreshCw size={14} className="animate-spin" />
                <span>Loading log history...</span>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-650">
                <span>No logs match active filters.</span>
              </div>
            ) : (
              filteredLogs.map((log) => {
                const isInbound = log.direction === 'inbound';
                const dateStr = log.sent_at ? new Date(log.sent_at).toLocaleTimeString() : 'N/A';
                return (
                  <div 
                    key={log.id} 
                    onClick={() => setSelectedEmail(log)}
                    className="group border border-slate-800 hover:border-slate-700 p-2.5 rounded-lg bg-slate-950/40 hover:bg-slate-950/80 transition-all cursor-pointer flex gap-3 items-start"
                  >
                    <span className="text-slate-600 shrink-0 select-none">[{dateStr}]</span>
                    
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase shrink-0 tracking-wider ${
                      isInbound 
                        ? 'bg-amber-950/85 text-amber-400 border border-amber-900/30' 
                        : 'bg-blue-950/85 text-blue-400 border border-blue-900/30'
                    }`}>
                      {isInbound ? 'INBOUND' : 'OUTBOUND'}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="text-slate-300 font-bold truncate">
                        {log.subject}
                      </div>
                      <div className="text-slate-500 text-[10px] truncate mt-0.5">
                        {isInbound ? `From: ${log.supplier_email}` : `To: ${log.supplier_email}`}
                        {log.rfq_number && ` | RFQ: ${log.rfq_number}`}
                        {log.price && ` | Quote: $${log.price}`}
                      </div>
                      <div className="text-slate-400 mt-1 line-clamp-1 group-hover:text-slate-300 transition-colors text-[10px]">
                        {log.body}
                      </div>
                    </div>
                    
                    <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 shrink-0 self-center transition-colors" />
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Right Column: Settings & Configuration Panel */}
      <div className="w-full lg:w-[320px] bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-6 shrink-0 self-start">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <Settings size={16} className="text-[#0078d4]" /> Bot Parameters
        </h3>

        <div className="space-y-4">
          {/* Max Negotiation Rounds */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Max Negotiation Rounds</label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((round) => (
                <button
                  key={round}
                  type="button"
                  onClick={() => handleSettingChange('max_negotiation_rounds', round)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    settings.max_negotiation_rounds === round
                      ? 'bg-[#0078d4] text-white border-[#0078d4] shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {round}
                </button>
              ))}
            </div>
            <span className="text-[9px] text-slate-400 font-semibold block leading-normal mt-1">Controls the maximum feedback iterations before finalizing comparison reports.</span>
          </div>

          <hr className="border-slate-100" />

          {/* Recipient Email Override */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Target Notification Email</label>
            <input
              type="email"
              value={settings.recipient_email}
              onChange={(e) => setSettings(prev => ({ ...prev, recipient_email: e.target.value }))}
              onBlur={(e) => handleSettingChange('recipient_email', e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-[#0078d4] font-medium"
            />
            <span className="text-[9px] text-slate-400 font-semibold block leading-normal">Override sandbox recipient for testing notifications and PO deliveries.</span>
          </div>

          <hr className="border-slate-100" />

          {/* Auto-Simulate Supplier Replies Toggle */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="space-y-0.5 pr-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Auto-Simulate Replies</span>
                <span className="text-[9px] text-slate-400 font-semibold block leading-tight">Mock inbound replies automatically during real campaign tests.</span>
              </div>
              <button
                type="button"
                onClick={() => handleSettingChange('auto_simulate_suppliers', !settings.auto_simulate_suppliers)}
                className={`transition-colors duration-200 rounded-full focus:outline-none ${
                  settings.auto_simulate_suppliers ? 'text-[#0078d4]' : 'text-slate-300'
                }`}
              >
                {settings.auto_simulate_suppliers ? <ToggleRight size={38} /> : <ToggleLeft size={38} />}
              </button>
            </div>
          </div>

          {settings.auto_simulate_suppliers && (
            <div className="space-y-1.5 bg-slate-50/75 p-3 rounded-xl border border-slate-100">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Reply Delay (Seconds)</label>
              <input
                type="number"
                min="5"
                max="300"
                value={settings.simulation_delay_seconds}
                onChange={(e) => setSettings(prev => ({ ...prev, simulation_delay_seconds: parseInt(e.target.value) || 10 }))}
                onBlur={(e) => handleSettingChange('simulation_delay_seconds', parseInt(e.target.value) || 10)}
                className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#0078d4] font-medium"
              />
              <span className="text-[9px] text-slate-400 font-semibold block leading-normal">
                Setting this to 40 seconds means a 3-round negotiation takes 3-4 minutes total, mimicking real supplier lag.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Selected Email Detailed Viewer Modal */}
      {selectedEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-250 w-full max-w-2xl rounded-2xl shadow-xl flex flex-col max-h-[85vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-start">
              <div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider ${
                  selectedEmail.direction === 'inbound'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {selectedEmail.direction === 'inbound' ? '← Inbound (Supplier reply)' : '→ Outbound (AI Outreach)'}
                </span>
                <h4 className="text-sm font-bold text-slate-800 mt-2">{selectedEmail.subject}</h4>
              </div>
              <button 
                onClick={() => setSelectedEmail(null)}
                className="text-xs font-bold text-slate-400 hover:text-slate-700 bg-transparent border-none outline-none cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Details Grid */}
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 grid grid-cols-2 gap-4 text-xs font-semibold text-slate-500">
              <div>
                <span className="text-[9px] font-bold text-slate-400 block mb-0.5">CORRESPONDENT</span>
                <span className="text-slate-750 font-bold block truncate">{selectedEmail.supplier_email}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 block mb-0.5">CONTEXT DETAILS</span>
                <span className="text-slate-750 font-bold block">
                  {selectedEmail.rfq_number ? `RFQ Reference: ${selectedEmail.rfq_number}` : 'No RFQ context'}
                </span>
              </div>
            </div>

            {/* Modal Email Body Content */}
            <div className="p-6 overflow-y-auto flex-1 font-mono text-[11px] leading-relaxed whitespace-pre-line bg-slate-950 text-slate-200">
              {selectedEmail.body}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
              {selectedEmail.rfq_number && (
                <span className="text-[10px] text-slate-400 font-mono font-bold mr-auto self-center">
                  RFQ ID: {selectedEmail.rfq_number}
                </span>
              )}
              <button
                onClick={() => setSelectedEmail(null)}
                className="bg-slate-200 text-slate-750 hover:bg-slate-350 text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                Done Viewing
              </button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}
