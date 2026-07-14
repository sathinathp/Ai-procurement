import React, { useEffect, useState } from 'react';
import { 
  FileText, Clipboard, MessageSquare, CheckSquare, 
  Hourglass, CheckCircle2, TrendingUp, Sparkles, 
  Plus, Search, Bot, Upload, BarChart2, Bell
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line
} from 'recharts';
import { dashboardService } from '../services/api';

export default function Dashboard({ onNavigate, onOpenCopilot, onImportTrigger }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
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

  // Mock chart data comparing top seeded suppliers
  const chartData = [
    { name: 'SABIC Polymers', Quality: 95, Delivery: 91, Price: 85 },
    { name: 'Borouge', Quality: 93, Delivery: 92, Price: 80 },
    { name: 'Jubail Polymers', Quality: 97, Delivery: 98, Price: 88 },
    { name: 'Oman Resin Co.', Quality: 89, Delivery: 88, Price: 92 },
    { name: 'Riyadh Chemical', Quality: 91, Delivery: 85, Price: 78 },
    { name: 'Al-Khobar Plastics', Quality: 80, Delivery: 65, Price: 90 }
  ];

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0078d4]"></div>
        <p className="text-slate-500 mt-4 text-sm font-medium">Assembling executive procurement metrics...</p>
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

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
      
      {/* Top Banner */}
      <div className="flex justify-between items-center bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            Procurement Operations
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Good day. Here is the AI Copilot overview for Neproplast logistics and RFQ status.
          </p>
        </div>
        
        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => onNavigate('rfqs', { openCreateModal: true })} className="copilot-btn-primary text-xs">
            <Plus size={14} /> Create RFQ
          </button>
          <button onClick={() => onNavigate('suppliers')} className="copilot-btn-secondary text-xs">
            <Search size={14} /> Search Suppliers
          </button>
          <button onClick={onOpenCopilot} className="bg-gradient-to-r from-[#0078d4] to-indigo-600 text-white px-3.5 py-2 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-sm">
            <Bot size={14} /> AI Copilot
          </button>
          <button onClick={onImportTrigger} className="copilot-btn-secondary text-xs">
            <Upload size={14} /> Import RFQ
          </button>
        </div>
      </div>

      {/* Stats Widgets Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        
        {/* Widget 1: Today's RFQs */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Today's RFQs</span>
            <FileText size={18} className="text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-800 mt-2">{widgets.today_rfqs}</div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-1">Inbound pipeline</div>
        </div>

        {/* Widget 2: Pending RFQs */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending RFQs</span>
            <Clipboard size={18} className="text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-800 mt-2">{widgets.pending_rfqs}</div>
          <div className="text-[10px] text-slate-500 font-semibold mt-1">Awaiting responses</div>
        </div>

        {/* Widget 3: Supplier Responses */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Responses</span>
            <MessageSquare size={18} className="text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-slate-800 mt-2">{widgets.supplier_responses}</div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-1">Quotations loaded</div>
        </div>

        {/* Widget 4: Awaiting Comparison */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Awaiting Comp.</span>
            <TrendingUp size={18} className="text-[#0078d4]" />
          </div>
          <div className="text-2xl font-bold text-slate-800 mt-2">{widgets.awaiting_comparison}</div>
          <div className="text-[10px] text-indigo-600 font-semibold mt-1">Ready for comparison</div>
        </div>

        {/* Widget 5: Pending Approval */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Awaiting Appr.</span>
            <CheckSquare size={18} className="text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-800 mt-2">{widgets.pending_approval}</div>
          <div className="text-[10px] text-slate-500 mt-1">Needs review</div>
        </div>

        {/* Widget 6: Completed RFQs */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Completed RFQs</span>
            <CheckCircle2 size={18} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-800 mt-2">{widgets.completed_rfqs}</div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-1">PO generated</div>
        </div>

      </div>

      {/* Middle Row: Charts & Supplier Performance & Response Times */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Performance Overview Gauge */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Performance Audit</h3>
          
          <div className="space-y-4 pt-2">
            
            {/* Avg rating */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <span className="text-xs text-slate-500 font-medium">Avg Supplier Rating</span>
              <span className="text-sm font-bold text-slate-800">{widgets.supplier_performance.avg_rating} / 5.0</span>
            </div>

            {/* Delivery Score */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium text-slate-500">
                <span>Avg On-Time Delivery</span>
                <span className="font-bold text-slate-800">{widgets.supplier_performance.avg_delivery_score}%</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full" style={{ width: `${widgets.supplier_performance.avg_delivery_score}%` }}></div>
              </div>
            </div>

            {/* Quality Defect score */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium text-slate-500">
                <span>Avg Defect-Free Quality</span>
                <span className="font-bold text-slate-800">{widgets.supplier_performance.avg_quality_score}%</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#0078d4] h-full" style={{ width: `${widgets.supplier_performance.avg_quality_score}%` }}></div>
              </div>
            </div>

            {/* Avg response time */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <Hourglass size={16} className="text-blue-500" />
                <span className="text-xs font-medium text-slate-600">Email Response Time</span>
              </div>
              <span className="text-sm font-bold text-slate-800">{widgets.average_response_time_hours} hrs</span>
            </div>

          </div>
        </div>

        {/* Recharts Supplier Bar Chart */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <BarChart2 size={16} className="text-[#0078d4]" /> Seeded Suppliers Performance Comparison
            </h3>
            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-medium">Audit Telemetry</span>
          </div>
          <div className="flex-1 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  labelStyle={{ fontWeight: '600', color: '#1e293b', fontSize: '11px' }}
                  itemStyle={{ fontSize: '11px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                <Bar dataKey="Quality" fill="#0078d4" radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="Delivery" fill="#107c41" radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="Price" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Bottom Row: Recent Activity & Phase 2 Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Activity List */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
            <Bell size={16} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Recent Activity Timeline</h3>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto max-h-[300px] pr-2">
            {recent_activity.length === 0 ? (
              <div className="text-center text-slate-400 py-16 text-xs">No activity recorded today.</div>
            ) : (
              recent_activity.map((act, index) => (
                <div key={index} className="flex gap-4 relative group">
                  {/* Line decoration */}
                  {index !== recent_activity.length - 1 && (
                    <div className="absolute top-6 bottom-0 left-[9px] w-0.5 bg-slate-200"></div>
                  )}
                  {/* Circle dot */}
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 z-10 ${
                    act.stage === 'PO Generated' ? 'bg-emerald-100 text-emerald-600' :
                    act.stage === 'Created' ? 'bg-blue-100 text-[#0078d4]' :
                    act.stage === 'RFQ Sent' ? 'bg-indigo-100 text-indigo-600' :
                    act.stage === 'Supplier Responded' ? 'bg-purple-100 text-purple-600' :
                    act.stage === 'Approved' ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <div className="w-2 h-2 rounded-full bg-current"></div>
                  </div>
                  {/* Content details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-semibold text-slate-800">{act.rfq_number} — {act.stage}</span>
                      <span className="text-[10px] text-slate-400">{act.timestamp}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{act.details}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Phase 2 Out of Scope Cards */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Phase 2: Coming Soon</h3>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            
            <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-400 font-medium">
              Production Planning
            </div>
            
            <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-400 font-medium">
              Demand Forecasting
            </div>
            
            <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-400 font-medium">
              Inventory Forecasting
            </div>
            
            <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-400 font-medium">
              Manufacturing AI
            </div>

            <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-400 font-medium">
              Quality Vision AI
            </div>

            <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-400 font-medium">
              Engineering Copilot
            </div>

            <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-400 font-medium">
              Live ERP Link
            </div>

            <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-400 font-medium">
              Power BI Dashboard
            </div>
            
          </div>
          <div className="pt-2 text-[10px] text-slate-400 text-center font-semibold">
            Enterprise integrations coming in Q4
          </div>
        </div>

      </div>

    </div>
  );
}
