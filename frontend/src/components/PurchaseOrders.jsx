import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, Search, Filter, Calendar, FileText, CheckCircle, 
  AlertCircle, RefreshCw, Download, Database, ChevronRight, Package, DollarSign, Mail
} from 'lucide-react';
import { purchaseOrderService, erpService } from '../services/api';

export default function PurchaseOrders() {
  const [pos, setPos] = useState([]);
  const [filteredPos, setFilteredPos] = useState([]);
  const [selectedPo, setSelectedPo] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [erpFilter, setErpFilter] = useState('All');
  
  // Actions state
  const [syncing, setSyncing] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);

  const fetchPOs = (selectFirst = false) => {
    setLoading(true);
    purchaseOrderService.getAll()
      .then((res) => {
        setPos(res.data);
        setFilteredPos(res.data);
        if (res.data.length > 0) {
          if (selectFirst || !selectedPo) {
            setSelectedPo(res.data[0]);
          } else {
            // Keep selected PO updated with fresh database values
            const updatedSelected = res.data.find(p => p.po_number === selectedPo.po_number);
            setSelectedPo(updatedSelected || res.data[0]);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching purchase orders:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPOs(true);
  }, []);

  // Apply search & filters
  useEffect(() => {
    let result = pos;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(po => 
        po.po_number.toLowerCase().includes(q) ||
        po.rfq_number.toLowerCase().includes(q) ||
        po.supplier_name.toLowerCase().includes(q) ||
        po.item_name.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'All') {
      result = result.filter(po => po.status === statusFilter);
    }

    if (erpFilter !== 'All') {
      const isSynced = erpFilter === 'Synced';
      result = result.filter(po => po.synced_to_erp === isSynced);
    }

    setFilteredPos(result);
  }, [searchQuery, statusFilter, erpFilter, pos]);

  const handleSyncToErp = () => {
    if (!selectedPo) return;
    setSyncing(true);
    setSyncMessage(null);

    erpService.sync('po', selectedPo.po_number)
      .then((res) => {
        setSyncing(false);
        setSyncMessage({ type: 'success', text: `Successfully synchronized PO ${selectedPo.po_number} to Microsoft Dynamics 365 & Odoo ERP!` });
        fetchPOs(false);
        setTimeout(() => setSyncMessage(null), 5000);
      })
      .catch((err) => {
        setSyncing(false);
        setSyncMessage({ type: 'error', text: `ERP Synchronization failed: ${err.response?.data?.detail || err.message}` });
        setTimeout(() => setSyncMessage(null), 5000);
      });
  };
  const handleSendEmail = () => {
    if (!selectedPo) return;
    setSendingEmail(true);
    setSyncMessage(null);

    purchaseOrderService.sendEmail(selectedPo.po_number)
      .then((res) => {
        setSendingEmail(false);
        setSyncMessage({ 
          type: 'success', 
          text: `Purchase Order ${selectedPo.po_number} successfully emailed to ${selectedPo.supplier_name} at ${res.data.recipient} with PDF attachment!` 
        });
        fetchPOs(false);
        setTimeout(() => setSyncMessage(null), 5000);
      })
      .catch((err) => {
        setSendingEmail(false);
        setSyncMessage({ 
          type: 'error', 
          text: `Email dispatch failed: ${err.response?.data?.detail || err.message}` 
        });
        setTimeout(() => setSyncMessage(null), 5000);
      });
  };

  const getStatusBadge = (status) => {
    const mapping = {
      Draft: 'bg-slate-100 text-slate-700 border-slate-200',
      Sent: 'bg-blue-50 text-blue-700 border-blue-200',
      Acknowledged: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      Delayed: 'bg-amber-50 text-amber-700 border-amber-200',
      Completed: 'bg-purple-50 text-purple-700 border-purple-200'
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${mapping[status] || 'bg-slate-50 border-slate-200 text-slate-600'}`}>
        {status}
      </span>
    );
  };

  const getFormattedDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const downloadPoPdf = (poNumber) => {
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
    window.open(`${apiBaseUrl}/api/purchase-orders/${poNumber}/download`);
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col h-full bg-slate-50/30">
      
      {/* Search & Filter Header Banner */}
      <div className="bg-white border-b border-slate-200 p-4 shrink-0 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCart className="text-emerald-500" /> Purchase Order Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Track, audit, download, and synchronize generated purchase orders with Dynamics 365 ERP.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Search PO#, RFQ#, Supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="copilot-input pl-8 py-1.5 text-xs w-full md:w-[220px]"
            />
          </div>

          {/* Filters */}
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="copilot-input py-1.5 text-xs"
          >
            <option value="All">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Sent">Sent</option>
            <option value="Acknowledged">Acknowledged</option>
            <option value="Delayed">Delayed</option>
            <option value="Completed">Completed</option>
          </select>

          <select 
            value={erpFilter}
            onChange={(e) => setErpFilter(e.target.value)}
            className="copilot-input py-1.5 text-xs"
          >
            <option value="All">All ERP States</option>
            <option value="Synced">Synced to ERP</option>
            <option value="Unsynced">Unsynced</option>
          </select>

          <button 
            onClick={() => fetchPOs(false)}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-55 transition-colors text-slate-650"
            title="Refresh List"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Split-Screen Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side Master List */}
        <div className="w-[360px] border-r border-slate-200 bg-white flex flex-col shrink-0">
          <div className="p-3 bg-slate-50/50 border-b border-slate-200 text-[10px] font-bold text-slate-450 uppercase tracking-wider flex justify-between">
            <span>Purchase Order List</span>
            <span>{filteredPos.length} Results</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <RefreshCw className="animate-spin mx-auto text-[#0078d4]" size={20} />
                <span>Loading PO history...</span>
              </div>
            ) : filteredPos.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 italic">
                No purchase orders matching filters.
              </div>
            ) : (
              filteredPos.map((po) => (
                <button
                  key={po.po_number}
                  onClick={() => setSelectedPo(po)}
                  className={`w-full text-left p-4 flex flex-col gap-1 transition-all ${
                    selectedPo?.po_number === po.po_number 
                      ? 'bg-blue-50/40 border-l-4 border-[#0078d4] font-medium' 
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-xs text-slate-800">{po.po_number}</span>
                    {getStatusBadge(po.status)}
                  </div>
                  <div className="text-[11px] font-bold text-slate-700 truncate">{po.supplier_name}</div>
                  <div className="text-[10px] text-slate-500 flex justify-between items-center mt-1">
                    <span>{po.item_name} ({po.quantity} MT)</span>
                    <span className="font-bold text-slate-900 font-mono">${po.total_amount.toLocaleString()}</span>
                  </div>
                  <div className="text-[9px] text-slate-400 flex justify-between items-center mt-1 pt-1 border-t border-slate-100/50">
                    <span className="flex items-center gap-1">
                      <Calendar size={10} /> {getFormattedDate(po.created_at)}
                    </span>
                    <span className={`font-bold flex items-center gap-1 ${po.synced_to_erp ? 'text-emerald-600' : 'text-slate-400'}`}>
                      <Database size={10} /> {po.synced_to_erp ? (po.erp_po_number || 'Synced') : 'Not Synced'}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Side Detail Viewer */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6 flex flex-col">
          {selectedPo ? (
            <div className="max-w-4xl w-full mx-auto space-y-6">
              
              {/* Sync Alert Message Toast */}
              {syncMessage && (
                <div className={`p-4 rounded-xl text-xs font-semibold border flex items-center gap-2.5 ${
                  syncMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  {syncMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                  <span>{syncMessage.text}</span>
                </div>
              )}

              {/* Purchase Order Header Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-[9px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                      Purchase Order Document
                    </span>
                    <h2 className="text-xl font-bold text-slate-800 font-mono mt-1.5 flex items-center gap-2">
                      {selectedPo.po_number}
                    </h2>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Created on {getFormattedDate(selectedPo.created_at)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleSendEmail}
                      disabled={sendingEmail}
                      className="flex items-center gap-1.5 border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 text-emerald-700 px-3.5 py-2 rounded-lg font-bold text-xs shadow-sm transition-all"
                    >
                      <Mail size={13} className={sendingEmail ? 'animate-pulse' : ''} />
                      <span>{sendingEmail ? 'Sending...' : 'Send via Email'}</span>
                    </button>

                    <button 
                      onClick={() => downloadPoPdf(selectedPo.po_number)}
                      className="flex items-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-lg font-bold text-xs shadow-sm transition-all"
                    >
                      <Download size={13} />
                      <span>Download PDF</span>
                    </button>
                    
                    <button 
                      onClick={handleSyncToErp}
                      disabled={syncing}
                      className="flex items-center gap-1.5 bg-[#0078d4] hover:bg-[#106ebe] disabled:opacity-50 text-white px-3.5 py-2 rounded-lg font-bold text-xs shadow-sm transition-all"
                    >
                      <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
                      <span>{syncing ? 'Syncing...' : 'Sync to Dynamics 365'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block font-semibold">RFQ Reference</span>
                    <span className="font-mono font-bold text-slate-800">{selectedPo.rfq_number}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Supplier Name</span>
                    <span className="font-bold text-slate-800">{selectedPo.supplier_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">ERP Integration Status</span>
                    <span className={`font-bold flex items-center gap-1.5 mt-0.5 ${selectedPo.synced_to_erp ? 'text-emerald-600' : 'text-slate-550'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedPo.synced_to_erp ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                      {selectedPo.synced_to_erp ? (
                        <span className="font-mono bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100 text-[10px] font-bold">
                          {selectedPo.erp_po_number || 'Synced'}
                        </span>
                      ) : (
                        'Unsynchronized'
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Overall PO Value</span>
                    <span className="font-bold text-slate-900 font-mono text-sm">${selectedPo.total_amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* PO Line Items Card */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                  <Package size={14} className="text-[#0078d4]" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Purchase Order Line Items</h3>
                </div>

                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-150">
                    <tr>
                      <th className="p-4 w-[60%]">Item Description</th>
                      <th className="p-4 text-center">Quantity</th>
                      <th className="p-4 text-right">Unit Price</th>
                      <th className="p-4 text-right">Total (USD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    <tr>
                      <td className="p-4 font-bold text-slate-800">
                        {selectedPo.item_name}
                        <span className="text-[10px] text-slate-400 block font-normal mt-0.5">Raw material supplied under agreement.</span>
                      </td>
                      <td className="p-4 text-center font-bold">{selectedPo.quantity} MT</td>
                      <td className="p-4 text-right font-mono">${selectedPo.unit_price.toFixed(2)}</td>
                      <td className="p-4 text-right font-bold font-mono text-slate-900">${selectedPo.total_amount.toLocaleString()}</td>
                    </tr>
                    <tr className="bg-slate-50/30">
                      <td colSpan="3" className="p-4 text-right font-bold text-slate-450 uppercase tracking-wider text-[10px]">Net Order Total:</td>
                      <td className="p-4 text-right font-bold font-mono text-sm text-[#0078d4]">${selectedPo.total_amount.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Status Milestone Timeline */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-1.5">
                  <FileText size={14} className="text-[#0078d4]" />
                  <span>Document Lifecycle Timeline</span>
                </h3>

                <div className="relative border-l border-slate-200 pl-6 ml-2 space-y-6">
                  
                  {/* Step 1 */}
                  <div className="relative">
                    <span className="absolute -left-[30px] top-0 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white ring-4 ring-emerald-50 shadow-sm flex items-center justify-center">
                      <CheckCircle size={10} className="text-white" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Purchase Order Released</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">PO generated autonomously from selection model and saved locally.</p>
                      <span className="text-[9px] text-slate-400 font-mono mt-1 block">{getFormattedDate(selectedPo.created_at)}</span>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="relative">
                    <span className="absolute -left-[30px] top-0 w-4 h-4 bg-blue-500 rounded-full border-2 border-white ring-4 ring-blue-50 shadow-sm flex items-center justify-center">
                      <CheckCircle size={10} className="text-white" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Email Dispatched to Supplier</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Emailed PO confirmation attachment to registered vendor email.</p>
                      <span className="text-[9px] text-slate-400 font-mono mt-1 block">{getFormattedDate(selectedPo.created_at)}</span>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="relative">
                    <span className={`absolute -left-[30px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${
                      selectedPo.synced_to_erp 
                        ? 'bg-emerald-500 ring-4 ring-emerald-50' 
                        : 'bg-slate-300 ring-4 ring-slate-100'
                    }`}>
                      <Database size={10} className="text-white" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Dynamics 365 ERP Sync Status</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {selectedPo.synced_to_erp 
                          ? 'Synchronized successfully. Headers and lines verified.' 
                          : 'Awaiting manual or background pipeline synchronization to Dynamics 365.'}
                      </p>
                      {selectedPo.synced_to_erp && (
                        <span className="text-[9px] text-slate-400 font-mono mt-1 block">Synchronized</span>
                      )}
                    </div>
                  </div>

                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 italic text-xs">
              <ShoppingCart size={40} className="text-slate-300 mb-2 stroke-1" />
              <span>Select a purchase order from the left to view details</span>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
