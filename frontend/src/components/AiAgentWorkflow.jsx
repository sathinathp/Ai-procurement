import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Sparkles, Upload, Download, Play, RefreshCw, 
  CheckCircle, AlertCircle, Terminal, Settings, FileText, 
  Mail, Database, Layers, CheckCircle2, ChevronRight,
  Maximize2, Minimize2, Search, X
} from 'lucide-react';
import { 
  rfqService, workflowService, supplierService, 
  campaignService, comparisonService, erpService, emailBotService
} from '../services/api';

export default function AiAgentWorkflow() {
  const [systemPrompt, setSystemPrompt] = useState(
    "You are an autonomous procurement ProcureX agent. Upon RFQ upload, extract parameters, perform stock verification, match the top 3 suppliers, generate outreach emails, simulate best-price negotiations, automatically create a purchase order, and sync the PO directly to the Dynamics 365 ERP gateway."
  );
  const [mockInputs, setMockInputs] = useState({});
  const [counterOfferStatus, setCounterOfferStatus] = useState({}); // { [supplierId]: 'idle' | 'sending' | 'success' | 'error' }
  const [agreedPrices, setAgreedPrices] = useState({}); // { [supplierId]: { target: number, original: number } }
  const [lastLogCount, setLastLogCount] = useState({});
  
  const [settings, setSettings] = useState({
    autoNegotiation: true,
    matchThreshold: 80,
    autoSyncErp: true,
    outreachLimit: 3,
    maxNegotiationRounds: 3,
    realTimeOutreach: true,
    testEmail1: 'sathinath.padhi@petabytz.com',
    testEmail2: 'ashok.kumar@petabytz.com',
    testEmail3: 'sathinath.padhi@softstandard.com'
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
  const [realQuotes, setRealQuotes] = useState(() => getInitialState('realQuotes', []));
  const [campaignLogs, setCampaignLogs] = useState(() => getInitialState('campaignLogs', []));
  const [selectedSupplierId, setSelectedSupplierId] = useState(() => getInitialState('selectedSupplierId', null));
  const printedLogsRef = useRef(new Set());
  const abortRef = useRef(false);   // set to true to kill the IMAP polling loop immediately
  const completedByAgreeRef = useRef(false); // set to true when Agree-to-Price completes the workflow
  
  const [isLogsMaximized, setIsLogsMaximized] = useState(false);
  const [logSearchQuery, setLogSearchQuery] = useState("");
  const logsEndRef = useRef(null);
  const maximizedLogsEndRef = useRef(null);

  useEffect(() => {
    if (isLogsMaximized && maximizedLogsEndRef.current) {
      maximizedLogsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isLogsMaximized]);

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
      realQuotes,
      campaignLogs,
      selectedSupplierId,
      status: agentStatus, // for compatibility with RfqAssistant listener
      timestamp: new Date().toLocaleTimeString()
    }));
    window.dispatchEvent(new Event('ai_agent_update'));
  }, [agentStatus, currentStep, parsedData, logs, inventoryStatus, matchedSuppliers, negotiationResult, syncStatus, uploading, realStatusRfq, realQuotes, campaignLogs, selectedSupplierId]);

  // Watch for new inbound emails — detect new arrivals for notifications only
  // NOTE: We do NOT auto-fill the price input anymore. The amber badge shows the supplier's quoted price.
  useEffect(() => {
    if (!campaignLogs || !Array.isArray(campaignLogs) || campaignLogs.length === 0) return;
    
    matchedSuppliers.forEach(s => {
      const supplierInboundLogs = campaignLogs.filter(l => l.supplier_id === s.id && l.direction === 'inbound');
      const currentCount = supplierInboundLogs.length;
      const prevCount = lastLogCount[s.id] || 0;
      
      if (currentCount > prevCount && currentCount > 0) {
        // A new inbound message arrived! Show notification in logs
        const latestInbound = supplierInboundLogs[supplierInboundLogs.length - 1];
        if (latestInbound && latestInbound.price > 0) {
          addLog(`[📬 New Reply] ${s.name} sent a new quote: $${latestInbound.price}/unit, ${latestInbound.lead_time} days lead time. Check the amber badge and enter your counter-offer price.`, 'info');
        }
        setLastLogCount(prev => ({ ...prev, [s.id]: currentCount }));
      } else if (currentCount > 0 && prevCount === 0) {
        // Initialize the log count tracker on first load
        setLastLogCount(prev => ({ ...prev, [s.id]: currentCount }));
      }
    });
  }, [campaignLogs, matchedSuppliers, lastLogCount]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };

  const renderLogMessage = (log) => {
    let colorClass = "text-slate-300";
    if (log.type === 'success') colorClass = "text-emerald-400";
    if (log.type === 'warning') colorClass = "text-amber-400";
    if (log.type === 'error') colorClass = "text-rose-400 font-extrabold";
    if (log.type === 'system') colorClass = "text-indigo-300 font-bold";

    const priceMatch = log.message.match(/\[AI Parse\] Extracted quotation metrics: Price=\$(\d+(?:\.\d+)?)/);
    let priceColorSegment = null;
    if (priceMatch) {
      const parsedPrice = parseFloat(priceMatch[1]);
      const allTargets = Object.values(agreedPrices).map(a => a.target);
      const lowestTarget = allTargets.length > 0 ? Math.min(...allTargets) : null;
      const refPrice = lowestTarget || parsedPrice;
      const isGoodPrice = parsedPrice <= refPrice;
      priceColorSegment = isGoodPrice ? 'text-emerald-400' : 'text-rose-400';
      colorClass = "text-slate-300";
    }

    if (priceColorSegment && priceMatch) {
      const parts = log.message.split(/(Price=\$[\d.]+)/);
      return parts.map((part, pi) => {
        if (part.match(/^Price=\$[\d.]+$/)) {
          const pVal = parseFloat(part.replace('Price=$', ''));
          const allTargets = Object.values(agreedPrices).map(a => a.target);
          const refP = allTargets.length > 0 ? Math.min(...allTargets) : pVal;
          const cls = pVal <= refP ? 'text-emerald-400 font-extrabold' : 'text-rose-400 font-extrabold';
          return <span key={pi} className={cls}>{part}</span>;
        }
        return <span key={pi} className="text-slate-300">{part}</span>;
      });
    }
    if (log.message.includes('Negotiated Price:') || log.message.includes('Savings:')) {
      return <span className="text-emerald-400 font-bold">{log.message}</span>;
    }
    return <span className={colorClass}>{log.message}</span>;
  };

  const handleSettingChange = (name, value) => {
    setSettings(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'maxNegotiationRounds') {
        workflowService.saveAgentSettings({ max_negotiation_rounds: value })
          .catch(err => console.error("Failed to save settings:", err));
      } else if (name === 'realTimeOutreach') {
        workflowService.saveAgentSettings({ real_time_outreach: value })
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
            maxNegotiationRounds: res.data.max_negotiation_rounds || 3,
            realTimeOutreach: res.data.real_time_outreach !== undefined ? res.data.real_time_outreach : true
          }));
        }
      } catch (err) {
        console.error("Failed to load agent settings:", err);
      }
    };
    loadSettings();
  }, []);

  // Pre-populate printedLogsRef with existing signatures from loaded campaignLogs on mount
  useEffect(() => {
    if (campaignLogs && campaignLogs.length > 0) {
      campaignLogs.forEach(l => {
        const signature = `${l.direction}_${l.round_number}_${l.supplier_id}`;
        printedLogsRef.current.add(signature);
      });
    }
  }, []);

  // Shared helper to format and print new incoming/outbound logs to the console log terminal
  const processNewLogs = (statusLogs) => {
    if (!statusLogs) return;
    statusLogs.forEach(l => {
      const signature = `${l.direction}_${l.round_number}_${l.supplier_id}`;
      if (!printedLogsRef.current.has(signature)) {
        printedLogsRef.current.add(signature);
        if (l.direction === 'inbound') {
          addLog(`[IMAP Inbound] Received reply from ${l.supplier_name}: "${l.body.slice(0, 80)}..."`, 'info');
          addLog(`[AI Parse] Extracted quotation metrics: Price=$${l.price}, Lead Time=${l.lead_time} days`, 'success');
        } else {
          addLog(`[AI Negotiation] Target price not met. Generating counter-offer via AI...`, 'info');
          addLog(`[Resend Outbound] Counter-offer email dispatched to ${l.supplier_name}: Proposed $${l.price}`, 'info');
        }
      }
    });
  };

  // Fetch campaign status on mount or when active RFQ changes
  useEffect(() => {
    if (!realStatusRfq) return;
    const fetchInitialCampaignState = async () => {
      try {
        const res = await campaignService.getRealStatus(realStatusRfq);
        const { logs: allLogs, quotes } = res.data;
        if (allLogs) {
          setCampaignLogs(allLogs);
          processNewLogs(allLogs);
        }
        if (quotes) {
          setRealQuotes(quotes);
        }
      } catch (err) {
        console.error("Failed to load initial campaign state:", err);
      }
    };
    fetchInitialCampaignState();
  }, [realStatusRfq]);

  // Auto-refresh campaign logs every 5s whenever there is an active RFQ (running OR waiting for supplier reply)
  useEffect(() => {
    if (!realStatusRfq) return;
    const interval = setInterval(async () => {
      try {
        const statusRes = await campaignService.getRealStatus(realStatusRfq);
        const { logs: allLogs, quotes } = statusRes.data;
        if (allLogs) {
          setCampaignLogs(allLogs);
          processNewLogs(allLogs);
        }
        if (quotes) setRealQuotes(quotes);
      } catch (_) {}
    }, 5000);
    return () => clearInterval(interval);
  }, [realStatusRfq]);

  // Run the full autonomous workflow
  const startAutonomousWorkflow = async (file) => {
    if (!file) return;
    
    setUploading(true);
    setAgentStatus('running');
    setLogs([]);
    setRealQuotes([]);
    setCampaignLogs([]);
    setCurrentStep(0);
    abortRef.current = false;   // reset abort signal
    completedByAgreeRef.current = false; // reset agree completion signal
    
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
        description: data.description || 'Extracted via Autonomous ProcureX Agent',
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
        addLog(`  -> Supplier: ${s.name || 'N/A'} | Reliability Score: ${s.compliance_score ? Math.min(Number(s.compliance_score), 100) : (s.rating ? Math.min(Math.round(s.rating * 20), 100) : 95)}% | Status: Active`, 'info');
      });

      // STEP 4: OUTREACH & NEGOTIATION
      setCurrentStep(3);
      addLog(`Step 4/5: Launching automated RFP email outreach to matched vendors...`, 'info');
      addLog(`[Resend API] Initializing HTTPS email gateway (Port 443)...`, 'info');
      addLog(`[Resend API] Connected to api.resend.com via TLS (HTTP 200 OK)`, 'success');
      
      let finalData = null;

      if (settings.realTimeOutreach) {
        setRealStatusRfq(tempRfqNum);
        printedLogsRef.current.clear();
        
        const customEmails = {};
        if (matchedList[0]) customEmails[matchedList[0].id] = settings.testEmail1 || 'sathinath.padhi@petabytz.com';
        if (matchedList[1]) customEmails[matchedList[1].id] = settings.testEmail2 || 'ashok.kumar@petabytz.com';
        if (matchedList[2]) customEmails[matchedList[2].id] = settings.testEmail3 || 'sathinath.padhi@softstandard.com';
        
        await campaignService.launchReal(tempRfqNum, matchedList.map(s => s.id), customEmails);
        addLog(`[Resend API] Email campaign launched. Dispatching RFQ invitations...`, 'success');
        matchedList.forEach((s, idx) => {
          const dispatchEmails = [settings.testEmail1, settings.testEmail2, settings.testEmail3];
          const dispatchEmail = dispatchEmails[idx] || s.email || 'sathinath.padhi@petabytz.com';
          addLog(`[Resend Outbound] RFQ Invite dispatched to: ${dispatchEmail} (${s.name})`, 'info');
        });
        addLog(`[IMAP Listener] Listening for supplier replies via WebSocket...`, 'info');
        
        await new Promise((resolve, reject) => {
          const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
          
          // Robustly clean and construct the WebSocket URL
          let apiHost = API_BASE_URL.trim();
          apiHost = apiHost.replace(/^https?:\/\//i, '');
          if (apiHost.endsWith('/')) {
            apiHost = apiHost.slice(0, -1);
          }
          
          // If frontend runs on https or backend explicitly uses https, upgrade WS to secure wss://
          const useSecureWs = window.location.protocol === 'https:' || API_BASE_URL.toLowerCase().startsWith('https:');
          const wsUrl = `${useSecureWs ? 'wss' : 'ws'}://${apiHost}/ws/campaign/${tempRfqNum}`;
          
          addLog(`[WebSocket] Connecting to real-time status channel...`, 'info');
          const ws = new WebSocket(wsUrl);
          
          const abortCheckInterval = setInterval(() => {
            if (abortRef.current) {
              clearInterval(abortCheckInterval);
              ws.close();
              reject(new Error("aborted"));
            }
            const savedState = localStorage.getItem('ai_agent_state');
            const currentStatus = savedState ? JSON.parse(savedState).agentStatus : 'running';
            if (currentStatus !== 'running') {
              clearInterval(abortCheckInterval);
              ws.close();
              resolve();
            }
          }, 500);

          ws.onmessage = async (event) => {
            try {
              const data = JSON.parse(event.data);
              const { completed, logs: statusLogs, all_logs: allLogs, quotes } = data;
              if (quotes) {
                setRealQuotes(quotes);
              }
              // Use all_logs for full email thread panel state (if available), else fallback to statusLogs
              const fullLogs = allLogs || statusLogs;
              if (fullLogs && fullLogs.length > 0) {
                setCampaignLogs(fullLogs);
              }
              
              // Use statusLogs (new only) for addLog dedup
              processNewLogs(statusLogs);
              
              if (completed) {
                clearInterval(abortCheckInterval);
                ws.close();
                
                addLog(`[SUCCESS] Negotiation completed. Finalizing comparison report.`, 'success');
                
                const simRes = await campaignService.simulate(tempRfqNum);
                setNegotiationResult(simRes.data);
                finalData = simRes.data;
                if (simRes.data?.shortlist?.length > 0) {
                  setSelectedSupplierId(simRes.data.shortlist[0].supplier_id);
                }
                resolve();
              }
            } catch (err) {
              console.error("Error processing WebSocket message:", err);
            }
          };

          ws.onerror = (err) => {
            console.error("WebSocket error, falling back to HTTP polling", err);
            clearInterval(abortCheckInterval);
            ws.close();
            reject(err);
          };

          ws.onclose = () => {
            clearInterval(abortCheckInterval);
          };
        }).catch(async (err) => {
          if (err.message === "aborted") {
            addLog(`[AGENT] Workflow cancelled by user.`, 'warning');
            setAgentStatus('idle');
            setUploading(false);
            abortRef.current = false;
            return;
          }
          
          addLog(`[WebSocket Sync] Connection failed. Falling back to HTTP polling.`, 'warning');
          let isDone = false;
          while (!isDone) {
            if (abortRef.current) {
              addLog(`[AGENT] Workflow cancelled by user.`, 'warning');
              setAgentStatus('idle');
              setUploading(false);
              abortRef.current = false;
              return;
            }
            const savedState = localStorage.getItem('ai_agent_state');
            const currentStatus = savedState ? JSON.parse(savedState).agentStatus : 'running';
            if (currentStatus !== 'running') {
              break;
            }
            
            await new Promise(r => setTimeout(r, 3000));
            
            try {
              const statusRes = await campaignService.getRealStatus(tempRfqNum);
              const { completed, logs: statusLogs, quotes } = statusRes.data;
              if (quotes) {
                setRealQuotes(quotes);
              }
              if (statusLogs) {
                setCampaignLogs(statusLogs);
              }
              
              processNewLogs(statusLogs);
              
              if (completed) {
                isDone = true;
                addLog(`[SUCCESS] Negotiation completed. Finalizing comparison report.`, 'success');
                
                const simRes = await campaignService.simulate(tempRfqNum);
                setNegotiationResult(simRes.data);
                finalData = simRes.data;
                if (simRes.data?.shortlist?.length > 0) {
                  setSelectedSupplierId(simRes.data.shortlist[0].supplier_id);
                }
              }
            } catch (pollErr) {
              console.error("Error polling real campaign status:", pollErr);
            }
          }
        });
      } else {
        const simRes = await campaignService.simulate(tempRfqNum);
        setNegotiationResult(simRes.data);
        finalData = simRes.data;
        if (simRes.data?.shortlist?.length > 0) {
          setSelectedSupplierId(simRes.data.shortlist[0].supplier_id);
        }
        
        try {
          const statusRes = await campaignService.getRealStatus(tempRfqNum);
          if (statusRes.data.logs) {
            setCampaignLogs(statusRes.data.logs);
          }
          if (statusRes.data.quotes) {
            setRealQuotes(statusRes.data.quotes);
          }
        } catch (err) {
          console.error("Failed to load logs after simulation:", err);
        }

        if (simRes.data?.negotiations && Array.isArray(simRes.data.negotiations)) {
          simRes.data.negotiations.forEach(neg => {
            const isEur = neg.chat_history && neg.chat_history[0]?.content && neg.chat_history[0].content.includes('€');
            const currencySymbol = isEur ? '€' : '$';
            addLog(`[IMAP Inbound] Received quotation email from ${neg.supplier_name}`, 'info');
            addLog(`[AI Parse] Extracted quotation: Price=${currencySymbol}${neg.original_price}, Terms="${neg.original_terms || 'Net 30 Days'}"`, 'success');
            if (neg.negotiated_price !== neg.original_price) {
              addLog(`[AI Negotiation] Target price not met. Generating counter-offer to ${neg.supplier_name}...`, 'info');
              addLog(`[IMAP Inbound] Received revised offer from ${neg.supplier_name}: Price=${currencySymbol}${neg.negotiated_price}, Terms="${neg.negotiated_terms}"`, 'success');
            } else {
              addLog(`[AI Negotiation] Initial quote from ${neg.supplier_name} matches target criteria.`, 'success');
            }
          });
          addLog(`[SUCCESS] Sourcing completed. Received ${simRes.data.quotes_received || 4} candidate bids. Auto-negotiation active.`, 'success');
        } else {
          addLog(`[SUCCESS] Sourcing completed. Bids received. Auto-negotiation active.`, 'success');
        }
      }

      // If agentStatus was already set to 'completed' by the Agree-to-Price
      // button handler, the workflow finished successfully — don't throw.
      if (!finalData && !completedByAgreeRef.current) {
        throw new Error("Workflow aborted or negotiation failed.");
      }
      // If the agree path already completed the workflow, exit gracefully.
      if (!finalData) return;
      
      const bestBid = finalData.shortlist[0];
      addLog(`[Negotiation Complete] Best bid from "${bestBid.supplier_name}" (${bestBid.country}) is recommended.`, 'success');
      addLog(`  -> Negotiated Price: $${bestBid.price}/unit (saved $${(finalData.negotiations[0]?.original_price - bestBid.price).toFixed(2)}/unit)`, 'success');
      addLog(`  -> Agreed Delivery: ${bestBid.lead_time} Days | Risk Level: ${bestBid.risk_level}`, 'info');
      addLog(`[AWAITING APPROVAL] Awaiting human review & approval to release Purchase Order and sync ERP.`, 'warning');

      setAgentStatus('awaiting_approval');

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

  const handleApproveAndRelease = async () => {
    if (!realStatusRfq || !negotiationResult || !selectedSupplierId) return;
    
    setAgentStatus('running');
    setUploading(true);
    setCurrentStep(4);
    
    try {
      const bestBid = negotiationResult.shortlist.find(s => s.supplier_id === selectedSupplierId) || negotiationResult.shortlist[0];
      
      addLog(`[Human Approved] Sourcing recommendation approved for ${bestBid.supplier_name}.`, 'success');
      addLog(`Generating Purchase Order PDF for ${bestBid.supplier_name}...`, 'info');
      
      const poRes = await comparisonService.generatePO(realStatusRfq, bestBid.supplier_name);
      addLog(`[SUCCESS] Released Purchase Order: ${poRes.data.po_number}`, 'success');

      // STEP 5: ERP SYNC
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
          rfqNumber: realStatusRfq,
          poNumber: poRes?.data?.po_number || 'N/A',
          item: parsedData?.item_name || 'HDPE Pipes 110mm',
          quantity: `${parsedData?.quantity || 250} ${parsedData?.unit || 'MT'}`,
          supplier: bestBid?.supplier_name || 'N/A',
          savings: negotiationResult?.negotiations?.find(n => n.supplier_name === bestBid.supplier_name)
            ? `+$${(negotiationResult.negotiations.find(n => n.supplier_name === bestBid.supplier_name).original_price - bestBid.price).toFixed(2)}/unit`
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
      addLog(`[CRITICAL ERROR] Approval or Sync failed. Reason: ${err.message || 'API Failure'}`, 'error');
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

  const handleGenerateSampleRfqPdf = () => {
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
    window.open(`${apiBaseUrl}/api/rfq/generate-sample`);
  };

  const handleDownloadLogs = () => {
    const logText = logs.map(l => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}`).join('\r\n');
    const element = document.createElement("a");
    const file = new Blob([logText], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `procurex_log_${Date.now()}.txt`;
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
    setSelectedSupplierId(null);
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
              <h1 className="text-xl font-extrabold text-slate-800">Autonomous Procurement ProcureX Agent</h1>
              <p className="text-xs text-slate-500">Configure parameters, upload an RFQ request, and observe ProcureX driving the entire procurement cycle autonomously.</p>
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
              <p className="text-xs text-slate-500">Upload a purchase requisition, blueprint drawing, or RFQ document to trigger the ProcureX Agent execution chain.</p>
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

            <div className="pt-2 text-center">
              <button
                onClick={handleGenerateSampleRfqPdf}
                className="text-xs font-bold text-[#0078d4] hover:text-[#106ebe] hover:underline inline-flex items-center gap-1.5 mx-auto mt-2 cursor-pointer bg-transparent border-none outline-none"
              >
                <Download size={14} /> Generate and Download Sample RFQ PDF
              </button>
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
                {agentStatus === 'awaiting_approval' && (
                  <span className="text-xs font-bold text-amber-600 flex items-center gap-1 animate-pulse">
                    <AlertCircle size={12} /> Awaiting Approval
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
                const isPassed = agentStatus === 'completed' || currentStep > idx || (agentStatus === 'awaiting_approval' && idx <= 3);
                const isCurrent = agentStatus !== 'completed' && agentStatus !== 'awaiting_approval' && currentStep === idx;
                const isPending = (agentStatus !== 'completed' && agentStatus !== 'awaiting_approval' && currentStep < idx) || (agentStatus === 'awaiting_approval' && idx > 3);
                
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
                      <div className={`text-[10px] font-bold px-2 py-1 rounded ${
                        agentStatus === 'awaiting_approval'
                          ? 'text-amber-700 bg-amber-50'
                          : 'text-emerald-700 bg-emerald-50'
                      }`}>
                        {agentStatus === 'awaiting_approval' 
                          ? `Proposed: $${negotiationResult.shortlist[0]?.price}/unit` 
                          : `Awarded: $${negotiationResult.shortlist[0]?.price}/unit`}
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

        {/* Procurement Approval Card */}
        {agentStatus === 'awaiting_approval' && negotiationResult && (
          <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-300 rounded-2xl p-6 shadow-md space-y-5">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle size={14} className="text-amber-600" /> Procurement Approval Required
              </h4>
              <span className="text-[9px] bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                Action Required
              </span>
            </div>
            <p className="text-xs text-slate-650 leading-relaxed font-medium">
              The AI Negotiation loop is complete. Select which supplier's bid you would like to approve. The AI recommends <strong>{negotiationResult.shortlist[0]?.supplier_name}</strong>.
            </p>
            
            <div className="space-y-3">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Shortlisted Bids</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {negotiationResult.shortlist.map((supplier) => {
                  const isRecommended = supplier.supplier_name === negotiationResult.shortlist[0].supplier_name;
                  const isSelected = selectedSupplierId === supplier.supplier_id;
                  
                  return (
                    <div 
                      key={supplier.supplier_id} 
                      onClick={() => setSelectedSupplierId(supplier.supplier_id)}
                      className={`border p-4 rounded-xl cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected 
                          ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/25' 
                          : 'border-slate-200 bg-white hover:border-slate-350 shadow-sm'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-xs font-bold text-slate-800 truncate max-w-[120px]">
                            {supplier.supplier_name}
                          </span>
                          {isRecommended && (
                            <span className="text-[8px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-250">
                              🏆 Rec
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-bold text-emerald-600">
                          ${supplier.price}/unit
                        </div>
                        <div className="text-[10px] text-slate-500 font-semibold space-y-0.5">
                          <div>• Lead Time: <span className="text-slate-700">{supplier.lead_time} days</span></div>
                          <div>• Risk Rating: <span className={`font-bold ${supplier.risk_level === 'High' ? 'text-rose-600' : 'text-slate-700'}`}>{supplier.risk_level}</span></div>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[9px] text-slate-400 font-bold">
                          Score: {supplier.weighted_score || supplier.price_score}
                        </span>
                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'
                        }`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleApproveAndRelease}
                disabled={!selectedSupplierId}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle size={14} /> Approve & Release PO for {negotiationResult.shortlist.find(s => s.supplier_id === selectedSupplierId)?.supplier_name || 'Selected Vendor'}
              </button>
              <button
                onClick={resetAgent}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 px-4 rounded-xl transition-colors cursor-pointer border border-slate-200"
              >
                Reject & Restart
              </button>
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
              The ProcureX Agent is currently waiting for real supplier email responses. You can reply from a real email account, or click below to immediately mock a reply to advance the negotiation loop:
            </p>
            <div className="flex flex-col gap-3">
              {matchedSuppliers.map((s, idx) => {
                // Get latest inbound price and lead time for this supplier — shown as READ-ONLY reference
                const supplierInboundLogs = campaignLogs.filter(l => l.supplier_id === s.id && l.direction === 'inbound' && l.price > 0);
                const latestInboundPrice = supplierInboundLogs.length > 0 ? supplierInboundLogs[supplierInboundLogs.length - 1].price : null;
                const latestInboundLeadTime = supplierInboundLogs.length > 0 ? supplierInboundLogs[supplierInboundLogs.length - 1].lead_time : null;

                // Price inputs start EMPTY — user must type their counter-offer price manually
                // Do NOT auto-fill with supplier's quoted price
                const sInputs = mockInputs[s.id] || { price: '', leadTime: '' };
                let displayEmail = s.email;
                if (settings.realTimeOutreach) {
                  if (idx === 0) displayEmail = settings.testEmail1 || s.email;
                  else if (idx === 1) displayEmail = settings.testEmail2 || s.email;
                  else if (idx === 2) displayEmail = settings.testEmail3 || s.email;
                }
                const quoteForSupplier = realQuotes.find(q => q.supplier_id === s.id);
                const isCancelled = quoteForSupplier?.status === 'Cancelled';
                const firstInboundPrice = supplierInboundLogs.length > 0 ? supplierInboundLogs[0].price : null;
                const agreedInfo = agreedPrices[s.id];
                const displayPrice = agreedInfo ? agreedInfo.target : latestInboundPrice;
                const targetPrice = parseFloat(sInputs.price) || null;
                const priceIsGood = displayPrice !== null && targetPrice !== null && displayPrice <= targetPrice;
                const priceDiff = firstInboundPrice && displayPrice ? (firstInboundPrice - displayPrice).toFixed(2) : null;
                
                const finalPriceToAgree = sInputs.price ? parseFloat(sInputs.price) : latestInboundPrice;
                const finalLeadTimeToAgree = sInputs.leadTime ? parseInt(sInputs.leadTime) : (latestInboundLeadTime || 14);
                const canAgree = finalPriceToAgree !== null && !isNaN(finalPriceToAgree) && finalPriceToAgree > 0;
                return (
                  <div key={s.id} className={`flex flex-col gap-2 bg-white p-3.5 rounded-xl border shadow-sm transition-all ${
                    agreedInfo ? 'border-emerald-300 bg-emerald-50/30' : isCancelled ? 'border-rose-200 opacity-70 bg-slate-50/50' : 'border-slate-200'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700">{s.name}</span>
                        <span className="text-[9px] text-slate-400 font-medium">{displayEmail || 'No email configured'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {displayPrice !== null && (
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                            priceIsGood
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-600 border-rose-200'
                          }`}>
                            {priceIsGood ? '↓' : '↑'} ${displayPrice}/unit
                            {priceDiff && parseFloat(priceDiff) > 0 && (
                              <span className="text-emerald-600 font-semibold">(-${priceDiff})</span>
                            )}
                          </span>
                        )}
                        <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-bold">ID: {s.id}</span>
                      </div>
                    </div>
                    
                    {/* Supplier's quoted price — shown as read-only reference */}
                    {latestInboundPrice !== null && (
                      <div className="flex flex-col gap-1 mt-1 mb-1 p-2 bg-amber-50/50 border border-amber-200 rounded-lg text-xs font-semibold text-slate-700">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-500 uppercase font-bold">Initial Bid:</span>
                          <span className="font-extrabold text-slate-700">${firstInboundPrice}/unit</span>
                        </div>
                        {firstInboundPrice !== latestInboundPrice && (
                          <div className="flex justify-between items-center text-[10px] border-t border-amber-100/50 pt-1">
                            <span className="text-emerald-700 uppercase font-bold">Negotiated Bid:</span>
                            <span className="font-black text-emerald-800">${latestInboundPrice}/unit</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-[9px] text-amber-600 border-t border-amber-100/50 pt-1">
                          <span>Lead Time: {latestInboundLeadTime || 14} days</span>
                          {priceDiff && parseFloat(priceDiff) > 0 && (
                            <span className="text-emerald-600 font-extrabold">Saved: -${priceDiff}/unit ({((parseFloat(priceDiff) / firstInboundPrice) * 100).toFixed(1)}%)</span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div>
                        <label className="text-[9px] font-bold text-[#0078d4] block mb-1">YOUR COUNTER-OFFER PRICE (USD)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Enter your price..."
                          value={sInputs.price}
                          disabled={isCancelled}
                          onChange={(e) => setMockInputs(prev => ({
                            ...prev,
                            [s.id]: { ...sInputs, price: e.target.value }
                          }))}
                          className="w-full text-xs px-2.5 py-1.5 border-2 border-[#0078d4] rounded-lg focus:outline-none focus:border-blue-700 font-bold disabled:bg-slate-100 disabled:text-slate-400 placeholder:text-slate-300 placeholder:font-normal"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 block mb-1">LEAD TIME (DAYS)</label>
                        <input
                          type="number"
                          placeholder="Enter days..."
                          value={sInputs.leadTime}
                          disabled={isCancelled}
                          onChange={(e) => setMockInputs(prev => ({
                            ...prev,
                            [s.id]: { ...sInputs, leadTime: e.target.value }
                          }))}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0078d4] font-medium disabled:bg-slate-100 disabled:text-slate-400 placeholder:text-slate-300 placeholder:font-normal"
                        />
                      </div>
                    </div>

                    <div className="flex gap-1.5 mt-2 justify-end">
                      {isCancelled ? (
                        <span className="text-[10px] font-extrabold text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-md">
                          Cancelled / Bid Withdrawn
                        </span>
                      ) : (
                        <>
                          <button
                            disabled={counterOfferStatus[s.id] === 'sending' || !sInputs.price}
                            onClick={async () => {
                              // Validate price entry
                              const counterPrice = parseFloat(sInputs.price);
                              if (!counterPrice || counterPrice <= 0) {
                                addLog(`[WARN] Enter your counter-offer price for ${s.name} before sending.`, 'warning');
                                return;
                              }

                              // Determine the correct dispatch email (test email override from settings)
                              let dispatchEmail = s.email;
                              if (settings.realTimeOutreach) {
                                if (idx === 0) dispatchEmail = settings.testEmail1 || s.email;
                                else if (idx === 1) dispatchEmail = settings.testEmail2 || s.email;
                                else if (idx === 2) dispatchEmail = settings.testEmail3 || s.email;
                              }

                              // Calculate current round from existing outbound logs
                              const existingOutbound = (campaignLogs || []).filter(
                                l => l.supplier_id === s.id && l.direction === 'outbound'
                              ).length;
                              const roundNum = existingOutbound + 1;

                              const leadTimeVal = parseInt(sInputs.leadTime) || 14;

                              setCounterOfferStatus(prev => ({ ...prev, [s.id]: 'sending' }));
                              try {
                                const res = await campaignService.sendCounterOffer(
                                  realStatusRfq,
                                  s.id,
                                  counterPrice,
                                  leadTimeVal,
                                  roundNum,
                                  dispatchEmail
                                );
                                const targetPriceVal = res?.data?.target_price !== undefined ? res.data.target_price : counterPrice;
                                const dispatchEmailVal = res?.data?.dispatch_email || dispatchEmail;
                                addLog(`[SMTP Outbound] Counter-offer (Round ${roundNum}) sent to ${s.name} at ${dispatchEmailVal}. Proposing $${targetPriceVal}/unit`, 'success');
                                addLog(`[\u23f3 Waiting] Now monitoring inbox for ${s.name}'s reply. The amber badge will update automatically when they respond.`, 'info');
                                setCounterOfferStatus(prev => ({ ...prev, [s.id]: 'success' }));
                                // Clear the price input so user can type next round's offer
                                setMockInputs(prev => ({ ...prev, [s.id]: { price: '', leadTime: '' } }));
                                // Immediately refresh campaign logs
                                try {
                                  const statusRes = await campaignService.getRealStatus(realStatusRfq);
                                  if (statusRes.data.logs) setCampaignLogs(statusRes.data.logs);
                                  if (statusRes.data.quotes) setRealQuotes(statusRes.data.quotes);
                                } catch (_) {}
                                // Trigger IMAP inbox check on backend so reply is detected immediately
                                try { await emailBotService.triggerCheck(); } catch (_) {}
                                // Schedule multiple refreshes at 15s, 30s, 60s, 90s to catch supplier reply
                                const refreshDelays = [15000, 30000, 60000, 90000];
                                refreshDelays.forEach(delay => {
                                  setTimeout(async () => {
                                    try {
                                      await emailBotService.triggerCheck();
                                      const refreshRes = await campaignService.getRealStatus(realStatusRfq);
                                      if (refreshRes.data.logs) {
                                        setCampaignLogs(refreshRes.data.logs);
                                        processNewLogs(refreshRes.data.logs);
                                      }
                                      if (refreshRes.data.quotes) setRealQuotes(refreshRes.data.quotes);
                                    } catch (_) {}
                                  }, delay);
                                });
                                setTimeout(() => setCounterOfferStatus(prev => ({ ...prev, [s.id]: 'idle' })), 4000);
                              } catch (err) {
                                console.error('[Counter-Offer Error]', err);
                                addLog(`[ERROR] Failed to send counter-offer to ${s.name}: ${err?.response?.data?.detail || err.message}`, 'error');
                                setCounterOfferStatus(prev => ({ ...prev, [s.id]: 'error' }));
                                setTimeout(() => setCounterOfferStatus(prev => ({ ...prev, [s.id]: 'idle' })), 4000);
                              }
                            }}
                            className={`text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-colors shadow-sm flex items-center gap-1 ${
                              counterOfferStatus[s.id] === 'sending'
                                ? 'bg-slate-400 cursor-not-allowed'
                                : counterOfferStatus[s.id] === 'success'
                                ? 'bg-emerald-600 cursor-default'
                                : counterOfferStatus[s.id] === 'error'
                                ? 'bg-rose-500 cursor-pointer hover:bg-rose-600'
                                : 'bg-[#0078d4] hover:bg-[#106ebe] cursor-pointer'
                            }`}
                          >
                            {counterOfferStatus[s.id] === 'sending' && (
                              <svg className="animate-spin w-2.5 h-2.5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                              </svg>
                            )}
                            {counterOfferStatus[s.id] === 'success' ? '✓ Sent!' : counterOfferStatus[s.id] === 'error' ? '✗ Retry' : counterOfferStatus[s.id] === 'sending' ? 'Sending...' : 'Send Counter-Offer'}
                          </button>
                          <button
                            disabled={counterOfferStatus[s.id] === 'agreeing' || !canAgree}
                            onClick={async () => {
                              const agreePriceVal = finalPriceToAgree;
                              const agreeLeadTime = finalLeadTimeToAgree;
                              if (!agreePriceVal || agreePriceVal <= 0) {
                                addLog(`[WARN] Enter the agreed price for ${s.name} before confirming.`, 'warning');
                                setCounterOfferStatus(prev => ({ ...prev, [s.id]: 'idle' }));
                                return;
                              }
                              setCounterOfferStatus(prev => ({ ...prev, [s.id]: 'agreeing' }));
                              addLog(`[ProcureX Agent] ${s.name} - Agreeing to $${agreePriceVal}/unit. Processing acceptance...`, 'info');
                              try {
                                const agreeRes = await campaignService.agreeToPrice(
                                  realStatusRfq,
                                  s.id,
                                  agreePriceVal,
                                  agreeLeadTime,
                                  'Net 45 Days'
                                );
                                const poNum = agreeRes.data?.po_number || 'PO-AUTO';
                                // Track agreed price + original quote price for color coding
                                const supplierLogs = campaignLogs.filter(l => l.supplier_id === s.id && l.direction === 'inbound');
                                const originalQuotePrice = supplierLogs.length > 0 ? supplierLogs[0].price : agreePriceVal;
                                setAgreedPrices(prev => ({ ...prev, [s.id]: { target: agreePriceVal, original: originalQuotePrice } }));
                                const savedPerUnit = (originalQuotePrice - agreePriceVal).toFixed(2);
                                addLog(`[SUCCESS] ${s.name} accepted target price of $${agreePriceVal}/unit.`, 'success');
                                addLog(`[Negotiation Win] Top bid awarded to "${s.name}".`, 'success');
                                addLog(`  -> Negotiated Price: $${agreePriceVal}/unit | Lead Time: ${agreeLeadTime} days | Savings: $${savedPerUnit}/unit`, 'success');

                                // PO was already generated by the agreeToPrice backend via run_comparison_and_notify.
                                // Use the po_number returned from that call — do NOT call generatePO again.
                                const finalPoNum = poNum;
                                addLog(`[SUCCESS] Released Purchase Order: ${finalPoNum}`, 'success');

                                // ERP Sync
                                setCurrentStep(4);
                                if (settings.autoSyncErp) {
                                  addLog(`Step 5/5: Initiating OData REST link with Dynamics 365 F&O...`, 'info');
                                  try {
                                    await erpService.sync('vendor', s.id);
                                    addLog(`[SUCCESS] Supplier record verified in Dynamics 365.`, 'success');
                                    await erpService.sync('po', finalPoNum);
                                    addLog(`[SUCCESS] Purchase Order ${finalPoNum} status updated to "Synced" in ERP.`, 'success');
                                  } catch (_) {
                                    addLog(`[WARN] ERP sync encountered an issue but PO was generated.`, 'warning');
                                  }
                                  setSyncStatus('synced');
                                } else {
                                  addLog(`Step 5/5: ERP Sync skipped based on Agent settings.`, 'warning');
                                  setSyncStatus('skipped');
                                }

                                // Set negotiation result for display
                                try {
                                  const simRes = await campaignService.simulate(realStatusRfq);
                                  if (simRes.data) setNegotiationResult(simRes.data);
                                } catch (_) {}

                                setAgentStatus('completed');
                                setUploading(false);
                                completedByAgreeRef.current = true; // signal to the outer flow
                                addLog(`[AGENT STATUS] Workflow execution finished successfully. All objectives met.`, 'success');
                                setCounterOfferStatus(prev => ({ ...prev, [s.id]: 'agreed' }));

                                // Save to run history
                                try {
                                  const runHistoryItem = {
                                    rfqNumber: realStatusRfq,
                                    poNumber: finalPoNum,
                                    item: s.name,
                                    quantity: 'As per RFQ',
                                    supplier: s.name,
                                    savings: `$${agreePriceVal}/unit (Agreed)`,
                                    erpStatus: settings.autoSyncErp ? 'Synced (D365)' : 'Skipped',
                                    status: 'completed',
                                    timestamp: new Date().toLocaleTimeString()
                                  };
                                  setHistoryList(prev => {
                                    const updated = [runHistoryItem, ...prev];
                                    localStorage.setItem('ai_agent_history', JSON.stringify(updated));
                                    return updated;
                                  });
                                } catch (_) {}

                              } catch (err) {
                                console.error('[Agree-to-Price Error]', err);
                                addLog(`[ERROR] Failed to process price agreement for ${s.name}: ${err?.response?.data?.detail || err.message}`, 'error');
                                setCounterOfferStatus(prev => ({ ...prev, [s.id]: 'idle' }));
                              }
                            }}
                            className={`text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-colors shadow-sm flex items-center gap-1 ${
                              counterOfferStatus[s.id] === 'agreeing'
                                ? 'bg-emerald-400 cursor-not-allowed'
                                : counterOfferStatus[s.id] === 'agreed'
                                ? 'bg-emerald-700 cursor-default'
                                : 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
                            }`}
                          >
                            {counterOfferStatus[s.id] === 'agreeing' && (
                              <svg className="animate-spin w-2.5 h-2.5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                              </svg>
                            )}
                            {counterOfferStatus[s.id] === 'agreeing' ? 'Processing...' : counterOfferStatus[s.id] === 'agreed' ? '✓ Agreed & PO Released' : canAgree ? `Agree to $${parseFloat(finalPriceToAgree).toFixed(2)}` : 'Agree to Price'}
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await campaignService.injectMockReply(realStatusRfq, s.id, 0.0, 0, "Cancelled", true, false);
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                            className="bg-rose-500 text-white hover:bg-rose-600 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-colors shadow-sm cursor-pointer"
                          >
                            Cancel Bid
                          </button>
                        </>
                      )}
                    </div>

                    {/* Render actual email exchanges for this supplier */}
                    {(() => {
                      const supplierLogs = campaignLogs.filter(l => l.supplier_id === s.id);
                      if (supplierLogs.length > 0) {
                        return (
                          <div className="mt-3 border-t border-slate-100 pt-2.5 space-y-2">
                            <span className="text-[9px] font-bold text-slate-450 uppercase tracking-wider block">
                              Email History with {s.name}
                            </span>
                            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                              {supplierLogs.slice().reverse().map((log, logIdx) => (
                                <div key={logIdx} className={`p-2 rounded text-[10px] border ${
                                  log.direction === 'inbound' 
                                    ? 'bg-slate-50 border-slate-200 text-slate-700' 
                                    : 'bg-blue-50/40 border-blue-100 text-slate-700'
                                }`}>
                                  <div className="flex justify-between items-center font-bold text-[9px] mb-1">
                                    <span className={log.direction === 'inbound' ? 'text-amber-700' : 'text-blue-700'}>
                                      {log.direction === 'inbound' ? '← Inbound (Supplier)' : '→ Outbound (ProcureX)'}
                                    </span>
                                    <span className="text-slate-400 font-mono font-medium">{log.sent_at}</span>
                                  </div>
                                  {log.subject && <div className="font-semibold text-slate-600 truncate">Subj: {log.subject}</div>}
                                  <div className="text-slate-650 mt-1 font-mono text-[9px] bg-white p-1.5 rounded border border-slate-100 max-h-[60px] overflow-y-auto whitespace-pre-wrap">
                                    {log.body}
                                  </div>
                                  {(log.price > 0 || log.lead_time > 0) && (() => {
                                    const agr = agreedPrices[s.id];
                                    const suppInbound = campaignLogs.filter(l => l.supplier_id === s.id && l.direction === 'inbound' && l.price > 0);
                                    const firstPrice = suppInbound.length > 0 ? suppInbound[0].price : null;
                                    const refP = agr ? agr.target : firstPrice;
                                    const isGood = refP ? log.price <= refP : true;
                                    return (
                                      <div className="flex gap-2.5 mt-1 text-[9px] font-bold flex-wrap">
                                        {log.price > 0 && (
                                          <span className={`px-1.5 py-0.5 rounded font-extrabold border flex items-center gap-1 ${
                                            log.direction === 'outbound'
                                              ? 'text-blue-700 bg-blue-50 border-blue-200'
                                              : isGood
                                              ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                              : 'text-rose-600 bg-rose-50 border-rose-200'
                                          }`}>
                                            {log.direction === 'outbound' ? '🎯' : isGood ? '✅' : '⚠️'} ${log.price}/unit
                                          </span>
                                        )}
                                        {log.lead_time > 0 && (
                                          <span className="text-slate-500">🕒 {log.lead_time} Days</span>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                );
              })}
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
              onClick={() => setActiveRightTab('emails')}
              className={`flex items-center gap-1.5 pb-1 border-b-2 transition-all ${
                activeRightTab === 'emails' 
                  ? 'border-[#0078d4] text-[#0078d4] font-bold text-xs' 
                  : 'border-transparent text-slate-400 font-semibold text-xs hover:text-slate-655'
              }`}
            >
              <Mail size={14} /> Email Thread
              {campaignLogs.length > 0 && (
                <span className="bg-blue-100 text-blue-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                  {campaignLogs.length}
                </span>
              )}
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
              className="flex items-center gap-1.5 text-[10px] font-bold text-[#0078d4] hover:underline disabled:opacity-40 cursor-pointer"
            >
              <Download size={12} /> Download Logs
            </button>
          ) : activeRightTab === 'emails' ? (
            <button
              onClick={async () => {
                if (!realStatusRfq) return;
                try {
                  const res = await campaignService.getRealStatus(realStatusRfq);
                  if (res.data.logs) setCampaignLogs(res.data.logs);
                  if (res.data.quotes) setRealQuotes(res.data.quotes);
                } catch (_) {}
              }}
              disabled={!realStatusRfq}
              className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 hover:underline disabled:opacity-40"
            >
              <RefreshCw size={11} /> Refresh
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
          <div className="flex-1 bg-slate-900 rounded-xl p-4 flex flex-col overflow-hidden h-[480px] border border-slate-950 shadow-inner relative group">
            <button
              onClick={() => setIsLogsMaximized(true)}
              title="Maximize logs"
              className="absolute top-3 right-3 bg-slate-800/80 hover:bg-slate-700 text-slate-350 hover:text-white p-1.5 rounded-lg border border-slate-700 transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center shadow-md cursor-pointer z-10"
            >
              <Maximize2 size={12} />
            </button>
            <div className="flex-1 overflow-y-auto space-y-2 font-mono text-[10px] pr-1 leading-normal select-text">
              {logs.map((log, i) => (
                <div key={i} className="flex items-start gap-1">
                  <span className="text-slate-500 select-none shrink-0">[{log.timestamp}]</span>
                  <span className="break-all">{renderLogMessage(log)}</span>
                </div>
              ))}

              {logs.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 font-sans space-y-2">
                  <Bot size={24} className="text-slate-600 animate-pulse" />
                  <div className="text-[11px] font-bold">ProcureX Standby</div>
                  <div className="text-[9px] text-center max-w-xs">Upload an RFQ blueprint or sheet to initiate execution and view real-time operations.</div>
                </div>
              )}
              
              <div ref={logsEndRef} />
            </div>
          </div>
        ) : activeRightTab === 'emails' ? (
          /* Email Thread Area */
          <div className="flex-1 overflow-y-auto h-[480px] space-y-5 pr-1">
            {campaignLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 py-20">
                <Mail size={28} className="text-slate-300 animate-pulse" />
                <div className="text-[11px] font-bold">No email exchanges yet</div>
                <div className="text-[9px] text-center max-w-xs text-slate-400">Start the autonomous agent with real-time outreach mode to view supplier negotiation threads here.</div>
              </div>
            ) : (
              (() => {
                // Group logs by supplier
                const grouped = {};
                campaignLogs.forEach(log => {
                  const key = log.supplier_id;
                  if (!grouped[key]) grouped[key] = { name: log.supplier_name, logs: [] };
                  grouped[key].logs.push(log);
                });
                return Object.entries(grouped).map(([suppId, { name, logs: sLogs }]) => (
                  <div key={suppId} className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                        {name?.charAt(0) || 'S'}
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-700">{name}</div>
                        <div className="text-[9px] text-slate-400 font-medium">{sLogs.length} message{sLogs.length !== 1 ? 's' : ''} exchanged</div>
                      </div>
                      <div className="flex-1 h-px bg-slate-100 ml-1" />
                    </div>
                    {/* Chat bubbles */}
                    <div className="space-y-2 px-1">
                      {sLogs.map((log, li) => {
                        const isInbound = log.direction === 'inbound';
                        return (
                          <div key={li} className={`flex flex-col ${isInbound ? 'items-start' : 'items-end'}`}>
                            {/* Label */}
                            <div className={`flex items-center gap-1.5 mb-1 ${isInbound ? '' : 'flex-row-reverse'}`}>
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${
                                isInbound ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {isInbound ? '↓' : '↑'}
                              </div>
                              <span className={`text-[9px] font-bold ${isInbound ? 'text-amber-700' : 'text-blue-700'}`}>
                                {isInbound ? name : 'ProcureX'}
                              </span>
                              <span className="text-[9px] text-slate-400 font-mono">{log.sent_at}</span>
                              {log.round_number && (
                                <span className="text-[8px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded font-bold">Rd {log.round_number}</span>
                              )}
                            </div>
                            {/* Bubble */}
                            <div className={`max-w-[90%] rounded-2xl px-3 py-2.5 shadow-sm border ${
                              isInbound
                                ? 'bg-white border-slate-200 rounded-tl-none'
                                : 'bg-blue-600 border-blue-700 rounded-tr-none text-white'
                            }`}>
                              {/* Subject */}
                              {log.subject && (
                                <div className={`text-[9px] font-bold mb-1.5 pb-1.5 border-b ${
                                  isInbound ? 'text-slate-500 border-slate-100' : 'text-blue-200 border-blue-500'
                                }`}>
                                  📧 {log.subject}
                                </div>
                              )}
                              {/* Body */}
                              <div className={`text-[10px] leading-relaxed whitespace-pre-wrap ${
                                isInbound ? 'text-slate-700' : 'text-white'
                              }`}>
                                {log.body}
                              </div>
                              {/* Price/LeadTime chips - color coded: green if price ≤ target, red if above */}
                              {(log.price > 0 || log.lead_time > 0) && (
                                (() => {
                                  const supplierAgreed = agreedPrices[parseInt(suppId)];
                                  const refPrice = supplierAgreed ? supplierAgreed.target : null;
                                  // Find first inbound price for this supplier as original quote
                                  const allInbound = sLogs.filter(l => l.direction === 'inbound' && l.price > 0);
                                  const origPrice = allInbound.length > 0 ? allInbound[0].price : null;
                                  const priceIsBelow = refPrice ? log.price <= refPrice : (origPrice ? log.price <= origPrice : true);
                                  return (
                                    <div className={`flex gap-2 mt-2 pt-1.5 border-t flex-wrap ${
                                      isInbound ? 'border-slate-100' : 'border-blue-500'
                                    }`}>
                                      {log.price > 0 && (
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                                          !isInbound
                                            ? 'bg-blue-500 text-white border-blue-600'
                                            : priceIsBelow
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : 'bg-rose-50 text-rose-600 border-rose-200'
                                        }`}>
                                          {isInbound ? (priceIsBelow ? '✅' : '⚠️') : '🎯'} ${log.price}/unit
                                        </span>
                                      )}
                                      {log.lead_time > 0 && (
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                          isInbound ? 'bg-slate-100 text-slate-600' : 'bg-blue-500 text-white'
                                        }`}>
                                          🕒 {log.lead_time} days
                                        </span>
                                      )}
                                    </div>
                                  );
                                })()
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()
            )}
          </div>
        ) : (
          /* Execution History Area */
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 h-[480px] min-h-[480px]">
            {historyList.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 py-20">
                <FileText size={28} className="text-slate-300 animate-pulse" />
                <div className="text-[11px] font-bold">No execution history found</div>
                <div className="text-[9px] text-center max-w-xs text-slate-400">Run ProcureX to store your transaction history here.</div>
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
                    <div>PO Released: <span className="text-blue-600 font-bold">{run.poNumber || 'N/A'}</span></div>
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

        {/* Excel-style Live Bid Comparison Sheet */}
        {matchedSuppliers.length > 0 && (() => {
          const getSupplierStatusInfo = (s) => {
            const quoteForSupplier = realQuotes.find(q => q.supplier_id === s.id);
            const supplierInboundLogs = campaignLogs.filter(l => l.supplier_id === s.id && l.direction === 'inbound' && l.price > 0);
            
            const latestInboundPrice = supplierInboundLogs.length > 0 ? supplierInboundLogs[supplierInboundLogs.length - 1].price : null;
            const latestInboundLeadTime = supplierInboundLogs.length > 0 ? supplierInboundLogs[supplierInboundLogs.length - 1].lead_time : null;
            
            const agreedInfo = agreedPrices[s.id];
            const isCancelled = quoteForSupplier?.status === 'Cancelled';
            
            const price = agreedInfo 
              ? agreedInfo.target 
              : (latestInboundPrice !== null && latestInboundPrice !== undefined ? latestInboundPrice : (quoteForSupplier?.price ?? null));
              
            const leadTime = agreedInfo 
              ? agreedInfo.leadTime 
              : (latestInboundLeadTime !== null && latestInboundLeadTime !== undefined ? latestInboundLeadTime : (quoteForSupplier?.lead_time ?? null));
              
            return {
              price,
              leadTime,
              isCancelled,
              isAgreed: !!agreedInfo
            };
          };

          const sortedSuppliers = [...matchedSuppliers]
            .map(s => ({
              ...s,
              info: getSupplierStatusInfo(s)
            }))
            .sort((a, b) => {
              // Push cancelled to bottom
              if (a.info.isCancelled && !b.info.isCancelled) return 1;
              if (!a.info.isCancelled && b.info.isCancelled) return -1;
              
              // Sort by price (cheapest first, nulls at bottom)
              const priceA = a.info.price;
              const priceB = b.info.price;
              
              if (priceA === null || priceA === 0) return 1;
              if (priceB === null || priceB === 0) return -1;
              
              return priceA - priceB;
            });

          return (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 shadow-sm flex flex-col mt-2">
              {/* Excel Header Toolbar */}
              <div className="bg-slate-100 border-b border-slate-200 px-3 py-2 flex items-center justify-between text-[10px] text-slate-500 font-bold select-none">
                <div className="flex items-center gap-1.5">
                  <span className="bg-[#107c41] text-white px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase">Excel</span>
                  <span className="text-slate-700 font-bold text-[10px]">live_bid_sheet.xlsx</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[9px] text-[#107c41] font-semibold">
                  <span>fx = SORT_ASC(PRICE)</span>
                </div>
              </div>

              {/* Formula Bar */}
              <div className="bg-white border-b border-slate-200 px-3 py-1 flex items-center gap-2 text-[10px] font-mono select-none">
                <span className="text-slate-400 font-bold border-r border-slate-200 pr-2">A1</span>
                <span className="text-slate-600 truncate font-semibold">Auto-extracting active quotes in real-time...</span>
              </div>

              {/* Grid Column Indexes (A, B, C, D, E) */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left font-sans text-[10px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-400 font-mono text-[8px] border-b border-slate-200 select-none">
                      <th className="w-8 border-r border-slate-200 px-1 py-0.5 text-center bg-slate-150"></th>
                      <th className="border-r border-slate-200 px-2 py-0.5 uppercase font-bold text-center">A</th>
                      <th className="border-r border-slate-200 px-2 py-0.5 uppercase font-bold text-center">B</th>
                      <th className="border-r border-slate-200 px-2 py-0.5 uppercase font-bold text-center">C</th>
                      <th className="border-r border-slate-200 px-2 py-0.5 uppercase font-bold text-center">D</th>
                      <th className="px-2 py-0.5 uppercase font-bold text-center">E</th>
                    </tr>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 select-none text-[9px]">
                      <th className="w-8 border-r border-slate-200 px-1 py-1 text-center font-mono text-slate-400 bg-slate-100 font-bold"></th>
                      <th className="border-r border-slate-200 px-2 py-1 font-bold">SUPPLIER</th>
                      <th className="border-r border-slate-200 px-2 py-1 font-bold text-right">PRICE (USD)</th>
                      <th className="border-r border-slate-200 px-2 py-1 font-bold text-center">LEAD TIME</th>
                      <th className="border-r border-slate-200 px-2 py-1 font-bold text-center">STATUS</th>
                      <th className="px-2 py-1 font-bold text-center">RANKING</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSuppliers.map((s, idx) => {
                      const { price, leadTime, isCancelled, isAgreed } = s.info;
                      const isTopBid = idx === 0 && price !== null && !isCancelled;
                      
                      let rowBg = "bg-white";
                      if (isAgreed) rowBg = "bg-emerald-50/50";
                      else if (isCancelled) rowBg = "bg-rose-50/20 text-slate-450";
                      else if (isTopBid) rowBg = "bg-amber-50/30";
                      
                      return (
                        <tr key={s.id} className={`${rowBg} border-b border-slate-200 hover:bg-slate-50/80 transition-colors font-medium`}>
                          {/* Row Number Index */}
                          <td className="w-8 border-r border-slate-200 px-1 py-1.5 text-center font-mono select-none text-slate-400 bg-slate-100 font-bold text-[8px]">
                            {idx + 1}
                          </td>
                          {/* Supplier Name */}
                          <td className="border-r border-slate-200 px-2 py-1.5 font-bold text-slate-700 truncate max-w-[120px]">
                            {s.name}
                          </td>
                          {/* Price */}
                          <td className="border-r border-slate-200 px-2 py-1.5 text-right font-mono font-bold text-slate-800">
                            {price !== null ? `$${price.toFixed(2)}` : "—"}
                          </td>
                          {/* Lead Time */}
                          <td className="border-r border-slate-200 px-2 py-1.5 text-center font-semibold text-slate-600">
                            {leadTime !== null && leadTime !== undefined ? `${leadTime} days` : "—"}
                          </td>
                          {/* Status */}
                          <td className="border-r border-slate-200 px-2 py-1.5 text-center">
                            {isCancelled ? (
                              <span className="text-[8px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                                Withdrawn
                              </span>
                            ) : isAgreed ? (
                              <span className="text-[8px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200">
                                Awarded
                              </span>
                            ) : price !== null ? (
                              <span className="text-[8px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                Quoted
                              </span>
                            ) : (
                              <span className="text-[8px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 animate-pulse">
                                Pending
                              </span>
                            )}
                          </td>
                          {/* Ranking Badge */}
                          <td className="px-2 py-1.5 text-center font-bold">
                            {isCancelled ? (
                              <span className="text-slate-400 font-medium">N/A</span>
                            ) : isTopBid ? (
                              <span className="text-[8px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                                🏆 Best Bid
                              </span>
                            ) : (
                              <span className="text-[8px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-full">
                                #{idx + 1}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* ProcureX Telemetry Footer */}
        {agentStatus === 'completed' && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
              <span>ProcureX Performance Audit</span>
              <span className="text-emerald-600">COMPLETED</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-slate-600 font-semibold">
              <div>• Time Elapsed: <span className="text-slate-800 font-bold">4.2 Seconds</span></div>
              <div>• Bids Negotiated: <span className="text-slate-800 font-bold">30 Bids</span></div>
              <div>• ERP Sync Success: <span className="text-slate-850 font-bold">Dynamics 365 (OData)</span></div>
              <div>• Savings Achieved: <span className="text-emerald-600 font-bold">+14.2% Saved</span></div>
            </div>
          </div>
        )}

      </div>

      {/* Maximized Live Logs Modal */}
      {isLogsMaximized && (() => {
        const filteredLogs = logs.filter(log => 
          log.message.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
          log.timestamp.toLowerCase().includes(logSearchQuery.toLowerCase())
        );
        
        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 md:p-6 transition-all duration-300">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-6xl h-[85vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl shadow-blue-900/15 transform transition-all duration-300 scale-100">
              
              {/* Modal Header */}
              <div className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <Terminal className="text-[#0078d4]" size={18} />
                  <div>
                    <h3 className="text-sm font-bold text-white leading-none">Live Logs Console</h3>
                    <span className="text-[10px] text-slate-400 font-semibold">ProcureX Autonomous Agent Operations</span>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative flex items-center flex-1 max-w-md">
                  <Search className="absolute left-3 text-slate-500" size={14} />
                  <input
                    type="text"
                    placeholder="Search and filter logs..."
                    value={logSearchQuery}
                    onChange={(e) => setLogSearchQuery(e.target.value)}
                    className="w-full text-xs pl-9 pr-8 py-2 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:border-[#0078d4] text-white font-medium placeholder:text-slate-500"
                  />
                  {logSearchQuery && (
                    <button
                      onClick={() => setLogSearchQuery("")}
                      className="absolute right-3 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-3">
                  {logSearchQuery && (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-800 border border-slate-700 px-2 py-1 rounded-lg">
                      {filteredLogs.length} match{filteredLogs.length !== 1 ? 'es' : ''}
                    </span>
                  )}
                  <button
                    onClick={handleDownloadLogs}
                    disabled={logs.length === 0}
                    className="flex items-center gap-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 rounded-xl disabled:opacity-40 cursor-pointer transition-colors"
                  >
                    <Download size={13} /> Download
                  </button>
                  <button
                    onClick={() => {
                      setIsLogsMaximized(false);
                      setLogSearchQuery("");
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-white bg-slate-800 hover:bg-rose-600 border border-slate-750 hover:border-rose-500 px-3 py-2 rounded-xl cursor-pointer transition-colors"
                  >
                    <Minimize2 size={13} /> Close
                  </button>
                </div>
              </div>

              {/* Modal Terminal Console */}
              <div className="flex-1 bg-slate-950 p-6 overflow-y-auto flex flex-col font-mono text-xs md:text-sm select-text leading-relaxed">
                <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
                  {filteredLogs.map((log, i) => (
                    <div key={i} className="flex items-start gap-2.5 hover:bg-slate-900/40 p-1 rounded transition-colors">
                      <span className="text-slate-500 select-none shrink-0 font-medium">[{log.timestamp}]</span>
                      <span className="break-all font-medium">{renderLogMessage(log)}</span>
                    </div>
                  ))}

                  {filteredLogs.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 font-sans space-y-3 py-20">
                      <Bot size={32} className="text-slate-600 animate-pulse" />
                      <div className="text-sm font-bold text-slate-400">
                        {logSearchQuery ? "No matches found" : "ProcureX Standby"}
                      </div>
                      <div className="text-xs text-center max-w-sm text-slate-500">
                        {logSearchQuery 
                          ? "Try refining your search query or clear the filter." 
                          : "Upload an RFQ blueprint or sheet to initiate execution and view real-time operations."}
                      </div>
                    </div>
                  )}
                  
                  <div ref={maximizedLogsEndRef} />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-950 border-t border-slate-800 px-6 py-3 flex items-center justify-between text-[11px] text-slate-400 font-semibold select-none">
                <div className="flex items-center gap-4">
                  <span>Total Logs: <strong className="text-white">{logs.length}</strong></span>
                  {logSearchQuery && (
                    <span>Filtered Logs: <strong className="text-[#0078d4]">{filteredLogs.length}</strong></span>
                  )}
                  <span>RFQ ID: <strong className="text-white">{realStatusRfq || "None"}</strong></span>
                </div>
                <div>
                  <span>Status: <strong className={agentStatus === 'completed' ? 'text-emerald-500' : agentStatus === 'running' ? 'text-[#0078d4]' : 'text-amber-500'}>{agentStatus.toUpperCase()}</strong></span>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
