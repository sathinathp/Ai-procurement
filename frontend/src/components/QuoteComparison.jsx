import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, Upload, CheckCircle, Sparkles, AlertCircle, 
  ArrowRight, FileText, Check, ShieldCheck, ShoppingCart, RefreshCw
} from 'lucide-react';
import { comparisonService, rfqService, supplierService } from '../services/api';

export default function QuoteComparison({ activeRfqNum }) {
  const [rfqs, setRfqs] = useState([]);
  const [selectedRfqNum, setSelectedRfqNum] = useState('');
  const [comparison, setComparison] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  
  // Extracting Quote state
  const [uploading, setUploading] = useState(false);
  const [extractedMetrics, setExtractedMetrics] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [loadingComp, setLoadingComp] = useState(false);
  
  // PO generation state
  const [generatingPo, setGeneratingPo] = useState(false);
  const [poResult, setPoResult] = useState(null);

  useEffect(() => {
    // Fetch RFQs in response received / sent / comparison status
    rfqService.getAll().then((res) => {
      const filtered = activeRfqNum 
        ? res.data.filter(r => r.rfq_number === activeRfqNum)
        : res.data;
      
      setRfqs(filtered);
      
      if (filtered.length > 0) {
        setSelectedRfqNum(filtered[0].rfq_number);
      } else if (activeRfqNum) {
        // Fallback placeholder if the selected active RFQ is not in the list response
        const mockRfq = { rfq_number: activeRfqNum, item_name: 'Selected RFQ', quantity: 100, unit: 'Units' };
        setRfqs([mockRfq]);
        setSelectedRfqNum(activeRfqNum);
      }
    });

    supplierService.getAll().then((res) => {
      // Filter to only include suppliers synced to ERP
      const erpOnly = res.data.filter(s => s.synced_to_erp || s.erp_vendor_id);
      setSuppliers(erpOnly);
      if (erpOnly.length > 0) {
        setSelectedSupplierId(String(erpOnly[0].id));
      }
    });
  }, [activeRfqNum]);

  useEffect(() => {
    if (selectedRfqNum) {
      fetchComparison();
      comparisonService.getPO(selectedRfqNum)
        .then((res) => {
          if (res.data && res.data.po) {
            setPoResult(res.data.po.po_number);
          } else {
            setPoResult(null);
          }
        })
        .catch(err => console.error("Error fetching PO:", err));
    }
  }, [selectedRfqNum]);

  const fetchComparison = () => {
    setLoadingComp(true);
    setPoResult(null);
    comparisonService.viewComparison(selectedRfqNum)
      .then((res) => {
        setComparison(res.data);
        setLoadingComp(false);
      })
      .catch((err) => {
        console.error(err);
        setLoadingComp(false);
      });
  };

  const handleQuoteUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !selectedSupplierId) return;

    setUploading(true);
    setSuccessMsg('');
    setExtractedMetrics(null);

    comparisonService.uploadQuote(selectedRfqNum, selectedSupplierId, file)
      .then((res) => {
        setExtractedMetrics(res.data.extracted_metrics);
        setUploading(false);
      })
      .catch((err) => {
        console.error(err);
        alert('Failed to parse quote. Try again.');
        setUploading(false);
      });
  };

  const handleSaveQuote = () => {
    if (!extractedMetrics) return;

    comparisonService.saveQuote(selectedRfqNum, selectedSupplierId, extractedMetrics)
      .then((res) => {
        setSuccessMsg('Supplier quotation successfully logged!');
        setExtractedMetrics(null);
        fetchComparison();
        setTimeout(() => setSuccessMsg(''), 3000);
      })
      .catch((err) => {
        console.error(err);
        alert('Failed to save quotation.');
      });
  };

  const handleApprove = () => {
    comparisonService.approveRecommendation(selectedRfqNum)
      .then((res) => {
        setSuccessMsg('Supplier selection approved!');
        fetchComparison();
        setTimeout(() => setSuccessMsg(''), 3000);
      });
  };

  const handleGeneratePO = () => {
    if (!comparison || !comparison.recommendation.supplier) return;
    setGeneratingPo(true);
    
    comparisonService.generatePO(selectedRfqNum, comparison.recommendation.supplier)
      .then((res) => {
        setPoResult(res.data.po_number);
        setGeneratingPo(false);
        setSuccessMsg('Purchase order generated successfully!');
        fetchComparison();
        setTimeout(() => setSuccessMsg(''), 4000);
      })
      .catch((err) => {
        console.error(err);
        setGeneratingPo(false);
      });
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-6">
      
      {/* Toast Success Alert */}
      {successMsg && (
        <div className="fixed top-4 right-4 bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-bounce">
          <CheckCircle size={20} />
          <span className="text-sm font-semibold">{successMsg}</span>
        </div>
      )}

      {/* Header and selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Quote Comparison Matrix</h1>
          <p className="text-xs text-slate-500 mt-1">Upload incoming supplier quotes, extract pricing parameters, and review AI recommendation criteria.</p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-650 shrink-0">
          <span>Active RFQ:</span>
          <select 
            value={selectedRfqNum}
            onChange={(e) => setSelectedRfqNum(e.target.value)}
            className="copilot-input py-1.5 bg-slate-100 text-slate-500 cursor-not-allowed"
            disabled={true}
          >
            {rfqs.map((r, i) => (
              <option key={i} value={r.rfq_number}>
                {r.rfq_number} — {r.item_name} ({r.quantity} {r.unit})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Quote OCR Uploader */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <FileSpreadsheet size={16} className="text-[#0078d4]" />
              <h3 className="text-sm font-semibold text-slate-800">Upload Supplier Quotation</h3>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex flex-col">
                <label className="font-semibold text-slate-600 mb-1">Select Supplier *</label>
                <select 
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="copilot-input"
                >
                  {suppliers.map((s, i) => (
                    <option key={i} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Upload Drag box */}
              <div className="border-2 border-dashed border-slate-350 hover:border-[#0078d4] rounded-xl p-5 text-center cursor-pointer bg-slate-50 hover:bg-blue-50/20 transition-all relative">
                <input 
                  type="file" 
                  onChange={handleQuoteUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".pdf,.docx,.xlsx,.xls,.txt"
                  disabled={uploading}
                />
                <Upload className="mx-auto text-slate-400 mb-2" size={24} />
                <span className="text-xs font-semibold text-slate-700 block">Click to upload quotation</span>
                <span className="text-[10px] text-slate-450 block mt-1">PDF, Excel, Word or invoice text</span>
              </div>

              {/* Demo Quotes Fast Download Links */}
              <div className="pt-2 pb-1 border-t border-slate-150 mt-2">
                <span className="block font-bold text-slate-500 uppercase tracking-wider text-[8.5px] mb-2">Download Demo Quotes to Test OCR:</span>
                
                <div className="space-y-2">
                  <div>
                    <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1">Dosing Pumps:</span>
                    <div className="grid grid-cols-2 gap-1">
                      <a 
                        href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/campaign/download-mock-quote?supplier=Budget%20Pumps%20Inc&category=dosing_pumps`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-slate-100 hover:bg-blue-50 hover:text-[#0078d4] p-1.5 rounded border border-slate-200 hover:border-blue-200 text-[8.5px] font-semibold transition-all flex items-center justify-between"
                      >
                        <span>Budget Pumps</span>
                        <span className="text-[7.5px] bg-red-100 text-red-600 px-1 rounded font-bold">PDF</span>
                      </a>
                      <a 
                        href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/campaign/download-mock-quote?supplier=Munich%20Dosing%20Systems&category=dosing_pumps`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-slate-100 hover:bg-blue-50 hover:text-[#0078d4] p-1.5 rounded border border-slate-200 hover:border-blue-200 text-[8.5px] font-semibold transition-all flex items-center justify-between"
                      >
                        <span>Munich Dos.</span>
                        <span className="text-[7.5px] bg-emerald-100 text-emerald-600 px-1 rounded font-bold">XLSX</span>
                      </a>
                      <a 
                        href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/campaign/download-mock-quote?supplier=Houston%20Pump%20Solutions&category=dosing_pumps`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-slate-100 hover:bg-blue-50 hover:text-[#0078d4] p-1.5 rounded border border-slate-200 hover:border-blue-200 text-[8.5px] font-semibold transition-all flex items-center justify-between"
                      >
                        <span>Houston Pump</span>
                        <span className="text-[7.5px] bg-red-100 text-red-650 px-1 rounded font-bold">PDF</span>
                      </a>
                      <a 
                        href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/campaign/download-mock-quote?supplier=Tokyo%20Precision%20Flow&category=dosing_pumps`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-slate-100 hover:bg-blue-50 hover:text-[#0078d4] p-1.5 rounded border border-slate-200 hover:border-blue-200 text-[8.5px] font-semibold transition-all flex items-center justify-between"
                      >
                        <span>Tokyo Flow</span>
                        <span className="text-[7.5px] bg-red-100 text-red-650 px-1 rounded font-bold">PDF</span>
                      </a>
                    </div>
                  </div>

                  <div>
                    <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1">Polymers / Materials:</span>
                    <div className="grid grid-cols-2 gap-1">
                      <a 
                        href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/campaign/download-mock-quote?supplier=Al-Khobar%20Plastics&category=polymers`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-slate-100 hover:bg-blue-50 hover:text-[#0078d4] p-1.5 rounded border border-slate-200 hover:border-blue-200 text-[8.5px] font-semibold transition-all flex items-center justify-between"
                      >
                        <span>Al-Khobar</span>
                        <span className="text-[7.5px] bg-red-100 text-red-650 px-1 rounded font-bold">PDF</span>
                      </a>
                      <a 
                        href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/campaign/download-mock-quote?supplier=BASF%20Middle%20East&category=polymers`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-slate-100 hover:bg-blue-50 hover:text-[#0078d4] p-1.5 rounded border border-slate-200 hover:border-blue-200 text-[8.5px] font-semibold transition-all flex items-center justify-between"
                      >
                        <span>BASF ME</span>
                        <span className="text-[7.5px] bg-emerald-100 text-emerald-650 px-1 rounded font-bold">XLSX</span>
                      </a>
                      <a 
                        href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/campaign/download-mock-quote?supplier=SABIC%20Polymers&category=polymers`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-slate-100 hover:bg-blue-50 hover:text-[#0078d4] p-1.5 rounded border border-slate-200 hover:border-blue-200 text-[8.5px] font-semibold transition-all flex items-center justify-between"
                      >
                        <span>SABIC Poly.</span>
                        <span className="text-[7.5px] bg-red-100 text-red-650 px-1 rounded font-bold">PDF</span>
                      </a>
                      <a 
                        href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/campaign/download-mock-quote?supplier=Borouge&category=polymers`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-slate-100 hover:bg-blue-50 hover:text-[#0078d4] p-1.5 rounded border border-slate-200 hover:border-blue-200 text-[8.5px] font-semibold transition-all flex items-center justify-between"
                      >
                        <span>Borouge</span>
                        <span className="text-[7.5px] bg-red-100 text-red-650 px-1 rounded font-bold">PDF</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {uploading && (
                <div className="ai-thinking-shimmer p-3.5 rounded-lg border border-blue-200 flex items-center gap-2.5">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#0078d4] shrink-0"></div>
                  <span className="text-xs font-semibold text-[#106ebe]">AI is extracting pricing and delivery terms...</span>
                </div>
              )}

              {/* Parsed Metrics Review Form */}
              {extractedMetrics && (
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                  <div className="flex items-center gap-1 text-[#0078d4] font-semibold text-xs pb-1 border-b border-slate-200">
                    <Sparkles size={14} />
                    <span>AI Extracted Parameters</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-medium text-slate-600">
                    <div>
                      <span className="text-slate-400 block">Price</span>
                      <input 
                        type="number" 
                        value={extractedMetrics.price}
                        onChange={(e) => setExtractedMetrics({...extractedMetrics, price: parseFloat(e.target.value)})}
                        className="copilot-input py-1 text-[10px] w-full font-bold mt-0.5"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block">Currency</span>
                      <input 
                        type="text" 
                        value={extractedMetrics.currency}
                        onChange={(e) => setExtractedMetrics({...extractedMetrics, currency: e.target.value})}
                        className="copilot-input py-1 text-[10px] w-full mt-0.5"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block">Lead Time (Days)</span>
                      <input 
                        type="number" 
                        value={extractedMetrics.lead_time_days}
                        onChange={(e) => setExtractedMetrics({...extractedMetrics, lead_time_days: parseInt(e.target.value)})}
                        className="copilot-input py-1 text-[10px] w-full mt-0.5"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block">MOQ</span>
                      <input 
                        type="number" 
                        value={extractedMetrics.moq}
                        onChange={(e) => setExtractedMetrics({...extractedMetrics, moq: parseFloat(e.target.value)})}
                        className="copilot-input py-1 text-[10px] w-full mt-0.5"
                      />
                    </div>
                  </div>

                  <div className="text-[10px] font-medium text-slate-600 space-y-2">
                    <div>
                      <span className="text-slate-400 block">Payment Terms</span>
                      <input 
                        type="text" 
                        value={extractedMetrics.payment_terms || ''}
                        onChange={(e) => setExtractedMetrics({...extractedMetrics, payment_terms: e.target.value})}
                        className="copilot-input py-1 text-[10px] w-full mt-0.5"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block">Incoterms</span>
                      <input 
                        type="text" 
                        value={extractedMetrics.incoterms || ''}
                        onChange={(e) => setExtractedMetrics({...extractedMetrics, incoterms: e.target.value})}
                        className="copilot-input py-1 text-[10px] w-full mt-0.5"
                      />
                    </div>
                  </div>

                  <button 
                    type="button"
                    onClick={handleSaveQuote}
                    className="w-full copilot-btn-primary py-2 text-xs mt-2"
                  >
                    Confirm & Save Quotation
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Right Columns: Comparison Table & AI Recommendation */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Comparison Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-800">Side-by-Side Comparison</h3>
              {loadingComp && <span className="animate-spin text-slate-400">🌀</span>}
            </div>

            {loadingComp ? (
              <div className="p-16 text-center text-slate-400 text-xs">Loading comparison details...</div>
            ) : !comparison || comparison.quotes.length === 0 ? (
              <div className="p-16 text-center text-slate-400 text-xs">
                No quotations logged for this RFQ yet. Use the uploader sidebar to parse quotes.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase">
                      <th className="p-3 border-r border-slate-100 w-[140px]">Metric Terms</th>
                      {comparison.quotes.map((q, i) => (
                        <th key={i} className="p-3 border-r border-slate-100 text-center font-bold text-slate-800">
                          {q.supplier_name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                    
                    {/* Price Row */}
                    <tr>
                      <td className="p-3 bg-slate-50 border-r border-slate-200/60 font-semibold">Price per unit</td>
                      {comparison.quotes.map((q, i) => {
                        const prices = comparison.quotes.map(c => c.price);
                        const isLowest = q.price === Math.min(...prices);
                        return (
                          <td key={i} className={`p-3 text-center border-r border-slate-100 font-bold ${
                            isLowest ? 'bg-emerald-50 text-emerald-700' : 'text-slate-800'
                          }`}>
                            {q.currency} {q.price.toFixed(2)}
                            {isLowest && <span className="text-[9px] block text-emerald-600 font-semibold">Lowest Price</span>}
                          </td>
                        );
                      })}
                    </tr>

                    {/* Lead Time */}
                    <tr>
                      <td className="p-3 bg-slate-50 border-r border-slate-200/60 font-semibold">Lead Time</td>
                      {comparison.quotes.map((q, i) => {
                        const times = comparison.quotes.map(c => c.lead_time_days);
                        const isFastest = q.lead_time_days === Math.min(...times);
                        return (
                          <td key={i} className={`p-3 text-center border-r border-slate-100 ${
                            isFastest ? 'bg-blue-50 text-[#0078d4] font-bold' : ''
                          }`}>
                            {q.lead_time_days} days
                          </td>
                        );
                      })}
                    </tr>

                    {/* MOQ */}
                    <tr>
                      <td className="p-3 bg-slate-50 border-r border-slate-200/60 font-semibold">MOQ (Minimum Qty)</td>
                      {comparison.quotes.map((q, i) => (
                        <td key={i} className="p-3 text-center border-r border-slate-100">{q.moq} units</td>
                      ))}
                    </tr>

                    {/* Payment terms */}
                    <tr>
                      <td className="p-3 bg-slate-50 border-r border-slate-200/60 font-semibold">Payment Terms</td>
                      {comparison.quotes.map((q, i) => (
                        <td key={i} className="p-3 text-center border-r border-slate-100 text-slate-700">{q.payment_terms || 'N/A'}</td>
                      ))}
                    </tr>

                    {/* Incoterms */}
                    <tr>
                      <td className="p-3 bg-slate-50 border-r border-slate-200/60 font-semibold">Incoterms</td>
                      {comparison.quotes.map((q, i) => (
                        <td key={i} className="p-3 text-center border-r border-slate-100 text-slate-700">{q.incoterms || 'N/A'}</td>
                      ))}
                    </tr>

                    {/* Warranty */}
                    <tr>
                      <td className="p-3 bg-slate-50 border-r border-slate-200/60 font-semibold">Warranty</td>
                      {comparison.quotes.map((q, i) => (
                        <td key={i} className="p-3 text-center border-r border-slate-100">{q.warranty || 'N/A'}</td>
                      ))}
                    </tr>

                    {/* Validity */}
                    <tr>
                      <td className="p-3 bg-slate-50 border-r border-slate-200/60 font-semibold">Quote Validity</td>
                      {comparison.quotes.map((q, i) => (
                        <td key={i} className="p-3 text-center border-r border-slate-100 text-slate-400">{q.validity || 'N/A'}</td>
                      ))}
                    </tr>

                    {/* Scorecard ratings */}
                    <tr className="bg-slate-50/50">
                      <td className="p-3 bg-slate-50 border-r border-slate-200/60 font-semibold text-[#0078d4]">Supplier Delivery</td>
                      {comparison.quotes.map((q, i) => (
                        <td key={i} className="p-3 text-center border-r border-slate-100 font-bold text-slate-800">
                          {q.supplier_delivery_score}%
                        </td>
                      ))}
                    </tr>

                    <tr>
                      <td className="p-3 bg-slate-50 border-r border-slate-200/60 font-semibold text-amber-500">Supplier Rating</td>
                      {comparison.quotes.map((q, i) => (
                        <td key={i} className="p-3 text-center border-r border-slate-100 font-bold text-amber-600">
                          ★ {q.supplier_rating}
                        </td>
                      ))}
                    </tr>

                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* AI Recommendation card (Module 5) */}
          {comparison && comparison.quotes.length > 0 && (
            <div className="bg-gradient-to-br from-[#0078d4]/10 to-indigo-50 border border-blue-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-[#0078d4] font-bold text-sm">
                <Sparkles size={18} />
                <span>AI Recommendation block</span>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {comparison.recommendation.justification}
                </p>
                
                {poResult && (
                  <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg flex items-center justify-between text-emerald-800 text-xs font-semibold gap-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} />
                      <span>Issued Purchase Order: <b>{poResult}</b> for <b>{comparison.recommendation.supplier}</b>.</span>
                    </div>
                    <button
                      onClick={() => window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/purchase-orders/${poResult}/download`)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-[10px] font-bold shadow-sm transition-colors shrink-0"
                    >
                      Download PO PDF
                    </button>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              {comparison.recommendation.supplier !== 'N/A' && (
                <div className="flex justify-end gap-2.5 pt-2">
                  
                  {comparison.quotes.length > 0 && (
                    <button 
                      onClick={handleApprove}
                      className="copilot-btn-secondary text-xs px-4"
                    >
                      <Check size={14} className="text-emerald-600" /> Approve Selection
                    </button>
                  )}
                  
                  <button 
                    onClick={handleGeneratePO}
                    disabled={generatingPo || poResult !== null}
                    className={`bg-gradient-to-r from-[#0078d4] to-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-sm ${
                      (generatingPo || poResult !== null) ? 'opacity-40 cursor-not-allowed' : ''
                    }`}
                  >
                    <ShoppingCart size={14} /> 
                    {generatingPo ? 'Releasing PO...' : poResult ? 'PO Transmitted' : 'Generate Purchase Order (PO)'}
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
