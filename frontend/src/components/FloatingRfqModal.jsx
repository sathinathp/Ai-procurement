import React, { useState } from 'react';
import { 
  X, Upload, FileText, CheckCircle2, AlertTriangle, 
  RefreshCw, Sparkles, Send, Database, Plus, DollarSign, Zap, Check, TrendingUp
} from 'lucide-react';
import { rfqService, workflowService } from '../services/api';

export default function FloatingRfqModal({ isOpen, onClose, onRfqCreated }) {
  const [uploading, setUploading] = useState(false);
  const [isAiExtracted, setIsAiExtracted] = useState(false);
  const [showAiRecommendation, setShowAiRecommendation] = useState(false);
  const [missingFields, setMissingFields] = useState([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [stockWarningModal, setStockWarningModal] = useState(null);
  const [liveInventoryAudit, setLiveInventoryAudit] = useState(null);
  const [isAuditingInventory, setIsAuditingInventory] = useState(false);
  const [capitalOptimizationApplied, setCapitalOptimizationApplied] = useState(false);

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
    drawing_attachment: '',
    warranty_requirement: '',
    delivery_tolerance: ''
  });

  if (!isOpen) return null;

  // File Upload Document OCR extraction
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setIsAiExtracted(false);
    setShowAiRecommendation(false);
    setMissingFields([]);
    setErrorMsg('');
    setLiveInventoryAudit(null);
    setCapitalOptimizationApplied(false);

    rfqService.uploadAndExtract(file)
      .then(async (res) => {
        const { data, filename } = res.data;
        const initialQuantity = data.quantity || '';
        const initialUnit = data.unit || 'MT';
        const initialItemName = data.item_name || '';

        setFormData({
          rfq_number: data.rfq_number || 'RFQ-2026-TEMP',
          project_name: data.project_name || '',
          department: data.department || 'Procurement',
          required_date: data.required_date || '',
          item_name: initialItemName,
          item_code: data.item_code || '',
          description: data.description || '',
          quantity: initialQuantity,
          unit: initialUnit,
          specifications: data.specifications || '',
          priority: data.priority || 'Medium',
          delivery_location: data.delivery_location || 'Riyadh Warehouse',
          expected_delivery_date: data.expected_delivery_date || '',
          remarks: data.remarks || '',
          drawing_attachment: data.drawing_attachment || filename,
          warranty_requirement: data.warranty_requirement || '',
          delivery_tolerance: data.delivery_tolerance || ''
        });
        setMissingFields(data.missing_fields || []);
        setIsAiExtracted(true);
        setUploading(false);
        if (!data.warranty_requirement || !data.delivery_tolerance) {
          setShowAiRecommendation(true);
        }

        // Live Inventory Cross-Referencing & Working Capital Optimization
        if (initialItemName && initialQuantity) {
          setIsAuditingInventory(true);
          try {
            const invRes = await workflowService.validateMaterial({
              item_name: initialItemName,
              quantity: parseFloat(initialQuantity) || 0,
              unit: initialUnit
            });
            setLiveInventoryAudit(invRes.data);
          } catch (invErr) {
            console.error("Floating modal live inventory cross-reference failed:", invErr);
          } finally {
            setIsAuditingInventory(false);
          }
        }
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
        setTimeout(() => {
          setSuccessMsg('');
          onClose();
          if (onRfqCreated) {
            onRfqCreated(res.data.rfq_number);
          }
        }, 1500);
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

    // Stock Check Validation
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
    setStockWarningModal(null);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="space-y-0.5">
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Plus className="text-[#0078d4]" size={16} />
              Quick RFQ Generator
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">Create or upload a material request from any view.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
          
          {/* File Upload Area */}
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 hover:bg-slate-50/50 transition-colors relative flex flex-col items-center justify-center">
            {uploading ? (
              <div className="py-4 text-center space-y-2">
                <RefreshCw className="animate-spin text-[#0078d4] mx-auto" size={24} />
                <p className="text-xs text-slate-500 font-bold">Extracting drawing specs & BOM details using Vision AI...</p>
              </div>
            ) : (
              <>
                <Upload className="text-slate-400 mb-2" size={26} />
                <p className="text-xs font-bold text-slate-700">Drop RFQ drawing, Excel BOM, or PDF sheet here</p>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">Supported formats: PDF, JPG, PNG, XLSX. System automatically extracts fields.</p>
                <input 
                  type="file" 
                  onChange={handleFileUpload} 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                />
              </>
            )}
          </div>

          {/* AI Extraction Notification */}
          {isAiExtracted && (
            <div className="p-3 bg-indigo-50 border border-indigo-150 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-indigo-700 font-bold">
                <Sparkles size={14} className="animate-pulse" />
                <span>AI Parsing Complete</span>
              </div>
              <p className="text-[10px] text-indigo-600 leading-normal font-medium">
                Sourcing parameters extracted automatically. Please verify form details below.
              </p>
              {missingFields.length > 0 && (
                <div className="text-[9px] text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded">
                  ⚠️ Missing fields: {missingFields.join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Live Inventory Cross-Referencing & Capital Optimization Card */}
          {isAuditingInventory && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1 animate-pulse">
              <div className="flex items-center gap-2 text-blue-700 font-bold">
                <Database size={14} className="animate-spin" />
                <span>Checking Warehouse Inventory & Safety Thresholds...</span>
              </div>
              <p className="text-[10px] text-blue-600">Cross-referencing live ERP stocks for working capital optimization...</p>
            </div>
          )}

          {liveInventoryAudit && !isAuditingInventory && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#fff7ed] border border-amber-100 flex items-center justify-center shrink-0">
                    <svg className="w-5.5 h-5.5 text-[#d97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      <path d="M9 22V12h6v10"/>
                      <path d="M9 12h6"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">Live Warehouse ERP Audit</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Real-time stock & working capital validation</p>
                  </div>
                </div>
                <span className="bg-[#ffedd5] text-[#c2410c] text-[9px] font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider">
                  {liveInventoryAudit.alert_type === 'SURPLUS_ALERT' ? 'Surplus Alert' : liveInventoryAudit.alert_type === 'PARTIAL_SURPLUS_ALERT' ? 'Partial Surplus' : 'Deficit Verified'}
                </span>
              </div>

              {/* 3 Metric Columns */}
              <div className="grid grid-cols-3 gap-1.5 py-1 text-center">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">On-Hand Stock</span>
                  <span className="text-lg font-black text-slate-900 block mt-0.5">
                    {liveInventoryAudit.current_stock} {liveInventoryAudit.unit}
                  </span>
                </div>
                <div className="border-x border-slate-150">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Safety Buffer</span>
                  <span className="text-lg font-black text-slate-900 block mt-0.5">
                    {liveInventoryAudit.safety_stock} {liveInventoryAudit.unit}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Usable Surplus</span>
                  <span className="text-lg font-black text-[#ea580c] block mt-0.5">
                    {liveInventoryAudit.usable_surplus} {liveInventoryAudit.unit}
                  </span>
                </div>
              </div>

              {/* Potential Savings Highlight Banner */}
              {liveInventoryAudit.capital_lockup_prevented > 0 && (
                <div className="bg-[#ecfdf5] border border-emerald-100 rounded-xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#059669] text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-xs">
                      $
                    </div>
                    <div>
                      <span className="text-[9px] text-[#059669] font-extrabold uppercase tracking-wider block">Potential Savings</span>
                      <span className="text-xl font-black text-[#065f46] tracking-tight block">
                        ${liveInventoryAudit.capital_lockup_prevented.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (liveInventoryAudit.alert_type === 'SURPLUS_ALERT') {
                        setFormData(prev => ({ 
                          ...prev, 
                          quantity: '0', 
                          remarks: (prev.remarks ? prev.remarks + ' | ' : '') + `Fulfilled 100% from warehouse surplus (Saved $${liveInventoryAudit.capital_lockup_prevented?.toLocaleString()}).` 
                        }));
                      } else {
                        setFormData(prev => ({ 
                          ...prev, 
                          quantity: String(liveInventoryAudit.adjusted_quantity),
                          remarks: (prev.remarks ? prev.remarks + ' | ' : '') + `Downsized to ${liveInventoryAudit.adjusted_quantity} ${liveInventoryAudit.unit} due to surplus (Saved $${liveInventoryAudit.capital_lockup_prevented?.toLocaleString()}).` 
                        }));
                      }
                      setCapitalOptimizationApplied(true);
                    }}
                    className="text-xs font-bold text-[#065f46] hover:text-[#047857] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <TrendingUp size={14} />
                    <span>Optimize now</span>
                  </button>
                </div>
              )}

              {/* Bottom Action Row */}
              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                {capitalOptimizationApplied ? (
                  <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                    <Check size={12} className="text-emerald-600" />
                    <span>Requisition adjusted to {formData.quantity} {formData.unit}!</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 font-medium">
                    {liveInventoryAudit.alert_type === 'SURPLUS_ALERT' ? '100% stock available' : 'Surplus stock detected in ERP'}
                  </div>
                )}

                {liveInventoryAudit.alert_type === 'SURPLUS_ALERT' && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ 
                        ...prev, 
                        quantity: '0', 
                        remarks: (prev.remarks ? prev.remarks + ' | ' : '') + `Fulfilled 100% from warehouse surplus (Saved $${liveInventoryAudit.capital_lockup_prevented?.toLocaleString()}).` 
                      }));
                      setCapitalOptimizationApplied(true);
                    }}
                    className="px-4 py-2 bg-[#d97706] hover:bg-[#b45309] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
                  >
                    <Zap size={13} fill="currentColor" />
                    <span>Fulfill 100% from Stock</span>
                  </button>
                )}

                {liveInventoryAudit.alert_type === 'PARTIAL_SURPLUS_ALERT' && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ 
                        ...prev, 
                        quantity: String(liveInventoryAudit.adjusted_quantity),
                        remarks: (prev.remarks ? prev.remarks + ' | ' : '') + `Downsized to ${liveInventoryAudit.adjusted_quantity} ${liveInventoryAudit.unit} due to surplus (Saved $${liveInventoryAudit.capital_lockup_prevented?.toLocaleString()}).` 
                      }));
                      setCapitalOptimizationApplied(true);
                    }}
                    className="px-4 py-2 bg-[#d97706] hover:bg-[#b45309] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
                  >
                    <Zap size={13} fill="currentColor" />
                    <span>Auto-Adjust to {liveInventoryAudit.adjusted_quantity} {liveInventoryAudit.unit}</span>
                  </button>
                )}

                {liveInventoryAudit.alert_type === 'DEFICIT_VERIFIED' && (
                  <div className="flex items-center gap-1 text-xs text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl ml-auto">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    <span>Deficit Verified: Procurement Authorized</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {showAiRecommendation && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-2 text-amber-800 font-bold">
                <Sparkles size={14} className="text-amber-600 animate-pulse" />
                <span>AI Sourcing Recommendation</span>
              </div>
              <p className="text-[10px] text-amber-700 leading-normal font-medium">
                “Based on similar historical purchases, 12-month warranty and ±3-day delivery tolerance were previously used. Apply these?”
              </p>
              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      warranty_requirement: '12 Months',
                      delivery_tolerance: '±3 days'
                    }));
                    setMissingFields(prev => prev.filter(f => f !== 'Warranty requirement' && f !== 'Acceptable delivery tolerance'));
                    setShowAiRecommendation(false);
                  }}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-[10px] transition-colors shadow-sm"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => setShowAiRecommendation(false)}
                  className="px-3 py-1 border border-amber-300 text-amber-700 hover:bg-amber-100 font-bold rounded text-[10px] transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Success / Error States */}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-250 text-emerald-700 rounded-xl font-semibold flex items-center gap-2">
              <CheckCircle2 size={14} />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-250 text-rose-700 rounded-xl font-semibold flex items-center gap-2">
              <AlertTriangle size={14} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form Fields */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Project Name
                  {isAiExtracted && formData.project_name && (
                    <span className="ml-1.5 inline-flex items-center px-1 py-0.5 rounded text-[8px] font-bold bg-indigo-100 text-indigo-700">
                      Copilot Filled
                    </span>
                  )}
                </label>
                <input 
                  type="text" 
                  name="project_name"
                  value={formData.project_name} 
                  onChange={handleFormChange}
                  placeholder="e.g. Riyadh Metro Extension"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold bg-slate-50 focus:bg-white outline-none focus:border-[#0078d4] transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Item Name / Category *
                  {isAiExtracted && formData.item_name && (
                    <span className="ml-1.5 inline-flex items-center px-1 py-0.5 rounded text-[8px] font-bold bg-indigo-100 text-indigo-700">
                      Copilot Filled
                    </span>
                  )}
                </label>
                <input 
                  type="text" 
                  name="item_name"
                  value={formData.item_name} 
                  onChange={handleFormChange}
                  placeholder="e.g. PVC Resin, HDPE Granules"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold bg-slate-50 focus:bg-white outline-none focus:border-[#0078d4] transition-all"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Quantity *
                  {isAiExtracted && formData.quantity && (
                    <span className="ml-1.5 inline-flex items-center px-1 py-0.5 rounded text-[8px] font-bold bg-indigo-100 text-indigo-700">
                      Copilot Filled
                    </span>
                  )}
                </label>
                <input 
                  type="number" 
                  name="quantity"
                  value={formData.quantity} 
                  onChange={handleFormChange}
                  placeholder="e.g. 250"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold bg-slate-50 focus:bg-white outline-none focus:border-[#0078d4] transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Unit *</label>
                <select 
                  name="unit"
                  value={formData.unit} 
                  onChange={handleFormChange}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold bg-slate-50 focus:bg-white outline-none focus:border-[#0078d4] transition-all"
                >
                  <option value="MT">MT (Metric Tons)</option>
                  <option value="KG">KG (Kilograms)</option>
                  <option value="Rolls">Rolls</option>
                  <option value="Pcs">Pcs</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Priority</label>
                <select 
                  name="priority"
                  value={formData.priority} 
                  onChange={handleFormChange}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold bg-slate-50 focus:bg-white outline-none focus:border-[#0078d4] transition-all"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Required Delivery Date
                  {isAiExtracted && formData.required_date && (
                    <span className="ml-1.5 inline-flex items-center px-1 py-0.5 rounded text-[8px] font-bold bg-indigo-100 text-indigo-700">
                      Copilot Filled
                    </span>
                  )}
                </label>
                <input 
                  type="date" 
                  name="required_date"
                  value={formData.required_date} 
                  onChange={handleFormChange}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold bg-slate-50 focus:bg-white outline-none focus:border-[#0078d4] transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Delivery Destination
                  {isAiExtracted && formData.delivery_location && (
                    <span className="ml-1.5 inline-flex items-center px-1 py-0.5 rounded text-[8px] font-bold bg-indigo-100 text-indigo-700">
                      Copilot Filled
                    </span>
                  )}
                </label>
                <input 
                  type="text" 
                  name="delivery_location"
                  value={formData.delivery_location} 
                  onChange={handleFormChange}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold bg-slate-50 focus:bg-white outline-none focus:border-[#0078d4] transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Warranty Requirement
                  {isAiExtracted && formData.warranty_requirement && (
                    <span className="ml-1.5 inline-flex items-center px-1 py-0.5 rounded text-[8px] font-bold bg-indigo-100 text-indigo-700">
                      Copilot Filled
                    </span>
                  )}
                </label>
                <input 
                  type="text" 
                  name="warranty_requirement"
                  value={formData.warranty_requirement} 
                  onChange={handleFormChange}
                  placeholder="e.g. 12 Months"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold bg-slate-50 focus:bg-white outline-none focus:border-[#0078d4] transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Acceptable Delivery Tolerance
                  {isAiExtracted && formData.delivery_tolerance && (
                    <span className="ml-1.5 inline-flex items-center px-1 py-0.5 rounded text-[8px] font-bold bg-indigo-100 text-indigo-700">
                      Copilot Filled
                    </span>
                  )}
                </label>
                <input 
                  type="text" 
                  name="delivery_tolerance"
                  value={formData.delivery_tolerance} 
                  onChange={handleFormChange}
                  placeholder="e.g. ±3 days"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold bg-slate-50 focus:bg-white outline-none focus:border-[#0078d4] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Technical Specifications / Grade Details
                {isAiExtracted && formData.specifications && (
                  <span className="ml-1.5 inline-flex items-center px-1 py-0.5 rounded text-[8px] font-bold bg-indigo-100 text-indigo-700">
                    Copilot Filled
                  </span>
                )}
              </label>
              <textarea 
                name="specifications"
                rows={2}
                value={formData.specifications} 
                onChange={handleFormChange}
                placeholder="e.g. K-value 67, industrial grade, white powder..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold bg-slate-50 focus:bg-white outline-none focus:border-[#0078d4] transition-all resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 shrink-0">
              <button 
                type="button" 
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold rounded-lg transition-all"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-5 py-2 bg-[#0078d4] hover:bg-[#106ebe] text-white text-xs font-bold rounded-lg transition-all shadow-sm flex items-center gap-1"
              >
                <Send size={12} />
                <span>Save &amp; Publish RFQ</span>
              </button>
            </div>

          </form>

        </div>

      </div>

      {/* Stock Warning Modal Overlay */}
      {stockWarningModal && (
        <div className="fixed inset-0 bg-slate-900/70 z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-250 p-6 max-w-md w-full text-xs space-y-4">
            <div className="flex gap-3 items-start">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">AI Inventory Validation Alert</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Sufficient stock levels identified in local ERP inventory.</p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[11px] leading-relaxed text-amber-800">
              {stockWarningModal.message}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => handleResolveStockWarning('PROCEED')}
                className="px-3.5 py-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-100 rounded-lg font-bold"
              >
                Proceed Sourcing Anyway
              </button>
              <button
                type="button"
                onClick={() => handleResolveStockWarning('REDUCE')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-sm"
              >
                Adjust Quantity to Net Need
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
