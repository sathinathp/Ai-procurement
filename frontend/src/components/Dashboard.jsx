import React, { useEffect, useState } from 'react';
import {
  FileText, Clipboard, MessageSquare, CheckSquare,
  Hourglass, CheckCircle2, CheckCircle, TrendingUp, Sparkles,
  Plus, Search, Bot, Upload, BarChart2, Bell, ShieldCheck,
  DollarSign, Users, Cpu, Activity, ChevronRight, Eye, ArrowUpRight, ArrowDownRight, Layers, FileSearch, Database,
  Mail, Link2, Wifi, Zap, RefreshCw, AlertTriangle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
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
    const handleUpdate = () => {
      fetchNotifications(true);
      fetchStats();
    };
    window.addEventListener('ai_agent_update', handleUpdate);
    return () => window.removeEventListener('ai_agent_update', handleUpdate);
  }, []);

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
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-[#f8fafc] min-h-[80vh]">
        <div className="relative flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-600"></div>
          <div className="absolute h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
            <Cpu size={16} className="text-indigo-600 animate-pulse" />
          </div>
        </div>
        <p className="text-slate-500 mt-6 text-sm font-semibold tracking-wide">Assembling executive procurement metrics &amp; AI telemetry...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-8 text-center bg-[#f8fafc] flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-4 border border-red-200">
          <AlertTriangle size={24} />
        </div>
        <p className="text-slate-800 font-bold mb-3">{error}</p>
        <button onClick={fetchStats} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md transition-all">
          Retry Connection
        </button>
      </div>
    );
  }

  const { widgets, recent_activity } = stats;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-tr from-[#f6f8fb] via-[#f1f5f9] to-[#e9eff6]">
      
      {/* Global CSS Style tag for Glassmorphic and Neumorphic rules */}
      <style>{`
        .glass-panel {
          background: rgba(255, 255, 255, 0.45);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.65);
          box-shadow: 
            6px 6px 20px rgba(165, 180, 252, 0.03), 
            -6px -6px 20px rgba(255, 255, 255, 0.85),
            inset 1px 1px 0px rgba(255, 255, 255, 0.7);
        }
        .glass-panel-hover {
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .glass-panel-hover:hover {
          background: rgba(255, 255, 255, 0.65);
          transform: translateY(-2px);
          box-shadow: 
            10px 10px 25px rgba(165, 180, 252, 0.07), 
            -10px -10px 25px rgba(255, 255, 255, 0.95),
            inset 1px 1px 0px rgba(255, 255, 255, 0.85);
        }
        .neumorphic-inset-box {
          background: rgba(255, 255, 255, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: 
            inset 2px 2px 5px rgba(0, 0, 0, 0.03), 
            inset -3px -3px 7px rgba(255, 255, 255, 0.7);
        }
        .premium-text-gradient {
          background: linear-gradient(135deg, #1e293b 0%, #475569 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>

      {/* Top Banner & Header Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 rounded-3xl glass-panel shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-extrabold premium-text-gradient flex items-center gap-2 tracking-tight">
            Procurement Operations
          </h1>
          <p className="text-slate-500 text-xs mt-1 font-semibold">
            Welcome back. Real-time sourcing metrics and automated supplier negotiation status.
          </p>
        </div>

        {/* Top Action Buttons - Restyled with premium gradients/shadows */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigate('rfqs', { openCreateModal: true })}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-[0_4px_12px_rgba(59,130,246,0.22)] hover:shadow-[0_6px_16px_rgba(59,130,246,0.32)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus size={14} className="stroke-[2.5px]" /> Create RFQ
          </button>
          
          <button
            onClick={() => onNavigate('suppliers')}
            className="bg-white/80 hover:bg-white text-slate-700 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 border border-slate-200/80 shadow-[4px_4px_12px_rgba(0,0,0,0.02)] hover:shadow-[6px_6px_16px_rgba(0,0,0,0.04)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Search size={14} className="stroke-[2.5px]" /> Search Suppliers
          </button>

          <button
            onClick={onOpenCopilot}
            className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-[0_4px_12px_rgba(244,63,94,0.2)] hover:shadow-[0_6px_16px_rgba(244,63,94,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Bot size={14} className="stroke-[2.5px]" /> AI Copilot
          </button>

          <button
            onClick={onImportTrigger}
            className="bg-white/80 hover:bg-white text-slate-700 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 border border-slate-200/80 shadow-[4px_4px_12px_rgba(0,0,0,0.02)] hover:shadow-[6px_6px_16px_rgba(0,0,0,0.04)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Upload size={14} className="stroke-[2.5px]" /> Import RFQ
          </button>
        </div>
      </div>

      {/* Pending Approval Notifications - Styled with glassmorphism + premium border warning color */}
      {notifications.filter(n => n.status === 'pending').length > 0 && (
        <div className="space-y-5">
          {notifications.filter(n => n.status === 'pending').map((notif) => (
            <div key={notif.id} className="relative overflow-hidden p-6 rounded-3xl glass-panel border-l-[6px] border-l-amber-500/80 shadow-md">
              <div className="absolute top-0 right-0 px-4.5 py-1.5 text-[9px] font-extrabold text-amber-800 bg-amber-500/10 rounded-bl-2xl border-l border-b border-amber-500/10 uppercase tracking-widest">
                Action Required
              </div>
              
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 border border-amber-500/25">
                  <ShieldCheck size={20} className="stroke-[2px]" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">
                    Autonomous Negotiation Complete: RFQ Recommendation Review
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 font-semibold">
                    RFQ: <span className="text-slate-800 font-bold">{notif.rfq_number}</span> | Item: <span className="text-slate-800 font-bold">{notif.rfq_item}</span>
                  </p>
                </div>
              </div>

              <div className="mt-4 p-4 rounded-2xl bg-white/40 border border-white/60 shadow-[inset_1px_1px_4px_rgba(0,0,0,0.01)] space-y-3.5">
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {notif.summary_message}
                </p>

                {/* Mini Comparison Table */}
                {notif.comparison_json && notif.comparison_json.length > 0 && (
                  <div className="border border-slate-200/60 rounded-2xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.01)] bg-white/30 backdrop-blur-sm">
                    <table className="w-full text-[11px] text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/70 border-b border-slate-200/60">
                          <th className="p-3 font-extrabold text-slate-650">Supplier Name</th>
                          <th className="p-3 font-extrabold text-slate-650">Rating</th>
                          <th className="p-3 font-extrabold text-slate-650">Price/Unit</th>
                          <th className="p-3 font-extrabold text-slate-650">Lead Time</th>
                          <th className="p-3 font-extrabold text-slate-650">Risk</th>
                          <th className="p-3 font-extrabold text-slate-650">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {notif.comparison_json.map((comp, idx) => {
                          const isWinner = comp.supplier_name === notif.recommended_supplier;
                          return (
                            <tr key={idx} className={`border-b border-slate-100 last:border-0 ${isWinner ? 'bg-emerald-500/10 font-semibold' : ''}`}>
                              <td className="p-3 flex items-center gap-1.5">
                                {isWinner && <Sparkles size={12} className="text-emerald-500 fill-emerald-400 stroke-[1.5px]" />}
                                <span className={isWinner ? 'text-emerald-700 font-bold' : 'text-slate-700 font-medium'}>{comp.supplier_name}</span>
                              </td>
                              <td className="p-3 text-slate-600 font-bold">⭐ {comp.rating}</td>
                              <td className="p-3 text-slate-800 font-bold">{comp.currency} {comp.price}</td>
                              <td className="p-3 text-slate-650 font-bold">{comp.lead_time_days} days</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-extrabold border ${
                                  comp.risk_level === 'Low' 
                                    ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' 
                                    : comp.risk_level === 'Medium' 
                                      ? 'bg-amber-500/10 text-amber-700 border-amber-500/20' 
                                      : 'bg-rose-500/10 text-rose-700 border-rose-500/20'
                                }`}>
                                  {comp.risk_level === 'High' ? 'Critical Delivery Risk' : comp.risk_level === 'Medium' ? 'Moderate Risk' : 'Minimal Risk'}
                                </span>
                              </td>
                              <td className="p-3">
                                {isWinner ? (
                                  <span className="text-emerald-600 flex items-center gap-1 font-bold">
                                    <CheckCircle2 size={12} className="stroke-[2.5px]" /> Recommended Winner
                                  </span>
                                ) : (
                                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-extrabold border ${
                                    comp.status === 'Cancelled' 
                                      ? 'bg-rose-500/10 text-rose-700 border-rose-500/20' 
                                      : comp.status === 'Quotation Received' 
                                        ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' 
                                        : 'bg-slate-100 text-slate-600 border-slate-200'
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
              <div className="flex justify-end gap-2.5 mt-4">
                <button
                  type="button"
                  disabled={approvingId !== null || rejectingId !== null}
                  onClick={() => handleReject(notif.id)}
                  className="bg-white/80 hover:bg-white text-slate-700 border border-slate-200/80 px-4.5 py-2 rounded-2xl text-xs font-bold transition-all shadow-sm hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50"
                >
                  {rejectingId === notif.id ? 'Sending...' : 'Send Back'}
                </button>
                <button
                  type="button"
                  disabled={approvingId !== null || rejectingId !== null}
                  onClick={() => handleApprove(notif.id)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_4px_12px_rgba(59,130,246,0.2)] hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50"
                >
                  {approvingId === notif.id ? (
                    <>
                      <RefreshCw size={12} className="animate-spin stroke-[2px]" /> Approving & Syncing...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={12} className="stroke-[2.5px]" /> Approve & Issue PO
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sourcing Operations & Alerts Hub */}
      {(() => {
        const currentAlerts = stats?.sourcing_alerts || sourcingAlertsData[alertsTimeframe] || sourcingAlertsData['This Month'];
        return (
          <div className="p-6 rounded-3xl glass-panel shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4.5 border-b border-slate-200/60">
              <div className="flex items-center gap-2.5">
                <Activity size={18} className="text-indigo-500 stroke-[2px] shrink-0 animate-pulse" />
                <div>
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    Sourcing Operations &amp; Alerts
                  </h3>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Live anomalies, delivery risks, and cost reduction pipelines.</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                {/* Timeframe Selector */}
                <div className="flex gap-1 bg-slate-100/80 border border-slate-200/50 p-1 rounded-xl shadow-inner">
                  {['Today', 'This Week', 'This Month', 'This Year'].map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setAlertsTimeframe(tf)}
                      className={`px-3 py-1 rounded-lg text-[9px] font-extrabold transition-all cursor-pointer ${alertsTimeframe === tf
                          ? 'bg-white text-slate-800 shadow-sm border border-slate-200/20'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-white/35'
                        }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center gap-2 bg-white/80 border border-slate-250/50 rounded-xl px-2.5 py-1 shadow-sm">
                  <button
                    disabled={alertsPage === 1}
                    onClick={() => setAlertsPage(1)}
                    className={`p-1 rounded font-bold text-xs hover:bg-slate-100 cursor-pointer ${alertsPage === 1 ? 'opacity-30 cursor-not-allowed text-slate-400' : 'text-slate-700'}`}
                    title="Previous Page"
                  >
                    &larr;
                  </button>
                  <span className="text-[9px] font-extrabold text-slate-500 select-none">
                    Page {alertsPage}/2
                  </span>
                  <button
                    disabled={alertsPage === 2}
                    onClick={() => setAlertsPage(2)}
                    className={`p-1 rounded font-bold text-xs hover:bg-slate-100 cursor-pointer ${alertsPage === 2 ? 'opacity-30 cursor-not-allowed text-slate-400' : 'text-slate-700'}`}
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
                  className="p-4 rounded-2xl glass-panel glass-panel-hover flex flex-col justify-between cursor-pointer min-h-[110px]"
                >
                  <div className="flex items-start justify-between w-full">
                    <span className="text-[9px] font-extrabold text-sky-700 uppercase tracking-widest">RFQ Attention</span>
                    <div className="w-6 h-6 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0 border border-sky-500/15">
                      <Bell size={12} className="stroke-[2px]" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-extrabold text-slate-800">{currentAlerts.rfqsAttention.length}</span>
                    <span className="text-[9px] text-sky-700 bg-sky-500/10 border border-sky-500/15 px-2 py-0.5 rounded-lg font-bold">RFQs</span>
                  </div>
                  <div className="text-[9px] text-sky-600 font-bold mt-2">Click to view &rarr;</div>
                </div>

                {/* Item 2 */}
                <div
                  onClick={() => setActiveAlertModal({ title: "Supplier Delivery Risks", type: "risks", data: currentAlerts.deliveryRisks, navigateTarget: "suppliers", navigateLabel: "Review Supplier Risks" })}
                  className="p-4 rounded-2xl glass-panel glass-panel-hover flex flex-col justify-between cursor-pointer min-h-[110px]"
                >
                  <div className="flex items-start justify-between w-full">
                    <span className="text-[9px] font-extrabold text-rose-700 uppercase tracking-widest">Delivery Risks</span>
                    <div className="w-6 h-6 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0 border border-rose-500/15">
                      <AlertTriangle size={12} className="stroke-[2px]" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-extrabold text-slate-800">{currentAlerts.deliveryRisks.length}</span>
                    <span className="text-[9px] text-rose-700 bg-rose-500/10 border border-rose-500/15 px-2 py-0.5 rounded-lg font-bold">Risks</span>
                  </div>
                  <div className="text-[9px] text-rose-600 font-bold mt-2">Click to view &rarr;</div>
                </div>

                {/* Item 3 */}
                <div
                  onClick={() => setActiveAlertModal({ title: "Sourcing Recommendations", type: "recommendations", data: currentAlerts.recommendations, navigateTarget: "comparison", navigateLabel: "View Quote Comparison" })}
                  className="p-4 rounded-2xl glass-panel glass-panel-hover flex flex-col justify-between cursor-pointer min-h-[110px]"
                >
                  <div className="flex items-start justify-between w-full">
                    <span className="text-[9px] font-extrabold text-emerald-700 uppercase tracking-widest">Sourcing Matches</span>
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-500/15">
                      <CheckCircle2 size={12} className="stroke-[2px]" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-extrabold text-slate-800">{currentAlerts.recommendations.length}</span>
                    <span className="text-[9px] text-emerald-700 bg-emerald-500/10 border border-emerald-500/15 px-2 py-0.5 rounded-lg font-bold">Matches</span>
                  </div>
                  <div className="text-[9px] text-emerald-650 font-bold mt-2">Click to view &rarr;</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
                {/* Item 4 */}
                <div
                  onClick={() => setActiveAlertModal({ title: "Potential Cost Savings", type: "savings", data: currentAlerts.savings, navigateTarget: "copilot", navigateLabel: "Ask Copilot to Apply Sourcing" })}
                  className="p-4 rounded-2xl glass-panel glass-panel-hover flex flex-col justify-between cursor-pointer min-h-[110px]"
                >
                  <div className="flex items-start justify-between w-full">
                    <span className="text-[9px] font-extrabold text-amber-700 uppercase tracking-widest">Potential Savings</span>
                    <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 border border-amber-500/15">
                      <TrendingUp size={12} className="stroke-[2px]" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-extrabold text-[#0078d4]">{currentAlerts.savings.amount}</span>
                    <span className="text-[9px] text-amber-750 bg-amber-500/10 border border-amber-500/15 px-2 py-0.5 rounded-lg font-bold">Savings</span>
                  </div>
                  <div className="text-[9px] text-amber-600 font-bold mt-2">Click to view &rarr;</div>
                </div>

                {/* Item 5 */}
                <div
                  onClick={() => setActiveAlertModal({ title: "Price Deviations", type: "deviations", data: currentAlerts.historicalPrice, navigateTarget: "comparison", navigateLabel: "Inspect Pricing Variance" })}
                  className="p-4 rounded-2xl glass-panel glass-panel-hover flex flex-col justify-between cursor-pointer min-h-[110px]"
                >
                  <div className="flex items-start justify-between w-full">
                    <span className="text-[9px] font-extrabold text-pink-700 uppercase tracking-widest">Price Deviations</span>
                    <div className="w-6 h-6 rounded-lg bg-pink-500/10 text-pink-600 flex items-center justify-center shrink-0 border border-pink-500/15">
                      <AlertTriangle size={12} className="stroke-[2px]" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-extrabold text-slate-800">{currentAlerts.historicalPrice.length}</span>
                    <span className="text-[9px] text-pink-700 bg-pink-500/10 border border-pink-500/15 px-2 py-0.5 rounded-lg font-bold">Deviations</span>
                  </div>
                  <div className="text-[9px] text-pink-600 font-bold mt-2">Click to view &rarr;</div>
                </div>

                {/* Item 6 */}
                <div
                  onClick={() => setActiveAlertModal({ title: "Negotiation Pipelines", type: "automations", data: currentAlerts.automations, navigateTarget: "ai_agent", navigateLabel: "Launch Autonomous Agent" })}
                  className="p-4 rounded-2xl glass-panel glass-panel-hover flex flex-col justify-between cursor-pointer min-h-[110px]"
                >
                  <div className="flex items-start justify-between w-full">
                    <span className="text-[9px] font-extrabold text-purple-700 uppercase tracking-widest">Auto Pipelines</span>
                    <div className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0 border border-purple-500/15">
                      <Bot size={12} className="stroke-[2px]" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-extrabold text-slate-800">{currentAlerts.automations.count}</span>
                    <span className="text-[9px] text-purple-700 bg-purple-500/10 border border-purple-500/15 px-2 py-0.5 rounded-lg font-bold">Agent</span>
                  </div>
                  <div className="text-[9px] text-purple-600 font-bold mt-2">Click to view &rarr;</div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Middle Row 1: Grouped Bar Chart of Supplier Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-4 p-6 rounded-3xl glass-panel shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5 pb-3 border-b border-slate-200/60">
            <h3 className="text-xs font-extrabold text-slate-850 uppercase tracking-wider flex items-center gap-2.5">
              <BarChart2 size={18} className="text-indigo-500 stroke-[2px]" /> Top 6 Suppliers Performance Audit
            </h3>
            
            <div className="flex items-center gap-2.5">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none shadow-sm cursor-pointer"
              >
                {Object.keys(seededSuppliersMonthlyData).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <span className="text-[9px] bg-indigo-500/10 text-indigo-700 px-3 py-1.5 rounded-xl font-extrabold border border-indigo-500/15">
                Audit Telemetry
              </span>
            </div>
          </div>

          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={seededSuppliersData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="deliveryGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#a5b4fc" />
                  </linearGradient>
                  <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0d9488" />
                    <stop offset="100%" stopColor="#5eead4" />
                  </linearGradient>
                  <linearGradient id="qualityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#fbcfe8" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0/30" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 250]} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 550 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.6)', borderRadius: '16px', boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}
                  labelStyle={{ fontWeight: '750', color: '#1e293b', fontSize: '11px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: '700', color: '#475569', paddingTop: '8px' }} />
                <Bar dataKey="Delivery" fill="url(#deliveryGrad)" radius={[4, 4, 0, 0]} barSize={10} />
                <Bar dataKey="Price" fill="url(#priceGrad)" radius={[4, 4, 0, 0]} barSize={10} />
                <Bar dataKey="Quality" fill="url(#qualityGrad)" radius={[4, 4, 0, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row 1: Recent Activity Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3 p-6 rounded-3xl glass-panel shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/60 mb-5">
            <h3 className="text-xs font-extrabold text-slate-850 uppercase tracking-wider flex items-center gap-2">
              <Bell size={18} className="text-amber-500 stroke-[2px] animate-bounce" /> Recent Activity Timeline
            </h3>
            <button
              onClick={() => onNavigate('rfqs')}
              className="view-all-btn text-[11px] text-indigo-650 hover:text-indigo-750 font-extrabold flex items-center gap-1 cursor-pointer bg-white px-3.5 py-1.5 rounded-xl shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              View All Activities <ChevronRight size={14} className="stroke-[2.5px]" />
            </button>
          </div>

          <div className="space-y-5 overflow-y-auto max-h-[300px] pr-2">
            {recent_activity && recent_activity.length > 0 ? (
              recent_activity.map((act, index) => (
                <div key={index} className="flex gap-4 relative group">
                  {index !== recent_activity.length - 1 && (
                    <div className="absolute top-6 bottom-0 left-[11px] w-[1px] bg-slate-200"></div>
                  )}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 border border-white shadow-sm ${
                    act.stage === 'PO Generated' ? 'bg-emerald-500/10 text-emerald-600' :
                      act.stage === 'Created' ? 'bg-sky-500/10 text-sky-600' :
                        act.stage === 'RFQ Sent' ? 'bg-indigo-500/10 text-indigo-600' :
                          act.stage === 'Supplier Responded' ? 'bg-purple-500/10 text-purple-600' :
                            act.stage === 'Approved' ? 'bg-teal-500/10 text-teal-650' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-slate-800">{act.rfq_number} — <span className="text-slate-500 font-semibold">{act.stage}</span></span>
                      <span className="text-[10px] text-slate-400 font-bold font-mono">{act.timestamp}</span>
                    </div>
                    <p className="text-xs text-slate-650 mt-1 font-medium leading-relaxed">{act.details}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-400 py-12 text-xs font-medium">No activity recorded today.</div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom KPI Bar (4 Large Metric Highlights with glassmorphism and soft neumorphic inner/outer depth) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
        
        {/* TOTAL SUPPLIERS */}
        <div className="p-5 rounded-3xl glass-panel glass-panel-hover flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-600 border border-sky-500/15 flex items-center justify-center shrink-0">
            <Users size={22} className="stroke-[2px]" />
          </div>
          <div>
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">TOTAL SUPPLIERS</span>
            <span className="text-2xl font-black text-slate-850 block">{widgets?.total_suppliers ?? 542}</span>
            <span className="text-[10px] text-slate-500 font-semibold">Across all categories</span>
          </div>
        </div>

        {/* TOTAL PO VALUE */}
        <div className="p-5 rounded-3xl glass-panel glass-panel-hover flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/15 flex items-center justify-center shrink-0">
            <DollarSign size={22} className="stroke-[2px]" />
          </div>
          <div>
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">TOTAL PO VALUE</span>
            <span className="text-2xl font-black text-slate-850 block">
              {widgets?.total_rfq_value !== undefined ? `$${(widgets.total_rfq_value / 1000000).toFixed(2)}M` : '$24.85M'}
            </span>
            <span className="text-[10px] text-emerald-600 font-semibold">This Quarter</span>
          </div>
        </div>

        {/* COST SAVINGS (AI) */}
        <div className="p-5 rounded-3xl glass-panel glass-panel-hover flex items-center gap-4 border-l-[3px] border-l-indigo-500/40">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 border border-indigo-500/15 flex items-center justify-center shrink-0">
            <TrendingUp size={22} className="stroke-[2px]" />
          </div>
          <div>
            <span className="text-[9px] font-extrabold text-indigo-500 uppercase tracking-widest block">COST SAVINGS (AI)</span>
            <span className="text-2xl font-black text-indigo-600 block">
              {widgets?.cost_savings !== undefined ? `$${(widgets.cost_savings / 1000000).toFixed(2)}M` : '$2.48M'}
            </span>
            <span className="text-[10px] text-indigo-500/70 font-semibold">AI Auto-Negotiated</span>
          </div>
        </div>

        {/* REVENUE VALUE */}
        <div className="p-5 rounded-3xl glass-panel glass-panel-hover flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/15 flex items-center justify-center shrink-0">
            <FileText size={22} className="stroke-[2px]" />
          </div>
          <div>
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">REVENUE VALUE</span>
            <span className="text-2xl font-black text-slate-850 block">
              {widgets?.total_rfq_value !== undefined ? `$${((widgets.total_rfq_value * 1.18) / 1000000).toFixed(2)}M` : '$119.51M'}
            </span>
            <span className="text-[10px] text-amber-600/70 font-semibold">This Quarter</span>
          </div>
        </div>

      </div>

      {/* Modal Popup for Sourcing Operations Details - Restyled to match glassmorphism */}
      {activeAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm">
          <div className="bg-white/90 backdrop-blur-xl border border-white/60 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/60 bg-amber-500/5">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-indigo-500 stroke-[2px]" />
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  {activeAlertModal.title}
                </h4>
              </div>
              <button
                onClick={() => setActiveAlertModal(null)}
                className="text-slate-500 hover:bg-slate-100 hover:text-slate-850 text-lg font-bold border border-slate-200 bg-white rounded-lg w-7 h-7 flex items-center justify-center transition-colors cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 max-h-[380px] overflow-y-auto bg-white/20">
              {activeAlertModal.type === 'attention' && (
                <div className="space-y-4 pb-2">
                  {activeAlertModal.data.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 bg-sky-500/5 p-4 rounded-2xl border border-sky-500/10 shadow-sm hover:scale-[1.01] transition-all text-xs"
                    >
                      <span
                        className="font-bold text-[#0078d4] hover:underline cursor-pointer text-sm"
                        onClick={() => { onNavigate('rfqs', { selectRfqNum: item.id }); setActiveAlertModal(null); }}
                      >
                        {item.id}
                      </span>
                      <span className="bg-white/80 text-sky-850 border border-sky-500/15 font-extrabold px-2.5 py-0.5 rounded-lg text-[9px] uppercase tracking-wider">
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
                      className="flex items-center justify-between gap-3 bg-rose-500/5 p-4 rounded-2xl border border-rose-500/10 shadow-sm hover:scale-[1.01] transition-all text-xs"
                    >
                      {item.id ? (
                        <span
                          className="font-bold text-indigo-600 hover:underline cursor-pointer text-sm"
                          onClick={() => setSelectedSupplierId(item.id)}
                        >
                          {item.supplier}
                        </span>
                      ) : (
                        <span className="font-bold text-slate-700 text-sm">{item.supplier}</span>
                      )}
                      <span className={`text-[9px] px-2.5 py-0.5 rounded-lg font-extrabold border uppercase tracking-wider ${item.risk === 'High'
                          ? 'bg-rose-500/10 text-rose-700 border-rose-500/15'
                          : 'bg-amber-500/10 text-amber-750 border-amber-500/15'
                        }`}>
                        {item.risk === 'High' ? 'Critical Risk' : 'Moderate Risk'}
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
                      className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200/60 shadow-sm hover:scale-[1.01] transition-all text-xs space-y-2"
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
                          <span className="font-bold text-slate-700 text-sm">{item.supplier}</span>
                        )}
                        <span className="text-[9px] bg-amber-500/10 text-amber-700 border border-amber-500/15 font-extrabold px-2.5 py-0.5 rounded-lg uppercase tracking-wider">
                          {item.rfq === 'Preferred Partner' ? 'Approved Partner' : item.rfq}
                        </span>
                      </div>
                      <div className="text-xs text-slate-550 font-bold">{item.metric}</div>
                    </div>
                  ))}
                </div>
              )}

              {activeAlertModal.type === 'savings' && (
                <div className="bg-emerald-500/5 p-5 rounded-2xl border border-emerald-500/10 space-y-2 text-xs">
                  <div className="font-extrabold text-emerald-700 text-xl leading-none">{activeAlertModal.data.amount}</div>
                  <div className="text-slate-600 font-semibold leading-relaxed">{activeAlertModal.data.detail}</div>
                </div>
              )}

              {activeAlertModal.type === 'deviations' && (
                <div className="space-y-4 pb-2">
                  {activeAlertModal.data.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 bg-pink-500/5 p-4 rounded-2xl border border-pink-500/10 shadow-sm hover:scale-[1.01] transition-all text-xs"
                    >
                      {item.id ? (
                        <span
                          className="font-bold text-indigo-600 hover:underline cursor-pointer text-sm"
                          onClick={() => setSelectedSupplierId(item.id)}
                        >
                          {item.supplier}
                        </span>
                      ) : (
                        <span className="font-bold text-slate-700 text-sm">{item.supplier}</span>
                      )}
                      <span className="text-xs text-pink-700 font-bold bg-white border border-pink-500/15 rounded-lg px-2.5 py-0.5">{item.deviation}</span>
                    </div>
                  ))}
                </div>
              )}

              {activeAlertModal.type === 'automations' && (
                <div className="bg-purple-500/5 p-5 rounded-2xl border border-purple-500/10 space-y-2 text-xs">
                  <div className="font-bold text-slate-800 text-sm leading-none">{activeAlertModal.data.count} Campaigns Eligible</div>
                  <div className="text-slate-550 font-semibold leading-relaxed mt-1">{activeAlertModal.data.detail}</div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-slate-200/60 bg-slate-50/50">
              <button
                onClick={() => setActiveAlertModal(null)}
                className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-4.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer"
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
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-transparent px-4.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-md"
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
