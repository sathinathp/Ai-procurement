import React, { useState, useEffect } from 'react';
import { 
  Plus, Upload, FileText, CheckCircle, AlertTriangle, 
  Calendar, MapPin, Tag, MessageSquare, ListFilter,
  CheckCircle2, Circle, ArrowLeft, Bot, Sparkles, Send, ShieldAlert,
  Eye, Pencil, MoreVertical, TrendingUp, Award, Clock, ChevronLeft, ChevronRight,
  Database, RefreshCw, Activity
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { rfqService, workflowService, dashboardService, dbService } from '../services/api';

export default function RfqAssistant({ initialOpenCreate = false }) {
  const [rfqs, setRfqs] = useState([]);
  const [selectedRfq, setSelectedRfq] = useState(null);
  const [rfqTimeline, setRfqTimeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(initialOpenCreate);
  
  // Stock Validation Warning State
  const [stockWarningModal, setStockWarningModal] = useState(null);
  const [aiAgentState, setAiAgentState] = useState(() => {
    try {
      const saved = localStorage.getItem('ai_agent_state');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  
  // Create Form State
  const [formData, setFormData] = useState({
    rfq_number: 'RFQ-2026-TEMP',
    project_name: '',
    department: 'Procurement',
    required_date: '',
    item_name: '',
    item_code: '',
    description: '',
    quantity: '',
    unit: 'MT',
    specifications: '',
    priority: 'Medium',
    delivery_location: 'Riyadh Warehouse',
    expected_delivery_date: '',
    remarks: '',
    drawing_attachment: ''
  });
  
  const [uploading, setUploading] = useState(false);
  const [missingFields, setMissingFields] = useState([]);
  const [isAiExtracted, setIsAiExtracted] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [stats, setStats] = useState(null);
  const [reseeding, setReseeding] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [projectFilter, setProjectFilter] = useState('All Projects');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const fetchStats = () => {
    dashboardService.getStats()
      .then((res) => {
        setStats(res.data);
      })
      .catch((err) => {
        console.error("Failed to fetch stats in RfqAssistant:", err);
      });
  };

  const handleReSeedDb = () => {
    setReseeding(true);
    dbService.seed()
      .then((res) => {
        alert(res.data.message);
        setReseeding(false);
        fetchRfqs();
        fetchStats();
      })
      .catch((err) => {
        console.error(err);
        alert('Seeding database failed.');
        setReseeding(false);
      });
  };

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

  const mapStatus = (status) => {
    const mapping = {
      'Created': 'Open',
      'RFQ Sent': 'Quotes Pending',
      'Responses Received': 'Quotes Pending',
      'Under Comparison': 'Under Review',
      'Approved': 'Under Review',
      'PO Generated': 'Closed',
    };
    return mapping[status] || status;
  };

  const getMonthDay = (dateStr) => {
    if (!dateStr) return { month: 'MAY', day: '20' };
    const date = new Date(dateStr);
    const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    return {
      month: monthNames[date.getMonth()] || 'MAY',
      day: String(date.getDate()).padStart(2, '0')
    };
  };

  useEffect(() => {
    fetchRfqs();
    fetchStats();
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      try {
        const saved = localStorage.getItem('ai_agent_state');
        if (saved) {
          setAiAgentState(JSON.parse(saved));
        }
      } catch (err) {
        console.error(err);
      }
      // Re-fetch database lists in real-time as agent modifies records
      fetchRfqs();
      fetchStats();
    };
    window.addEventListener('ai_agent_update', handleUpdate);
    return () => window.removeEventListener('ai_agent_update', handleUpdate);
  }, []);

  useEffect(() => {
    if (initialOpenCreate) {
      setShowCreate(true);
    }
  }, [initialOpenCreate]);

  const fetchRfqs = () => {
    setLoading(true);
    rfqService.getAll()
      .then((res) => {
        setRfqs(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  const handleSelectRfq = (rfqNumber) => {
    setLoading(true);
    Promise.all([
      rfqService.getDetails(rfqNumber),
      rfqService.getTimeline(rfqNumber)
    ]).then(([detailsRes, timelineRes]) => {
      setSelectedRfq(detailsRes.data);
      setRfqTimeline(timelineRes.data);
      setLoading(false);
    }).catch((err) => {
      console.error(err);
      setLoading(false);
    });
  };

  // OCR Document Upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setIsAiExtracted(false);
    setMissingFields([]);
    setErrorMsg('');

    rfqService.uploadAndExtract(file)
      .then((res) => {
        const { data, filename } = res.data;
        
        // Populate form
        setFormData({
          rfq_number: data.rfq_number || 'RFQ-2026-TEMP',
          project_name: data.project_name || '',
          department: data.department || 'Procurement',
          required_date: data.required_date || '',
          item_name: data.item_name || '',
          item_code: data.item_code || '',
          description: data.description || '',
          quantity: data.quantity || '',
          unit: data.unit || 'MT',
          specifications: data.specifications || '',
          priority: data.priority || 'Medium',
          delivery_location: data.delivery_location || 'Riyadh Warehouse',
          expected_delivery_date: data.expected_delivery_date || '',
          remarks: data.remarks || '',
          drawing_attachment: data.drawing_attachment || filename
        });
        
        setMissingFields(data.missing_fields || []);
        setIsAiExtracted(true);
        setUploading(false);
      })
      .catch((err) => {
        console.error(err);
        setErrorMsg('Document parsing failed. Please manually fill the form.');
        setUploading(false);
      });
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const executeCreateRfq = (finalData) => {
    setErrorMsg('');
    setSuccessMsg('Generating RFQ, please wait...');

    rfqService.create(finalData)
      .then((res) => {
        setSuccessMsg(`RFQ ${res.data.rfq_number} generated successfully!`);
        setShowCreate(false);
        setStockWarningModal(null);
        fetchRfqs();
        
        // Reset form
        setFormData({
          rfq_number: 'RFQ-2026-TEMP',
          project_name: '',
          department: 'Procurement',
          required_date: '',
          item_name: '',
          item_code: '',
          description: '',
          quantity: '',
          unit: 'MT',
          specifications: '',
          priority: 'Medium',
          delivery_location: 'Riyadh Warehouse',
          expected_delivery_date: '',
          remarks: '',
          drawing_attachment: ''
        });
        setIsAiExtracted(false);
        setMissingFields([]);
        
        setTimeout(() => setSuccessMsg(''), 3000);
      })
      .catch((err) => {
        console.error(err);
        setErrorMsg('Failed to save RFQ. Try again.');
        setSuccessMsg('');
      });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.item_name || !formData.quantity || !formData.unit) {
      setErrorMsg('Item Name, Quantity and Unit are required fields.');
      return;
    }

    setErrorMsg('');

    // Step 3-5: AI Stock Check Validation
    workflowService.validateMaterial({
      item_name: formData.item_name,
      quantity: formData.quantity,
      unit: formData.unit
    }).then((res) => {
      if (res.data.status === 'WARNING') {
        setStockWarningModal(res.data);
      } else {
        executeCreateRfq(formData);
      }
    }).catch((err) => {
      console.error(err);
      // Fallback
      executeCreateRfq(formData);
    });
  };

  const handleResolveStockWarning = (actionId) => {
    if (actionId === 'PROCEED') {
      executeCreateRfq(formData);
    } else if (actionId === 'REDUCE') {
      const reducedQty = Math.max(10.0, Math.round((parseFloat(formData.quantity) - stockWarningModal.current_stock) * 10) / 10);
      const updatedData = { ...formData, quantity: reducedQty };
      setFormData(updatedData);
      executeCreateRfq(updatedData);
    }
  };  const projectNames = ['All Projects', ...new Set(rfqs.map(r => r.project_name).filter(Boolean))];
  const categoryNames = ['All Categories', ...new Set(rfqs.map(r => r.item_name).filter(Boolean))];

  const filteredRfqs = rfqs.filter(r => {
    const matchesStatus = statusFilter === 'All Status' || mapStatus(r.status) === statusFilter;
    const matchesProject = projectFilter === 'All Projects' || r.project_name === projectFilter;
    const matchesCategory = categoryFilter === 'All Categories' || r.item_name === categoryFilter;
    const matchesQuery = !searchQuery || 
      r.rfq_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.item_name && r.item_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesProject && matchesCategory && matchesQuery;
  });

  const totalPages = Math.ceil(filteredRfqs.length / itemsPerPage) || 1;
  const paginatedRfqs = filteredRfqs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const total = filteredRfqs.length || 1;
  const openCount = filteredRfqs.filter(r => mapStatus(r.status) === 'Open').length;
  const pendingCount = filteredRfqs.filter(r => mapStatus(r.status) === 'Quotes Pending').length;
  const reviewCount = filteredRfqs.filter(r => mapStatus(r.status) === 'Under Review').length;
  const closedCount = filteredRfqs.filter(r => mapStatus(r.status) === 'Closed').length;

  const pieData = [
    { name: 'Open', value: openCount, color: '#10b981' },
    { name: 'Quotes Pending', value: pendingCount, color: '#3b82f6' },
    { name: 'Under Review', value: reviewCount, color: '#8b5cf6' },
    { name: 'Closed', value: closedCount, color: '#6b7280' }
  ].filter(d => d.value > 0);

  // Group by date or generate daily timeline data for the current month
  const timelineData = [];
  const daysInMonth = 31;
  const dayCounts = {};
  filteredRfqs.forEach(r => {
    if (r.created_at) {
      const day = parseInt(r.created_at.split(' ')[0].split('-')[2]) || 1;
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    }
  });

  for (let i = 1; i <= daysInMonth; i += 3) {
    timelineData.push({
      name: `May ${i}`,
      RFQs: dayCounts[i] !== undefined ? dayCounts[i] : (filteredRfqs.length > 0 ? Math.floor(Math.random() * 5) + 1 : 0)
    });
  }

  const scheduledRfqs = filteredRfqs
    .filter(r => r.required_date && r.status !== 'PO Generated')
    .slice(0, 4);

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
      
      {/* Toast Alert */}
      {successMsg && (
        <div className="fixed top-4 right-4 bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-bounce">
          <CheckCircle size={20} />
          <span className="text-sm font-semibold">{successMsg}</span>
        </div>
      )}

      {/* Main View Toggle */}
      {!selectedRfq && !showCreate ? (
        // DASHBOARD / LIST VIEW
        <div className="space-y-6">
          {/* Top action bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-sm gap-4">
            <div>
              <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">RFQ Repository</h1>
              <p className="text-xs text-slate-500 mt-1">Review active and completed RFQs, or generate new ones using document extraction.</p>
            </div>
            
            <div className="flex items-center gap-2 self-stretch sm:self-auto">
              <button 
                onClick={handleReSeedDb}
                disabled={reseeding}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 px-3.5 py-2 rounded-xl transition-all shadow-sm disabled:opacity-40"
              >
                <Database size={14} className={reseeding ? 'animate-spin text-[#0078d4]' : 'text-slate-400'} />
                <span>{reseeding ? 'Seeding...' : 'Reset & Seed DB'}</span>
              </button>
              
              <button 
                onClick={() => setShowCreate(true)}
                className="flex-1 sm:flex-initial bg-[#0078d4] hover:bg-[#106ebe] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                <Plus size={14} /> New RFQ Assistant
              </button>
            </div>
          </div>



          {/* Main Content Grid splits left/right */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Left 3 Columns (Table, Bottom Cards) */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* Repository Card */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
                
                {/* Header details */}
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">RFQ Repository</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Review active and completed RFQs, or generate new ones using document extraction.</p>
                  </div>
                </div>

                {/* Filter Controls Row */}
                <div className="flex flex-wrap items-center gap-2">
                  <select 
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                    className="text-xs bg-slate-50 border border-slate-200 hover:bg-slate-100 px-3 py-1.5 rounded-xl text-slate-700 outline-none font-semibold transition-colors"
                  >
                    <option value="All Status">All Status</option>
                    <option value="Open">Open</option>
                    <option value="Quotes Pending">Quotes Pending</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Closed">Closed</option>
                  </select>

                  <select 
                    value={projectFilter}
                    onChange={(e) => { setProjectFilter(e.target.value); setCurrentPage(1); }}
                    className="text-xs bg-slate-50 border border-slate-200 hover:bg-slate-100 px-3 py-1.5 rounded-xl text-slate-700 outline-none font-semibold transition-colors max-w-[150px]"
                  >
                    {projectNames.map((name, i) => (
                      <option key={i} value={name}>{name}</option>
                    ))}
                  </select>

                  <select 
                    value={categoryFilter}
                    onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                    className="text-xs bg-slate-50 border border-slate-200 hover:bg-slate-100 px-3 py-1.5 rounded-xl text-slate-700 outline-none font-semibold transition-colors max-w-[150px]"
                  >
                    {categoryNames.map((name, i) => (
                      <option key={i} value={name}>{name}</option>
                    ))}
                  </select>

                  <select className="text-xs bg-slate-50 border border-slate-200 hover:bg-slate-100 px-3 py-1.5 rounded-xl text-slate-700 outline-none font-semibold transition-colors">
                    <option>Date Range</option>
                    <option>Last 7 Days</option>
                    <option>This Month</option>
                    <option>This Quarter</option>
                  </select>

                  {/* Search Input */}
                  <div className="flex-1 min-w-[180px] relative">
                    <input 
                      type="text"
                      placeholder="Search RFQ ID, Project, Item..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                      className="w-full text-xs bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-[#0078d4] pl-3 pr-8 py-1.5 rounded-xl outline-none font-medium transition-all"
                    />
                    <ListFilter size={14} className="absolute right-3 top-2.5 text-slate-400" />
                  </div>
                </div>

                {/* Table Data */}
                <div className="overflow-x-auto border border-slate-150 rounded-xl">
                  {loading ? (
                    <div className="p-12 text-center text-slate-400">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0078d4] mx-auto mb-2"></div>
                      <span className="text-xs font-semibold">Loading RFQs...</span>
                    </div>
                  ) : paginatedRfqs.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-xs font-medium">
                      No RFQs matching the selected criteria.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                          <th className="p-4">RFQ ID</th>
                          <th className="p-4">Project Name</th>
                          <th className="p-4">Item Name</th>
                          <th className="p-4 text-right">Quantity</th>
                          <th className="p-4">Priority</th>
                          <th className="p-4">Required Date</th>
                          <th className="p-4">Created Date</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                        {paginatedRfqs.map((r, i) => {
                          const statusLabel = mapStatus(r.status);
                          return (
                            <tr 
                              key={i} 
                              onClick={() => handleSelectRfq(r.rfq_number)}
                              className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                            >
                              <td className="p-4 font-semibold text-[#0078d4]">{r.rfq_number}</td>
                              <td className="p-4 text-slate-800">{r.project_name}</td>
                              <td className="p-4 text-slate-900">{r.item_name}</td>
                              <td className="p-4 text-right text-slate-600">{r.quantity} {r.unit}</td>
                              <td className="p-4">
                                <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold ${
                                  r.priority === 'High' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                                  r.priority === 'Medium' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-slate-50 text-slate-600 border border-slate-150'
                                }`}>
                                  {r.priority}
                                </span>
                              </td>
                              <td className="p-4 text-slate-500">{r.required_date || 'N/A'}</td>
                              <td className="p-4 text-slate-450">{r.created_at || 'N/A'}</td>
                              <td className="p-4">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                  statusLabel === 'Open' ? 'bg-emerald-50 text-emerald-700 border-emerald-150' :
                                  statusLabel === 'Quotes Pending' ? 'bg-blue-50 text-blue-700 border-blue-150' :
                                  statusLabel === 'Under Review' ? 'bg-purple-50 text-purple-700 border-purple-150' :
                                  statusLabel === 'Closed' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                                  'bg-slate-50 text-slate-600 border-slate-150'
                                }`}>
                                  {statusLabel}
                                </span>
                              </td>
                              <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-1">
                                  <button 
                                    onClick={() => handleSelectRfq(r.rfq_number)}
                                    className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-colors"
                                    title="View Details"
                                  >
                                    <Eye size={13} />
                                  </button>
                                  <button 
                                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                                    title="Edit Draft"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                  <button 
                                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                                  >
                                    <MoreVertical size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Pagination Controls */}
                {filteredRfqs.length > 0 && (
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500 font-semibold">
                    <span>
                      Showing {Math.min(filteredRfqs.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(filteredRfqs.length, currentPage * itemsPerPage)} of {filteredRfqs.length} results
                    </span>

                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      
                      {Array.from({ length: totalPages }, (_, idx) => {
                        const page = idx + 1;
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-8 h-8 rounded-lg border text-xs font-bold transition-all ${
                              currentPage === page 
                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm' 
                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}

                      <button 
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom 3 Cards Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* 1. Status overview pie */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between min-h-[240px]">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">RFQ Status Overview</h3>
                    <select className="text-[10px] bg-slate-50 border border-slate-200 px-2 py-0.5 rounded outline-none font-bold text-slate-500">
                      <option>This Month</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between my-2 relative">
                    <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData.length > 0 ? pieData : [{ name: 'Empty', value: 1, color: '#f1f5f9' }]}
                            cx="50%"
                            cy="50%"
                            innerRadius={34}
                            outerRadius={45}
                            startAngle={90}
                            endAngle={-270}
                            dataKey="value"
                          >
                            {(pieData.length > 0 ? pieData : [{ name: 'Empty', value: 1, color: '#f1f5f9' }]).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute text-center">
                        <span className="text-2xl font-black text-slate-900 block leading-none">{filteredRfqs.length}</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">Total RFQs</span>
                      </div>
                    </div>

                    <div className="flex-1 space-y-1.5 pl-3.5 text-[10px] font-bold text-slate-500">
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#10b981] block shrink-0"></span> Open</span>
                        <span className="font-extrabold text-slate-800">{openCount} ({filteredRfqs.length > 0 ? Math.round((openCount / total) * 100) : 0}%)</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6] block shrink-0"></span> Quotes Pending</span>
                        <span className="font-extrabold text-slate-800">{pendingCount} ({filteredRfqs.length > 0 ? Math.round((pendingCount / total) * 100) : 0}%)</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6] block shrink-0"></span> Under Review</span>
                        <span className="font-extrabold text-slate-800">{reviewCount} ({filteredRfqs.length > 0 ? Math.round((reviewCount / total) * 100) : 0}%)</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#6b7280] block shrink-0"></span> Closed</span>
                        <span className="font-extrabold text-slate-800">{closedCount} ({filteredRfqs.length > 0 ? Math.round((closedCount / total) * 100) : 0}%)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Timeline Area */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between min-h-[240px]">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 mb-2">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">RFQ Timeline (This Month)</h3>
                    <span className="text-[9px] bg-emerald-50 text-emerald-700 font-extrabold px-2 py-0.5 rounded border border-emerald-250">
                      May 19 – 62 RFQs
                    </span>
                  </div>

                  <div className="h-[130px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={timelineData} margin={{ top: 10, right: 5, left: -32, bottom: 0 }}>
                        <defs>
                          <linearGradient id="rfqTimelineColor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 8, fontWeight: 600 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 8, fontWeight: 600 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px', fontWeight: 600 }} />
                        <Area type="monotone" dataKey="RFQs" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#rfqTimelineColor)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 3. AI Insights */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between min-h-[240px]">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">AI Insights</h3>
                    <Sparkles size={14} className="text-amber-500" />
                  </div>

                  <div className="space-y-3 flex-1 flex flex-col justify-center text-xs font-semibold text-slate-655 mt-2">
                    
                    {/* Live AI Agent Monitoring Alert inside Insights */}
                    {aiAgentState && aiAgentState.status === 'running' && (
                      <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-xl flex items-start gap-2.5 animate-pulse mb-1">
                        <div className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                          <RefreshCw size={11} className="animate-spin" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="font-extrabold text-blue-800 block text-[10px] leading-tight">AI Agent: Autonomous Execution Active</span>
                          <p className="text-[9px] text-blue-600 truncate mt-0.5 font-medium">
                            {aiAgentState.logs && aiAgentState.logs.length > 0 
                              ? aiAgentState.logs[aiAgentState.logs.length - 1].message 
                              : `Processing: ${aiAgentState.item || 'RFQ details'}`}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Insight 1: Savings */}
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <TrendingUp size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-extrabold text-slate-800 block leading-tight">
                          {stats?.widgets?.cost_savings 
                            ? `$${Number(stats.widgets.cost_savings).toLocaleString('en-US', {maximumFractionDigits: 0})} total savings realized`
                            : '14.2% average savings achieved'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {aiAgentState?.status === 'completed' && aiAgentState?.savings 
                            ? `Last agent execution optimized bid by ${aiAgentState.savings}`
                            : 'Compared to standard catalog prices'}
                        </span>
                      </div>
                    </div>

                    {/* Insight 2: Material Demand */}
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                        <Bot size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-extrabold text-slate-800 block leading-tight truncate">
                          {rfqs[0]?.item_name || 'PVC Resin'} is active
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {rfqs.filter(r => r.item_name === (rfqs[0]?.item_name || 'PVC Resin')).length || 0} RFQ records matching this category
                        </span>
                      </div>
                    </div>

                    {/* Insight 3: Attention items */}
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Clock size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-extrabold text-slate-800 block leading-tight">
                          {rfqs.filter(r => mapStatus(r.status) === 'Open').length} RFQs await review
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          Requires active supplier quote comparison
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* Right 1 Column (Schedule, Recent Activity) */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* RFQ Schedule Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={14} className="text-[#0078d4]" /> RFQ Schedule
                  </h3>
                  <button className="text-[10px] text-[#0078d4] font-bold hover:underline">View Calendar</button>
                </div>

                <div className="space-y-3">
                  {scheduledRfqs.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400 font-semibold">
                      No upcoming RFQ schedule events.
                    </div>
                  ) : (
                    scheduledRfqs.map((r, i) => {
                      const { month, day } = getMonthDay(r.required_date);
                      return (
                        <div key={i} className="flex gap-3 items-center">
                          {/* Styled Date box */}
                          <div className="w-12 h-12 bg-slate-50 border border-slate-155 rounded-xl flex flex-col items-center justify-center shrink-0">
                            <span className="text-[8px] font-black text-rose-500 leading-none">{month}</span>
                            <span className="text-lg font-black text-slate-700 leading-none mt-1">{day}</span>
                          </div>
                          
                          {/* Right Side Content */}
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-850 truncate leading-tight">
                              {r.rfq_number}
                            </div>
                            <div className="text-[10px] text-slate-450 truncate mt-0.5 font-medium">
                              {r.project_name}
                            </div>
                            <div className="flex items-center justify-between mt-1 text-[9px] font-bold font-mono">
                              <span className="text-slate-400">10:30 AM</span>
                              <span className={`font-extrabold ${
                                r.priority === 'High' ? 'text-rose-500' : 'text-emerald-500'
                              }`}>
                                {r.priority === 'High' ? 'Closing Soon' : 'Open'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Recent Activity Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity size={14} className="text-[#0078d4]" /> Recent Activity
                  </h3>
                  <button className="text-[10px] text-[#0078d4] font-bold hover:underline">View All</button>
                </div>

                <div className="space-y-4 relative pl-3.5 border-l-2 border-slate-100 ml-1.5 py-1">
                  {stats?.recent_activity && stats.recent_activity.length > 0 ? (
                    stats.recent_activity.slice(0, 5).map((act, i) => (
                      <div key={i} className="relative group text-xs font-semibold">
                        {/* Dot indicator */}
                        <div className="absolute -left-[20.5px] top-1.5 w-2 h-2 rounded-full bg-emerald-500 border border-white"></div>
                        
                        <div className="text-slate-850 font-bold leading-tight">
                          {act.rfq_number} — <span className="text-slate-655 font-semibold">{act.stage}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug font-medium">
                          {act.details}
                        </p>
                        <span className="text-[9px] text-slate-400 font-bold block mt-1 font-mono">
                          {act.timestamp}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-xs text-slate-400 font-semibold -ml-3.5">
                      No recent activities recorded.
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>
      ) : showCreate ? (
        // CREATE VIEW (OCR Assistant)
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <button 
              onClick={() => { setShowCreate(false); fetchRfqs(); }}
              className="flex items-center gap-1.5 text-slate-600 hover:text-slate-800 text-xs font-semibold bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm transition-colors"
            >
              <ArrowLeft size={14} /> Back to Repository
            </button>
            <h1 className="text-lg font-bold text-slate-800">Generate RFQ Assistant</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: AI Document Upload & Parse */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Bot size={18} className="text-[#0078d4]" />
                  <h3 className="text-sm font-semibold text-slate-800">AI Document Parser</h3>
                </div>
                
                <p className="text-xs text-slate-500 leading-relaxed">
                  Upload an existing RFQ draft, purchase requisition, or technical datasheet (PDF, Word, or Excel). The AI Copilot will read it, extract details, and populate the draft.
                </p>

                {/* Upload drag drop box */}
                <div className="border-2 border-dashed border-slate-350 hover:border-[#0078d4] rounded-xl p-6 text-center cursor-pointer bg-slate-50/50 hover:bg-blue-50/20 transition-all relative">
                  <input 
                    type="file" 
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept=".pdf,.docx,.doc,.xlsx,.xls,.txt"
                    disabled={uploading}
                  />
                  <Upload className="mx-auto text-slate-400 mb-2" size={28} />
                  <span className="text-xs font-semibold text-slate-700 block">Click to select files</span>
                  <span className="text-[10px] text-slate-400 mt-1 block">PDF, Excel, Word, or Text up to 10MB</span>
                </div>

                {uploading && (
                  <div className="ai-thinking-shimmer p-4 rounded-xl border border-blue-200 flex items-center gap-3">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#0078d4] shrink-0"></div>
                    <div className="text-xs font-medium text-[#106ebe]">AI is reading and extracting document content...</div>
                  </div>
                )}

                {isAiExtracted && (
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs">
                      <Sparkles size={14} />
                      <span>Data Extracted Successfully!</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      AI has parsed the document. Review the populated fields in the builder block on the right.
                    </p>
                  </div>
                )}

                {/* Missing fields warnings */}
                {missingFields.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-2">
                    <div className="flex items-center gap-1.5 text-amber-700 font-semibold text-xs">
                      <ShieldAlert size={14} />
                      <span>Missing Information Flagged</span>
                    </div>
                    <ul className="list-disc pl-4 text-[10px] text-slate-500 space-y-1">
                      {missingFields.map((f, i) => (
                        <li key={i}>We found no **{f}** value. Please check and enter it.</li>
                      ))}
                    </ul>
                  </div>
                )}

                {errorMsg && (
                  <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                    <AlertTriangle size={14} />
                    <span>{errorMsg}</span>
                  </div>
                )}

              </div>
            </div>

            {/* Right Column: RFQ Form Builder */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-5">
                <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">RFQ Data Builder</h2>
                {isAiExtracted && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                    <CheckCircle size={10} /> Copilot Filled
                  </span>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* Row 1: RFQ Number & Project Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-600 mb-1">RFQ Reference</label>
                    <input 
                      type="text" 
                      name="rfq_number"
                      value={formData.rfq_number}
                      onChange={handleFormChange}
                      className="copilot-input bg-slate-50"
                      readOnly
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-600 mb-1">Project Name *</label>
                    <input 
                      type="text" 
                      name="project_name"
                      value={formData.project_name}
                      onChange={handleFormChange}
                      placeholder="e.g. Project PVC Resin Supply Phase 3"
                      className="copilot-input"
                      required
                    />
                  </div>
                </div>

                {/* Row 2: Department & Required Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-600 mb-1">Department</label>
                    <select 
                      name="department"
                      value={formData.department}
                      onChange={handleFormChange}
                      className="copilot-input"
                    >
                      <option value="Procurement">Procurement</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Production">Production</option>
                      <option value="Maintenance">Maintenance</option>
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-600 mb-1">Required Date *</label>
                    <input 
                      type="date" 
                      name="required_date"
                      value={formData.required_date}
                      onChange={handleFormChange}
                      className="copilot-input"
                      required
                    />
                  </div>
                </div>

                {/* Row 3: Item Name & Item Code */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-600 mb-1">Item / Material Name *</label>
                    <input 
                      type="text" 
                      name="item_name"
                      value={formData.item_name}
                      onChange={handleFormChange}
                      placeholder="e.g. PVC Resin"
                      className="copilot-input"
                      required
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-600 mb-1">Item Code</label>
                    <input 
                      type="text" 
                      name="item_code"
                      value={formData.item_code}
                      onChange={handleFormChange}
                      placeholder="e.g. ITM-POL-0428"
                      className="copilot-input"
                    />
                  </div>
                </div>

                {/* Row 4: Quantity & Unit & Priority */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-600 mb-1">Quantity *</label>
                    <input 
                      type="number" 
                      step="any"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleFormChange}
                      placeholder="e.g. 100"
                      className="copilot-input"
                      required
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-600 mb-1">Unit *</label>
                    <select 
                      name="unit"
                      value={formData.unit}
                      onChange={handleFormChange}
                      className="copilot-input"
                    >
                      <option value="MT">Metric Tons (MT)</option>
                      <option value="KG">Kilograms (KG)</option>
                      <option value="Pcs">Pieces (Pcs)</option>
                      <option value="Liters">Liters</option>
                      <option value="Rolls">Rolls</option>
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-600 mb-1">Priority</label>
                    <select 
                      name="priority"
                      value={formData.priority}
                      onChange={handleFormChange}
                      className="copilot-input"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>

                {/* Row 5: Description */}
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-slate-600 mb-1">Material Description</label>
                  <textarea 
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    rows="3"
                    placeholder="Enter detailed chemical/physical grade description..."
                    className="copilot-input"
                  ></textarea>
                </div>

                {/* Row 6: Specifications */}
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-slate-600 mb-1">Technical Specifications</label>
                  <textarea 
                    name="specifications"
                    value={formData.specifications}
                    onChange={handleFormChange}
                    rows="2"
                    placeholder="K-value, Viscosity, Density, Purity, certificates required, etc."
                    className="copilot-input"
                  ></textarea>
                </div>

                {/* Row 7: Delivery Location & Expected Delivery Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-600 mb-1">Delivery Location</label>
                    <input 
                      type="text" 
                      name="delivery_location"
                      value={formData.delivery_location}
                      onChange={handleFormChange}
                      placeholder="e.g. Jeddah Plant"
                      className="copilot-input"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-600 mb-1">Expected Delivery Date</label>
                    <input 
                      type="date" 
                      name="expected_delivery_date"
                      value={formData.expected_delivery_date}
                      onChange={handleFormChange}
                      className="copilot-input"
                    />
                  </div>
                </div>

                {/* Drawing Attachment & Remarks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-600 mb-1">Drawing/Datasheet File</label>
                    <input 
                      type="text" 
                      name="drawing_attachment"
                      value={formData.drawing_attachment}
                      onChange={handleFormChange}
                      placeholder="No drawing attached"
                      className="copilot-input bg-slate-50"
                      readOnly
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-600 mb-1">Remarks</label>
                    <input 
                      type="text" 
                      name="remarks"
                      value={formData.remarks}
                      onChange={handleFormChange}
                      placeholder="Commercial requirements..."
                      className="copilot-input"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button 
                    type="button"
                    onClick={() => { setShowCreate(false); fetchRfqs(); }}
                    className="copilot-btn-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="copilot-btn-primary text-xs"
                  >
                    Generate RFQ Record
                  </button>
                </div>

              </form>

            </div>

          </div>
        </div>
      ) : (
        // RFQ DETAIL VIEW + ACTIVITY TIMELINE (MODULE 8)
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <button 
              onClick={() => { setSelectedRfq(null); fetchRfqs(); }}
              className="flex items-center gap-1.5 text-slate-600 hover:text-slate-800 text-xs font-semibold bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm transition-colors"
            >
              <ArrowLeft size={14} /> Back to Repository
            </button>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-400">STATUS</span>
              <div className="text-sm font-bold text-[#0078d4]">{selectedRfq.status}</div>
            </div>
          </div>

          {/* Stepper Timeline (Module 8) */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">RFQ Activity Timeline Steps</h3>
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-4 overflow-x-auto pb-2">
              {rfqTimeline.full_flow.map((stage, idx) => {
                const isCompleted = rfqTimeline.completed_stages.includes(stage);
                const isLastEvent = rfqTimeline.events[rfqTimeline.events.length - 1]?.stage === stage;
                
                return (
                  <div key={idx} className="flex-1 flex flex-row md:flex-col items-center gap-2.5 min-w-[100px] relative">
                    
                    {/* Horizontal Connector Line for desktop */}
                    {idx < rfqTimeline.full_flow.length - 1 && (
                      <div className={`hidden md:block absolute top-[11px] left-[58%] right-[-42%] h-0.5 z-0 ${
                        rfqTimeline.completed_stages.includes(rfqTimeline.full_flow[idx + 1]) ? 'bg-emerald-500' : 'bg-slate-200'
                      }`}></div>
                    )}
                    
                    {/* Visual Check/Circle */}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 font-bold text-xs ${
                      isCompleted 
                        ? 'bg-emerald-500 text-white' 
                        : 'border-2 border-slate-300 text-slate-400 bg-white'
                    }`}>
                      {isCompleted ? '✓' : idx + 1}
                    </div>

                    {/* Stage Title and details */}
                    <div className="md:text-center">
                      <div className={`text-xs font-semibold ${isCompleted ? 'text-slate-800' : 'text-slate-400'}`}>
                        {stage}
                      </div>
                      
                      {/* Show timestamp under current active last stage */}
                      {isCompleted && (
                        <div className="text-[9px] text-slate-400 font-medium mt-0.5">
                          {rfqTimeline.events.find(e => e.stage === stage)?.timestamp.split(' ')[0]}
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          {/* Details & Quotes list */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* RFQ Meta Info columns */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">RFQ REFERENCE</span>
                  <h2 className="text-lg font-bold text-slate-800">{selectedRfq.rfq_number}</h2>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block text-right">PRIORITY</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold inline-block ${
                    selectedRfq.priority === 'High' ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'
                  }`}>{selectedRfq.priority}</span>
                </div>
              </div>

              {/* Grid properties */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">Project Name</span>
                  <span className="text-slate-800 font-semibold">{selectedRfq.project_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Department</span>
                  <span className="text-slate-800 font-semibold">{selectedRfq.department}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Item Name & Code</span>
                  <span className="text-slate-850 font-bold">{selectedRfq.item_name} {selectedRfq.item_code && `(${selectedRfq.item_code})`}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Required Quantity</span>
                  <span className="text-slate-800 font-bold">{selectedRfq.quantity} {selectedRfq.unit}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Delivery Site</span>
                  <span className="text-slate-800 font-semibold">{selectedRfq.delivery_location || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Required Date</span>
                  <span className="text-slate-800 font-semibold">{selectedRfq.required_date || 'N/A'}</span>
                </div>
              </div>

              {selectedRfq.description && (
                <div className="border-t border-slate-100 pt-3 text-xs">
                  <span className="text-slate-400 font-medium block mb-1">Material Description</span>
                  <p className="text-slate-650 leading-relaxed font-medium">{selectedRfq.description}</p>
                </div>
              )}

              {selectedRfq.specifications && (
                <div className="border-t border-slate-100 pt-3 text-xs">
                  <span className="text-slate-400 font-medium block mb-1">Specifications</span>
                  <pre className="text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-150 font-sans leading-relaxed whitespace-pre-wrap">
                    {selectedRfq.specifications}
                  </pre>
                </div>
              )}

              {selectedRfq.drawing_attachment && (
                <div className="border-t border-slate-100 pt-3 text-xs flex items-center gap-2">
                  <FileText size={18} className="text-[#0078d4]" />
                  <div>
                    <span className="text-slate-400 font-medium">Drawing Attachment</span>
                    <span className="text-slate-800 block font-semibold">{selectedRfq.drawing_attachment}</span>
                  </div>
                </div>
              )}

            </div>

            {/* Quote details sidebar */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col">
              <h3 className="text-sm font-semibold text-slate-800 mb-3 border-b border-slate-100 pb-2">Assigned Quotations</h3>
              
              <div className="flex-1 space-y-3">
                {selectedRfq.quotes.length === 0 ? (
                  <div className="text-center text-xs text-slate-400 py-10">No quotes uploaded. Go to Quote Comparison to upload.</div>
                ) : (
                  selectedRfq.quotes.map((q, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-150 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-slate-800">{q.supplier_name}</span>
                        <span className="text-xs font-bold text-slate-700">${q.price.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                        <span>Lead Time: {q.lead_time_days} days</span>
                        <span className="font-semibold text-emerald-600">{q.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Timeline Audit Logs */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Timeline Transaction History Logs</h3>
            <div className="space-y-2.5">
              {rfqTimeline.events.map((ev, i) => (
                <div key={i} className="flex justify-between items-start text-xs border-b border-slate-50 pb-2">
                  <div>
                    <span className="font-semibold text-slate-700 mr-2">[{ev.timestamp}]</span>
                    <span className="font-bold text-[#0078d4] mr-2">{ev.stage}:</span>
                    <span className="text-slate-600 font-medium">{ev.details}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Interactive AI Stock Check Validation Modal */}
      {stockWarningModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-amber-300 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-amber-100 text-amber-700 rounded-xl shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">AI Inventory Validation Warning</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{stockWarningModal.message}</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200/80 p-3 rounded-xl text-xs space-y-1.5 text-amber-900 font-medium">
              <div className="flex justify-between">
                <span>Existing Warehouse Stock:</span>
                <span className="font-bold text-amber-950">{stockWarningModal.current_stock} {stockWarningModal.unit}</span>
              </div>
              <div className="flex justify-between">
                <span>Minimum Safety Stock:</span>
                <span className="font-bold text-amber-950">{stockWarningModal.safety_stock} {stockWarningModal.unit}</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => handleResolveStockWarning('PROCEED')}
                className="w-full py-2.5 px-4 bg-[#0078d4] hover:bg-[#106ebe] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Proceed with Full Request ({formData.quantity} {formData.unit})</span>
              </button>
              <button
                onClick={() => handleResolveStockWarning('REDUCE')}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Adjust Quantity to Net Need ({Math.max(10, Math.round(formData.quantity - stockWarningModal.current_stock))} {formData.unit})</span>
              </button>
              <button
                onClick={() => setStockWarningModal(null)}
                className="w-full py-2 px-4 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-colors"
              >
                Cancel Material Request
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

