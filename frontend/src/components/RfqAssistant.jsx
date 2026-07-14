import React, { useState, useEffect } from 'react';
import { 
  Plus, Upload, FileText, CheckCircle, AlertTriangle, 
  Calendar, MapPin, Tag, MessageSquare, ListFilter,
  CheckCircle2, Circle, ArrowLeft, Bot, Sparkles, Send, ShieldAlert
} from 'lucide-react';
import { rfqService } from '../services/api';

export default function RfqAssistant({ initialOpenCreate = false }) {
  const [rfqs, setRfqs] = useState([]);
  const [selectedRfq, setSelectedRfq] = useState(null);
  const [rfqTimeline, setRfqTimeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(initialOpenCreate);
  
  // Create Form State
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
    drawing_attachment: ''
  });
  
  const [uploading, setUploading] = useState(false);
  const [missingFields, setMissingFields] = useState([]);
  const [isAiExtracted, setIsAiExtracted] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchRfqs();
  }, []);

  useEffect(() => {
    if (initialOpenCreate) {
      setShowCreate(true);
    }
  }, [initialOpenCreate]);

  const fetchRfqs = () => {
    setLoading(true);
    rfqService.getAll()
      .then((res) => {
        setRfqs(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  const handleSelectRfq = (rfqNumber) => {
    setLoading(true);
    Promise.all([
      rfqService.getDetails(rfqNumber),
      rfqService.getTimeline(rfqNumber)
    ]).then(([detailsRes, timelineRes]) => {
      setSelectedRfq(detailsRes.data);
      setRfqTimeline(timelineRes.data);
      setLoading(false);
    }).catch((err) => {
      console.error(err);
      setLoading(false);
    });
  };

  // OCR Document Upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setIsAiExtracted(false);
    setMissingFields([]);
    setErrorMsg('');

    rfqService.uploadAndExtract(file)
      .then((res) => {
        const { data, filename } = res.data;
        
        // Populate form
        setFormData({
          rfq_number: data.rfq_number || 'RFQ-2026-TEMP',
          project_name: data.project_name || '',
          department: data.department || 'Procurement',
          required_date: data.required_date || '',
          item_name: data.item_name || '',
          item_code: data.item_code || '',
          description: data.description || '',
          quantity: data.quantity || '',
          unit: data.unit || 'MT',
          specifications: data.specifications || '',
          priority: data.priority || 'Medium',
          delivery_location: data.delivery_location || 'Riyadh Warehouse',
          expected_delivery_date: data.expected_delivery_date || '',
          remarks: data.remarks || '',
          drawing_attachment: data.drawing_attachment || filename
        });
        
        setMissingFields(data.missing_fields || []);
        setIsAiExtracted(true);
        setUploading(false);
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.item_name || !formData.quantity || !formData.unit) {
      setErrorMsg('Item Name, Quantity and Unit are required fields.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('Generating RFQ, please wait...');

    rfqService.create(formData)
      .then((res) => {
        setSuccessMsg(`RFQ ${res.data.rfq_number} generated successfully!`);
        setShowCreate(false);
        fetchRfqs();
        
        // Reset form
        setFormData({
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
          drawing_attachment: ''
        });
        setIsAiExtracted(false);
        setMissingFields([]);
        
        // Close success toast after 3s
        setTimeout(() => setSuccessMsg(''), 3000);
      })
      .catch((err) => {
        console.error(err);
        setErrorMsg('Failed to save RFQ. Try again.');
        setSuccessMsg('');
      });
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
      
      {/* Toast Alert */}
      {successMsg && (
        <div className="fixed top-4 right-4 bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-bounce">
          <CheckCircle size={20} />
          <span className="text-sm font-semibold">{successMsg}</span>
        </div>
      )}

      {/* Main View Toggle */}
      {!selectedRfq && !showCreate ? (
        // LIST VIEW
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h1 className="text-xl font-bold text-slate-800">RFQ Repository</h1>
              <p className="text-xs text-slate-500 mt-1">Review active and completed RFQs, or generate new ones using document extraction.</p>
            </div>
            <button 
              onClick={() => setShowCreate(true)}
              className="copilot-btn-primary text-xs"
            >
              <Plus size={14} /> New RFQ Assistant
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0078d4] mx-auto mb-2"></div>
                <span className="text-xs font-semibold">Loading RFQs...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
                      <th className="p-4">RFQ ID</th>
                      <th className="p-4">Project Name</th>
                      <th className="p-4">Item Name</th>
                      <th className="p-4 text-right">Quantity</th>
                      <th className="p-4">Priority</th>
                      <th className="p-4">Required Date</th>
                      <th className="p-4">Created Date</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {rfqs.map((r, i) => (
                      <tr 
                        key={i} 
                        onClick={() => handleSelectRfq(r.rfq_number)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="p-4 font-semibold text-[#0078d4]">{r.rfq_number}</td>
                        <td className="p-4 font-medium text-slate-800">{r.project_name}</td>
                        <td className="p-4 font-medium text-slate-900">{r.item_name}</td>
                        <td className="p-4 text-right font-medium text-slate-600">{r.quantity} {r.unit}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            r.priority === 'High' ? 'bg-rose-50 text-rose-700' :
                            r.priority === 'Medium' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {r.priority}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500">{r.required_date || 'N/A'}</td>
                        <td className="p-4 text-slate-400">{r.created_at}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
                            r.status === 'PO Generated' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            r.status === 'Approved' ? 'bg-teal-50 text-teal-700 border border-teal-100' :
                            r.status === 'RFQ Sent' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                            r.status === 'Responses Received' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : showCreate ? (
        // CREATE VIEW (OCR Assistant)
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <button 
              onClick={() => { setShowCreate(false); fetchRfqs(); }}
              className="flex items-center gap-1.5 text-slate-600 hover:text-slate-800 text-xs font-semibold bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm transition-colors"
            >
              <ArrowLeft size={14} /> Back to Repository
            </button>
            <h1 className="text-lg font-bold text-slate-800">Generate RFQ Assistant</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: AI Document Upload & Parse */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Bot size={18} className="text-[#0078d4]" />
                  <h3 className="text-sm font-semibold text-slate-800">AI Document Parser</h3>
                </div>
                
                <p className="text-xs text-slate-500 leading-relaxed">
                  Upload an existing RFQ draft, purchase requisition, or technical datasheet (PDF, Word, or Excel). The AI Copilot will read it, extract details, and populate the draft.
                </p>

                {/* Upload drag drop box */}
                <div className="border-2 border-dashed border-slate-350 hover:border-[#0078d4] rounded-xl p-6 text-center cursor-pointer bg-slate-50/50 hover:bg-blue-50/20 transition-all relative">
                  <input 
                    type="file" 
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept=".pdf,.docx,.doc,.xlsx,.xls,.txt"
                    disabled={uploading}
                  />
                  <Upload className="mx-auto text-slate-400 mb-2" size={28} />
                  <span className="text-xs font-semibold text-slate-700 block">Click to select files</span>
                  <span className="text-[10px] text-slate-400 mt-1 block">PDF, Excel, Word, or Text up to 10MB</span>
                </div>

                {uploading && (
                  <div className="ai-thinking-shimmer p-4 rounded-xl border border-blue-200 flex items-center gap-3">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#0078d4] shrink-0"></div>
                    <div className="text-xs font-medium text-[#106ebe]">AI is reading and extracting document content...</div>
                  </div>
                )}

                {isAiExtracted && (
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs">
                      <Sparkles size={14} />
                      <span>Data Extracted Successfully!</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      AI has parsed the document. Review the populated fields in the builder block on the right.
                    </p>
                  </div>
                )}

                {/* Missing fields warnings */}
                {missingFields.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-2">
                    <div className="flex items-center gap-1.5 text-amber-700 font-semibold text-xs">
                      <ShieldAlert size={14} />
                      <span>Missing Information Flagged</span>
                    </div>
                    <ul className="list-disc pl-4 text-[10px] text-slate-500 space-y-1">
                      {missingFields.map((f, i) => (
                        <li key={i}>We found no **{f}** value. Please check and enter it.</li>
                      ))}
                    </ul>
                  </div>
                )}

                {errorMsg && (
                  <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                    <AlertTriangle size={14} />
                    <span>{errorMsg}</span>
                  </div>
                )}

              </div>
            </div>

            {/* Right Column: RFQ Form Builder */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-5">
                <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">RFQ Data Builder</h2>
                {isAiExtracted && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                    <CheckCircle size={10} /> Copilot Filled
                  </span>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* Row 1: RFQ Number & Project Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-600 mb-1">RFQ Reference</label>
                    <input 
                      type="text" 
                      name="rfq_number"
                      value={formData.rfq_number}
                      onChange={handleFormChange}
                      className="copilot-input bg-slate-50"
                      readOnly
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-600 mb-1">Project Name *</label>
                    <input 
                      type="text" 
                      name="project_name"
                      value={formData.project_name}
                      onChange={handleFormChange}
                      placeholder="e.g. Project PVC Resin Supply Phase 3"
                      className="copilot-input"
                      required
                    />
                  </div>
                </div>

                {/* Row 2: Department & Required Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-600 mb-1">Department</label>
                    <select 
                      name="department"
                      value={formData.department}
                      onChange={handleFormChange}
                      className="copilot-input"
                    >
                      <option value="Procurement">Procurement</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Production">Production</option>
                      <option value="Maintenance">Maintenance</option>
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-600 mb-1">Required Date *</label>
                    <input 
                      type="date" 
                      name="required_date"
                      value={formData.required_date}
                      onChange={handleFormChange}
                      className="copilot-input"
                      required
                    />
                  </div>
                </div>

                {/* Row 3: Item Name & Item Code */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-600 mb-1">Item / Material Name *</label>
                    <input 
                      type="text" 
                      name="item_name"
                      value={formData.item_name}
                      onChange={handleFormChange}
                      placeholder="e.g. PVC Resin"
                      className="copilot-input"
                      required
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-600 mb-1">Item Code</label>
                    <input 
                      type="text" 
                      name="item_code"
                      value={formData.item_code}
                      onChange={handleFormChange}
                      placeholder="e.g. ITM-POL-0428"
                      className="copilot-input"
                    />
                  </div>
                </div>

                {/* Row 4: Quantity & Unit & Priority */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-600 mb-1">Quantity *</label>
                    <input 
                      type="number" 
                      step="any"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleFormChange}
                      placeholder="e.g. 100"
                      className="copilot-input"
                      required
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-600 mb-1">Unit *</label>
                    <select 
                      name="unit"
                      value={formData.unit}
                      onChange={handleFormChange}
                      className="copilot-input"
                    >
                      <option value="MT">Metric Tons (MT)</option>
                      <option value="KG">Kilograms (KG)</option>
                      <option value="Pcs">Pieces (Pcs)</option>
                      <option value="Liters">Liters</option>
                      <option value="Rolls">Rolls</option>
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-600 mb-1">Priority</label>
                    <select 
                      name="priority"
                      value={formData.priority}
                      onChange={handleFormChange}
                      className="copilot-input"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>

                {/* Row 5: Description */}
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-slate-600 mb-1">Material Description</label>
                  <textarea 
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    rows="3"
                    placeholder="Enter detailed chemical/physical grade description..."
                    className="copilot-input"
                  ></textarea>
                </div>

                {/* Row 6: Specifications */}
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-slate-600 mb-1">Technical Specifications</label>
                  <textarea 
                    name="specifications"
                    value={formData.specifications}
                    onChange={handleFormChange}
                    rows="2"
                    placeholder="K-value, Viscosity, Density, Purity, certificates required, etc."
                    className="copilot-input"
                  ></textarea>
                </div>

                {/* Row 7: Delivery Location & Expected Delivery Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-600 mb-1">Delivery Location</label>
                    <input 
                      type="text" 
                      name="delivery_location"
                      value={formData.delivery_location}
                      onChange={handleFormChange}
                      placeholder="e.g. Jeddah Plant"
                      className="copilot-input"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-600 mb-1">Expected Delivery Date</label>
                    <input 
                      type="date" 
                      name="expected_delivery_date"
                      value={formData.expected_delivery_date}
                      onChange={handleFormChange}
                      className="copilot-input"
                    />
                  </div>
                </div>

                {/* Drawing Attachment & Remarks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-600 mb-1">Drawing/Datasheet File</label>
                    <input 
                      type="text" 
                      name="drawing_attachment"
                      value={formData.drawing_attachment}
                      onChange={handleFormChange}
                      placeholder="No drawing attached"
                      className="copilot-input bg-slate-50"
                      readOnly
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-600 mb-1">Remarks</label>
                    <input 
                      type="text" 
                      name="remarks"
                      value={formData.remarks}
                      onChange={handleFormChange}
                      placeholder="Commercial requirements..."
                      className="copilot-input"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button 
                    type="button"
                    onClick={() => { setShowCreate(false); fetchRfqs(); }}
                    className="copilot-btn-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="copilot-btn-primary text-xs"
                  >
                    Generate RFQ Record
                  </button>
                </div>

              </form>

            </div>

          </div>
        </div>
      ) : (
        // RFQ DETAIL VIEW + ACTIVITY TIMELINE (MODULE 8)
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <button 
              onClick={() => { setSelectedRfq(null); fetchRfqs(); }}
              className="flex items-center gap-1.5 text-slate-600 hover:text-slate-800 text-xs font-semibold bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm transition-colors"
            >
              <ArrowLeft size={14} /> Back to Repository
            </button>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-400">STATUS</span>
              <div className="text-sm font-bold text-[#0078d4]">{selectedRfq.status}</div>
            </div>
          </div>

          {/* Stepper Timeline (Module 8) */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">RFQ Activity Timeline Steps</h3>
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-4 overflow-x-auto pb-2">
              {rfqTimeline.full_flow.map((stage, idx) => {
                const isCompleted = rfqTimeline.completed_stages.includes(stage);
                const isLastEvent = rfqTimeline.events[rfqTimeline.events.length - 1]?.stage === stage;
                
                return (
                  <div key={idx} className="flex-1 flex flex-row md:flex-col items-center gap-2.5 min-w-[100px] relative">
                    
                    {/* Horizontal Connector Line for desktop */}
                    {idx < rfqTimeline.full_flow.length - 1 && (
                      <div className={`hidden md:block absolute top-[11px] left-[58%] right-[-42%] h-0.5 z-0 ${
                        rfqTimeline.completed_stages.includes(rfqTimeline.full_flow[idx + 1]) ? 'bg-emerald-500' : 'bg-slate-200'
                      }`}></div>
                    )}
                    
                    {/* Visual Check/Circle */}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 font-bold text-xs ${
                      isCompleted 
                        ? 'bg-emerald-500 text-white' 
                        : 'border-2 border-slate-300 text-slate-400 bg-white'
                    }`}>
                      {isCompleted ? '✓' : idx + 1}
                    </div>

                    {/* Stage Title and details */}
                    <div className="md:text-center">
                      <div className={`text-xs font-semibold ${isCompleted ? 'text-slate-800' : 'text-slate-400'}`}>
                        {stage}
                      </div>
                      
                      {/* Show timestamp under current active last stage */}
                      {isCompleted && (
                        <div className="text-[9px] text-slate-400 font-medium mt-0.5">
                          {rfqTimeline.events.find(e => e.stage === stage)?.timestamp.split(' ')[0]}
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          {/* Details & Quotes list */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* RFQ Meta Info columns */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">RFQ REFERENCE</span>
                  <h2 className="text-lg font-bold text-slate-800">{selectedRfq.rfq_number}</h2>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block text-right">PRIORITY</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold inline-block ${
                    selectedRfq.priority === 'High' ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'
                  }`}>{selectedRfq.priority}</span>
                </div>
              </div>

              {/* Grid properties */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">Project Name</span>
                  <span className="text-slate-800 font-semibold">{selectedRfq.project_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Department</span>
                  <span className="text-slate-800 font-semibold">{selectedRfq.department}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Item Name & Code</span>
                  <span className="text-slate-850 font-bold">{selectedRfq.item_name} {selectedRfq.item_code && `(${selectedRfq.item_code})`}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Required Quantity</span>
                  <span className="text-slate-800 font-bold">{selectedRfq.quantity} {selectedRfq.unit}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Delivery Site</span>
                  <span className="text-slate-800 font-semibold">{selectedRfq.delivery_location || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Required Date</span>
                  <span className="text-slate-800 font-semibold">{selectedRfq.required_date || 'N/A'}</span>
                </div>
              </div>

              {selectedRfq.description && (
                <div className="border-t border-slate-100 pt-3 text-xs">
                  <span className="text-slate-400 font-medium block mb-1">Material Description</span>
                  <p className="text-slate-650 leading-relaxed font-medium">{selectedRfq.description}</p>
                </div>
              )}

              {selectedRfq.specifications && (
                <div className="border-t border-slate-100 pt-3 text-xs">
                  <span className="text-slate-400 font-medium block mb-1">Specifications</span>
                  <pre className="text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-150 font-sans leading-relaxed whitespace-pre-wrap">
                    {selectedRfq.specifications}
                  </pre>
                </div>
              )}

              {selectedRfq.drawing_attachment && (
                <div className="border-t border-slate-100 pt-3 text-xs flex items-center gap-2">
                  <FileText size={18} className="text-[#0078d4]" />
                  <div>
                    <span className="text-slate-400 font-medium">Drawing Attachment</span>
                    <span className="text-slate-800 block font-semibold">{selectedRfq.drawing_attachment}</span>
                  </div>
                </div>
              )}

            </div>

            {/* Quote details sidebar */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col">
              <h3 className="text-sm font-semibold text-slate-800 mb-3 border-b border-slate-100 pb-2">Assigned Quotations</h3>
              
              <div className="flex-1 space-y-3">
                {selectedRfq.quotes.length === 0 ? (
                  <div className="text-center text-xs text-slate-400 py-10">No quotes uploaded. Go to Quote Comparison to upload.</div>
                ) : (
                  selectedRfq.quotes.map((q, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-150 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-slate-800">{q.supplier_name}</span>
                        <span className="text-xs font-bold text-slate-700">${q.price.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                        <span>Lead Time: {q.lead_time_days} days</span>
                        <span className="font-semibold text-emerald-600">{q.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Timeline Audit Logs */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Timeline Transaction History Logs</h3>
            <div className="space-y-2.5">
              {rfqTimeline.events.map((ev, i) => (
                <div key={i} className="flex justify-between items-start text-xs border-b border-slate-50 pb-2">
                  <div>
                    <span className="font-semibold text-slate-700 mr-2">[{ev.timestamp}]</span>
                    <span className="font-bold text-[#0078d4] mr-2">{ev.stage}:</span>
                    <span className="text-slate-600 font-medium">{ev.details}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
