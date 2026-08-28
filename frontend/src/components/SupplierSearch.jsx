import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, Star, Mail, Phone, MapPin, Clock, Sparkles, Send, Plus, Bot,
  RefreshCw, Zap, Building2, Users, Tag, Globe, ChevronDown, ChevronUp, 
  Pencil, CheckCircle2, Download, Upload, Eye, FileSpreadsheet, X, HelpCircle,
  AlertCircle, ShieldCheck, ChevronRight, Loader2
} from 'lucide-react';
import { supplierService, emailService, rfqService } from '../services/api';
import SupplierProfileModal from './SupplierProfileModal';

export default function SupplierSearch({ onSendRfqRedirect, initialQuery, clearInitialQuery }) {
  const [query, setQuery] = useState(initialQuery || '');
  const [sources, setSources] = useState({
    internal: true,
    demo: true,
    google: false,
    alibaba: false
  });
  const [aiSearchEnabled, setAiSearchEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'oppora'

  // Standard search
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // ── Multi-select & RFQ Review/Approve/Send ──
  const [selectedSuppliers, setSelectedSuppliers] = useState([]); // list of supplier objects
  const [showRfqReviewModal, setShowRfqReviewModal] = useState(false);
  const [rfqReviewStep, setRfqReviewStep] = useState('review'); // 'review' | 'sending' | 'done'
  const [reviewEmailIdx, setReviewEmailIdx] = useState(0); // which supplier email is being previewed
  const [generatingDrafts, setGeneratingDrafts] = useState(false);
  const [emailDrafts, setEmailDrafts] = useState([]); // [{supplier, subject, body}]
  const [sendProgress, setSendProgress] = useState([]);  // [{name, status}]

  const activeRfqNum = localStorage.getItem('activeRfqNum') || 'RFQ-WWT-2026-0847';

  const toggleSupplierSelect = (supplier) => {
    setSelectedSuppliers(prev => {
      const exists = prev.find(s => s.id === supplier.id || s.name === supplier.name);
      if (exists) return prev.filter(s => (s.id || s.name) !== (supplier.id || supplier.name));
      if (prev.length >= 10) return prev; // cap at 10
      return [...prev, supplier];
    });
  };

  const isSupplierSelected = (supplier) =>
    selectedSuppliers.some(s => (s.id && s.id === supplier.id) || s.name === supplier.name);

  const openRfqReview = async () => {
    if (selectedSuppliers.length === 0) return;
    setShowRfqReviewModal(true);
    setRfqReviewStep('review');
    setReviewEmailIdx(0);
    setGeneratingDrafts(true);
    setEmailDrafts([]);
    setSendProgress([]);

    // Generate draft emails for each supplier
    const drafts = [];
    for (const sup of selectedSuppliers) {
      try {
        if (sup.id) {
          const res = await emailService.generateDraft(activeRfqNum, sup.id);
          drafts.push({
            supplier: sup,
            subject: res.data.subject || `RFQ ${activeRfqNum} – ${query || 'Material Requirement'}`,
            body: res.data.body || buildFallbackEmail(sup, activeRfqNum, query)
          });
        } else {
          drafts.push({
            supplier: sup,
            subject: `RFQ ${activeRfqNum} – ${query || 'Material Requirement'}`,
            body: buildFallbackEmail(sup, activeRfqNum, query)
          });
        }
      } catch {
        drafts.push({
          supplier: sup,
          subject: `RFQ ${activeRfqNum} – ${query || 'Material Requirement'}`,
          body: buildFallbackEmail(sup, activeRfqNum, query)
        });
      }
    }
    setEmailDrafts(drafts);
    setGeneratingDrafts(false);
  };

  const buildFallbackEmail = (sup, rfqNum, item) => {
    const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const deliveryDate = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    return `Dear ${sup.name} Procurement Team,

We are pleased to invite you to submit a quotation for the following requirement:

RFQ Reference : ${rfqNum}
Material / Item: ${item || 'As per attached specification'}
Required Quantity: As per RFQ document
Delivery Location: Dammam Industrial Zone, Saudi Arabia
Required Delivery Date: ${deliveryDate}
Quote Submission Deadline: ${deadline}

Please ensure your quotation includes:
  • Unit price and total landed cost (DDP Dammam)
  • Lead time in calendar days
  • Minimum Order Quantity (MOQ)
  • Payment terms
  • Incoterms
  • Warranty / quality guarantee
  • Quote validity period
  • Any technical deviations or exceptions

The RFQ specification document is attached to this email for your reference.

Kindly acknowledge receipt of this RFQ and confirm your intent to participate by return email.

Warm regards,
Petabytz Procurement Team
procurement@petabytz.com | +966 11 555 0100`;
  };

  const handleApproveSend = async () => {
    setRfqReviewStep('sending');
    const progress = emailDrafts.map(d => ({ name: d.supplier.name, status: 'pending' }));
    setSendProgress([...progress]);

    for (let i = 0; i < emailDrafts.length; i++) {
      const draft = emailDrafts[i];
      try {
        await emailService.sendEmail(
          activeRfqNum,
          draft.supplier.id || null,
          draft.subject,
          draft.body
        );
        setSendProgress(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'sent' } : p));
      } catch {
        setSendProgress(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'error' } : p));
      }
      await new Promise(r => setTimeout(r, 600));
    }
    setRfqReviewStep('done');
  };

  // Oppora ICP Discovery
  const [opporaItem, setOpporaItem] = useState('');
  const [opporaDesc, setOpporaDesc] = useState('');
  const [opporaLoading, setOpporaLoading] = useState(false);
  const [opporaResult, setOpporaResult] = useState(null); // { icp, contacts }
  const [icpEdit, setIcpEdit] = useState(null);           // editable ICP
  const [icpExpanded, setIcpExpanded] = useState(true);
  const [opporaError, setOpporaError] = useState('');
  
  // Bulk Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
  const [importing, setImporting] = useState(false);

  // Add Supplier Form
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    country: 'Saudi Arabia',
    email: '',
    phone: '',
    rating: 4.5,
    lead_time: 15,
    preferred: false,
    quality_score: 95.0,
    delivery_score: 92.0,
    price_competitiveness: 85.0,
    risk_level: 'Low',
    products: 'PVC Resin',
    categories: 'Raw Polymers',
    average_response_time_hours: 12.0
  });

  React.useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      setLoading(true);
      const activeSources = Object.keys(sources).filter(k => sources[k]).join(',');
      supplierService.search(initialQuery, activeSources, aiSearchEnabled)
        .then((res) => {
          setResults(res.data);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
      if (clearInitialQuery) {
        clearInitialQuery();
      }
    } else {
      // Trigger default search with empty query to show all suppliers!
      handleSearchInternal('');
    }
  }, [initialQuery]);

  const handleSearchInternal = (searchQuery) => {
    setLoading(true);
    const activeSources = Object.keys(sources).filter(k => sources[k]).join(',');
    
    supplierService.search(searchQuery, activeSources, aiSearchEnabled)
      .then((res) => {
        setResults(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    handleSearchInternal(query);
  };

  const handleSourceToggle = (source) => {
    setSources(prev => {
      const updated = { ...prev, [source]: !prev[source] };
      // Trigger search immediately for better UX
      setTimeout(() => {
        const activeSources = Object.keys(updated).filter(k => updated[k]).join(',');
        setLoading(true);
        supplierService.search(query, activeSources, aiSearchEnabled)
          .then((res) => {
            setResults(res.data);
            setLoading(false);
          })
          .catch((err) => {
            console.error(err);
            setLoading(false);
          });
      }, 0);
      return updated;
    });
  };

  const handleTogglePreferred = (supplier) => {
    const updatedPreferred = !supplier.preferred;
    if (supplier.source && (supplier.source.includes("Google") || supplier.source.includes("Alibaba") || supplier.source.includes("OpenAI"))) {
      // If external supplier, prompt to register them first
      const confirmAdd = window.confirm(`Supplier "${supplier.name}" is an external contact. Register them to internal database as Approved Supplier?`);
      if (confirmAdd) {
        const payload = {
          name: supplier.name,
          country: supplier.country,
          email: supplier.email,
          phone: supplier.phone || '',
          rating: supplier.rating || 4.0,
          lead_time: supplier.lead_time || 15,
          preferred: true,
          quality_score: supplier.quality_score || 90.0,
          delivery_score: supplier.delivery_score || 90.0,
          price_competitiveness: supplier.price_competitiveness || 85.0,
          risk_level: supplier.risk_level || 'Low',
          products: query,
          categories: 'Raw Materials',
          synced_to_erp: true
        };
        supplierService.add(payload)
          .then(() => {
            alert(`Supplier "${supplier.name}" successfully registered to ERP DB as Approved Supplier!`);
            handleSearch();
          })
          .catch(err => {
            console.error(err);
            alert("Failed to register supplier.");
          });
      }
    } else {
      // Update local db supplier preferred status
      supplierService.update(supplier.id, { preferred: updatedPreferred })
        .then(() => {
          setResults(prev => prev.map(s => s.id === supplier.id ? { ...s, preferred: updatedPreferred } : s));
        })
        .catch(err => {
          console.error(err);
          alert("Failed to update approved status.");
        });
    }
  };

  const handleRegisterSupplier = (supplier) => {
    const payload = {
      name: supplier.name,
      country: supplier.country,
      email: supplier.email,
      phone: supplier.phone || '',
      rating: supplier.rating || 4.0,
      lead_time: supplier.lead_time || 15,
      preferred: false,
      quality_score: supplier.quality_score || 90.0,
      delivery_score: supplier.delivery_score || 90.0,
      price_competitiveness: supplier.price_competitiveness || 85.0,
      risk_level: supplier.risk_level || 'Low',
      products: query,
      categories: 'Raw Materials',
      synced_to_erp: true
    };

    supplierService.add(payload)
      .then(() => {
        alert(`Supplier "${supplier.name}" successfully registered and synced to ERP!`);
        handleSearch();
      })
      .catch(err => {
        console.error(err);
        alert("Failed to register supplier.");
      });
  };

  const handleOpporaSearch = (useEditedIcp = false) => {
    if (!opporaItem.trim()) return;
    setOpporaLoading(true);
    setOpporaError('');
    const payload = {
      item_name: opporaItem,
      description: opporaDesc,
      icp_override: useEditedIcp ? icpEdit : null
    };
    supplierService.opporaSearch(payload)
      .then(res => {
        setOpporaResult(res.data);
        setIcpEdit(res.data.icp);
        setOpporaLoading(false);
      })
      .catch(err => {
        console.error(err);
        setOpporaError('Search failed. Check your connection or API key.');
        setOpporaLoading(false);
      });
  };

  const handleAddSupplierSubmit = (e) => {
    e.preventDefault();
    supplierService.add(newSupplier)
      .then((res) => {
        alert(`Supplier ${newSupplier.name} added successfully!`);
        setShowAddModal(false);
        handleSearch();
      })
      .catch((err) => {
        console.error(err);
        alert('Failed to add supplier.');
      });
  };

  // CSV parsing logic helper
  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) return [];
    
    // Read headers and normalize them
    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Handle commas inside quotes in CSV
      let currentVal = '';
      let inQuotes = false;
      const row = [];
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          row.push(currentVal.trim().replace(/^["']|["']$/g, ''));
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
      row.push(currentVal.trim().replace(/^["']|["']$/g, ''));

      const rowObj = {};
      headers.forEach((header, index) => {
        rowObj[header] = row[index] || '';
      });
      data.push(rowObj);
    }
    return data;
  };

  const handleCSVFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        alert("Failed to parse CSV. Make sure headers are present.");
        return;
      }
      setImportPreview(parsed);
      setShowImportModal(true);
      // Reset file input
      e.target.value = null;
    };
    reader.readAsText(file);
  };

  const executeImport = () => {
    setImporting(true);
    
    // Map import rows to format expected by backend
    const payload = importPreview.map(item => ({
      name: item.name || item.supplier_name || 'Unnamed Supplier',
      country: item.country || 'Saudi Arabia',
      email: item.email || item.sales_email || `sales@${(item.name || 'supplier').toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      phone: item.phone || item.telephone || '',
      rating: parseFloat(item.rating || 4.0),
      lead_time: parseInt(item.lead_time || item.lead_time_days || 15),
      preferred: ['true', '1', 'yes', 'preferred'].includes((item.preferred || '').toLowerCase()),
      quality_score: parseFloat(item.quality_score || 95.0),
      delivery_score: parseFloat(item.delivery_score || 90.0),
      price_competitiveness: parseFloat(item.price_competitiveness || 85.0),
      risk_level: item.risk_level || 'Low',
      products: item.products || item.items || 'PVC Resin',
      categories: item.categories || item.category || 'Polymers',
      average_response_time_hours: parseFloat(item.average_response_time_hours || item.response_time || 24.0),
      synced_to_erp: ['true', '1', 'yes', 'synced'].includes((item.synced_to_erp || 'true').toLowerCase())
    }));

    supplierService.importSuppliers(payload)
      .then(res => {
        alert(res.data.message || 'Suppliers successfully imported!');
        setShowImportModal(false);
        setImportPreview([]);
        setImporting(false);
        handleSearch();
      })
      .catch(err => {
        console.error(err);
        alert('Failed to import suppliers. Please review CSV structure.');
        setImporting(false);
      });
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-tr from-[#f6f8fb] via-[#f1f5f9] to-[#e9eff6] space-y-6">

      {/* Header with Title and Import/Export Tools */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Building2 className="text-indigo-600" size={22} />
            Supplier Sourcing & Discovery
          </h1>
          <p className="text-xs text-slate-500">
            Search internal synced vendors, demo databases, and web marketplaces. Import or export supplier records instantly.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Export CSV button */}
          <a
            href={supplierService.exportUrl}
            download="suppliers_export.csv"
            className="view-all-btn flex items-center gap-1.5 px-4 py-2.5 bg-white text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Download size={13} className="text-slate-500" />
            <span>Export CSV</span>
          </a>

          {/* Import CSV input & button */}
          <label className="view-all-btn flex items-center gap-1.5 px-4 py-2.5 bg-white text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer">
            <Upload size={13} className="text-slate-500" />
            <span>Import CSV</span>
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleCSVFileChange} 
              className="hidden" 
            />
          </label>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4.5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-650 hover:scale-[1.02] active:scale-[0.98] text-white text-xs font-bold rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Supplier</span>
          </button>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-600 to-indigo-650" />
        <div className="flex items-center gap-1 px-5 pt-4 border-b border-slate-100">
          <button
            onClick={() => setActiveTab('search')}
            className={`pb-3 px-3 text-xs font-bold border-b-[3px] transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'search' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Search size={13} /> Sourcing Channels
          </button>
          <button
            onClick={() => setActiveTab('oppora')}
            className={`pb-3 px-3 text-xs font-bold border-b-[3px] transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'oppora' ? 'border-violet-650 text-violet-750' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Zap size={13} /> Oppora AI Discovery
            <span className="bg-violet-100 text-violet-700 text-[9px] px-1.5 py-0.5 rounded font-extrabold border border-violet-200">ICP</span>
          </button>
        </div>

        {/* ── Tab: Sourcing Channels ── */}
        {activeTab === 'search' && (
          <div className="p-6 space-y-4">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex gap-2.5">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search raw chemicals (e.g. PVC Resin, HDPE Granules, Stretch Film)..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white transition-all font-semibold shadow-inner focus:ring-2 focus:ring-indigo-500/10"
                  />
                  <Search className="absolute left-3.5 top-3.5 text-slate-400" size={14} />
                </div>
                <button type="submit" className="bg-gradient-to-r from-blue-600 to-indigo-650 hover:scale-[1.02] active:scale-[0.98] text-white font-bold text-xs px-5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-md">
                  <Search size={13} />
                  <span>Search</span>
                </button>
              </div>

              {/* Sourcing Channels Checkboxes */}
              <div className="flex flex-wrap items-center gap-3 bg-slate-50/60 border border-slate-200/80 p-4 rounded-xl shadow-inner">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">Search Sources:</span>
                
                <button 
                  type="button" 
                  onClick={() => handleSourceToggle('internal')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-sm ${
                    sources.internal ? 'bg-indigo-600 border-transparent text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Building2 size={12} />
                  <span>Internal Suppliers</span>
                </button>

                <button 
                  type="button" 
                  onClick={() => handleSourceToggle('demo')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-sm ${
                    sources.demo ? 'bg-indigo-600 border-transparent text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <FileSpreadsheet size={12} />
                  <span>Demo Database</span>
                </button>

                <button 
                  type="button" 
                  onClick={() => handleSourceToggle('google')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-sm ${
                    sources.google ? 'bg-indigo-600 border-transparent text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Globe size={12} />
                  <span>Google Search (Mock)</span>
                </button>

                <button 
                  type="button" 
                  onClick={() => handleSourceToggle('alibaba')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-sm ${
                    sources.alibaba ? 'bg-indigo-600 border-transparent text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Tag size={12} />
                  <span>Alibaba (Mock)</span>
                </button>

                <div className="h-5 w-[1px] bg-slate-250 mx-1" />

                <button 
                  type="button" 
                  onClick={() => setAiSearchEnabled(!aiSearchEnabled)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-sm ${
                    aiSearchEnabled ? 'bg-gradient-to-r from-violet-600 to-indigo-600 border-transparent text-white' : 'bg-indigo-50 border-indigo-200/50 text-indigo-700 hover:bg-indigo-100/80'
                  }`}
                >
                  <Sparkles size={12} className={aiSearchEnabled ? "animate-pulse" : ""} />
                  <span>AI Finder (GPT-4)</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Tab: Oppora ICP Discovery ── */}
        {activeTab === 'oppora' && (
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3 bg-violet-50/60 p-4 rounded-xl border border-violet-100">
              <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                <Zap size={16} className="text-violet-700 animate-bounce" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-800">ICP-Driven External Supplier Discovery</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">AI reads your RFQ item, extracts the Ideal Company Profile (industry, company type, decision-maker titles), then searches Oppora for real matching contacts. You can edit the ICP before launching.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Item / Product *</label>
                <input
                  type="text"
                  placeholder="e.g. PVC Resin, HDPE Granules"
                  value={opporaItem}
                  onChange={e => setOpporaItem(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold outline-none focus:border-violet-500 bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Description / Specs (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Industrial grade, 250 MT, CIF Riyadh"
                  value={opporaDesc}
                  onChange={e => setOpporaDesc(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold outline-none focus:border-violet-500 bg-slate-50"
                />
              </div>
            </div>

            {/* ICP Preview — shown after first search */}
            {icpEdit && (
              <div className="border border-violet-200 rounded-xl bg-violet-50/40 overflow-hidden">
                <button
                  onClick={() => setIcpExpanded(p => !p)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold text-violet-800"
                >
                  <span className="flex items-center gap-2"><Pencil size={12} /> Edit ICP (Ideal Company Profile)</span>
                  {icpExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {icpExpanded && (
                  <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {[['industry','Industry',Building2],['company_types','Company Types (comma-sep)',Building2],['job_titles','Target Titles (comma-sep)',Users],['keywords','Keywords (comma-sep)',Tag],['regions','Regions (comma-sep)',Globe]].map(([key,label,Icon]) => (
                      <div key={key}>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Icon size={10}/>{label}</label>
                        <input
                          type="text"
                          value={Array.isArray(icpEdit[key]) ? icpEdit[key].join(', ') : (icpEdit[key] || '')}
                          onChange={e => {
                            const val = Array.isArray(icpEdit[key])
                              ? e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                              : e.target.value;
                            setIcpEdit(prev => ({ ...prev, [key]: val }));
                          }}
                          className="w-full border border-violet-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-semibold outline-none focus:border-violet-500 bg-white"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {opporaError && (
              <div className="px-3 py-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">{opporaError}</div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => handleOpporaSearch(false)}
                disabled={!opporaItem.trim() || opporaLoading}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-750 text-white text-xs font-bold rounded-xl transition-all shadow-sm disabled:opacity-50"
              >
                {opporaLoading ? <><RefreshCw size={13} className="animate-spin"/> Searching…</> : <><Zap size={13}/> AI Extract ICP &amp; Search</>}
              </button>
              {icpEdit && (
                <button
                  onClick={() => handleOpporaSearch(true)}
                  disabled={opporaLoading}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-violet-300 text-violet-700 hover:bg-violet-50 text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                >
                  <CheckCircle2 size={13}/> Re-launch with Edited ICP
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Results Section */}
      <div className="space-y-3.5">
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
              {activeTab === 'oppora' ? 'Oppora Discovery Results' : 'Search Results'}
            </span>
            <span className="text-[10px] bg-[#0078d4]/10 border border-[#0078d4]/20 text-[#0078d4] px-2.5 py-0.5 rounded-full font-semibold">
              {activeTab === 'oppora' ? (opporaResult?.total ?? 0) : results.length} suppliers matching
            </span>
          </div>
        </div>

        {/* ── Oppora Results ── */}
        {activeTab === 'oppora' && opporaResult && (
          <div className="space-y-3">
            {opporaResult.contacts.length === 0 ? (
              <div className="p-12 bg-white border border-slate-200 rounded-xl text-center text-slate-400 text-xs font-semibold">
                No contacts found. Try a different item or edit the ICP.
              </div>
            ) : (
              opporaResult.contacts.map((c, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-700 font-semibold text-sm flex items-center justify-center shrink-0 border border-violet-200">
                    {(c.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-800 text-sm">{c.name}</span>
                      <span className="text-[9px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded font-bold border border-violet-200">
                        {c.source?.includes('Oppora') ? '⚡ Oppora' : '🤖 AI Sim'}
                      </span>
                      <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold border border-emerald-200">
                        {c.confidence ?? 85}% match
                      </span>
                    </div>
                    {c.contact && <div className="text-xs text-slate-600 font-semibold">{c.contact} · <span className="text-slate-400">{c.title}</span></div>}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
                      {c.email && <span className="flex items-center gap-1 text-slate-500"><Mail size={10}/>{c.email}</span>}
                      {c.phone && <span className="flex items-center gap-1 text-slate-500"><Phone size={10}/>{c.phone}</span>}
                      {c.country && <span className="flex items-center gap-1 text-slate-500"><MapPin size={10}/>{c.country}</span>}
                    </div>
                    {c.industry && <div className="text-[10px] text-violet-600 font-semibold">{c.industry}</div>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {(() => {
                      const cleanCompany = (c.name || '').replace(/\s+(group|corporation|corp|company|co|limited|ltd|incorporated|inc|gmbh|ag|s\.?a\.?|plc|llc|pvt|private|industries|industry|solutions|holding|holdings)\.?\s*$/i, '').trim();
                      const linkedinUrl = c.linkedin && !c.linkedin.includes('search/results') && !c.linkedin.includes('keywords=')
                        ? c.linkedin 
                        : `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(((c.contact || '') + ' ' + cleanCompany).trim())}`;
                      return (
                        <a href={linkedinUrl} target="_blank" rel="noopener noreferrer"
                          className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-lg transition-all">
                          LinkedIn
                        </a>
                      );
                    })()}
                    <button
                      onClick={() => onSendRfqRedirect && onSendRfqRedirect(null)}
                      className="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <Send size={11}/> Send RFQ
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Sourcing Channel Results ── */}
        {activeTab === 'search' && (
          loading ? (
            <div className="p-16 bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-3xl text-center shadow-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
              <span className="text-xs text-slate-500 font-bold">Scanning supply network databases...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="p-16 bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-3xl text-center text-slate-400 space-y-3 shadow-sm">
              <Search className="mx-auto text-slate-300 animate-pulse" size={32} />
              <p className="text-xs font-semibold text-slate-500">No suppliers found. Try searching for "PVC Resin" or "HDPE Granules".</p>
            </div>
          ) : (
            (() => {
              const groups = [
                { id: 'Preferred Suppliers', title: 'Preferred Suppliers', color: 'border-amber-400 bg-amber-50/10 text-amber-800' },
                { id: 'Previously Used Suppliers', title: 'Previously Used Suppliers', color: 'border-emerald-500 bg-emerald-50/10 text-emerald-800' },
                { id: 'Other Approved Suppliers', title: 'Other Approved Suppliers', color: 'border-blue-500 bg-blue-50/10 text-blue-800' },
                { id: 'New Supplier Candidates', title: 'New Supplier Candidates', color: 'border-slate-300 bg-slate-50/10 text-slate-800' }
              ];

              // Group results
              const groupedData = groups.map(g => {
                const list = results.filter(s => (s.category || s.supplier_category || 'New Supplier Candidates') === g.id);
                return { ...g, list };
              }).filter(g => g.list.length > 0);

              return (
                <div className="space-y-8">
                  {groupedData.map((group, gIdx) => (
                    <div key={gIdx} className={`bg-white/90 border-l-4 ${group.color} border-y border-r border-slate-200/85 rounded-2xl shadow-sm overflow-hidden`}>
                      <div className="p-4 bg-slate-50/50 border-b border-slate-200/60 flex items-center justify-between">
                        <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                          {group.id === 'Preferred Suppliers' && <Star size={13} fill="currentColor" className="text-amber-500" />}
                          {group.id === 'Previously Used Suppliers' && <Users size={13} className="text-emerald-600" />}
                          {group.id === 'Other Approved Suppliers' && <CheckCircle2 size={13} className="text-blue-600" />}
                          {group.id === 'New Supplier Candidates' && <HelpCircle size={13} className="text-slate-500" />}
                          {group.title}
                        </span>
                        <span className="text-[10px] bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                          {group.list.length} suppliers
                        </span>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50/30 border-b border-slate-200/60 text-slate-750 font-bold uppercase tracking-wider text-[9px] whitespace-nowrap">
                              <th className="p-3 pl-4 w-8">
                                <input
                                  type="checkbox"
                                  className="w-3.5 h-3.5 accent-indigo-600 cursor-pointer"
                                  checked={group.list.every(s => isSupplierSelected(s))}
                                  onChange={e => {
                                    if (e.target.checked) {
                                      group.list.forEach(s => { if (!isSupplierSelected(s)) toggleSupplierSelect(s); });
                                    } else {
                                      group.list.forEach(s => toggleSupplierSelect(s));
                                    }
                                  }}
                                />
                              </th>
                              <th className="p-3 pl-2">Supplier Name</th>
                              <th className="p-3">Country / Location</th>
                              <th className="p-3 text-center">Prior Orders</th>
                              <th className="p-3 text-right">Last Purchase Price</th>
                              <th className="p-3 text-center">Quality Score</th>
                              <th className="p-3 text-center">Delivery Score</th>
                              <th className="p-3 text-center">Response Rate</th>
                              <th className="p-3 text-center">Risk Level</th>
                              <th className="p-3 pl-5 max-w-[320px]">AI Match Rationale / Explanation</th>
                              <th className="p-3 pr-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-650">
                            {group.list.map((s, i) => {
                              const char = s.name.charAt(0).toUpperCase();
                              let avatarBg = "bg-indigo-50 text-indigo-650 border-indigo-100/50";
                              if (['A','B','C'].includes(char)) avatarBg = "bg-blue-50 text-blue-650 border-blue-100/50";
                              else if (['D','E','F','G'].includes(char)) avatarBg = "bg-emerald-50 text-emerald-650 border-emerald-100/50";
                              else if (['H','I','J','K'].includes(char)) avatarBg = "bg-violet-50 text-violet-75 border-violet-100/50";
                              else if (['L','M','N','O'].includes(char)) avatarBg = "bg-amber-50 text-amber-650 border-amber-100/50";

                              const isExternal = s.source && (s.source.includes("Google") || s.source.includes("Alibaba") || s.source.includes("OpenAI"));
                              const isSelected = isSupplierSelected(s);

                              return (
                                <tr key={i} className={`hover:bg-slate-50/40 transition-colors duration-150 ${isSelected ? 'bg-indigo-50/30 border-l-2 border-indigo-400' : ''}`}>
                                  {/* Checkbox */}
                                  <td className="p-3 pl-4">
                                    <input
                                      type="checkbox"
                                      className="w-3.5 h-3.5 accent-indigo-600 cursor-pointer"
                                      checked={isSelected}
                                      onChange={() => toggleSupplierSelect(s)}
                                    />
                                  </td>

                                  {/* Name and Source */}
                                  <td className="p-3 pl-2">
                                    <div className="flex items-center gap-2.5">
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border border-slate-200/50 shrink-0 shadow-sm ${avatarBg}`}>
                                        {char}
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span 
                                            className="font-bold text-slate-800 text-xs hover:text-indigo-600 hover:underline cursor-pointer"
                                            onClick={() => !isExternal && setSelectedSupplierId(s.id)}
                                          >
                                            {s.name}
                                          </span>
                                        </div>
                                        <div className="text-[9px] text-slate-400 font-semibold flex items-center gap-1 mt-0.5">
                                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${
                                            s.source?.includes("ERP") ? "bg-blue-500/10 text-blue-700 border-blue-500/15" :
                                            s.source?.includes("Demo") ? "bg-amber-500/10 text-amber-700 border-amber-500/15" :
                                            s.source?.includes("Google") ? "bg-rose-500/10 text-rose-700 border-rose-500/15" :
                                            "bg-emerald-500/10 text-emerald-700 border-emerald-500/15"
                                          }`}>
                                            {s.source}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Country */}
                                  <td className="p-3 whitespace-nowrap">
                                    <div className="flex items-center gap-1 text-xs text-slate-600 font-semibold">
                                      <MapPin size={11} className="text-slate-400" />
                                      <span>{s.country}</span>
                                    </div>
                                  </td>

                                  {/* Prior Orders */}
                                  <td className="p-3 text-center font-semibold text-slate-600 text-xs whitespace-nowrap">
                                    {s.previous_orders ?? 0}
                                  </td>

                                  {/* Last Purchase Price */}
                                  <td className="p-3 text-right font-bold text-slate-850 text-xs whitespace-nowrap">
                                    {s.last_purchase_price ? `$${s.last_purchase_price.toLocaleString(undefined, {minimumFractionDigits: 2})}/MT` : '—'}
                                  </td>

                                  {/* Quality Score */}
                                  <td className="p-3 text-center text-xs font-bold text-slate-700 whitespace-nowrap">
                                    {s.quality_score ? `${Math.round(s.quality_score)}%` : '—'}
                                  </td>

                                  {/* Delivery Score */}
                                  <td className="p-3 text-center text-xs font-bold text-slate-700 whitespace-nowrap">
                                    {s.delivery_score ? `${Math.round(s.delivery_score)}%` : '—'}
                                  </td>

                                  {/* Response Rate */}
                                  <td className="p-3 text-center text-xs font-semibold text-slate-600 whitespace-nowrap">
                                    {s.average_response_time_hours ? `${s.average_response_time_hours}h` : '—'}
                                  </td>

                                  {/* Risk */}
                                  <td className="p-3 text-center whitespace-nowrap">
                                    <span className={`whitespace-nowrap px-2 py-0.5 rounded-lg text-[9px] font-bold border ${
                                      s.risk_level === 'High' ? 'bg-rose-500/10 text-rose-700 border-rose-500/15' :
                                      s.risk_level === 'Medium' ? 'bg-amber-500/10 text-amber-700 border-amber-500/15' :
                                      'bg-emerald-500/10 text-emerald-700 border-emerald-500/15'
                                    }`}>
                                      {s.risk_level === 'High' ? 'High Risk' : s.risk_level === 'Medium' ? 'Medium Risk' : 'Low Risk'}
                                    </span>
                                  </td>

                                  {/* AI Explanation / Rationale */}
                                  <td className="p-3 pl-5 max-w-[320px] whitespace-normal">
                                    <div className="flex items-start gap-1.5 text-[11px] leading-relaxed text-indigo-850 bg-indigo-50/40 p-2 rounded-lg border border-indigo-100/30">
                                      <Sparkles size={11} className="text-indigo-550 mt-0.5 shrink-0 animate-pulse" />
                                      <span className="italic font-medium">{s.ai_explanation || "Analyzing sourcing criteria..."}</span>
                                    </div>
                                  </td>

                                  {/* Actions */}
                                  <td className="p-3 pr-4 text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-1.5">
                                      {isExternal ? (
                                        <button
                                          onClick={() => handleRegisterSupplier(s)}
                                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1 cursor-pointer whitespace-nowrap shadow-sm"
                                          title="Add to ERP Database"
                                        >
                                          <Plus size={11} />
                                          <span>Register</span>
                                        </button>
                                      ) : (
                                        <button 
                                          onClick={() => setSelectedSupplierId(s.id)}
                                          className="view-all-btn px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-550 text-[10px] font-bold rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1 cursor-pointer whitespace-nowrap shadow-sm"
                                        >
                                          <Eye size={11} />
                                          <span>History</span>
                                        </button>
                                      )}
                                      
                                      <button 
                                        onClick={() => toggleSupplierSelect(s)}
                                        className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1 cursor-pointer whitespace-nowrap shadow-sm border ${
                                          isSelected
                                            ? 'bg-indigo-600 text-white border-indigo-700'
                                            : 'bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-700 text-white border-transparent'
                                        }`}
                                      >
                                        <Send size={11} />
                                        <span>{isSelected ? '✓ Selected' : 'Select'}</span>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()
          )
        )}
      </div>

      {/* Supplier Scorecard Modal */}
      {selectedSupplierId && (
        <SupplierProfileModal 
          supplierId={selectedSupplierId} 
          onClose={() => setSelectedSupplierId(null)} 
        />
      )}

      {/* ── Floating Selection Action Bar ── */}
      {selectedSuppliers.length > 0 && !showRfqReviewModal && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-slate-900/95 backdrop-blur-md text-white px-6 py-3.5 rounded-2xl shadow-2xl border border-slate-700/60 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-xs font-extrabold">
              {selectedSuppliers.length}
            </div>
            <span className="text-sm font-bold">{selectedSuppliers.length} supplier{selectedSuppliers.length > 1 ? 's' : ''} selected</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 max-w-[260px] truncate">
            {selectedSuppliers.map(s => s.name).join(', ')}
          </div>
          <button
            onClick={() => setSelectedSuppliers([])}
            className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 rounded-lg hover:bg-slate-800 transition-all"
          >
            Clear
          </button>
          <button
            onClick={openRfqReview}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Mail size={14} />
            Review & Send RFQ
            <ChevronRight size={13} />
          </button>
        </div>
      )}

      {/* ── RFQ Review → Approve → Send Modal ── */}
      {showRfqReviewModal && createPortal(
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">

            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Mail size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold tracking-tight">RFQ Outreach — Review & Approve</h2>
                  <p className="text-[11px] text-blue-100 mt-0.5">
                    RFQ: <strong>{activeRfqNum}</strong> · {selectedSuppliers.length} supplier{selectedSuppliers.length > 1 ? 's' : ''} selected
                  </p>
                </div>
              </div>
              {rfqReviewStep === 'review' && (
                <button onClick={() => { setShowRfqReviewModal(false); }} className="p-1.5 hover:bg-white/20 rounded-lg transition-all cursor-pointer">
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Step: Review */}
            {rfqReviewStep === 'review' && (
              <>
                {generatingDrafts ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 p-12">
                    <Loader2 size={32} className="text-indigo-600 animate-spin" />
                    <p className="text-sm font-semibold text-slate-600">Generating personalized email drafts...</p>
                    <p className="text-xs text-slate-400">Pulling RFQ details and supplier contact info</p>
                  </div>
                ) : (
                  <>
                    {/* Supplier tab pills */}
                    <div className="flex gap-1.5 px-5 pt-4 pb-0 border-b border-slate-100 overflow-x-auto shrink-0">
                      {emailDrafts.map((d, i) => (
                        <button
                          key={i}
                          onClick={() => setReviewEmailIdx(i)}
                          className={`pb-3 px-3.5 text-[11px] font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 ${
                            reviewEmailIdx === i
                              ? 'border-indigo-600 text-indigo-700'
                              : 'border-transparent text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-extrabold flex items-center justify-center">
                            {d.supplier.name.charAt(0)}
                          </div>
                          {d.supplier.name.split(' ')[0]}
                        </button>
                      ))}
                    </div>

                    {/* Email Preview */}
                    {emailDrafts[reviewEmailIdx] && (
                      <div className="flex-1 overflow-y-auto p-5 space-y-4">
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-400 font-bold w-14 shrink-0">TO:</span>
                            <span className="font-bold text-slate-800">{emailDrafts[reviewEmailIdx].supplier.name}</span>
                            {emailDrafts[reviewEmailIdx].supplier.email && (
                              <span className="text-slate-400 text-[10px]">&lt;{emailDrafts[reviewEmailIdx].supplier.email}&gt;</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-400 font-bold w-14 shrink-0">SUBJECT:</span>
                            <span className="font-semibold text-slate-700">{emailDrafts[reviewEmailIdx].subject}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-400 font-bold w-14 shrink-0">ATTACH:</span>
                            <span className="flex items-center gap-1 text-indigo-600 font-semibold">
                              <ShieldCheck size={11} /> {activeRfqNum}_RFQ_Package.pdf
                            </span>
                          </div>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-xl p-5">
                          <pre className="text-xs text-slate-700 font-mono leading-relaxed whitespace-pre-wrap">
                            {emailDrafts[reviewEmailIdx].body}
                          </pre>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                          <AlertCircle size={12} className="shrink-0" />
                          <span>This is a real outreach email. Once approved it will be sent to the supplier. Review carefully before approving.</span>
                        </div>
                      </div>
                    )}

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
                      <div className="text-xs text-slate-400 font-semibold">
                        Previewing {reviewEmailIdx + 1} / {emailDrafts.length} emails
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowRfqReviewModal(false)}
                          className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleApproveSend}
                          className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-extrabold rounded-xl shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                        >
                          <Send size={13} />
                          Approve & Send {selectedSuppliers.length} RFQ{selectedSuppliers.length > 1 ? 's' : ''}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Step: Sending */}
            {rfqReviewStep === 'sending' && (
              <div className="flex-1 p-8 space-y-4 overflow-y-auto">
                <p className="text-sm font-bold text-slate-700 mb-4">Dispatching RFQ emails...</p>
                {sendProgress.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${
                      p.status === 'sent' ? 'bg-emerald-100 text-emerald-700' :
                      p.status === 'error' ? 'bg-rose-100 text-rose-700' :
                      'bg-slate-200 text-slate-500'
                    }`}>
                      {p.status === 'sent' ? '✓' : p.status === 'error' ? '✕' : <Loader2 size={12} className="animate-spin" />}
                    </div>
                    <span className="text-xs font-semibold text-slate-700">{p.name}</span>
                    <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      p.status === 'sent' ? 'bg-emerald-100 text-emerald-700' :
                      p.status === 'error' ? 'bg-rose-100 text-rose-700' :
                      'bg-slate-200 text-slate-500'
                    }`}>
                      {p.status === 'sent' ? 'Sent' : p.status === 'error' ? 'Failed' : 'Sending...'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Step: Done */}
            {rfqReviewStep === 'done' && (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-12 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={32} className="text-emerald-600" />
                </div>
                <h3 className="text-base font-extrabold text-slate-800">RFQ Emails Dispatched!</h3>
                <p className="text-sm text-slate-500 max-w-xs">
                  {sendProgress.filter(p => p.status === 'sent').length} of {sendProgress.length} emails sent successfully.
                  Monitor responses in the <strong>Email Bot Console</strong>.
                </p>
                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => { setShowRfqReviewModal(false); setSelectedSuppliers([]); }}
                    className="px-4 py-2 text-xs font-bold bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Stay Here
                  </button>
                  <button
                    onClick={() => { setShowRfqReviewModal(false); setSelectedSuppliers([]); onSendRfqRedirect && onSendRfqRedirect(null); }}
                    className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-extrabold rounded-xl shadow-md transition-all hover:scale-[1.02] cursor-pointer"
                  >
                    <Mail size={13} /> View Email Bot Console
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>,
        document.body
      )}

      {/* Bulk Import Preview & Execution Modal */}
      {showImportModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 shadow-2xl">
            
            <div className="p-5 border-b border-slate-200/60 bg-slate-50/50 flex items-center justify-between shrink-0">
              <div className="space-y-0.5">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <FileSpreadsheet className="text-emerald-600" size={18} />
                  Bulk Import Suppliers Preview
                </h2>
                <p className="text-[11px] text-slate-400 font-medium">Review the parsed spreadsheet data before syncing to the database.</p>
              </div>
              <button 
                onClick={() => setShowImportModal(false)}
                className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer border border-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-900 p-4 rounded-xl text-[11px] font-semibold flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>
                  The system detected <strong>{importPreview.length}</strong> supplier records in your CSV. Ensure the column headers match <strong>name, country, email, phone, rating, lead_time_days, preferred, products</strong> to map them correctly. Existing suppliers will be updated by name.
                </span>
              </div>

              <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
                <div className="max-h-[350px] overflow-y-auto overflow-x-auto text-[11px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 font-extrabold text-slate-700 uppercase tracking-wider text-[9px]">
                        <th className="p-2.5 pl-3">Name</th>
                        <th className="p-2.5">Country</th>
                        <th className="p-2.5">Email</th>
                        <th className="p-2.5">Rating</th>
                        <th className="p-2.5">Lead Time</th>
                        <th className="p-2.5">Approved Status</th>
                        <th className="p-2.5">Products</th>
                        <th className="p-2.5">ERP Sync</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-650">
                      {importPreview.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2.5 pl-3 font-bold text-slate-800">{item.name || item.supplier_name || '—'}</td>
                          <td className="p-2.5 font-semibold">{item.country || '—'}</td>
                          <td className="p-2.5 font-semibold text-slate-500">{item.email || item.sales_email || '—'}</td>
                          <td className="p-2.5 font-bold text-amber-600">{item.rating || '—'}</td>
                          <td className="p-2.5 font-semibold">{item.lead_time_days || item.lead_time || '—'} days</td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border ${
                              ['true', '1', 'yes'].includes((item.preferred || '').toLowerCase()) ? 'bg-amber-500/10 border-amber-500/20 text-amber-700' : 'bg-slate-100 border-slate-200 text-slate-500'
                            }`}>
                              {['true', '1', 'yes'].includes((item.preferred || '').toLowerCase()) ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="p-2.5 truncate max-w-[150px] font-semibold">{item.products || item.items || '—'}</td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border ${
                              ['true', '1', 'yes', 'synced', ''].includes((item.synced_to_erp || 'true').toLowerCase()) ? 'bg-blue-500/10 border-blue-500/20 text-blue-750' : 'bg-slate-100 border-slate-200 text-slate-500'
                            }`}>
                              {['true', '1', 'yes', 'synced', ''].includes((item.synced_to_erp || 'true').toLowerCase()) ? 'Sync' : 'Local'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-200/60 flex justify-end gap-3 bg-slate-50/50 shrink-0">
              <button 
                type="button" 
                onClick={() => {
                  setShowImportModal(false);
                  setImportPreview([]);
                }}
                className="view-all-btn px-4 py-2 bg-white border border-slate-250 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
                disabled={importing}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={executeImport}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-650 hover:scale-[1.02] active:scale-[0.98] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                disabled={importing}
              >
                {importing ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={13} />
                    <span>Import {importPreview.length} Suppliers</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Add Supplier Modal */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 shadow-2xl">
            
            <div className="p-5 border-b border-slate-200/60 bg-slate-50/50 flex items-center justify-between shrink-0">
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Plus size={16} className="text-indigo-650" />
                Register Supplier Card
              </h2>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg text-sm font-bold cursor-pointer border border-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSupplierSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="font-extrabold text-slate-500 mb-1">Company Name *</label>
                  <input 
                    type="text" 
                    value={newSupplier.name} 
                    onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})}
                    placeholder="e.g. Saudi Polymers Ltd"
                    className="w-full border border-slate-250 rounded-xl px-3 py-2 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label className="font-extrabold text-slate-500 mb-1">Origin Country</label>
                  <input 
                    type="text" 
                    value={newSupplier.country} 
                    onChange={(e) => setNewSupplier({...newSupplier, country: e.target.value})}
                    className="w-full border border-slate-250 rounded-xl px-3 py-2 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="font-extrabold text-slate-500 mb-1">Sales Email *</label>
                  <input 
                    type="email" 
                    value={newSupplier.email} 
                    onChange={(e) => setNewSupplier({...newSupplier, email: e.target.value})}
                    placeholder="sales@company.com"
                    className="w-full border border-slate-250 rounded-xl px-3 py-2 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label className="font-extrabold text-slate-500 mb-1">Telephone</label>
                  <input 
                    type="text" 
                    value={newSupplier.phone} 
                    onChange={(e) => setNewSupplier({...newSupplier, phone: e.target.value})}
                    placeholder="e.g. +966 11 4829 110"
                    className="w-full border border-slate-250 rounded-xl px-3 py-2 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <label className="font-extrabold text-slate-500 mb-1">Initial Rating (0-5)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    min="0" 
                    max="5"
                    value={newSupplier.rating} 
                    onChange={(e) => setNewSupplier({...newSupplier, rating: parseFloat(e.target.value)})}
                    className="w-full border border-slate-250 rounded-xl px-3 py-2 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="font-extrabold text-slate-500 mb-1">Lead Time (Days)</label>
                  <input 
                    type="number" 
                    value={newSupplier.lead_time} 
                    onChange={(e) => setNewSupplier({...newSupplier, lead_time: parseInt(e.target.value)})}
                    className="w-full border border-slate-250 rounded-xl px-3 py-2 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="font-extrabold text-slate-500 mb-1">Approved Supplier?</label>
                  <select 
                    value={newSupplier.preferred ? 'true' : 'false'} 
                    onChange={(e) => setNewSupplier({...newSupplier, preferred: e.target.value === 'true'})}
                    className="w-full border border-slate-250 rounded-xl px-3 py-2 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                  >
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <label className="font-extrabold text-slate-500 mb-1">Quality Score (0-100)</label>
                  <input 
                    type="number" 
                    value={newSupplier.quality_score} 
                    onChange={(e) => setNewSupplier({...newSupplier, quality_score: parseFloat(e.target.value)})}
                    className="w-full border border-slate-250 rounded-xl px-3 py-2 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="font-extrabold text-slate-500 mb-1">Delivery Score (0-100)</label>
                  <input 
                    type="number" 
                    value={newSupplier.delivery_score} 
                    onChange={(e) => setNewSupplier({...newSupplier, delivery_score: parseFloat(e.target.value)})}
                    className="w-full border border-slate-250 rounded-xl px-3 py-2 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="font-extrabold text-slate-500 mb-1">Price Competitiveness</label>
                  <input 
                    type="number" 
                    value={newSupplier.price_competitiveness} 
                    onChange={(e) => setNewSupplier({...newSupplier, price_competitiveness: parseFloat(e.target.value)})}
                    className="w-full border border-slate-250 rounded-xl px-3 py-2 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="font-extrabold text-slate-500 mb-1">Risk Exposure Level</label>
                  <select 
                    value={newSupplier.risk_level} 
                    onChange={(e) => setNewSupplier({...newSupplier, risk_level: e.target.value})}
                    className="w-full border border-slate-250 rounded-xl px-3 py-2 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="font-extrabold text-slate-500 mb-1">Response Time (Hours)</label>
                  <input 
                    type="number" 
                    value={newSupplier.average_response_time_hours} 
                    onChange={(e) => setNewSupplier({...newSupplier, average_response_time_hours: parseFloat(e.target.value)})}
                    className="w-full border border-slate-250 rounded-xl px-3 py-2 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <label className="font-extrabold text-slate-500 mb-1">Supplied Products Catalog (Comma separated)</label>
                <input 
                  type="text" 
                  value={newSupplier.products} 
                  onChange={(e) => setNewSupplier({...newSupplier, products: e.target.value})}
                  placeholder="e.g. PVC Resin, HDPE Granules, Stabilizers"
                  className="w-full border border-slate-250 rounded-xl px-3 py-2 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200/60 shrink-0">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="view-all-btn px-4 py-2 bg-white border border-slate-250 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-650 hover:scale-[1.02] active:scale-[0.98] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
