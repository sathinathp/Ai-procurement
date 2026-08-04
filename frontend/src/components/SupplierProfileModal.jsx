import React, { useEffect, useState } from 'react';
import { X, Star, Shield, Mail, Phone, Clock } from 'lucide-react';
import { supplierService } from '../services/api';

export default function SupplierProfileModal({ supplierId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!supplierId) return;
    setLoading(true);
    supplierService.getProfile(supplierId)
      .then((res) => {
        setProfile(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to load supplier profile.');
        setLoading(false);
      });
  }, [supplierId]);

  if (!supplierId) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200/80 w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header (Clean white style matching workspace nav) */}
        <div className="px-6 py-4 border-b border-slate-150 bg-white flex items-center justify-between shrink-0">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-800">{loading ? 'Loading Supplier Profile...' : profile?.name}</h2>
              {profile?.preferred ? (
                <span className="bg-amber-50 text-amber-705 border border-amber-200 text-[9px] font-bold px-2 py-0.5 rounded">
                  Preferred Partner
                </span>
              ) : (
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-250 text-[9px] font-bold px-2 py-0.5 rounded">
                  Verified Vendor
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Supplier ID: {supplierId} • Origin: {profile?.country || 'N/A'}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center flex-1 space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0078d4]"></div>
            <p className="text-slate-500 text-xs font-bold">Retrieving supplier audit scorecard...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-red-500 font-bold flex-1">{error}</div>
        ) : (
          <div className="overflow-y-auto flex-1 flex flex-col bg-[#f8fafc]">
            
            {/* Unified KPI Metric Bar (Clean, integrated divider layout) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 bg-white border-b border-slate-150 shrink-0">
              
              {/* Overall Score */}
              <div className="flex items-center gap-3.5">
                <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                  <svg className="w-12 h-12 transform -rotate-90">
                    <circle cx="24" cy="24" r="20" stroke="#f1f5f9" strokeWidth="4" fill="transparent" />
                    <circle 
                      cx="24" 
                      cy="24" 
                      r="20" 
                      stroke="#10b981" 
                      strokeWidth="4" 
                      fill="transparent" 
                      strokeDasharray={2 * Math.PI * 20} 
                      strokeDashoffset={2 * Math.PI * 20 * (1 - profile.overall_score / 100)} 
                      strokeLinecap="round" 
                    />
                  </svg>
                  <span className="absolute text-[11px] font-black text-slate-800">{profile.overall_score}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Overall Score</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-sm font-extrabold text-slate-800">{profile.overall_label}</span>
                    <span className="bg-emerald-50 text-emerald-700 text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-emerald-200/50">Pass</span>
                  </div>
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-3.5 md:border-l md:border-slate-100 md:pl-6">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/50 text-amber-500 border border-amber-200/60 flex items-center justify-center shrink-0 shadow-sm">
                  <Star fill="currentColor" size={16} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Rating Score</span>
                  <span className="text-sm font-extrabold text-slate-800 mt-0.5 block">{profile.rating} <span className="text-slate-400 text-xs font-normal">/ 5.0</span></span>
                </div>
              </div>

              {/* Risk Level */}
              <div className="flex items-center gap-3.5 md:border-l md:border-slate-100 md:pl-6">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-sm ${
                  profile.risk_level === 'Low' ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-emerald-600 border-emerald-250' :
                  profile.risk_level === 'Medium' ? 'bg-gradient-to-br from-amber-50 to-amber-100/50 text-amber-600 border-amber-205' : 'bg-gradient-to-br from-rose-50 to-rose-100/50 text-rose-600 border-rose-250'
                }`}>
                  <Shield size={16} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Risk Profile</span>
                  <span className={`text-sm font-extrabold mt-0.5 block ${
                    profile.risk_level === 'Low' ? 'text-emerald-650' :
                    profile.risk_level === 'Medium' ? 'text-amber-650' : 'text-rose-650'
                  }`}>{profile.risk_level} Risk</span>
                </div>
              </div>

              {/* Response Time */}
              <div className="flex items-center gap-3.5 md:border-l md:border-slate-100 md:pl-6">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 text-[#0078d4] border border-blue-200/60 flex items-center justify-center shrink-0 shadow-sm">
                  <Clock size={16} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Response SLA</span>
                  <span className="text-sm font-extrabold text-slate-800 mt-0.5 block">{profile.average_response_time_hours} hrs</span>
                </div>
              </div>

            </div>

            <div className="p-6 space-y-6 flex-1">
              
              {/* Detailed Performance Indicators */}
              <div className="space-y-3 bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Detailed Performance Indicators</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  
                  {/* Price Competitiveness */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>Price Competitiveness</span>
                      <span>{profile.price_competitiveness}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${profile.price_competitiveness}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Delivery Score */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>Delivery Reliability (On-Time)</span>
                      <span>{profile.delivery_score}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${profile.delivery_score}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Quality Compliance */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>Quality Defect-Free Score</span>
                      <span>{profile.quality_score}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-teal-600 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${profile.quality_score}%` }}
                      ></div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Company Info & Communications Pane */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left pane: Details and Catalog */}
                <div className="space-y-6">
                  
                  {/* Details */}
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Company Details</h3>
                    <div className="bg-white border border-slate-200/80 rounded-xl p-4 space-y-3 text-xs">
                      <div className="flex items-center gap-2.5 text-slate-600">
                        <Mail size={14} className="text-slate-400 shrink-0" />
                        <span className="font-semibold">{profile.email}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-slate-650">
                        <Phone size={14} className="text-slate-400 shrink-0" />
                        <span className="font-semibold">{profile.phone || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-slate-655">
                        <Clock size={14} className="text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-700">Average Lead Time: <strong className="text-slate-800">{profile.lead_time} days</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Catalog Categories */}
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Supplied Catalog & Categories</h3>
                    <div className="bg-white border border-slate-200/80 rounded-xl p-4 space-y-4">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">Product Categories</span>
                        <div className="flex flex-wrap gap-1.5">
                          {profile.categories.map((c, i) => (
                            <span key={i} className="text-[11px] bg-slate-50 border border-slate-200 text-slate-600 px-2.5 py-0.5 rounded font-medium">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">Supplied Products</span>
                        <div className="flex flex-wrap gap-1.5">
                          {profile.products.map((p, i) => (
                            <span key={i} className="text-[11px] bg-blue-50 text-[#0078d4] px-2 py-0.5 rounded font-bold border border-blue-100">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Right Pane: Logs */}
                <div className="space-y-3 flex flex-col h-full">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recent Communication Logs</h3>
                  <div className="flex-1 bg-white border border-slate-200/80 rounded-xl p-4 overflow-y-auto max-h-[340px] space-y-3 shadow-sm">
                    {profile.contact_history.length === 0 ? (
                      <div className="text-center text-xs text-slate-400 py-16 font-medium">No recent email logs found.</div>
                    ) : (
                      profile.contact_history.map((email, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 border border-slate-150 rounded-lg space-y-1 hover:border-slate-300 transition-colors">
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-bold text-slate-800 truncate max-w-[70%]">{email.subject}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{email.sent_date}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{email.body}</p>
                          <span className="text-[9px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full inline-block mt-1 font-bold">
                            {email.type}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* Purchase Orders Table */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Historical Purchase Orders</h3>
                  <span className="text-[10px] bg-slate-100 text-slate-500 border border-slate-200/60 px-2 py-0.5 rounded font-black">{profile.previous_orders.length} Orders</span>
                </div>
                
                <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-150 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                          <th className="p-3.5 pl-5">PO Number</th>
                          <th className="p-3.5">RFQ Ref</th>
                          <th className="p-3.5">Item Details</th>
                          <th className="p-3.5 text-right">Quantity</th>
                          <th className="p-3.5 text-right">Total (USD)</th>
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5 pr-5">Release Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {profile.previous_orders.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="p-12 text-center text-slate-400 font-bold">No purchase order logs recorded.</td>
                          </tr>
                        ) : (
                          profile.previous_orders.map((po, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-3.5 pl-5 font-bold text-slate-800">{po.po_number}</td>
                              <td className="p-3.5 font-medium text-slate-450">{po.rfq_number}</td>
                              <td className="p-3.5 font-bold text-slate-800">{po.item_name}</td>
                              <td className="p-3.5 text-right font-semibold text-slate-600">{po.quantity}</td>
                              <td className="p-3.5 text-right font-black text-slate-800">${po.total_amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                              <td className="p-3.5">
                                <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black border uppercase tracking-wider ${
                                  po.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  po.status === 'Delayed' ? 'bg-rose-50 text-rose-700 border-rose-250' : 'bg-blue-50 text-blue-700 border-blue-200'
                                }`}>
                                  {po.status}
                                </span>
                              </td>
                              <td className="p-3.5 pr-5 text-slate-400 font-medium">{po.date}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
