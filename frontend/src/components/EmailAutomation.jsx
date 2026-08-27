import React, { useState, useEffect } from 'react';
import { 
  Mail, Send, RefreshCw, Bot, Sparkles, CheckCircle, 
  AlertCircle, Clock, BellRing, Pause, Play, ShieldAlert,
  ListFilter
} from 'lucide-react';
import { emailService, rfqService, supplierService } from '../services/api';

export default function EmailAutomation({ redirectSupplierId, onNavigate, activeRfqNum }) {
  const [activeTab, setActiveTab] = useState('compose');
  const [rfqs, setRfqs] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingFollowups, setFetchingFollowups] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [oneClickLoading, setOneClickLoading] = useState(false);

  // Form compose state
  const [selectedRfqNum, setSelectedRfqNum] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    // Load selectors data
    rfqService.getAll().then((res) => {
      // Filter primarily to only the active RFQ
      const filtered = activeRfqNum
        ? res.data.filter(r => r.rfq_number === activeRfqNum)
        : res.data;
      setRfqs(filtered);
      if (filtered.length > 0) {
        setSelectedRfqNum(filtered[0].rfq_number);
      } else if (activeRfqNum) {
        setSelectedRfqNum(activeRfqNum);
      }
    });

    supplierService.getAll().then((res) => {
      // Filter to only include suppliers synced to ERP
      const erpOnly = res.data.filter(s => s.synced_to_erp || s.erp_vendor_id);
      setSuppliers(erpOnly);
      if (erpOnly.length > 0) {
        // If redirected from search, select that supplier
        const initialSup = redirectSupplierId ? String(redirectSupplierId) : String(erpOnly[0].id);
        setSelectedSupplierId(initialSup);
      }
    });

    fetchFollowUps();
  }, [redirectSupplierId, activeRfqNum]);

  // Handle auto-generation if redirected or options change
  useEffect(() => {
    if (selectedRfqNum && selectedSupplierId && activeTab === 'compose') {
      handleGenerateDraft();
    }
  }, [selectedRfqNum, selectedSupplierId]);

  const fetchFollowUps = () => {
    setFetchingFollowups(true);
    emailService.getFollowUpStatus()
      .then((res) => {
        const filtered = activeRfqNum
          ? res.data.filter(f => f.rfq_number === activeRfqNum)
          : res.data;
        setFollowUps(filtered);
        setFetchingFollowups(false);
      })
      .catch((err) => {
        console.error(err);
        setFetchingFollowups(false);
      });
  };

  const handleGenerateDraft = () => {
    if (!selectedRfqNum || !selectedSupplierId) return;
    
    setDrafting(true);
    setSubject('');
    setBody('');

    emailService.generateDraft(selectedRfqNum, selectedSupplierId)
      .then((res) => {
        setSubject(res.data.subject);
        setBody(res.data.body);
        setDrafting(false);
      })
      .catch((err) => {
        console.error(err);
        setDrafting(false);
      });
  };

  const handleSendEmail = (e) => {
    e.preventDefault();
    if (!selectedRfqNum || !selectedSupplierId || !subject || !body) return;

    setLoading(true);
    emailService.sendEmail(selectedRfqNum, selectedSupplierId, subject, body)
      .then((res) => {
        setToastMsg('RFQ inquiry email dispatched!');
        setLoading(false);
        fetchFollowUps();
        
        // Redirect to follow up tracking tab
        setTimeout(() => {
          setToastMsg('');
          setActiveTab('tracking');
        }, 1500);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
        alert('Failed to send email.');
      });
  };

  const handleOneClickSend = () => {
    if (!selectedRfqNum || !selectedSupplierId) return;

    setOneClickLoading(true);
    setToastMsg('AI generating & sending RFQ inquiry...');

    emailService.generateDraft(selectedRfqNum, selectedSupplierId)
      .then((res) => {
        const generatedSubject = res.data.subject;
        const generatedBody = res.data.body;

        setSubject(generatedSubject);
        setBody(generatedBody);

        return emailService.sendEmail(selectedRfqNum, selectedSupplierId, generatedSubject, generatedBody);
      })
      .then((res) => {
        setToastMsg('RFQ inquiry email generated & dispatched!');
        setOneClickLoading(false);
        fetchFollowUps();

        setTimeout(() => {
          setToastMsg('');
          setActiveTab('tracking');
        }, 1500);
      })
      .catch((err) => {
        console.error(err);
        setOneClickLoading(false);
        setToastMsg('');
        alert('Failed to automatically generate and send email.');
      });
  };

  const handleTriggerReminder = (emailId) => {
    emailService.triggerReminder(emailId)
      .then((res) => {
        setToastMsg('Inquiry follow-up reminder sent!');
        fetchFollowUps();
        setTimeout(() => setToastMsg(''), 3000);
      })
      .catch((err) => {
        console.error(err);
        alert('Failed to send reminder.');
      });
  };

  // Toggle pause follow up
  const [pausedFollowups, setPausedFollowups] = useState([]);
  const handleTogglePause = (emailId) => {
    if (pausedFollowups.includes(emailId)) {
      setPausedFollowups(pausedFollowups.filter(id => id !== emailId));
    } else {
      setPausedFollowups([...pausedFollowups, emailId]);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-6">
      
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-4 right-4 bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-bounce">
          <CheckCircle size={20} />
          <span className="text-sm font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Header and tab buttons */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">RFQ Email Automation</h1>
          <p className="text-xs text-slate-500 mt-1">Compose request emails using GPT-4o-mini and track response delays.</p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex border border-slate-200 rounded-lg p-1 bg-slate-50 shrink-0">
          <button 
            onClick={() => setActiveTab('compose')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'compose' ? 'bg-white text-[#0078d4] shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Compose Drafts
          </button>
          <button 
            onClick={() => { setActiveTab('tracking'); fetchFollowUps(); }}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'tracking' ? 'bg-white text-[#0078d4] shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Follow-Up Tracking
          </button>
        </div>
      </div>

      {activeTab === 'compose' ? (
        // TAB 1: COMPOSE INBOX
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Options Sidebar */}
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 h-fit">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Sparkles size={16} className="text-[#0078d4]" />
              <h3 className="text-sm font-semibold text-slate-800">Draft Setup</h3>
            </div>

            <div className="space-y-4 text-xs">
              
              <div className="flex flex-col">
                <label className="font-semibold text-slate-600 mb-1">Select RFQ * (Active RFQ locked)</label>
                <select 
                  value={selectedRfqNum}
                  onChange={(e) => setSelectedRfqNum(e.target.value)}
                  className="copilot-input bg-slate-100 text-slate-500 cursor-not-allowed"
                  disabled={true}
                >
                  {rfqs.map((r, i) => (
                    <option key={i} value={r.rfq_number}>
                      {r.rfq_number} — {r.item_name} ({r.quantity} {r.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col">
                <label className="font-semibold text-slate-600 mb-1">Target Supplier *</label>
                <select 
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="copilot-input"
                  disabled={drafting || loading || oneClickLoading}
                >
                  {suppliers.map((s, i) => (
                    <option key={i} value={s.id}>
                      {s.name} ({s.country})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 space-y-2">
                <button 
                  type="button"
                  onClick={handleGenerateDraft}
                  disabled={drafting || loading || oneClickLoading}
                  className="w-full copilot-btn-secondary inline-flex items-center justify-center gap-1.5 text-xs py-2"
                >
                  <RefreshCw size={14} className={drafting ? 'animate-spin' : ''} />
                  Re-Draft with AI
                </button>

                <button 
                  type="button"
                  onClick={handleOneClickSend}
                  disabled={drafting || loading || oneClickLoading}
                  className={`w-full text-white px-4 py-2.5 rounded-lg font-medium transition-colors duration-200 shadow-sm flex items-center justify-center gap-1.5 text-xs ${
                    oneClickLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  <Send size={14} className={oneClickLoading ? 'animate-spin' : ''} />
                  {oneClickLoading ? 'Sending Inquiry...' : 'One-Click Send'}
                </button>
              </div>

            </div>
          </div>

          {/* Email Form builder */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-5">
              <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Bot size={16} className="text-[#0078d4]" /> AI Generated Request Draft
              </h2>
              <span className="text-[10px] bg-blue-50 text-[#0078d4] px-2 py-0.5 rounded font-semibold">
                ProcureX Co.
              </span>
            </div>

            {drafting ? (
              <div className="space-y-4">
                <div className="ai-thinking-shimmer h-10 rounded-lg"></div>
                <div className="ai-thinking-shimmer h-60 rounded-lg"></div>
                <div className="text-center text-xs text-slate-500 font-semibold pt-2">AI is drafting professional request terms...</div>
              </div>
            ) : (
              <form onSubmit={handleSendEmail} className="space-y-4 text-xs">
                
                {/* Destination address */}
                <div className="flex flex-col">
                  <label className="font-semibold text-slate-500 mb-1">TO:</label>
                  <input 
                    type="text" 
                    value={suppliers.find(s => String(s.id) === selectedSupplierId)?.email || ''}
                    className="copilot-input bg-slate-50 text-slate-500 font-medium"
                    readOnly
                  />
                </div>

                {/* Subject */}
                <div className="flex flex-col">
                  <label className="font-semibold text-slate-600 mb-1">Subject</label>
                  <input 
                    type="text" 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter email subject..."
                    className="copilot-input font-semibold text-slate-800"
                    disabled={loading || oneClickLoading}
                    required
                  />
                </div>

                {/* Body */}
                <div className="flex flex-col">
                  <label className="font-semibold text-slate-600 mb-1">Inquiry Body</label>
                  <textarea 
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows="12"
                    placeholder="Inquiry content details..."
                    className="copilot-input font-medium text-slate-700 leading-relaxed font-sans"
                    disabled={loading || oneClickLoading}
                    required
                  ></textarea>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                    <CheckCircle size={12} className="text-emerald-500" /> Auto-attached RFQ PDF details
                  </span>
                  <button 
                    type="submit"
                    disabled={loading || oneClickLoading}
                    className="copilot-btn-primary px-6"
                  >
                    <Send size={14} /> Send RFQ Inquiry
                  </button>
                </div>

              </form>
            )}
          </div>

        </div>
      ) : (
        // TAB 2: FOLLOW-UP DASHBOARD
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700">Follow-Up Cadence Tracker</span>
            <button 
              onClick={fetchFollowUps}
              disabled={fetchingFollowups}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              <RefreshCw size={12} className={fetchingFollowups ? 'animate-spin' : ''} /> Refresh Statuses
            </button>
          </div>

          {fetchingFollowups ? (
            <div className="p-12 text-center text-slate-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0078d4] mx-auto mb-2"></div>
              <span className="text-xs font-semibold">Reading mail threads timeline...</span>
            </div>
          ) : followUps.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Clock className="mx-auto text-slate-350 mb-2" size={32} />
              <p className="text-xs font-semibold">No emails sent yet. Compose and send to initialize follow-ups.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
                    <th className="p-4">RFQ Ref</th>
                    <th className="p-4">Material</th>
                    <th className="p-4">Supplier Name</th>
                    <th className="p-4">Contact Email</th>
                    <th className="p-4">Inquiry Date</th>
                    <th className="p-4 text-center">Days Unanswered</th>
                    <th className="p-4">Response Status</th>
                    <th className="p-4 text-right">Cadence Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {followUps.map((e, idx) => {
                    const isPaused = pausedFollowups.includes(e.id);
                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-semibold text-[#0078d4]">{e.rfq_number}</td>
                        <td className="p-4 font-medium text-slate-800">{e.rfq_item}</td>
                        <td className="p-4 font-semibold text-slate-800">{e.supplier_name}</td>
                        <td className="p-4 text-slate-500">{e.supplier_email}</td>
                        <td className="p-4 text-slate-400">{e.sent_date}</td>
                        <td className="p-4 text-center font-bold text-slate-700">{e.days_elapsed}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            e.status === 'Quotation Received' ? 'bg-emerald-50 text-emerald-700' :
                            e.status === 'No Response (Overdue)' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {e.status}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-1.5">
                          <button 
                            onClick={() => handleTogglePause(e.id)}
                            className={`px-2.5 py-1.5 rounded font-semibold text-xs inline-flex items-center gap-1 transition-all ${
                              isPaused 
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700' 
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                            }`}
                          >
                            {isPaused ? <Play size={12} /> : <Pause size={12} />}
                            {isPaused ? 'Resume Cadence' : 'Pause Follow-up'}
                          </button>
                          
                          <button 
                            onClick={() => handleTriggerReminder(e.id)}
                            disabled={e.status === 'Quotation Received' || isPaused}
                            className={`copilot-btn-primary text-xs px-2.5 py-1.5 inline-flex items-center gap-1 shadow-none ${
                              (e.status === 'Quotation Received' || isPaused) ? 'opacity-40 cursor-not-allowed bg-slate-300' : ''
                            }`}
                          >
                            <BellRing size={12} /> Send Reminder
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
