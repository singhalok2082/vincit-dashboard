import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from './supabase';
import { ALL_VENDORS } from './data';
import { Search, Upload, Trash2, Filter, RotateCcw, X, Plus, ChevronDown, ChevronUp, Edit2, Clock, Calendar, GripVertical, Tag } from 'lucide-react';

const lload = (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const lsave = (k, val) => { try { localStorage.setItem(k, JSON.stringify(val)); } catch {} };

function useDebounce(value, delay) {
  const [dv, setDv] = useState(value);
  useEffect(() => { const t = setTimeout(() => setDv(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return dv;
}

const C = {
  bg: '#f8fafc', surface: '#ffffff', surfaceHover: '#f1f5f9',
  border: '#e2e8f0', borderStrong: '#cbd5e1',
  text: '#0f172a', textSecondary: '#475569', textMuted: '#94a3b8',
  primary: '#2563eb', primaryLight: '#eff6ff', primaryBorder: '#bfdbfe',
  success: '#16a34a', successLight: '#f0fdf4', successBorder: '#bbf7d0',
  warning: '#d97706', warningLight: '#fffbeb', warningBorder: '#fde68a',
  danger: '#dc2626', dangerLight: '#fef2f2', dangerBorder: '#fecaca',
  purple: '#7c3aed', purpleLight: '#f5f3ff', purpleBorder: '#ddd6fe',
  teal: '#0891b2', tealLight: '#ecfeff', tealBorder: '#a5f3fc',
  gold: '#b45309', goldLight: '#fffbeb', goldBorder: '#fde68a',
  core: '#059669', coreLight: '#ecfdf5', coreBorder: '#6ee7b7',
  sidebar: '#1e293b', sidebarBorder: 'rgba(255,255,255,0.08)',
};

function formatDate(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  const day = String(d.getDate()).padStart(2, '0');
  const mon = d.toLocaleString('en', { month: 'short' });
  const yr = d.getFullYear();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${mon} ${yr}, ${h}:${m}`;
}

const STATUS_OPTIONS = ['', 'Yes', 'No', 'Pending'];
const STATUS_STYLE = {
  Yes:     { bg: C.successLight, text: C.success, border: C.successBorder, label: 'Yes' },
  No:      { bg: C.dangerLight,  text: C.danger,  border: C.dangerBorder,  label: 'No' },
  Pending: { bg: C.warningLight, text: C.warning, border: C.warningBorder, label: 'Pending' },
  '':      { bg: C.bg, text: C.textMuted, border: C.border, label: '—' },
};
const TYPE_STYLE = {
  Prime:  { bg: C.goldLight,    text: C.gold,    border: C.goldBorder,    label: '⭐ Prime' },
  Normal: { bg: C.primaryLight, text: C.primary, border: C.primaryBorder, label: '● Normal' },
  Core:   { bg: C.coreLight,    text: C.core,    border: C.coreBorder,    label: '🏠 Core' },
  '':     { bg: C.bg, text: C.textMuted, border: C.border, label: '○ —' },
};

function Pill({ value, onChange, options, styleMap }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const s = styleMap[value] || styleMap[''];
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => setOpen(!open)} style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}`, borderRadius: 6, padding: '3px 9px', fontSize: 12, fontFamily: 'Inter', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
        {s.label} <ChevronDown size={9} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 9999, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', minWidth: 120, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
          {options.map(opt => { const st = styleMap[opt] || styleMap[''];
            return <button key={opt} onClick={() => { onChange(opt); setOpen(false); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', background: 'transparent', border: 'none', color: st.text, fontSize: 13, fontFamily: 'Inter', fontWeight: 500, cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = C.surfaceHover}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{st.label}</button>;
          })}
        </div>
      )}
    </div>
  );
}

// ─── BULK TAG BAR ────────────────────────────────────────────────
function BulkTagBar({ count, filteredCount, allFilteredSelected, onSelectAllFiltered, onClear, onBulkDelete, onBulkTag }) {
  const [showTag, setShowTag] = useState(false);
  const [field, setField] = useState('vendor_type');
  const [value, setValue] = useState('Prime');
  const [delConfirm, setDelConfirm] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setShowTag(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  const FIELDS = [
    { key: 'vendor_type', label: 'Vendor Type', opts: ['', 'Normal', 'Prime', 'Core'] },
    { key: 'email_sent',  label: 'Email Sent',  opts: ['', 'Yes', 'No', 'Pending'] },
    { key: 'follow_up',   label: 'Follow-Up',   opts: ['', 'Yes', 'No', 'Pending'] },
    { key: 'call_done',   label: 'Call Done',   opts: ['', 'Yes', 'No', 'Pending'] },
  ];
  const selField = FIELDS.find(f => f.key === field);
  const inp = { padding: '7px 10px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, fontFamily: 'Inter', outline: 'none' };

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 16px', background: C.warningLight, border: `1px solid ${C.warningBorder}`, borderRadius: 12, flexWrap: 'wrap', marginBottom: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 14, color: C.warning, fontFamily: 'Inter', fontWeight: 700 }}>{count} rows selected</span>
        {filteredCount > count && (
          <button onClick={onSelectAllFiltered} style={{ fontSize: 12, color: C.primary, fontFamily: 'Inter', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, textDecoration: 'underline' }}>
            {allFilteredSelected ? '✓ All filtered selected' : `Select all ${filteredCount} filtered rows`}
          </button>
        )}
      </div>

      {/* BULK TAG */}
      <div ref={ref} style={{ position: 'relative' }}>
        <button onClick={() => setShowTag(!showTag)} style={{ padding: '7px 14px', borderRadius: 8, background: C.primaryLight, border: `1px solid ${C.primaryBorder}`, color: C.primary, cursor: 'pointer', fontFamily: 'Inter', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
          <Tag size={13} /> Bulk Tag <ChevronDown size={11} />
        </button>
        {showTag && (
          <div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 9999, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, minWidth: 280, boxShadow: '0 12px 40px rgba(0,0,0,0.12)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: 'Inter', marginBottom: 12 }}>Set field for {count} vendors</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: C.textMuted, fontFamily: 'Inter', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Field</label>
                <select value={field} onChange={e => { setField(e.target.value); setValue(''); }} style={{ ...inp, width: '100%' }}>
                  {FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.textMuted, fontFamily: 'Inter', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Value</label>
                <select value={value} onChange={e => setValue(e.target.value)} style={{ ...inp, width: '100%' }}>
                  {(selField?.opts || []).map(o => <option key={o} value={o}>{o || '(clear)'}</option>)}
                </select>
              </div>
              <button onClick={() => { onBulkTag(field, value); setShowTag(false); }}
                style={{ padding: '9px', borderRadius: 8, background: C.primary, border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'Inter', fontSize: 13, fontWeight: 600 }}>
                Apply to {count} vendors ✓
              </button>
            </div>
          </div>
        )}
      </div>

      {/* BULK DELETE */}
      {delConfirm
        ? <><span style={{ fontSize: 13, color: C.danger, fontFamily: 'Inter', fontWeight: 600 }}>Delete {count} permanently?</span>
            <button onClick={() => { onBulkDelete(); setDelConfirm(false); }} style={{ padding: '7px 14px', borderRadius: 8, background: C.danger, border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'Inter', fontSize: 13, fontWeight: 600 }}>Confirm</button>
            <button onClick={() => setDelConfirm(false)} style={{ padding: '7px 12px', borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, color: C.textSecondary, cursor: 'pointer', fontFamily: 'Inter', fontSize: 13 }}>Cancel</button>
          </>
        : <button onClick={() => setDelConfirm(true)} style={{ padding: '7px 14px', borderRadius: 8, background: C.dangerLight, border: `1px solid ${C.dangerBorder}`, color: C.danger, cursor: 'pointer', fontFamily: 'Inter', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Trash2 size={13} /> Delete
          </button>
      }
      <button onClick={onClear} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: 4 }}><X size={15} /></button>
    </div>
  );
}

// ─── ADVANCED FILTER PANEL ───────────────────────────────────────
const FILTER_FIELDS = [
  { key: 'name', label: 'Name', type: 'text' }, { key: 'company', label: 'Company', type: 'text' },
  { key: 'title', label: 'Title', type: 'text' }, { key: 'email', label: 'Email', type: 'text' },
  { key: 'phone', label: 'Phone', type: 'text' }, { key: 'website', label: 'Website', type: 'text' },
  { key: 'vendor_type', label: 'Vendor Type', type: 'select', options: ['', 'Normal', 'Prime', 'Core'] },
  { key: 'email_sent', label: 'Email Sent', type: 'select', options: STATUS_OPTIONS },
  { key: 'follow_up', label: 'Follow-Up', type: 'select', options: STATUS_OPTIONS },
  { key: 'call_done', label: 'Call Done', type: 'select', options: STATUS_OPTIONS },
];
const TEXT_OPS = [
  { key: 'contains', label: 'contains' }, { key: 'not_contains', label: 'does not contain' },
  { key: 'equals', label: 'equals' }, { key: 'not_equals', label: 'is not' },
  { key: 'is_empty', label: 'is empty' }, { key: 'is_not_empty', label: 'is not empty' },
  { key: 'starts_with', label: 'starts with' },
];
const SELECT_OPS = [
  { key: 'equals', label: 'is' }, { key: 'not_equals', label: 'is not' },
  { key: 'is_empty', label: 'is empty' }, { key: 'is_not_empty', label: 'is not empty' },
];

function applyFilter(v, f) {
  const raw = (v[f.field] || '').toLowerCase().trim(), fv = (f.value || '').toLowerCase().trim();
  switch (f.op) {
    case 'contains': return raw.includes(fv); case 'not_contains': return !raw.includes(fv);
    case 'equals': return raw === fv; case 'not_equals': return raw !== fv;
    case 'is_empty': return raw === ''; case 'is_not_empty': return raw !== '';
    case 'starts_with': return raw.startsWith(fv); default: return true;
  }
}

function AdvancedFilterPanel({ filters, setFilters, conjunction, setConjunction, onClose }) {
  const add = () => setFilters(f => [...f, { id: Date.now(), field: 'email', op: 'is_not_empty', value: '' }]);
  const remove = id => setFilters(f => f.filter(x => x.id !== id));
  const upd = (id, k, v) => setFilters(f => f.map(x => x.id === id ? { ...x, [k]: v } : x));
  const s = { padding: '7px 10px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, fontFamily: 'Inter', outline: 'none' };
  const PRESETS = [
    { label: 'No Email', f: [{ field: 'email', op: 'is_empty', value: '' }] },
    { label: 'No Phone', f: [{ field: 'phone', op: 'is_empty', value: '' }] },
    { label: 'Missing Both', f: [{ field: 'email', op: 'is_empty', value: '' }, { field: 'phone', op: 'is_empty', value: '' }], c: 'AND' },
    { label: 'Has Phone', f: [{ field: 'phone', op: 'is_not_empty', value: '' }] },
    { label: 'Core Vendors', f: [{ field: 'vendor_type', op: 'equals', value: 'Core' }] },
    { label: 'Prime Only', f: [{ field: 'vendor_type', op: 'equals', value: 'Prime' }] },
    { label: 'Emailed', f: [{ field: 'email_sent', op: 'equals', value: 'Yes' }] },
    { label: 'Not Contacted', f: [{ field: 'email_sent', op: 'is_empty', value: '' }, { field: 'call_done', op: 'is_empty', value: '' }], c: 'AND' },
    { label: 'CSV Imports', f: [{ field: 'vendor_type', op: 'not_equals', value: 'Core' }] },
  ];
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'Inter', fontSize: 14, color: C.text, fontWeight: 700 }}>Advanced Filters</span>
          <span style={{ fontSize: 13, color: C.textMuted }}>Match</span>
          <select value={conjunction} onChange={e => setConjunction(e.target.value)} style={{ ...s, padding: '5px 8px', fontWeight: 600 }}>
            <option value="AND">ALL (AND)</option><option value="OR">ANY (OR)</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={add} style={{ padding: '6px 14px', borderRadius: 8, background: C.primaryLight, border: `1px solid ${C.primaryBorder}`, color: C.primary, cursor: 'pointer', fontFamily: 'Inter', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}><Plus size={13} /> Add Filter</button>
          <button onClick={() => setFilters([])} style={{ padding: '6px 12px', borderRadius: 8, background: C.dangerLight, border: `1px solid ${C.dangerBorder}`, color: C.danger, cursor: 'pointer', fontFamily: 'Inter', fontSize: 13 }}>Clear All</button>
          <button onClick={onClose} style={{ background: 'none', border: `1px solid ${C.border}`, color: C.textMuted, cursor: 'pointer', borderRadius: 8, padding: '6px 8px', display: 'flex' }}><X size={13} /></button>
        </div>
      </div>
      {filters.length === 0 && <div style={{ padding: '8px 0 6px', color: C.textMuted, fontFamily: 'Inter', fontSize: 13 }}>No filters active. Use a preset or add a filter.</div>}
      {filters.map((f, i) => {
        const fd = FILTER_FIELDS.find(x => x.key === f.field) || FILTER_FIELDS[0];
        const ops = fd.type === 'select' ? SELECT_OPS : TEXT_OPS;
        const needsVal = !['is_empty', 'is_not_empty'].includes(f.op);
        return (
          <div key={f.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, padding: '10px 14px', background: C.bg, borderRadius: 10, border: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 13, color: C.textMuted, fontFamily: 'Inter', minWidth: 42, fontWeight: 600 }}>{i === 0 ? 'Where' : conjunction}</span>
            <select value={f.field} onChange={e => upd(f.id, 'field', e.target.value)} style={{ ...s, minWidth: 130 }}>{FILTER_FIELDS.map(ff => <option key={ff.key} value={ff.key}>{ff.label}</option>)}</select>
            <select value={f.op} onChange={e => upd(f.id, 'op', e.target.value)} style={{ ...s, minWidth: 160 }}>{ops.map(op => <option key={op.key} value={op.key}>{op.label}</option>)}</select>
            {needsVal && (fd.type === 'select'
              ? <select value={f.value} onChange={e => upd(f.id, 'value', e.target.value)} style={{ ...s, minWidth: 120 }}>{(fd.options || []).map(o => <option key={o} value={o}>{o || '(empty)'}</option>)}</select>
              : <input value={f.value || ''} onChange={e => upd(f.id, 'value', e.target.value)} placeholder="value..." style={{ ...s, flex: 1, minWidth: 120 }} />)}
            {!needsVal && <div style={{ flex: 1 }} />}
            <button onClick={() => remove(f.id)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: 4, display: 'flex', borderRadius: 6 }}
              onMouseEnter={e => e.currentTarget.style.color = C.danger} onMouseLeave={e => e.currentTarget.style.color = C.textMuted}><X size={14} /></button>
          </div>
        );
      })}
      <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 11, color: C.textMuted, fontFamily: 'Inter', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Quick Presets</div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => { setFilters(p.f.map((fi, i) => ({ ...fi, id: Date.now() + i }))); if (p.c) setConjunction(p.c); }}
              style={{ padding: '5px 12px', borderRadius: 20, background: C.surface, border: `1px solid ${C.border}`, color: C.textSecondary, cursor: 'pointer', fontFamily: 'Inter', fontSize: 12, transition: 'all 0.1s' }}
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
  for (const ch of row) { if (ch === '"') { inQ = !inQ; } else if (ch === ',' && !inQ) { res.push(cur.trim()); cur = ''; } else cur += ch; }
  res.push(cur.trim()); return res;
}
function smartParseCSV(text) {
  const lines = text.trim().split('\n').filter(l => l.trim());
  const hdrs = parseCSVRow(lines[0]).map(h => h.replace(/"/g, '').trim().toLowerCase());
  const colMap = {
    name: ['full name', 'name', 'contact name', 'full_name'], first: ['first name', 'first_name', 'firstname'], last: ['last name', 'last_name', 'lastname'],
    title: ['job title', 'title', 'position', 'role', 'job_title'], company: ['company name', 'company', 'organization', 'firm', 'company_name', 'account'],
    email: ['contact email address - data', 'email', 'email address', 'contact email', 'email_address', 'work email'],
    phone: ['contact phone number - data', 'phone', 'phone number', 'mobile', 'phone_number', 'contact phone'],
    website: ['company domain', 'website', 'url', 'domain', 'web', 'linkedin profile', 'linkedin'],
    location: ['location', 'city', 'state', 'country', 'geography'], notes: ['notes', 'note', 'comments'],
  };
  const fc = vs => { for (const v of vs) { const i = hdrs.indexOf(v); if (i !== -1) return i; } return -1; };
  const cols = {}; for (const [f, v] of Object.entries(colMap)) cols[f] = fc(v);
  const get = (row, f) => cols[f] !== -1 ? (row[cols[f]] || '').replace(/"/g, '').trim() : '';
  return lines.slice(1).map(line => {
    const row = parseCSVRow(line);
    let name = get(row, 'name') || [get(row, 'first'), get(row, 'last')].filter(Boolean).join(' ');
    const company = get(row, 'company'); if (!name && !company) return null;
    const location = get(row, 'location');
    const notes = [get(row, 'notes'), location].filter(Boolean).join(' | ');
    return { name: name || company, title: get(row, 'title'), company: company || name, email: get(row, 'email'), phone: get(row, 'phone'), website: get(row, 'website'), notes, vendor_type: '', email_sent: '', follow_up: '', call_done: '', resume_role: '' };
  }).filter(Boolean);
}

// ─── CSV MODAL ───────────────────────────────────────────────────
function CSVModal({ onClose, onImport, wishlists }) {
  const [step, setStep] = useState(1); const [parsed, setParsed] = useState([]); const [fileName, setFileName] = useState('');
  const [addToAll, setAddToAll] = useState(true); const [createWishlist, setCreateWishlist] = useState(true);
  const [wishlistName, setWishlistName] = useState(''); const [wishlistMode, setWishlistMode] = useState('new'); const [existingWishlist, setExistingWishlist] = useState('');
  const fileRef = useRef(null);
  const handleFile = e => {
    const file = e.target.files[0]; if (!file) return;
    setFileName(file.name); setWishlistName(file.name.replace('.csv', '').replace(/_/g, ' '));
    const reader = new FileReader(); reader.onload = ev => { setParsed(smartParseCSV(ev.target.result)); setStep(2); }; reader.readAsText(file);
  };
  const inp = { padding: '9px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, fontFamily: 'Inter', outline: 'none', width: '100%', boxSizing: 'border-box' };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 32, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontFamily: 'Inter', color: C.text, fontSize: 20, fontWeight: 700 }}>Import CSV</h2>
          <button onClick={onClose} style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.textMuted, cursor: 'pointer', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {['Upload', 'Preview', 'Options'].map((s, i) => (
            <div key={s} style={{ flex: 1, padding: '7px 0', textAlign: 'center', borderRadius: 8, fontSize: 13, fontFamily: 'Inter', fontWeight: 600, background: step === i+1 ? C.primaryLight : C.bg, border: `1px solid ${step === i+1 ? C.primaryBorder : C.border}`, color: step === i+1 ? C.primary : step > i+1 ? C.success : C.textMuted }}>{step > i+1 ? '✓ ' : `${i+1}. `}{s}</div>
          ))}
        </div>
        {step === 1 && (
          <div>
            <div onClick={() => fileRef.current.click()} style={{ border: `2px dashed ${C.border}`, borderRadius: 14, padding: 48, textAlign: 'center', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.background = C.primaryLight; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = 'transparent'; }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📄</div>
              <div style={{ fontFamily: 'Inter', color: C.text, fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Click to browse CSV</div>
              <div style={{ fontFamily: 'Inter', color: C.textMuted, fontSize: 13 }}>Auto-detects: Name, Company, Email, Phone, Title, LinkedIn</div>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />
            </div>
          </div>
        )}
        {step === 2 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontFamily: 'Inter', color: C.textSecondary, fontSize: 13 }}>
                <span style={{ color: C.primary, fontWeight: 600 }}>{parsed.length}</span> vendors · <span style={{ color: C.success }}>{parsed.filter(v => v.email).length} with email</span> · <span style={{ color: C.teal }}>{parsed.filter(v => v.phone).length} with phone</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setStep(1)} style={{ padding: '7px 14px', borderRadius: 8, background: C.bg, border: `1px solid ${C.border}`, color: C.textSecondary, cursor: 'pointer', fontFamily: 'Inter', fontSize: 13 }}>← Back</button>
                <button onClick={() => setStep(3)} style={{ padding: '7px 16px', borderRadius: 8, background: C.primary, border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'Inter', fontWeight: 600, fontSize: 13 }}>Continue →</button>
              </div>
            </div>
            <div style={{ background: C.bg, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}`, maxHeight: 320, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: C.surface }}>{['Name', 'Company', 'Email', 'Phone'].map(h => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, fontFamily: 'Inter', color: C.textMuted, fontWeight: 600, borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, background: C.surface }}>{h}</th>)}</tr></thead>
                <tbody>{parsed.map((v, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '7px 12px', fontSize: 13, color: C.text, fontWeight: 500, fontFamily: 'Inter' }}>{v.name || '—'}</td>
                    <td style={{ padding: '7px 12px', fontSize: 13, color: C.primary, fontFamily: 'Inter' }}>{v.company || '—'}</td>
                    <td style={{ padding: '7px 12px', fontSize: 12, color: v.email ? C.teal : C.textMuted, fontFamily: 'Inter' }}>{v.email || '✗'}</td>
                    <td style={{ padding: '7px 12px', fontSize: 12, color: v.phone ? C.textSecondary : C.textMuted, fontFamily: 'Inter' }}>{v.phone || '✗'}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}
        {step === 3 && (
          <div>
            <p style={{ fontFamily: 'Inter', color: C.textSecondary, fontSize: 13, marginTop: 0, marginBottom: 18 }}>What to do with <strong style={{ color: C.text }}>{parsed.length} vendors</strong>?</p>
            {[{ key: 'addToAll', val: addToAll, set: setAddToAll, title: 'Add to All Vendors', desc: 'Visible in main list. Delete removes from all views.', color: C.primary, lc: C.primaryLight, bc: C.primaryBorder },
              { key: 'wishlist', val: createWishlist, set: setCreateWishlist, title: 'Save as Wishlist Sheet', desc: 'Group in a named sheet for easy reference', color: C.purple, lc: C.purpleLight, bc: C.purpleBorder }
            ].map(({ key, val, set, title, desc, color, lc, bc }) => (
              <div key={key} onClick={() => set(!val)} style={{ padding: 14, background: val ? lc : C.bg, border: `2px solid ${val ? bc : C.border}`, borderRadius: 12, marginBottom: 10, cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 20, height: 20, borderRadius: 5, background: val ? color : C.surface, border: `2px solid ${val ? color : C.borderStrong}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff', fontSize: 12, marginTop: 2 }}>{val ? '✓' : ''}</div>
                <div><div style={{ fontFamily: 'Inter', color: C.text, fontSize: 14, fontWeight: 600 }}>{title}</div><div style={{ fontFamily: 'Inter', color: C.textMuted, fontSize: 12, marginTop: 2 }}>{desc}</div></div>
              </div>
            ))}
            {createWishlist && (
              <div style={{ background: C.purpleLight, border: `1px solid ${C.purpleBorder}`, borderRadius: 12, padding: 14, marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  {['new', 'existing'].map(m => <button key={m} onClick={() => setWishlistMode(m)} style={{ padding: '6px 14px', borderRadius: 8, fontFamily: 'Inter', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: wishlistMode === m ? C.purple : C.surface, border: `1px solid ${wishlistMode === m ? C.purple : C.border}`, color: wishlistMode === m ? '#fff' : C.textSecondary }}>{m === 'new' ? '+ New Sheet' : 'Add to Existing'}</button>)}
                </div>
                {wishlistMode === 'new'
                  ? <input value={wishlistName} onChange={e => setWishlistName(e.target.value)} placeholder="Sheet name..." style={inp} />
                  : <select value={existingWishlist} onChange={e => setExistingWishlist(e.target.value)} style={inp}><option value="">Select a sheet...</option>{wishlists.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select>}
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'space-between' }}>
              <button onClick={() => setStep(2)} style={{ padding: '10px 20px', borderRadius: 10, background: C.bg, border: `1px solid ${C.border}`, color: C.textSecondary, cursor: 'pointer', fontFamily: 'Inter' }}>← Back</button>
              <button onClick={() => { onImport({ vendors: parsed, addToAll, createWishlist, wishlistName: wishlistMode === 'new' ? wishlistName : '', existingWishlistId: wishlistMode === 'existing' ? existingWishlist : null }); onClose(); }} disabled={!addToAll && !createWishlist}
                style={{ padding: '10px 28px', borderRadius: 10, background: C.primary, border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'Inter', fontWeight: 600, fontSize: 14 }}>
                Import {parsed.length} Vendors
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── VENDOR MODAL ────────────────────────────────────────────────
function VendorModal({ vendor, onSave, onClose }) {
  const [form, setForm] = useState(vendor || { name: '', title: '', company: '', email: '', phone: '', website: '', emailSent: '', followUp: '', callDone: '', resumeRole: '', notes: '', vendorType: '' });
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const inp = { display: 'block', width: '100%', marginTop: 4, padding: '9px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, fontFamily: 'Inter', outline: 'none', boxSizing: 'border-box' };
  const lbl = { fontSize: 11, color: C.textMuted, fontFamily: 'Inter', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 32, width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontFamily: 'Inter', color: C.text, fontSize: 20, fontWeight: 700 }}>{vendor ? 'Edit Vendor' : 'Add New Vendor'}</h2>
          <button onClick={onClose} style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.textMuted, cursor: 'pointer', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[{ key: 'name', label: 'Full Name *', span: false }, { key: 'title', label: 'Job Title', span: false }, { key: 'company', label: 'Company *', span: false }, { key: 'email', label: 'Email', span: false }, { key: 'phone', label: 'Phone', span: false }, { key: 'website', label: 'Website / LinkedIn', span: false }, { key: 'resumeRole', label: 'Resume Role', span: true }, { key: 'notes', label: 'Notes', span: true }].map(({ key, label, span }) => (
            <div key={key} style={{ gridColumn: span ? '1/-1' : 'auto' }}>
              <label style={lbl}>{label}</label>
              <input value={form[key] || ''} onChange={e => f(key, e.target.value)} style={inp} onFocus={e => e.target.style.borderColor = C.primary} onBlur={e => e.target.style.borderColor = C.border} />
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginTop: 14 }}>
          {[{ key: 'vendorType', label: 'Type', opts: ['', 'Normal', 'Prime', 'Core'] }, { key: 'emailSent', label: 'Email Sent?', opts: STATUS_OPTIONS }, { key: 'followUp', label: 'Follow-Up?', opts: STATUS_OPTIONS }, { key: 'callDone', label: 'Call Done?', opts: STATUS_OPTIONS }].map(({ key, label, opts }) => (
            <div key={key}>
              <label style={lbl}>{label}</label>
              <select value={form[key] || ''} onChange={e => f(key, e.target.value)} style={{ ...inp, marginTop: 4 }}>{opts.map(o => <option key={o} value={o}>{o || '—'}</option>)}</select>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 24px', borderRadius: 10, background: C.bg, border: `1px solid ${C.border}`, color: C.textSecondary, cursor: 'pointer', fontFamily: 'Inter' }}>Cancel</button>
          <button onClick={() => { if (!form.name || !form.company) { alert('Name and Company required'); return; } onSave(form); }} style={{ padding: '10px 28px', borderRadius: 10, background: C.primary, border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'Inter', fontWeight: 600 }}>{vendor ? 'Save Changes' : 'Add Vendor'}</button>
        </div>
      </div>
    </div>
  );
}

function EmailTemplatesPanel({ onClose }) {
  const [templates, setTemplates] = useState(() => lload('emailTemplates', [
    { id: 1, title: 'Initial Outreach', body: `Hi [Name],\n\nI hope you're doing well! I'm Alok, GTM Automation Engineer at ConsultAdd. I'd love to explore collaboration opportunities.\n\nOpen to a quick 15-min call?\n\nBest,\nAlok Kumar Singh` },
    { id: 2, title: 'Resume Follow-Up', body: `Hi [Name],\n\nFollowing up on the resume I shared for [Role].\n\nThanks,\nAlok` },
    { id: 3, title: 'Partnership Intro', body: `Hello [Name],\n\nReaching out from ConsultAdd IT Staffing. We'd love to explore a vendor partnership.\n\nBest,\nAlok Kumar Singh\nGTM Automation Engineer, ConsultAdd` },
  ]));
  const [editing, setEditing] = useState(null); const [copied, setCopied] = useState(null);
  const sv = t => { setTemplates(t); lsave('emailTemplates', t); };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 32, width: '100%', maxWidth: 640, maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontFamily: 'Inter', color: C.text, fontSize: 20, fontWeight: 700 }}>Email Templates</h2>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { const t = { id: Date.now(), title: 'New Template', body: '' }; sv([...templates, t]); setEditing(t.id); }} style={{ padding: '8px 16px', borderRadius: 8, background: C.primary, border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'Inter', fontSize: 13, fontWeight: 600 }}>+ New</button>
            <button onClick={onClose} style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.textMuted, cursor: 'pointer', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
          </div>
        </div>
        {templates.map(t => (
          <div key={t.id} style={{ background: C.bg, borderRadius: 14, padding: 18, marginBottom: 12, border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              {editing === t.id ? <input value={t.title} onChange={e => sv(templates.map(x => x.id === t.id ? { ...x, title: e.target.value } : x))} style={{ background: C.surface, border: `1px solid ${C.primary}`, borderRadius: 8, color: C.text, padding: '6px 10px', fontFamily: 'Inter', fontSize: 14, fontWeight: 700, outline: 'none' }} />
                : <h3 style={{ margin: 0, fontFamily: 'Inter', color: C.text, fontSize: 15, fontWeight: 700 }}>{t.title}</h3>}
              <div style={{ display: 'flex', gap: 7 }}>
                <button onClick={() => { navigator.clipboard.writeText(t.body); setCopied(t.id); setTimeout(() => setCopied(null), 2000); }} style={{ padding: '5px 12px', borderRadius: 8, background: copied === t.id ? C.successLight : C.surface, border: `1px solid ${copied === t.id ? C.successBorder : C.border}`, color: copied === t.id ? C.success : C.textSecondary, cursor: 'pointer', fontSize: 12, fontFamily: 'Inter' }}>{copied === t.id ? '✓ Copied' : 'Copy'}</button>
                <button onClick={() => setEditing(editing === t.id ? null : t.id)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.textSecondary, cursor: 'pointer', padding: '5px 10px', fontSize: 12 }}>{editing === t.id ? '✓ Done' : 'Edit'}</button>
                <button onClick={() => sv(templates.filter(x => x.id !== t.id))} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer' }}>🗑️</button>
              </div>
            </div>
            {editing === t.id ? <textarea value={t.body} onChange={e => sv(templates.map(x => x.id === t.id ? { ...x, body: e.target.value } : x))} rows={6} style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, padding: 12, fontFamily: 'Inter', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', outline: 'none', lineHeight: 1.6 }} />
              : <pre style={{ margin: 0, fontFamily: 'Inter', fontSize: 12, color: C.textSecondary, whiteSpace: 'pre-wrap', lineHeight: 1.7, maxHeight: 80, overflow: 'hidden' }}>{t.body}</pre>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ThoughtsWidget() {
  const [text, setText] = useState(() => lload('thoughts', ''));
  const [saved, setSaved] = useState(false);
  const quotes = ["मेहनत कभी बेकार नहीं जाती 💪", "Every lead is an opportunity 🎯", "Build the pipeline, trust the process 🔥", "कड़ी मेहनत का फल मीठा होता है 🌟"];
  const [qi] = useState(() => Math.floor(Math.random() * quotes.length));
  return (
    <div style={{ background: C.purpleLight, border: `1px solid ${C.purpleBorder}`, borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.purpleBorder}` }}>
        <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 700, color: C.purple }}>Thoughts & Notes</span>
        <button onClick={() => { lsave('thoughts', text); setSaved(true); setTimeout(() => setSaved(false), 2000); }} style={{ padding: '3px 10px', borderRadius: 6, background: saved ? C.successLight : C.purpleLight, border: `1px solid ${saved ? C.successBorder : C.purpleBorder}`, color: saved ? C.success : C.purple, cursor: 'pointer', fontSize: 11, fontFamily: 'Inter', fontWeight: 600 }}>{saved ? '✓ Saved' : 'Save'}</button>
      </div>
      <div style={{ padding: '10px 14px 12px' }}>
        <div style={{ fontSize: 11, color: C.purple, fontFamily: 'Inter', fontStyle: 'italic', marginBottom: 8, padding: '5px 8px', background: 'rgba(124,58,237,0.08)', borderRadius: 7, borderLeft: `3px solid ${C.purple}` }}>{quotes[qi]}</div>
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Write your thoughts... Hindi mein bhi! 🙏" style={{ width: '100%', minHeight: 70, background: C.surface, border: `1px solid ${C.purpleBorder}`, borderRadius: 8, color: C.text, padding: '8px 10px', fontFamily: 'Inter', fontSize: 13, resize: 'vertical', outline: 'none', lineHeight: 1.6, boxSizing: 'border-box' }} />
      </div>
    </div>
  );
}

function NotesCell({ value, onSave }) {
  const [local, setLocal] = useState(value || '');
  const debounced = useDebounce(local, 800);
  const mounted = useRef(false);
  useEffect(() => { setLocal(value || ''); }, [value]);
  useEffect(() => { if (!mounted.current) { mounted.current = true; return; } onSave(debounced); }, [debounced]);
  return <textarea value={local} onChange={e => setLocal(e.target.value)} placeholder="Add notes..." rows={3}
    style={{ width: '100%', maxWidth: 560, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, padding: '8px 10px', fontFamily: 'Inter', fontSize: 13, resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.5 }}
    onFocus={e => e.target.style.borderColor = C.primary} onBlur={e => e.target.style.borderColor = C.border} />;
}

// ─── VENDOR TABLE ────────────────────────────────────────────────
function VendorTable({ vendors, onUpdate, onEdit, onDelete, onBulkDelete, onBulkTag, onUndo, canUndo, onReorder }) {
  const [search, setSearch] = useState('');
  const [subView, setSubView] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [advFilters, setAdvFilters] = useState([]);
  const [conjunction, setConjunction] = useState('AND');
  const [selected, setSelected] = useState(new Set());
  const [expandedRow, setExpandedRow] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [showTimestamps, setShowTimestamps] = useState(false);
  const [dragOverId, setDragOverId] = useState(null);
  const dragId = useRef(null);

  const primeCount = vendors.filter(v => v.vendor_type === 'Prime').length;
  const normalCount = vendors.filter(v => v.vendor_type === 'Normal').length;
  const coreCount = vendors.filter(v => v.vendor_type === 'Core').length;
  const withEmail = vendors.filter(v => v.email).length;
  const withPhone = vendors.filter(v => v.phone).length;

  const filtered = useMemo(() => {
    let list = vendors.filter(v => {
      if (subView === 'prime' && v.vendor_type !== 'Prime') return false;
      if (subView === 'normal' && v.vendor_type !== 'Normal') return false;
      if (subView === 'core' && v.vendor_type !== 'Core') return false;
      const q = search.toLowerCase();
      if (q && !`${v.name} ${v.company} ${v.email} ${v.title} ${v.phone} ${v.website} ${v.notes}`.toLowerCase().includes(q)) return false;
      if (advFilters.length) {
        const res = advFilters.map(f => applyFilter(v, f));
        if (conjunction === 'AND' && !res.every(Boolean)) return false;
        if (conjunction === 'OR' && !res.some(Boolean)) return false;
      }
      return true;
    });
    if (sortCol) list = [...list].sort((a, b) => {
      const av = (a[sortCol] || '').toString().toLowerCase(), bv = (b[sortCol] || '').toString().toLowerCase();
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return list;
  }, [vendors, subView, search, advFilters, conjunction, sortCol, sortDir]);

  const allFilteredSelected = selected.size === filtered.length && filtered.length > 0;
  const toggleSort = col => { if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortCol(col); setSortDir('asc'); } };
  const toggleSelect = id => { const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s); };
  const toggleAll = () => { if (selected.size > 0) setSelected(new Set()); else setSelected(new Set(filtered.map(v => v.id))); };
  const selectAllFiltered = () => setSelected(new Set(filtered.map(v => v.id)));
  const handleBulkTag = (field, value) => { onBulkTag([...selected], field, value); };
  const handleBulkDelete = () => { onBulkDelete([...selected]); setSelected(new Set()); };

  // Drag to reorder
  const handleDragStart = (e, id) => { dragId.current = id; e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e, id) => { e.preventDefault(); setDragOverId(id); };
  const handleDrop = (e, targetId) => {
    e.preventDefault(); setDragOverId(null);
    if (dragId.current && dragId.current !== targetId) onReorder(dragId.current, targetId);
    dragId.current = null;
  };

  const TH = ({ col, children, w }) => (
    <th onClick={col ? () => toggleSort(col) : undefined} style={{ padding: '11px 12px', textAlign: 'left', fontSize: 12, fontFamily: 'Inter', fontWeight: 600, color: sortCol === col ? C.primary : C.textSecondary, background: '#f8fafc', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap', userSelect: 'none', cursor: col ? 'pointer' : 'default', width: w }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{children}{col && sortCol === col && <span>{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>}</div>
    </th>
  );

  return (
    <div>
      {/* SUB TABS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        {[{ key: 'all', label: 'All', count: vendors.length, color: C.primary }, { key: 'core', label: '🏠 Core', count: coreCount, color: C.core }, { key: 'prime', label: '⭐ Prime', count: primeCount, color: C.gold }, { key: 'normal', label: '● Normal', count: normalCount, color: C.teal }].map(({ key, label, count, color }) => (
          <button key={key} onClick={() => setSubView(key)} style={{ padding: '7px 16px', borderRadius: 8, fontFamily: 'Inter', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: subView === key ? color : C.surface, border: `1px solid ${subView === key ? color : C.border}`, color: subView === key ? '#fff' : C.textSecondary, boxShadow: subView === key ? `0 2px 8px ${color}30` : 'none', transition: 'all 0.15s' }}>
            {label} <span style={{ marginLeft: 5, background: subView === key ? 'rgba(255,255,255,0.25)' : C.bg, color: subView === key ? '#fff' : C.textMuted, borderRadius: 20, padding: '1px 7px', fontSize: 12 }}>{count}</span>
          </button>
        ))}
        <div style={{ display: 'flex', gap: 6, marginLeft: 4 }}>
          <span style={{ fontSize: 12, color: C.teal, padding: '5px 10px', background: C.tealLight, borderRadius: 20, border: `1px solid ${C.tealBorder}`, fontWeight: 500 }}>{withEmail} emails</span>
          <span style={{ fontSize: 12, color: C.primary, padding: '5px 10px', background: C.primaryLight, borderRadius: 20, border: `1px solid ${C.primaryBorder}`, fontWeight: 500 }}>{withPhone} phones</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {canUndo && <button onClick={onUndo} style={{ padding: '7px 14px', borderRadius: 8, background: C.warningLight, border: `1px solid ${C.warningBorder}`, color: C.warning, cursor: 'pointer', fontFamily: 'Inter', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}><RotateCcw size={13} /> Undo Import</button>}
          <button onClick={() => setShowTimestamps(!showTimestamps)} style={{ padding: '7px 12px', borderRadius: 8, background: showTimestamps ? C.primaryLight : C.surface, border: `1px solid ${showTimestamps ? C.primaryBorder : C.border}`, color: showTimestamps ? C.primary : C.textMuted, cursor: 'pointer', fontFamily: 'Inter', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={13} /> Timestamps</button>
          <button onClick={() => setShowFilters(!showFilters)} style={{ padding: '7px 14px', borderRadius: 8, background: (showFilters || advFilters.length > 0) ? C.primaryLight : C.surface, border: `1px solid ${(showFilters || advFilters.length > 0) ? C.primaryBorder : C.border}`, color: (showFilters || advFilters.length > 0) ? C.primary : C.textSecondary, cursor: 'pointer', fontFamily: 'Inter', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Filter size={13} /> Filters {advFilters.length > 0 && <span style={{ background: C.primary, color: '#fff', borderRadius: 10, padding: '0 6px', fontSize: 11 }}>{advFilters.length}</span>}
          </button>
        </div>
      </div>

      {showFilters && <AdvancedFilterPanel filters={advFilters} setFilters={setAdvFilters} conjunction={conjunction} setConjunction={setConjunction} onClose={() => setShowFilters(false)} />}

      {/* BULK BAR */}
      {selected.size > 0 && (
        <BulkTagBar count={selected.size} filteredCount={filtered.length} allFilteredSelected={allFilteredSelected}
          onSelectAllFiltered={selectAllFiltered} onClear={() => setSelected(new Set())}
          onBulkDelete={handleBulkDelete} onBulkTag={handleBulkTag} />
      )}

      {/* SEARCH */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.textMuted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, company, email, phone, title..." style={{ width: '100%', padding: '9px 14px 9px 36px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 13, fontFamily: 'Inter', outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = C.primary} onBlur={e => e.target.style.borderColor = C.border} />
        </div>
        <span style={{ fontSize: 13, color: C.textMuted, fontFamily: 'Inter', whiteSpace: 'nowrap' }}>{filtered.length} / {vendors.length}</span>
      </div>

      {/* TABLE */}
      <div style={{ background: C.surface, borderRadius: 14, overflow: 'hidden', border: `1px solid ${C.border}`, boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
            <thead>
              <tr>
                <th style={{ padding: '11px 12px', background: '#f8fafc', borderBottom: `1px solid ${C.border}`, width: 36 }}>
                  <input type="checkbox" checked={selected.size > 0 && selected.size === filtered.length} onChange={toggleAll} style={{ cursor: 'pointer', accentColor: C.primary, width: 15, height: 15 }} />
                </th>
                <th style={{ padding: '11px 8px', background: '#f8fafc', borderBottom: `1px solid ${C.border}`, width: 28 }} title="Drag to reorder"><GripVertical size={13} style={{ color: C.textMuted }} /></th>
                <TH w={36}>#</TH>
                <TH col="name" w={160}>Name</TH>
                <TH col="company" w={150}>Company</TH>
                <TH col="title" w={140}>Title</TH>
                <TH col="email" w={190}>Email</TH>
                <TH col="phone" w={145}>Phone</TH>
                <TH col="vendor_type" w={110}>Type</TH>
                <TH col="email_sent" w={90}>Emailed</TH>
                <TH col="follow_up" w={90}>Follow-Up</TH>
                <TH col="call_done" w={90}>Called</TH>
                <TH col="resume_role" w={130}>Resume Role</TH>
                {showTimestamps && <TH col="created_at" w={160}>Created</TH>}
                {showTimestamps && <TH col="updated_at" w={160}>Updated</TH>}
                <TH w={80}>Actions</TH>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v, i) => {
                const isExp = expandedRow === v.id, isSel = selected.has(v.id);
                const isDragOver = dragOverId === v.id;
                const rowBg = isSel ? '#eff6ff' : isDragOver ? '#f0fdf4' : i % 2 === 0 ? C.surface : '#fafafa';
                return (
                  <React.Fragment key={v.id}>
                    <tr style={{ background: rowBg, borderBottom: isExp ? 'none' : `1px solid ${C.border}`, transition: 'background 0.1s', borderTop: isDragOver ? `2px solid ${C.core}` : 'none' }}
                      onMouseEnter={e => { if (!isSel && !isDragOver) e.currentTarget.style.background = C.surfaceHover; }}
                      onMouseLeave={e => { e.currentTarget.style.background = rowBg; }}
                      onDragOver={e => handleDragOver(e, v.id)} onDrop={e => handleDrop(e, v.id)} onDragLeave={() => setDragOverId(null)}>
                      <td style={{ padding: '10px 12px' }}><input type="checkbox" checked={isSel} onChange={() => toggleSelect(v.id)} style={{ cursor: 'pointer', accentColor: C.primary, width: 15, height: 15 }} /></td>
                      <td style={{ padding: '10px 8px', cursor: 'grab' }} draggable onDragStart={e => handleDragStart(e, v.id)}><GripVertical size={14} style={{ color: C.textMuted }} /></td>
                      <td style={{ padding: '10px 12px', color: C.textMuted, fontSize: 12, fontWeight: 600, fontFamily: 'Inter' }}>{i + 1}</td>
                      <td style={{ padding: '10px 12px' }}><div style={{ fontWeight: 600, color: C.text, fontSize: 13, fontFamily: 'Inter', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 155 }}>{v.name}</div></td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 600, color: C.primary, fontSize: 13, fontFamily: 'Inter', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 145 }}>{v.company}</div>
                        {v.website && <a href={v.website.startsWith('http') ? v.website : `https://${v.website}`} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: C.teal, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: 145 }}>{v.website.replace('https://', '').substring(0, 20)}</a>}
                      </td>
                      <td style={{ padding: '10px 12px' }}><div style={{ fontSize: 13, color: C.textSecondary, fontFamily: 'Inter', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 135 }}>{v.title || <span style={{ color: C.textMuted }}>—</span>}</div></td>
                      <td style={{ padding: '10px 12px' }}>{v.email ? <a href={`mailto:${v.email}`} style={{ fontSize: 13, color: C.teal, fontFamily: 'Inter', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: 185 }}>{v.email}</a> : <span style={{ fontSize: 13, color: C.textMuted }}>—</span>}</td>
                      <td style={{ padding: '10px 12px' }}><div style={{ fontSize: 13, color: C.textSecondary, fontFamily: 'Inter', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{v.phone || <span style={{ color: C.textMuted }}>—</span>}</div></td>
                      <td style={{ padding: '10px 12px' }}><Pill value={v.vendor_type || ''} onChange={val => onUpdate(v.id, 'vendorType', val)} options={['', 'Normal', 'Prime', 'Core']} styleMap={TYPE_STYLE} /></td>
                      <td style={{ padding: '10px 12px' }}><Pill value={v.email_sent || ''} onChange={val => onUpdate(v.id, 'emailSent', val)} options={STATUS_OPTIONS} styleMap={STATUS_STYLE} /></td>
                      <td style={{ padding: '10px 12px' }}><Pill value={v.follow_up || ''} onChange={val => onUpdate(v.id, 'followUp', val)} options={STATUS_OPTIONS} styleMap={STATUS_STYLE} /></td>
                      <td style={{ padding: '10px 12px' }}><Pill value={v.call_done || ''} onChange={val => onUpdate(v.id, 'callDone', val)} options={STATUS_OPTIONS} styleMap={STATUS_STYLE} /></td>
                      <td style={{ padding: '10px 12px', maxWidth: 130 }}>
                        {editingCell === v.id
                          ? <input autoFocus defaultValue={v.resume_role} onBlur={e => { onUpdate(v.id, 'resumeRole', e.target.value); setEditingCell(null); }} onKeyDown={e => e.key === 'Enter' && e.target.blur()} style={{ width: '100%', background: C.surface, border: `1px solid ${C.primary}`, borderRadius: 6, color: C.text, padding: '4px 8px', fontSize: 13, fontFamily: 'Inter', outline: 'none', boxSizing: 'border-box' }} />
                          : <div onClick={() => setEditingCell(v.id)} style={{ fontSize: 12, color: v.resume_role ? C.purple : C.textMuted, cursor: 'pointer', fontFamily: 'Inter', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120, padding: '2px 4px', borderRadius: 4, border: '1px dashed transparent' }}
                              onMouseEnter={e => e.currentTarget.style.borderColor = C.border} onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}>
                              {v.resume_role || <span style={{ color: C.textMuted }}>+ Add</span>}
                            </div>}
                      </td>
                      {showTimestamps && <td style={{ padding: '10px 12px' }}><div style={{ fontSize: 12, color: C.textSecondary, fontFamily: 'Inter', whiteSpace: 'nowrap' }}>{formatDate(v.created_at)}</div></td>}
                      {showTimestamps && <td style={{ padding: '10px 12px' }}><div style={{ fontSize: 12, color: C.textSecondary, fontFamily: 'Inter', whiteSpace: 'nowrap' }}>{formatDate(v.updated_at)}</div></td>}
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => setExpandedRow(isExp ? null : v.id)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, color: C.textMuted, cursor: 'pointer', padding: '3px 6px', display: 'flex', alignItems: 'center' }}>{isExp ? <ChevronUp size={12} /> : <ChevronDown size={12} />}</button>
                          <button onClick={() => onEdit(v)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, color: C.textMuted, cursor: 'pointer', padding: '3px 6px', display: 'flex', alignItems: 'center' }}><Edit2 size={12} /></button>
                          <button onClick={() => setDeleteConfirm(v.id)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: '3px 5px', borderRadius: 6, display: 'flex', alignItems: 'center' }}
                            onMouseEnter={e => { e.currentTarget.style.color = C.danger; e.currentTarget.style.background = C.dangerLight; }}
                            onMouseLeave={e => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.background = 'none'; }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExp && (
                      <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                        <td colSpan={showTimestamps ? 17 : 15} style={{ padding: '14px 20px 18px 60px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                            <div>
                              <div style={{ fontSize: 11, color: C.textMuted, fontFamily: 'Inter', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Notes</div>
                              <NotesCell value={v.notes} onSave={val => onUpdate(v.id, 'notes', val)} />
                            </div>
                            <div style={{ fontSize: 13, color: C.textSecondary, fontFamily: 'Inter', lineHeight: 2.2 }}>
                              {v.website && <div><a href={v.website.startsWith('http') ? v.website : `https://${v.website}`} target="_blank" rel="noreferrer" style={{ color: C.primary }}>{v.website}</a></div>}
                              {v.created_at && <div><span style={{ color: C.textMuted, fontSize: 12 }}>Added:</span> <strong style={{ color: C.text }}>{formatDate(v.created_at)}</strong></div>}
                              {v.updated_at && <div><span style={{ color: C.textMuted, fontSize: 12 }}>Updated:</span> <strong style={{ color: C.text }}>{formatDate(v.updated_at)}</strong></div>}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    {deleteConfirm === v.id && (
                      <tr style={{ background: C.dangerLight }}>
                        <td colSpan={showTimestamps ? 17 : 15} style={{ padding: '10px 20px' }}>
                          <span style={{ color: C.danger, fontSize: 13, fontFamily: 'Inter' }}>Delete <strong>{v.name}</strong> from all views permanently? &nbsp;</span>
                          <button onClick={() => { onDelete(v.id); setDeleteConfirm(null); }} style={{ background: C.danger, border: 'none', color: '#fff', borderRadius: 7, padding: '5px 14px', cursor: 'pointer', fontFamily: 'Inter', fontSize: 13, fontWeight: 600, marginRight: 8 }}>Yes, Delete</button>
                          <button onClick={() => setDeleteConfirm(null)} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.textSecondary, borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontFamily: 'Inter', fontSize: 13 }}>Cancel</button>
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
              ? <div><div style={{ fontSize: 28, marginBottom: 10 }}>🔍</div>No vendors match these filters.<br />
                  <button onClick={() => setAdvFilters([])} style={{ marginTop: 12, padding: '7px 18px', borderRadius: 8, background: C.primaryLight, border: `1px solid ${C.primaryBorder}`, color: C.primary, cursor: 'pointer', fontFamily: 'Inter', fontSize: 13, fontWeight: 600 }}>Clear Filters</button>
                </div>
              : 'No vendors found'
            }
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────
export default function App() {
  const [vendors, setVendors] = useState([]);
  const [vendorOrder, setVendorOrder] = useState(() => lload('vendorOrder', []));
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
    try {
      const [{ data: vData }, { data: wData }, { data: wvData }] = await Promise.all([
        supabase.from('vendors').select('*').order('id'),
        supabase.from('wishlists').select('*').order('created_at'),
        supabase.from('wishlist_vendors').select('*'),
      ]);
      if (vData) {
        if (vData.length === 0) {
          const seeded = ALL_VENDORS.map(v => ({ name: v.name, title: v.title || '', company: v.company, email: v.email || '', phone: v.phone || '', website: v.website || '', notes: '', vendor_type: 'Core', email_sent: '', follow_up: '', call_done: '', resume_role: '' }));
          const { data: ins } = await supabase.from('vendors').insert(seeded).select();
          setVendors(ins || []);
        } else {
          setVendors(vData);
        }
      }
      setWishlists(wData || []);
      const map = {};
      (wvData || []).forEach(({ wishlist_id, vendor_id }) => { if (!map[wishlist_id]) map[wishlist_id] = []; map[wishlist_id].push(vendor_id); });
      setWishlistVendors(map);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    const ch = supabase.channel('rt-meta')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vendors' }, p => setVendors(v => v.find(x => x.id === p.new.id) ? v : [...v, p.new]))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'vendors' }, p => setVendors(v => v.filter(x => x.id !== p.old.id)))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wishlists' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wishlist_vendors' }, loadAll)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [loadAll]);

  // Apply custom order
  const orderedVendors = useMemo(() => {
    if (!vendorOrder.length) return vendors;
    const map = Object.fromEntries(vendors.map(v => [v.id, v]));
    const ordered = vendorOrder.filter(id => map[id]).map(id => map[id]);
    const remaining = vendors.filter(v => !vendorOrder.includes(v.id));
    return [...ordered, ...remaining];
  }, [vendors, vendorOrder]);

  const handleReorder = useCallback((draggedId, targetId) => {
    setVendors(prev => {
      const list = [...prev];
      const fromIdx = list.findIndex(v => v.id === draggedId);
      const toIdx = list.findIndex(v => v.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [item] = list.splice(fromIdx, 1);
      list.splice(toIdx, 0, item);
      const newOrder = list.map(v => v.id);
      setVendorOrder(newOrder);
      lsave('vendorOrder', newOrder);
      return list;
    });
  }, []);

  const updateVendor = useCallback(async (id, field, value) => {
    setVendors(v => v.map(x => x.id === id ? { ...x, [field]: value } : x));
    const dbField = { emailSent: 'email_sent', followUp: 'follow_up', callDone: 'call_done', resumeRole: 'resume_role', vendorType: 'vendor_type' }[field] || field;
    await supabase.from('vendors').update({ [dbField]: value }).eq('id', id);
  }, []);

  const bulkTag = async (ids, field, value) => {
    setSyncing(true);
    setVendors(v => v.map(x => ids.includes(x.id) ? { ...x, [field]: value } : x));
    await supabase.from('vendors').update({ [field]: value }).in('id', ids);
    setSyncing(false);
    showToast(`Updated ${ids.length} vendors`);
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
      showToast('Vendor added');
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
    showToast('Deleted from all views', 'warning');
  };

  const bulkDelete = async (ids) => {
    setSyncing(true);
    await supabase.from('vendors').delete().in('id', ids);
    setVendors(v => v.filter(x => !ids.includes(x.id)));
    setSyncing(false); showToast(`${ids.length} vendors deleted`, 'danger');
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
    setSyncing(false); showToast(`Imported ${ids.length} vendors!`);
  };

  const handleUndo = async () => {
    if (!lastImportIds.length || !window.confirm(`Delete ${lastImportIds.length} vendors from last import?`)) return;
    await bulkDelete(lastImportIds); setLastImportIds([]); showToast('Import undone', 'warning');
  };

  const deleteWishlist = async (id) => {
    await supabase.from('wishlists').delete().eq('id', id);
    setWishlists(w => w.filter(x => x.id !== id));
    if (activeView === id.toString()) setActiveView('all');
    setDeleteWishlistConfirm(null); showToast('Wishlist deleted. Vendors kept.');
  };

  const renameWishlist = async (id, name) => {
    await supabase.from('wishlists').update({ name }).eq('id', id);
    setWishlists(w => w.map(x => x.id === id ? { ...x, name } : x));
    setRenamingWishlist(null);
  };

  const currentVendors = activeView === 'all' ? orderedVendors : orderedVendors.filter(v => (wishlistVendors[parseInt(activeView)] || []).includes(v.id));
  const total = vendors.length;
  const coreCount = vendors.filter(v => v.vendor_type === 'Core').length;
  const primeCount = vendors.filter(v => v.vendor_type === 'Prime').length;
  const emailsSent = vendors.filter(v => v.email_sent === 'Yes').length;
  const withEmail = vendors.filter(v => v.email).length;

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: `3px solid ${C.primaryBorder}`, borderTop: `3px solid ${C.primary}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <div style={{ fontFamily: 'Inter', color: C.primary, fontSize: 15, fontWeight: 600, fontStyle: 'italic' }}>Vincit qui se vincit</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes slideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}*{box-sizing:border-box}::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:${C.bg}}::-webkit-scrollbar-thumb{background:${C.borderStrong};border-radius:3px}`}</style>

      {toast && <div style={{ position: 'fixed', bottom: 24, right: 24, background: C.surface, border: `1px solid ${C.border}`, borderLeft: `4px solid ${toast.color}`, borderRadius: 10, padding: '12px 20px', color: C.text, fontFamily: 'Inter', fontSize: 13, fontWeight: 500, zIndex: 9999, boxShadow: '0 8px 32px rgba(0,0,0,0.10)', animation: 'slideUp 0.3s ease' }}>{toast.msg}</div>}

      {/* HEADER — fixed */}
      <div style={{ background: C.sidebar, position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', borderBottom: `1px solid ${C.sidebarBorder}` }}>
        <div>
          <div style={{ fontFamily: 'Inter', fontSize: 17, fontWeight: 800, color: '#fff', fontStyle: 'italic', letterSpacing: '-0.3px' }}><span style={{ color: '#60a5fa' }}>Vincit</span> qui se vincit</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5, textTransform: 'uppercase' }}>IT Staffing · ConsultAdd {syncing ? <span style={{ color: '#fbbf24' }}>· saving</span> : <span style={{ color: '#4ade80' }}>· live</span>}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowCSV(true)} style={{ padding: '7px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer', fontFamily: 'Inter', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5 }}><Upload size={13} /> Import CSV</button>
          <button onClick={() => setShowEmail(true)} style={{ padding: '7px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer', fontFamily: 'Inter', fontSize: 13, fontWeight: 500 }}>Templates</button>
          <button onClick={() => { setEditingVendor(null); setModal('add'); }} style={{ padding: '7px 18px', borderRadius: 8, background: C.primary, border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'Inter', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}><Plus size={14} /> Add Vendor</button>
        </div>
      </div>

      {/* BODY BELOW HEADER */}
      <div style={{ display: 'flex', flex: 1, paddingTop: 56, height: '100vh' }}>

        {/* SIDEBAR — fixed, scrollable */}
        <div style={{ width: 220, background: C.surface, borderRight: `1px solid ${C.border}`, position: 'fixed', top: 56, bottom: 0, left: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

          {/* STATS */}
          <div style={{ padding: '16px 14px 8px', borderBottom: `1px solid ${C.border}` }}>
            {[
              { label: 'Total Vendors', value: total, icon: '🏢', color: C.primary },
              { label: 'Core Vendors', value: coreCount, icon: '🏠', color: C.core, tip: 'original 74' },
              { label: 'Prime Vendors', value: primeCount, icon: '⭐', color: C.gold },
              { label: 'Wishlists', value: wishlists.length, icon: '📋', color: C.purple },
              { label: 'Have Email', value: withEmail, icon: '📧', color: C.teal },
              { label: 'Emailed', value: emailsSent, icon: '✅', color: C.success },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${C.bg}` }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{s.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: s.color, fontFamily: 'Inter', lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>{s.label}{s.tip && <span style={{ color: s.color, marginLeft: 4 }}>({s.tip})</span>}</div>
                </div>
              </div>
            ))}
          </div>

          {/* VIEWS */}
          <div>
            <div style={{ padding: '10px 14px 6px', fontSize: 10, color: C.textMuted, fontFamily: 'Inter', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Views</div>
            <button onClick={() => setActiveView('all')} style={{ display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left', background: activeView === 'all' ? C.primaryLight : 'transparent', border: 'none', borderBottom: `1px solid ${C.border}`, color: activeView === 'all' ? C.primary : C.textSecondary, fontFamily: 'Inter', fontSize: 13, fontWeight: activeView === 'all' ? 600 : 400, cursor: 'pointer' }}>
              🌐 All Vendors <span style={{ float: 'right', fontSize: 12, color: activeView === 'all' ? C.primary : C.textMuted, fontWeight: 600 }}>{total}</span>
            </button>
          </div>

          {/* WISHLISTS */}
          <div>
            <div style={{ padding: '10px 14px 6px', fontSize: 10, color: C.textMuted, fontFamily: 'Inter', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Wishlists
              <button onClick={() => setShowCSV(true)} style={{ background: C.primaryLight, border: `1px solid ${C.primaryBorder}`, color: C.primary, cursor: 'pointer', borderRadius: 6, padding: '2px 8px', fontSize: 14, lineHeight: 1 }}>+</button>
            </div>
            {wishlists.length === 0 && <div style={{ padding: '8px 14px 10px', fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>No wishlists.<br /><span style={{ color: C.primary, cursor: 'pointer' }} onClick={() => setShowCSV(true)}>Import CSV →</span></div>}
            {wishlists.map(w => {
              const isActive = activeView === w.id.toString();
              const count = (wishlistVendors[w.id] || []).length;
              return (
                <div key={w.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  {renamingWishlist === w.id
                    ? <input autoFocus defaultValue={w.name} onBlur={e => renameWishlist(w.id, e.target.value)} onKeyDown={e => e.key === 'Enter' && renameWishlist(w.id, e.target.value)} style={{ width: '100%', padding: '10px 14px', background: C.primaryLight, border: 'none', color: C.text, fontFamily: 'Inter', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                    : <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button onClick={() => setActiveView(w.id.toString())} style={{ flex: 1, padding: '10px 14px', textAlign: 'left', background: isActive ? C.primaryLight : 'transparent', border: 'none', color: isActive ? C.primary : C.textSecondary, fontFamily: 'Inter', fontSize: 13, fontWeight: isActive ? 600 : 400, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          📋 {w.name.length > 14 ? w.name.substring(0, 14) + '…' : w.name}
                          <span style={{ float: 'right', fontSize: 12, color: isActive ? C.primary : C.textMuted, fontWeight: 600 }}>{count}</span>
                        </button>
                        <div style={{ paddingRight: 6, display: 'flex', gap: 2, flexShrink: 0 }}>
                          <button onClick={() => setRenamingWishlist(w.id)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: '3px 4px', borderRadius: 4, display: 'flex' }} onMouseEnter={e => e.currentTarget.style.color = C.primary} onMouseLeave={e => e.currentTarget.style.color = C.textMuted}><Edit2 size={11} /></button>
                          <button onClick={() => setDeleteWishlistConfirm(w.id)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: '3px 4px', borderRadius: 4, display: 'flex' }} onMouseEnter={e => e.currentTarget.style.color = C.danger} onMouseLeave={e => e.currentTarget.style.color = C.textMuted}><Trash2 size={11} /></button>
                        </div>
                      </div>
                  }
                  {deleteWishlistConfirm === w.id && (
                    <div style={{ padding: '10px 14px', background: C.dangerLight, borderTop: `1px solid ${C.dangerBorder}` }}>
                      <div style={{ fontSize: 12, color: C.danger, marginBottom: 8, fontWeight: 500 }}>Delete "{w.name}"?<br /><span style={{ color: C.textMuted, fontWeight: 400 }}>Vendors stay in All Vendors</span></div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => deleteWishlist(w.id)} style={{ padding: '4px 12px', background: C.danger, border: 'none', color: '#fff', borderRadius: 6, cursor: 'pointer', fontFamily: 'Inter', fontSize: 12, fontWeight: 600 }}>Delete</button>
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
          <div style={{ padding: 12, marginTop: 4 }}>
            <ThoughtsWidget />
          </div>

          {/* ACTIONS */}
          <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 'auto' }}>
            <div style={{ padding: '8px 14px 4px', fontSize: 10, color: C.textMuted, fontFamily: 'Inter', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Actions</div>
            {[
              { label: '📤 Import CSV', action: () => setShowCSV(true) },
              { label: '📧 Email Templates', action: () => setShowEmail(true) },
              { label: '💾 Export Backup', action: () => { const b = new Blob([JSON.stringify(vendors, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'vendors_backup.json'; a.click(); } },
            ].map(({ label, action }) => (
              <button key={label} onClick={action} style={{ display: 'block', width: '100%', padding: '9px 14px', textAlign: 'left', background: 'transparent', border: 'none', borderTop: `1px solid ${C.border}`, color: C.textSecondary, fontFamily: 'Inter', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = C.surfaceHover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* MAIN CONTENT — scrollable */}
        <div style={{ marginLeft: 220, flex: 1, padding: '24px 28px', overflowY: 'auto', height: '100%' }}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontFamily: 'Inter', fontSize: 20, color: C.text, fontWeight: 700 }}>
              {activeView === 'all' ? '🌐 All Vendors' : `📋 ${wishlists.find(w => w.id.toString() === activeView)?.name || 'Wishlist'}`}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: C.textMuted, fontFamily: 'Inter' }}>
              {currentVendors.length} vendors · Drag ⠿ to reorder rows · Select rows → Bulk Tag any field
            </p>
          </div>

          <VendorTable
            vendors={currentVendors}
            onUpdate={updateVendor}
            onEdit={v => { setEditingVendor(v); setModal('edit'); }}
            onDelete={deleteVendor}
            onBulkDelete={bulkDelete}
            onBulkTag={bulkTag}
            onUndo={handleUndo}
            canUndo={lastImportIds.length > 0}
            onReorder={handleReorder}
          />
        </div>
      </div>

      {(modal === 'add' || modal === 'edit') && <VendorModal vendor={modal === 'edit' ? editingVendor : null} onSave={saveVendor} onClose={() => { setModal(null); setEditingVendor(null); }} />}
      {showEmail && <EmailTemplatesPanel onClose={() => setShowEmail(false)} />}
      {showCSV && <CSVModal onClose={() => setShowCSV(false)} onImport={handleCSVImport} wishlists={wishlists} />}
    </div>
  );
}
