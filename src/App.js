import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabase';
import { ALL_VENDORS } from './data';
import { Search, Upload, Trash2, Filter, RotateCcw, X, Plus, ChevronDown } from 'lucide-react';

const lload = (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const lsave = (k, val) => { try { localStorage.setItem(k, JSON.stringify(val)); } catch {} };

const STATUS_OPTIONS = ['', 'Yes', 'No', 'Pending'];
const STATUS_STYLE = {
  Yes:     { bg: '#0d2e1a', text: '#4ade80', border: '#166534', icon: '✅' },
  No:      { bg: '#2d0f0f', text: '#f87171', border: '#991b1b', icon: '❌' },
  Pending: { bg: '#2d2000', text: '#fbbf24', border: '#92400e', icon: '⏳' },
  '':      { bg: 'transparent', text: '#4b5563', border: '#1f2937', icon: '—' },
};
const VENDOR_TYPE_STYLE = {
  Prime:  { bg: '#1a0d00', text: '#f59e0b', border: '#d97706', icon: '⭐' },
  Normal: { bg: '#0d1a2e', text: '#60a5fa', border: '#2563eb', icon: '🔵' },
  '':     { bg: '#0f172a', text: '#6b7280', border: '#374151', icon: '○' },
};

// ─── ADVANCED FILTER ENGINE ───────────────────────────────────────
const FILTER_FIELDS = [
  { key: 'name',        label: 'Name',         type: 'text' },
  { key: 'company',     label: 'Company',      type: 'text' },
  { key: 'title',       label: 'Job Title',    type: 'text' },
  { key: 'email',       label: 'Email',        type: 'text' },
  { key: 'phone',       label: 'Phone',        type: 'text' },
  { key: 'website',     label: 'Website',      type: 'text' },
  { key: 'vendor_type', label: 'Vendor Type',  type: 'select', options: ['', 'Normal', 'Prime'] },
  { key: 'email_sent',  label: 'Email Sent',   type: 'select', options: STATUS_OPTIONS },
  { key: 'follow_up',   label: 'Follow-Up',    type: 'select', options: STATUS_OPTIONS },
  { key: 'call_done',   label: 'Call Done',    type: 'select', options: STATUS_OPTIONS },
  { key: 'resume_role', label: 'Resume Role',  type: 'text' },
];

const TEXT_OPS = [
  { key: 'contains',     label: 'contains' },
  { key: 'not_contains', label: 'does not contain' },
  { key: 'equals',       label: 'equals' },
  { key: 'not_equals',   label: 'is not' },
  { key: 'is_empty',     label: 'is empty' },
  { key: 'is_not_empty', label: 'is not empty' },
  { key: 'starts_with',  label: 'starts with' },
];

const SELECT_OPS = [
  { key: 'equals',     label: 'is' },
  { key: 'not_equals', label: 'is not' },
  { key: 'is_empty',   label: 'is empty' },
  { key: 'is_not_empty', label: 'is not empty' },
];

function applyFilter(vendor, filter) {
  const raw = (vendor[filter.field] || '');
  const val = raw.toLowerCase().trim();
  const fval = (filter.value || '').toLowerCase().trim();
  switch (filter.op) {
    case 'contains':      return val.includes(fval);
    case 'not_contains':  return !val.includes(fval);
    case 'equals':        return val === fval;
    case 'not_equals':    return val !== fval;
    case 'is_empty':      return val === '';
    case 'is_not_empty':  return val !== '';
    case 'starts_with':   return val.startsWith(fval);
    default: return true;
  }
}

function applyAllFilters(vendor, filters, conjunction) {
  if (!filters.length) return true;
  if (conjunction === 'OR') return filters.some(f => applyFilter(vendor, f));
  return filters.every(f => applyFilter(vendor, f));
}

// ─── SMART CSV PARSER ─────────────────────────────────────────────
function parseCSVRow(row) {
  const result = []; let current = ''; let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else { current += ch; }
  }
  result.push(current.trim());
  return result;
}

