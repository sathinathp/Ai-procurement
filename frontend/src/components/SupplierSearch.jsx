import React, { useState } from 'react';
import { 
  Search, Star, Mail, Phone, 
  MapPin, Clock, Sparkles, Send, Plus, Bot,
  RefreshCw, Zap, Building2, Users, Tag, Globe, ChevronDown, ChevronUp, Pencil, CheckCircle2
} from 'lucide-react';
import { supplierService } from '../services/api';
import SupplierProfileModal from './SupplierProfileModal';

export default function SupplierSearch({ onSendRfqRedirect }) {
  const [query, setQuery] = useState('PVC Resin');
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

  // Oppora ICP Discovery
  const [opporaItem, setOpporaItem] = useState('');
  const [opporaDesc, setOpporaDesc] = useState('');
  const [opporaLoading, setOpporaLoading] = useState(false);
  const [opporaResult, setOpporaResult] = useState(null); // { icp, contacts }
  const [icpEdit, setIcpEdit] = useState(null);           // editable ICP
  const [icpExpanded, setIcpExpanded] = useState(true);
  const [opporaError, setOpporaError] = useState('');
  
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

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    
    // Format sources list
    const activeSources = Object.keys(sources).filter(k => sources[k]).join(',');
    
    supplierService.search(query, activeSources, aiSearchEnabled)
      .then((res) => {
        setResults(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  const handleSourceToggle = (source) => {
    setSources(prev => ({ ...prev, [source]: !prev[source] }));
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
        // Refresh search if query matches
        handleSearch();
      })
      .catch((err) => {
        console.error(err);
        alert('Failed to add supplier.');
      });
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#f8fafc] space-y-6">

      {/* ── Tab Bar ── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#0078d4] to-violet-600" />
        <div className="flex items-center gap-1 px-5 pt-4 border-b border-slate-100">
          <button
            onClick={() => setActiveTab('search')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'search' ? 'border-[#0078d4] text-[#0078d4]' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Search size={13} /> Internal / Web Search
          </button>
          <button
            onClick={() => setActiveTab('oppora')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'oppora' ? 'border-violet-600 text-violet-700' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Zap size={13} /> Oppora AI Discovery
            <span className="bg-violet-100 text-violet-700 text-[9px] px-1.5 py-0.5 rounded font-extrabold">NEW</span>
          </button>
          <div className="ml-auto pb-3">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0078d4] hover:bg-[#106ebe] text-white text-xs font-bold rounded-lg transition-all shadow-sm"
            >
              <Plus size={13} /> Add Supplier
            </button>
          </div>
        </div>

        {/* ── Tab: Internal / Web Search ── */}
        {activeTab === 'search' && (
          <div className="p-5 space-y-4">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search raw chemicals (e.g. PVC Resin, HDPE Granules, Stretch Film)..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#0078d4] focus:bg-white transition-all font-medium"
                  />
                  <Search className="absolute left-3.5 top-3" size={14} />
                </div>
                <button type="submit" className="bg-[#0078d4] hover:bg-[#106ebe] text-white font-bold text-xs px-5 rounded-lg transition-all shadow-sm flex items-center gap-1.5">
                  <Search size={13} /> Search
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Channels:</span>
                {[['internal','Internal DB'],['demo','Demo Catalog'],['google','Google'],['alibaba','Alibaba']].map(([k,label]) => (
                  <button key={k} type="button" onClick={() => handleSourceToggle(k)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      sources[k] ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}>{label}</button>
                ))}
                <button type="button" onClick={() => setAiSearchEnabled(!aiSearchEnabled)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1 transition-all ${
                    aiSearchEnabled ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}>
                  <Sparkles size={11} /> AI Finder (GPT-4)
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Tab: Oppora ICP Discovery ── */}
        {activeTab === 'oppora' && (
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                <Zap size={16} className="text-violet-700" />
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
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm disabled:opacity-50"
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

      {/* Results List */}
      <div className="space-y-3.5">
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
              {activeTab === 'oppora' ? 'Oppora Discovery Results' : 'Search Results'}
            </span>
            <span className="text-[10px] bg-slate-100 border border-slate-200/80 text-slate-600 px-2 py-0.5 rounded-md font-bold">
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
                  <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-700 font-extrabold text-sm flex items-center justify-center shrink-0 border border-violet-200">
                    {(c.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-800 text-sm">{c.name}</span>
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
                    {c.linkedin && (
                      <a href={c.linkedin} target="_blank" rel="noopener noreferrer"
                        className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-lg transition-all">
                        LinkedIn
                      </a>
                    )}
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

        {loading ? (
          <div className="p-16 bg-white border border-slate-200 rounded-xl text-center shadow-sm">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0078d4] mx-auto mb-3"></div>
            <span className="text-xs text-slate-500 font-bold">Scanning supply network databases...</span>
          </div>
        ) : results.length === 0 ? (
          <div className="p-16 bg-white border border-slate-200 rounded-xl text-center text-slate-400 space-y-3 shadow-sm">
            <Search className="mx-auto text-slate-300" size={32} />
            <p className="text-xs font-bold text-slate-550">No suppliers found. Try searching for "PVC Resin" or "HDPE Granules".</p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((s, i) => {
              // Create dynamic avatar bg based on letter
              const char = s.name.charAt(0).toUpperCase();
              let avatarBg = "bg-indigo-50 text-indigo-700 border-indigo-100";
              if (['A','B','C'].includes(char)) avatarBg = "bg-blue-50 text-blue-705 border-blue-100";
              else if (['D','E','F','G'].includes(char)) avatarBg = "bg-emerald-50 text-emerald-700 border-emerald-100";
              else if (['H','I','J','K'].includes(char)) avatarBg = "bg-violet-50 text-violet-750 border-violet-100";
              else if (['L','M','N','O'].includes(char)) avatarBg = "bg-amber-50 text-amber-705 border-amber-100";

              return (
                <div key={i} className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:border-slate-300 transition-all duration-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border shrink-0 ${avatarBg}`}>
                      {char}
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 
                          className="font-bold text-slate-800 text-sm hover:text-[#0078d4] hover:underline cursor-pointer truncate" 
                          onClick={() => setSelectedSupplierId(s.id)}
                        >
                          {s.name}
                        </h3>
                        {s.preferred && (
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                            Preferred
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                        <MapPin size={10} className="text-slate-400" />
                        <span>{s.country}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] pt-0.5">
                        <span className="flex items-center gap-1 text-slate-500">
                          <Mail size={11} className="text-slate-400" />
                          <span className="font-semibold truncate max-w-[170px]">{s.email}</span>
                        </span>
                        <span className="flex items-center gap-1 text-slate-500">
                          <Phone size={11} className="text-slate-400" />
                          <span className="font-semibold">{s.phone}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 lg:gap-8 items-center border-t border-slate-50 lg:border-t-0 pt-3 lg:pt-0">
                    <div className="text-center lg:text-left">
                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Rating</span>
                      <div className="flex items-center justify-center lg:justify-start gap-1 font-bold text-amber-550 text-xs mt-0.5">
                        <Star fill="currentColor" size={11} />
                        <span>{s.rating}</span>
                      </div>
                    </div>

                    <div className="text-center lg:text-left">
                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">On-Time</span>
                      <span className="font-bold text-slate-700 text-xs mt-0.5 block">{s.delivery_score ? `${s.delivery_score}%` : 'N/A'}</span>
                    </div>

                    <div className="text-center lg:text-left">
                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Lead Time</span>
                      <div className="flex items-center justify-center lg:justify-start gap-1 font-bold text-slate-700 text-xs mt-0.5">
                        <Clock size={11} className="text-slate-400" />
                        <span>{s.lead_time} days</span>
                      </div>
                    </div>

                    <div className="text-center lg:text-left">
                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Risk</span>
                      <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider mt-0.5 ${
                        s.risk_level === 'Low' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        s.risk_level === 'Medium' ? 'bg-amber-50 text-amber-705 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {s.risk_level}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-3 border-t border-slate-50 lg:border-t-0 lg:pt-0 shrink-0">
                    <button 
                      onClick={() => setSelectedSupplierId(s.id)}
                      className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 text-slate-750 hover:bg-slate-100 hover:border-slate-300 text-xs font-bold rounded-lg transition-all"
                    >
                      View Scorecard
                    </button>
                    <button 
                      onClick={() => onSendRfqRedirect(s.id)}
                      className="px-3.5 py-1.5 bg-[#0078d4] text-white hover:bg-[#106ebe] text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <Send size={11} /> Send RFQ
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Supplier Scorecard Modal (Module 7) */}
      {selectedSupplierId && (
        <SupplierProfileModal 
          supplierId={selectedSupplierId} 
          onClose={() => setSelectedSupplierId(null)} 
        />
      )}

      {/* Add Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
            
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Register Supplier Card</h2>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSupplierSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="font-semibold text-slate-600 mb-1">Company Name *</label>
                  <input 
                    type="text" 
                    value={newSupplier.name} 
                    onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})}
                    placeholder="e.g. Saudi Polymers Ltd"
                    className="copilot-input"
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label className="font-semibold text-slate-600 mb-1">Origin Country</label>
                  <input 
                    type="text" 
                    value={newSupplier.country} 
                    onChange={(e) => setNewSupplier({...newSupplier, country: e.target.value})}
                    className="copilot-input"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="font-semibold text-slate-600 mb-1">Sales Email *</label>
                  <input 
                    type="email" 
                    value={newSupplier.email} 
                    onChange={(e) => setNewSupplier({...newSupplier, email: e.target.value})}
                    placeholder="sales@company.com"
                    className="copilot-input"
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label className="font-semibold text-slate-600 mb-1">Telephone</label>
                  <input 
                    type="text" 
                    value={newSupplier.phone} 
                    onChange={(e) => setNewSupplier({...newSupplier, phone: e.target.value})}
                    className="copilot-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <label className="font-semibold text-slate-600 mb-1">Initial Rating (0-5)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    min="0" 
                    max="5"
                    value={newSupplier.rating} 
                    onChange={(e) => setNewSupplier({...newSupplier, rating: parseFloat(e.target.value)})}
                    className="copilot-input"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="font-semibold text-slate-600 mb-1">Lead Time (Days)</label>
                  <input 
                    type="number" 
                    value={newSupplier.lead_time} 
                    onChange={(e) => setNewSupplier({...newSupplier, lead_time: parseInt(e.target.value)})}
                    className="copilot-input"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="font-semibold text-slate-600 mb-1">Preferred Supplier?</label>
                  <select 
                    value={newSupplier.preferred ? 'true' : 'false'} 
                    onChange={(e) => setNewSupplier({...newSupplier, preferred: e.target.value === 'true'})}
                    className="copilot-input"
                  >
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <label className="font-semibold text-slate-600 mb-1">Quality Score (0-100)</label>
                  <input 
                    type="number" 
                    value={newSupplier.quality_score} 
                    onChange={(e) => setNewSupplier({...newSupplier, quality_score: parseFloat(e.target.value)})}
                    className="copilot-input"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="font-semibold text-slate-600 mb-1">Delivery Score (0-100)</label>
                  <input 
                    type="number" 
                    value={newSupplier.delivery_score} 
                    onChange={(e) => setNewSupplier({...newSupplier, delivery_score: parseFloat(e.target.value)})}
                    className="copilot-input"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="font-semibold text-slate-600 mb-1">Price Competitiveness</label>
                  <input 
                    type="number" 
                    value={newSupplier.price_competitiveness} 
                    onChange={(e) => setNewSupplier({...newSupplier, price_competitiveness: parseFloat(e.target.value)})}
                    className="copilot-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="font-semibold text-slate-600 mb-1">Risk Exposure Level</label>
                  <select 
                    value={newSupplier.risk_level} 
                    onChange={(e) => setNewSupplier({...newSupplier, risk_level: e.target.value})}
                    className="copilot-input"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="font-semibold text-slate-600 mb-1">Response Time (Hours)</label>
                  <input 
                    type="number" 
                    value={newSupplier.average_response_time_hours} 
                    onChange={(e) => setNewSupplier({...newSupplier, average_response_time_hours: parseFloat(e.target.value)})}
                    className="copilot-input"
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <label className="font-semibold text-slate-600 mb-1">Supplied Products Catalog (Comma separated)</label>
                <input 
                  type="text" 
                  value={newSupplier.products} 
                  onChange={(e) => setNewSupplier({...newSupplier, products: e.target.value})}
                  placeholder="e.g. PVC Resin, HDPE Granules, Stabilizers"
                  className="copilot-input"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="copilot-btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="copilot-btn-primary"
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
