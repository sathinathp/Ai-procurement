import React, { useState } from 'react';
import {
  ShieldCheck, ShieldAlert, ShieldX, AlertTriangle, CheckCircle2,
  XCircle, Clock, Globe, FileText, Zap, Building2, Users,
  ChevronDown, ChevronUp, Info, HelpCircle, RefreshCw, Download,
  Star, AlertCircle, Lock
} from 'lucide-react';

// ── Static Compliance Data ─────────────────────────────────────────────────
const SUPPLIERS = [
  {
    id: 1,
    name: 'Gulf Process Systems',
    source: 'Existing',
    sourceType: 'existing',
    country: 'USA (Texas)',
    category: 'Chemical Dosing Pumps',
    aiMatch: 91,
    priceHistory: '$4,850',
    delivery: '24 days',
    compliance: {
      technicalMatch:       { status: 'pass', label: 'Technical Match',         note: 'Meets all 12 pump specifications' },
      commercialMatch:      { status: 'pass', label: 'Commercial Match',         note: 'Net 45 · 24-month warranty confirmed' },
      supplierApproved:     { status: 'pass', label: 'Supplier Approved',        note: 'Active on Approved Vendor List (AVL)' },
      complianceReview:     { status: 'pass', label: 'Compliance Review',        note: 'Last audited: Jan 2026' },
      countryOfOrigin:      { status: 'pass', label: 'Country of Origin',        note: 'USA — No trade restriction' },
      hseDocumentation:     { status: 'pass', label: 'HSE Documentation',        note: 'ISO 14001 · OSHA certified on file' },
      cyberSecurity:        { status: 'pass', label: 'Cybersecurity Compliance', note: 'SOC 2 Type II verified' },
      integrityCheck:       { status: 'pass', label: 'Supplier Integrity',       note: 'No sanctions · No adverse findings' },
    }
  },
  {
    id: 2,
    name: 'AquaFlow Controls',
    source: 'Preferred',
    sourceType: 'preferred',
    country: 'USA (Houston, TX)',
    category: 'Chemical Dosing Pumps',
    aiMatch: 95,
    priceHistory: '$5,100',
    delivery: '18 days',
    compliance: {
      technicalMatch:       { status: 'pass', label: 'Technical Match',         note: 'Full compliance — PVDF / PTFE materials confirmed' },
      commercialMatch:      { status: 'pass', label: 'Commercial Match',         note: 'Net 45 · 24-month warranty · NEMA 4X confirmed' },
      supplierApproved:     { status: 'pass', label: 'Supplier Approved',        note: 'Tier-1 Preferred Supplier · 3-yr relationship' },
      complianceReview:     { status: 'pass', label: 'Compliance Review',        note: 'Last audited: Mar 2026 · No findings' },
      countryOfOrigin:      { status: 'pass', label: 'Country of Origin',        note: 'USA — Fully compliant' },
      hseDocumentation:     { status: 'pass', label: 'HSE Documentation',        note: 'ISO 45001 · EPA compliant on file' },
      cyberSecurity:        { status: 'pass', label: 'Cybersecurity Compliance', note: 'NIST SP 800-171 compliant' },
      integrityCheck:       { status: 'pass', label: 'Supplier Integrity',       note: 'Clean · No disputes · Excellent references' },
    }
  },
  {
    id: 3,
    name: 'MetroChem Systems',
    source: 'Existing',
    sourceType: 'existing',
    country: 'USA (Dallas, TX)',
    category: 'Chemical Dosing Pumps',
    aiMatch: 82,
    priceHistory: '$4,700',
    delivery: '35 days',
    compliance: {
      technicalMatch:       { status: 'pass',    label: 'Technical Match',         note: 'Meets spec — minor deviation on enclosure rating (NEMA 3R)' },
      commercialMatch:      { status: 'warning',  label: 'Commercial Match',         note: 'Net 30 only — preferred terms not available' },
      supplierApproved:     { status: 'pass',    label: 'Supplier Approved',        note: 'Approved · 6 prior POs' },
      complianceReview:     { status: 'warning',  label: 'Compliance Review',        note: 'Last audited: Oct 2024 — overdue for re-audit' },
      countryOfOrigin:      { status: 'pass',    label: 'Country of Origin',        note: 'USA — Compliant' },
      hseDocumentation:     { status: 'pass',    label: 'HSE Documentation',        note: 'OSHA docs on file' },
      cyberSecurity:        { status: 'warning',  label: 'Cybersecurity Compliance', note: 'Self-assessed only — third-party audit pending' },
      integrityCheck:       { status: 'pass',    label: 'Supplier Integrity',       note: 'No sanctions · 1 minor complaint resolved' },
    }
  },
  {
    id: 4,
    name: 'FlowTech USA',
    source: 'Oppora',
    sourceType: 'new',
    country: 'USA (San Antonio, TX)',
    category: 'Chemical Dosing Pumps',
    aiMatch: 89,
    priceHistory: 'New',
    delivery: '19 days*',
    compliance: {
      technicalMatch:       { status: 'pass',    label: 'Technical Match',         note: 'Datasheet confirms 0–120 L/hr · 7 bar · PVDF wetted parts' },
      commercialMatch:      { status: 'pass',    label: 'Commercial Match',         note: 'Quoted Net 30 · 18-month warranty — negotiation possible' },
      supplierApproved:     { status: 'fail',    label: 'Supplier Approved',        note: 'Not yet on Approved Vendor List — registration required' },
      complianceReview:     { status: 'pending', label: 'Compliance Review',        note: 'Onboarding questionnaire not yet submitted' },
      countryOfOrigin:      { status: 'pending', label: 'Country of Origin',        note: 'Declared USA — verification in progress' },
      hseDocumentation:     { status: 'pending', label: 'HSE Documentation',        note: 'Certificate request sent — awaiting supplier response' },
      cyberSecurity:        { status: 'pending', label: 'Cybersecurity Compliance', note: 'Not assessed — new supplier' },
      integrityCheck:       { status: 'warning',  label: 'Supplier Integrity',       note: 'Background check initiated — results pending' },
    }
  },
  {
    id: 5,
    name: 'Precision Dosing Systems',
    source: 'External',
    sourceType: 'new',
    country: 'USA (Houston, TX)',
    category: 'Chemical Dosing Pumps',
    aiMatch: 87,
    priceHistory: 'New',
    delivery: '16 days*',
    compliance: {
      technicalMatch:       { status: 'pass',    label: 'Technical Match',         note: '4–20 mA control confirmed · 460V/3Ph/60Hz motor' },
      commercialMatch:      { status: 'warning',  label: 'Commercial Match',         note: 'Payment terms TBD — initial contact stage' },
      supplierApproved:     { status: 'fail',    label: 'Supplier Approved',        note: 'Not on AVL — full vendor qualification required' },
      complianceReview:     { status: 'pending', label: 'Compliance Review',        note: 'Pre-qualification form not yet initiated' },
      countryOfOrigin:      { status: 'pending', label: 'Country of Origin',        note: 'Pending documentation' },
      hseDocumentation:     { status: 'fail',    label: 'HSE Documentation',        note: 'No HSE records available — must obtain before PO' },
      cyberSecurity:        { status: 'pending', label: 'Cybersecurity Compliance', note: 'Not assessed' },
      integrityCheck:       { status: 'pending', label: 'Supplier Integrity',       note: 'Sanctions screening not yet run' },
    }
  },
  {
    id: 6,
    name: 'Industrial Pump Solutions',
    source: 'Oppora',
    sourceType: 'new',
    country: 'USA (Austin, TX)',
    category: 'Chemical Dosing Pumps',
    aiMatch: 84,
    priceHistory: 'New',
    delivery: 'TBD',
    compliance: {
      technicalMatch:       { status: 'warning',  label: 'Technical Match',         note: 'Partial — flow range confirmed, discharge pressure unverified' },
      commercialMatch:      { status: 'pending', label: 'Commercial Match',         note: 'No quote received yet — outreach sent' },
      supplierApproved:     { status: 'fail',    label: 'Supplier Approved',        note: 'New supplier — not on AVL' },
      complianceReview:     { status: 'pending', label: 'Compliance Review',        note: 'Onboarding not started' },
      countryOfOrigin:      { status: 'pending', label: 'Country of Origin',        note: 'Pending' },
      hseDocumentation:     { status: 'pending', label: 'HSE Documentation',        note: 'Pending' },
      cyberSecurity:        { status: 'pending', label: 'Cybersecurity Compliance', note: 'Not assessed' },
      integrityCheck:       { status: 'pending', label: 'Supplier Integrity',       note: 'Pending background check' },
    }
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pass:    { icon: CheckCircle2,  color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200',  badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: '✓',  dot: 'bg-emerald-500' },
  fail:    { icon: XCircle,       color: 'text-rose-600',    bg: 'bg-rose-50 border-rose-200',         badge: 'bg-rose-100 text-rose-700 border-rose-200',           label: '✕',  dot: 'bg-rose-500'    },
  warning: { icon: AlertTriangle, color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200',       badge: 'bg-amber-100 text-amber-700 border-amber-200',         label: '⚠',  dot: 'bg-amber-500'   },
  pending: { icon: Clock,         color: 'text-slate-500',   bg: 'bg-slate-50 border-slate-200',       badge: 'bg-slate-100 text-slate-600 border-slate-200',         label: '…',  dot: 'bg-slate-400'   },
};

const SOURCE_CONFIG = {
  existing:  { label: 'Existing',   cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  preferred: { label: 'Preferred',  cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  new:       { label: 'New ⚡',     cls: 'bg-violet-100 text-violet-700 border-violet-200' },
};

function getOverallStatus(compliance) {
  const vals = Object.values(compliance).map(c => c.status);
  if (vals.includes('fail'))    return 'fail';
  if (vals.includes('pending')) return 'pending';
  if (vals.includes('warning')) return 'warning';
  return 'pass';
}

function StatusBadge({ status, size = 'sm' }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  const cls = size === 'lg'
    ? `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${cfg.badge}`
    : `inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold border ${cfg.badge}`;
  return (
    <span className={cls}>
      <Icon size={size === 'lg' ? 13 : 10} />
      {status === 'pass' ? 'Cleared' : status === 'fail' ? 'Required' : status === 'warning' ? 'Action Needed' : 'Pending'}
    </span>
  );
}

function ComplianceRow({ item }) {
  const cfg = STATUS_CONFIG[item.status];
  const Icon = cfg.icon;
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${cfg.bg} transition-all`}>
      <Icon size={15} className={`${cfg.color} shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-800">{item.label}</span>
          <StatusBadge status={item.status} />
        </div>
        <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{item.note}</p>
      </div>
    </div>
  );
}

function SupplierComplianceCard({ supplier }) {
  const [expanded, setExpanded] = useState(supplier.sourceType === 'new');
  const overall = getOverallStatus(supplier.compliance);
  const srcCfg  = SOURCE_CONFIG[supplier.sourceType] || SOURCE_CONFIG.existing;
  const overallCfg = STATUS_CONFIG[overall];

  const passCount    = Object.values(supplier.compliance).filter(c => c.status === 'pass').length;
  const totalCount   = Object.keys(supplier.compliance).length;

  return (
    <div className={`bg-white border rounded-2xl shadow-sm overflow-hidden transition-all duration-200 ${
      overall === 'fail' ? 'border-rose-300' : overall === 'warning' ? 'border-amber-300' : overall === 'pending' ? 'border-slate-300' : 'border-emerald-300'
    }`}>
      {/* Card Header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50/60 transition-colors select-none"
        onClick={() => setExpanded(p => !p)}
      >
        {/* Avatar */}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm border shrink-0 ${
          supplier.sourceType === 'preferred' ? 'bg-amber-50 text-amber-700 border-amber-200'
          : supplier.sourceType === 'new'      ? 'bg-violet-50 text-violet-700 border-violet-200'
          : 'bg-blue-50 text-blue-700 border-blue-200'
        }`}>
          {supplier.name.charAt(0)}
        </div>

        {/* Name & Meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-800 text-sm">{supplier.name}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${srcCfg.cls}`}>
              {srcCfg.label}
            </span>
            {supplier.sourceType === 'new' && (
              <span className="text-[8px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded font-bold border border-rose-200 flex items-center gap-0.5">
                <Lock size={8} /> Governance Gate
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Globe size={9} /> {supplier.country}
            </span>
            <span className="text-[10px] text-slate-400">
              AI Match: <span className="font-bold text-slate-600">{supplier.aiMatch}%</span>
            </span>
            <span className="text-[10px] text-slate-400">
              Delivery: <span className="font-bold text-slate-600">{supplier.delivery}</span>
            </span>
            {supplier.priceHistory !== 'New' && (
              <span className="text-[10px] text-slate-400">
                Price: <span className="font-bold text-slate-600">{supplier.priceHistory}</span>
              </span>
            )}
          </div>
        </div>

        {/* Overall Status */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex flex-col items-end gap-1">
            <StatusBadge status={overall} size="lg" />
            <span className="text-[9px] text-slate-400">{passCount}/{totalCount} checks passed</span>
          </div>
          {/* Mini progress dots */}
          <div className="flex gap-1">
            {Object.values(supplier.compliance).map((c, i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[c.status].dot}`} />
            ))}
          </div>
          {expanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </div>
      </div>

      {/* Expanded Detail */}
      {expanded && (
        <div className="border-t border-slate-100 p-4 space-y-2 bg-slate-50/40">
          {supplier.sourceType === 'new' && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl mb-3">
              <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-700 font-semibold leading-relaxed">
                <strong>Procurement Governance Notice:</strong> This is a newly discovered supplier via Oppora/External sourcing.
                AI can identify and match this supplier, but cannot bypass procurement governance.
                Full vendor qualification, compliance review, and AVL registration are required before a PO can be issued.
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.values(supplier.compliance).map((item, i) => (
              <ComplianceRow key={i} item={item} />
            ))}
          </div>

          {/* Action buttons for new suppliers */}
          {supplier.sourceType === 'new' && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 mt-2">
              <button className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm">
                <FileText size={12} /> Initiate Vendor Qualification
              </button>
              <button className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl transition-all shadow-sm">
                <Download size={12} /> Download Onboarding Form
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Summary Row ───────────────────────────────────────────────────────────
function SummaryStats({ suppliers }) {
  const statuses = suppliers.map(s => getOverallStatus(s.compliance));
  const counts = {
    pass:    statuses.filter(s => s === 'pass').length,
    warning: statuses.filter(s => s === 'warning').length,
    fail:    statuses.filter(s => s === 'fail' || s === 'pending').length,
  };
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
        <CheckCircle2 size={22} className="text-emerald-600 mx-auto mb-1.5" />
        <div className="text-2xl font-black text-emerald-700">{counts.pass}</div>
        <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Fully Compliant</div>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
        <AlertTriangle size={22} className="text-amber-600 mx-auto mb-1.5" />
        <div className="text-2xl font-black text-amber-700">{counts.warning}</div>
        <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Action Needed</div>
      </div>
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center">
        <ShieldAlert size={22} className="text-rose-600 mx-auto mb-1.5" />
        <div className="text-2xl font-black text-rose-700">{counts.fail}</div>
        <div className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Review Required</div>
      </div>
    </div>
  );
}

// ── Main Export ────────────────────────────────────────────────────────────
export default function SupplierCompliance() {
  const [filter, setFilter] = useState('all'); // 'all' | 'existing' | 'new' | 'issues'

  const filtered = SUPPLIERS.filter(s => {
    if (filter === 'existing') return s.sourceType !== 'new';
    if (filter === 'new')      return s.sourceType === 'new';
    if (filter === 'issues') {
      const o = getOverallStatus(s.compliance);
      return o === 'fail' || o === 'warning' || o === 'pending';
    }
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-tr from-[#f6f8fb] via-[#f1f5f9] to-[#e9eff6] space-y-6">

      {/* Header */}
      <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-600 via-violet-500 to-rose-500" />
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <ShieldCheck className="text-indigo-600" size={22} />
              Supplier Compliance
            </h1>
            <p className="text-xs text-slate-500 max-w-xl">
              Procurement governance dashboard for all shortlisted suppliers — RFQ-WWT-2026-0847 (Chemical Dosing Pumps).
              AI-discovered suppliers require full compliance clearance before a Purchase Order can be issued.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertCircle size={12} className="text-amber-600" />
              <span className="text-[10px] font-bold text-amber-700">3 New Suppliers Pending Review</span>
            </div>
          </div>
        </div>

        {/* Governance Banner */}
        <div className="mt-4 flex items-start gap-3 p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl">
          <Lock size={16} className="text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <span className="text-xs font-bold text-indigo-800">Procurement Governance Principle</span>
            <p className="text-[11px] text-indigo-600 mt-0.5 leading-relaxed">
              AI can <strong>discover</strong> suppliers and <strong>rank</strong> them by technical fit —
              but it cannot <strong>bypass</strong> supplier approval, HSE documentation, integrity screening,
              or country-of-origin checks. All new suppliers must complete the Approved Vendor List (AVL) process before PO issuance.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <SummaryStats suppliers={SUPPLIERS} />

      {/* Filter Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filter:</span>
        {[
          { id: 'all',      label: 'All Suppliers' },
          { id: 'existing', label: 'Existing / Preferred' },
          { id: 'new',      label: 'New (Oppora / External)' },
          { id: 'issues',   label: 'Issues Only' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              filter === f.id
                ? 'bg-indigo-600 text-white border-transparent shadow-md'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Supplier Cards */}
      <div className="space-y-3">
        {filtered.map(s => (
          <SupplierComplianceCard key={s.id} supplier={s} />
        ))}
        {filtered.length === 0 && (
          <div className="p-12 bg-white border border-slate-200 rounded-2xl text-center text-slate-400 text-xs font-semibold">
            No suppliers match this filter.
          </div>
        )}
      </div>

      {/* Compliance Checklist Key */}
      <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-3xl p-5 shadow-sm">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Info size={13} className="text-indigo-500" /> Compliance Framework Reference
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const Icon = cfg.icon;
            return (
              <div key={key} className={`flex items-center gap-2 p-2.5 rounded-xl border ${cfg.bg}`}>
                <Icon size={12} className={cfg.color} />
                <div>
                  <div className={`font-bold ${cfg.color}`}>
                    {key === 'pass' ? 'Cleared' : key === 'fail' ? 'Review Required' : key === 'warning' ? 'Action Needed' : 'Pending'}
                  </div>
                  <div className="text-slate-400">
                    {key === 'pass' ? 'All checks passed' : key === 'fail' ? 'Blocking issue found' : key === 'warning' ? 'Non-critical gap' : 'Awaiting data'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-[10px] text-slate-400 leading-relaxed">
            <strong className="text-slate-600">Compliance areas checked:</strong>{' '}
            Technical Match · Commercial Match · Supplier Approved (AVL) · Compliance Review · Country of Origin ·
            HSE Documentation · Cybersecurity · Supplier Integrity (Sanctions / Background).
            Based on Veolia Supplier Requirements covering integrity, cybersecurity, privacy, quality, country of origin, and health & safety.
          </p>
        </div>
      </div>

    </div>
  );
}