function smartParseCSV(text) {
  const lines = text.trim().split('\n').filter(l => l.trim());
  const rawHeaders = parseCSVRow(lines[0]).map(h => h.replace(/"/g, '').trim().toLowerCase());

  const colMap = {
    name:    ['full name', 'name', 'contact name', 'full_name'],
    first:   ['first name', 'first_name', 'firstname'],
    last:    ['last name', 'last_name', 'lastname'],
    title:   ['job title', 'title', 'position', 'role', 'job_title'],
    company: ['company name', 'company', 'organization', 'firm', 'company_name', 'account'],
    email:   ['contact email address - data', 'email', 'email address', 'contact email', 'email_address', 'work email', 'email address - data'],
    phone:   ['contact phone number - data', 'phone', 'phone number', 'mobile', 'phone_number', 'contact phone', 'phone number - data'],
    website: ['company domain', 'website', 'url', 'domain', 'web'],
    linkedin:['linkedin profile', 'linkedin', 'linkedin url', 'linkedin_url'],
    location:['location', 'city', 'state', 'country', 'geography', 'region'],
    notes:   ['notes', 'note', 'comments', 'description'],
  };

  const findCol = (variants) => { for (const v of variants) { const idx = rawHeaders.indexOf(v); if (idx !== -1) return idx; } return -1; };
  const cols = {}; for (const [field, variants] of Object.entries(colMap)) cols[field] = findCol(variants);
  const get = (row, field) => cols[field] !== -1 ? (row[cols[field]] || '').replace(/"/g, '').trim() : '';

  return lines.slice(1).map(line => {
    const row = parseCSVRow(line);
    let name = get(row, 'name');
    if (!name) { const f = get(row, 'first'), l = get(row, 'last'); name = [f, l].filter(Boolean).join(' '); }
    const company = get(row, 'company');
    if (!name && !company) return null;

    const website = get(row, 'website') || get(row, 'linkedin');
    const location = get(row, 'location');
    const notesRaw = get(row, 'notes');
    const notes = [notesRaw, location].filter(Boolean).join(' | ');

    return {
      name: name || company,
      title: get(row, 'title'),
      company: company || name,
      email: get(row, 'email'),
      phone: get(row, 'phone'),
      website,
      notes,
      vendor_type: '', email_sent: '', follow_up: '', call_done: '', resume_role: ''
    };
  }).filter(Boolean);
}

// ─── PILL ─────────────────────────────────────────────────────────
function Pill({ value, onChange, options, styleMap }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const s = styleMap[value] || styleMap[''];
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}`, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontFamily: 'DM Sans', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
        {s.icon} {value || '—'}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 9999, background: '#0f172a', border: '1px solid #1f2937', borderRadius: 10, overflow: 'hidden', minWidth: 120, boxShadow: '0 8px 32px #000c' }}>
          {options.map(opt => { const st = styleMap[opt] || styleMap[''];
            return <button key={opt} onClick={() => { onChange(opt); setOpen(false); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', background: 'transparent', border: 'none', color: st.text || '#9ca3af', fontSize: 12, fontFamily: 'DM Sans', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#1f2937'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{st.icon} {opt || 'Untagged'}</button>;
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color, sub }) {
  return (
    <div style={{ background: 'linear-gradient(135deg,#0f172a,#1a2744)', border: `1px solid ${color}30`, borderRadius: 16, padding: '14px 18px', position: 'relative', overflow: 'hidden', flex: 1, minWidth: 110, transition: 'transform 0.2s,box-shadow 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${color}20`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
      <div style={{ position: 'absolute', top: -16, right: -16, width: 60, height: 60, borderRadius: '50%', background: `${color}15` }} />
      <div style={{ fontSize: 18, marginBottom: 3 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: 'Syne', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'DM Sans', marginTop: 3 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: '#374151', marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

// ─── ADVANCED FILTER PANEL ────────────────────────────────────────
function AdvancedFilterPanel({ filters, setFilters, conjunction, setConjunction, onClose }) {
  const addFilter = () => setFilters(f => [...f, { id: Date.now(), field: 'email', op: 'is_not_empty', value: '' }]);
  const removeFilter = (id) => setFilters(f => f.filter(x => x.id !== id));
  const updateFilter = (id, key, val) => setFilters(f => f.map(x => x.id === id ? { ...x, [key]: val } : x));

  const sel = { padding: '6px 10px', background: '#0f172a', border: '1px solid #1f2937', borderRadius: 8, color: '#e2e8f0', fontSize: 12, fontFamily: 'DM Sans', outline: 'none', cursor: 'pointer' };

  return (
    <div style={{ background: '#080e1c', border: '1px solid #1b998b30', borderRadius: 16, padding: 18, marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'Syne', fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>🔍 Advanced Filters</span>
          <span style={{ fontSize: 11, color: '#4b5563', fontFamily: 'DM Sans' }}>Match</span>
          <select value={conjunction} onChange={e => setConjunction(e.target.value)} style={{ ...sel, padding: '4px 8px' }}>
            <option value="AND">ALL conditions (AND)</option>
            <option value="OR">ANY condition (OR)</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={addFilter} style={{ padding: '5px 12px', borderRadius: 8, background: '#1b998b20', border: '1px solid #1b998b40', color: '#1b998b', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Plus size={11} /> Add Filter
          </button>
          <button onClick={() => { setFilters([]); }} style={{ padding: '5px 12px', borderRadius: 8, background: '#2d0f0f', border: '1px solid #991b1b40', color: '#f87171', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 12 }}>Clear All</button>
          <button onClick={onClose} style={{ background: '#1f2937', border: 'none', color: '#6b7280', cursor: 'pointer', borderRadius: 7, padding: '5px 8px' }}><X size={13} /></button>
        </div>
      </div>

      {filters.length === 0 && (
        <div style={{ padding: '16px 0', textAlign: 'center', color: '#374151', fontFamily: 'DM Sans', fontSize: 12 }}>
          No filters active. Click "+ Add Filter" to start.
          <br /><span style={{ fontSize: 11, color: '#1b2030', marginTop: 4, display: 'block' }}>💡 Try: Email "is empty" → select all → bulk delete to clean bad data</span>
        </div>
      )}

      {filters.map((f, i) => {
        const fieldDef = FILTER_FIELDS.find(x => x.key === f.field) || FILTER_FIELDS[0];
        const ops = fieldDef.type === 'select' ? SELECT_OPS : TEXT_OPS;
        const needsValue = !['is_empty', 'is_not_empty'].includes(f.op);

        return (
          <div key={f.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, padding: '10px 12px', background: '#0a1120', borderRadius: 10, border: '1px solid #0f2031' }}>
            {i > 0 && <span style={{ fontSize: 11, color: '#4b5563', fontFamily: 'DM Sans', minWidth: 28, textAlign: 'center', fontWeight: 700 }}>{conjunction}</span>}
            {i === 0 && <span style={{ fontSize: 11, color: '#4b5563', fontFamily: 'DM Sans', minWidth: 28, textAlign: 'center' }}>Where</span>}

            {/* FIELD */}
            <select value={f.field} onChange={e => updateFilter(f.id, 'field', e.target.value)} style={{ ...sel, minWidth: 130 }}>
              {FILTER_FIELDS.map(ff => <option key={ff.key} value={ff.key}>{ff.label}</option>)}
            </select>

            {/* OPERATOR */}
            <select value={f.op} onChange={e => updateFilter(f.id, 'op', e.target.value)} style={{ ...sel, minWidth: 150 }}>
              {ops.map(op => <option key={op.key} value={op.key}>{op.label}</option>)}
            </select>

            {/* VALUE */}
            {needsValue && (
              fieldDef.type === 'select'
                ? <select value={f.value} onChange={e => updateFilter(f.id, 'value', e.target.value)} style={{ ...sel, minWidth: 120 }}>
                    {(fieldDef.options || []).map(o => <option key={o} value={o}>{o || '(empty)'}</option>)}
                  </select>
                : <input value={f.value || ''} onChange={e => updateFilter(f.id, 'value', e.target.value)} placeholder="value..." style={{ ...sel, flex: 1, minWidth: 120 }} />
            )}
            {!needsValue && <div style={{ flex: 1 }} />}

            <button onClick={() => removeFilter(f.id)} style={{ background: 'none', border: 'none', color: '#374151', cursor: 'pointer', padding: '4px', borderRadius: 6 }} onMouseEnter={e => e.currentTarget.style.color = '#f87171'} onMouseLeave={e => e.currentTarget.style.color = '#374151'}>
              <X size={14} />
            </button>
          </div>
        );
      })}

      {/* QUICK FILTER PRESETS */}
      <div style={{ borderTop: '1px solid #0f2031', paddingTop: 12, marginTop: 4 }}>
        <div style={{ fontSize: 10, color: '#374151', fontFamily: 'DM Sans', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Quick Presets</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: '📧 No Email', filters: [{ id: 1, field: 'email', op: 'is_empty', value: '' }] },
            { label: '📞 No Phone', filters: [{ id: 1, field: 'phone', op: 'is_empty', value: '' }] },
            { label: '📧+📞 Missing Both', filters: [{ id: 1, field: 'email', op: 'is_empty', value: '' }, { id: 2, field: 'phone', op: 'is_empty', value: '' }], conj: 'AND' },
            { label: '⭐ Prime Only', filters: [{ id: 1, field: 'vendor_type', op: 'equals', value: 'Prime' }] },
            { label: '✅ Emailed', filters: [{ id: 1, field: 'email_sent', op: 'equals', value: 'Yes' }] },
            { label: '❌ Not Contacted', filters: [{ id: 1, field: 'email_sent', op: 'is_empty', value: '' }, { id: 2, field: 'call_done', op: 'is_empty', value: '' }], conj: 'AND' },
          ].map(preset => (
            <button key={preset.label} onClick={() => { setFilters(preset.filters.map((f, i) => ({ ...f, id: Date.now() + i }))); if (preset.conj) setConjunction(preset.conj); }} style={{ padding: '5px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #1f2937', color: '#94a3b8', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 11 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#1b998b'; e.currentTarget.style.color = '#1b998b'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1f2937'; e.currentTarget.style.color = '#94a3b8'; }}>
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── CSV MODAL ────────────────────────────────────────────────────
function CSVModal({ onClose, onImport, wishlists }) {
  const [step, setStep] = useState(1);
  const [parsed, setParsed] = useState([]);
  const [fileName, setFileName] = useState('');
  const [addToAll, setAddToAll] = useState(true);
  const [createWishlist, setCreateWishlist] = useState(true);
  const [wishlistName, setWishlistName] = useState('');
  const [wishlistMode, setWishlistMode] = useState('new');
  const [existingWishlist, setExistingWishlist] = useState('');
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    setFileName(file.name); setWishlistName(file.name.replace('.csv', '').replace(/_/g, ' '));
    const reader = new FileReader();
    reader.onload = ev => { setParsed(smartParseCSV(ev.target.result)); setStep(2); };
    reader.readAsText(file);
  };

  const handleImport = () => {
    onImport({ vendors: parsed, addToAll, createWishlist, wishlistName: wishlistMode === 'new' ? wishlistName : '', existingWishlistId: wishlistMode === 'existing' ? existingWishlist : null });
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000e', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(135deg,#0f172a,#111827)', border: '1px solid #1b998b40', borderRadius: 24, padding: 32, width: '100%', maxWidth: 660, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 32px 80px #000d' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontFamily: 'Syne', color: '#e2e8f0', fontSize: 20, fontWeight: 800 }}>📤 Import CSV</h2>
          <button onClick={onClose} style={{ background: '#1f2937', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 18, borderRadius: 8, width: 32, height: 32 }}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {['Upload', 'Preview', 'Options'].map((s, i) => (
            <div key={s} style={{ flex: 1, padding: '6px 0', textAlign: 'center', borderRadius: 8, fontSize: 12, fontFamily: 'DM Sans', fontWeight: 600, background: step === i+1 ? '#1b998b20' : '#0f172a', border: `1px solid ${step === i+1 ? '#1b998b' : '#1f2937'}`, color: step === i+1 ? '#1b998b' : step > i+1 ? '#4ade80' : '#4b5563' }}>
              {step > i+1 ? '✓ ' : ''}{s}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div>
            <div onClick={() => fileRef.current.click()} style={{ border: '2px dashed #1b998b40', borderRadius: 16, padding: 44, textAlign: 'center', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#1b998b'; e.currentTarget.style.background = '#1b998b08'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1b998b40'; e.currentTarget.style.background = 'transparent'; }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📄</div>
              <div style={{ fontFamily: 'Syne', color: '#e2e8f0', fontSize: 15, marginBottom: 6 }}>Click to browse CSV file</div>
              <div style={{ fontFamily: 'DM Sans', color: '#4b5563', fontSize: 12 }}>Auto-detects columns from Apollo, LinkedIn, Clay, ZoomInfo exports</div>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />
            </div>
            <div style={{ marginTop: 12, padding: 14, background: '#0f172a', borderRadius: 12, border: '1px solid #1f2937' }}>
              <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'DM Sans', fontWeight: 700, marginBottom: 6 }}>✅ Auto-detected columns → stored in separate fields:</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 11, color: '#4b5563', fontFamily: 'DM Sans', lineHeight: 1.7 }}>
                <div><b style={{ color: '#94a3b8' }}>Name:</b> Full Name / First + Last</div>
                <div><b style={{ color: '#94a3b8' }}>Email:</b> Contact Email Address - Data</div>
                <div><b style={{ color: '#94a3b8' }}>Company:</b> Company Name / Organization</div>
                <div><b style={{ color: '#94a3b8' }}>Phone:</b> Contact Phone Number - Data</div>
                <div><b style={{ color: '#94a3b8' }}>Title:</b> Job Title / Position / Role</div>
                <div><b style={{ color: '#94a3b8' }}>Website:</b> Company Domain / LinkedIn</div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontFamily: 'DM Sans', color: '#94a3b8', fontSize: 13 }}>
                <span style={{ color: '#1b998b', fontWeight: 700 }}>{parsed.length} vendors</span> found · <span style={{ color: parsed.filter(v => v.email).length > 0 ? '#4ade80' : '#f87171' }}>{parsed.filter(v => v.email).length} with email</span> · <span style={{ color: parsed.filter(v => v.phone).length > 0 ? '#4ade80' : '#f87171' }}>{parsed.filter(v => v.phone).length} with phone</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setStep(1)} style={{ padding: '6px 12px', borderRadius: 9, background: '#1e293b', border: '1px solid #334155', color: '#9ca3af', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 12 }}>← Back</button>
                <button onClick={() => setStep(3)} style={{ padding: '6px 16px', borderRadius: 9, background: 'linear-gradient(135deg,#1b998b,#0d6e65)', border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12 }}>Continue →</button>
              </div>
            </div>
            <div style={{ background: '#080e1c', borderRadius: 12, overflow: 'hidden', border: '1px solid #0f2031', maxHeight: 340, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>{['Name', 'Company', 'Title', 'Email', 'Phone', 'Website'].map(h => <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 9, fontFamily: 'Syne', color: '#475569', textTransform: 'uppercase', letterSpacing: 1, background: '#060d1a', borderBottom: '1px solid #0f2031', position: 'sticky', top: 0 }}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {parsed.map((v, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #0d1829', background: i % 2 === 0 ? '#080e1c' : '#070c18' }}>
                      <td style={{ padding: '6px 10px', fontSize: 12, color: '#e2e8f0', fontWeight: 600 }}>{v.name || '—'}</td>
                      <td style={{ padding: '6px 10px', fontSize: 11, color: '#1b998b', fontWeight: 600 }}>{v.company || '—'}</td>
                      <td style={{ padding: '6px 10px', fontSize: 10, color: '#6b7280', fontStyle: 'italic' }}>{v.title || '—'}</td>
                      <td style={{ padding: '6px 10px', fontSize: 11, color: v.email ? '#60a5fa' : '#1f2937' }}>{v.email || '✗ none'}</td>
                      <td style={{ padding: '6px 10px', fontSize: 11, color: v.phone ? '#94a3b8' : '#1f2937' }}>{v.phone || '✗ none'}</td>
                      <td style={{ padding: '6px 10px', fontSize: 10, color: '#374151' }}>{v.website ? v.website.substring(0, 20) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div style={{ fontSize: 13, color: '#94a3b8', fontFamily: 'DM Sans', marginBottom: 18 }}>
              What to do with <span style={{ color: '#1b998b', fontWeight: 700 }}>{parsed.length} vendors</span>?
            </div>

            {[
              { key: 'addToAll', val: addToAll, set: setAddToAll, title: '🌐 Add to All Vendors', desc: 'Appears in main list, visible to everyone. Deletions here remove from ALL views.', color: '#1b998b' },
              { key: 'wishlist', val: createWishlist, set: setCreateWishlist, title: '📋 Save as Wishlist Sheet', desc: 'Group these vendors in a named sheet for easy reference', color: '#7c3aed' }
            ].map(({ key, val, set, title, desc, color }) => (
              <div key={key} onClick={() => set(!val)} style={{ padding: 16, background: val ? `${color}15` : '#0f172a', border: `2px solid ${val ? color : '#1f2937'}`, borderRadius: 14, marginBottom: 10, cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: val ? color : '#1f2937', border: `2px solid ${val ? color : '#374151'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0, color: '#fff', marginTop: 2 }}>{val ? '✓' : ''}</div>
                <div>
                  <div style={{ fontFamily: 'Syne', color: '#e2e8f0', fontSize: 14, fontWeight: 700 }}>{title}</div>
                  <div style={{ fontFamily: 'DM Sans', color: '#6b7280', fontSize: 12, marginTop: 3, lineHeight: 1.5 }}>{desc}</div>
                </div>
              </div>
            ))}

            {createWishlist && (
              <div style={{ background: '#0f0d1f', border: '1px solid #7c3aed40', borderRadius: 12, padding: 14, marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  {['new', 'existing'].map(m => (
                    <button key={m} onClick={() => setWishlistMode(m)} style={{ padding: '5px 12px', borderRadius: 8, fontFamily: 'DM Sans', fontSize: 12, cursor: 'pointer', background: wishlistMode === m ? '#7c3aed20' : '#0f172a', border: `1px solid ${wishlistMode === m ? '#7c3aed' : '#1f2937'}`, color: wishlistMode === m ? '#c4b5fd' : '#6b7280' }}>
                      {m === 'new' ? '+ New Sheet' : 'Add to Existing'}
                    </button>
                  ))}
                </div>
                {wishlistMode === 'new'
                  ? <input value={wishlistName} onChange={e => setWishlistName(e.target.value)} placeholder="Sheet name e.g. April Outreach, Healthcare Recruiters..." style={{ width: '100%', padding: '10px 14px', background: '#1e1040', border: '1px solid #4c1d95', borderRadius: 10, color: '#e2e8f0', fontSize: 13, fontFamily: 'DM Sans', outline: 'none', boxSizing: 'border-box' }} />
                  : <select value={existingWishlist} onChange={e => setExistingWishlist(e.target.value)} style={{ width: '100%', padding: '10px 14px', background: '#1e1040', border: '1px solid #4c1d95', borderRadius: 10, color: '#e2e8f0', fontSize: 13, fontFamily: 'DM Sans', outline: 'none' }}>
                      <option value="">Select a sheet...</option>
                      {wishlists.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                }
              </div>
            )}

            <div style={{ padding: '10px 14px', background: '#0f172a', borderRadius: 10, border: '1px solid #1f2937', fontSize: 12, color: '#6b7280', fontFamily: 'DM Sans', marginTop: 12 }}>
              ⚠️ <b style={{ color: '#fbbf24' }}>Important:</b> Deleting a vendor from <b>any view</b> removes it from <b>all views and the database</b>. Wishlists are just filters/groups — not separate data.
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 18, justifyContent: 'space-between' }}>
              <button onClick={() => setStep(2)} style={{ padding: '10px 18px', borderRadius: 12, background: '#1e293b', border: '1px solid #334155', color: '#9ca3af', cursor: 'pointer', fontFamily: 'DM Sans' }}>← Back</button>
              <button onClick={handleImport} disabled={!addToAll && !createWishlist} style={{ padding: '10px 28px', borderRadius: 12, background: 'linear-gradient(135deg,#1b998b,#0d6e65)', border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700 }}>
                Import {parsed.length} Vendors ✓
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── VENDOR MODAL ─────────────────────────────────────────────────
function VendorModal({ vendor, onSave, onClose }) {
  const [form, setForm] = useState(vendor || { name: '', title: '', company: '', email: '', phone: '', website: '', emailSent: '', followUp: '', callDone: '', resumeRole: '', notes: '', vendorType: '' });
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000d', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(135deg,#0f172a,#111827)', border: '1px solid #1b998b40', borderRadius: 24, padding: 32, width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 32px 80px #000c' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontFamily: 'Syne', color: '#e2e8f0', fontSize: 20, fontWeight: 800 }}>{vendor ? '✏️ Edit Vendor' : '➕ Add New Vendor'}</h2>
          <button onClick={onClose} style={{ background: '#1f2937', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 18, borderRadius: 8, width: 32, height: 32 }}>✕</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[
            { key: 'name', label: 'Full Name *', placeholder: 'John Smith', span: false },
            { key: 'title', label: 'Job Title', placeholder: 'Senior Recruiter', span: false },
            { key: 'company', label: 'Company *', placeholder: 'ABC Staffing', span: false },
            { key: 'email', label: 'Email', placeholder: 'john@company.com', span: false },
            { key: 'phone', label: 'Phone', placeholder: '+1 (555) 000-0000', span: false },
            { key: 'website', label: 'Website / LinkedIn', placeholder: 'www.company.com', span: false },
            { key: 'resumeRole', label: 'Resume Sent For Role', placeholder: 'Java Developer...', span: true },
            { key: 'notes', label: 'Notes', placeholder: 'Any notes...', span: true },
          ].map(({ key, label, placeholder, span }) => (
            <div key={key} style={{ gridColumn: span ? '1/-1' : 'auto' }}>
              <label style={{ fontSize: 11, color: '#6b7280', fontFamily: 'DM Sans', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</label>
              <input value={form[key] || ''} onChange={e => f(key, e.target.value)} placeholder={placeholder} style={{ display: 'block', width: '100%', marginTop: 4, padding: '10px 14px', background: '#1e293b', border: '1px solid #334155', borderRadius: 10, color: '#e2e8f0', fontSize: 13, fontFamily: 'DM Sans', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginTop: 14 }}>
          {[{ key: 'vendorType', label: 'Type', opts: ['', 'Normal', 'Prime'] }, { key: 'emailSent', label: 'Email Sent?', opts: STATUS_OPTIONS }, { key: 'followUp', label: 'Follow-Up?', opts: STATUS_OPTIONS }, { key: 'callDone', label: 'Call Done?', opts: STATUS_OPTIONS }].map(({ key, label, opts }) => (
            <div key={key}>
              <label style={{ fontSize: 11, color: '#6b7280', fontFamily: 'DM Sans', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</label>
              <select value={form[key] || ''} onChange={e => f(key, e.target.value)} style={{ display: 'block', width: '100%', marginTop: 4, padding: '10px 10px', background: '#1e293b', border: '1px solid #334155', borderRadius: 10, color: '#e2e8f0', fontSize: 12, fontFamily: 'DM Sans', outline: 'none' }}>
                {opts.map(o => <option key={o} value={o}>{o || '—'}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 24px', borderRadius: 12, background: '#1e293b', border: '1px solid #334155', color: '#9ca3af', cursor: 'pointer', fontFamily: 'DM Sans' }}>Cancel</button>
          <button onClick={() => { if (!form.name || !form.company) { alert('Name and Company are required'); return; } onSave(form); }} style={{ padding: '10px 28px', borderRadius: 12, background: 'linear-gradient(135deg,#1b998b,#0d6e65)', border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700 }}>
            {vendor ? 'Save Changes' : 'Add Vendor'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmailTemplatesPanel({ onClose }) {
  const [templates, setTemplates] = useState(() => lload('emailTemplates', [
    { id: 1, title: 'Initial Outreach', body: `Hi [Name],\n\nI hope you're doing well! I'm Alok, a GTM Automation Engineer specializing in outbound infrastructure and IT staffing. I came across your profile and wanted to reach out to explore potential collaboration opportunities.\n\nWould you be open to a quick 15-minute call this week?\n\nBest regards,\nAlok Kumar Singh` },
    { id: 2, title: 'Resume Follow-Up', body: `Hi [Name],\n\nFollowing up on the resume I shared for the [Role] position.\n\nThanks,\nAlok` },
    { id: 3, title: 'Partnership Intro', body: `Hello [Name],\n\nI'm reaching out from ConsultAdd's IT Staffing division. We'd love to explore a vendor partnership.\n\nBest,\nAlok Kumar Singh\nGTM Automation Engineer, ConsultAdd` },
  ]));
  const [editing, setEditing] = useState(null);
  const [copied, setCopied] = useState(null);
  const sv = t => { setTemplates(t); lsave('emailTemplates', t); };
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000d', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(135deg,#0f172a,#1a0d0a)', border: '1px solid #ff6b3540', borderRadius: 24, padding: 32, width: '100%', maxWidth: 660, maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 32px 80px #000c' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontFamily: 'Syne', color: '#e2e8f0', fontSize: 20, fontWeight: 800 }}>📧 Email Templates</h2>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { const t = { id: Date.now(), title: 'New Template', body: '' }; sv([...templates, t]); setEditing(t.id); }} style={{ padding: '8px 16px', borderRadius: 10, background: '#ff6b35', border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13 }}>+ New</button>
            <button onClick={onClose} style={{ background: '#1f2937', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 18, borderRadius: 8, width: 32, height: 32 }}>✕</button>
          </div>
        </div>
        {templates.map(t => (
          <div key={t.id} style={{ background: '#1e293b', borderRadius: 16, padding: 20, marginBottom: 14, border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              {editing === t.id ? <input value={t.title} onChange={e => sv(templates.map(x => x.id === t.id ? { ...x, title: e.target.value } : x))} style={{ background: '#0f172a', border: '1px solid #ff6b35', borderRadius: 8, color: '#e2e8f0', padding: '6px 10px', fontFamily: 'Syne', fontSize: 14, fontWeight: 700 }} />
                : <h3 style={{ margin: 0, fontFamily: 'Syne', color: '#e2e8f0', fontSize: 15 }}>{t.title}</h3>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { navigator.clipboard.writeText(t.body); setCopied(t.id); setTimeout(() => setCopied(null), 2000); }} style={{ padding: '5px 14px', borderRadius: 8, background: copied === t.id ? '#0d2e1a' : '#0f172a', border: `1px solid ${copied === t.id ? '#4ade80' : '#334155'}`, color: copied === t.id ? '#4ade80' : '#9ca3af', cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans' }}>{copied === t.id ? '✅ Copied!' : '📋 Copy'}</button>
                <button onClick={() => setEditing(editing === t.id ? null : t.id)} style={{ background: 'none', border: '1px solid #334155', borderRadius: 8, color: '#9ca3af', cursor: 'pointer', padding: '5px 10px', fontSize: 12 }}>{editing === t.id ? '✓' : '✏️'}</button>
                <button onClick={() => sv(templates.filter(x => x.id !== t.id))} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 16 }}>🗑️</button>
              </div>
            </div>
            {editing === t.id ? <textarea value={t.body} onChange={e => sv(templates.map(x => x.id === t.id ? { ...x, body: e.target.value } : x))} rows={6} style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, color: '#e2e8f0', padding: 12, fontFamily: 'DM Sans', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', outline: 'none', lineHeight: 1.6 }} />
              : <pre style={{ margin: 0, fontFamily: 'DM Sans', fontSize: 12, color: '#94a3b8', whiteSpace: 'pre-wrap', lineHeight: 1.7, maxHeight: 90, overflow: 'hidden' }}>{t.body}</pre>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ThoughtsWidget() {
  const [text, setText] = useState(() => lload('thoughts', ''));
  const [saved, setSaved] = useState(false);
  const [min, setMin] = useState(false);
  const quotes = ["मेहनत कभी बेकार नहीं जाती 💪", "Every lead is an opportunity 🎯", "Build the pipeline, trust the process 🔥", "कड़ी मेहनत का फल मीठा होता है 🌟"];
  const [qi] = useState(() => Math.floor(Math.random() * quotes.length));
  return (
    <div style={{ background: 'linear-gradient(135deg,#0f0d1f,#1a1040)', border: '1px solid #7c3aed40', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ padding: '9px 14px', background: 'linear-gradient(90deg,#7c3aed20,transparent)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: min ? 'none' : '1px solid #7c3aed20' }}>
        <span style={{ fontFamily: 'Syne', fontSize: 11, fontWeight: 700, color: '#c4b5fd' }}>📝 Thoughts</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {!min && <button onClick={() => { lsave('thoughts', text); setSaved(true); setTimeout(() => setSaved(false), 2000); }} style={{ padding: '3px 9px', borderRadius: 7, background: saved ? '#4ade8020' : '#7c3aed30', border: `1px solid ${saved ? '#4ade80' : '#7c3aed'}`, color: saved ? '#4ade80' : '#c4b5fd', cursor: 'pointer', fontSize: 10 }}>{saved ? '✅' : '💾'}</button>}
          <button onClick={() => setMin(!min)} style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', fontSize: 12 }}>{min ? '⬆' : '⬇'}</button>
        </div>
      </div>
      {!min && (
        <div style={{ padding: '10px 14px 14px' }}>
          <div style={{ fontSize: 10, color: '#8b5cf6', fontFamily: 'DM Sans', fontStyle: 'italic', marginBottom: 6, padding: '5px 8px', background: '#7c3aed15', borderRadius: 7, borderLeft: '3px solid #7c3aed' }}>💭 {quotes[qi]}</div>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder={"Thoughts... Hindi mein bhi! 🙏"} style={{ width: '100%', minHeight: 75, background: '#1e1040', border: '1px solid #4c1d95', borderRadius: 9, color: '#e2e8f0', padding: '8px 10px', fontFamily: 'DM Sans', fontSize: 12, resize: 'vertical', outline: 'none', lineHeight: 1.7, boxSizing: 'border-box' }} />
        </div>
      )}
    </div>
  );
}

// ─── VENDOR TABLE ─────────────────────────────────────────────────
function VendorTable({ vendors, onUpdate, onEdit, onDelete, onBulkDelete, onUndo, canUndo }) {
  const [search, setSearch] = useState('');
  const [subView, setSubView] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [advFilters, setAdvFilters] = useState([]);
  const [conjunction, setConjunction] = useState('AND');
  const [selected, setSelected] = useState(new Set());
  const [expandedRow, setExpandedRow] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [sortCol, setSortCol] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const allNorm = vendors;
  const primeCount = allNorm.filter(v => v.vendor_type === 'Prime').length;
  const normalCount = allNorm.filter(v => v.vendor_type === 'Normal').length;
  const withEmail = allNorm.filter(v => v.email).length;
  const withPhone = allNorm.filter(v => v.phone).length;

  const filtered = allNorm.filter(v => {
    if (subView === 'prime' && v.vendor_type !== 'Prime') return false;
    if (subView === 'normal' && v.vendor_type !== 'Normal') return false;
    const q = search.toLowerCase();
    if (q && !`${v.name} ${v.company} ${v.email} ${v.title} ${v.phone} ${v.website}`.toLowerCase().includes(q)) return false;
    if (!applyAllFilters(v, advFilters, conjunction)) return false;
    return true;
  }).sort((a, b) => {
    const av = (a[sortCol] || '').toLowerCase(), bv = (b[sortCol] || '').toLowerCase();
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const toggleSort = col => { if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortCol(col); setSortDir('asc'); } };
  const toggleSelect = id => { const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s); };
  const toggleAll = () => { if (selected.size === filtered.length && filtered.length > 0) setSelected(new Set()); else setSelected(new Set(filtered.map(v => v.id))); };
  const hasFilters = advFilters.length > 0;
  const activeFilterCount = advFilters.length;

  const thStyle = (col) => ({
    padding: '10px 10px', textAlign: 'left', fontFamily: 'Syne', fontSize: 9, fontWeight: 700,
    color: sortCol === col ? '#1b998b' : '#475569', textTransform: 'uppercase', letterSpacing: 1.2,
    cursor: col ? 'pointer' : 'default', background: '#060d1a', borderBottom: '1px solid #0f2031',
    whiteSpace: 'nowrap', userSelect: 'none'
  });

  return (
    <div>
      {/* SUB VIEW TABS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          { key: 'all', label: '🌐 All', count: allNorm.length, color: '#1b998b' },
          { key: 'prime', label: '⭐ Prime', count: primeCount, color: '#f59e0b' },
          { key: 'normal', label: '🔵 Normal', count: normalCount, color: '#3b82f6' }
        ].map(({ key, label, count, color }) => (
          <button key={key} onClick={() => setSubView(key)} style={{ padding: '6px 14px', borderRadius: 10, fontFamily: 'Syne', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: subView === key ? `${color}20` : '#0f172a', border: `2px solid ${subView === key ? color : '#1f2937'}`, color: subView === key ? color : '#6b7280' }}>
            {label} <span style={{ marginLeft: 4, background: subView === key ? `${color}30` : '#1f2937', color: subView === key ? color : '#4b5563', borderRadius: 20, padding: '1px 7px', fontSize: 10 }}>{count}</span>
          </button>
        ))}

        {/* DATA QUALITY BADGES */}
        <div style={{ marginLeft: 8, display: 'flex', gap: 6 }}>
          <span style={{ fontSize: 11, color: '#4ade80', fontFamily: 'DM Sans', padding: '4px 10px', background: '#0d2e1a', borderRadius: 20, border: '1px solid #166534' }}>📧 {withEmail} emails</span>
          <span style={{ fontSize: 11, color: '#60a5fa', fontFamily: 'DM Sans', padding: '4px 10px', background: '#0d1a2e', borderRadius: 20, border: '1px solid #1e40af' }}>📞 {withPhone} phones</span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {canUndo && (
            <button onClick={onUndo} style={{ padding: '6px 12px', borderRadius: 9, background: '#2d2000', border: '1px solid #92400e', color: '#fbbf24', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
              <RotateCcw size={11} /> Undo Import
            </button>
          )}
          <button onClick={() => setShowFilters(!showFilters)} style={{ padding: '6px 14px', borderRadius: 9, background: (showFilters || hasFilters) ? '#1b998b20' : '#0f172a', border: `1px solid ${(showFilters || hasFilters) ? '#1b998b' : '#1f2937'}`, color: (showFilters || hasFilters) ? '#1b998b' : '#6b7280', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Filter size={12} /> Filters {activeFilterCount > 0 && <span style={{ background: '#1b998b', color: '#fff', borderRadius: 10, padding: '0 6px', fontSize: 10 }}>{activeFilterCount}</span>}
          </button>
        </div>
      </div>

      {/* ADVANCED FILTERS */}
      {showFilters && <AdvancedFilterPanel filters={advFilters} setFilters={setAdvFilters} conjunction={conjunction} setConjunction={setConjunction} onClose={() => setShowFilters(false)} />}

      {/* SEARCH + BULK */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#4b5563' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, company, email, phone, title..." style={{ width: '100%', padding: '8px 12px 8px 32px', background: '#0f172a', border: '1px solid #1f2937', borderRadius: 10, color: '#e2e8f0', fontSize: 12, fontFamily: 'DM Sans', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <span style={{ fontSize: 11, color: '#374151', whiteSpace: 'nowrap', fontFamily: 'DM Sans' }}>{filtered.length}/{allNorm.length}</span>
        {selected.size > 0 && (
          <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#fbbf24', fontFamily: 'DM Sans', fontWeight: 600 }}>{selected.size} selected</span>
            {bulkDeleteConfirm
              ? <>
                  <button onClick={() => { onBulkDelete([...selected]); setSelected(new Set()); setBulkDeleteConfirm(false); }} style={{ padding: '5px 12px', borderRadius: 8, background: '#991b1b', border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 12 }}>⚠ Confirm Delete</button>
                  <button onClick={() => setBulkDeleteConfirm(false)} style={{ padding: '5px 10px', borderRadius: 8, background: '#1f2937', border: 'none', color: '#9ca3af', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 12 }}>Cancel</button>
                </>
              : <button onClick={() => setBulkDeleteConfirm(true)} style={{ padding: '5px 12px', borderRadius: 8, background: '#2d0f0f', border: '1px solid #991b1b', color: '#f87171', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Trash2 size={11} /> Delete {selected.size}
                </button>
            }
            <button onClick={() => setSelected(new Set())} style={{ padding: '5px 9px', borderRadius: 8, background: '#0f172a', border: '1px solid #1f2937', color: '#6b7280', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 11 }}>✕</button>
          </div>
        )}
      </div>

      {/* TABLE */}
      <div style={{ background: '#080e1c', borderRadius: 18, overflow: 'hidden', border: '1px solid #0f2031', boxShadow: '0 4px 40px #00000060' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
            <thead>
              <tr>
                <th style={{ ...thStyle(null), width: 36, cursor: 'default' }}>
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} style={{ cursor: 'pointer', accentColor: '#1b998b' }} />
                </th>
                <th style={{ ...thStyle(null), width: 36 }}>#</th>
                <th style={{ ...thStyle('name'), width: 150 }} onClick={() => toggleSort('name')}>Name {sortCol === 'name' && <span style={{ color: '#1b998b' }}>{sortDir === 'asc' ? '▲' : '▼'}</span>}</th>
                <th style={{ ...thStyle('company'), width: 140 }} onClick={() => toggleSort('company')}>Company {sortCol === 'company' && <span style={{ color: '#1b998b' }}>{sortDir === 'asc' ? '▲' : '▼'}</span>}</th>
                <th style={{ ...thStyle('title'), width: 140 }} onClick={() => toggleSort('title')}>Title {sortCol === 'title' && <span style={{ color: '#1b998b' }}>{sortDir === 'asc' ? '▲' : '▼'}</span>}</th>
                <th style={{ ...thStyle('email'), width: 180 }} onClick={() => toggleSort('email')}>Email {sortCol === 'email' && <span style={{ color: '#1b998b' }}>{sortDir === 'asc' ? '▲' : '▼'}</span>}</th>
                <th style={{ ...thStyle('phone'), width: 140 }} onClick={() => toggleSort('phone')}>Phone {sortCol === 'phone' && <span style={{ color: '#1b998b' }}>{sortDir === 'asc' ? '▲' : '▼'}</span>}</th>
                <th style={{ ...thStyle('vendor_type'), width: 100 }}>Type</th>
                <th style={{ ...thStyle('email_sent'), width: 80 }}>📨</th>
                <th style={{ ...thStyle('follow_up'), width: 80 }}>🔔</th>
                <th style={{ ...thStyle('call_done'), width: 80 }}>📞</th>
                <th style={{ ...thStyle('resume_role'), width: 120 }}>Role</th>
                <th style={{ ...thStyle(null), width: 80, cursor: 'default' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v, i) => {
                const isExp = expandedRow === v.id;
                const isSel = selected.has(v.id);
                const rowBg = isSel ? '#1b998b10' : i % 2 === 0 ? '#080e1c' : '#070c18';
                return (
                  <React.Fragment key={v.id}>
                    <tr style={{ background: rowBg, borderBottom: isExp ? 'none' : '1px solid #0d1829', transition: 'background 0.1s' }}
                      onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#0d1829'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = rowBg; }}>
                      <td style={{ padding: '8px 10px' }}><input type="checkbox" checked={isSel} onChange={() => toggleSelect(v.id)} style={{ cursor: 'pointer', accentColor: '#1b998b' }} /></td>
                      <td style={{ padding: '8px 10px', color: '#1f2937', fontSize: 10, fontWeight: 700 }}>{i + 1}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 12 }}>{v.name}</div>
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ fontWeight: 700, color: '#1b998b', fontSize: 12 }}>{v.company}</div>
                        {v.website && <a href={v.website.startsWith('http') ? v.website : `https://${v.website}`} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: '#1e40af', textDecoration: 'none', display: 'block', marginTop: 1 }}>🔗 {v.website.replace('https://www.linkedin.com/in/', 'linkedin/').substring(0, 22)}</a>}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ fontSize: 11, color: '#6b7280', fontStyle: 'italic' }}>{v.title || '—'}</div>
                      </td>
                      {/* EMAIL - SEPARATE COLUMN */}
                      <td style={{ padding: '8px 10px' }}>
                        {v.email
                          ? <span style={{ fontSize: 11, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: 4 }}>✉ {v.email}</span>
                          : <span style={{ fontSize: 11, color: '#1f2937' }}>—</span>
                        }
                      </td>
                      {/* PHONE - SEPARATE COLUMN */}
                      <td style={{ padding: '8px 10px' }}>
                        {v.phone
                          ? <span style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>📞 {v.phone}</span>
                          : <span style={{ fontSize: 11, color: '#1f2937' }}>—</span>
                        }
                      </td>
                      <td style={{ padding: '8px 10px' }}><Pill value={v.vendor_type || ''} onChange={val => onUpdate(v.id, 'vendorType', val)} options={['', 'Normal', 'Prime']} styleMap={VENDOR_TYPE_STYLE} /></td>
                      <td style={{ padding: '8px 10px' }}><Pill value={v.email_sent || ''} onChange={val => onUpdate(v.id, 'emailSent', val)} options={STATUS_OPTIONS} styleMap={STATUS_STYLE} /></td>
                      <td style={{ padding: '8px 10px' }}><Pill value={v.follow_up || ''} onChange={val => onUpdate(v.id, 'followUp', val)} options={STATUS_OPTIONS} styleMap={STATUS_STYLE} /></td>
                      <td style={{ padding: '8px 10px' }}><Pill value={v.call_done || ''} onChange={val => onUpdate(v.id, 'callDone', val)} options={STATUS_OPTIONS} styleMap={STATUS_STYLE} /></td>
                      <td style={{ padding: '8px 10px', maxWidth: 120 }}>
                        {editingCell === v.id
                          ? <input autoFocus defaultValue={v.resume_role} onBlur={e => { onUpdate(v.id, 'resumeRole', e.target.value); setEditingCell(null); }} onKeyDown={e => e.key === 'Enter' && e.target.blur()} style={{ width: '100%', background: '#1e293b', border: '1px solid #1b998b', borderRadius: 6, color: '#e2e8f0', padding: '3px 7px', fontSize: 11, outline: 'none', boxSizing: 'border-box' }} />
                          : <div onClick={() => setEditingCell(v.id)} style={{ fontSize: 11, color: v.resume_role ? '#c4b5fd' : '#1f2937', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 110 }}>{v.resume_role || <span style={{ color: '#1f2937' }}>+ Role</span>}</div>
                        }
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => setExpandedRow(isExp ? null : v.id)} style={{ background: 'none', border: '1px solid #1f2937', borderRadius: 6, color: '#6b7280', cursor: 'pointer', padding: '2px 5px', fontSize: 9 }}>{isExp ? '▲' : '▼'}</button>
                          <button onClick={() => onEdit(v)} style={{ background: 'none', border: '1px solid #1f2937', borderRadius: 6, color: '#6b7280', cursor: 'pointer', padding: '2px 5px', fontSize: 9 }}>✏️</button>
                          <button onClick={() => setDeleteConfirm(v.id)} style={{ background: 'none', border: 'none', color: '#2d1010', cursor: 'pointer', padding: '2px 4px', fontSize: 11 }} onMouseEnter={e => e.currentTarget.style.color = '#f87171'} onMouseLeave={e => e.currentTarget.style.color = '#2d1010'}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                    {isExp && (
                      <tr style={{ background: '#0a1628', borderBottom: '1px solid #0d1829' }}>
                        <td colSpan={13} style={{ padding: '8px 16px 12px 52px' }}>
                          <div style={{ fontSize: 10, color: '#374151', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Notes</div>
                          <textarea value={v.notes || ''} onChange={e => onUpdate(v.id, 'notes', e.target.value)} placeholder="Add notes..." rows={2} style={{ width: '100%', maxWidth: 560, background: '#0f172a', border: '1px solid #1f2937', borderRadius: 9, color: '#94a3b8', padding: '7px 11px', fontFamily: 'DM Sans', fontSize: 12, resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6 }} />
                        </td>
                      </tr>
                    )}
                    {deleteConfirm === v.id && (
                      <tr style={{ background: '#1a0000' }}>
                        <td colSpan={13} style={{ padding: '9px 16px' }}>
                          <span style={{ color: '#f87171', fontSize: 12 }}>⚠ Delete <b>{v.name}</b> from ALL views permanently? &nbsp;</span>
                          <button onClick={() => { onDelete(v.id); setDeleteConfirm(null); }} style={{ background: '#991b1b', border: 'none', color: '#fff', borderRadius: 7, padding: '4px 12px', cursor: 'pointer', fontSize: 11, marginRight: 7 }}>Yes, Delete</button>
                          <button onClick={() => setDeleteConfirm(null)} style={{ background: '#1f2937', border: 'none', color: '#9ca3af', borderRadius: 7, padding: '4px 12px', cursor: 'pointer', fontSize: 11 }}>Cancel</button>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: '#374151', fontFamily: 'DM Sans', fontSize: 13 }}>
            {hasFilters ? (
              <div>
                🔍 No vendors match these filters.<br />
                <button onClick={() => setAdvFilters([])} style={{ marginTop: 10, padding: '6px 16px', borderRadius: 8, background: '#1b998b20', border: '1px solid #1b998b40', color: '#1b998b', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 12 }}>Clear Filters</button>
              </div>
            ) : subView !== 'all' ? `Use the Type dropdown to tag vendors as ${subView === 'prime' ? 'Prime ⭐' : 'Normal 🔵'}` : 'No vendors found'}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────
export default function App() {
  const [vendors, setVendors] = useState([]);
  const [wishlists, setWishlists] = useState([]);
  const [wishlistVendors, setWishlistVendors] = useState({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeView, setActiveView] = useState('all');
  const [modal, setModal] = useState(null);
  const [showEmail, setShowEmail] = useState(false);
  const [showCSV, setShowCSV] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [renamingWishlist, setRenamingWishlist] = useState(null);
  const [deleteWishlistConfirm, setDeleteWishlistConfirm] = useState(null);
  const [lastImportIds, setLastImportIds] = useState([]);
  const [toast, setToast] = useState(null);

  const showToast = (msg, color = '#1b998b') => { setToast({ msg, color }); setTimeout(() => setToast(null), 3500); };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: vData }, { data: wData }, { data: wvData }] = await Promise.all([
        supabase.from('vendors').select('*').order('id'),
        supabase.from('wishlists').select('*').order('created_at'),
        supabase.from('wishlist_vendors').select('*'),
      ]);
      if (vData && vData.length === 0) {
        const seeded = ALL_VENDORS.map(v => ({ name: v.name, title: v.title || '', company: v.company, email: v.email || '', phone: v.phone || '', website: v.website || '', notes: '', vendor_type: '', email_sent: '', follow_up: '', call_done: '', resume_role: '' }));
        const { data: ins } = await supabase.from('vendors').insert(seeded).select();
        setVendors(ins || []);
      } else { setVendors(vData || []); }
      setWishlists(wData || []);
      const map = {};
      (wvData || []).forEach(({ wishlist_id, vendor_id }) => { if (!map[wishlist_id]) map[wishlist_id] = []; map[wishlist_id].push(vendor_id); });
      setWishlistVendors(map);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    const ch = supabase.channel('all-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendors' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wishlists' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wishlist_vendors' }, loadAll)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [loadAll]);

  // Delete from vendors table = removes from ALL views automatically (wishlists just reference by ID)
  const deleteVendor = async (id) => {
    await supabase.from('vendors').delete().eq('id', id);
    setVendors(v => v.filter(x => x.id !== id));
    showToast('🗑️ Deleted from all views');
  };

  const bulkDelete = async (ids) => {
    setSyncing(true);
    await supabase.from('vendors').delete().in('id', ids);
    setVendors(v => v.filter(x => !ids.includes(x.id)));
    setSyncing(false);
    showToast(`🗑️ Deleted ${ids.length} vendors from all views`, '#f87171');
  };

  const updateVendor = async (id, field, value) => {
    setVendors(v => v.map(x => x.id === id ? { ...x, [field]: value } : x));
    setSyncing(true);
    const dbField = { emailSent: 'email_sent', followUp: 'follow_up', callDone: 'call_done', resumeRole: 'resume_role', vendorType: 'vendor_type' }[field] || field;
    await supabase.from('vendors').update({ [dbField]: value }).eq('id', id);
    setSyncing(false);
  };

  const saveVendor = async (form) => {
    const dbForm = { name: form.name, title: form.title || '', company: form.company, email: form.email || '', phone: form.phone || '', website: form.website || '', notes: form.notes || '', vendor_type: form.vendorType || '', email_sent: form.emailSent || '', follow_up: form.followUp || '', call_done: form.callDone || '', resume_role: form.resumeRole || '' };
    setSyncing(true);
    if (!editingVendor) {
      const { data } = await supabase.from('vendors').insert([dbForm]).select();
      if (data) {
        setVendors(v => [...v, data[0]]);
        if (activeView !== 'all' && data[0]) await supabase.from('wishlist_vendors').insert([{ wishlist_id: parseInt(activeView), vendor_id: data[0].id }]);
      }
    } else {
      await supabase.from('vendors').update(dbForm).eq('id', editingVendor.id);
      setVendors(v => v.map(x => x.id === editingVendor.id ? { ...x, ...dbForm } : x));
    }
    setSyncing(false); setEditingVendor(null); setModal(null);
    showToast(editingVendor ? '✅ Vendor updated' : '✅ Vendor added');
  };

  const handleCSVImport = async ({ vendors: csvVendors, addToAll, createWishlist, wishlistName, existingWishlistId }) => {
    setSyncing(true);
    const { data: inserted } = await supabase.from('vendors').insert(csvVendors).select();
    const insertedIds = (inserted || []).map(d => d.id);
    setVendors(v => [...v, ...(inserted || [])]);
    setLastImportIds(insertedIds);

    if (createWishlist && insertedIds.length > 0) {
      let wlId = existingWishlistId ? parseInt(existingWishlistId) : null;
      if (!wlId && wishlistName) {
        const { data: wl } = await supabase.from('wishlists').insert([{ name: wishlistName }]).select();
        if (wl) { wlId = wl[0].id; setWishlists(w => [...w, wl[0]]); }
      }
      if (wlId) {
        await supabase.from('wishlist_vendors').insert(insertedIds.map(vid => ({ wishlist_id: wlId, vendor_id: vid })));
        setWishlistVendors(prev => ({ ...prev, [wlId]: [...(prev[wlId] || []), ...insertedIds] }));
        setActiveView(wlId.toString());
      }
    }
    setSyncing(false);
    showToast(`✅ Imported ${insertedIds.length} vendors! Use Undo to reverse.`);
  };

  const handleUndo = async () => {
    if (!lastImportIds.length) return;
    if (!window.confirm(`Undo last import? This will permanently delete ${lastImportIds.length} vendors from ALL views.`)) return;
    await bulkDelete(lastImportIds);
    setLastImportIds([]);
    showToast(`↩️ Last import undone`, '#fbbf24');
  };

  const deleteWishlist = async (id) => {
    await supabase.from('wishlists').delete().eq('id', id);
    setWishlists(w => w.filter(x => x.id !== id));
    if (activeView === id.toString()) setActiveView('all');
    setDeleteWishlistConfirm(null);
    showToast('Wishlist deleted (vendors kept in All Vendors)');
  };

  const renameWishlist = async (id, name) => {
    await supabase.from('wishlists').update({ name }).eq('id', id);
    setWishlists(w => w.map(x => x.id === id ? { ...x, name } : x));
    setRenamingWishlist(null);
  };

  const currentVendors = activeView === 'all' ? vendors : vendors.filter(v => (wishlistVendors[parseInt(activeView)] || []).includes(v.id));

  const total = vendors.length;
  const primeCount = vendors.filter(v => v.vendor_type === 'Prime').length;
  const emailsSent = vendors.filter(v => v.email_sent === 'Yes').length;
  const withEmail = vendors.filter(v => v.email).length;

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#070d1c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 48, height: 48, border: '3px solid #1b998b40', borderTop: '3px solid #1b998b', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <div style={{ fontFamily: 'Syne', color: '#1b998b', fontSize: 16, fontStyle: 'italic' }}>Vincit qui se vincit...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#070d1c', fontFamily: 'DM Sans, sans-serif', backgroundImage: 'radial-gradient(ellipse at 10% 0%,#0d2d3a 0%,transparent 45%),radial-gradient(ellipse at 90% 0%,#1a0d2e 0%,transparent 45%)' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes slideIn{from{transform:translateY(80px);opacity:0}to{transform:translateY(0);opacity:1}}*{box-sizing:border-box}::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:#0a1120}::-webkit-scrollbar-thumb{background:#1b998b40;border-radius:3px}`}</style>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#0f172a', border: `1px solid ${toast.color}50`, borderRadius: 12, padding: '12px 24px', color: toast.color, fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600, zIndex: 9999, boxShadow: `0 8px 32px ${toast.color}30`, animation: 'slideIn 0.3s ease', whiteSpace: 'nowrap' }}>
          {toast.msg}
        </div>
      )}

      {/* HEADER */}
      <div style={{ padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #0f2031', background: 'linear-gradient(180deg,#060d1a 0%,transparent 100%)', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(16px)' }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: 'Syne', fontSize: 20, fontWeight: 800, color: '#e2e8f0', fontStyle: 'italic' }}><span style={{ color: '#1b998b' }}>Vincit</span> qui se vincit</h1>
          <p style={{ margin: 0, fontSize: 10, color: '#374151', letterSpacing: 1 }}>IT STAFFING · CONSULTADD {syncing ? <span style={{ color: '#fbbf24' }}>● syncing</span> : <span style={{ color: '#1b998b' }}>● live</span>}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowCSV(true)} style={{ padding: '8px 16px', borderRadius: 12, background: '#0d2d1a', border: '1px solid #1b998b40', color: '#1b998b', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><Upload size={13} /> Import CSV</button>
          <button onClick={() => setShowEmail(true)} style={{ padding: '8px 16px', borderRadius: 12, background: '#2d1810', border: '1px solid #ff6b3540', color: '#ff6b35', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600 }}>📧 Templates</button>
          <button onClick={() => { setEditingVendor(null); setModal('add'); }} style={{ padding: '8px 20px', borderRadius: 12, background: 'linear-gradient(135deg,#1b998b,#0d6e65)', border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13, fontWeight: 700, boxShadow: '0 4px 20px #1b998b40' }}>+ Add Vendor</button>
        </div>
      </div>

      <div style={{ padding: '16px 28px', maxWidth: 1900, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <StatCard label="Total Vendors" value={total} icon="🏢" color="#1b998b" />
          <StatCard label="Prime" value={primeCount} icon="⭐" color="#f59e0b" sub={`${Math.round(primeCount/total*100)||0}% tagged`} />
          <StatCard label="Wishlists" value={wishlists.length} icon="📋" color="#8b5cf6" />
          <StatCard label="Have Email" value={withEmail} icon="📧" color="#3b82f6" sub={`${Math.round(withEmail/total*100)||0}% of total`} />
          <StatCard label="Emailed" value={emailsSent} icon="📨" color="#ff6b35" sub={`${Math.round(emailsSent/total*100)||0}% contacted`} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16, alignItems: 'start' }}>

          {/* SIDEBAR */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, position: 'sticky', top: 74 }}>
            <div style={{ background: '#0f172a', border: '1px solid #1f2937', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', fontSize: 9, color: '#475569', fontFamily: 'Syne', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid #0f2031' }}>Views</div>
              <button onClick={() => setActiveView('all')} style={{ display: 'block', width: '100%', padding: '10px 12px', textAlign: 'left', background: activeView === 'all' ? '#1b998b15' : 'transparent', border: 'none', borderBottom: '1px solid #0f2031', color: activeView === 'all' ? '#1b998b' : '#94a3b8', fontFamily: 'DM Sans', fontSize: 13, fontWeight: activeView === 'all' ? 700 : 400, cursor: 'pointer' }}>
                🌐 All Vendors <span style={{ float: 'right', fontSize: 11, color: activeView === 'all' ? '#1b998b' : '#374151' }}>{total}</span>
              </button>
            </div>

            <div style={{ background: '#0f172a', border: '1px solid #1f2937', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', fontSize: 9, color: '#475569', fontFamily: 'Syne', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid #0f2031', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Wishlists <button onClick={() => setShowCSV(true)} style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>+</button>
              </div>
              {wishlists.length === 0 && <div style={{ padding: '10px 12px', fontSize: 11, color: '#374151', fontFamily: 'DM Sans', lineHeight: 1.5 }}>No wishlists yet.<br /><span style={{ color: '#7c3aed', cursor: 'pointer' }} onClick={() => setShowCSV(true)}>Import CSV to create one.</span></div>}
              {wishlists.map(w => {
                const isActive = activeView === w.id.toString();
                const count = (wishlistVendors[w.id] || []).length;
                return (
                  <div key={w.id} style={{ borderBottom: '1px solid #0f2031' }}>
                    {renamingWishlist === w.id
                      ? <input autoFocus defaultValue={w.name} onBlur={e => renameWishlist(w.id, e.target.value)} onKeyDown={e => e.key === 'Enter' && renameWishlist(w.id, e.target.value)} style={{ width: '100%', padding: '9px 12px', background: '#1e293b', border: 'none', color: '#e2e8f0', fontFamily: 'DM Sans', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
                      : <div style={{ display: 'flex', alignItems: 'center' }}>
                          <button onClick={() => setActiveView(w.id.toString())} style={{ flex: 1, padding: '9px 12px', textAlign: 'left', background: isActive ? '#7c3aed15' : 'transparent', border: 'none', color: isActive ? '#c4b5fd' : '#94a3b8', fontFamily: 'DM Sans', fontSize: 12, fontWeight: isActive ? 700 : 400, cursor: 'pointer' }}>
                            📋 {w.name.length > 15 ? w.name.substring(0, 15) + '…' : w.name} <span style={{ float: 'right', fontSize: 10, color: isActive ? '#7c3aed' : '#374151' }}>{count}</span>
                          </button>
                          <div style={{ paddingRight: 6, display: 'flex', gap: 1 }}>
                            <button onClick={() => setRenamingWishlist(w.id)} style={{ background: 'none', border: 'none', color: '#374151', cursor: 'pointer', fontSize: 10, padding: '2px 3px' }}>✏️</button>
                            <button onClick={() => setDeleteWishlistConfirm(w.id)} style={{ background: 'none', border: 'none', color: '#374151', cursor: 'pointer', fontSize: 10, padding: '2px 3px' }} onMouseEnter={e => e.currentTarget.style.color = '#f87171'} onMouseLeave={e => e.currentTarget.style.color = '#374151'}>🗑️</button>
                          </div>
                        </div>
                    }
                    {deleteWishlistConfirm === w.id && (
                      <div style={{ padding: '8px 10px', background: '#1a0000' }}>
                        <div style={{ fontSize: 11, color: '#f87171', marginBottom: 5 }}>Delete sheet only?<br /><span style={{ color: '#6b7280', fontSize: 10 }}>Vendors stay in All Vendors</span></div>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button onClick={() => deleteWishlist(w.id)} style={{ padding: '3px 10px', background: '#991b1b', border: 'none', color: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}>Delete Sheet</button>
                          <button onClick={() => setDeleteWishlistConfirm(null)} style={{ padding: '3px 9px', background: '#1f2937', border: 'none', color: '#9ca3af', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <button onClick={() => setShowCSV(true)} style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', background: 'transparent', border: 'none', color: '#7c3aed', fontFamily: 'DM Sans', fontSize: 11, cursor: 'pointer' }}>+ Import CSV → New Wishlist</button>
            </div>

            <ThoughtsWidget />

            <div style={{ background: 'linear-gradient(135deg,#0f172a,#1a2233)', border: '1px solid #1b998b20', borderRadius: 14, padding: 14 }}>
              <div style={{ fontFamily: 'Syne', fontSize: 9, fontWeight: 700, color: '#475569', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>📊 Pipeline</div>
              {[{ label: 'Prime', val: primeCount, color: '#f59e0b' }, { label: 'Emailed', val: emailsSent, color: '#8b5cf6' }, { label: 'Have Email', val: withEmail, color: '#3b82f6' }].map(({ label, val, color }) => {
                const pct = Math.round(val / total * 100) || 0;
                return (
                  <div key={label} style={{ marginBottom: 9 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: '#6b7280', fontFamily: 'DM Sans' }}>{label}</span>
                      <span style={{ fontSize: 11, color, fontFamily: 'DM Sans', fontWeight: 700 }}>{val}/{total}</span>
                    </div>
                    <div style={{ background: '#0f172a', borderRadius: 20, height: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 20, background: `linear-gradient(90deg,${color},${color}80)`, transition: 'width 0.8s' }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ background: '#0f172a', border: '1px solid #1f2937', borderRadius: 14, padding: 14 }}>
              <div style={{ fontFamily: 'Syne', fontSize: 9, fontWeight: 700, color: '#475569', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>⚡ Actions</div>
              {[
                { label: '📤 Import CSV', color: '#1b998b', bg: '#1b998b10', border: '#1b998b30', action: () => setShowCSV(true) },
                { label: '📧 Email Templates', color: '#ff6b35', bg: '#ff6b3510', border: '#ff6b3530', action: () => setShowEmail(true) },
                { label: '💾 Export Backup', color: '#6b7280', bg: '#1f293710', border: '#334155', action: () => { const b = new Blob([JSON.stringify(vendors, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'vendors_backup.json'; a.click(); } },
              ].map(({ label, color, bg, border, action }) => (
                <button key={label} onClick={action} style={{ display: 'block', width: '100%', marginBottom: 7, padding: '8px 12px', borderRadius: 10, background: bg, border: `1px solid ${border}`, color, cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 12, textAlign: 'left' }}>{label}</button>
              ))}
            </div>
          </div>

          {/* MAIN */}
          <div>
            <div style={{ marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontFamily: 'Syne', fontSize: 17, color: '#e2e8f0', fontWeight: 800 }}>
                {activeView === 'all' ? '🌐 All Vendors' : `📋 ${wishlists.find(w => w.id.toString() === activeView)?.name || 'Wishlist'}`}
              </h2>
              <p style={{ margin: 0, fontSize: 11, color: '#4b5563', fontFamily: 'DM Sans' }}>
                {currentVendors.length} vendors · Email & Phone in separate columns · Delete anywhere = delete from database
              </p>
            </div>

            <VendorTable
              vendors={currentVendors}
              onUpdate={updateVendor}
              onEdit={v => { setEditingVendor(v); setModal('edit'); }}
              onDelete={deleteVendor}
              onBulkDelete={bulkDelete}
              onUndo={handleUndo}
              canUndo={lastImportIds.length > 0}
            />
          </div>
        </div>
      </div>

      {(modal === 'add' || modal === 'edit') && <VendorModal vendor={modal === 'edit' ? editingVendor : null} onSave={saveVendor} onClose={() => { setModal(null); setEditingVendor(null); }} />}
      {showEmail && <EmailTemplatesPanel onClose={() => setShowEmail(false)} />}
      {showCSV && <CSVModal onClose={() => setShowCSV(false)} onImport={handleCSVImport} wishlists={wishlists} />}
    </div>
  );
}
