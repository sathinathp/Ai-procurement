import React, { useState } from 'react';
import { 
  Search, Star, ShieldAlert, CheckCircle, Mail, Phone, 
  MapPin, Clock, ExternalLink, Award, Sparkles, Send, Plus
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
    <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-6">
      
      {/* Search Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Supplier Search Engine</h1>
          <p className="text-xs text-slate-500 mt-1">Identify internal preferred suppliers or search external directories for raw chemicals.</p>
        </div>

        {/* Search Bar & Checkboxes */}
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter item name, e.g. PVC Resin, HDPE Granules..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-350 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0078d4]/30 focus:border-[#0078d4]"
              />
              <Search className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
            </div>
            <button 
              type="submit"
              className="copilot-btn-primary px-6"
            >
              Search
            </button>
            <button 
              type="button"
              onClick={() => setShowAddModal(true)}
              className="copilot-btn-secondary text-xs"
            >
              <Plus size={14} /> Add Supplier
            </button>
          </div>

          {/* Sources Checkboxes */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600 pt-1">
            <span>Search Channels:</span>
            
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input 
                type="checkbox" 
                checked={sources.internal}
                onChange={() => handleSourceToggle('internal')}
                className="rounded border-slate-300 text-[#0078d4] focus:ring-[#0078d4]/30"
              />
              <span>Internal Suppliers (Seeded DB)</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input 
                type="checkbox" 
                checked={sources.demo}
                onChange={() => handleSourceToggle('demo')}
                className="rounded border-slate-300 text-[#0078d4] focus:ring-[#0078d4]/30"
              />
              <span>Demo Catalog</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer flex-1 md:flex-none">
              <input 
                type="checkbox" 
                checked={sources.google}
                onChange={() => handleSourceToggle('google')}
                className="rounded border-slate-300 text-[#0078d4] focus:ring-[#0078d4]/30"
              />
              <span className="text-slate-400">Google Search (Mocked Phase 2)</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input 
                type="checkbox" 
                checked={sources.alibaba}
                onChange={() => handleSourceToggle('alibaba')}
                className="rounded border-slate-300 text-[#0078d4] focus:ring-[#0078d4]/30"
              />
              <span className="text-slate-400">Alibaba Global (Mocked Phase 2)</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100/70 px-2 py-1 rounded-lg transition-all shadow-sm">
              <input 
                type="checkbox" 
                checked={aiSearchEnabled}
                onChange={() => setAiSearchEnabled(!aiSearchEnabled)}
                className="rounded border-indigo-400 text-indigo-600 focus:ring-indigo-500/30"
              />
              <Sparkles size={12} className="text-indigo-600 animate-pulse" />
              <span>AI Supplier Finder (OpenAI Enabled)</span>
            </label>
          </div>
        </form>
      </div>

      {/* Results grid / table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-700">Search Results</span>
          <span className="text-[10px] bg-[#0078d4]/10 text-[#0078d4] px-2 py-0.5 rounded font-semibold">
            {results.length} suppliers matching
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0078d4] mx-auto mb-2"></div>
            <span className="text-xs text-slate-500 font-semibold">Scanning supply network databases...</span>
          </div>
        ) : results.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Search className="mx-auto text-slate-300" size={32} />
            <p className="text-xs font-semibold">No suppliers found. Search for "PVC Resin" or "HDPE Granules".</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
                  <th className="p-4">Supplier Name</th>
                  <th className="p-4">Origin</th>
                  <th className="p-4">Contact Info</th>
                  <th className="p-4 text-center">Rating</th>
                  <th className="p-4 text-center">Delivery Score</th>
                  <th className="p-4 text-center">Lead Time</th>
                  <th className="p-4">Risk Profile</th>
                  <th className="p-4">Channel Source</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {results.map((s, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-semibold text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span>{s.name}</span>
                        {s.preferred && (
                          <Award size={14} className="text-[#0078d4]" title="Preferred Supplier" />
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-slate-500">{s.country}</td>
                    <td className="p-4 space-y-0.5">
                      <div className="flex items-center gap-1 text-[11px] text-slate-600">
                        <Mail size={12} className="text-slate-400" />
                        <span>{s.email}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-600">
                        <Phone size={12} className="text-slate-400" />
                        <span>{s.phone}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center font-bold text-amber-500">
                      <div className="flex items-center justify-center gap-0.5">
                        <Star fill="currentColor" size={12} />
                        <span>{s.rating}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center font-semibold text-slate-800">
                      {s.delivery_score ? `${s.delivery_score}%` : 'N/A'}
                    </td>
                    <td className="p-4 text-center text-slate-600 font-semibold">
                      <div className="flex items-center justify-center gap-1">
                        <Clock size={12} className="text-slate-400" />
                        <span>{s.lead_time} days</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        s.risk_level === 'Low' ? 'bg-emerald-50 text-emerald-700' :
                        s.risk_level === 'Medium' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {s.risk_level}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium border border-slate-150">
                        {s.source}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-1.5">
                      <button 
                        onClick={() => setSelectedSupplierId(s.id)}
                        className="text-[#0078d4] hover:text-[#106ebe] font-semibold text-xs bg-[#0078d4]/10 hover:bg-[#0078d4]/20 px-2.5 py-1.5 rounded transition-all"
                      >
                        View Scorecard
                      </button>
                      <button 
                        onClick={() => onSendRfqRedirect(s.id)}
                        className="copilot-btn-primary text-xs px-2.5 py-1.5 inline-flex items-center gap-1 shadow-none"
                      >
                        <Send size={12} /> Send RFQ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
