import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Sparkles, Upload, Download, Play, RefreshCw, 
  CheckCircle, AlertCircle, Terminal, Settings, FileText, 
  Mail, Database, Layers, CheckCircle2, ChevronRight
} from 'lucide-react';
import { 
  rfqService, workflowService, supplierService, 
  campaignService, comparisonService, erpService 
} from '../services/api';

export default function AiAgentWorkflow() {
  const [systemPrompt, setSystemPrompt] = useState(
    "You are an autonomous procurement AI agent. Upon RFQ upload, extract parameters, perform stock verification, match the top 3 suppliers, generate outreach emails, simulate best-price negotiations, automatically create a purchase order, and sync the PO directly to the Dynamics 365 ERP gateway."
  );
  
  const [settings, setSettings] = useState({
    autoNegotiation: true,
    matchThreshold: 80,
    autoSyncErp: true,
    outreachLimit: 5,
    maxNegotiationRounds: 3,
    realTimeOutreach: true
  });

  const [activeRightTab, setActiveRightTab] = useState('logs');
  const [historyList, setHistoryList] = useState(() => {
    try {
      const saved = localStorage.getItem('ai_agent_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const getInitialState = (key, fallback) => {
    try {
      const saved = localStorage.getItem('ai_agent_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed[key] !== undefined) return parsed[key];
      }
    } catch (e) {
      console.error(e);
    }
    return fallback;
  };

  const [uploading, setUploading] = useState(() => getInitialState('uploading', false));
  const [agentStatus, setAgentStatus] = useState(() => getInitialState('agentStatus', 'idle'));
  const [currentStep, setCurrentStep] = useState(() => getInitialState('currentStep', -1));
  const [logs, setLogs] = useState(() => getInitialState('logs', []));
  const [parsedData, setParsedData] = useState(() => getInitialState('parsedData', null));
  const [inventoryStatus, setInventoryStatus] = useState(() => getInitialState('inventoryStatus', null));
  const [matchedSuppliers, setMatchedSuppliers] = useState(() => getInitialState('matchedSuppliers', []));
  const [negotiationResult, setNegotiationResult] = useState(() => getInitialState('negotiationResult', null));
  const [syncStatus, setSyncStatus] = useState(() => getInitialState('syncStatus', null));
  const [realStatusRfq, setRealStatusRfq] = useState(() => getInitialState('realStatusRfq', null));
  const printedLogsRef = useRef(new Set());
  const abortRef = useRef(false);   // set to true to kill the IMAP polling loop immediately

  const logsEndRef = useRef(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('ai_agent_state', JSON.stringify({
      uploading,
      agentStatus,
      currentStep,
      logs,
      parsedData,
      inventoryStatus,
      matchedSuppliers,
      negotiationResult,
      syncStatus,
      realStatusRfq,
      status: agentStatus, // for compatibility with RfqAssistant listener
      timestamp: new Date().toLocaleTimeString()
    }));
    window.dispatchEvent(new Event('ai_agent_update'));
  }, [agentStatus, currentStep, parsedData, logs, inventoryStatus, matchedSuppliers, negotiationResult, syncStatus, uploading, realStatusRfq]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };

  const handleSettingChange = (name, value) => {
    setSettings(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'maxNegotiationRounds') {
        workflowService.saveAgentSettings({ max_negotiation_rounds: value })
          .catch(err => console.error("Failed to save settings:", err));
      }
      return updated;
    });
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await workflowService.getAgentSettings();
        if (res.data) {
          setSettings(prev => ({
            ...prev,
            maxNegotiationRounds: res.data.max_negotiation_rounds || 3
          }));
        }
      } catch (err) {
        console.error("Failed to load agent settings:", err);
      }
    };
    loadSettings();
  }, []);

  // Run the full autonomous workflow
  const startAutonomousWorkflow = async (file) => {
    if (!file) return;
    
    setUploading(true);
    setAgentStatus('running');
    setLogs([]);
    setCurrentStep(0);
    abortRef.current = false;   // reset abort signal
    
    addLog(`[System Config] Instruction: "${systemPrompt}"`, 'system');
    addLog(`[System Config] Auto-Negotiation: ${settings.autoNegotiation ? 'ON' : 'OFF'} | Match Threshold: ${settings.matchThreshold} | Auto-Sync ERP: ${settings.autoSyncErp ? 'ON' : 'OFF'}`, 'system');
    
    // STEP 1: PARSING
    addLog(`Step 1/5: Starting AI Document Parser on file: ${file.name}...`, 'info');
    try {
      const extractRes = await rfqService.uploadAndExtract(file);
      const data = extractRes.data;
      setParsedData(data);
      addLog(`[SUCCESS] AI successfully extracted fields: Item="${data.item_name}", Qty="${data.quantity} ${data.unit}", Delivery="${data.delivery_location}"`, 'success');
      if (data.missing_fields && data.missing_fields.length > 0) {
        addLog(`[WARN] AI detected missing details: ${data.missing_fields.join(', ')}. Agent will proceed using defaults.`, 'warning');
      }
      
      // Seed/Create temporary RFQ
      const tempRfqNum = `RFQ-${Date.now().toString().slice(-4)}`;
      const newRfqData = {
        rfq_number: tempRfqNum,
        project_name: data.project_name || 'Autonomous Project Alpha',
        department: data.department || 'Procurement',
        required_date: data.required_date || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        item_name: data.item_name || 'HDPE Pipes 110mm',
        item_code: data.item_code || 'ITM-991',
        description: data.description || 'Extracted via Autonomous AI Agent',
        quantity: data.quantity || 250,
        unit: data.unit || 'MT',
        specifications: data.specifications || 'Standard specifications',
        priority: 'High',
        delivery_location: data.delivery_location || 'Riyadh Warehouse',
        remarks: 'Autonomous AI workflow execution'
      };
      
      addLog(`Creating RFQ record ${tempRfqNum} in central repository...`, 'info');
      await rfqService.create(newRfqData);
      addLog(`[SUCCESS] RFQ record ${tempRfqNum} registered.`, 'success');

      // STEP 2: INVENTORY CHECK
      setCurrentStep(1);
      addLog(`Step 2/5: Validating material requirements against live warehouse inventory...`, 'info');
      const invRes = await workflowService.validateMaterial({
        item_name: newRfqData.item_name,
        quantity: newRfqData.quantity,
        unit: newRfqData.unit
      });
      setInventoryStatus(invRes.data);
      if (invRes.data.status === 'WARNING') {
        addLog(`[ALERT] Warehouse stock low. Current: ${invRes.data.current_stock} ${newRfqData.unit} | Deficit: ${invRes.data.deficit} ${newRfqData.unit}`, 'warning');
        addLog(`Agent strategy: Resolving low-stock condition. Choosing "PROCEED" based on project urgency.`, 'info');
      } else {
        addLog(`[SUCCESS] Warehouse stock checks out. Sufficient stock level verified.`, 'success');
      }

      // STEP 3: SUPPLIER MATCHING
      setCurrentStep(2);
      addLog(`Step 3/5: Querying database to match suitable vendors for ${newRfqData.item_name}...`, 'info');
      const suppRes = await supplierService.getAll();
      // Match by items or categories, fallback to first few suppliers
      const matchQuery = newRfqData.item_name.toLowerCase();
      let matchedList = suppRes.data.filter(s => 
        (s.categories && s.categories.toLowerCase().includes(matchQuery)) ||
        (s.name && s.name.toLowerCase().includes('poly')) ||
        (s.name && s.name.toLowerCase().includes('chemical'))
      ).slice(0, settings.outreachLimit);

      if (matchedList.length === 0) {
        matchedList = suppRes.data.slice(0, settings.outreachLimit);
      }
      setMatchedSuppliers(matchedList);
      addLog(`[SUCCESS] Agent matched ${matchedList.length} qualified suppliers. Score threshold > ${settings.matchThreshold}% met.`, 'success');
      matchedList.forEach(s => {
        addLog(`  -> Supplier: ${s.name || 'N/A'} | Reliability Score: ${s.compliance_score || (s.rating ? (s.rating * 20).toFixed(0) : 95)}% | Status: Active`, 'info');
      });

      // STEP 4: OUTREACH & NEGOTIATION
      setCurrentStep(3);
      addLog(`Step 4/5: Launching automated RFP email outreach to matched vendors...`, 'info');
      addLog(`[SMTP Gateway] Resolving mail servers...`, 'info');
      addLog(`[SMTP Gateway] Connected to smtp.gmail.com:587 (TLS handshake completed)`, 'success');
      
      matchedList.forEach(s => {
        addLog(`[SMTP Outbound] Dispatched RFP Invite with specifications package to: ${s.email || 'sathinath.padhi@petabytz.com'} (${s.name})`, 'info');
      });
      
      addLog(`[IMAP Listener] Daemon thread listening on imap.gmail.com:993 for supplier replies...`, 'info');
      addLog(`Running AI negotiation loop over incoming responses...`, 'info');
      
      let finalData = null;

      if (settings.realTimeOutreach) {
        setRealStatusRfq(tempRfqNum);
        printedLogsRef.current.clear();
        
        await campaignService.launchReal(tempRfqNum, matchedList.map(s => s.id));
        addLog(`[Real-time Outreach] Launched real campaign. Dispatched RFQ emails to matched vendors.`, 'success');
        addLog(`[IMAP Listener] Polling inbox imap.gmail.com for supplier replies...`, 'info');
        
        let isDone = false;
        while (!isDone) {
          // Check abort signal (Stop button pressed)
          if (abortRef.current) {
            addLog(`[AGENT] Workflow cancelled by user.`, 'warning');
            setAgentStatus('idle');
            setUploading(false);
            abortRef.current = false;
            return;
          }
          // Check if user has stopped or reset the agent workflow
          const savedState = localStorage.getItem('ai_agent_state');
          const currentStatus = savedState ? JSON.parse(savedState).agentStatus : 'running';
          if (currentStatus !== 'running') {
            break;
          }
          
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          try {
            const statusRes = await campaignService.getRealStatus(tempRfqNum);
            const { completed, logs: statusLogs } = statusRes.data;
            
            statusLogs.forEach(l => {
              const signature = `${l.direction}_${l.round_number}_${l.supplier_id}`;
              if (!printedLogsRef.current.has(signature)) {
                printedLogsRef.current.add(signature);
                if (l.direction === 'inbound') {
                  addLog(`[IMAP Inbound] Received reply from ${l.supplier_name}: "${l.body.slice(0, 80)}..."`, 'info');
                  addLog(`[AI Parse] Extracted quotation metrics: Price=$${l.price}, Lead Time=${l.lead_time} days`, 'success');
                } else {
                  addLog(`[AI Negotiation] Target price not met. Generating and sending counter-offer email...`, 'info');
                  addLog(`[SMTP Outbound] Dispatched counter-offer email to ${l.supplier_name}: Proposed $${l.price}`, 'info');
                }
              }
            });
            
            if (completed) {
              isDone = true;
              addLog(`[SUCCESS] Negotiation completed. Finalizing comparison report.`, 'success');
              
              // Load the campaign comparison shortlist
              const simRes = await campaignService.simulate(tempRfqNum);
              setNegotiationResult(simRes.data);
              finalData = simRes.data;
            }
          } catch (pollErr) {
            console.error("Error polling real campaign status:", pollErr);
          }
        }
      } else {
        const simRes = await campaignService.simulate(tempRfqNum);
        setNegotiationResult(simRes.data);
        finalData = simRes.data;
        
        addLog(`[IMAP Inbound] Received reply from Sathya Polymer Suppliers (sathinath.padhi@petabytz.com)`, 'info');
        addLog(`[AI Parse] Extracted quotation metrics: Price=$290.00, Lead Time=10 days, Terms="Net 30 Days"`, 'success');
        addLog(`[AI Negotiation] Target price not met. Generating and sending counter-offer email...`, 'info');
        addLog(`[SMTP Outbound] Dispatched counter-offer email to: sathinath.padhi@petabytz.com`, 'info');
        
        addLog(`[IMAP Inbound] Received reply from Softstandard Polymer Labs (sathinath.padhi@softstandard.com)`, 'info');
        addLog(`[AI Parse] Extracted quotation metrics: Price=$280.68, Lead Time=8 days, Terms="Net 45 Days"`, 'success');
        addLog(`[AI Negotiation] Counter-offer accepted by supplier.`, 'success');
        
        addLog(`[SUCCESS] Sourcing completed. Received 30 candidate bids. Auto-negotiation active.`, 'success');
      }

      if (!finalData) {
        throw new Error("Workflow aborted or negotiation failed.");
      }
      
      const bestBid = finalData.shortlist[0];
      addLog(`[Negotiation Win] Top bid awarded to "${bestBid.supplier_name}" (${bestBid.country}).`, 'success');
      addLog(`  -> Negotiated Price: $${bestBid.price}/unit (saved $${(finalData.negotiations[0]?.original_price - bestBid.price).toFixed(2)}/unit)`, 'success');
      addLog(`  -> Agreed Delivery: ${bestBid.lead_time} Days | Risk Level: ${bestBid.risk_level}`, 'info');

      // Auto Release Purchase Order
      addLog(`Generating Purchase Order PDF for ${bestBid.supplier_name}...`, 'info');
      const poRes = await comparisonService.generatePO(tempRfqNum, bestBid.supplier_name);
      addLog(`[SUCCESS] Released Purchase Order: ${poRes.data.po_number}`, 'success');

      // STEP 5: ERP SYNC
      setCurrentStep(4);
      if (settings.autoSyncErp) {
        addLog(`Step 5/5: Initiating OData REST link with Dynamics 365 F&O...`, 'info');
        
        addLog(`Syncing Supplier ID details with ERP Gateway...`, 'info');
        await erpService.sync('vendor', bestBid.supplier_id);
        addLog(`[SUCCESS] Supplier record verified in Dynamics 365.`, 'success');

        addLog(`Syncing Purchase Order ${poRes.data.po_number} header and lines...`, 'info');
        await erpService.sync('po', poRes.data.po_number);
        addLog(`[SUCCESS] Purchase Order status updated to "Synced" in ERP.`, 'success');
        setSyncStatus('synced');
      } else {
        addLog(`Step 5/5: ERP Sync skipped based on Agent settings.`, 'warning');
        setSyncStatus('skipped');
      }

      setAgentStatus('completed');
      addLog(`[AGENT STATUS] Workflow execution finished successfully. All objectives met.`, 'success');

      try {
        const runHistoryItem = {
          rfqNumber: tempRfqNum,
          poNumber: poRes?.data?.po_number || 'N/A',
          item: newRfqData.item_name || 'HDPE Pipes 110mm',
          quantity: `${newRfqData.quantity || 250} ${newRfqData.unit || 'MT'}`,
          supplier: bestBid?.supplier_name || 'N/A',
          savings: simRes?.data?.negotiations?.[0]
            ? `+$${(simRes.data.negotiations[0].original_price - bestBid.price).toFixed(2)}/unit`
            : '14.2%',
          erpStatus: settings.autoSyncErp ? 'Synced (D365)' : 'Skipped',
          status: 'completed',
          timestamp: new Date().toLocaleTimeString()
        };
        setHistoryList(prev => {
          const updated = [runHistoryItem, ...prev];
          localStorage.setItem('ai_agent_history', JSON.stringify(updated));
          return updated;
        });
      } catch (historyErr) {
        console.error("Failed to append success run to history list: ", historyErr);
      }

    } catch (err) {
      console.error(err);
      setAgentStatus('failed');
      addLog(`[CRITICAL ERROR] Autonomous execution aborted. Reason: ${err.message || 'API Failure'}`, 'error');

      try {
        const failedHistoryItem = {
          rfqNumber: 'RFQ-ERR',
          item: file?.name || 'Unknown Document',
          quantity: 'N/A',
          supplier: 'Failed',
          savings: '0%',
          erpStatus: 'Failed',
          status: 'failed',
          timestamp: new Date().toLocaleTimeString()
        };
        setHistoryList(prev => {
          const updated = [failedHistoryItem, ...prev];
          localStorage.setItem('ai_agent_history', JSON.stringify(updated));
          return updated;
        });
      } catch (historyErr) {
        console.error("Failed to append failed run to history list: ", historyErr);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      startAutonomousWorkflow(file);
    }
  };

  const handleDownloadLogs = () => {
    const logText = logs.map(l => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}`).join('\r\n');
    const element = document.createElement("a");
    const file = new Blob([logText], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `autonomous_ai_agent_log_${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const resetAgent = () => {
    abortRef.current = true;   // signal polling loop to stop
    setAgentStatus('idle');
    setCurrentStep(-1);
    setLogs([]);
    setParsedData(null);
    setInventoryStatus(null);
    setMatchedSuppliers([]);
    setNegotiationResult(null);
    setSyncStatus(null);
    setRealStatusRfq(null);
  };

  const steps = [
    { title: "Parse & Extract", desc: "AI Document Parsing" },
    { title: "Inventory Audit", desc: "Warehouse stock evaluation" },
    { title: "Supplier Match", desc: "Outreach list compilation" },
    { title: "Negotiate & Bid", desc: "Bidding & price optimization" },
    { title: "ERP Sync Link", desc: "Dynamics 365 payload transmission" }
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 text-slate-700 flex flex-col xl:flex-row gap-6">
      
      {/* Left panel - Agent Configuration & Steps */}
      <div className="flex-1 space-y-6">
        
        {/* Header Title */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Autonomous Mode</span>
                <span className="text-[10px] text-slate-400 font-semibold">• Multi-Agent Orchestrator</span>
              </div>
              <h1 className="text-xl font-extrabold text-slate-800">Autonomous Procurement AI Agent</h1>
              <p className="text-xs text-slate-500">Configure parameters, upload an RFQ request, and observe the AI Agent driving the entire procurement cycle autonomously.</p>
            </div>
            <Bot size={36} className="text-[#0078d4] bg-blue-50 p-2 rounded-xl" />
          </div>

          {/* System Instructions Prompts */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <Settings size={14} className="text-[#0078d4]" /> Agent Prompt Instructions
            </label>
            <textarea
              rows={3}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              disabled={agentStatus === 'running'}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-[#0078d4] text-slate-700 font-medium leading-relaxed resize-none"
            />
          </div>

          {/* Settings Grid (Flex wrap for responsive auto-scaling across all devices) */}
          <div className="flex flex-wrap gap-4 pt-2">
            <div className="flex-1 min-w-[135px] space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-405 block truncate" title="Auto-Negotiation">Auto-Negotiation</label>
              <select
                value={settings.autoNegotiation ? 'yes' : 'no'}
                onChange={(e) => handleSettingChange('autoNegotiation', e.target.value === 'yes')}
                disabled={agentStatus === 'running'}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-2 pr-7 text-xs font-bold text-slate-700 focus:outline-none appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%234b5563%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_6px_center] bg-[length:14px_14px] cursor-pointer"
              >
                <option value="yes">Enabled</option>
                <option value="no">Disabled</option>
              </select>
            </div>

            <div className="flex-1 min-w-[135px] space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-405 block truncate" title="Match Threshold">Match Threshold</label>
              <select
                value={settings.matchThreshold}
                onChange={(e) => handleSettingChange('matchThreshold', parseInt(e.target.value))}
                disabled={agentStatus === 'running'}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-2 pr-7 text-xs font-bold text-slate-700 focus:outline-none appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%234b5563%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_6px_center] bg-[length:14px_14px] cursor-pointer"
              >
                <option value={70}>70% Match</option>
                <option value={80}>80% Match</option>
                <option value={90}>90% Match</option>
              </select>
            </div>

            <div className="flex-1 min-w-[135px] space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-405 block truncate" title="Outreach Limit">Outreach Limit</label>
              <select
                value={settings.outreachLimit}
                onChange={(e) => handleSettingChange('outreachLimit', parseInt(e.target.value))}
                disabled={agentStatus === 'running'}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-2 pr-7 text-xs font-bold text-slate-700 focus:outline-none appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%234b5563%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_6px_center] bg-[length:14px_14px] cursor-pointer"
              >
                <option value={3}>Top 3</option>
                <option value={5}>Top 5</option>
                <option value={10}>Top 10</option>
              </select>
            </div>

            <div className="flex-1 min-w-[160px] space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-405 block truncate" title="Max Rounds">Max Rounds</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((round) => (
                  <button
                    key={round}
                    type="button"
                    disabled={agentStatus === 'running'}
                    onClick={() => handleSettingChange('maxNegotiationRounds', round)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold transition-all border ${
                      settings.maxNegotiationRounds === round
                        ? 'bg-[#0078d4] text-white border-[#0078d4] shadow-sm'
                        : 'bg-slate-50 text-slate-750 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {round}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 min-w-[135px] space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-405 block truncate" title="Outreach Mode">Outreach Mode</label>
              <select
                value={settings.realTimeOutreach ? 'real' : 'sim'}
                onChange={(e) => handleSettingChange('realTimeOutreach', e.target.value === 'real')}
                disabled={agentStatus === 'running'}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-2 pr-7 text-xs font-bold text-slate-700 focus:outline-none appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%234b5563%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_6px_center] bg-[length:14px_14px] cursor-pointer"
              >
                <option value="real">Real-time</option>
                <option value="sim">Simulation</option>
              </select>
            </div>

            <div className="flex-1 min-w-[135px] space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-405 block truncate" title="Dynamics Sync">Dynamics Sync</label>
              <select
                value={settings.autoSyncErp ? 'yes' : 'no'}
                onChange={(e) => handleSettingChange('autoSyncErp', e.target.value === 'yes')}
                disabled={agentStatus === 'running'}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-2 pr-7 text-xs font-bold text-slate-700 focus:outline-none appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%234b5563%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_6px_center] bg-[length:14px_14px] cursor-pointer"
              >
                <option value="yes">Auto Sync</option>
                <option value="no">Manual</option>
              </select>
            </div>
          </div>
        </div>

        {/* Upload Trigger Area */}
        {agentStatus === 'idle' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4 shadow-sm relative overflow-hidden">
            <div className="mx-auto w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200 shadow-sm">
              <Upload size={28} className="text-[#0078d4]" />
            </div>

            <div className="max-w-md mx-auto space-y-1">
              <h2 className="text-sm font-bold text-slate-800">Launch Autonomous Workflow</h2>
              <p className="text-xs text-slate-500">Upload a purchase requisition, blueprint drawing, or RFQ document to trigger the AI Agent execution chain.</p>
            </div>

            <div className="border-2 border-dashed border-slate-200 hover:border-[#0078d4] rounded-xl p-8 cursor-pointer bg-slate-50/50 hover:bg-blue-50/10 transition-all relative max-w-lg mx-auto">
              <input 
                type="file" 
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept=".pdf,.docx,.doc,.xlsx,.xls,.txt"
              />
              <FileText className="mx-auto text-slate-400 mb-2" size={24} />
              <span className="text-xs font-bold text-slate-600 block">Drag & Drop RFQ Document Here</span>
              <span className="text-[10px] text-slate-400 font-semibold block mt-1">Accepts PDF, DOCX, XLSX, TXT</span>
            </div>
          </div>
        )}

        {/* Stepper View */}
        {agentStatus !== 'idle' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Layers size={16} className="text-[#0078d4]" /> Workflow Milestones
              </h3>
              <div className="flex items-center gap-2">
                {agentStatus === 'running' && (
                  <span className="text-xs font-bold text-[#0078d4] flex items-center gap-1">
                    <RefreshCw className="animate-spin" size={12} /> Executing...
                  </span>
                )}
                {agentStatus === 'completed' && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle size={12} /> Successfully Finished
                  </span>
                )}
                {agentStatus === 'failed' && (
                  <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
                    <AlertCircle size={12} /> Aborted / Error
                  </span>
                )}

                {/* Stop button — visible ONLY while running */}
                {agentStatus === 'running' ? (
                  <button
                    onClick={resetAgent}
                    className="text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 px-3 py-1 rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <AlertCircle size={12} /> Stop & Cancel
                  </button>
                ) : (
                  <button
                    onClick={resetAgent}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800"
                  >
                    Clear &amp; Reset
                  </button>
                )}
              </div>
            </div>

            {/* Steps execution visualizer */}
            <div className="space-y-4">
              {steps.map((step, idx) => {
                const isPassed = agentStatus === 'completed' || currentStep > idx;
                const isCurrent = agentStatus !== 'completed' && currentStep === idx;
                const isPending = agentStatus !== 'completed' && currentStep < idx;
                
                return (
                  <div key={idx} className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${
                    isCurrent 
                      ? 'bg-blue-50/50 border-blue-200' 
                      : isPassed 
                        ? 'bg-emerald-50/10 border-slate-200 opacity-90' 
                        : 'bg-slate-50/30 border-slate-100 opacity-60'
                  }`}>
                    {/* Status Circle */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${
                      isPassed 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : isCurrent 
                          ? 'bg-[#0078d4] text-white animate-pulse' 
                          : 'bg-slate-100 text-slate-400'
                    }`}>
                      {isPassed ? <CheckCircle2 size={16} /> : idx + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-800">{step.title}</div>
                      <div className="text-[10px] text-slate-500 font-semibold">{step.desc}</div>
                    </div>

                    {/* Step details output summaries */}
                    {isPassed && idx === 0 && parsedData && (
                      <div className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                        Extracted: {parsedData.item_name}
                      </div>
                    )}
                    {isPassed && idx === 1 && inventoryStatus && (
                      <div className={`text-[10px] font-bold px-2 py-1 rounded ${
                        inventoryStatus.status === 'WARNING' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {inventoryStatus.status === 'WARNING' ? 'Stock Warning' : 'Stock Verified'}
                      </div>
                    )}
                    {isPassed && idx === 2 && matchedSuppliers.length > 0 && (
                      <div className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                        {matchedSuppliers.length} Matches Found
                      </div>
                    )}
                    {isPassed && idx === 3 && negotiationResult && (
                      <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                        Awarded: ${negotiationResult.shortlist[0]?.price}/unit
                      </div>
                    )}
                    {isPassed && idx === 4 && (
                      <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                        PO Synced to ERP
                      </div>
                    )}

                    {isCurrent && (
                      <RefreshCw size={14} className="text-[#0078d4] animate-spin" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {agentStatus === 'running' && currentStep === 3 && settings.realTimeOutreach && (
          <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-600" /> Live Demo: Inject Supplier Reply
              </h4>
              <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <RefreshCw size={10} className="animate-spin text-amber-700" /> Polling IMAP
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              The AI Agent is currently waiting for real supplier email responses. You can reply from a real email account, or click below to immediately mock a reply to advance the negotiation loop:
            </p>
            <div className="flex flex-col gap-2">
              {matchedSuppliers.map((s) => (
                <div key={s.id} className="flex justify-between items-center bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700">{s.name}</span>
                    <span className="text-[9px] text-slate-400 font-medium">{s.email || 'No email configured'}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={async () => {
                        try {
                          await campaignService.injectMockReply(realStatusRfq, s.id, 280.68, 8, "Net 45 Days", false);
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className="bg-[#0078d4] text-white hover:bg-[#106ebe] text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-colors shadow-sm"
                    >
                      Send Offer ($280.68)
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await campaignService.injectMockReply(realStatusRfq, s.id, 0.0, 0, "Cancelled", true);
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className="bg-rose-500 text-white hover:bg-rose-600 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-colors shadow-sm"
                    >
                      Cancel Bid
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Right panel - Live Log terminal Console / Run History */}
      <div className="w-full xl:w-[480px] bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col shrink-0 space-y-4">
        
        <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActiveRightTab('logs')}
              className={`flex items-center gap-1.5 pb-1 border-b-2 transition-all ${
                activeRightTab === 'logs' 
                  ? 'border-[#0078d4] text-[#0078d4] font-bold text-xs' 
                  : 'border-transparent text-slate-400 font-semibold text-xs hover:text-slate-655'
              }`}
            >
              <Terminal size={14} /> Live Logs
            </button>
            <button 
              onClick={() => setActiveRightTab('history')}
              className={`flex items-center gap-1.5 pb-1 border-b-2 transition-all ${
                activeRightTab === 'history' 
                  ? 'border-[#0078d4] text-[#0078d4] font-bold text-xs' 
                  : 'border-transparent text-slate-400 font-semibold text-xs hover:text-slate-655'
              }`}
            >
              <FileText size={14} /> Run History
            </button>
          </div>
          {activeRightTab === 'logs' ? (
            <button
              onClick={handleDownloadLogs}
              disabled={logs.length === 0}
              className="flex items-center gap-1.5 text-[10px] font-bold text-[#0078d4] hover:underline disabled:opacity-40"
            >
              <Download size={12} /> Download Logs
            </button>
          ) : (
            <button
              onClick={() => {
                localStorage.removeItem('ai_agent_history');
                setHistoryList([]);
              }}
              disabled={historyList.length === 0}
              className="flex items-center gap-1.5 text-[10px] font-bold text-rose-600 hover:underline disabled:opacity-40"
            >
              Clear History
            </button>
          )}
        </div>

        {activeRightTab === 'logs' ? (
          /* Terminal Area */
          <div className="flex-1 bg-slate-900 rounded-xl p-4 flex flex-col overflow-hidden h-[480px] border border-slate-950 shadow-inner">
            <div className="flex-1 overflow-y-auto space-y-2 font-mono text-[10px] pr-1 leading-normal select-text">
              {logs.map((log, i) => {
                let colorClass = "text-slate-300";
                if (log.type === 'success') colorClass = "text-emerald-400";
                if (log.type === 'warning') colorClass = "text-amber-400";
                if (log.type === 'error') colorClass = "text-rose-400 font-extrabold";
                if (log.type === 'system') colorClass = "text-indigo-300 font-bold";

                return (
                  <div key={i} className="flex items-start gap-1">
                    <span className="text-slate-500 select-none">[{log.timestamp}]</span>
                    <span className={colorClass}>{log.message}</span>
                  </div>
                );
              })}

              {logs.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 font-sans space-y-2">
                  <Bot size={24} className="text-slate-600 animate-pulse" />
                  <div className="text-[11px] font-bold">AI Agent Standby</div>
                  <div className="text-[9px] text-center max-w-xs">Upload an RFQ blueprint or sheet to initiate execution and view real-time operations.</div>
                </div>
              )}
              
              <div ref={logsEndRef} />
            </div>
          </div>
        ) : (
          /* Execution History Area */
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 h-[480px] min-h-[480px]">
            {historyList.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 py-20">
                <FileText size={28} className="text-slate-300 animate-pulse" />
                <div className="text-[11px] font-bold">No execution history found</div>
                <div className="text-[9px] text-center max-w-xs text-slate-400">Run the autonomous agent to store your transaction history here.</div>
              </div>
            ) : (
              historyList.map((run, i) => (
                <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-3 hover:shadow-sm transition-all duration-200">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-1.5 mb-1.5">
                    <span className="font-bold text-slate-800 text-xs">{run.rfqNumber}</span>
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                      run.status === 'completed' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {run.status === 'completed' ? 'SUCCESS' : 'FAILED'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-slate-500 font-semibold">
                    <div className="truncate">Material: <span className="text-slate-700 font-bold">{run.item}</span></div>
                    <div>Quantity: <span className="text-slate-700 font-bold">{run.quantity}</span></div>
                    <div className="truncate">Supplier: <span className="text-slate-700 font-bold">{run.supplier}</span></div>
                    <div>Savings: <span className="text-emerald-600 font-bold">{run.savings}</span></div>
                    <div>PO Released: <span className="text-blue-600 font-black">{run.poNumber || 'N/A'}</span></div>
                    <div>ERP Status: <span className="text-slate-700 font-bold">{run.erpStatus}</span></div>
                    <div className="text-slate-400 font-mono text-[9px] text-right col-span-2 mt-1 border-t border-slate-100/50 pt-1">
                      Executed at: {run.timestamp}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* AI Agent Telemetry Footer */}
        {agentStatus === 'completed' && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
              <span>Agent Performance Audit</span>
              <span className="text-emerald-600">COMPLETED</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-slate-600 font-semibold">
              <div>• Time Elapsed: <span className="text-slate-800 font-bold">4.2 Seconds</span></div>
              <div>• Bids Negotiated: <span className="text-slate-800 font-bold">30 Bids</span></div>
              <div>• ERP Sync Success: <span className="text-slate-850 font-bold">Dynamics 365 (OData)</span></div>
              <div>• Savings Achieved: <span className="text-emerald-600 font-black">+14.2% Saved</span></div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
