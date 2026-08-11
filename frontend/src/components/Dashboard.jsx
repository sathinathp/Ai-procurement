import React, { useEffect, useState } from 'react';
import {
  FileText, Clipboard, MessageSquare, CheckSquare,
  Hourglass, CheckCircle2, CheckCircle, TrendingUp, Sparkles,
  Plus, Search, Bot, Upload, BarChart2, Bell, ShieldCheck,
  DollarSign, Users, Cpu, Activity, ChevronRight, Eye, ArrowUpRight, ArrowDownRight, Layers, FileSearch, Database,
  Mail, Link2, Wifi, Zap, RefreshCw, AlertTriangle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { dashboardService, workflowService } from '../services/api';
import SupplierProfileModal from './SupplierProfileModal';

export default function Dashboard({ onNavigate, onOpenCopilot, onImportTrigger }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [activeChannel, setActiveChannel] = useState('gateway');
  const [selectedMonth, setSelectedMonth] = useState('All Months');
  const [alertsTimeframe, setAlertsTimeframe] = useState('This Month');
  const [alertsPage, setAlertsPage] = useState(1);
  const [activeAlertModal, setActiveAlertModal] = useState(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);

  const sourcingAlertsData = {
    'Today': {
      rfqsAttention: [
        { id: 'RFQ-2026-1002', reason: 'Quote Expiry in 4h' },
        { id: 'RFQ-2026-1004', reason: 'Clarification required' }
      ],
      deliveryRisks: [
        { supplier: 'Brenntag', risk: 'High' }
      ],
      recommendations: [
        { supplier: 'SAIC Polymers', rfq: 'RFQ #2841', metric: '98% quality' }
      ],
      savings: { amount: '₹2.1L', detail: 'Identified on RFQ-2026-1002' },
      historicalPrice: [
        { supplier: 'Brenntag', deviation: '12% above avg' }
      ],
      automations: { count: 2, detail: 'AI bidding batches ready' }
    },
    'This Week': {
      rfqsAttention: [
        { id: 'RFQ-2026-1002', reason: 'Pending response' },
        { id: 'RFQ-2026-1004', reason: 'Clarification required' },
        { id: 'RFQ-2026-1005', reason: 'Validation needed' }
      ],
      deliveryRisks: [
        { supplier: 'Brenntag', risk: 'High' },
        { supplier: 'Rajesh Chemical', risk: 'Medium' }
      ],
      recommendations: [
        { supplier: 'SAIC Polymers', rfq: 'RFQ #2841', metric: '98% quality' },
        { supplier: 'Oman Resin Co.', rfq: 'RFQ #2842', metric: 'Saves 10%' }
      ],
      savings: { amount: '₹5.8L', detail: 'Across 3 active campaigns' },
      historicalPrice: [
        { supplier: 'Brenntag', deviation: '12% above avg' },
        { supplier: 'Jindal Polymers', deviation: '7% above benchmark' }
      ],
      automations: { count: 4, detail: 'Auto-counter batches ready' }
    },
    'This Month': {
      rfqsAttention: [
        { id: 'RFQ-2026-1002', reason: 'Expiry warning' },
        { id: 'RFQ-2026-1004', reason: 'Clarification needed' },
        { id: 'RFQ-2026-1005', reason: 'Validation needed' },
        { id: 'RFQ-2026-1007', reason: 'Missing drawing spec' },
        { id: 'RFQ-2026-1008', reason: 'No quotes received' }
      ],
      deliveryRisks: [
        { supplier: 'Brenntag', risk: 'High' },
        { supplier: 'Rajesh Chemical', risk: 'Medium' },
        { supplier: 'Al-Andalus Plastic', risk: 'Medium' }
      ],
      recommendations: [
        { supplier: 'SAIC Polymers', rfq: 'RFQ #2841', metric: '98% quality' },
        { supplier: 'Oman Resin Co.', rfq: 'RFQ #2842', metric: 'Saves 10%' },
        { supplier: 'Jindal Polymers', rfq: 'RFQ #2845', metric: 'Optimal price' }
      ],
      savings: { amount: '₹18.4L', detail: 'Identified by AI Auto-Negotiator' },
      historicalPrice: [
        { supplier: 'Supplier B', deviation: '12% above avg' },
        { supplier: 'Brenntag', deviation: '8% deviation' }
      ],
      automations: { count: 4, detail: 'Eligible for autonomous agent' }
    },
    'This Year': {
      rfqsAttention: [
        { id: 'RFQ-2026-1002', reason: 'Expiry warning' },
        { id: 'RFQ-2026-1004', reason: 'Clarification needed' },
        { id: 'RFQ-2026-1005', reason: 'Validation needed' },
        { id: 'RFQ-2026-1007', reason: 'Missing drawing spec' },
        { id: 'RFQ-2026-1008', reason: 'No quotes received' },
        { id: 'RFQ-2026-1011', reason: 'Under verification' },
        { id: 'RFQ-2026-1012', reason: 'Price dispute' }
      ],
      deliveryRisks: [
        { supplier: 'Brenntag', risk: 'High' },
        { supplier: 'Rajesh Chemical', risk: 'Medium' },
        { supplier: 'Al-Andalus Plastic', risk: 'Medium' },
        { supplier: 'Oman Resin Co.', risk: 'Low' },
        { supplier: 'Jindal Polymers', risk: 'Low' }
      ],
      recommendations: [
        { supplier: 'SAIC Polymers', rfq: 'RFQ #2841', metric: '98% quality' },
        { supplier: 'Oman Resin Co.', rfq: 'RFQ #2842', metric: 'Saves 10%' },
        { supplier: 'Jindal Polymers', rfq: 'RFQ #2845', metric: 'Optimal price' }
      ],
      savings: { amount: '₹94.2L', detail: 'Cumulative potential savings' },
      historicalPrice: [
        { supplier: 'Supplier B', deviation: '12% above avg' },
        { supplier: 'Brenntag', deviation: '8% deviation' },
        { supplier: 'SAIC Polymers', deviation: '6% deviation' }
      ],
      automations: { count: 24, detail: 'Orchestration eligible' }
    }
  };
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

  // Seeded Suppliers Monthly Datasets
  const seededSuppliersMonthlyData = {
    'All Months': [
      { name: 'SAIC Polymers', Delivery: 180, Price: 155, Quality: 200 },
      { name: 'Brenntag', Delivery: 125, Price: 100, Quality: 140 },
      { name: 'Jindal Polymers', Delivery: 210, Price: 180, Quality: 230 },
      { name: 'Oman Resin Co.', Delivery: 195, Price: 170, Quality: 190 },
      { name: 'Rajesh Chemical', Delivery: 140, Price: 115, Quality: 165 },
      { name: 'Al-Andalus Plastic', Delivery: 160, Price: 142, Quality: 185 }
    ],
    'January': [
      { name: 'SAIC Polymers', Delivery: 140, Price: 130, Quality: 170 },
      { name: 'Brenntag', Delivery: 110, Price: 95, Quality: 130 },
      { name: 'Jindal Polymers', Delivery: 190, Price: 160, Quality: 210 },
      { name: 'Oman Resin Co.', Delivery: 170, Price: 150, Quality: 180 },
      { name: 'Rajesh Chemical', Delivery: 120, Price: 100, Quality: 140 },
      { name: 'Al-Andalus Plastic', Delivery: 140, Price: 130, Quality: 160 }
    ],
    'February': [
      { name: 'SAIC Polymers', Delivery: 165, Price: 140, Quality: 185 },
      { name: 'Brenntag', Delivery: 115, Price: 105, Quality: 135 },
      { name: 'Jindal Polymers', Delivery: 205, Price: 175, Quality: 220 },
      { name: 'Oman Resin Co.', Delivery: 185, Price: 165, Quality: 185 },
      { name: 'Rajesh Chemical', Delivery: 130, Price: 110, Quality: 150 },
      { name: 'Al-Andalus Plastic', Delivery: 150, Price: 138, Quality: 175 }
    ],
    'March': [
      { name: 'SAIC Polymers', Delivery: 180, Price: 155, Quality: 200 },
      { name: 'Brenntag', Delivery: 125, Price: 100, Quality: 140 },
      { name: 'Jindal Polymers', Delivery: 210, Price: 180, Quality: 230 },
      { name: 'Oman Resin Co.', Delivery: 195, Price: 170, Quality: 190 },
      { name: 'Rajesh Chemical', Delivery: 140, Price: 115, Quality: 165 },
      { name: 'Al-Andalus Plastic', Delivery: 160, Price: 142, Quality: 185 }
    ],
    'April': [
      { name: 'SAIC Polymers', Delivery: 190, Price: 165, Quality: 210 },
      { name: 'Brenntag', Delivery: 130, Price: 110, Quality: 150 },
      { name: 'Jindal Polymers', Delivery: 220, Price: 190, Quality: 240 },
      { name: 'Oman Resin Co.', Delivery: 200, Price: 180, Quality: 200 },
      { name: 'Rajesh Chemical', Delivery: 150, Price: 120, Quality: 170 },
      { name: 'Al-Andalus Plastic', Delivery: 170, Price: 145, Quality: 190 }
    ],
    'May': [
      { name: 'SAIC Polymers', Delivery: 200, Price: 170, Quality: 220 },
      { name: 'Brenntag', Delivery: 140, Price: 120, Quality: 160 },
      { name: 'Jindal Polymers', Delivery: 230, Price: 200, Quality: 250 },
      { name: 'Oman Resin Co.', Delivery: 210, Price: 190, Quality: 210 },
      { name: 'Rajesh Chemical', Delivery: 160, Price: 130, Quality: 180 },
      { name: 'Al-Andalus Plastic', Delivery: 185, Price: 155, Quality: 200 }
    ],
    'June': [
      { name: 'SAIC Polymers', Delivery: 210, Price: 185, Quality: 230 },
      { name: 'Brenntag', Delivery: 145, Price: 125, Quality: 165 },
      { name: 'Jindal Polymers', Delivery: 240, Price: 210, Quality: 255 },
      { name: 'Oman Resin Co.', Delivery: 220, Price: 195, Quality: 220 },
      { name: 'Rajesh Chemical', Delivery: 170, Price: 140, Quality: 190 },
      { name: 'Al-Andalus Plastic', Delivery: 190, Price: 160, Quality: 210 }
    ]
  };

  const seededSuppliersData = seededSuppliersMonthlyData[selectedMonth] || seededSuppliersMonthlyData['All Months'];



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
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#fafafa]">

      {/* Top Banner & Header Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border-[3px] border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 tracking-tight">
            Procurement Operations
          </h1>
          <p className="text-slate-600 text-xs mt-1 font-normal">
            Good day. Here is the AI Copilot overview for logistics, real-time RFQ status, and supplier telemetry.
          </p>
        </div>

        {/* Top Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigate('rfqs', { openCreateModal: true })}
            className="bg-[#0078d4] hover:bg-[#106ebe] text-white px-4.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] active:translate-y-[1px] active:shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] transition-all cursor-pointer"
          >
            <Plus size={14} className="stroke-[2.5px]" /> Create RFQ
          </button>
          <button
            onClick={() => onNavigate('suppliers')}
            className="bg-white hover:bg-slate-50 text-slate-800 px-4.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] active:translate-y-[1px] active:shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] transition-all cursor-pointer"
          >
            <Search size={14} className="stroke-[2.5px]" /> Search Suppliers
          </button>
          <button
            onClick={onOpenCopilot}
            className="bg-[#ffe4e6] hover:bg-[#fecdd3] text-rose-950 px-4.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] active:translate-y-[1px] active:shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] transition-all cursor-pointer"
          >
            <Bot size={14} className="stroke-[2.5px]" /> AI Copilot
          </button>
          <button
            onClick={onImportTrigger}
            className="bg-white hover:bg-slate-50 text-slate-800 px-4.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] active:translate-y-[1px] active:shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] transition-all cursor-pointer"
          >
            <Upload size={14} className="stroke-[2.5px]" /> Import RFQ
          </button>
        </div>
      </div>

      {/* Pending Approval Notifications */}
      {notifications.filter(n => n.status === 'pending').length > 0 && (
        <div className="space-y-5">
          {notifications.filter(n => n.status === 'pending').map((notif) => (
            <div key={notif.id} className="bg-[#fffbeb] border-[3px] border-slate-900 rounded-2xl p-5 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 text-[10px] font-semibold text-amber-955 bg-[#fef08a] rounded-bl-xl border-l-2 border-b-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] uppercase tracking-wider">
                Action Required
              </div>
              <div className="flex gap-3.5 items-start">
                <div className="w-11 h-11 rounded-xl bg-[#fbbf24] text-slate-955 border-2 border-slate-900 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                  <ShieldCheck size={22} className="stroke-[2px]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    Autonomous Negotiation Complete: RFQ Recommendation Review
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 font-normal">
                    RFQ: <span className="underline decoration-slate-900 decoration-2 text-slate-900 font-semibold">{notif.rfq_number}</span> | Item: <span className="text-slate-900 font-semibold">{notif.rfq_item}</span>
                  </p>
                </div>
              </div>

              <div className="bg-white border-2 border-slate-900 rounded-xl p-4.5 space-y-3.5 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
                <p className="text-xs text-slate-700 font-normal leading-relaxed">
                  {notif.summary_message}
                </p>

                {/* Mini Comparison Table */}
                {notif.comparison_json && notif.comparison_json.length > 0 && (
                  <div className="border-2 border-slate-900 rounded-xl overflow-hidden shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                    <table className="w-full text-[11px] text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b-2 border-slate-900">
                          <th className="p-2.5 font-bold text-slate-900">Supplier Name</th>
                          <th className="p-2.5 font-bold text-slate-900">Rating</th>
                          <th className="p-2.5 font-bold text-slate-900">Price/Unit</th>
                          <th className="p-2.5 font-bold text-slate-900">Lead Time</th>
                          <th className="p-2.5 font-bold text-slate-900">Risk</th>
                          <th className="p-2.5 font-bold text-slate-900">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {notif.comparison_json.map((comp, idx) => {
                          const isWinner = comp.supplier_name === notif.recommended_supplier;
                          return (
                            <tr key={idx} className={`border-b border-slate-200 last:border-0 ${isWinner ? 'bg-[#dcfce7]/70 font-semibold' : ''}`}>
                              <td className="p-2.5 flex items-center gap-1.5">
                                {isWinner && <Sparkles size={12} className="text-emerald-700 fill-emerald-500 stroke-[1.5px]" />}
                                <span className={isWinner ? 'text-emerald-955 font-semibold' : 'text-slate-805'}>{comp.supplier_name}</span>
                              </td>
                              <td className="p-2.5 text-slate-700 font-medium">⭐ {comp.rating}</td>
                              <td className="p-2.5 text-slate-900 font-bold">{comp.currency} {comp.price}</td>
                              <td className="p-2.5 text-slate-700 font-medium">{comp.lead_time_days} days</td>
                              <td className="p-2.5">
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-semibold border-2 border-slate-900 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] ${comp.risk_level === 'Low' ? 'bg-[#dcfce7] text-emerald-955' :
                                    comp.risk_level === 'Medium' ? 'bg-[#fef9c3] text-amber-955' :
                                      'bg-[#ffe4e6] text-rose-955'
                                  }`}>
                                  {comp.risk_level === 'High' ? 'Critical Delivery Risk' : comp.risk_level === 'Medium' ? 'Moderate Delivery Risk' : comp.risk_level === 'Low' ? 'Minimal Delivery Risk' : comp.risk_level}
                                </span>
                              </td>
                              <td className="p-2.5">
                                {isWinner ? (
                                  <span className="text-emerald-700 flex items-center gap-1 font-semibold">
                                    <CheckCircle2 size={12} className="stroke-[2px]" /> Recommended Winner
                                  </span>
                                ) : (
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border-2 border-slate-900 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] ${comp.status === 'Cancelled' ? 'bg-[#ffe4e6] text-rose-955' :
                                      comp.status === 'Quotation Received' ? 'bg-[#dcfce7] text-emerald-955' :
                                        'bg-[#f3f4f6] text-slate-800'
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
              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  disabled={approvingId !== null || rejectingId !== null}
                  onClick={() => handleReject(notif.id)}
                  className="bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-900 px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] active:translate-y-[1px] active:shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] cursor-pointer disabled:opacity-50"
                >
                  {rejectingId === notif.id ? 'Sending...' : 'Send Back'}
                </button>
                <button
                  type="button"
                  disabled={approvingId !== null || rejectingId !== null}
                  onClick={() => handleApprove(notif.id)}
                  className="bg-[#0078d4] hover:bg-[#106ebe] text-white border-2 border-slate-900 px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] active:translate-y-[1px] active:shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] cursor-pointer disabled:opacity-50"
                >
                  {approvingId === notif.id ? (
                    <>
                      <RefreshCw size={12} className="animate-spin stroke-[2px]" /> Approving & Syncing...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={12} className="stroke-[2px]" /> Approve & Issue PO
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* ── Sourcing Operations & Alerts Hub (Clean Human-Designed Layout) ── */}
      {(() => {
        const currentAlerts = stats?.sourcing_alerts || sourcingAlertsData[alertsTimeframe] || sourcingAlertsData['This Month'];
        return (
          <div className="bg-white border-[3px] border-slate-900 rounded-2xl p-6 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b-2 border-slate-200">
              <div className="flex items-center gap-2.5">
                <Activity size={18} className="text-slate-955 stroke-[2px] shrink-0" />
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Sourcing Operations &amp; Alerts
                  </h3>
                  <p className="text-[10px] text-slate-600 font-normal">Action items, delivery risks, and cost optimization opportunities for the active period.</p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                {/* Timeframe Selector */}
                <div className="flex gap-1.5 bg-[#f1f5f9] p-1 border-2 border-slate-900 rounded-xl shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                  {['Today', 'This Week', 'This Month', 'This Year'].map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setAlertsTimeframe(tf)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${alertsTimeframe === tf
                          ? 'bg-[#0078d4] text-white shadow-sm'
                          : 'text-slate-700 hover:bg-slate-200'
                        }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center gap-2 bg-white border-2 border-slate-900 rounded-xl px-2.5 py-1 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                  <button
                    disabled={alertsPage === 1}
                    onClick={() => setAlertsPage(1)}
                    className={`p-1 rounded font-semibold text-xs hover:bg-slate-100 cursor-pointer ${alertsPage === 1 ? 'opacity-30 cursor-not-allowed text-slate-400' : 'text-slate-900'}`}
                    title="Previous Page"
                  >
                    &larr;
                  </button>
                  <span className="text-[10px] font-bold text-slate-700 select-none">
                    Page {alertsPage}/2
                  </span>
                  <button
                    disabled={alertsPage === 2}
                    onClick={() => setAlertsPage(2)}
                    className={`p-1 rounded font-semibold text-xs hover:bg-slate-100 cursor-pointer ${alertsPage === 2 ? 'opacity-30 cursor-not-allowed text-slate-400' : 'text-slate-900'}`}
                    title="Next Page"
                  >
                    &rarr;
                  </button>
                </div>
              </div>
            </div>

            {alertsPage === 1 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
                {/* Item 1 */}
                <div
                  onClick={() => setActiveAlertModal({ title: "RFQ", type: "attention", data: currentAlerts.rfqsAttention, navigateTarget: "rfqs", navigateLabel: "Go to RFQ Assistant" })}
                  className="p-4 bg-[#f0f9ff] border-2 border-slate-900 rounded-xl flex flex-col justify-between hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] active:translate-y-0 active:shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-all duration-150 cursor-pointer min-h-[110px]"
                >
                  <div className="flex items-start justify-between w-full">
                    <span className="text-[10px] font-semibold text-sky-900 uppercase tracking-wider">RFQ</span>
                    <div className="w-6 h-6 rounded bg-white text-slate-800 flex items-center justify-center shrink-0 border-2 border-slate-900 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]">
                      <Bell size={12} className="stroke-[2px]" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-slate-900">{currentAlerts.rfqsAttention.length}</span>
                    <span className="text-[9px] text-[#0369a1] bg-white px-2 py-0.5 rounded-md font-semibold border-2 border-slate-900 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]">RFQs</span>
                  </div>
                  <div className="text-[9px] text-[#0078d4] font-semibold mt-2">Click to view details &rarr;</div>
                </div>

                {/* Item 2 */}
                <div
                  onClick={() => setActiveAlertModal({ title: "Supplier Delivery Risks", type: "risks", data: currentAlerts.deliveryRisks, navigateTarget: "suppliers", navigateLabel: "Review Supplier Risks" })}
                  className="p-4 bg-[#fff1f2] border-2 border-slate-900 rounded-xl flex flex-col justify-between hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] active:translate-y-0 active:shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-all duration-150 cursor-pointer min-h-[110px]"
                >
                  <div className="flex items-start justify-between w-full">
                    <span className="text-[10px] font-semibold text-rose-900 uppercase tracking-wider">Supplier Alerts</span>
                    <div className="w-6 h-6 rounded bg-white text-slate-800 flex items-center justify-center shrink-0 border-2 border-slate-900 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]">
                      <AlertTriangle size={12} className="stroke-[2px]" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-slate-900">{currentAlerts.deliveryRisks.length}</span>
                    <span className="text-[9px] text-[#be123c] bg-white px-2 py-0.5 rounded-md font-semibold border-2 border-slate-900 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]">Risks</span>
                  </div>
                  <div className="text-[9px] text-[#0078d4] font-semibold mt-2">Click to view details &rarr;</div>
                </div>

                {/* Item 3 */}
                <div
                  onClick={() => setActiveAlertModal({ title: "Sourcing Recommendations", type: "recommendations", data: currentAlerts.recommendations, navigateTarget: "comparison", navigateLabel: "View Quote Comparison" })}
                  className="p-4 bg-[#f0fdf4] border-2 border-slate-900 rounded-xl flex flex-col justify-between hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] active:translate-y-0 active:shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-all duration-150 cursor-pointer min-h-[110px]"
                >
                  <div className="flex items-start justify-between w-full">
                    <span className="text-[10px] font-semibold text-emerald-900 uppercase tracking-wider">Sourcing Matches</span>
                    <div className="w-6 h-6 rounded bg-white text-slate-800 flex items-center justify-center shrink-0 border-2 border-slate-900 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]">
                      <CheckCircle2 size={12} className="stroke-[2px]" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-slate-900">{currentAlerts.recommendations.length}</span>
                    <span className="text-[9px] text-[#047857] bg-white px-2 py-0.5 rounded-md font-semibold border-2 border-slate-900 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]">Matches</span>
                  </div>
                  <div className="text-[9px] text-[#0078d4] font-semibold mt-2">Click to view details &rarr;</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
                {/* Item 4 */}
                <div
                  onClick={() => setActiveAlertModal({ title: "Potential Cost Savings", type: "savings", data: currentAlerts.savings, navigateTarget: "copilot", navigateLabel: "Ask Copilot to Apply Sourcing" })}
                  className="p-4 bg-[#fef9c3] border-2 border-slate-900 rounded-xl flex flex-col justify-between hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] active:translate-y-0 active:shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-all duration-150 cursor-pointer min-h-[110px]"
                >
                  <div className="flex items-start justify-between w-full">
                    <span className="text-[10px] font-semibold text-amber-955 uppercase tracking-wider">Potential Savings</span>
                    <div className="w-6 h-6 rounded bg-white text-slate-800 flex items-center justify-center shrink-0 border-2 border-slate-900 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]">
                      <TrendingUp size={12} className="stroke-[2px]" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-slate-900">{currentAlerts.savings.amount}</span>
                    <span className="text-[9px] text-[#b45309] bg-white px-2 py-0.5 rounded-md font-semibold border-2 border-slate-900 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]">Savings</span>
                  </div>
                  <div className="text-[9px] text-[#0078d4] font-semibold mt-2">Click to view details &rarr;</div>
                </div>

                {/* Item 5 */}
                <div
                  onClick={() => setActiveAlertModal({ title: "Price Deviations", type: "deviations", data: currentAlerts.historicalPrice, navigateTarget: "comparison", navigateLabel: "Inspect Pricing Variance" })}
                  className="p-4 bg-[#fdf2f8] border-2 border-slate-900 rounded-xl flex flex-col justify-between hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] active:translate-y-0 active:shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-all duration-150 cursor-pointer min-h-[110px]"
                >
                  <div className="flex items-start justify-between w-full">
                    <span className="text-[10px] font-semibold text-pink-900 uppercase tracking-wider">Price Deviations</span>
                    <div className="w-6 h-6 rounded bg-white text-slate-800 flex items-center justify-center shrink-0 border-2 border-slate-900 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]">
                      <AlertTriangle size={12} className="stroke-[2px]" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-slate-900">{currentAlerts.historicalPrice.length}</span>
                    <span className="text-[9px] text-[#be185d] bg-white px-2 py-0.5 rounded-md font-semibold border-2 border-slate-900 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]">Deviations</span>
                  </div>
                  <div className="text-[9px] text-[#0078d4] font-semibold mt-2">Click to view details &rarr;</div>
                </div>

                {/* Item 6 */}
                <div
                  onClick={() => setActiveAlertModal({ title: "Negotiation Pipelines", type: "automations", data: currentAlerts.automations, navigateTarget: "ai_agent", navigateLabel: "Launch Autonomous Agent" })}
                  className="p-4 bg-[#f3e8ff] border-2 border-slate-900 rounded-xl flex flex-col justify-between hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] active:translate-y-0 active:shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-all duration-150 cursor-pointer min-h-[110px]"
                >
                  <div className="flex items-start justify-between w-full">
                    <span className="text-[10px] font-semibold text-purple-900 uppercase tracking-wider">Negotiation Pipelines</span>
                    <div className="w-6 h-6 rounded bg-white text-slate-800 flex items-center justify-center shrink-0 border-2 border-slate-900 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]">
                      <Bot size={12} className="stroke-[2px]" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-slate-900">{currentAlerts.automations.count}</span>
                    <span className="text-[9px] text-[#6b21a8] bg-white px-2 py-0.5 rounded-md font-semibold border-2 border-slate-900 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]">Pipelines</span>
                  </div>
                  <div className="text-[9px] text-[#0078d4] font-semibold mt-2">Click to view details &rarr;</div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Middle Row 1: Seeded Suppliers Performance Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Seeded Suppliers Performance Comparison (Grouped Bar Chart) */}
        <div className="lg:col-span-4 bg-white border-[3px] border-slate-900 rounded-2xl p-6 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2.5">
              <BarChart2 size={18} className="text-[#0078d4] stroke-[2px]" /> Top 6 Suppliers Performance
            </h3>
            <div className="flex items-center gap-2.5">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-[11px] font-semibold text-slate-800 bg-white border-2 border-slate-900 rounded-xl px-3 py-1.5 focus:outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] cursor-pointer"
              >
                {Object.keys(seededSuppliersMonthlyData).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <span className="text-[10px] bg-sky-50 text-[#0369a1] px-2.5 py-1.5 rounded-lg font-semibold border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                Audit Telemetry
              </span>
            </div>
          </div>

          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={seededSuppliersData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: '#0f172a', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 250]} tick={{ fill: '#0f172a', fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', border: '2px solid #0f172a', borderRadius: '12px', boxShadow: '4px 4px 0px 0px rgba(15,23,42,1)' }}
                  labelStyle={{ fontWeight: '700', color: '#0f172a', fontSize: '11px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: '600', color: '#0f172a', paddingTop: '8px' }} />
                <Bar dataKey="Delivery" fill="#0078d4" radius={[4, 4, 0, 0]} barSize={10} />
                <Bar dataKey="Price" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={10} />
                <Bar dataKey="Quality" fill="#107c41" radius={[4, 4, 0, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>



      {/* Bottom Row 1: Recent Activity Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Activity Timeline */}
        <div className="lg:col-span-3 bg-white border-[3px] border-slate-900 rounded-2xl p-6 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3.5 border-b-2 border-slate-200 mb-5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Bell size={18} className="text-amber-500 stroke-[2px]" /> Recent Activity Timeline
            </h3>
            <button
              onClick={() => onNavigate('rfqs')}
              className="text-xs text-[#0078d4] font-semibold hover:underline flex items-center gap-1 cursor-pointer bg-white border-2 border-slate-900 px-3 py-1.5 rounded-xl shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] transition-all"
            >
              View All Activities <ChevronRight size={14} className="stroke-[2px]" />
            </button>
          </div>

          <div className="space-y-5 overflow-y-auto max-h-[300px] pr-2">
            {recent_activity && recent_activity.length > 0 ? (
              recent_activity.map((act, index) => (
                <div key={index} className="flex gap-4 relative group">
                  {index !== recent_activity.length - 1 && (
                    <div className="absolute top-6 bottom-0 left-[11px] w-[3px] bg-slate-900"></div>
                  )}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 border-2 border-slate-900 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] ${act.stage === 'PO Generated' ? 'bg-[#dcfce7] text-[#047857]' :
                      act.stage === 'Created' ? 'bg-[#e0f2fe] text-[#0369a1]' :
                        act.stage === 'RFQ Sent' ? 'bg-[#e0e7ff] text-[#4338ca]' :
                          act.stage === 'Supplier Responded' ? 'bg-[#f3e8ff] text-[#6b21a8]' :
                            act.stage === 'Approved' ? 'bg-[#ccfbf1] text-[#0f766e]' : 'bg-slate-100 text-slate-700'
                    }`}>
                    <div className="w-2 h-2 rounded-full bg-current"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-slate-900">{act.rfq_number} — <span className="text-slate-700 font-medium">{act.stage}</span></span>
                      <span className="text-[10px] text-slate-500 font-semibold font-mono">{act.timestamp}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 font-normal leading-relaxed">{act.details}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-400 py-12 text-xs font-normal">No activity recorded today.</div>
            )}
          </div>
        </div>

      </div>

      {/* Bottom KPI Bar (4 Large Metric Highlights from Image 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">

        {/* TOTAL SUPPLIERS */}
        <div className="bg-white border-2 border-slate-900 rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex items-center gap-4 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] transition-all duration-150">
          <div className="w-12 h-12 rounded-xl bg-[#e0f2fe] text-[#0369a1] border-2 border-slate-900 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            <Users size={24} className="stroke-[2px]" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">TOTAL SUPPLIERS</span>
            <span className="text-2xl font-bold text-slate-900 block">{widgets?.total_suppliers ?? 542}</span>
            <span className="text-[10px] text-slate-600 font-normal">Across all categories</span>
          </div>
        </div>

        {/* TOTAL PO VALUE */}
        <div className="bg-white border-2 border-slate-900 rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex items-center gap-4 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] transition-all duration-150">
          <div className="w-12 h-12 rounded-xl bg-[#dcfce7] text-[#047857] border-2 border-slate-900 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            <DollarSign size={24} className="stroke-[2px]" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">TOTAL PO VALUE</span>
            <span className="text-2xl font-bold text-slate-900 block">
              {widgets?.total_rfq_value !== undefined ? `$${(widgets.total_rfq_value / 1000000).toFixed(2)}M` : '$24.85M'}
            </span>
            <span className="text-[10px] text-[#047857] font-normal">This Quarter</span>
          </div>
        </div>

        {/* COST SAVINGS (AI) */}
        <div className="bg-white border-2 border-slate-900 rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex items-center gap-4 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] transition-all duration-150">
          <div className="w-12 h-12 rounded-xl bg-[#e0e7ff] text-[#4338ca] border-2 border-slate-900 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            <TrendingUp size={24} className="stroke-[2px]" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">COST SAVINGS (AI)</span>
            <span className="text-2xl font-bold text-[#0078d4] block">
              {widgets?.cost_savings !== undefined ? `$${(widgets.cost_savings / 1000000).toFixed(2)}M` : '$2.48M'}
            </span>
            <span className="text-[10px] text-indigo-700 font-normal">AI Recommended Savings</span>
          </div>
        </div>

        {/* REVENUE VALUE */}
        <div className="bg-white border-2 border-slate-900 rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex items-center gap-4 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] transition-all duration-150">
          <div className="w-12 h-12 rounded-xl bg-[#fef9c3] text-[#a16207] border-2 border-slate-900 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            <FileText size={24} className="stroke-[2px]" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">REVENUE VALUE</span>
            <span className="text-2xl font-bold text-slate-900 block">
              {widgets?.total_rfq_value !== undefined ? `$${((widgets.total_rfq_value * 1.18) / 1000000).toFixed(2)}M` : '$119.51M'}
            </span>
            <span className="text-[10px] text-amber-750 font-normal">This Quarter</span>
          </div>
        </div>

      </div>

      {/* Modal Popup for Sourcing Operations Details */}
      {activeAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border-[3px] border-slate-900 rounded-2xl shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b-2 border-slate-900 bg-[#fefce8]">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-slate-900 stroke-[2px]" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  {activeAlertModal.title}
                </h4>
              </div>
              <button
                onClick={() => setActiveAlertModal(null)}
                className="text-slate-800 hover:bg-rose-100 hover:text-rose-700 text-base font-semibold border-2 border-slate-900 bg-white rounded-lg w-7 h-7 flex items-center justify-center transition-colors shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 max-h-[380px] overflow-y-auto bg-[#fafafa]">
              {activeAlertModal.type === 'attention' && (
                <div className="space-y-4 pb-2">
                  {activeAlertModal.data.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 bg-[#f0f9ff] p-4 rounded-xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] transition-all duration-150 text-xs"
                    >
                      <span
                        className="font-bold text-[#0078d4] hover:underline cursor-pointer text-sm"
                        onClick={() => { onNavigate('rfqs', { selectRfqNum: item.id }); setActiveAlertModal(null); }}
                      >
                        {item.id}
                      </span>
                      <span className="bg-white text-sky-900 border-2 border-slate-900 font-semibold px-2.5 py-0.5 rounded-lg text-[9px] uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                        {item.reason}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {activeAlertModal.type === 'risks' && (
                <div className="space-y-4 pb-2">
                  {activeAlertModal.data.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 bg-[#fff1f2] p-4 rounded-xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] transition-all duration-150 text-xs"
                    >
                      {item.id ? (
                        <span
                          className="font-bold text-[#0078d4] hover:underline cursor-pointer text-sm"
                          onClick={() => setSelectedSupplierId(item.id)}
                        >
                          {item.supplier}
                        </span>
                      ) : (
                        <span className="font-bold text-slate-800 text-sm">{item.supplier}</span>
                      )}
                      <span className={`text-[9px] px-2.5 py-0.5 rounded-lg font-semibold border-2 border-slate-900 uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] ${item.risk === 'High'
                          ? 'bg-[#ffe4e6] text-[#b91c1c]'
                          : 'bg-[#fef9c3] text-[#a16207]'
                        }`}>
                        {item.risk === 'High' ? 'Critical Delivery Risk' : item.risk === 'Medium' ? 'Moderate Delivery Risk' : `${item.risk} Risk`}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {activeAlertModal.type === 'recommendations' && (
                <div className="space-y-4 pb-2">
                  {activeAlertModal.data.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-[#fafaf9] p-4 rounded-xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] transition-all duration-150 text-xs space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        {item.id ? (
                          <span
                            className="font-bold text-[#0078d4] hover:underline cursor-pointer text-sm"
                            onClick={() => setSelectedSupplierId(item.id)}
                          >
                            {item.supplier}
                          </span>
                        ) : (
                          <span className="font-bold text-slate-800 text-sm">{item.supplier}</span>
                        )}
                        <span className="text-[9px] bg-[#fef9c3] text-[#a16207] border-2 border-slate-900 font-semibold px-2.5 py-0.5 rounded-lg uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                          {item.rfq === 'Preferred Partner' ? 'Approved Supplier' : item.rfq}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 font-medium">{item.metric}</div>
                    </div>
                  ))}
                </div>
              )}

              {activeAlertModal.type === 'savings' && (
                <div className="bg-[#f0fdf4] p-5 rounded-xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] space-y-2 text-xs">
                  <div className="font-bold text-emerald-800 text-xl leading-none">{activeAlertModal.data.amount}</div>
                  <div className="text-slate-705 font-normal leading-relaxed">{activeAlertModal.data.detail}</div>
                </div>
              )}

              {activeAlertModal.type === 'deviations' && (
                <div className="space-y-4 pb-2">
                  {activeAlertModal.data.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 bg-[#fdf2f8] p-4 rounded-xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] transition-all duration-150 text-xs"
                    >
                      {item.id ? (
                        <span
                          className="font-bold text-[#0078d4] hover:underline cursor-pointer text-sm"
                          onClick={() => setSelectedSupplierId(item.id)}
                        >
                          {item.supplier}
                        </span>
                      ) : (
                        <span className="font-bold text-slate-800 text-sm">{item.supplier}</span>
                      )}
                      <span className="text-xs text-pink-700 font-semibold bg-white border-2 border-slate-900 rounded-lg px-2.5 py-0.5 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">{item.deviation}</span>
                    </div>
                  ))}
                </div>
              )}

              {activeAlertModal.type === 'automations' && (
                <div className="bg-[#fafaf9] p-5 rounded-xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] space-y-2 text-xs">
                  <div className="font-bold text-slate-900 text-sm leading-none">{activeAlertModal.data.count} Campaigns Eligible</div>
                  <div className="text-slate-600 font-normal leading-relaxed mt-1">{activeAlertModal.data.detail}</div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-5 py-3.5 border-t-2 border-slate-900 bg-slate-50">
              <button
                onClick={() => setActiveAlertModal(null)}
                className="bg-white hover:bg-slate-100 text-slate-800 border-2 border-slate-900 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] active:translate-y-[1px] active:shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]"
              >
                Close
              </button>
              {activeAlertModal.navigateTarget && (
                <button
                  onClick={() => {
                    if (activeAlertModal.navigateTarget === 'copilot') {
                      onOpenCopilot();
                    } else {
                      onNavigate(activeAlertModal.navigateTarget);
                    }
                    setActiveAlertModal(null);
                  }}
                  className="bg-[#0078d4] hover:bg-[#106ebe] text-white border-2 border-slate-900 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] active:translate-y-[1px] active:shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]"
                >
                  {activeAlertModal.navigateLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {selectedSupplierId && (
        <SupplierProfileModal
          supplierId={selectedSupplierId}
          onClose={() => setSelectedSupplierId(null)}
        />
      )}

    </div>
  );
}
