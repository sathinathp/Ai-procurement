import React, { useState } from 'react';
import { 
  Search, Star, ShieldAlert, CheckCircle, Mail, Phone, 
  MapPin, Clock, ExternalLink, Award, Sparkles, Send, Plus, Bot
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
  
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
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
      
      {/* Search Header Banner (Light, clean SaaS style) */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm space-y-5 relative overflow-hidden">
        {/* Subtle top decoration line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#0078d4] to-indigo-600"></div>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <Bot size={20} className="text-[#0078d4]" />
              Supplier Search Engine
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Query internal vendor records or scan global external marketplaces for industrial raw materials.</p>
          </div>
          <button 
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0078d4] hover:bg-[#106ebe] text-white text-xs font-bold rounded-lg transition-all shadow-sm"
          >
            <Plus size={14} /> Add Supplier
          </button>
        </div>

        {/* Search Bar & Checkboxes */}
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search raw chemicals (e.g. PVC Resin, HDPE Granules, Stretch Film)..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0078d4]/20 focus:border-[#0078d4] focus:bg-white transition-all font-medium"
              />
              <Search className="absolute left-3.5 top-3.5 text-slate-400" size={14} />
            </div>
            <button 
              type="submit"
              className="bg-[#0078d4] hover:bg-[#106ebe] text-white font-bold text-xs px-5 rounded-lg transition-all shadow-sm flex items-center gap-1.5"
            >
              <Search size={14} /> Search
            </button>
          </div>

          {/* Sources Checkboxes (Styled as premium toggle pills) */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs font-medium text-slate-500 pt-1">
            <span className="text-slate-400 mr-1 text-[11px] uppercase tracking-wider font-bold">Search Channels:</span>
            
            <button 
              type="button"
              onClick={() => handleSourceToggle('internal')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                sources.internal 
                  ? 'bg-slate-900 border-slate-900 text-white shadow-sm' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>Internal Database</span>
            </button>

            <button 
              type="button"
              onClick={() => handleSourceToggle('demo')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                sources.demo 
                  ? 'bg-slate-900 border-slate-900 text-white shadow-sm' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>Demo Catalog</span>
            </button>

            <button 
              type="button"
              onClick={() => handleSourceToggle('google')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                sources.google 
                  ? 'bg-slate-900 border-slate-900 text-white shadow-sm' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>Google Search</span>
            </button>

            <button 
              type="button"
              onClick={() => handleSourceToggle('alibaba')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                sources.alibaba 
                  ? 'bg-slate-900 border-slate-900 text-white shadow-sm' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>Alibaba Global</span>
            </button>

            <button 
              type="button"
              onClick={() => setAiSearchEnabled(!aiSearchEnabled)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                aiSearchEnabled 
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Sparkles size={11} className={aiSearchEnabled ? "text-white" : "text-indigo-500"} />
              <span>AI Finder (GPT-4)</span>
            </button>
          </div>
        </form>
      </div>

      {/* Results List */}
      <div className="space-y-3.5">
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">Search Results</span>
            <span className="text-[10px] bg-slate-100 border border-slate-200/80 text-slate-600 px-2 py-0.5 rounded-md font-bold">
              {results.length} suppliers matching
            </span>
          </div>
        </div>

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
