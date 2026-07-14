import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const dashboardService = {
  getStats: () => api.get('/api/dashboard/stats'),
};

export const rfqService = {
  getAll: () => api.get('/api/rfqs'),
  getDetails: (rfqNumber) => api.get(`/api/rfqs/${rfqNumber}`),
  create: (data) => api.post('/api/rfqs/create', data),
  uploadAndExtract: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/rfqs/extract-upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getTimeline: (rfqNumber) => api.get(`/api/rfqs/${rfqNumber}/timeline`),
};

export const supplierService = {
  getAll: () => api.get('/api/suppliers'),
  search: (query, sources, aiSearch = false) => api.get('/api/suppliers/search', { params: { query, sources, ai_search: aiSearch } }),
  getProfile: (id) => api.get(`/api/suppliers/${id}/profile`),
  add: (data) => api.post('/api/suppliers', data),
};

export const emailService = {
  generateDraft: (rfqNumber, supplierId) => api.post('/api/email/generate', { rfq_number: rfqNumber, supplier_id: supplierId }),
  sendEmail: (rfqNumber, supplierId, subject, body) => api.post('/api/email/send', { rfq_number: rfqNumber, supplier_id: supplierId, subject, body }),
  getFollowUpStatus: () => api.get('/api/email/follow-up-status'),
  triggerReminder: (emailId) => api.post('/api/email/trigger-reminder', { email_id: emailId }),
};

export const comparisonService = {
  uploadQuote: (rfqNumber, supplierId, file) => {
    const formData = new FormData();
    formData.append('rfq_number', rfqNumber);
    formData.append('supplier_id', supplierId);
    formData.append('file', file);
    return api.post('/api/comparison/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  saveQuote: (rfqNumber, supplierId, metrics) => api.post('/api/comparison/save-quote', { rfq_number: rfqNumber, supplier_id: supplierId, metrics }),
  viewComparison: (rfqNumber) => api.get('/api/comparison/view', { params: { rfq_number: rfqNumber } }),
  approveRecommendation: (rfqNumber) => api.post('/api/comparison/approve', { rfq_number: rfqNumber }),
  generatePO: (rfqNumber, supplierName) => api.post('/api/comparison/generate-po', { rfq_number: rfqNumber, supplier_name: supplierName }),
  getPO: (rfqNumber) => api.get(`/api/rfqs/${rfqNumber}/po`),
};

export const copilotService = {
  chat: (messages, rfqNumber = null) => api.post('/api/copilot/chat', { messages, rfq_number: rfqNumber }),
};

export const campaignService = {
  simulate: (rfqNumber) => api.post('/api/campaign/simulate', { rfq_number: rfqNumber }),
};

export const erpService = {
  sync: (objectType, objectId) => api.post('/api/erp/sync', { object_type: objectType, object_id: objectId }),
  getLogs: () => api.get('/api/erp/logs'),
  getStats: () => api.get('/api/erp/stats'),
};

export const phase2Service = {
  getProdPlanning: () => api.get('/api/phase2/prod-planning'),
  optimizeSchedule: () => api.post('/api/phase2/optimize-schedule'),
  getDemandForecast: (conf) => api.get('/api/phase2/demand-forecast', { params: { confidence: conf } }),
  generateRfqDrafts: () => api.post('/api/phase2/generate-rfq-drafts'),
  getInventory: () => api.get('/api/phase2/inventory'),
  autoRefill: () => api.post('/api/phase2/auto-refill'),
  getMfgTelemetry: () => api.get('/api/phase2/mfg-telemetry'),
  getQualityVision: () => api.get('/api/phase2/quality-vision'),
  analyzeDrawing: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/phase2/analyze-drawing', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getPowerBiData: () => api.get('/api/phase2/powerbi-data'),
};

export const dbService = {
  seed: () => api.post('/api/db/seed'),
};

export default api;
