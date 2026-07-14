import React, { useEffect, useState } from 'react';
import { X, Star, Calendar, Shield, Mail, Phone, DollarSign, Clock, FileText } from 'lucide-react';
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-slate-900">{loading ? 'Loading Supplier Profile...' : profile?.name}</h2>
              {profile?.preferred && (
                <span className="bg-[#0078d4]/10 text-[#0078d4] text-xs font-semibold px-2 py-0.5 rounded-full">
                  Preferred Supplier
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-1">ID: {supplierId} • {profile?.country}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-10 flex flex-col items-center justify-center flex-1">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0078d4]"></div>
            <p className="text-slate-500 mt-3 text-sm">Retrieving supplier audit scorecard...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500 flex-1">{error}</div>
        ) : (
          <div className="overflow-y-auto p-6 flex-1 space-y-6">
            
            {/* Scorecard Summary Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* Overall Score */}
              <div className="bg-gradient-to-br from-[#0078d4] to-[#106ebe] text-white p-5 rounded-xl shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-xs uppercase tracking-wider opacity-80 font-medium">Overall Score</span>
                  <div className="text-3xl font-bold mt-1">{profile.overall_score}%</div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs px-2.5 py-1 bg-white/20 rounded-full font-semibold">
                    {profile.overall_label}
                  </span>
                  <span className="text-xs opacity-90">Audit Pass</span>
                </div>
              </div>

              {/* Rating */}
              <div className="border border-slate-200 p-4 rounded-xl flex items-center gap-4 bg-slate-50">
                <div className="p-3 bg-amber-50 text-amber-500 rounded-lg">
                  <Star fill="currentColor" size={24} />
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-medium">Rating Score</div>
                  <div className="text-xl font-bold text-slate-800">{profile.rating} / 5.0</div>
                  <div className="text-xs text-slate-500">Industry Standard</div>
                </div>
              </div>

              {/* Risk Level */}
              <div className="border border-slate-200 p-4 rounded-xl flex items-center gap-4 bg-slate-50">
                <div className={`p-3 rounded-lg ${
                  profile.risk_level === 'Low' ? 'bg-emerald-50 text-emerald-600' :
                  profile.risk_level === 'Medium' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  <Shield size={24} />
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-medium">Risk Exposure</div>
                  <div className={`text-xl font-bold ${
                    profile.risk_level === 'Low' ? 'text-emerald-600' :
                    profile.risk_level === 'Medium' ? 'text-amber-600' : 'text-rose-600'
                  }`}>{profile.risk_level}</div>
                  <div className="text-xs text-slate-500">Based on delivery stats</div>
                </div>
              </div>

              {/* Response Time */}
              <div className="border border-slate-200 p-4 rounded-xl flex items-center gap-4 bg-slate-50">
                <div className="p-3 bg-blue-50 text-[#0078d4] rounded-lg">
                  <Clock size={24} />
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-medium">Avg Response</div>
                  <div className="text-xl font-bold text-slate-800">{profile.average_response_time_hours} hrs</div>
                  <div className="text-xs text-slate-500">Email turnaround</div>
                </div>
              </div>

            </div>

            {/* Performance Detail Metrics */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4">Detailed Performance Indicators</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Price Competitiveness */}
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
                    <span>Price Competitiveness</span>
                    <span>{profile.price_competitiveness}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${profile.price_competitiveness}%` }}
                    ></div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Relative pricing compared to market index</p>
                </div>

                {/* Delivery Score */}
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
                    <span>Delivery Reliability (On-Time)</span>
                    <span>{profile.delivery_score}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${profile.delivery_score}%` }}
                    ></div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Percentage of orders shipped within target window</p>
                </div>

                {/* Quality Compliance */}
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
                    <span>Quality Defect-Free Score</span>
                    <span>{profile.quality_score}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-teal-600 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${profile.quality_score}%` }}
                    ></div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">COA compliance & inspection pass rate</p>
                </div>

              </div>
            </div>

            {/* Profile Info Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Column: Contact and Products */}
              <div className="space-y-4">
                <div className="border border-slate-200 p-4 rounded-xl">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3">Company Details</h3>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail size={16} className="text-slate-400" />
                      <span>{profile.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone size={16} className="text-slate-400" />
                      <span>{profile.phone || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock size={16} className="text-slate-400" />
                      <span>Lead Time: **{profile.lead_time} days** (Avg)</span>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 p-4 rounded-xl">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3">Supplied Catalog & Categories</h3>
                  <div className="mb-3">
                    <span className="text-xs font-semibold text-slate-400 block mb-1.5 uppercase">Categories</span>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.categories.map((c, i) => (
                        <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block mb-1.5 uppercase">Products</span>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.products.map((p, i) => (
                        <span key={i} className="text-xs bg-blue-50 text-[#0078d4] px-2.5 py-1 rounded font-medium border border-blue-100">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Contact history logs */}
              <div className="border border-slate-200 p-4 rounded-xl flex flex-col max-h-[350px]">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Recent Communication History</h3>
                <div className="overflow-y-auto flex-1 space-y-3 pr-1">
                  {profile.contact_history.length === 0 ? (
                    <div className="text-center text-xs text-slate-400 py-10">No recent email logs found.</div>
                  ) : (
                    profile.contact_history.map((email, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-150 rounded-lg space-y-1">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-semibold text-slate-800 truncate max-w-[70%]">{email.subject}</span>
                          <span className="text-[10px] text-slate-400">{email.sent_date}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2">{email.body}</p>
                        <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full inline-block mt-1 font-medium">
                          {email.type}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Purchase Orders Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <h3 className="text-sm font-semibold text-slate-800">Historical Purchase Orders</h3>
                <span className="text-xs font-semibold text-slate-500">{profile.previous_orders.length} orders total</span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                      <th className="p-3">PO Number</th>
                      <th className="p-3">RFQ Ref</th>
                      <th className="p-3">Item Details</th>
                      <th className="p-3 text-right">Quantity</th>
                      <th className="p-3 text-right">Total (USD)</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Release Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {profile.previous_orders.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-slate-400">No purchase order logs recorded.</td>
                      </tr>
                    ) : (
                      profile.previous_orders.map((po, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-700">{po.po_number}</td>
                          <td className="p-3 text-slate-500">{po.rfq_number}</td>
                          <td className="p-3 font-medium text-slate-800">{po.item_name}</td>
                          <td className="p-3 text-right text-slate-600">{po.quantity}</td>
                          <td className="p-3 text-right font-semibold text-slate-800">${po.total_amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                              po.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' :
                              po.status === 'Delayed' ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'
                            }`}>
                              {po.status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-400">{po.date}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
