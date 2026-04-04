import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabase';
import { ALL_VENDORS } from './data';
import { Search, Upload, Trash2, Filter, RotateCcw, X, Plus, ChevronDown, Mail, Phone, Globe, Edit2, ChevronUp, MoreHorizontal, Clock, Calendar } from 'lucide-react';

const lload = (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const lsave = (k, val) => { try { localStorage.setItem(k, JSON.stringify(val)); } catch {} };

// ─── DESIGN TOKENS ────────────────────────────────────────────────
const C = {
  bg: '#f8fafc',
  surface: '#ffffff',
  surfaceHover: '#f1f5f9',
  border: '#e2e8f0',
  borderStrong: '#cbd5e1',
  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  primary: '#2563eb',
  primaryLight: '#eff6ff',
  primaryBorder: '#bfdbfe',
  success: '#16a34a',
  successLight: '#f0fdf4',
  successBorder: '#bbf7d0',
  warning: '#d97706',
  warningLight: '#fffbeb',
  warningBorder: '#fde68a',
  danger: '#dc2626',
  dangerLight: '#fef2f2',
  dangerBorder: '#fecaca',
  purple: '#7c3aed',
  purpleLight: '#f5f3ff',
  purpleBorder: '#ddd6fe',
  teal: '#0891b2',
  tealLight: '#ecfeff',
  tealBorder: '#a5f3fc',
  gold: '#b45309',
  goldLight: '#fffbeb',
  goldBorder: '#fde68a',
  sidebar: '#1e293b',
  sidebarText: '#94a3b8',
  sidebarActive: '#2563eb',
};

// ─── HELPERS ──────────────────────────────────────────────────────
function formatDate(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function timeAgo(dt) {
  if (!dt) return '';
  const sec = Math.floor((Date.now() - new Date(dt)) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec/60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec/3600)}h ago`;
  if (sec < 604800) return `${Math.floor(sec/86400)}d ago`;
  return formatDate(dt).split(' ').slice(0,2).join(' ');
}

// ─── STATUS CONFIG ────────────────────────────────────────────────
const STATUS_OPTIONS = ['', 'Yes', 'No', 'Pending'];
const STATUS_STYLE = {
  Yes:     { bg: C.successLight, text: C.success, border: C.successBorder, label: 'Yes' },
  No:      { bg: C.dangerLight, text: C.danger, border: C.dangerBorder, label: 'No' },
  Pending: { bg: C.warningLight, text: C.warning, border: C.warningBorder, label: 'Pending' },
  '':      { bg: C.bg, text: C.textMuted, border: C.border, label: '—' },
};
const TYPE_STYLE = {
  Prime:   { bg: C.goldLight, text: C.gold, border: C.goldBorder, label: '⭐ Prime' },
  Normal:  { bg: C.primaryLight, text: C.primary, border: C.primaryBorder, label: '● Normal' },
  '':      { bg: C.bg, text: C.textMuted, border: C.border, label: '○ Untag' },
};

// ─── PILL ─────────────────────────────────────────────────────────
function Pill({ value, onChange, options, styleMap, small }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const s = styleMap[value] || styleMap[''];
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => setOpen(!open)} style={{
        background: s.bg, color: s.text, border: `1px solid ${s.border}`,
        borderRadius: 6, padding: small ? '2px 8px' : '3px 10px',
        fontSize: small ? 11 : 12, fontFamily: 'Inter', fontWeight: 500,
        cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4,
        transition: 'all 0.1s',
      }}>
        {s.label} <ChevronDown size={10} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '110%', left: 0, zIndex: 9999,
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
          overflow: 'hidden', minWidth: 120, boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
        }}>
          {options.map(opt => {
            const st = styleMap[opt] || styleMap[''];
            return (
              <button key={opt} onClick={() => { onChange(opt); setOpen(false); }} style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px',
                background: 'transparent', border: 'none', color: st.text,
                fontSize: 12, fontFamily: 'Inter', fontWeight: 500, cursor: 'pointer',
              }}
                onMouseEnter={e => e.currentTarget.style.background = C.surfaceHover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >{st.label}</button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, sub, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
      padding: '16px 20px', flex: 1, minWidth: 120, cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = `0 4px 16px ${color}20`; }}}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ fontSize: 20 }}>{icon}</div>
        {sub && <span style={{ fontSize: 10, color: C.textMuted, background: C.bg, borderRadius: 20, padding: '2px 8px', border: `1px solid ${C.border}` }}>{sub}</span>}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: 'Syne', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 4, fontFamily: 'Inter' }}>{label}</div>
    </div>
  );
}

// ─── ADVANCED FILTER PANEL ────────────────────────────────────────
const FILTER_FIELDS = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'company', label: 'Company', type: 'text' },
  { key: 'title', label: 'Job Title', type: 'text' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'phone', label: 'Phone', type: 'text' },
  { key: 'website', label: 'Website', type: 'text' },
  { key: 'vendor_type', label: 'Vendor Type', type: 'select', options: ['', 'Normal', 'Prime'] },
  { key: 'email_sent', label: 'Email Sent', type: 'select', options: STATUS_OPTIONS },
  { key: 'follow_up', label: 'Follow-Up', type: 'select', options: STATUS_OPTIONS },
  { key: 'call_done', label: 'Call Done', type: 'select', options: STATUS_OPTIONS },
  { key: 'resume_role', label: 'Resume Role', type: 'text' },
  { key: 'notes', label: 'Notes', type: 'text' },
];
const TEXT_OPS = [
  { key: 'contains', label: 'contains' },
  { key: 'not_contains', label: 'does not contain' },
  { key: 'equals', label: 'equals' },
  { key: 'not_equals', label: 'is not' },
  { key: 'is_empty', label: 'is empty' },
  { key: 'is_not_empty', label: 'is not empty' },
  { key: 'starts_with', label: 'starts with' },
];
const SELECT_OPS = [
  { key: 'equals', label: 'is' },
  { key: 'not_equals', label: 'is not' },
  { key: 'is_empty', label: 'is empty' },
  { key: 'is_not_empty', label: 'is not empty' },
];

function applyFilter(v, f) {
  const raw = (v[f.field] || '').toLowerCase().trim();
  const fval = (f.value || '').toLowerCase().trim();
  switch (f.op) {
    case 'contains': return raw.includes(fval);
    case 'not_contains': return !raw.includes(fval);
    case 'equals': return raw === fval;
    case 'not_equals': return raw !== fval;
    case 'is_empty': return raw === '';
    case 'is_not_empty': return raw !== '';
    case 'starts_with': return raw.startsWith(fval);
    default: return true;
  }
}

function AdvancedFilterPanel({ filters, setFilters, conjunction, setConjunction, onClose }) {
  const addFilter = () => setFilters(f => [...f, { id: Date.now(), field: 'email', op: 'is_not_empty', value: '' }]);
  const removeFilter = id => setFilters(f => f.filter(x => x.id !== id));
  const update = (id, k, v) => setFilters(f => f.map(x => x.id === id ? { ...x, [k]: v } : x));

  const inp = {
    padding: '7px 10px', background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 8, color: C.text, fontSize: 12, fontFamily: 'Inter', outline: 'none',
    cursor: 'pointer',
  };

  const PRESETS = [
    { label: '📧 No Email', f: [{ field: 'email', op: 'is_empty', value: '' }] },
    { label: '📞 No Phone', f: [{ field: 'phone', op: 'is_empty', value: '' }] },
    { label: '📧+📞 Missing Both', f: [{ field: 'email', op: 'is_empty', value: '' }, { field: 'phone', op: 'is_empty', value: '' }], c: 'AND' },
    { label: '⭐ Prime Only', f: [{ field: 'vendor_type', op: 'equals', value: 'Prime' }] },
    { label: '✅ Emailed', f: [{ field: 'email_sent', op: 'equals', value: 'Yes' }] },
    { label: '🔴 Not Contacted', f: [{ field: 'email_sent', op: 'is_empty', value: '' }, { field: 'call_done', op: 'is_empty', value: '' }], c: 'AND' },
    { label: '🔵 Normal Only', f: [{ field: 'vendor_type', op: 'equals', value: 'Normal' }] },
    { label: '📞 Has Phone', f: [{ field: 'phone', op: 'is_not_empty', value: '' }] },
  ];

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'Syne', fontSize: 14, color: C.text, fontWeight: 700 }}>Advanced Filters</span>
          <span style={{ fontSize: 12, color: C.textMuted }}>Match</span>
          <select value={conjunction} onChange={e => setConjunction(e.target.value)} style={{ ...inp, padding: '5px 8px', fontWeight: 600 }}>
            <option value="AND">ALL conditions (AND)</option>
            <option value="OR">ANY condition (OR)</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={addFilter} style={{ padding: '6px 14px', borderRadius: 8, background: C.primaryLight, border: `1px solid ${C.primaryBorder}`, color: C.primary, cursor: 'pointer', fontFamily: 'Inter', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Plus size={12} /> Add Filter
          </button>
          <button onClick={() => setFilters([])} style={{ padding: '6px 12px', borderRadius: 8, background: C.dangerLight, border: `1px solid ${C.dangerBorder}`, color: C.danger, cursor: 'pointer', fontFamily: 'Inter', fontSize: 12 }}>Clear All</button>
          <button onClick={onClose} style={{ background: 'none', border: `1px solid ${C.border}`, color: C.textMuted, cursor: 'pointer', borderRadius: 8, padding: '6px 8px' }}><X size={13} /></button>
        </div>
      </div>

      {/* FILTER ROWS */}
      {filters.length === 0 && (
        <div style={{ padding: '12px 0 6px', color: C.textMuted, fontFamily: 'Inter', fontSize: 13 }}>
          No filters active. Add a filter or use a quick preset below.
        </div>
      )}
      {filters.map((f, i) => {
        const fd = FILTER_FIELDS.find(x => x.key === f.field) || FILTER_FIELDS[0];
        const ops = fd.type === 'select' ? SELECT_OPS : TEXT_OPS;
        const needsVal = !['is_empty', 'is_not_empty'].includes(f.op);
        return (
          <div key={f.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, padding: '10px 14px', background: C.bg, borderRadius: 10, border: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 12, color: C.textMuted, fontFamily: 'Inter', minWidth: 36, fontWeight: 600 }}>{i === 0 ? 'Where' : conjunction}</span>
            <select value={f.field} onChange={e => update(f.id, 'field', e.target.value)} style={{ ...inp, minWidth: 130 }}>
              {FILTER_FIELDS.map(ff => <option key={ff.key} value={ff.key}>{ff.label}</option>)}
            </select>
            <select value={f.op} onChange={e => update(f.id, 'op', e.target.value)} style={{ ...inp, minWidth: 160 }}>
              {ops.map(op => <option key={op.key} value={op.key}>{op.label}</option>)}
            </select>
            {needsVal && (
              fd.type === 'select'
                ? <select value={f.value} onChange={e => update(f.id, 'value', e.target.value)} style={{ ...inp, minWidth: 120 }}>
                    {(fd.options || []).map(o => <option key={o} value={o}>{o || '(empty)'}</option>)}
                  </select>
                : <input value={f.value || ''} onChange={e => update(f.id, 'value', e.target.value)} placeholder="value..." style={{ ...inp, flex: 1, minWidth: 120 }} />
            )}
            {!needsVal && <div style={{ flex: 1 }} />}
            <button onClick={() => removeFilter(f.id)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: '4px', borderRadius: 6, display: 'flex' }}
              onMouseEnter={e => e.currentTarget.style.color = C.danger}
              onMouseLeave={e => e.currentTarget.style.color = C.textMuted}>
              <X size={14} />
            </button>
          </div>
        );
      })}

      {/* QUICK PRESETS */}
      <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 11, color: C.textMuted, fontFamily: 'Inter', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Quick Presets</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => { setFilters(p.f.map((fi, i) => ({ ...fi, id: Date.now() + i }))); if (p.c) setConjunction(p.c); }} style={{
              padding: '5px 12px', borderRadius: 20, background: C.surface, border: `1px solid ${C.border}`,
              color: C.textSecondary, cursor: 'pointer', fontFamily: 'Inter', fontSize: 12, transition: 'all 0.1s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.color = C.primary; e.currentTarget.style.background = C.primaryLight; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSecondary; e.currentTarget.style.background = C.surface; }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── CSV PARSER ───────────────────────────────────────────────────
function parseCSVRow(row) {
  const res = []; let cur = ''; let inQ = false;
  for (const ch of row) {
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { res.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  res.push(cur.trim());
  return res;
}

function smartParseCSV(text) {
  const lines = text.trim().split('\n').filter(l => l.trim());
  const hdrs = parseCSVRow(lines[0]).map(h => h.replace(/"/g, '').trim().toLowerCase());
  const colMap = {
    name: ['full name', 'name', 'contact name', 'full_name'],
    first: ['first name', 'first_name', 'firstname'],
    last: ['last name', 'last_name', 'lastname'],
    title: ['job title', 'title', 'position', 'role', 'job_title'],
    company: ['company name', 'company', 'organization', 'firm', 'company_name', 'account'],
    email: ['contact email address - data', 'email', 'email address', 'contact email', 'email_address', 'work email'],
    phone: ['contact phone number - data', 'phone', 'phone number', 'mobile', 'phone_number', 'contact phone'],
    website: ['company domain', 'website', 'url', 'domain', 'web', 'linkedin profile', 'linkedin'],
    location: ['location', 'city', 'state', 'country', 'geography'],
    notes: ['notes', 'note', 'comments', 'description'],
  };
  const findCol = (v) => { for (const x of v) { const i = hdrs.indexOf(x); if (i !== -1) return i; } return -1; };
  const cols = {}; for (const [f, v] of Object.entries(colMap)) cols[f] = findCol(v);
  const get = (row, f) => cols[f] !== -1 ? (row[cols[f]] || '').replace(/"/g, '').trim() : '';
  return lines.slice(1).map(line => {
    const row = parseCSVRow(line);
    let name = get(row, 'name') || [get(row, 'first'), get(row, 'last')].filter(Boolean).join(' ');
    const company = get(row, 'company');
    if (!name && !company) return null;
    const location = get(row, 'location');
    const notes = [get(row, 'notes'), location].filter(Boolean).join(' | ');
    return { name: name || company, title: get(row, 'title'), company: company || name, email: get(row, 'email'), phone: get(row, 'phone'), website: get(row, 'website'), notes, vendor_type: '', email_sent: '', follow_up: '', call_done: '', resume_role: '' };
  }).filter(Boolean);
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

  const handleFile = e => {
    const file = e.target.files[0]; if (!file) return;
    setFileName(file.name); setWishlistName(file.name.replace('.csv', '').replace(/_/g, ' '));
    const reader = new FileReader();
    reader.onload = ev => { setParsed(smartParseCSV(ev.target.result)); setStep(2); };
    reader.readAsText(file);
  };

  const inp = { padding: '9px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, fontFamily: 'Inter', outline: 'none', width: '100%', boxSizing: 'border-box' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 32, width: '100%', maxWidth: 660, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontFamily: 'Syne', color: C.text, fontSize: 20, fontWeight: 700 }}>Import CSV</h2>
          <button onClick={onClose} style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.textMuted, cursor: 'pointer', fontSize: 16, borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
        </div>

        {/* STEP PILLS */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {['Upload', 'Preview', 'Options'].map((s, i) => (
            <div key={s} style={{ flex: 1, padding: '7px 0', textAlign: 'center', borderRadius: 8, fontSize: 12, fontFamily: 'Inter', fontWeight: 600, background: step === i+1 ? C.primaryLight : C.bg, border: `1px solid ${step === i+1 ? C.primaryBorder : C.border}`, color: step === i+1 ? C.primary : step > i+1 ? C.success : C.textMuted }}>
              {step > i+1 ? '✓ ' : `${i+1}. `}{s}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div>
            <div onClick={() => fileRef.current.click()} style={{ border: `2px dashed ${C.border}`, borderRadius: 14, padding: 48, textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.background = C.primaryLight; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = 'transparent'; }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
              <div style={{ fontFamily: 'Syne', color: C.text, fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Click to browse CSV file</div>
              <div style={{ fontFamily: 'Inter', color: C.textMuted, fontSize: 13 }}>Auto-detects columns: Full Name, Company, Email, Phone, Job Title, Location</div>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />
            </div>
            <div style={{ marginTop: 14, padding: 14, background: C.bg, borderRadius: 10, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, color: C.textSecondary, fontFamily: 'Inter', fontWeight: 600, marginBottom: 8 }}>Supported column names (auto-detected):</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: 12, color: C.textMuted, fontFamily: 'Inter', lineHeight: 1.7 }}>
                <div><b style={{ color: C.textSecondary }}>Name:</b> Full Name / First + Last Name</div>
                <div><b style={{ color: C.textSecondary }}>Email:</b> Contact Email Address - Data</div>
                <div><b style={{ color: C.textSecondary }}>Company:</b> Company Name / Organization</div>
                <div><b style={{ color: C.textSecondary }}>Phone:</b> Contact Phone Number - Data</div>
                <div><b style={{ color: C.textSecondary }}>Title:</b> Job Title / Position / Role</div>
                <div><b style={{ color: C.textSecondary }}>Website:</b> Company Domain / LinkedIn</div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontFamily: 'Inter', color: C.textSecondary, fontSize: 13 }}>
                <span style={{ color: C.primary, fontWeight: 600 }}>{parsed.length} vendors</span> · <span style={{ color: C.success }}>{parsed.filter(v => v.email).length} with email</span> · <span style={{ color: C.teal }}>{parsed.filter(v => v.phone).length} with phone</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setStep(1)} style={{ padding: '7px 14px', borderRadius: 8, background: C.bg, border: `1px solid ${C.border}`, color: C.textSecondary, cursor: 'pointer', fontFamily: 'Inter', fontSize: 12 }}>← Back</button>
                <button onClick={() => setStep(3)} style={{ padding: '7px 16px', borderRadius: 8, background: C.primary, border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'Inter', fontWeight: 600, fontSize: 12 }}>Continue →</button>
              </div>
            </div>
            <div style={{ background: C.bg, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}`, maxHeight: 340, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: C.surface }}>
                    {['Name', 'Company', 'Email', 'Phone', 'Title'].map(h => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontFamily: 'Inter', color: C.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, background: C.surface }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {parsed.map((v, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '7px 12px', fontSize: 13, color: C.text, fontWeight: 500, fontFamily: 'Inter' }}>{v.name || '—'}</td>
                      <td style={{ padding: '7px 12px', fontSize: 12, color: C.primary, fontWeight: 500, fontFamily: 'Inter' }}>{v.company || '—'}</td>
                      <td style={{ padding: '7px 12px', fontSize: 12, color: v.email ? C.teal : C.textMuted, fontFamily: 'Inter' }}>{v.email || '✗'}</td>
                      <td style={{ padding: '7px 12px', fontSize: 12, color: v.phone ? C.textSecondary : C.textMuted, fontFamily: 'Inter' }}>{v.phone || '✗'}</td>
                      <td style={{ padding: '7px 12px', fontSize: 11, color: C.textMuted, fontStyle: 'italic', fontFamily: 'Inter' }}>{v.title || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <p style={{ fontFamily: 'Inter', color: C.textSecondary, fontSize: 13, marginTop: 0, marginBottom: 18 }}>What to do with <strong style={{ color: C.text }}>{parsed.length} vendors</strong>?</p>
            {[
              { key: 'addToAll', val: addToAll, set: setAddToAll, title: 'Add to All Vendors', desc: 'These vendors will be visible to everyone. Deleting from any view removes from database.', color: C.primary, lightColor: C.primaryLight, borderColor: C.primaryBorder },
              { key: 'wishlist', val: createWishlist, set: setCreateWishlist, title: 'Save as Wishlist Sheet', desc: 'Group these vendors in a named sheet for easy access', color: C.purple, lightColor: C.purpleLight, borderColor: C.purpleBorder },
            ].map(({ key, val, set, title, desc, color, lightColor, borderColor }) => (
              <div key={key} onClick={() => set(!val)} style={{ padding: 16, background: val ? lightColor : C.bg, border: `2px solid ${val ? borderColor : C.border}`, borderRadius: 12, marginBottom: 12, cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ width: 20, height: 20, borderRadius: 6, background: val ? color : C.surface, border: `2px solid ${val ? color : C.borderStrong}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0, color: '#fff', marginTop: 2 }}>{val ? '✓' : ''}</div>
                <div>
                  <div style={{ fontFamily: 'Inter', color: C.text, fontSize: 14, fontWeight: 600 }}>{title}</div>
                  <div style={{ fontFamily: 'Inter', color: C.textMuted, fontSize: 12, marginTop: 3, lineHeight: 1.5 }}>{desc}</div>
                </div>
              </div>
            ))}

            {createWishlist && (
              <div style={{ background: C.purpleLight, border: `1px solid ${C.purpleBorder}`, borderRadius: 12, padding: 14, marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  {['new', 'existing'].map(m => (
                    <button key={m} onClick={() => setWishlistMode(m)} style={{ padding: '6px 14px', borderRadius: 8, fontFamily: 'Inter', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: wishlistMode === m ? C.purple : C.surface, border: `1px solid ${wishlistMode === m ? C.purple : C.border}`, color: wishlistMode === m ? '#fff' : C.textSecondary }}>
                      {m === 'new' ? '+ New Sheet' : 'Add to Existing'}
                    </button>
                  ))}
                </div>
                {wishlistMode === 'new'
                  ? <input value={wishlistName} onChange={e => setWishlistName(e.target.value)} placeholder="Sheet name e.g. April Outreach, Healthcare Batch..." style={{ ...inp }} />
                  : <select value={existingWishlist} onChange={e => setExistingWishlist(e.target.value)} style={{ ...inp }}>
                      <option value="">Select a sheet...</option>
                      {wishlists.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                }
              </div>
            )}

            <div style={{ padding: '10px 14px', background: C.warningLight, borderRadius: 10, border: `1px solid ${C.warningBorder}`, fontSize: 12, color: C.warning, fontFamily: 'Inter', marginTop: 14 }}>
              ⚠️ Deleting a vendor from <strong>any view</strong> removes it permanently from all views and the database.
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'space-between' }}>
              <button onClick={() => setStep(2)} style={{ padding: '10px 20px', borderRadius: 10, background: C.bg, border: `1px solid ${C.border}`, color: C.textSecondary, cursor: 'pointer', fontFamily: 'Inter' }}>← Back</button>
              <button onClick={() => { onImport({ vendors: parsed, addToAll, createWishlist, wishlistName: wishlistMode === 'new' ? wishlistName : '', existingWishlistId: wishlistMode === 'existing' ? existingWishlist : null }); onClose(); }} disabled={!addToAll && !createWishlist}
                style={{ padding: '10px 28px', borderRadius: 10, background: (!addToAll && !createWishlist) ? C.bg : C.primary, border: 'none', color: (!addToAll && !createWishlist) ? C.textMuted : '#fff', cursor: (!addToAll && !createWishlist) ? 'not-allowed' : 'pointer', fontFamily: 'Inter', fontWeight: 600 }}>
                Import {parsed.length} Vendors
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
  const inp = { display: 'block', width: '100%', marginTop: 4, padding: '9px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, fontFamily: 'Inter', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' };
  const lbl = { fontSize: 11, color: C.textMuted, fontFamily: 'Inter', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 32, width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontFamily: 'Syne', color: C.text, fontSize: 20, fontWeight: 700 }}>{vendor ? 'Edit Vendor' : 'Add New Vendor'}</h2>
          <button onClick={onClose} style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.textMuted, cursor: 'pointer', fontSize: 16, borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
              <label style={lbl}>{label}</label>
              <input value={form[key] || ''} onChange={e => f(key, e.target.value)} placeholder={placeholder} style={inp}
                onFocus={e => e.target.style.borderColor = C.primary}
                onBlur={e => e.target.style.borderColor = C.border} />
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginTop: 16 }}>
          {[
            { key: 'vendorType', label: 'Type', opts: ['', 'Normal', 'Prime'] },
            { key: 'emailSent', label: 'Email Sent?', opts: STATUS_OPTIONS },
            { key: 'followUp', label: 'Follow-Up?', opts: STATUS_OPTIONS },
            { key: 'callDone', label: 'Call Done?', opts: STATUS_OPTIONS }
          ].map(({ key, label, opts }) => (
            <div key={key}>
              <label style={lbl}>{label}</label>
              <select value={form[key] || ''} onChange={e => f(key, e.target.value)} style={{ ...inp, marginTop: 4 }}>
                {opts.map(o => <option key={o} value={o}>{o || '—'}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 24px', borderRadius: 10, background: C.bg, border: `1px solid ${C.border}`, color: C.textSecondary, cursor: 'pointer', fontFamily: 'Inter', fontWeight: 500 }}>Cancel</button>
          <button onClick={() => { if (!form.name || !form.company) { alert('Name and Company are required'); return; } onSave(form); }}
            style={{ padding: '10px 28px', borderRadius: 10, background: C.primary, border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'Inter', fontWeight: 600 }}>
            {vendor ? 'Save Changes' : 'Add Vendor'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── EMAIL TEMPLATES ──────────────────────────────────────────────
function EmailTemplatesPanel({ onClose }) {
  const [templates, setTemplates] = useState(() => lload('emailTemplates', [
    { id: 1, title: 'Initial Outreach', body: `Hi [Name],\n\nI hope you're doing well! I'm Alok, a GTM Automation Engineer specializing in outbound infrastructure and IT staffing. I came across your profile and wanted to reach out to explore potential collaboration opportunities.\n\nWould you be open to a quick 15-minute call this week?\n\nBest regards,\nAlok Kumar Singh` },
    { id: 2, title: 'Resume Follow-Up', body: `Hi [Name],\n\nFollowing up on the resume I shared for the [Role] position. Please let me know if you need any additional information.\n\nThanks,\nAlok` },
    { id: 3, title: 'Partnership Intro', body: `Hello [Name],\n\nI'm reaching out from ConsultAdd's IT Staffing division. We specialize in placing top IT talent and would love to explore a vendor partnership with [Company].\n\nBest,\nAlok Kumar Singh\nGTM Automation Engineer, ConsultAdd` },
  ]));
  const [editing, setEditing] = useState(null);
  const [copied, setCopied] = useState(null);
  const sv = t => { setTemplates(t); lsave('emailTemplates', t); };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 32, width: '100%', maxWidth: 660, maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontFamily: 'Syne', color: C.text, fontSize: 20, fontWeight: 700 }}>📧 Email Templates</h2>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { const t = { id: Date.now(), title: 'New Template', body: '' }; sv([...templates, t]); setEditing(t.id); }} style={{ padding: '8px 16px', borderRadius: 8, background: C.primary, border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'Inter', fontSize: 13, fontWeight: 600 }}>+ New</button>
            <button onClick={onClose} style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.textMuted, cursor: 'pointer', fontSize: 16, borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
          </div>
        </div>
        {templates.map(t => (
          <div key={t.id} style={{ background: C.bg, borderRadius: 14, padding: 20, marginBottom: 14, border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              {editing === t.id
                ? <input value={t.title} onChange={e => sv(templates.map(x => x.id === t.id ? { ...x, title: e.target.value } : x))} style={{ background: C.surface, border: `1px solid ${C.primary}`, borderRadius: 8, color: C.text, padding: '6px 10px', fontFamily: 'Syne', fontSize: 14, fontWeight: 700, outline: 'none' }} />
                : <h3 style={{ margin: 0, fontFamily: 'Syne', color: C.text, fontSize: 15, fontWeight: 700 }}>{t.title}</h3>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { navigator.clipboard.writeText(t.body); setCopied(t.id); setTimeout(() => setCopied(null), 2000); }} style={{ padding: '5px 14px', borderRadius: 8, background: copied === t.id ? C.successLight : C.surface, border: `1px solid ${copied === t.id ? C.successBorder : C.border}`, color: copied === t.id ? C.success : C.textSecondary, cursor: 'pointer', fontSize: 12, fontFamily: 'Inter', fontWeight: 500 }}>{copied === t.id ? '✓ Copied' : '📋 Copy'}</button>
                <button onClick={() => setEditing(editing === t.id ? null : t.id)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.textSecondary, cursor: 'pointer', padding: '5px 10px', fontSize: 12 }}>{editing === t.id ? '✓ Done' : '✏️ Edit'}</button>
                <button onClick={() => sv(templates.filter(x => x.id !== t.id))} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 16 }}>🗑️</button>
              </div>
            </div>
            {editing === t.id
              ? <textarea value={t.body} onChange={e => sv(templates.map(x => x.id === t.id ? { ...x, body: e.target.value } : x))} rows={7} style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, padding: 12, fontFamily: 'Inter', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', outline: 'none', lineHeight: 1.6 }} />
              : <pre style={{ margin: 0, fontFamily: 'Inter', fontSize: 12, color: C.textSecondary, whiteSpace: 'pre-wrap', lineHeight: 1.7, maxHeight: 90, overflow: 'hidden' }}>{t.body}</pre>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── THOUGHTS WIDGET ──────────────────────────────────────────────
function ThoughtsWidget() {
  const [text, setText] = useState(() => lload('thoughts', ''));
  const [saved, setSaved] = useState(false);
  const [min, setMin] = useState(false);
  const quotes = ["मेहनत कभी बेकार नहीं जाती 💪", "Every lead is an opportunity 🎯", "Build the pipeline, trust the process 🔥", "कड़ी मेहनत का फल मीठा होता है 🌟"];
  const [qi] = useState(() => Math.floor(Math.random() * quotes.length));
  return (
    <div style={{ background: C.purpleLight, border: `1px solid ${C.purpleBorder}`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: min ? 'none' : `1px solid ${C.purpleBorder}` }}>
        <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: C.purple }}>📝 Thoughts & Notes</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {!min && <button onClick={() => { lsave('thoughts', text); setSaved(true); setTimeout(() => setSaved(false), 2000); }} style={{ padding: '3px 10px', borderRadius: 6, background: saved ? C.successLight : C.purpleLight, border: `1px solid ${saved ? C.successBorder : C.purpleBorder}`, color: saved ? C.success : C.purple, cursor: 'pointer', fontSize: 11, fontFamily: 'Inter', fontWeight: 600 }}>{saved ? '✓ Saved' : 'Save'}</button>}
          <button onClick={() => setMin(!min)} style={{ background: 'none', border: 'none', color: C.purple, cursor: 'pointer', fontSize: 13 }}>{min ? '▼' : '▲'}</button>
        </div>
      </div>
      {!min && (
        <div style={{ padding: '12px 14px 14px' }}>
          <div style={{ fontSize: 11, color: C.purple, fontFamily: 'Inter', fontStyle: 'italic', marginBottom: 8, padding: '6px 10px', background: 'rgba(124,58,237,0.08)', borderRadius: 7, borderLeft: `3px solid ${C.purple}` }}>{quotes[qi]}</div>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder={"Write your thoughts... Hindi mein bhi! 🙏"} style={{ width: '100%', minHeight: 80, background: C.surface, border: `1px solid ${C.purpleBorder}`, borderRadius: 8, color: C.text, padding: '8px 10px', fontFamily: 'Inter', fontSize: 13, resize: 'vertical', outline: 'none', lineHeight: 1.6, boxSizing: 'border-box' }} />
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
  const [showTimestamps, setShowTimestamps] = useState(false);

  const primeCount = vendors.filter(v => v.vendor_type === 'Prime').length;
  const normalCount = vendors.filter(v => v.vendor_type === 'Normal').length;
  const withEmail = vendors.filter(v => v.email).length;
  const withPhone = vendors.filter(v => v.phone).length;

  const filtered = vendors.filter(v => {
    if (subView === 'prime' && v.vendor_type !== 'Prime') return false;
    if (subView === 'normal' && v.vendor_type !== 'Normal') return false;
    const q = search.toLowerCase();
    if (q && !`${v.name} ${v.company} ${v.email} ${v.title} ${v.phone} ${v.website} ${v.notes}`.toLowerCase().includes(q)) return false;
    if (advFilters.length) {
      const pass = advFilters.every(f => applyFilter(v, f));
      const passOr = advFilters.some(f => applyFilter(v, f));
      if (conjunction === 'AND' && !pass) return false;
      if (conjunction === 'OR' && !passOr) return false;
    }
    return true;
  }).sort((a, b) => {
    const av = (a[sortCol] || '').toString().toLowerCase();
    const bv = (b[sortCol] || '').toString().toLowerCase();
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const toggleSort = col => { if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortCol(col); setSortDir('asc'); } };
  const toggleSelect = id => { const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s); };
  const toggleAll = () => { if (selected.size === filtered.length && filtered.length > 0) setSelected(new Set()); else setSelected(new Set(filtered.map(v => v.id))); };

  const TH = ({ col, children, w }) => (
    <th onClick={col ? () => toggleSort(col) : undefined} style={{
      padding: '10px 12px', textAlign: 'left', fontSize: 11, fontFamily: 'Inter', fontWeight: 600,
      color: sortCol === col ? C.primary : C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5,
      cursor: col ? 'pointer' : 'default', background: C.bg, borderBottom: `1px solid ${C.border}`,
      whiteSpace: 'nowrap', userSelect: 'none', width: w,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {children}
        {col && sortCol === col && <span style={{ color: C.primary }}>{sortDir === 'asc' ? '↑' : '↓'}</span>}
      </div>
    </th>
  );

  return (
    <div>
      {/* SUB TABS + DATA BADGES */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          { key: 'all', label: 'All', count: vendors.length, color: C.primary },
          { key: 'prime', label: '⭐ Prime', count: primeCount, color: C.gold },
          { key: 'normal', label: '● Normal', count: normalCount, color: C.teal },
        ].map(({ key, label, count, color }) => (
          <button key={key} onClick={() => setSubView(key)} style={{
            padding: '6px 16px', borderRadius: 8, fontFamily: 'Inter', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.1s',
            background: subView === key ? color : C.surface,
            border: `1px solid ${subView === key ? color : C.border}`,
            color: subView === key ? '#fff' : C.textSecondary,
            boxShadow: subView === key ? `0 2px 8px ${color}30` : 'none',
          }}>
            {label} <span style={{ marginLeft: 6, background: subView === key ? 'rgba(255,255,255,0.25)' : C.bg, color: subView === key ? '#fff' : C.textMuted, borderRadius: 20, padding: '1px 7px', fontSize: 11 }}>{count}</span>
          </button>
        ))}

        <div style={{ display: 'flex', gap: 6, marginLeft: 4 }}>
          <span style={{ fontSize: 12, color: C.teal, fontFamily: 'Inter', padding: '4px 10px', background: C.tealLight, borderRadius: 20, border: `1px solid ${C.tealBorder}`, fontWeight: 500 }}>📧 {withEmail} emails</span>
          <span style={{ fontSize: 12, color: C.primary, fontFamily: 'Inter', padding: '4px 10px', background: C.primaryLight, borderRadius: 20, border: `1px solid ${C.primaryBorder}`, fontWeight: 500 }}>📞 {withPhone} phones</span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {canUndo && (
            <button onClick={onUndo} style={{ padding: '6px 14px', borderRadius: 8, background: C.warningLight, border: `1px solid ${C.warningBorder}`, color: C.warning, cursor: 'pointer', fontFamily: 'Inter', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
              <RotateCcw size={12} /> Undo Import
            </button>
          )}
          <button onClick={() => setShowTimestamps(!showTimestamps)} style={{ padding: '6px 12px', borderRadius: 8, background: showTimestamps ? C.primaryLight : C.surface, border: `1px solid ${showTimestamps ? C.primaryBorder : C.border}`, color: showTimestamps ? C.primary : C.textMuted, cursor: 'pointer', fontFamily: 'Inter', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={12} /> Timestamps
          </button>
          <button onClick={() => setShowFilters(!showFilters)} style={{ padding: '6px 14px', borderRadius: 8, background: (showFilters || advFilters.length > 0) ? C.primaryLight : C.surface, border: `1px solid ${(showFilters || advFilters.length > 0) ? C.primaryBorder : C.border}`, color: (showFilters || advFilters.length > 0) ? C.primary : C.textSecondary, cursor: 'pointer', fontFamily: 'Inter', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Filter size={12} /> Filters {advFilters.length > 0 && <span style={{ background: C.primary, color: '#fff', borderRadius: 10, padding: '0 6px', fontSize: 10 }}>{advFilters.length}</span>}
          </button>
        </div>
      </div>

      {/* ADVANCED FILTERS */}
      {showFilters && <AdvancedFilterPanel filters={advFilters} setFilters={setAdvFilters} conjunction={conjunction} setConjunction={setConjunction} onClose={() => setShowFilters(false)} />}

      {/* SEARCH + BULK */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.textMuted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, company, email, phone, title..." style={{ width: '100%', padding: '9px 14px 9px 36px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 13, fontFamily: 'Inter', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
            onFocus={e => e.target.style.borderColor = C.primary}
            onBlur={e => e.target.style.borderColor = C.border} />
        </div>
        <span style={{ fontSize: 12, color: C.textMuted, fontFamily: 'Inter', whiteSpace: 'nowrap' }}>{filtered.length} / {vendors.length}</span>
        {selected.size > 0 && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 12px', background: C.warningLight, borderRadius: 8, border: `1px solid ${C.warningBorder}` }}>
            <span style={{ fontSize: 12, color: C.warning, fontFamily: 'Inter', fontWeight: 600 }}>{selected.size} selected</span>
            {bulkDeleteConfirm
              ? <>
                  <button onClick={() => { onBulkDelete([...selected]); setSelected(new Set()); setBulkDeleteConfirm(false); }} style={{ padding: '5px 12px', borderRadius: 7, background: C.danger, border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'Inter', fontSize: 12, fontWeight: 600 }}>⚠ Confirm Delete</button>
                  <button onClick={() => setBulkDeleteConfirm(false)} style={{ padding: '5px 10px', borderRadius: 7, background: C.surface, border: `1px solid ${C.border}`, color: C.textSecondary, cursor: 'pointer', fontFamily: 'Inter', fontSize: 12 }}>Cancel</button>
                </>
              : <button onClick={() => setBulkDeleteConfirm(true)} style={{ padding: '5px 12px', borderRadius: 7, background: C.dangerLight, border: `1px solid ${C.dangerBorder}`, color: C.danger, cursor: 'pointer', fontFamily: 'Inter', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Trash2 size={11} /> Delete {selected.size}
                </button>
            }
            <button onClick={() => { setSelected(new Set()); setBulkDeleteConfirm(false); }} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer' }}><X size={14} /></button>
          </div>
        )}
      </div>

      {/* TABLE */}
      <div style={{ background: C.surface, borderRadius: 14, overflow: 'hidden', border: `1px solid ${C.border}`, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: showTimestamps ? 1350 : 1100 }}>
            <thead>
              <tr style={{ background: C.bg }}>
                <th style={{ padding: '10px 12px', background: C.bg, borderBottom: `1px solid ${C.border}`, width: 40 }}>
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} style={{ cursor: 'pointer', accentColor: C.primary }} />
                </th>
                <TH w={36}>#</TH>
                <TH col="name" w={160}>Name</TH>
                <TH col="company" w={150}>Company</TH>
                <TH col="title" w={150}>Title</TH>
                <TH col="email" w={190}>Email</TH>
                <TH col="phone" w={150}>Phone</TH>
                <TH col="vendor_type" w={100}>Type</TH>
                <TH col="email_sent" w={90}>Emailed</TH>
                <TH col="follow_up" w={90}>Follow-Up</TH>
                <TH col="call_done" w={90}>Called</TH>
                <TH col="resume_role" w={130}>Resume Role</TH>
                {showTimestamps && <TH col="created_at" w={130}>Created</TH>}
                {showTimestamps && <TH col="updated_at" w={130}>Updated</TH>}
                <TH w={80}>Actions</TH>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v, i) => {
                const isExp = expandedRow === v.id;
                const isSel = selected.has(v.id);
                const rowBg = isSel ? '#eff6ff' : i % 2 === 0 ? C.surface : '#fafafa';
                return (
                  <React.Fragment key={v.id}>
                    <tr style={{ background: rowBg, borderBottom: isExp ? 'none' : `1px solid ${C.border}`, transition: 'background 0.1s' }}
                      onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = C.surfaceHover; }}
                      onMouseLeave={e => { e.currentTarget.style.background = rowBg; }}>
                      <td style={{ padding: '10px 12px' }}><input type="checkbox" checked={isSel} onChange={() => toggleSelect(v.id)} style={{ cursor: 'pointer', accentColor: C.primary }} /></td>
                      <td style={{ padding: '10px 12px', color: C.textMuted, fontSize: 11, fontWeight: 600, fontFamily: 'Inter' }}>{i + 1}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 600, color: C.text, fontSize: 13, fontFamily: 'Inter' }}>{v.name}</div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 600, color: C.primary, fontSize: 13, fontFamily: 'Inter' }}>{v.company}</div>
                        {v.website && <a href={v.website.startsWith('http') ? v.website : `https://${v.website}`} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: C.teal, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}><Globe size={10} /> {v.website.replace('https://www.linkedin.com/in/', '').replace('https://', '').substring(0, 22)}</a>}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontSize: 12, color: C.textSecondary, fontFamily: 'Inter' }}>{v.title || <span style={{ color: C.textMuted }}>—</span>}</div>
                      </td>
                      {/* EMAIL COLUMN */}
                      <td style={{ padding: '10px 12px' }}>
                        {v.email
                          ? <a href={`mailto:${v.email}`} style={{ fontSize: 12, color: C.teal, fontFamily: 'Inter', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}><Mail size={11} /> {v.email}</a>
                          : <span style={{ fontSize: 12, color: C.textMuted, fontFamily: 'Inter' }}>—</span>
                        }
                      </td>
                      {/* PHONE COLUMN */}
                      <td style={{ padding: '10px 12px' }}>
                        {v.phone
                          ? <div style={{ fontSize: 12, color: C.textSecondary, fontFamily: 'Inter', display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={11} /> {v.phone}</div>
                          : <span style={{ fontSize: 12, color: C.textMuted, fontFamily: 'Inter' }}>—</span>
                        }
                      </td>
                      <td style={{ padding: '10px 12px' }}><Pill value={v.vendor_type || ''} onChange={val => onUpdate(v.id, 'vendorType', val)} options={['', 'Normal', 'Prime']} styleMap={TYPE_STYLE} small /></td>
                      <td style={{ padding: '10px 12px' }}><Pill value={v.email_sent || ''} onChange={val => onUpdate(v.id, 'emailSent', val)} options={STATUS_OPTIONS} styleMap={STATUS_STYLE} small /></td>
                      <td style={{ padding: '10px 12px' }}><Pill value={v.follow_up || ''} onChange={val => onUpdate(v.id, 'followUp', val)} options={STATUS_OPTIONS} styleMap={STATUS_STYLE} small /></td>
                      <td style={{ padding: '10px 12px' }}><Pill value={v.call_done || ''} onChange={val => onUpdate(v.id, 'callDone', val)} options={STATUS_OPTIONS} styleMap={STATUS_STYLE} small /></td>
                      <td style={{ padding: '10px 12px', maxWidth: 130 }}>
                        {editingCell === v.id
                          ? <input autoFocus defaultValue={v.resume_role} onBlur={e => { onUpdate(v.id, 'resumeRole', e.target.value); setEditingCell(null); }} onKeyDown={e => e.key === 'Enter' && e.target.blur()} style={{ width: '100%', background: C.surface, border: `1px solid ${C.primary}`, borderRadius: 6, color: C.text, padding: '4px 8px', fontSize: 12, fontFamily: 'Inter', outline: 'none', boxSizing: 'border-box' }} />
                          : <div onClick={() => setEditingCell(v.id)} style={{ fontSize: 12, color: v.resume_role ? C.purple : C.textMuted, cursor: 'pointer', fontFamily: 'Inter', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120, padding: '2px 4px', borderRadius: 4, border: '1px dashed transparent' }}
                              onMouseEnter={e => e.currentTarget.style.borderColor = C.border}
                              onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}>
                              {v.resume_role || <span style={{ color: C.textMuted }}>+ Add role</span>}
                            </div>
                        }
                      </td>
                      {/* TIMESTAMPS */}
                      {showTimestamps && (
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontSize: 11, color: C.textMuted, fontFamily: 'Inter' }} title={formatDate(v.created_at)}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={10} /> {timeAgo(v.created_at)}</div>
                          </div>
                        </td>
                      )}
                      {showTimestamps && (
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontSize: 11, color: C.textMuted, fontFamily: 'Inter' }} title={formatDate(v.updated_at)}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={10} /> {timeAgo(v.updated_at)}</div>
                          </div>
                        </td>
                      )}
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => setExpandedRow(isExp ? null : v.id)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, color: C.textMuted, cursor: 'pointer', padding: '3px 6px', fontSize: 10, display: 'flex', alignItems: 'center' }}>{isExp ? <ChevronUp size={11} /> : <ChevronDown size={11} />}</button>
                          <button onClick={() => onEdit(v)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, color: C.textMuted, cursor: 'pointer', padding: '3px 6px', display: 'flex', alignItems: 'center' }}><Edit2 size={11} /></button>
                          <button onClick={() => setDeleteConfirm(v.id)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: '3px 5px', display: 'flex', alignItems: 'center', borderRadius: 6 }}
                            onMouseEnter={e => { e.currentTarget.style.color = C.danger; e.currentTarget.style.background = C.dangerLight; }}
                            onMouseLeave={e => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.background = 'none'; }}>
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExp && (
                      <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                        <td colSpan={showTimestamps ? 15 : 13} style={{ padding: '12px 20px 16px 60px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div>
                              <div style={{ fontSize: 11, color: C.textMuted, fontFamily: 'Inter', fontWeight: 600, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>Notes</div>
                              <textarea value={v.notes || ''} onChange={e => onUpdate(v.id, 'notes', e.target.value)} placeholder="Add notes..." rows={3} style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, padding: '8px 10px', fontFamily: 'Inter', fontSize: 13, resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.5 }} />
                            </div>
                            <div style={{ fontSize: 12, color: C.textSecondary, fontFamily: 'Inter', lineHeight: 2 }}>
                              {v.website && <div><Globe size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} /><a href={v.website.startsWith('http') ? v.website : `https://${v.website}`} target="_blank" rel="noreferrer" style={{ color: C.primary }}>{v.website}</a></div>}
                              {v.created_at && <div><Calendar size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />Added: <span style={{ color: C.text, fontWeight: 500 }}>{formatDate(v.created_at)}</span></div>}
                              {v.updated_at && <div><Clock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />Updated: <span style={{ color: C.text, fontWeight: 500 }}>{formatDate(v.updated_at)}</span></div>}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    {deleteConfirm === v.id && (
                      <tr style={{ background: C.dangerLight }}>
                        <td colSpan={showTimestamps ? 15 : 13} style={{ padding: '10px 20px' }}>
                          <span style={{ color: C.danger, fontSize: 13, fontFamily: 'Inter' }}>Delete <strong>{v.name}</strong> permanently from all views? &nbsp;</span>
                          <button onClick={() => { onDelete(v.id); setDeleteConfirm(null); }} style={{ background: C.danger, border: 'none', color: '#fff', borderRadius: 7, padding: '5px 14px', cursor: 'pointer', fontFamily: 'Inter', fontSize: 12, fontWeight: 600, marginRight: 8 }}>Yes, Delete</button>
                          <button onClick={() => setDeleteConfirm(null)} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.textSecondary, borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontFamily: 'Inter', fontSize: 12 }}>Cancel</button>
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
          <div style={{ padding: 48, textAlign: 'center', color: C.textMuted, fontFamily: 'Inter', fontSize: 14 }}>
            {advFilters.length > 0
              ? <div><div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>No vendors match these filters.<br /><button onClick={() => setAdvFilters([])} style={{ marginTop: 12, padding: '7px 18px', borderRadius: 8, background: C.primaryLight, border: `1px solid ${C.primaryBorder}`, color: C.primary, cursor: 'pointer', fontFamily: 'Inter', fontSize: 13, fontWeight: 600 }}>Clear Filters</button></div>
              : subView !== 'all' ? `Use the Type dropdown to tag vendors as ${subView === 'prime' ? 'Prime ⭐' : 'Normal'}` : 'No vendors found'
            }
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

  const showToast = (msg, type = 'success') => {
    const colors = { success: C.success, danger: C.danger, warning: C.warning, info: C.primary };
    setToast({ msg, color: colors[type] || C.primary });
    setTimeout(() => setToast(null), 3500);
  };

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
      } else setVendors(vData || []);
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
      showToast('Vendor added successfully');
    } else {
      await supabase.from('vendors').update(dbForm).eq('id', editingVendor.id);
      setVendors(v => v.map(x => x.id === editingVendor.id ? { ...x, ...dbForm } : x));
      showToast('Vendor updated');
    }
    setSyncing(false); setEditingVendor(null); setModal(null);
  };

  const deleteVendor = async (id) => {
    await supabase.from('vendors').delete().eq('id', id);
    setVendors(v => v.filter(x => x.id !== id));
    showToast('Vendor deleted from all views', 'warning');
  };

  const bulkDelete = async (ids) => {
    setSyncing(true);
    await supabase.from('vendors').delete().in('id', ids);
    setVendors(v => v.filter(x => !ids.includes(x.id)));
    setSyncing(false);
    showToast(`${ids.length} vendors deleted from all views`, 'danger');
  };

  const handleCSVImport = async ({ vendors: csvVendors, addToAll, createWishlist, wishlistName, existingWishlistId }) => {
    setSyncing(true);
    const { data: inserted } = await supabase.from('vendors').insert(csvVendors).select();
    const ids = (inserted || []).map(d => d.id);
    setVendors(v => [...v, ...(inserted || [])]);
    setLastImportIds(ids);
    if (createWishlist && ids.length > 0) {
      let wlId = existingWishlistId ? parseInt(existingWishlistId) : null;
      if (!wlId && wishlistName) {
        const { data: wl } = await supabase.from('wishlists').insert([{ name: wishlistName }]).select();
        if (wl) { wlId = wl[0].id; setWishlists(w => [...w, wl[0]]); }
      }
      if (wlId) {
        await supabase.from('wishlist_vendors').insert(ids.map(vid => ({ wishlist_id: wlId, vendor_id: vid })));
        setWishlistVendors(p => ({ ...p, [wlId]: [...(p[wlId] || []), ...ids] }));
        setActiveView(wlId.toString());
      }
    }
    setSyncing(false);
    showToast(`Imported ${ids.length} vendors successfully`);
  };

  const handleUndo = async () => {
    if (!lastImportIds.length) return;
    if (!window.confirm(`Undo last import? This will permanently delete ${lastImportIds.length} vendors.`)) return;
    await bulkDelete(lastImportIds);
    setLastImportIds([]);
    showToast('Last import undone', 'warning');
  };

  const deleteWishlist = async (id) => {
    await supabase.from('wishlists').delete().eq('id', id);
    setWishlists(w => w.filter(x => x.id !== id));
    if (activeView === id.toString()) setActiveView('all');
    setDeleteWishlistConfirm(null);
    showToast('Wishlist deleted. Vendors kept in All Vendors.', 'info');
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
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: `3px solid ${C.primaryBorder}`, borderTop: `3px solid ${C.primary}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <div style={{ fontFamily: 'Syne', color: C.primary, fontSize: 16, fontWeight: 600, fontStyle: 'italic' }}>Vincit qui se vincit</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Inter, sans-serif' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}*{box-sizing:border-box}::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:${C.bg}}::-webkit-scrollbar-thumb{background:${C.borderStrong};border-radius:3px}`}</style>

      {/* TOAST */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: C.surface, border: `1px solid ${C.border}`, borderLeft: `4px solid ${toast.color}`, borderRadius: 10, padding: '12px 20px', color: C.text, fontFamily: 'Inter', fontSize: 13, fontWeight: 500, zIndex: 9999, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', animation: 'slideUp 0.3s ease', maxWidth: 320 }}>
          {toast.msg}
        </div>
      )}

      {/* HEADER */}
      <div style={{ background: C.sidebar, borderBottom: `1px solid rgba(255,255,255,0.05)`, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1800, margin: '0 auto', padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div>
              <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: '#fff', fontStyle: 'italic', letterSpacing: '-0.3px' }}>
                <span style={{ color: '#60a5fa' }}>Vincit</span> qui se vincit
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                IT Staffing · ConsultAdd {syncing ? <span style={{ color: '#fbbf24' }}>· syncing...</span> : <span style={{ color: '#4ade80' }}>· live</span>}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setShowCSV(true)} style={{ padding: '7px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer', fontFamily: 'Inter', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}><Upload size={13} /> Import CSV</button>
            <button onClick={() => setShowEmail(true)} style={{ padding: '7px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer', fontFamily: 'Inter', fontSize: 13, fontWeight: 500 }}>📧 Templates</button>
            <button onClick={() => { setEditingVendor(null); setModal('add'); }} style={{ padding: '7px 20px', borderRadius: 8, background: C.primary, border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'Inter', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={14} /> Add Vendor</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1800, margin: '0 auto', padding: '24px 28px', display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, alignItems: 'start' }}>

        {/* SIDEBAR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, position: 'sticky', top: 84 }}>

          {/* STATS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
            {[
              { label: 'Total Vendors', value: total, icon: '🏢', color: C.primary },
              { label: 'Prime Vendors', value: primeCount, icon: '⭐', color: C.gold, sub: `${Math.round(primeCount/total*100)||0}%` },
              { label: 'Wishlists', value: wishlists.length, icon: '📋', color: C.purple },
              { label: 'Have Email', value: withEmail, icon: '📧', color: C.teal, sub: `${Math.round(withEmail/total*100)||0}%` },
              { label: 'Emailed', value: emailsSent, icon: '✅', color: C.success },
            ].map(s => (
              <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <span style={{ fontSize: 18 }}>{s.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: s.color, fontFamily: 'Syne', lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{s.label}</div>
                </div>
                {s.sub && <span style={{ fontSize: 11, color: C.textMuted, background: C.bg, borderRadius: 20, padding: '2px 7px', border: `1px solid ${C.border}` }}>{s.sub}</span>}
              </div>
            ))}
          </div>

          {/* VIEWS */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '10px 14px', fontSize: 10, color: C.textMuted, fontFamily: 'Inter', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `1px solid ${C.border}`, background: C.bg }}>Views</div>
            <button onClick={() => setActiveView('all')} style={{ display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left', background: activeView === 'all' ? C.primaryLight : 'transparent', border: 'none', borderBottom: `1px solid ${C.border}`, color: activeView === 'all' ? C.primary : C.textSecondary, fontFamily: 'Inter', fontSize: 13, fontWeight: activeView === 'all' ? 600 : 400, cursor: 'pointer' }}>
              🌐 All Vendors <span style={{ float: 'right', fontSize: 11, color: activeView === 'all' ? C.primary : C.textMuted, fontWeight: 600 }}>{total}</span>
            </button>
          </div>

          {/* WISHLISTS */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '10px 14px', fontSize: 10, color: C.textMuted, fontFamily: 'Inter', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `1px solid ${C.border}`, background: C.bg, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Wishlists
              <button onClick={() => setShowCSV(true)} style={{ background: C.primaryLight, border: `1px solid ${C.primaryBorder}`, color: C.primary, cursor: 'pointer', borderRadius: 6, padding: '2px 8px', fontSize: 14, fontWeight: 700, lineHeight: 1 }}>+</button>
            </div>
            {wishlists.length === 0 && <div style={{ padding: '12px 14px', fontSize: 12, color: C.textMuted, fontFamily: 'Inter', lineHeight: 1.6 }}>No wishlists yet.<br /><span style={{ color: C.primary, cursor: 'pointer', fontWeight: 500 }} onClick={() => setShowCSV(true)}>Import CSV to create one →</span></div>}
            {wishlists.map(w => {
              const isActive = activeView === w.id.toString();
              const count = (wishlistVendors[w.id] || []).length;
              return (
                <div key={w.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  {renamingWishlist === w.id
                    ? <input autoFocus defaultValue={w.name} onBlur={e => renameWishlist(w.id, e.target.value)} onKeyDown={e => e.key === 'Enter' && renameWishlist(w.id, e.target.value)} style={{ width: '100%', padding: '10px 14px', background: C.primaryLight, border: 'none', color: C.text, fontFamily: 'Inter', fontSize: 13, outline: 'none', boxSizing: 'border-box', borderBottom: `1px solid ${C.primaryBorder}` }} />
                    : <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button onClick={() => setActiveView(w.id.toString())} style={{ flex: 1, padding: '10px 14px', textAlign: 'left', background: isActive ? C.primaryLight : 'transparent', border: 'none', color: isActive ? C.primary : C.textSecondary, fontFamily: 'Inter', fontSize: 13, fontWeight: isActive ? 600 : 400, cursor: 'pointer' }}>
                          📋 {w.name.length > 15 ? w.name.substring(0, 15) + '…' : w.name}
                          <span style={{ float: 'right', fontSize: 11, color: isActive ? C.primary : C.textMuted, fontWeight: 600 }}>{count}</span>
                        </button>
                        <div style={{ paddingRight: 8, display: 'flex', gap: 2 }}>
                          <button onClick={() => setRenamingWishlist(w.id)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 11, padding: '3px 4px', borderRadius: 4 }} onMouseEnter={e => e.currentTarget.style.color = C.primary} onMouseLeave={e => e.currentTarget.style.color = C.textMuted}><Edit2 size={11} /></button>
                          <button onClick={() => setDeleteWishlistConfirm(w.id)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 11, padding: '3px 4px', borderRadius: 4 }} onMouseEnter={e => e.currentTarget.style.color = C.danger} onMouseLeave={e => e.currentTarget.style.color = C.textMuted}><Trash2 size={11} /></button>
                        </div>
                      </div>
                  }
                  {deleteWishlistConfirm === w.id && (
                    <div style={{ padding: '10px 14px', background: C.dangerLight, borderTop: `1px solid ${C.dangerBorder}` }}>
                      <div style={{ fontSize: 12, color: C.danger, fontFamily: 'Inter', marginBottom: 8, fontWeight: 500 }}>Delete "{w.name}" sheet?<br /><span style={{ color: C.textMuted, fontWeight: 400 }}>Vendors stay in All Vendors</span></div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => deleteWishlist(w.id)} style={{ padding: '4px 12px', background: C.danger, border: 'none', color: '#fff', borderRadius: 6, cursor: 'pointer', fontFamily: 'Inter', fontSize: 12, fontWeight: 600 }}>Delete Sheet</button>
                        <button onClick={() => setDeleteWishlistConfirm(null)} style={{ padding: '4px 10px', background: C.surface, border: `1px solid ${C.border}`, color: C.textSecondary, borderRadius: 6, cursor: 'pointer', fontFamily: 'Inter', fontSize: 12 }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <button onClick={() => setShowCSV(true)} style={{ display: 'block', width: '100%', padding: '9px 14px', textAlign: 'left', background: 'transparent', border: 'none', color: C.primary, fontFamily: 'Inter', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>+ Import CSV → New Wishlist</button>
          </div>

          {/* THOUGHTS */}
          <ThoughtsWidget />

          {/* ACTIONS */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '10px 14px', fontSize: 10, color: C.textMuted, fontFamily: 'Inter', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `1px solid ${C.border}`, background: C.bg }}>Actions</div>
            {[
              { label: '📤 Import CSV', action: () => setShowCSV(true), color: C.primary },
              { label: '📧 Email Templates', action: () => setShowEmail(true), color: C.textSecondary },
              { label: '💾 Export Backup', action: () => { const b = new Blob([JSON.stringify(vendors, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'vendors_backup.json'; a.click(); }, color: C.textSecondary },
            ].map(({ label, action, color }) => (
              <button key={label} onClick={action} style={{ display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: `1px solid ${C.border}`, color, fontFamily: 'Inter', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = C.surfaceHover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontFamily: 'Syne', fontSize: 20, color: C.text, fontWeight: 700 }}>
              {activeView === 'all' ? '🌐 All Vendors' : `📋 ${wishlists.find(w => w.id.toString() === activeView)?.name || 'Wishlist'}`}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: C.textMuted, fontFamily: 'Inter' }}>
              {currentVendors.length} vendors · Email & Phone in separate columns · Deletions apply to all views
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

      {(modal === 'add' || modal === 'edit') && <VendorModal vendor={modal === 'edit' ? editingVendor : null} onSave={saveVendor} onClose={() => { setModal(null); setEditingVendor(null); }} />}
      {showEmail && <EmailTemplatesPanel onClose={() => setShowEmail(false)} />}
      {showCSV && <CSVModal onClose={() => setShowCSV(false)} onImport={handleCSVImport} wishlists={wishlists} />}
    </div>
  );
}
