import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Database, RefreshCw, CheckCircle, MessageSquare, 
  TrendingDown, Send, FileText, ChevronDown, ChevronUp, 
  Award, AlertCircle, ArrowRight, User, Bot, Play, Layers, BarChart2
} from 'lucide-react';
import { rfqService, campaignService, erpService, comparisonService } from '../services/api';

export default function RfpCampaign() {
  const [rfqs, setRfqs] = useState([]);
  const [selectedRfqNum, setSelectedRfqNum] = useState('');
  const [currentRfq, setCurrentRfq] = useState(null);
  
  // Simulation states
  const [simulating, setSimulating] = useState(false);
  const [simStep, setSimStep] = useState(0); // 0=idle, 1=sending, 2=receiving, 3=negotiating, 4=shortlisted
  const [quoteProgress, setQuoteProgress] = useState(0);
  const [receivedCount, setReceivedCount] = useState(0);
  const [campaignResults, setCampaignResults] = useState(null);
  
  // Negotiation states
  const [activeNegotiationIdx, setActiveNegotiationIdx] = useState(0);
  
  // Sync states
  const [syncingPO, setSyncingPO] = useState(false);
  const [syncingVendor, setSyncingVendor] = useState(false);
  const [erpLogs, setErpLogs] = useState([]);
  const [selectedPO, setSelectedPO] = useState(null);
  const [activeErpLog, setActiveErpLog] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  
  // PO results
  const [poNumber, setPoNumber] = useState(null);
  const [poSynced, setPoSynced] = useState(false);
  const [vendorSynced, setVendorSynced] = useState({});

  useEffect(() => {
    fetchRfqs();
    fetchErpLogs();
  }, []);

  useEffect(() => {
    if (selectedRfqNum) {
      const found = rfqs.find(r => r.rfq_number === selectedRfqNum);
      setCurrentRfq(found);
      // Reset simulation state
      setSimStep(0);
      setCampaignResults(null);
      setPoNumber(null);
      setPoSynced(false);
      
      comparisonService.getPO(selectedRfqNum)
        .then(res => {
          if (res.data && res.data.po) {
            const po = res.data.po;
            setSelectedPO({
              po_number: po.po_number,
              supplier_id: po.supplier_id,
              supplier_name: po.supplier_name,
              rfq_number: po.rfq_number,
              item_name: po.item_name,
              quantity: po.quantity,
              price: po.unit_price,
              total_amount: po.total_amount
            });
            setPoNumber(po.po_number);
            setPoSynced(po.synced_to_erp);
            setVendorSynced(prev => ({ ...prev, [po.supplier_id]: po.synced_to_erp }));
          } else {
            setSelectedPO(null);
            setPoNumber(null);
            setPoSynced(false);
          }
        })
        .catch(err => {
          console.error("Error fetching RFQ PO:", err);
          setSelectedPO(null);
          setPoNumber(null);
          setPoSynced(false);
        });
    }
  }, [selectedRfqNum, rfqs]);

  const fetchRfqs = () => {
    rfqService.getAll().then(res => {
      setRfqs(res.data);
      if (res.data.length > 0) {
        setSelectedRfqNum(res.data[0].rfq_number);
      }
    });
  };

  const fetchErpLogs = () => {
    erpService.getLogs().then(res => {
      setErpLogs(res.data);
      if (res.data.length > 0) {
        setActiveErpLog(res.data[0]);
      }
    });
  };

  const triggerRfpCampaign = () => {
    if (!selectedRfqNum) return;
    setSimulating(true);
    setSimStep(1);
    setCampaignResults(null);
    setQuoteProgress(0);
    setReceivedCount(0);

    // Step 1: Send RFQ to 100 vendors animation
    setTimeout(() => {
      setSimStep(2);
      
      // Step 2: Receive 30 quotes incrementally
      const interval = setInterval(() => {
        setQuoteProgress(prev => {
          const next = prev + 10;
          setReceivedCount(Math.min(30, Math.floor((next / 100) * 30)));
          if (next >= 100) {
            clearInterval(interval);
            
            // Call API to run back-end logic
            campaignService.simulate(selectedRfqNum).then(res => {
              setCampaignResults(res.data);
              
              // Step 3: Show Negotiation
              setSimStep(3);
              setSimulating(false);
            }).catch(err => {
              console.error(err);
              alert("Simulation failed.");
              setSimulating(false);
              setSimStep(0);
            });
          }
          return next;
        });
      }, 250);
    }, 1500);
  };

  const handleCreatePO = (supplierName) => {
    comparisonService.generatePO(selectedRfqNum, supplierName).then(res => {
      setPoNumber(res.data.po_number);
      setSuccessMsg(`PO ${res.data.po_number} successfully created!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      
      // Select PO for ERP sync panel
      setSelectedPO({
        po_number: res.data.po_number,
        supplier_id: campaignResults.shortlist.find(s => s.supplier_name === supplierName)?.supplier_id,
        supplier_name: supplierName,
        rfq_number: selectedRfqNum,
        item_name: currentRfq?.item_name,
        quantity: currentRfq?.quantity,
        price: campaignResults.shortlist.find(s => s.supplier_name === supplierName)?.price
      });
      
      // Proceed to shortlisting finished state
      setSimStep(4);
    });
  };

  const syncVendorToERP = (supplierId) => {
    setSyncingVendor(true);
    erpService.sync('vendor', supplierId).then(res => {
      setVendorSynced(prev => ({ ...prev, [supplierId]: true }));
      setSyncingVendor(false);
      setSuccessMsg(`Vendor VEND-${String(supplierId).padStart(4, '0')} synced with Dynamics 365!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchErpLogs();
    }).catch(err => {
      console.error(err);
      setSyncingVendor(false);
    });
  };

  const syncPoToERP = (poNum) => {
    setSyncingPO(true);
    erpService.sync('po', poNum).then(res => {
      setPoSynced(true);
      setSyncingPO(false);
      setSuccessMsg(`Purchase Order ${poNum} synced with Dynamics 365 Finance & Operations!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchErpLogs();
    }).catch(err => {
      console.error(err);
      setSyncingPO(false);
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-900 text-slate-100 flex flex-col xl:flex-row gap-6">
      
      {/* Toast Alert */}
      {successMsg && (
        <div className="fixed top-4 right-4 bg-[#107c41] text-white px-4 py-3 rounded-lg shadow-2xl z-50 flex items-center gap-2 animate-bounce border border-emerald-500">
          <CheckCircle size={20} />
          <span className="text-sm font-semibold">{successMsg}</span>
        </div>
      )}

      {/* Left panel - Campaign Simulation Workspace */}
      <div className="flex-1 space-y-6">
        
        {/* Header Block */}
        <div className="bg-gradient-to-r from-slate-850 to-slate-800 border border-slate-700 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-500/10 text-amber-500 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Campaign Mode</span>
              <span className="text-[10px] text-slate-500 font-semibold">• 100 Vendor Cohort</span>
            </div>
            <h1 className="text-2xl font-black text-white mt-1">RFP Campaign & AI Shortlist</h1>
            <p className="text-xs text-slate-400 mt-1">Simulate sending an RFQ to 100 suppliers, collecting 30 quotes, AI negotiating terms, and compiling a shortlist scorecard.</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-slate-400">Target RFQ:</span>
            <select 
              value={selectedRfqNum}
              onChange={(e) => setSelectedRfqNum(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-[#0078d4]"
              disabled={simulating}
            >
              {rfqs.map((r, i) => (
                <option key={i} value={r.rfq_number}>
                  {r.rfq_number} — {r.item_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Setup / Trigger Section */}
        {simStep === 0 && (
          <div className="bg-slate-850 border border-slate-700 rounded-2xl p-8 text-center space-y-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#0078d4]/5 rounded-full blur-3xl -z-10"></div>
            
            <div className="mx-auto w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 shadow-md">
              <Layers size={28} className="text-amber-500" />
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <h2 className="text-lg font-bold text-white">Initialize Broad Supplier Outreach</h2>
              <p className="text-xs text-slate-400">
                This will trigger an RFP campaign inviting **100 matching suppliers** from Neproplast's database to quote for **{currentRfq?.quantity} {currentRfq?.unit}** of **{currentRfq?.item_name}**.
              </p>
            </div>

            <div className="max-w-lg mx-auto bg-slate-900 border border-slate-850 p-4 rounded-xl text-left grid grid-cols-2 gap-4 text-xs font-medium text-slate-400">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Item & Code</span>
                <span className="text-slate-200">{currentRfq?.item_name} ({currentRfq?.item_code || 'N/A'})</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Requirement Qty</span>
                <span className="text-slate-200">{currentRfq?.quantity} {currentRfq?.unit}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Target Date</span>
                <span className="text-slate-200">{currentRfq?.delivery_deadline ? new Date(currentRfq.delivery_deadline).toLocaleDateString() : 'Immediate'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Supplier Scope</span>
                <span className="text-amber-400 font-bold">100+ Registered Vendors</span>
              </div>
            </div>

            <button 
              onClick={triggerRfpCampaign}
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-xs px-8 py-3 rounded-xl shadow-lg hover:opacity-90 transition-opacity flex items-center gap-2 mx-auto"
            >
              <Play size={14} fill="currentColor" /> Launch RFP Campaign (100 Vendors)
            </button>
          </div>
        )}

        {/* Simulating Progress Screen */}
        {simulating && (
          <div className="bg-slate-850 border border-slate-700 rounded-2xl p-8 space-y-6 shadow-xl relative">
            <div className="flex items-center gap-3">
              <RefreshCw className="animate-spin text-amber-500" size={20} />
              <div>
                <h3 className="text-sm font-bold text-white">RFP Simulation Underway</h3>
                <p className="text-xs text-slate-400">Neproplast AI Agent driving broad vendor campaign</p>
              </div>
            </div>

            <div className="space-y-4">
              {simStep === 1 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-amber-400">Stage 1: Launching Outreach Campaign</span>
                    <span className="text-slate-500">Transmitting RFQ Packets...</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 animate-pulse" style={{ width: '60%' }}></div>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Inviting: Reliance Polymers, Sabic, Borouge, Jubail Petrochemicals, Shell Chemicals, PetroChina, QAPCO...
                  </div>
                </div>
              )}

              {simStep === 2 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-amber-400">Stage 2: Receiving Quotations ({receivedCount} / 30)</span>
                    <span className="text-white">{quoteProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-[#0078d4] transition-all duration-300" style={{ width: `${quoteProgress}%` }}></div>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    [INFO] Connection established with vendor portal API. Logged quote response from supplier #{receivedCount}...
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Results Screen */}
        {simStep >= 3 && campaignResults && (
          <div className="space-y-6">
            
            {/* Step 3: AI Negotiation Console */}
            <div className="bg-slate-850 border border-slate-700 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-750 pb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="text-indigo-400" size={18} />
                  <h3 className="text-sm font-bold text-white">AI Agent Negotiation Logs</h3>
                  <span className="text-[9px] bg-indigo-500/10 text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-500/20">5 Target Sessions</span>
                </div>
                <span className="text-xs text-slate-400 font-medium">Auto-negotiated best price/terms</span>
              </div>

              {/* Chat tabs */}
              <div className="flex gap-1.5 overflow-x-auto pb-1.5">
                {campaignResults.negotiations.map((n, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveNegotiationIdx(i)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors ${
                      activeNegotiationIdx === i 
                        ? 'bg-indigo-650 text-white border border-indigo-500' 
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-750'
                    }`}
                  >
                    {n.supplier_name}
                  </button>
                ))}
              </div>

              {/* Chat view */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 h-[240px] overflow-y-auto space-y-4 flex flex-col font-medium text-xs">
                {campaignResults.negotiations[activeNegotiationIdx]?.chat_history.map((msg, i) => (
                  <div key={i} className={`flex gap-3 max-w-[85%] ${msg.role === 'assistant' ? 'self-start' : 'self-end flex-row-reverse'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border shadow-sm ${
                      msg.role === 'assistant' ? 'bg-[#0078d4]/10 border-blue-500/20 text-[#0078d4]' : 'bg-slate-850 border-slate-700 text-slate-400'
                    }`}>
                      {msg.role === 'assistant' ? <Bot size={12} /> : <User size={12} />}
                    </div>
                    <div className={`p-3 rounded-2xl whitespace-pre-line leading-relaxed ${
                      msg.role === 'assistant' ? 'bg-slate-850 text-slate-200 rounded-tl-none' : 'bg-indigo-950 text-indigo-100 rounded-tr-none border border-indigo-900/40'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>

              {/* Price summary stats */}
              <div className="bg-slate-800/40 border border-slate-750 p-3.5 rounded-xl flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5">
                  <TrendingDown className="text-emerald-500" size={16} />
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Negotiation Impact</span>
                    <span className="text-white font-bold">
                      Original: <span className="line-through text-slate-500">${campaignResults.negotiations[activeNegotiationIdx]?.original_price}</span> → Negotiated: <span className="text-emerald-400 font-black">${campaignResults.negotiations[activeNegotiationIdx]?.negotiated_price}</span>
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Payment terms</span>
                  <span className="text-indigo-300 font-bold">Upgraded to Net 45 Days</span>
                </div>
              </div>

            </div>

            {/* Step 4: AI Shortlist Scorecard */}
            <div className="bg-slate-850 border border-slate-700 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-750 pb-3">
                <Award className="text-amber-500" size={18} />
                <h3 className="text-sm font-bold text-white">AI-Shortlisted Bidders (Top 3 of 30)</h3>
                <span className="text-xs text-slate-400 font-medium ml-auto">Ranked by weighted criteria score</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {campaignResults.shortlist.map((s, i) => (
                  <div key={i} className={`bg-slate-900 border rounded-xl p-4.5 space-y-3.5 relative overflow-hidden flex flex-col justify-between ${
                    i === 0 ? 'border-amber-500/50 shadow-amber-500/5' : 'border-slate-750'
                  }`}>
                    {i === 0 && (
                      <div className="absolute top-0 right-0 bg-amber-500 text-slate-900 text-[8px] font-black uppercase px-2 py-0.5 rounded-bl">
                        Rank #1 Best Bid
                      </div>
                    )}
                    
                    <div>
                      <div className="text-slate-400 font-bold text-[10px] uppercase">Rank #{i+1} — {s.country}</div>
                      <h4 className="text-sm font-bold text-white truncate mt-0.5">{s.supplier_name}</h4>
                      
                      {/* Weighted Score */}
                      <div className="flex items-baseline gap-1 mt-2">
                        <span className="text-2xl font-black text-white">{s.weighted_score}</span>
                        <span className="text-[10px] text-slate-500">/ 100 score</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs border-t border-b border-slate-800/80 py-2.5 my-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Negotiated Price</span>
                        <span className="font-bold text-white">${s.price} / unit</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Delivery lead time</span>
                        <span className="font-bold text-amber-400">{s.lead_time} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Risk Profile</span>
                        <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                          s.risk_level === 'Low' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>{s.risk_level} Risk</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleCreatePO(s.supplier_name)}
                      disabled={poNumber !== null}
                      className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 ${
                        poNumber 
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                          : i === 0 
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md' 
                            : 'bg-slate-800 text-slate-200 hover:bg-slate-750'
                      }`}
                    >
                      {poNumber && selectedPO?.supplier_name === s.supplier_name ? 'PO Created' : 'Approve & Release PO'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Right panel - Dynamics ERP Sync Dashboard */}
      <div className="w-full xl:w-[420px] bg-slate-850 border border-slate-700 rounded-2xl p-5 shadow-xl flex flex-col shrink-0 space-y-5">
        
        <div className="border-b border-slate-750 pb-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Database className="text-[#0078d4]" size={18} />
            <h2 className="text-sm font-bold text-white">Dynamics 365 ERP Gateway</h2>
          </div>
          <span className="text-[9px] bg-[#107c41]/10 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">OData Live</span>
        </div>

        {/* Sync trigger card */}
        {selectedPO ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3.5">
            <div>
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[9px] bg-blue-500/10 text-blue-400 font-bold px-2 py-0.5 rounded border border-blue-500/20">Pending Sync PO</span>
                  <h3 className="text-xs font-black text-white mt-1.5">{selectedPO.po_number}</h3>
                </div>
                <button
                  onClick={() => window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/purchase-orders/${selectedPO.po_number}/download`)}
                  className="bg-[#0078d4] hover:bg-[#005a9e] text-white text-[10px] font-bold px-2.5 py-1 rounded transition-colors shrink-0"
                >
                  Download PO PDF
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5">{selectedPO.supplier_name} • {selectedPO.item_name} ({selectedPO.quantity} units)</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              
              <button
                onClick={() => syncVendorToERP(selectedPO.supplier_id)}
                disabled={syncingVendor || vendorSynced[selectedPO.supplier_id]}
                className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all text-[11px] ${
                  vendorSynced[selectedPO.supplier_id]
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-slate-800 hover:bg-slate-750 text-white border border-slate-700'
                }`}
              >
                {syncingVendor ? <RefreshCw className="animate-spin" size={12} /> : null}
                {vendorSynced[selectedPO.supplier_id] ? 'Vendor Synced' : 'Sync Vendor ID'}
              </button>

              <button
                onClick={() => syncPoToERP(selectedPO.po_number)}
                disabled={syncingPO || poSynced || !vendorSynced[selectedPO.supplier_id]}
                className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all text-[11px] ${
                  poSynced
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : !vendorSynced[selectedPO.supplier_id]
                      ? 'bg-slate-800/40 text-slate-500 cursor-not-allowed border border-slate-800'
                      : 'bg-gradient-to-r from-[#0078d4] to-blue-600 hover:opacity-90 text-white'
                }`}
              >
                {syncingPO ? <RefreshCw className="animate-spin" size={12} /> : null}
                {poSynced ? 'PO Synced' : 'Sync PO Headers'}
              </button>
            </div>
            
            {!vendorSynced[selectedPO.supplier_id] && (
              <p className="text-[9px] text-amber-500 flex items-center gap-1">
                <AlertCircle size={10} />
                Must sync vendor record to Dynamics ERP prior to PO header transmission.
              </p>
            )}
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center text-xs text-slate-500 space-y-1">
            <Database size={20} className="mx-auto text-slate-600 mb-1" />
            <p className="font-bold text-slate-400">No active PO released yet</p>
            <p className="text-[10px]">Approve a bidder in the left panel to trigger Dynamics ERP synchronization.</p>
          </div>
        )}

        {/* Transaction logs */}
        <div className="flex-1 flex flex-col space-y-2.5">
          <div className="flex justify-between items-center text-xs font-bold text-slate-400">
            <span>OData REST API Payload Monitor</span>
            <button onClick={fetchErpLogs} className="hover:text-white" title="Refresh API log history">
              <RefreshCw size={12} />
            </button>
          </div>

          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col overflow-hidden h-[300px]">
            {/* Logs List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-800/40">
              {erpLogs.map((log, i) => (
                <button
                  key={i}
                  onClick={() => setActiveErpLog(log)}
                  className={`w-full text-left p-2 rounded transition-colors text-[10px] flex items-center justify-between font-mono ${
                    activeErpLog?.id === log.id 
                      ? 'bg-slate-800 border-l-2 border-[#0078d4]' 
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  <div className="truncate pr-2">
                    <span className="text-slate-500 font-bold block text-[8px] uppercase">{log.timestamp}</span>
                    <span className="font-bold text-white uppercase">{log.method}</span> <span className="text-slate-400">{log.object_type === 'po' ? 'PurchaseOrder' : 'Vendors'}</span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded font-bold scale-90 ${
                    log.status_code === 201 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  }`}>{log.status_code}</span>
                </button>
              ))}
              {erpLogs.length === 0 && (
                <div className="text-center text-[10px] text-slate-650 py-12">No Dynamics OData payloads transmitted yet.</div>
              )}
            </div>

            {/* Active log details */}
            {activeErpLog && (
              <div className="h-[210px] border-t border-slate-800 pt-3 mt-2 flex flex-col overflow-hidden text-[9px] font-mono">
                <div className="flex justify-between items-center text-[8px] uppercase font-bold text-slate-500 pb-1.5 border-b border-slate-850">
                  <span>Endpoint Request / Response Payloads</span>
                  <span>ID: #{activeErpLog.id}</span>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-2 pt-2 pr-1 scrollbar-thin">
                  <div>
                    <span className="text-blue-400 font-bold block">[URL]</span>
                    <span className="text-slate-300 break-all">{activeErpLog.url}</span>
                  </div>
                  <div>
                    <span className="text-amber-500 font-bold block">[Request Payload]</span>
                    <pre className="text-slate-400 bg-slate-950 p-2 rounded text-[9px] overflow-x-auto">
                      {JSON.stringify(activeErpLog.request_payload, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <span className="text-emerald-400 font-bold block">[Response Payload]</span>
                    <pre className="text-slate-400 bg-slate-950 p-2 rounded text-[9px] overflow-x-auto">
                      {JSON.stringify(activeErpLog.response_payload, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
