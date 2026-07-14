import React, { useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { 
  Calendar, Cpu, Eye, FileSearch, Database, BarChart2, TrendingUp, 
  Sparkles, RefreshCw, AlertTriangle, ShieldCheck, Play, ArrowRight, Upload
} from 'lucide-react';
import { rfqService, erpService, phase2Service } from '../services/api';

export default function Phase2Modules({ tab }) {
  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [confVal, setConfVal] = useState(95);
  
  // Dynamics 365 state variables
  const [erpStats, setErpStats] = useState({ synced_vendors: 0, synced_pos: 0, logs_count: 0 });
  const [erpLogs, setErpLogs] = useState([]);
  const [activeLog, setActiveLog] = useState(null);

  // Phase 2 state variables
  const [prodPlanning, setProdPlanning] = useState({ jobs: [], oee: [] });
  const [demandForecast, setDemandForecast] = useState({ chart_data: [], recommendation: '' });
  const [inventory, setInventory] = useState({ inventory: [], alerts: [] });
  const [qualityVision, setQualityVision] = useState([]);
  const [drawingAnalysis, setDrawingAnalysis] = useState(null);
  const [powerBiData, setPowerBiData] = useState({ pie_data: [], line_data: [] });

  React.useEffect(() => {
    loadTabData();
  }, [tab, confVal]);

  const loadTabData = () => {
    if (!tab) return;
    setLoading(true);
    
    if (tab === 'prod_planning') {
      phase2Service.getProdPlanning()
        .then(res => {
          setProdPlanning(res.data);
          setLoading(false);
        })
        .catch(err => { console.error(err); setLoading(false); });
    } else if (tab === 'demand_forecast') {
      phase2Service.getDemandForecast(confVal)
        .then(res => {
          setDemandForecast(res.data);
          setLoading(false);
        })
        .catch(err => { console.error(err); setLoading(false); });
    } else if (tab === 'inventory_forecast') {
      phase2Service.getInventory()
        .then(res => {
          setInventory(res.data);
          setLoading(false);
        })
        .catch(err => { console.error(err); setLoading(false); });
    } else if (tab === 'mfg_ai') {
      phase2Service.getProdPlanning()
        .then(res => {
          setProdPlanning(res.data);
          setLoading(false);
        })
        .catch(err => { console.error(err); setLoading(false); });
    } else if (tab === 'quality_vision') {
      phase2Service.getQualityVision()
        .then(res => {
          setQualityVision(res.data);
          setLoading(false);
        })
        .catch(err => { console.error(err); setLoading(false); });
    } else if (tab === 'erp_link') {
      loadErpData();
    } else if (tab === 'power_bi') {
      phase2Service.getPowerBiData()
        .then(res => {
          setPowerBiData(res.data);
          setLoading(false);
        })
        .catch(err => { console.error(err); setLoading(false); });
    } else {
      setLoading(false);
    }
  };

  const loadErpData = () => {
    setLoading(true);
    Promise.all([
      erpService.getStats(),
      erpService.getLogs()
    ]).then(([statsRes, logsRes]) => {
      setErpStats(statsRes.data);
      setErpLogs(logsRes.data);
      if (logsRes.data.length > 0) {
        setActiveLog(logsRes.data[0]);
      }
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  const handleForceSync = () => {
    setLoading(true);
    setTimeout(() => {
      loadErpData();
      setActionSuccess('Data successfully synchronized with Dynamics 365 F&O!');
      setTimeout(() => setActionSuccess(''), 4000);
    }, 1500);
  };

  const handleOptimizeSchedule = () => {
    setLoading(true);
    phase2Service.optimizeSchedule()
      .then(res => {
        setLoading(false);
        setActionSuccess(res.data.message);
        setTimeout(() => setActionSuccess(''), 4000);
        loadTabData();
      })
      .catch(err => {
        setLoading(false);
        console.error(err);
      });
  };

  const handleGenerateRfqDrafts = () => {
    setLoading(true);
    phase2Service.generateRfqDrafts()
      .then(res => {
        setLoading(false);
        setActionSuccess(res.data.message);
        setTimeout(() => setActionSuccess(''), 5000);
      })
      .catch(err => {
        setLoading(false);
        console.error(err);
      });
  };

  const handleAutoRefill = () => {
    setLoading(true);
    phase2Service.autoRefill()
      .then(res => {
        setLoading(false);
        setActionSuccess(res.data.message);
        setTimeout(() => setActionSuccess(''), 5000);
        loadTabData();
      })
      .catch(err => {
        setLoading(false);
        console.error(err);
      });
  };

  const handleDrawingUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    phase2Service.analyzeDrawing(file)
      .then(res => {
        setDrawingAnalysis(res.data);
        setActionSuccess(`Drawing ${res.data.filename} successfully analyzed!`);
        setTimeout(() => setActionSuccess(''), 4000);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  // Mock Data for Charts
  const demandData = [
    { month: 'Jan', Sales: 4000, Forecast: 4100 },
    { month: 'Feb', Sales: 4500, Forecast: 4600 },
    { month: 'Mar', Sales: 5100, Forecast: 5200 },
    { month: 'Apr', Sales: 4800, Forecast: 5300 },
    { month: 'May', Sales: 5300, Forecast: 5800 },
    { month: 'Jun', Sales: 5900, Forecast: 6400 },
    { month: 'Jul', Sales: null, Forecast: 7000 },
    { month: 'Aug', Sales: null, Forecast: 7200 },
    { month: 'Sep', Sales: null, Forecast: 7500 }
  ];

  const inventoryData = [
    { name: 'PVC Resin', Stock: 85, MinSafety: 50 },
    { name: 'HDPE Granules', Stock: 35, MinSafety: 60 }, // Below safety
    { name: 'LDPE Film', Stock: 72, MinSafety: 40 },
    { name: 'Stabilizers', Stock: 18, MinSafety: 30 }, // Below safety
    { name: 'Solvent Cement', Stock: 90, MinSafety: 30 }
  ];

  const oeeData = [
    { name: 'Line 1 (PVC Extrusion)', OEE: 88, Performance: 92, Quality: 99 },
    { name: 'Line 2 (HDPE Injection)', OEE: 76, Performance: 80, Quality: 95 },
    { name: 'Line 3 (Fitting Assembly)', OEE: 91, Performance: 94, Quality: 98 }
  ];

  const powerBiCosts = [
    { name: 'Raw Polymers', value: 450000 },
    { name: 'Additives', value: 120000 },
    { name: 'Packaging', value: 80000 },
    { name: 'MRO & Parts', value: 50000 }
  ];

  const COLORS = ['#0078d4', '#107c41', '#6366f1', '#f59e0b'];

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-6">
      
      {/* Action Toast */}
      {actionSuccess && (
        <div className="fixed top-4 right-4 bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-bounce">
          <ShieldCheck size={20} />
          <span className="text-sm font-semibold">{actionSuccess}</span>
        </div>
      )}

      {/* VIEW RENDERER BASED ON SELECTED TAB */}
      
      {/* 1. PRODUCTION PLANNING */}
      {tab === 'prod_planning' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="text-[#0078d4]" /> AI Production Scheduling
              </h1>
              <p className="text-xs text-slate-500 mt-1">Map manufacturing schedules to raw materials pipeline for Neproplast extrusion lines.</p>
            </div>
            <button 
              onClick={handleOptimizeSchedule}
              disabled={loading}
              className="bg-gradient-to-r from-[#0078d4] to-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Sparkles size={14} /> {loading ? 'Computing optimization...' : 'AI Optimize Schedule'}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Manufacturing Gantt Timelines (Seeded RFQs & POs)</h3>
              
              <div className="space-y-4">
                {prodPlanning.jobs && prodPlanning.jobs.length > 0 ? (
                  prodPlanning.jobs.map((job, idx) => (
                    <div key={idx} className="space-y-1 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                      <div className="flex justify-between text-xs font-semibold text-slate-700">
                        <span>{job.name}</span>
                        <span className={job.material_ready < 50 ? "text-amber-600" : "text-[#0078d4]"}>
                          {job.material_ready}% Material Ready
                        </span>
                      </div>
                      <div className="relative h-6 bg-slate-100 rounded-md overflow-hidden">
                        <div 
                          className={`absolute top-0 bottom-0 left-0 rounded-md flex items-center px-2 text-[10px] text-white font-bold transition-all duration-500 ${
                            job.material_ready < 50 ? "bg-amber-500" : "bg-[#0078d4]"
                          }`}
                          style={{ width: `${job.material_ready}%` }}
                        >
                          {job.details}
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400">Target Delivery Date: {job.target_date} • Quantity: {job.quantity} MT • Linked RFQ: {job.rfq_number}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-450 text-xs text-center py-6">No active Gantt manufacturing schedules.</div>
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Line Capacity Telemetry</h3>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={prodPlanning.oee || []} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                    <Tooltip />
                    <Bar dataKey="OEE" fill="#0078d4" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. DEMAND FORECASTING */}
      {tab === 'demand_forecast' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="text-[#0078d4]" /> AI Sales & Demand Forecasting
              </h1>
              <p className="text-xs text-slate-500 mt-1">Machine learning projections for PVC/HDPE purchase requirements based on seasonal orders.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                <span>Confidence Interval:</span>
                <input 
                  type="range" 
                  min="80" 
                  max="99" 
                  value={confVal} 
                  onChange={(e) => setConfVal(parseInt(e.target.value))} 
                  className="w-20 accent-[#0078d4]"
                />
                <span>{confVal}%</span>
              </div>
              <button 
                onClick={handleGenerateRfqDrafts}
                disabled={loading}
                className="copilot-btn-primary text-xs disabled:opacity-50"
              >
                <Sparkles size={14} /> {loading ? 'Drafting...' : 'Auto-Generate RFQ Drafts'}
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Demand Forecasting Model (Historical PO Spend vs. Projections)</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={demandForecast.chart_data || []} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="Sales" stroke="#0078d4" fillOpacity={0.1} fill="#0078d4" strokeWidth={2} />
                  <Area type="monotone" dataKey="Forecast" stroke="#107c41" fillOpacity={0.05} fill="#107c41" strokeDasharray="4 4" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-650 leading-relaxed font-semibold">
              💡 **AI Insight**: {demandForecast.recommendation || 'Processing demand forecasting projections...'}
            </div>
          </div>
        </div>
      )}

      {/* 3. INVENTORY FORECASTING */}
      {tab === 'inventory_forecast' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <BarChart2 className="text-[#0078d4]" /> Stock Reorder Forecasting
              </h1>
              <p className="text-xs text-slate-500 mt-1">Live metrics predicting inventory exhaustion dates based on current production rates.</p>
            </div>
            <button 
              onClick={handleAutoRefill}
              disabled={loading}
              className="copilot-btn-primary text-xs disabled:opacity-50"
            >
              <Sparkles size={14} /> Auto-Generate Refills
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Raw Material Safety Stock Analysis</h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={inventory.inventory || []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Stock" fill="#0078d4" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="MinSafety" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Replenishment Alerts</h3>
              <div className="space-y-3 my-2 flex-1 overflow-y-auto">
                
                {inventory.alerts && inventory.alerts.length > 0 ? (
                  inventory.alerts.map((alert, idx) => (
                    <div key={idx} className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-3">
                      <AlertTriangle className="text-rose-600 shrink-0" size={20} />
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">{alert.item_name} Low Stock</span>
                        <span className="text-[10px] text-slate-500">
                          Stock: {alert.stock} MT / Safety: {alert.min} MT. Exhaustion predicted in {alert.days_remaining} days.
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-[11px] text-slate-400 border border-slate-100 rounded-xl">
                    ✅ All material stocks are above minimum safety level.
                  </div>
                )}

              </div>
              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed pt-2">
                Reorder rules are auto-calculated from historical supplier lead times (e.g. 14 days average for overseas shipping).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. MANUFACTURING AI */}
      {tab === 'mfg_ai' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Cpu className="text-[#0078d4]" /> Manufacturing Machine AI
            </h1>
            <p className="text-xs text-slate-500 mt-1">Predictive maintenance telemetry and Overall Equipment Effectiveness (OEE) anomaly mapping.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Extruder Performance Telemetry</h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={prodPlanning.oee || []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="OEE" stroke="#0078d4" strokeWidth={2} />
                    <Line type="monotone" dataKey="Performance" stroke="#107c41" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Predictive Machine Alerts</h3>
              <div className="space-y-2.5">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700">Extruder Line 1</span>
                    <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-semibold">Normal</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Temperature steady at 190°C. Output rate 1.2 tons/hr.</p>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700">Injection Mold Line 2</span>
                    <span className="text-[9px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-semibold">Anomaly Warning</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Hydraulic valve pressure drop detected (4.2%). Suggest repair before Aug 2.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. QUALITY VISION AI */}
      {tab === 'quality_vision' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Eye className="text-[#0078d4]" /> Quality Vision AI Inspection
            </h1>
            <p className="text-xs text-slate-500 mt-1">Real-time computer vision scans detecting manufacturing defects on Neproplast PVC extrusions.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Visual camera feeds */}
            <div className="lg:col-span-2 grid grid-cols-2 gap-4">
              
              {/* Feed 1 */}
              <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden flex flex-col relative aspect-video justify-center items-center">
                <div className="absolute top-2.5 left-2.5 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-ping"></span> Live Feed - Extruder 1
                </div>
                <div className="absolute bottom-2.5 right-2.5 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                  Status: Defect-Free (99%)
                </div>
                {/* Visual mockup representation */}
                <div className="w-[80%] h-4 bg-slate-400 rounded border-2 border-emerald-500 relative flex items-center justify-center">
                  <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-widest bg-white/70 px-2 py-0.5 rounded">Inspection Target</span>
                </div>
              </div>

              {/* Feed 2 */}
              <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden flex flex-col relative aspect-video justify-center items-center">
                <div className="absolute top-2.5 left-2.5 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-ping"></span> Live Feed - Extruder 2
                </div>
                <div className="absolute bottom-2.5 right-2.5 bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                  Defect Warning: Surface Defect (94%)
                </div>
                {/* Defect box */}
                <div className="w-[80%] h-4 bg-slate-400 rounded border-2 border-rose-500 relative flex items-center justify-center">
                  <div className="absolute left-[30%] w-4 h-4 border-2 border-red-600 animate-pulse bg-red-600/30"></div>
                  <span className="text-[9px] text-rose-800 font-bold uppercase tracking-widest bg-white/70 px-2 py-0.5 rounded">Surface Scratch Identified</span>
                </div>
              </div>

            </div>

            {/* Quality Defect Log */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Defect Detection Log</h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                
                {qualityVision && qualityVision.length > 0 ? (
                  qualityVision.map((defect, idx) => (
                    <div 
                      key={idx} 
                      className={`p-2.5 rounded-lg flex justify-between items-center text-xs border ${
                        defect.status === 'Active' ? 'bg-rose-55/70 border-rose-100 text-rose-800' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div>
                        <span className="font-bold block">{defect.defect_type}</span>
                        <span className="text-[10px] text-slate-500">{defect.location} • {defect.confidence}% Confidence</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 block">{defect.timestamp}</span>
                        <span className={`inline-block text-[8px] uppercase font-bold px-1.5 py-0.5 rounded mt-1 ${
                          defect.status === 'Active' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-650'
                        }`}>{defect.status}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-455 text-xs text-center py-6">No defect logs returned from vision API.</div>
                )}

              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. ENGINEERING COPILOT */}
      {tab === 'eng_copilot' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <FileSearch className="text-[#0078d4]" /> Engineering Copilot Drawing Analyst
            </h1>
            <p className="text-xs text-slate-500 mt-1">Upload technical drawings (PDF/CAD) for automated tolerance inspection and material recommendation mapping.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Draw Uploader */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 h-fit">
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Technical Drawing Upload</h3>
              
              <label 
                htmlFor="draw-upload-input" 
                className="border-2 border-dashed border-slate-300 hover:border-[#0078d4] rounded-xl p-6 text-center cursor-pointer bg-slate-50 block transition-colors"
              >
                <Upload className="mx-auto text-slate-400 mb-2" size={24} />
                <span className="text-xs font-bold text-slate-700 block">Select Drawing PDF / CAD</span>
                <span className="text-[10px] text-slate-400 block mt-1">Auto-extracts material grades</span>
                <input 
                  type="file" 
                  id="draw-upload-input" 
                  onChange={handleDrawingUpload} 
                  className="hidden" 
                  accept=".pdf,.dwg,.dxf,.txt,.doc,.docx"
                  disabled={loading}
                />
              </label>
            </div>

            {/* Analysis details */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Copilot Spec Comparison</h3>
              
              {drawingAnalysis ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <span className="text-[10px] text-emerald-800 font-bold block uppercase tracking-wider">Analysis Result ({drawingAnalysis.filename})</span>
                    <h4 className="text-sm font-bold text-slate-850 mt-1">{drawingAnalysis.material_grade} Grade Extracted</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed font-medium">{drawingAnalysis.reasoning}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Recommended Suppliers in Seeded DB:</h4>
                    {drawingAnalysis.matched_suppliers && drawingAnalysis.matched_suppliers.length > 0 ? (
                      drawingAnalysis.matched_suppliers.map((supplier, sIdx) => (
                        <div key={sIdx} className="p-3 bg-white border border-slate-200 rounded-lg flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-slate-800 block">{supplier.name}</span>
                            <span className="text-[10px] text-slate-400 block">{supplier.country} • Rating: {supplier.rating}/5.0</span>
                          </div>
                          <span className="bg-blue-50 text-[#0078d4] font-bold px-2 py-0.5 rounded text-[10px]">
                            Quality Score: {supplier.quality_score}%
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-400 text-xs italic">No matched polymer or additives suppliers found in the database.</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 text-xs py-10 text-center font-medium">
                  No CAD/PDF technical drawing uploaded yet. Use the uploader on the left to analyze specifications.
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 7. LIVE ERP LINK */}
      {tab === 'erp_link' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Database className="text-[#0078d4]" /> Dynamics 365 ERP Link Console
              </h1>
              <p className="text-xs text-slate-500 mt-1">Synchronize local procurement database objects with Microsoft Dynamics 365 ERP.</p>
            </div>
            <button 
              onClick={handleForceSync}
              disabled={loading}
              className="copilot-btn-primary text-xs"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Transmitting data...' : 'Force Dynamics 365 Sync'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700">Synced Vendors</span>
                <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-semibold">Active Sync</span>
              </div>
              <div className="text-xl font-bold text-slate-800">{erpStats.synced_vendors} / 102</div>
              <p className="text-[10px] text-slate-400">Suppliers registered in Dynamics directory.</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700">Released Purchase Orders</span>
                <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-semibold">Synced</span>
              </div>
              <div className="text-xl font-bold text-slate-800">{erpStats.synced_pos} POs</div>
              <p className="text-[10px] text-slate-400">POs successfully synchronized into Dynamics Financials.</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700">Total API Transactions</span>
                <span className="text-[9px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold">Logged</span>
              </div>
              <div className="text-xl font-bold text-[#0078d4]">{erpStats.logs_count}</div>
              <p className="text-[10px] text-slate-400">Successful OData REST payloads logged.</p>
            </div>

          </div>

          {/* Payload monitor table in Phase 2 modules */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-800">Dynamics OData REST API Transaction Logs</h3>
              <button 
                onClick={loadErpData} 
                className="text-xs text-[#0078d4] font-bold hover:underline flex items-center gap-1"
              >
                <RefreshCw size={12} /> Refresh
              </button>
            </div>

            {erpLogs.length === 0 ? (
              <div className="p-16 text-center text-slate-400 text-xs">
                No OData payloads transmitted to Dynamics ERP yet. Go to the "RFP Campaign Simulator" tab to create sync actions.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
                {/* List of logs */}
                <div className="lg:col-span-1 max-h-[350px] overflow-y-auto divide-y divide-slate-100">
                  {erpLogs.map((log, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveLog(log)}
                      className={`w-full text-left p-3.5 flex items-center justify-between text-xs transition-colors ${
                        activeLog?.id === log.id 
                          ? 'bg-blue-50/40 border-l-4 border-[#0078d4]' 
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <span className="text-slate-400 text-[10px] block font-semibold">{log.timestamp}</span>
                        <span className="font-bold text-slate-700">{log.object_type === 'po' ? 'PurchaseOrder' : 'Vendor'}</span>
                        <span className="text-[10px] text-slate-500 block font-mono font-semibold">{log.object_id}</span>
                      </div>
                      <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded text-[10px]">{log.status_code}</span>
                    </button>
                  ))}
                </div>

                {/* Payload Viewer */}
                <div className="lg:col-span-2 p-5 space-y-4 max-h-[350px] overflow-y-auto bg-slate-50 text-[10px] font-mono">
                  {activeLog ? (
                    <>
                      <div className="border-b border-slate-250 pb-2 flex justify-between items-center text-slate-500 font-bold text-[9px] uppercase">
                        <span>OData API Transmission Payload</span>
                        <span>Log ID: #{activeLog.id}</span>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <span className="text-[#0078d4] font-bold block">[HTTP Request URL]</span>
                          <span className="text-slate-700 break-all select-all">{activeLog.url}</span>
                        </div>
                        <div>
                          <span className="text-amber-600 font-bold block">[Request OData Headers]</span>
                          <pre className="bg-slate-900 text-slate-300 p-2.5 rounded border border-slate-800 overflow-x-auto text-[10px]">
                            {JSON.stringify(activeLog.headers, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <span className="text-[#107c41] font-bold block">[Request OData Payload Body]</span>
                          <pre className="bg-slate-900 text-slate-300 p-2.5 rounded border border-slate-800 overflow-x-auto text-[10px]">
                            {JSON.stringify(activeLog.request_payload, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <span className="text-purple-600 font-bold block">[Response JSON Payload Body]</span>
                          <pre className="bg-slate-900 text-slate-300 p-2.5 rounded border border-slate-800 overflow-x-auto text-[10px]">
                            {JSON.stringify(activeLog.response_payload, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-slate-400 py-16">Select a transaction log to view payload contents.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 8. POWER BI INTEGRATION */}
      {tab === 'power_bi' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <BarChart2 className="text-[#0078d4]" /> Power BI Procurement Costs Dashboard
            </h1>
            <p className="text-xs text-slate-500 mt-1">Microsoft Power BI financial analytics integration reflecting live database spend.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Pie cost breakdown */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <h3 className="text-xs font-semibold text-slate-450 uppercase tracking-wider mb-2">Category Spend Share</h3>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={powerBiData.pie_data || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {(powerBiData.pie_data || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 text-[10px] justify-center pt-2 font-semibold">
                {(powerBiData.pie_data || []).map((entry, index) => (
                  <span key={index} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                    <span>{entry.name}: ${entry.value.toLocaleString()}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Financial Spend History */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-semibold text-slate-450 uppercase tracking-wider">Spend History Timeline (USD Millions)</h3>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={powerBiData.line_data || []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value}M`} />
                    <Line type="monotone" dataKey="Sales" stroke="#0078d4" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
