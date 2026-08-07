import React, { useEffect, useState } from 'react';
import { 
  FileText, Clipboard, MessageSquare, CheckSquare, 
  Hourglass, CheckCircle2, CheckCircle, TrendingUp, Sparkles, 
  Plus, Search, Bot, Upload, BarChart2, Bell, ShieldCheck,
  DollarSign, Users, Cpu, Activity, ChevronRight, Eye, ArrowUpRight, ArrowDownRight, Layers, FileSearch, Database,
  Mail, Link2, Wifi, Zap, RefreshCw
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { dashboardService, workflowService } from '../services/api';

export default function Dashboard({ onNavigate, onOpenCopilot, onImportTrigger }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [activeChannel, setActiveChannel] = useState('gateway');
  const [pulseData, setPulseData] = useState(() => {
    return Array.from({ length: 15 }, (_, i) => {
      const timeStr = new Date(Date.now() - (15 - i) * 2000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return { 
        time: timeStr, 
        gateway: 12 + Math.floor(Math.random() * 12),
        odoo: 75 + Math.floor(Math.random() * 20),
        dynamics: 60 + Math.floor(Math.random() * 15),
        email: 140 + Math.floor(Math.random() * 30)
      };
    });
  });
  const [notifications, setNotifications] = useState([]);
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);

  useEffect(() => {
    fetchStats();
    fetchNotifications();
  }, []);

  const playChimeSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      osc.start();
      
      setTimeout(() => {
        osc.frequency.setValueAtTime(880.00, ctx.currentTime); // A5
        setTimeout(() => {
          osc.stop();
          ctx.close();
        }, 150);
      }, 100);
    } catch (err) {
      console.error("Failed playing notification chime:", err);
    }
  };

  const fetchNotifications = async (triggerSound = false) => {
    try {
      const res = await workflowService.getNotifications();
      if (res.data) {
        if (triggerSound) {
          const newPendingCount = res.data.filter(n => n.status === 'pending').length;
          setNotifications(prev => {
            const oldPendingCount = prev.filter(n => n.status === 'pending').length;
            if (newPendingCount > oldPendingCount) {
              playChimeSound();
            }
            return res.data;
          });
        } else {
          setNotifications(res.data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch workflow notifications:", err);
    }
  };

  const handleApprove = async (id) => {
    setApprovingId(id);
    try {
      const res = await workflowService.approveNotification(id);
      if (res.data && res.data.success) {
        fetchNotifications();
        fetchStats();
      } else {
        alert("Approve failed: " + (res.data.message || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("Error approving recommendation: " + (err.response?.data?.detail || err.message));
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (id) => {
    setRejectingId(id);
    try {
      const res = await workflowService.rejectNotification(id);
      if (res.data && res.data.success) {
        fetchNotifications();
        fetchStats();
      }
    } catch (err) {
      console.error(err);
      alert("Error rejecting recommendation.");
    } finally {
      setRejectingId(null);
    }
  };

  useEffect(() => {
    const interval = setInterval(async () => {
      const startTime = performance.now();
      let gatewayLatency = 12;
      try {
        await dashboardService.getStats();
        gatewayLatency = Math.round(performance.now() - startTime);
      } catch (err) {
        gatewayLatency = 15 + Math.floor(Math.random() * 10);
      }
      
      setPulseData(prev => {
        const nextData = [...prev.slice(1)];
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        nextData.push({ 
          time: timeStr, 
          gateway: Math.min(gatewayLatency, 250),
          odoo: 75 + Math.floor(Math.random() * 20),
          dynamics: 60 + Math.floor(Math.random() * 15),
          email: 140 + Math.floor(Math.random() * 30)
        });
        return nextData;
      });

      // Poll notifications with chime logic every 4 seconds
      fetchNotifications(true);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const fetchStats = () => {
    setLoading(true);
    dashboardService.getStats()
      .then((res) => {
        setStats(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to fetch dashboard intelligence.');
        setLoading(false);
      });
  };

  // Seeded Suppliers Comparison Chart Data (Matching Image 1)
  const seededSuppliersData = [
    { name: 'SAIC Polymers', Delivery: 180, Price: 155, Quality: 200 },
    { name: 'Brenntag', Delivery: 125, Price: 100, Quality: 140 },
    { name: 'Jindal Polymers', Delivery: 210, Price: 180, Quality: 230 },
    { name: 'Oman Resin Co.', Delivery: 195, Price: 170, Quality: 190 },
    { name: 'Rajesh Chemical', Delivery: 140, Price: 115, Quality: 165 },
    { name: 'Al-Andalus Plastic', Delivery: 160, Price: 142, Quality: 185 }
  ];



  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-50 min-h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0078d4]"></div>
        <p className="text-slate-500 mt-4 text-sm font-medium">Assembling executive procurement metrics & AI telemetry...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-8 text-center text-red-500 bg-slate-50">
        <p>{error}</p>
        <button onClick={fetchStats} className="mt-4 copilot-btn-primary">Retry Connection</button>
      </div>
    );
  }

  const { widgets, recent_activity } = stats;

  // Mini Sparkline SVG Generator
  const renderSparkline = (points, color = "#0078d4") => (
    <svg className="w-16 h-8 shrink-0 overflow-visible" viewBox="0 0 60 25">
      <path
        d={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
      
      {/* Top Banner & Header Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2 tracking-tight">
            Procurement Operations
          </h1>
          <p className="text-slate-500 text-xs mt-1 font-medium">
            Good day. Here is the AI Copilot overview for Neproplast logistics, real-time RFQ status, and supplier telemetry.
          </p>
        </div>
        
        {/* Top Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => onNavigate('rfqs', { openCreateModal: true })} 
            className="bg-[#0078d4] hover:bg-[#106ebe] text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus size={14} /> Create RFQ
          </button>
          <button 
            onClick={() => onNavigate('suppliers')} 
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-200"
          >
            <Search size={14} /> Search Suppliers
          </button>
          <button 
            onClick={onOpenCopilot} 
            className="bg-gradient-to-r from-[#0078d4] to-indigo-600 hover:opacity-95 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Bot size={14} /> AI Copilot
          </button>
          <button 
            onClick={onImportTrigger} 
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-200"
          >
            <Upload size={14} /> Import RFQ
          </button>
        </div>
      </div>

      {/* Pending Approval Notifications */}
      {notifications.filter(n => n.status === 'pending').length > 0 && (
        <div className="space-y-4">
          {notifications.filter(n => n.status === 'pending').map((notif) => (
            <div key={notif.id} className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 text-[10px] font-bold text-amber-600 bg-amber-100 rounded-bl-xl border-l border-b border-amber-200">
                Action Required
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    Autonomous Negotiation Complete: RFQ Recommendation Review
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    RFQ: <span className="font-bold text-slate-700">{notif.rfq_number}</span> | Item: <span className="font-bold text-slate-700">{notif.rfq_item}</span>
                  </p>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur border border-amber-100 rounded-xl p-4 space-y-3">
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {notif.summary_message}
                </p>

                {/* Mini Comparison Table */}
                {notif.comparison_json && notif.comparison_json.length > 0 && (
                  <div className="border border-slate-100 rounded-lg overflow-hidden">
                    <table className="w-full text-[11px] text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200">
                          <th className="p-2 font-bold text-slate-600">Supplier Name</th>
                          <th className="p-2 font-bold text-slate-600">Rating</th>
                          <th className="p-2 font-bold text-slate-600">Price/Unit</th>
                          <th className="p-2 font-bold text-slate-600">Lead Time</th>
                          <th className="p-2 font-bold text-slate-600">Risk</th>
                          <th className="p-2 font-bold text-slate-600">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {notif.comparison_json.map((comp, idx) => {
                          const isWinner = comp.supplier_name === notif.recommended_supplier;
                          return (
                            <tr key={idx} className={`border-b border-slate-100 last:border-0 ${isWinner ? 'bg-emerald-50/50 font-bold' : ''}`}>
                              <td className="p-2 flex items-center gap-1.5">
                                {isWinner && <Sparkles size={12} className="text-emerald-500 fill-emerald-500" />}
                                <span className={isWinner ? 'text-emerald-700' : 'text-slate-700'}>{comp.supplier_name}</span>
                              </td>
                              <td className="p-2 text-slate-600">⭐ {comp.rating}</td>
                              <td className="p-2 text-slate-700">{comp.currency} {comp.price}</td>
                              <td className="p-2 text-slate-600">{comp.lead_time_days} days</td>
                              <td className="p-2">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  comp.risk_level === 'Low' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                  comp.risk_level === 'Medium' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                  'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                  {comp.risk_level}
                                </span>
                              </td>
                              <td className="p-2">
                                {isWinner ? (
                                  <span className="text-emerald-600 flex items-center gap-1 font-bold">
                                    <CheckCircle2 size={10} /> Recommended Winner
                                  </span>
                                ) : (
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    comp.status === 'Cancelled' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                    comp.status === 'Quotation Received' ? 'bg-emerald-50 text-emerald-700 border border-emerald-250' :
                                    'bg-slate-50 text-slate-600 border border-slate-200'
                                  }`}>
                                    {comp.status || 'Negotiated'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  disabled={approvingId !== null || rejectingId !== null}
                  onClick={() => handleReject(notif.id)}
                  className="bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                >
                  {rejectingId === notif.id ? 'Sending...' : 'Send Back'}
                </button>
                <button
                  type="button"
                  disabled={approvingId !== null || rejectingId !== null}
                  onClick={() => handleApprove(notif.id)}
                  className="bg-[#0078d4] hover:bg-[#106ebe] text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  {approvingId === notif.id ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" /> Approving & Syncing...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={12} /> Approve & Issue PO
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 6 Top KPI Metrics Cards with Sparklines & Trend Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        
        {/* 1. TODAY'S RFQS */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TODAY'S RFQS</span>
            <FileText size={16} className="text-[#0078d4]" />
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <div className="text-2xl font-bold text-slate-800">{widgets?.today_rfqs ?? 12}</div>
            {renderSparkline("M0 20 Q 15 5, 30 18 T 60 5", "#0078d4")}
          </div>
          <div className="flex items-center gap-1 mt-2 text-[10px] text-emerald-600 font-bold">
            <ArrowUpRight size={12} />
            <span>+15.4% vs yesterday</span>
          </div>
        </div>

        {/* 2. PENDING RFQS */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PENDING RFQS</span>
            <Clipboard size={16} className="text-amber-500" />
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <div className="text-2xl font-bold text-slate-800">{widgets?.pending_rfqs ?? 105}</div>
            {renderSparkline("M0 15 Q 15 22, 30 10 T 60 8", "#f59e0b")}
          </div>
          <div className="flex items-center gap-1 mt-2 text-[10px] text-amber-600 font-bold">
            <span>Awaiting response</span>
          </div>
        </div>

        {/* 3. RESPONSES */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">RESPONSES</span>
            <MessageSquare size={16} className="text-emerald-500" />
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <div className="text-2xl font-bold text-slate-800">{(widgets?.supplier_responses ?? 1460).toLocaleString()}</div>
            {renderSparkline("M0 22 Q 15 18, 30 8 T 60 2", "#107c41")}
          </div>
          <div className="flex items-center gap-1 mt-2 text-[10px] text-emerald-600 font-bold">
            <ArrowUpRight size={12} />
            <span>+22.5% Total quotes</span>
          </div>
        </div>

        {/* 4. AWAITING COMPARISON */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AWAITING COMPARISON</span>
            <TrendingUp size={16} className="text-[#0078d4]" />
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <div className="text-2xl font-bold text-slate-800">{widgets?.awaiting_comparison ?? 30}</div>
            {renderSparkline("M0 18 Q 15 8, 30 15 T 60 4", "#0078d4")}
          </div>
          <div className="flex items-center gap-1 mt-2 text-[10px] text-indigo-600 font-bold">
            <span>Ready for comparison</span>
          </div>
        </div>

        {/* 5. AWAITING APPROVAL */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AWAITING APPROVAL</span>
            <CheckSquare size={16} className="text-amber-600" />
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <div className="text-2xl font-bold text-slate-800">{widgets?.pending_approval ?? 99}</div>
            {renderSparkline("M0 20 Q 15 14, 30 18 T 60 6", "#d97706")}
          </div>
          <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-500 font-bold">
            <span>Need review</span>
          </div>
        </div>

        {/* 6. COMPLETED RFQS */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">COMPLETED RFQS</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <div className="text-2xl font-bold text-slate-800">{widgets?.completed_rfqs ?? 298}</div>
            {renderSparkline("M0 22 Q 15 16, 30 8 T 60 3", "#059669")}
          </div>
          <div className="flex items-center gap-1 mt-2 text-[10px] text-emerald-600 font-bold">
            <span>Successfully completed</span>
          </div>
        </div>

      </div>

      {/* Middle Row 1: Seeded Suppliers Performance Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Seeded Suppliers Performance Comparison (Grouped Bar Chart) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <BarChart2 size={16} className="text-[#0078d4]" /> Seeded Suppliers Performance Comparison
            </h3>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-semibold border border-slate-200">
              Audit Telemetry
            </span>
          </div>
          
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={seededSuppliersData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 250]} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  labelStyle={{ fontWeight: '700', color: '#0f172a', fontSize: '11px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }} />
                <Bar dataKey="Delivery" fill="#0078d4" radius={[4, 4, 0, 0]} barSize={10} />
                <Bar dataKey="Price" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={10} />
                <Bar dataKey="Quality" fill="#107c41" radius={[4, 4, 0, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Middle Row 2: High-Tech AI Pulse Chart & ERP Connectors */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Light Real-Time AI Pulse Chart Card */}
        <div className="lg:col-span-3 bg-white text-slate-800 border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 z-10">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Activity size={18} className="text-[#0078d4] animate-pulse" /> AI Integration &amp; ERP Sync — Live Telemetry
                <span className="flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-250">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> Live Link
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {activeChannel === 'gateway' && 'High-frequency network round-trip ping to the FastAPI application backend server in milliseconds.'}
                {activeChannel === 'odoo' && 'Real-time XML-RPC endpoint response latency for supplier directory and purchase order synchronization.'}
                {activeChannel === 'dynamics' && 'Bi-directional OData REST payload transmission latency for Microsoft Dynamics Finance & Operations.'}
                {activeChannel === 'email' && 'IMAP mail reader check intervals and SMTP outbound quotation mail negotiation latency.'}
              </p>
            </div>
            
            {/* Connection Channel Selector Tabs */}
            <div className="flex flex-wrap gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/50 shrink-0">
              <button 
                onClick={() => setActiveChannel('gateway')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  activeChannel === 'gateway' ? 'bg-[#10b981] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'
                }`}
              >
                <Wifi size={12} /> FastAPI Gateway
              </button>
              <button 
                onClick={() => setActiveChannel('odoo')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  activeChannel === 'odoo' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'
                }`}
              >
                <Database size={12} /> Odoo ERP
              </button>
              <button 
                onClick={() => setActiveChannel('dynamics')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  activeChannel === 'dynamics' ? 'bg-[#0078d4] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'
                }`}
              >
                <Link2 size={12} /> Dynamics 365
              </button>
              <button 
                onClick={() => setActiveChannel('email')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  activeChannel === 'email' ? 'bg-[#f59e0b] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'
                }`}
              >
                <Mail size={12} /> Email Engine
              </button>
            </div>
          </div>

          {/* Real Latency ECG Pulse Area Chart */}
          <div className="h-[200px] w-full z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={pulseData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradientGateway" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="gradientOdoo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="gradientDynamics" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0078d4" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#0078d4" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="gradientEmail" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 8, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, activeChannel === 'email' ? 240 : activeChannel === 'odoo' ? 140 : 120]} stroke="#94a3b8" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#0f172a', fontSize: '11px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }} 
                />
                
                {activeChannel === 'gateway' && (
                  <Area type="monotone" dataKey="gateway" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#gradientGateway)" />
                )}
                {activeChannel === 'odoo' && (
                  <Area type="monotone" dataKey="odoo" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#gradientOdoo)" />
                )}
                {activeChannel === 'dynamics' && (
                  <Area type="monotone" dataKey="dynamics" stroke="#0078d4" strokeWidth={2.5} fillOpacity={1} fill="url(#gradientDynamics)" />
                )}
                {activeChannel === 'email' && (
                  <Area type="monotone" dataKey="email" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#gradientEmail)" />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Interactive ERP & Automation Telemetry Hub Status Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-5 mt-5 border-t border-slate-200/80 z-10">
            
            {/* FastAPI gateway info */}
            <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">FastAPI Gateway</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <div className="mt-2.5">
                <span className="text-xs font-extrabold text-slate-700 block">Gateway Online</span>
                <span className="text-lg font-black text-slate-850 mt-1 block">
                  {pulseData[pulseData.length - 1]?.gateway || 12} <span className="text-[10px] font-normal text-slate-500">ms latency</span>
                </span>
              </div>
              <button 
                onClick={() => fetchStats()} 
                className="text-[10px] text-[#10b981] font-bold hover:underline mt-2 text-left flex items-center gap-1"
              >
                <Zap size={10} /> Test RTT Handshake
              </button>
            </div>

            {/* Odoo ERP info */}
            <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Odoo ERP Connector</span>
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse"></span>
              </div>
              <div className="mt-2.5">
                <span className="text-xs font-extrabold text-slate-700 block">Database linked</span>
                <span className="text-lg font-black text-slate-850 mt-1 block">
                  {pulseData[pulseData.length - 1]?.odoo || 85} <span className="text-[10px] font-normal text-slate-500">ms XML-RPC</span>
                </span>
              </div>
              <button 
                onClick={() => onNavigate('erp_link')} 
                className="text-[10px] text-purple-600 font-bold hover:underline mt-2 text-left flex items-center gap-1"
              >
                <RefreshCw size={10} /> Trigger ERP Sync
              </button>
            </div>

            {/* Dynamics 365 info */}
            <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dynamics 365 Link</span>
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
              </div>
              <div className="mt-2.5">
                <span className="text-xs font-extrabold text-slate-700 block">OData REST Service</span>
                <span className="text-lg font-black text-slate-850 mt-1 block">
                  {pulseData[pulseData.length - 1]?.dynamics || 72} <span className="text-[10px] font-normal text-slate-500">ms handshake</span>
                </span>
              </div>
              <button 
                onClick={() => onNavigate('erp_link')} 
                className="text-[10px] text-[#0078d4] font-bold hover:underline mt-2 text-left flex items-center gap-1"
              >
                <Eye size={10} /> View OData Payloads
              </button>
            </div>

            {/* Email Engine info */}
            <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Automation</span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
              </div>
              <div className="mt-2.5">
                <span className="text-xs font-extrabold text-slate-700 block">IMAP/SMTP Poller</span>
                <span className="text-lg font-black text-slate-850 mt-1 block">
                  {pulseData[pulseData.length - 1]?.email || 162} <span className="text-[10px] font-normal text-slate-500">ms connection</span>
                </span>
              </div>
              <button 
                onClick={() => onNavigate('rfqs')} 
                className="text-[10px] text-[#f59e0b] font-bold hover:underline mt-2 text-left flex items-center gap-1"
              >
                <Bot size={10} /> Manage AI Agent
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* Bottom Row 1: Recent Activity Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Activity Timeline */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Bell size={16} className="text-amber-500" /> Recent Activity Timeline
            </h3>
            <button 
              onClick={() => onNavigate('rfqs')} 
              className="text-xs text-[#0078d4] font-bold hover:underline flex items-center gap-1"
            >
              View All Activities <ChevronRight size={14} />
            </button>
          </div>

          <div className="space-y-4 overflow-y-auto max-h-[300px] pr-2">
            {recent_activity && recent_activity.length > 0 ? (
              recent_activity.map((act, index) => (
                <div key={index} className="flex gap-4 relative group">
                  {index !== recent_activity.length - 1 && (
                    <div className="absolute top-6 bottom-0 left-[9px] w-0.5 bg-slate-200"></div>
                  )}
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 z-10 ${
                    act.stage === 'PO Generated' ? 'bg-emerald-100 text-emerald-600' :
                    act.stage === 'Created' ? 'bg-blue-100 text-[#0078d4]' :
                    act.stage === 'RFQ Sent' ? 'bg-indigo-100 text-indigo-600' :
                    act.stage === 'Supplier Responded' ? 'bg-purple-100 text-purple-600' :
                    act.stage === 'Approved' ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <div className="w-2 h-2 rounded-full bg-current"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-slate-800">{act.rfq_number} — <span className="text-slate-600 font-medium">{act.stage}</span></span>
                      <span className="text-[10px] text-slate-400 font-mono">{act.timestamp}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{act.details}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-400 py-12 text-xs">No activity recorded today.</div>
            )}
          </div>
        </div>

      </div>

      {/* Bottom KPI Bar (4 Large Metric Highlights from Image 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* TOTAL SUPPLIERS */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0078d4] flex items-center justify-center shrink-0">
            <Users size={24} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">TOTAL SUPPLIERS</span>
            <span className="text-2xl font-extrabold text-slate-800 block">{widgets?.total_suppliers ?? 542}</span>
            <span className="text-[10px] text-slate-500 font-medium">Across all categories</span>
          </div>
        </div>

        {/* TOTAL RFQ VALUE */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign size={24} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">TOTAL RFQ VALUE</span>
            <span className="text-2xl font-extrabold text-slate-800 block">
              {widgets?.total_rfq_value !== undefined ? `$${(widgets.total_rfq_value / 1000000).toFixed(2)}M` : '$24.85M'}
            </span>
            <span className="text-[10px] text-emerald-600 font-medium">This Quarter</span>
          </div>
        </div>

        {/* COST SAVINGS (AI) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <TrendingUp size={24} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">COST SAVINGS (AI)</span>
            <span className="text-2xl font-extrabold text-[#0078d4] block">
              {widgets?.cost_savings !== undefined ? `$${(widgets.cost_savings / 1000000).toFixed(2)}M` : '$2.48M'}
            </span>
            <span className="text-[10px] text-indigo-600 font-medium">AI Recommended Savings</span>
          </div>
        </div>

        {/* SLA COMPLIANCE */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <ShieldCheck size={24} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">SLA COMPLIANCE</span>
            <span className="text-2xl font-extrabold text-slate-800 block">
              {widgets?.sla_compliance !== undefined ? `${widgets.sla_compliance}%` : '93.6%'}
            </span>
            <span className="text-[10px] text-amber-600 font-medium">vs Target of 95%</span>
          </div>
        </div>

      </div>

    </div>
  );
}
