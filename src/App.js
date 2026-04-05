import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from './supabase';
import { ALL_VENDORS } from './data';
import { Search, Upload, Trash2, Filter, RotateCcw, X, Plus, ChevronDown, ChevronUp, Edit2, Clock, Calendar, Globe } from 'lucide-react';

const lload = (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const lsave = (k, val) => { try { localStorage.setItem(k, JSON.stringify(val)); } catch {} };

// ─── DEBOUNCE HOOK ────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [dv, setDv] = useState(value);
  useEffect(() => { const t = setTimeout(() => setDv(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return dv;
}

// ─── DESIGN TOKENS ────────────────────────────────────────────────
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
  sidebar: '#1e293b',
};

function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function timeAgo(dt) {
  if (!dt) return '';
  const s = Math.floor((Date.now() - new Date(dt)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  if (s < 604800) return `${Math.floor(s/86400)}d ago`;
  return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

const STATUS_OPTIONS = ['', 'Yes', 'No', 'Pending'];
const STATUS_STYLE = {
  Yes:     { bg: C.successLight, text: C.success, border: C.successBorder, label: 'Yes' },
  No:      { bg: C.dangerLight,  text: C.danger,  border: C.dangerBorder,  label: 'No' },
  Pending: { bg: C.warningLight, text: C.warning, border: C.warningBorder, label: 'Pending' },
  '':      { bg: C.bg,          text: C.textMuted, border: C.border,       label: '—' },
};
const TYPE_STYLE = {
  Prime:   { bg: C.goldLight,   text: C.gold,    border: C.goldBorder,    label: '⭐ Prime' },
  Normal:  { bg: C.primaryLight, text: C.primary, border: C.primaryBorder, label: '● Normal' },
  Core:    { bg: C.coreLight,   text: C.core,    border: C.coreBorder,    label: '🏠 Core' },
  '':      { bg: C.bg,          text: C.textMuted, border: C.border,       label: '○ —' },
};

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
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => setOpen(!open)} style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}`, borderRadius: 6, padding: '3px 9px', fontSize: 13, fontFamily: 'Inter', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
        {s.label} <ChevronDown size={10} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 9999, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', minWidth: 120, boxShadow: '0 10px 40px rgba(0,0,0,0.12)' }}>
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

// ─── RESIZABLE COLUMN HEADER ──────────────────────────────────────
function ResizableTH({ children, width, onResize, col, sortCol, sortDir, onSort, style: extraStyle }) {
  const startX = useRef(null);
  const startW = useRef(null);
  const onMouseDown = e => {
    e.preventDefault();
    startX.current = e.clientX;
    startW.current = width;
    const onMove = ev => { const diff = ev.clientX - startX.current; onResize(Math.max(60, startW.current + diff)); };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };
  return (
    <th style={{ position: 'relative', width, minWidth: width, maxWidth: width, padding: '10px 12px', textAlign: 'left', fontSize: 13, fontFamily: 'Inter', fontWeight: 600, color: sortCol === col ? C.primary : C.textSecondary, background: C.bg, borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap', userSelect: 'none', cursor: col ? 'pointer' : 'default', ...extraStyle }}>
      <div onClick={col ? onSort : undefined} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {children}
        {col && sortCol === col && <span>{sortDir === 'asc' ? '↑' : '↓'}</span>}
      </div>
      <div onMouseDown={onMouseDown} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 5, cursor: 'col-resize', background: 'transparent', zIndex: 10 }}
        onMouseEnter={e => e.currentTarget.style.background = C.primaryBorder}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'} />
    </th>
  );
}

// ─── BULK ACTION BAR ──────────────────────────────────────────────
function BulkActionBar({ count, onClear, onBulkDelete, onBulkTag }) {
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [tagField, setTagField] = useState('vendor_type');
  const [tagValue, setTagValue] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setShowTagMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const BULK_FIELDS = [
    { key: 'vendor_type', label: 'Vendor Type',  options: ['', 'Normal', 'Prime', 'Core'] },
    { key: 'email_sent',  label: 'Email Sent',   options: ['', 'Yes', 'No', 'Pending'] },
    { key: 'follow_up',   label: 'Follow-Up',    options: ['', 'Yes', 'No', 'Pending'] },
    { key: 'call_done',   label: 'Call Done',    options: ['', 'Yes', 'No', 'Pending'] },
    { key: 'resume_role', label: 'Resume Role',  options: null },
  ];

  const selField = BULK_FIELDS.find(f => f.key === tagField);

  const inp = { padding: '7px 10px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 13, fontFamily: 'Inter', outline: 'none' };

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 14px', background: '#fff8e1', borderRadius: 10, border: `1px solid ${C.warningBorder}`, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 14, color: C.warning, fontFamily: 'Inter', fontWeight: 700 }}>{count} selected</span>

      {/* BULK TAG */}
      <div ref={ref} style={{ position: 'relative' }}>
        <button onClick={() => setShowTagMenu(!showTagMenu)} style={{ padding: '6px 14px', borderRadius: 8, background: C.primaryLight, border: `1px solid ${C.primaryBorder}`, color: C.primary, cursor: 'pointer', fontFamily: 'Inter', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
          🏷 Bulk Tag <ChevronDown size={12} />
        </button>
        {showTagMenu && (
          <div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 9999, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, minWidth: 300, boxShadow: '0 10px 40px rgba(0,0,0,0.12)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: 'Inter', marginBottom: 12 }}>Bulk Set Field</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: C.textMuted, fontFamily: 'Inter', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Field</label>
                <select value={tagField} onChange={e => { setTagField(e.target.value); setTagValue(''); }} style={{ ...inp, width: '100%' }}>
                  {BULK_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.textMuted, fontFamily: 'Inter', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Value</label>
                {selField?.options
                  ? <select value={tagValue} onChange={e => setTagValue(e.target.value)} style={{ ...inp, width: '100%' }}>
                      {selField.options.map(o => <option key={o} value={o}>{o || '(clear / unset)'}</option>)}
                    </select>
                  : <input value={tagValue} onChange={e => setTagValue(e.target.value)} placeholder="Enter value..." style={{ ...inp, width: '100%' }} />
                }
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={() => { onBulkTag(tagField, tagValue); setShowTagMenu(false); }} style={{ flex: 1, padding: '8px', borderRadius: 8, background: C.primary, border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'Inter', fontSize: 13, fontWeight: 600 }}>Apply to {count} vendors</button>
                <button onClick={() => setShowTagMenu(false)} style={{ padding: '8px 12px', borderRadius: 8, background: C.bg, border: `1px solid ${C.border}`, color: C.textSecondary, cursor: 'pointer', fontFamily: 'Inter', fontSize: 13 }}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BULK DELETE */}
      {deleteConfirm
        ? <>
            <span style={{ fontSize: 13, color: C.danger, fontFamily: 'Inter', fontWeight: 600 }}>Delete {count} permanently?</span>
            <button onClick={() => { onBulkDelete(); setDeleteConfirm(false); }} style={{ padding: '6px 14px', borderRadius: 8, background: C.danger, border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'Inter', fontSize: 13, fontWeight: 600 }}>Confirm</button>
            <button onClick={() => setDeleteConfirm(false)} style={{ padding: '6px 12px', borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, color: C.textSecondary, cursor: 'pointer', fontFamily: 'Inter', fontSize: 13 }}>Cancel</button>
          </>
        : <button onClick={() => setDeleteConfirm(true)} style={{ padding: '6px 14px', borderRadius: 8, background: C.dangerLight, border: `1px solid ${C.dangerBorder}`, color: C.danger, cursor: 'pointer', fontFamily: 'Inter', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Trash2 size={13} /> Delete {count}
          </button>
      }

      <button onClick={onClear} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: 4 }}><X size={15} /></button>
    </div>
  );
}

// ─── ADVANCED FILTER PANEL ────────────────────────────────────────
const FILTER_FIELDS = [
  { key: 'name',        label: 'Name',        type: 'text' },
  { key: 'company',     label: 'Company',     type: 'text' },
  { key: 'title',       label: 'Title',       type: 'text' },
  { key: 'email',       label: 'Email',       type: 'text' },
  { key: 'phone',       label: 'Phone',       type: 'text' },
  { key: 'website',     label: 'Website',     type: 'text' },
  { key: 'vendor_type', label: 'Vendor Type', type: 'select', options: ['', 'Normal', 'Prime', 'Core'] },
  { key: 'email_sent',  label: 'Email Sent',  type: 'select', options: STATUS_OPTIONS },
  { key: 'follow_up',   label: 'Follow-Up',   type: 'select', options: STATUS_OPTIONS },
  { key: 'call_done',   label: 'Call Done',   type: 'select', options: STATUS_OPTIONS },
  { key: 'resume_role', label: 'Resume Role', type: 'text' },
  { key: 'notes',       label: 'Notes',       type: 'text' },
];
const TEXT_OPS   = [{ key: 'contains', label: 'contains' }, { key: 'not_contains', label: 'does not contain' }, { key: 'equals', label: 'equals' }, { key: 'not_equals', label: 'is not' }, { key: 'is_empty', label: 'is empty' }, { key: 'is_not_empty', label: 'is not empty' }, { key: 'starts_with', label: 'starts with' }];
const SELECT_OPS = [{ key: 'equals', label: 'is' }, { key: 'not_equals', label: 'is not' }, { key: 'is_empty', label: 'is empty' }, { key: 'is_not_empty', label: 'is not empty' }];

function applyFilter(v, f) {
  const raw = (v[f.field] || '').toLowerCase().trim(), fv = (f.value || '').toLowerCase().trim();
  switch (f.op) {
    case 'contains':     return raw.includes(fv);
    case 'not_contains': return !raw.includes(fv);
    case 'equals':       return raw === fv;
    case 'not_equals':   return raw !== fv;
    case 'is_empty':     return raw === '';
    case 'is_not_empty': return raw !== '';
    case 'starts_with':  return raw.startsWith(fv);
    default: return true;
  }
}

function AdvancedFilterPanel({ filters, setFilters, conjunction, setConjunction, onClose }) {
  const add = () => setFilters(f => [...f, { id: Date.now(), field: 'email', op: 'is_not_empty', value: '' }]);
  const remove = id => setFilters(f => f.filter(x => x.id !== id));
  const upd = (id, k, v) => setFilters(f => f.map(x => x.id === id ? { ...x, [k]: v } : x));
  const inp = { padding: '7px 10px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, fontFamily: 'Inter', outline: 'none', cursor: 'pointer' };

  const PRESETS = [
    { label: 'No Email',        f: [{ field: 'email',       op: 'is_empty',     value: '' }] },
    { label: 'No Phone',        f: [{ field: 'phone',       op: 'is_empty',     value: '' }] },
    { label: 'Missing Both',    f: [{ field: 'email',       op: 'is_empty',     value: '' }, { field: 'phone', op: 'is_empty', value: '' }], c: 'AND' },
    { label: 'Has Phone',       f: [{ field: 'phone',       op: 'is_not_empty', value: '' }] },
    { label: 'Core Vendors',    f: [{ field: 'vendor_type', op: 'equals',       value: 'Core' }] },
    { label: 'Prime Only',      f: [{ field: 'vendor_type', op: 'equals',       value: 'Prime' }] },
    { label: 'Emailed',         f: [{ field: 'email_sent',  op: 'equals',       value: 'Yes' }] },
    { label: 'Not Contacted',   f: [{ field: 'email_sent',  op: 'is_empty',     value: '' }, { field: 'call_done', op: 'is_empty', value: '' }], c: 'AND' },
    { label: 'CSV Imports',     f: [{ field: 'vendor_type', op: 'not_equals',   value: 'Core' }] },
  ];

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'Inter', fontSize: 14, color: C.text, fontWeight: 700 }}>Advanced Filters</span>
          <span style={{ fontSize: 13, color: C.textMuted }}>Match</span>
          <select value={conjunction} onChange={e => setConjunction(e.target.value)} style={{ ...inp, padding: '5px 8px', fontWeight: 600 }}>
            <option value="AND">ALL conditions (AND)</option>
            <option value="OR">ANY condition (OR)</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={add} style={{ padding: '6px 14px', borderRadius: 8, background: C.primaryLight, border: `1px solid ${C.primaryBorder}`, color: C.primary, cursor: 'pointer', fontFamily: 'Inter', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}><Plus size={13} /> Add Filter</button>
          <button onClick={() => setFilters([])} style={{ padding: '6px 12px', borderRadius: 8, background: C.dangerLight, border: `1px solid ${C.dangerBorder}`, color: C.danger, cursor: 'pointer', fontFamily: 'Inter', fontSize: 13 }}>Clear All</button>
          <button onClick={onClose} style={{ background: 'none', border: `1px solid ${C.border}`, color: C.textMuted, cursor: 'pointer', borderRadius: 8, padding: '6px 8px', display: 'flex' }}><X size={13} /></button>
        </div>
      </div>

      {filters.length === 0 && <div style={{ padding: '8px 0 6px', color: C.textMuted, fontFamily: 'Inter', fontSize: 13 }}>No filters active. Use a quick preset or add a filter.</div>}

      {filters.map((f, i) => {
        const fd = FILTER_FIELDS.find(x => x.key === f.field) || FILTER_FIELDS[0];
        const ops = fd.type === 'select' ? SELECT_OPS : TEXT_OPS;
        const needsVal = !['is_empty', 'is_not_empty'].includes(f.op);
        return (
          <div key={f.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, padding: '10px 14px', background: C.bg, borderRadius: 10, border: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 13, color: C.textMuted, fontFamily: 'Inter', minWidth: 42, fontWeight: 600 }}>{i === 0 ? 'Where' : conjunction}</span>
            <select value={f.field} onChange={e => upd(f.id, 'field', e.target.value)} style={{ ...inp, minWidth: 130 }}>{FILTER_FIELDS.map(ff => <option key={ff.key} value={ff.key}>{ff.label}</option>)}</select>
            <select value={f.op} onChange={e => upd(f.id, 'op', e.target.value)} style={{ ...inp, minWidth: 160 }}>{ops.map(op => <option key={op.key} value={op.key}>{op.label}</option>)}</select>
            {needsVal && (fd.type === 'select'
              ? <select value={f.value} onChange={e => upd(f.id, 'value', e.target.value)} style={{ ...inp, minWidth: 120 }}>{(fd.options || []).map(o => <option key={o} value={o}>{o || '(empty)'}</option>)}</select>
              : <input value={f.value || ''} onChange={e => upd(f.id, 'value', e.target.value)} placeholder="value..." style={{ ...inp, flex: 1, minWidth: 120 }} />
            )}
            {!needsVal && <div style={{ flex: 1 }} />}
            <button onClick={() => remove(f.id)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: 4, display: 'flex', borderRadius: 6 }}
              onMouseEnter={e => e.currentTarget.style.color = C.danger}
              onMouseLeave={e => e.currentTarget.style.color = C.textMuted}><X size={14} /></button>
          </div>
        );
      })}

      <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 11, color: C.textMuted, fontFamily: 'Inter', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Quick Presets</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => { setFilters(p.f.map((fi, i) => ({ ...fi, id: Date.now() + i }))); if (p.c) setConjunction(p.c); }} style={{ padding: '5px 12px', borderRadius: 20, background: C.surface, border: `1px solid ${C.border}`, color: C.textSecondary, cursor: 'pointer', fontFamily: 'Inter', fontSize: 13, transition: 'all 0.1s' }}
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
  const fc = vs => { for (const v of vs) { const i = hdrs.indexOf(v); if (i !== -1) return i; } return -1; };
  const cols = {}; for (const [f, v] of Object.entries(colMap)) cols[f] = fc(v);
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
          <h2 style={{ margin: 0, fontFamily: 'Inter', color: C.text, fontSize: 20, fontWeight: 700 }}>Import CSV</h2>
          <button onClick={onClose} style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.textMuted, cursor: 'pointer', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {['Upload', 'Preview', 'Options'].map((s, i) => (
            <div key={s} style={{ flex: 1, padding: '7px 0', textAlign: 'center', borderRadius: 8, fontSize: 13, fontFamily: 'Inter', fontWeight: 600, background: step === i+1 ? C.primaryLight : C.bg, border: `1px solid ${step === i+1 ? C.primaryBorder : C.border}`, color: step === i+1 ? C.primary : step > i+1 ? C.success : C.textMuted }}>
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
              <div style={{ fontFamily: 'Inter', color: C.text, fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Click to browse CSV file</div>
              <div style={{ fontFamily: 'Inter', color: C.textMuted, fontSize: 13 }}>Auto-detects: Name, Company, Email, Phone, Title, LinkedIn, Location</div>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />
            </div>
            <div style={{ marginTop: 14, padding: 16, background: C.coreLight, borderRadius: 10, border: `1px solid ${C.coreBorder}` }}>
              <div style={{ fontSize: 13, color: C.core, fontFamily: 'Inter', fontWeight: 600, marginBottom: 6 }}>🏠 Your original 74 vendors are tagged as "Core"</div>
              <div style={{ fontSize: 12, color: C.textSecondary, fontFamily: 'Inter', lineHeight: 1.6 }}>CSV imports will NOT touch your Core vendors. Filter by "Core Vendors" preset to see just them. Use "CSV Imports" preset to see only CSV-imported vendors.</div>
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
                <button onClick={() => setStep(1)} style={{ padding: '7px 14px', borderRadius: 8, background: C.bg, border: `1px solid ${C.border}`, color: C.textSecondary, cursor: 'pointer', fontFamily: 'Inter', fontSize: 13 }}>← Back</button>
                <button onClick={() => setStep(3)} style={{ padding: '7px 16px', borderRadius: 8, background: C.primary, border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'Inter', fontWeight: 600, fontSize: 13 }}>Continue →</button>
              </div>
            </div>
            <div style={{ background: C.bg, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}`, maxHeight: 340, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: C.surface }}>{['Name', 'Company', 'Email', 'Phone', 'Title'].map(h => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, fontFamily: 'Inter', color: C.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, background: C.surface }}>{h}</th>)}</tr></thead>
                <tbody>
                  {parsed.map((v, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '7px 12px', fontSize: 13, color: C.text, fontWeight: 500, fontFamily: 'Inter' }}>{v.name || '—'}</td>
                      <td style={{ padding: '7px 12px', fontSize: 13, color: C.primary, fontFamily: 'Inter' }}>{v.company || '—'}</td>
                      <td style={{ padding: '7px 12px', fontSize: 13, color: v.email ? C.teal : C.textMuted, fontFamily: 'Inter' }}>{v.email || '✗'}</td>
                      <td style={{ padding: '7px 12px', fontSize: 13, color: v.phone ? C.textSecondary : C.textMuted, fontFamily: 'Inter' }}>{v.phone || '✗'}</td>
                      <td style={{ padding: '7px 12px', fontSize: 12, color: C.textMuted, fontFamily: 'Inter' }}>{v.title || '—'}</td>
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
              { key: 'addToAll', val: addToAll, set: setAddToAll, title: 'Add to All Vendors', desc: 'Visible to everyone. Delete from any view removes from database.', color: C.primary, lc: C.primaryLight, bc: C.primaryBorder },
              { key: 'wishlist', val: createWishlist, set: setCreateWishlist, title: 'Save as Wishlist Sheet', desc: 'Group in a named sheet for easy reference', color: C.purple, lc: C.purpleLight, bc: C.purpleBorder },
            ].map(({ key, val, set, title, desc, color, lc, bc }) => (
              <div key={key} onClick={() => set(!val)} style={{ padding: 16, background: val ? lc : C.bg, border: `2px solid ${val ? bc : C.border}`, borderRadius: 12, marginBottom: 12, cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ width: 20, height: 20, borderRadius: 6, background: val ? color : C.surface, border: `2px solid ${val ? color : C.borderStrong}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0, color: '#fff', marginTop: 2 }}>{val ? '✓' : ''}</div>
                <div><div style={{ fontFamily: 'Inter', color: C.text, fontSize: 14, fontWeight: 600 }}>{title}</div><div style={{ fontFamily: 'Inter', color: C.textMuted, fontSize: 13, marginTop: 3, lineHeight: 1.5 }}>{desc}</div></div>
              </div>
            ))}
            {createWishlist && (
              <div style={{ background: C.purpleLight, border: `1px solid ${C.purpleBorder}`, borderRadius: 12, padding: 14, marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  {['new', 'existing'].map(m => <button key={m} onClick={() => setWishlistMode(m)} style={{ padding: '6px 14px', borderRadius: 8, fontFamily: 'Inter', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: wishlistMode === m ? C.purple : C.surface, border: `1px solid ${wishlistMode === m ? C.purple : C.border}`, color: wishlistMode === m ? '#fff' : C.textSecondary }}>{m === 'new' ? '+ New Sheet' : 'Add to Existing'}</button>)}
                </div>
                {wishlistMode === 'new'
                  ? <input value={wishlistName} onChange={e => setWishlistName(e.target.value)} placeholder="Sheet name e.g. April Outreach..." style={inp} />
                  : <select value={existingWishlist} onChange={e => setExistingWishlist(e.target.value)} style={inp}><option value="">Select a sheet...</option>{wishlists.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
                }
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

// ─── VENDOR MODAL ─────────────────────────────────────────────────
function VendorModal({ vendor, onSave, onClose }) {
  const [form, setForm] = useState(vendor || { name: '', title: '', company: '', email: '', phone: '', website: '', emailSent: '', followUp: '', callDone: '', resumeRole: '', notes: '', vendorType: '' });
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const inp = { display: 'block', width: '100%', marginTop: 4, padding: '9px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14, fontFamily: 'Inter', outline: 'none', boxSizing: 'border-box' };
  const lbl = { fontSize: 12, color: C.textMuted, fontFamily: 'Inter', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 32, width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontFamily: 'Inter', color: C.text, fontSize: 20, fontWeight: 700 }}>{vendor ? 'Edit Vendor' : 'Add New Vendor'}</h2>
          <button onClick={onClose} style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.textMuted, cursor: 'pointer', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[{ key: 'name', label: 'Full Name *', placeholder: 'John Smith', span: false }, { key: 'title', label: 'Job Title', placeholder: 'Senior Recruiter', span: false }, { key: 'company', label: 'Company *', placeholder: 'ABC Staffing', span: false }, { key: 'email', label: 'Email', placeholder: 'john@company.com', span: false }, { key: 'phone', label: 'Phone', placeholder: '+1 (555) 000-0000', span: false }, { key: 'website', label: 'Website / LinkedIn', placeholder: 'www.company.com', span: false }, { key: 'resumeRole', label: 'Resume Sent For Role', placeholder: 'Java Developer...', span: true }, { key: 'notes', label: 'Notes', placeholder: 'Any notes...', span: true }].map(({ key, label, placeholder, span }) => (
            <div key={key} style={{ gridColumn: span ? '1/-1' : 'auto' }}>
              <label style={lbl}>{label}</label>
              <input value={form[key] || ''} onChange={e => f(key, e.target.value)} placeholder={placeholder} style={inp} onFocus={e => e.target.style.borderColor = C.primary} onBlur={e => e.target.style.borderColor = C.border} />
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginTop: 16 }}>
          {[{ key: 'vendorType', label: 'Type', opts: ['', 'Normal', 'Prime', 'Core'] }, { key: 'emailSent', label: 'Email Sent?', opts: STATUS_OPTIONS }, { key: 'followUp', label: 'Follow-Up?', opts: STATUS_OPTIONS }, { key: 'callDone', label: 'Call Done?', opts: STATUS_OPTIONS }].map(({ key, label, opts }) => (
            <div key={key}>
              <label style={lbl}>{label}</label>
              <select value={form[key] || ''} onChange={e => f(key, e.target.value)} style={{ ...inp, marginTop: 4 }}>{opts.map(o => <option key={o} value={o}>{o || '—'}</option>)}</select>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 24px', borderRadius: 10, background: C.bg, border: `1px solid ${C.border}`, color: C.textSecondary, cursor: 'pointer', fontFamily: 'Inter', fontWeight: 500, fontSize: 14 }}>Cancel</button>
          <button onClick={() => { if (!form.name || !form.company) { alert('Name and Company required'); return; } onSave(form); }} style={{ padding: '10px 28px', borderRadius: 10, background: C.primary, border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'Inter', fontWeight: 600, fontSize: 14 }}>{vendor ? 'Save Changes' : 'Add Vendor'}</button>
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 32, width: '100%', maxWidth: 660, maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontFamily: 'Inter', color: C.text, fontSize: 20, fontWeight: 700 }}>Email Templates</h2>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { const t = { id: Date.now(), title: 'New Template', body: '' }; sv([...templates, t]); setEditing(t.id); }} style={{ padding: '8px 16px', borderRadius: 8, background: C.primary, border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'Inter', fontSize: 13, fontWeight: 600 }}>+ New</button>
            <button onClick={onClose} style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.textMuted, cursor: 'pointer', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
          </div>
        </div>
        {templates.map(t => (
          <div key={t.id} style={{ background: C.bg, borderRadius: 14, padding: 20, marginBottom: 14, border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              {editing === t.id ? <input value={t.title} onChange={e => sv(templates.map(x => x.id === t.id ? { ...x, title: e.target.value } : x))} style={{ background: C.surface, border: `1px solid ${C.primary}`, borderRadius: 8, color: C.text, padding: '6px 10px', fontFamily: 'Inter', fontSize: 14, fontWeight: 700, outline: 'none' }} />
                : <h3 style={{ margin: 0, fontFamily: 'Inter', color: C.text, fontSize: 15, fontWeight: 700 }}>{t.title}</h3>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { navigator.clipboard.writeText(t.body); setCopied(t.id); setTimeout(() => setCopied(null), 2000); }} style={{ padding: '5px 14px', borderRadius: 8, background: copied === t.id ? C.successLight : C.surface, border: `1px solid ${copied === t.id ? C.successBorder : C.border}`, color: copied === t.id ? C.success : C.textSecondary, cursor: 'pointer', fontSize: 13, fontFamily: 'Inter', fontWeight: 500 }}>{copied === t.id ? '✓ Copied' : 'Copy'}</button>
                <button onClick={() => setEditing(editing === t.id ? null : t.id)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.textSecondary, cursor: 'pointer', padding: '5px 10px', fontSize: 13 }}>{editing === t.id ? '✓ Done' : 'Edit'}</button>
                <button onClick={() => sv(templates.filter(x => x.id !== t.id))} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 16 }}>🗑️</button>
              </div>
            </div>
            {editing === t.id ? <textarea value={t.body} onChange={e => sv(templates.map(x => x.id === t.id ? { ...x, body: e.target.value } : x))} rows={7} style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, padding: 12, fontFamily: 'Inter', fontSize: 14, resize: 'vertical', boxSizing: 'border-box', outline: 'none', lineHeight: 1.6 }} />
              : <pre style={{ margin: 0, fontFamily: 'Inter', fontSize: 13, color: C.textSecondary, whiteSpace: 'pre-wrap', lineHeight: 1.7, maxHeight: 90, overflow: 'hidden' }}>{t.body}</pre>}
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
    <div style={{ background: C.purpleLight, border: `1px solid ${C.purpleBorder}`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: min ? 'none' : `1px solid ${C.purpleBorder}` }}>
        <span style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 600, color: C.purple }}>Thoughts & Notes</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {!min && <button onClick={() => { lsave('thoughts', text); setSaved(true); setTimeout(() => setSaved(false), 2000); }} style={{ padding: '3px 10px', borderRadius: 6, background: saved ? C.successLight : C.purpleLight, border: `1px solid ${saved ? C.successBorder : C.purpleBorder}`, color: saved ? C.success : C.purple, cursor: 'pointer', fontSize: 12, fontFamily: 'Inter', fontWeight: 600 }}>{saved ? '✓ Saved' : 'Save'}</button>}
          <button onClick={() => setMin(!min)} style={{ background: 'none', border: 'none', color: C.purple, cursor: 'pointer', fontSize: 13, display: 'flex' }}>{min ? <ChevronDown size={14} /> : <ChevronUp size={14} />}</button>
        </div>
      </div>
      {!min && (
        <div style={{ padding: '12px 14px 14px' }}>
          <div style={{ fontSize: 12, color: C.purple, fontFamily: 'Inter', fontStyle: 'italic', marginBottom: 8, padding: '6px 10px', background: 'rgba(124,58,237,0.08)', borderRadius: 7, borderLeft: `3px solid ${C.purple}` }}>{quotes[qi]}</div>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder={"Write your thoughts... Hindi mein bhi! 🙏"} style={{ width: '100%', minHeight: 80, background: C.surface, border: `1px solid ${C.purpleBorder}`, borderRadius: 8, color: C.text, padding: '8px 10px', fontFamily: 'Inter', fontSize: 14, resize: 'vertical', outline: 'none', lineHeight: 1.6, boxSizing: 'border-box' }} />
        </div>
      )}
    </div>
  );
}

// ─── NOTES CELL (debounced, no reload) ───────────────────────────
function NotesCell({ value, onSave }) {
  const [local, setLocal] = useState(value || '');
  const debouncedVal = useDebounce(local, 800);
  const mounted = useRef(false);

  useEffect(() => { setLocal(value || ''); }, [value]);

  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    onSave(debouncedVal);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedVal]);

  return (
    <textarea value={local} onChange={e => setLocal(e.target.value)} placeholder="Add notes..." rows={3}
      style={{ width: '100%', maxWidth: 560, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, padding: '8px 10px', fontFamily: 'Inter', fontSize: 14, resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.5 }}
      onFocus={e => e.target.style.borderColor = C.primary}
      onBlur={e => e.target.style.borderColor = C.border} />
  );
}

// ─── VENDOR TABLE ─────────────────────────────────────────────────
function VendorTable({ vendors, onUpdate, onEdit, onDelete, onBulkDelete, onBulkTag, onUndo, canUndo }) {
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
  const [showTimestamps, setShowTimestamps] = useState(false);

  // COLUMN WIDTHS — resizable
  const [colWidths, setColWidths] = useState({
    num: 50, name: 170, company: 160, title: 160, email: 210, phone: 160,
    type: 120, emailed: 100, followup: 100, called: 100, role: 140,
    created: 130, updated: 130, actions: 90,
  });
  const setColW = (col, w) => setColWidths(prev => ({ ...prev, [col]: w }));

  const primeCount = vendors.filter(v => v.vendor_type === 'Prime').length;
  const normalCount = vendors.filter(v => v.vendor_type === 'Normal').length;
  const coreCount = vendors.filter(v => v.vendor_type === 'Core').length;
  const withEmail = vendors.filter(v => v.email).length;
  const withPhone = vendors.filter(v => v.phone).length;

  const filtered = useMemo(() => vendors.filter(v => {
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
  }).sort((a, b) => {
    const av = (a[sortCol] || '').toString().toLowerCase(), bv = (b[sortCol] || '').toString().toLowerCase();
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  }), [vendors, subView, search, advFilters, conjunction, sortCol, sortDir]);

  const toggleSort = col => { if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortCol(col); setSortDir('asc'); } };
  const toggleSelect = id => { const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s); };
  const toggleAll = () => { if (selected.size === filtered.length && filtered.length > 0) setSelected(new Set()); else setSelected(new Set(filtered.map(v => v.id))); };

  const handleBulkTag = (field, value) => { onBulkTag([...selected], field, value); };
  const handleBulkDelete = () => { onBulkDelete([...selected]); setSelected(new Set()); };

  const SUBVIEWS = [
    { key: 'all',    label: 'All',       count: vendors.length, color: C.primary },
    { key: 'core',   label: '🏠 Core',   count: coreCount,      color: C.core },
    { key: 'prime',  label: '⭐ Prime',  count: primeCount,     color: C.gold },
    { key: 'normal', label: '● Normal',  count: normalCount,    color: C.teal },
  ];

  return (
    <div>
      {/* SUB TABS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        {SUBVIEWS.map(({ key, label, count, color }) => (
          <button key={key} onClick={() => setSubView(key)} style={{ padding: '7px 16px', borderRadius: 8, fontFamily: 'Inter', fontSize: 14, fontWeight: 600, cursor: 'pointer', background: subView === key ? color : C.surface, border: `1px solid ${subView === key ? color : C.border}`, color: subView === key ? '#fff' : C.textSecondary, boxShadow: subView === key ? `0 2px 8px ${color}30` : 'none' }}>
            {label} <span style={{ marginLeft: 6, background: subView === key ? 'rgba(255,255,255,0.25)' : C.bg, color: subView === key ? '#fff' : C.textMuted, borderRadius: 20, padding: '1px 7px', fontSize: 12, fontWeight: 600 }}>{count}</span>
          </button>
        ))}

        <div style={{ display: 'flex', gap: 6, marginLeft: 4 }}>
          <span style={{ fontSize: 13, color: C.teal, fontFamily: 'Inter', padding: '5px 10px', background: C.tealLight, borderRadius: 20, border: `1px solid ${C.tealBorder}`, fontWeight: 500 }}>{withEmail} emails</span>
          <span style={{ fontSize: 13, color: C.primary, fontFamily: 'Inter', padding: '5px 10px', background: C.primaryLight, borderRadius: 20, border: `1px solid ${C.primaryBorder}`, fontWeight: 500 }}>{withPhone} phones</span>
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

      {/* BULK ACTION BAR */}
      {selected.size > 0 && (
        <div style={{ marginBottom: 12 }}>
          <BulkActionBar count={selected.size} onClear={() => setSelected(new Set())} onBulkDelete={handleBulkDelete} onBulkTag={handleBulkTag} />
        </div>
      )}

      {/* SEARCH */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.textMuted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, company, email, phone, title..." style={{ width: '100%', padding: '9px 14px 9px 38px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, fontFamily: 'Inter', outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = C.primary}
            onBlur={e => e.target.style.borderColor = C.border} />
        </div>
        <span style={{ fontSize: 13, color: C.textMuted, fontFamily: 'Inter', whiteSpace: 'nowrap' }}>{filtered.length} / {vendors.length}</span>
      </div>

      {/* TABLE */}
      <div style={{ background: C.surface, borderRadius: 14, overflow: 'hidden', border: `1px solid ${C.border}`, boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ background: C.bg }}>
                <th style={{ width: 44, padding: '10px 12px', background: C.bg, borderBottom: `1px solid ${C.border}`, textAlign: 'center' }}>
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} style={{ cursor: 'pointer', accentColor: C.primary, width: 15, height: 15 }} />
                </th>
                <ResizableTH width={colWidths.num} onResize={w => setColW('num', w)}>#</ResizableTH>
                <ResizableTH width={colWidths.name} onResize={w => setColW('name', w)} col="name" sortCol={sortCol} sortDir={sortDir} onSort={() => toggleSort('name')}>Name</ResizableTH>
                <ResizableTH width={colWidths.company} onResize={w => setColW('company', w)} col="company" sortCol={sortCol} sortDir={sortDir} onSort={() => toggleSort('company')}>Company</ResizableTH>
                <ResizableTH width={colWidths.title} onResize={w => setColW('title', w)} col="title" sortCol={sortCol} sortDir={sortDir} onSort={() => toggleSort('title')}>Title</ResizableTH>
                <ResizableTH width={colWidths.email} onResize={w => setColW('email', w)} col="email" sortCol={sortCol} sortDir={sortDir} onSort={() => toggleSort('email')}>Email</ResizableTH>
                <ResizableTH width={colWidths.phone} onResize={w => setColW('phone', w)} col="phone" sortCol={sortCol} sortDir={sortDir} onSort={() => toggleSort('phone')}>Phone</ResizableTH>
                <ResizableTH width={colWidths.type} onResize={w => setColW('type', w)} col="vendor_type" sortCol={sortCol} sortDir={sortDir} onSort={() => toggleSort('vendor_type')}>Type</ResizableTH>
                <ResizableTH width={colWidths.emailed} onResize={w => setColW('emailed', w)} col="email_sent" sortCol={sortCol} sortDir={sortDir} onSort={() => toggleSort('email_sent')}>Emailed</ResizableTH>
                <ResizableTH width={colWidths.followup} onResize={w => setColW('followup', w)} col="follow_up" sortCol={sortCol} sortDir={sortDir} onSort={() => toggleSort('follow_up')}>Follow-Up</ResizableTH>
                <ResizableTH width={colWidths.called} onResize={w => setColW('called', w)} col="call_done" sortCol={sortCol} sortDir={sortDir} onSort={() => toggleSort('call_done')}>Called</ResizableTH>
                <ResizableTH width={colWidths.role} onResize={w => setColW('role', w)} col="resume_role" sortCol={sortCol} sortDir={sortDir} onSort={() => toggleSort('resume_role')}>Resume Role</ResizableTH>
                {showTimestamps && <ResizableTH width={colWidths.created} onResize={w => setColW('created', w)} col="created_at" sortCol={sortCol} sortDir={sortDir} onSort={() => toggleSort('created_at')}>Created</ResizableTH>}
                {showTimestamps && <ResizableTH width={colWidths.updated} onResize={w => setColW('updated', w)} col="updated_at" sortCol={sortCol} sortDir={sortDir} onSort={() => toggleSort('updated_at')}>Updated</ResizableTH>}
                <ResizableTH width={colWidths.actions} onResize={w => setColW('actions', w)}>Actions</ResizableTH>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v, i) => {
                const isExp = expandedRow === v.id;
                const isSel = selected.has(v.id);
                const rowBg = isSel ? C.primaryLight : i % 2 === 0 ? C.surface : '#fafafa';
                return (
                  <React.Fragment key={v.id}>
                    <tr style={{ background: rowBg, borderBottom: isExp ? 'none' : `1px solid ${C.border}`, transition: 'background 0.1s' }}
                      onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = C.surfaceHover; }}
                      onMouseLeave={e => { e.currentTarget.style.background = rowBg; }}>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}><input type="checkbox" checked={isSel} onChange={() => toggleSelect(v.id)} style={{ cursor: 'pointer', accentColor: C.primary, width: 15, height: 15 }} /></td>
                      <td style={{ padding: '10px 12px', color: C.textMuted, fontSize: 13, fontWeight: 600, fontFamily: 'Inter', overflow: 'hidden' }}>{i + 1}</td>
                      <td style={{ padding: '10px 12px', overflow: 'hidden' }}>
                        <div style={{ fontWeight: 600, color: C.text, fontSize: 14, fontFamily: 'Inter', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</div>
                      </td>
                      <td style={{ padding: '10px 12px', overflow: 'hidden' }}>
                        <div style={{ fontWeight: 600, color: C.primary, fontSize: 14, fontFamily: 'Inter', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.company}</div>
                        {v.website && <a href={v.website.startsWith('http') ? v.website : `https://${v.website}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: C.teal, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{v.website.replace('https://www.linkedin.com/in/', 'li/').replace('https://', '').substring(0, 22)}</a>}
                      </td>
                      <td style={{ padding: '10px 12px', overflow: 'hidden' }}>
                        <div style={{ fontSize: 13, color: C.textSecondary, fontFamily: 'Inter', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title || <span style={{ color: C.textMuted }}>—</span>}</div>
                      </td>
                      {/* EMAIL — no icon */}
                      <td style={{ padding: '10px 12px', overflow: 'hidden' }}>
                        {v.email
                          ? <a href={`mailto:${v.email}`} style={{ fontSize: 13, color: C.teal, fontFamily: 'Inter', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{v.email}</a>
                          : <span style={{ fontSize: 13, color: C.textMuted }}>—</span>}
                      </td>
                      {/* PHONE — no icon */}
                      <td style={{ padding: '10px 12px', overflow: 'hidden' }}>
                        {v.phone
                          ? <div style={{ fontSize: 13, color: C.textSecondary, fontFamily: 'Inter', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.phone}</div>
                          : <span style={{ fontSize: 13, color: C.textMuted }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 12px', overflow: 'hidden' }}><Pill value={v.vendor_type || ''} onChange={val => onUpdate(v.id, 'vendorType', val)} options={['', 'Normal', 'Prime', 'Core']} styleMap={TYPE_STYLE} /></td>
                      <td style={{ padding: '10px 12px', overflow: 'hidden' }}><Pill value={v.email_sent || ''} onChange={val => onUpdate(v.id, 'emailSent', val)} options={STATUS_OPTIONS} styleMap={STATUS_STYLE} /></td>
                      <td style={{ padding: '10px 12px', overflow: 'hidden' }}><Pill value={v.follow_up || ''} onChange={val => onUpdate(v.id, 'followUp', val)} options={STATUS_OPTIONS} styleMap={STATUS_STYLE} /></td>
                      <td style={{ padding: '10px 12px', overflow: 'hidden' }}><Pill value={v.call_done || ''} onChange={val => onUpdate(v.id, 'callDone', val)} options={STATUS_OPTIONS} styleMap={STATUS_STYLE} /></td>
                      <td style={{ padding: '10px 12px', overflow: 'hidden' }}>
                        {editingCell === v.id
                          ? <input autoFocus defaultValue={v.resume_role} onBlur={e => { onUpdate(v.id, 'resumeRole', e.target.value); setEditingCell(null); }} onKeyDown={e => e.key === 'Enter' && e.target.blur()} style={{ width: '100%', background: C.surface, border: `1px solid ${C.primary}`, borderRadius: 6, color: C.text, padding: '5px 8px', fontSize: 14, fontFamily: 'Inter', outline: 'none', boxSizing: 'border-box' }} />
                          : <div onClick={() => setEditingCell(v.id)} style={{ fontSize: 13, color: v.resume_role ? C.purple : C.textMuted, cursor: 'pointer', fontFamily: 'Inter', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '2px 4px', borderRadius: 4, border: '1px dashed transparent' }}
                              onMouseEnter={e => e.currentTarget.style.borderColor = C.border}
                              onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}>
                              {v.resume_role || <span style={{ color: C.textMuted }}>+ Add role</span>}
                            </div>
                        }
                      </td>
                      {showTimestamps && (
                        <td style={{ padding: '10px 12px', overflow: 'hidden' }}>
                          <div style={{ fontSize: 12, color: C.textMuted, fontFamily: 'Inter' }} title={formatDate(v.created_at)}>{timeAgo(v.created_at)}</div>
                        </td>
                      )}
                      {showTimestamps && (
                        <td style={{ padding: '10px 12px', overflow: 'hidden' }}>
                          <div style={{ fontSize: 12, color: C.textMuted, fontFamily: 'Inter' }} title={formatDate(v.updated_at)}>{timeAgo(v.updated_at)}</div>
                        </td>
                      )}
                      <td style={{ padding: '10px 12px', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => setExpandedRow(isExp ? null : v.id)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, color: C.textMuted, cursor: 'pointer', padding: '3px 6px', display: 'flex', alignItems: 'center' }}>{isExp ? <ChevronUp size={12} /> : <ChevronDown size={12} />}</button>
                          <button onClick={() => onEdit(v)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, color: C.textMuted, cursor: 'pointer', padding: '3px 6px', display: 'flex', alignItems: 'center' }}><Edit2 size={12} /></button>
                          <button onClick={() => setDeleteConfirm(v.id)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: '3px 5px', display: 'flex', alignItems: 'center', borderRadius: 6 }}
                            onMouseEnter={e => { e.currentTarget.style.color = C.danger; e.currentTarget.style.background = C.dangerLight; }}
                            onMouseLeave={e => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.background = 'none'; }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExp && (
                      <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                        <td colSpan={showTimestamps ? 15 : 13} style={{ padding: '14px 20px 18px 58px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                            <div>
                              <div style={{ fontSize: 12, color: C.textMuted, fontFamily: 'Inter', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Notes</div>
                              <NotesCell value={v.notes} onSave={val => onUpdate(v.id, 'notes', val)} />
                            </div>
                            <div style={{ fontSize: 13, color: C.textSecondary, fontFamily: 'Inter', lineHeight: 2 }}>
                              {v.website && <div><Globe size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} /><a href={v.website.startsWith('http') ? v.website : `https://${v.website}`} target="_blank" rel="noreferrer" style={{ color: C.primary }}>{v.website}</a></div>}
                              {v.created_at && <div><Calendar size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />Added: <strong style={{ color: C.text }}>{formatDate(v.created_at)}</strong></div>}
                              {v.updated_at && <div><Clock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />Updated: <strong style={{ color: C.text }}>{formatDate(v.updated_at)}</strong></div>}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    {deleteConfirm === v.id && (
                      <tr style={{ background: C.dangerLight }}>
                        <td colSpan={showTimestamps ? 15 : 13} style={{ padding: '10px 20px' }}>
                          <span style={{ color: C.danger, fontSize: 14, fontFamily: 'Inter' }}>Delete <strong>{v.name}</strong> permanently from all views? &nbsp;</span>
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
              ? <div><div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>No vendors match these filters.<br /><button onClick={() => setAdvFilters([])} style={{ marginTop: 12, padding: '7px 18px', borderRadius: 8, background: C.primaryLight, border: `1px solid ${C.primaryBorder}`, color: C.primary, cursor: 'pointer', fontFamily: 'Inter', fontSize: 13, fontWeight: 600 }}>Clear Filters</button></div>
              : 'No vendors found'
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
    try {
      const [{ data: vData }, { data: wData }, { data: wvData }] = await Promise.all([
        supabase.from('vendors').select('*').order('id'),
        supabase.from('wishlists').select('*').order('created_at'),
        supabase.from('wishlist_vendors').select('*'),
      ]);
      if (vData) {
        if (vData.length === 0) {
          // Seed with Core tag for original vendors
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

  // Realtime — but DON'T reload on every change (causes notes flicker)
  // Only reload wishlists and wishlist_vendors in realtime; vendor updates are local
  useEffect(() => {
    const ch = supabase.channel('rt-meta')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vendors' }, payload => {
        setVendors(v => v.find(x => x.id === payload.new.id) ? v : [...v, payload.new]);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'vendors' }, payload => {
        setVendors(v => v.filter(x => x.id !== payload.old.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wishlists' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wishlist_vendors' }, loadAll)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [loadAll]);

  const updateVendor = useCallback(async (id, field, value) => {
    setVendors(v => v.map(x => x.id === id ? { ...x, [field]: value } : x));
    const dbField = { emailSent: 'email_sent', followUp: 'follow_up', callDone: 'call_done', resumeRole: 'resume_role', vendorType: 'vendor_type' }[field] || field;
    await supabase.from('vendors').update({ [dbField]: value }).eq('id', id);
  }, []);

  const bulkTag = async (ids, field, value) => {
    setSyncing(true);
    const dbField = { vendor_type: 'vendor_type', email_sent: 'email_sent', follow_up: 'follow_up', call_done: 'call_done', resume_role: 'resume_role' }[field] || field;
    setVendors(v => v.map(x => ids.includes(x.id) ? { ...x, [dbField]: value } : x));
    await supabase.from('vendors').update({ [dbField]: value }).in('id', ids);
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
    showToast(`${ids.length} vendors deleted`, 'danger');
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
    showToast(`Imported ${ids.length} vendors! Use Undo to reverse.`);
  };

  const handleUndo = async () => {
    if (!lastImportIds.length) return;
    if (!window.confirm(`Undo last import? Delete ${lastImportIds.length} vendors permanently.`)) return;
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
  const coreCount = vendors.filter(v => v.vendor_type === 'Core').length;
  const emailsSent = vendors.filter(v => v.email_sent === 'Yes').length;
  const withEmail = vendors.filter(v => v.email).length;

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: `3px solid ${C.primaryBorder}`, borderTop: `3px solid ${C.primary}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <div style={{ fontFamily: 'Inter', color: C.primary, fontSize: 16, fontWeight: 600, fontStyle: 'italic' }}>Vincit qui se vincit</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Inter, sans-serif' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes slideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}*{box-sizing:border-box}::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:${C.bg}}::-webkit-scrollbar-thumb{background:${C.borderStrong};border-radius:3px}th{position:relative}th .resize-handle{position:absolute;right:0;top:0;bottom:0;width:5px;cursor:col-resize}`}</style>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: C.surface, border: `1px solid ${C.border}`, borderLeft: `4px solid ${toast.color}`, borderRadius: 10, padding: '12px 20px', color: C.text, fontFamily: 'Inter', fontSize: 14, fontWeight: 500, zIndex: 9999, boxShadow: '0 8px 32px rgba(0,0,0,0.10)', animation: 'slideUp 0.3s ease' }}>
          {toast.msg}
        </div>
      )}

      {/* HEADER */}
      <div style={{ background: C.sidebar, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1900, margin: '0 auto', padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 58 }}>
          <div>
            <div style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: 800, color: '#fff', fontStyle: 'italic' }}><span style={{ color: '#60a5fa' }}>Vincit</span> qui se vincit</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.5, textTransform: 'uppercase' }}>IT Staffing · ConsultAdd {syncing ? <span style={{ color: '#fbbf24' }}>· saving</span> : <span style={{ color: '#4ade80' }}>· live</span>}</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setShowCSV(true)} style={{ padding: '7px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer', fontFamily: 'Inter', fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}><Upload size={14} /> Import CSV</button>
            <button onClick={() => setShowEmail(true)} style={{ padding: '7px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer', fontFamily: 'Inter', fontSize: 14, fontWeight: 500 }}>Templates</button>
            <button onClick={() => { setEditingVendor(null); setModal('add'); }} style={{ padding: '7px 20px', borderRadius: 8, background: C.primary, border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'Inter', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={15} /> Add Vendor</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1900, margin: '0 auto', padding: '20px 28px', display: 'grid', gridTemplateColumns: '210px 1fr', gap: 22, alignItems: 'start' }}>

        {/* SIDEBAR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, position: 'sticky', top: 78 }}>
          {/* STATS */}
          {[
            { label: 'Total Vendors', value: total, icon: '🏢', color: C.primary },
            { label: 'Core Vendors', value: coreCount, icon: '🏠', color: C.core, tip: 'Your original 74' },
            { label: 'Prime Vendors', value: primeCount, icon: '⭐', color: C.gold },
            { label: 'Wishlists', value: wishlists.length, icon: '📋', color: C.purple },
            { label: 'Have Email', value: withEmail, icon: '📧', color: C.teal },
            { label: 'Emailed', value: emailsSent, icon: '✅', color: C.success },
          ].map(s => (
            <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>{s.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color, fontFamily: 'Inter', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{s.label} {s.tip && <span style={{ color: C.core, fontSize: 11 }}>({s.tip})</span>}</div>
              </div>
            </div>
          ))}

          {/* VIEWS */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', marginTop: 4 }}>
            <div style={{ padding: '9px 14px', fontSize: 11, color: C.textMuted, fontFamily: 'Inter', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `1px solid ${C.border}`, background: C.bg }}>Views</div>
            <button onClick={() => setActiveView('all')} style={{ display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left', background: activeView === 'all' ? C.primaryLight : 'transparent', border: 'none', borderBottom: `1px solid ${C.border}`, color: activeView === 'all' ? C.primary : C.textSecondary, fontFamily: 'Inter', fontSize: 14, fontWeight: activeView === 'all' ? 600 : 400, cursor: 'pointer' }}>
              🌐 All Vendors <span style={{ float: 'right', fontSize: 13, color: activeView === 'all' ? C.primary : C.textMuted, fontWeight: 600 }}>{total}</span>
            </button>
          </div>

          {/* WISHLISTS */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '9px 14px', fontSize: 11, color: C.textMuted, fontFamily: 'Inter', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `1px solid ${C.border}`, background: C.bg, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Wishlists
              <button onClick={() => setShowCSV(true)} style={{ background: C.primaryLight, border: `1px solid ${C.primaryBorder}`, color: C.primary, cursor: 'pointer', borderRadius: 6, padding: '2px 8px', fontSize: 16, lineHeight: 1 }}>+</button>
            </div>
            {wishlists.length === 0 && <div style={{ padding: '12px 14px', fontSize: 13, color: C.textMuted, fontFamily: 'Inter', lineHeight: 1.6 }}>No wishlists.<br /><span style={{ color: C.primary, cursor: 'pointer', fontWeight: 500 }} onClick={() => setShowCSV(true)}>Import CSV →</span></div>}
            {wishlists.map(w => {
              const isActive = activeView === w.id.toString();
              const count = (wishlistVendors[w.id] || []).length;
              return (
                <div key={w.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  {renamingWishlist === w.id
                    ? <input autoFocus defaultValue={w.name} onBlur={e => renameWishlist(w.id, e.target.value)} onKeyDown={e => e.key === 'Enter' && renameWishlist(w.id, e.target.value)} style={{ width: '100%', padding: '10px 14px', background: C.primaryLight, border: 'none', color: C.text, fontFamily: 'Inter', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                    : <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button onClick={() => setActiveView(w.id.toString())} style={{ flex: 1, padding: '10px 14px', textAlign: 'left', background: isActive ? C.primaryLight : 'transparent', border: 'none', color: isActive ? C.primary : C.textSecondary, fontFamily: 'Inter', fontSize: 14, fontWeight: isActive ? 600 : 400, cursor: 'pointer' }}>
                          📋 {w.name.length > 14 ? w.name.substring(0, 14) + '…' : w.name}
                          <span style={{ float: 'right', fontSize: 12, color: isActive ? C.primary : C.textMuted, fontWeight: 600 }}>{count}</span>
                        </button>
                        <div style={{ paddingRight: 8, display: 'flex', gap: 2 }}>
                          <button onClick={() => setRenamingWishlist(w.id)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: '3px 4px', borderRadius: 4, display: 'flex' }} onMouseEnter={e => e.currentTarget.style.color = C.primary} onMouseLeave={e => e.currentTarget.style.color = C.textMuted}><Edit2 size={12} /></button>
                          <button onClick={() => setDeleteWishlistConfirm(w.id)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: '3px 4px', borderRadius: 4, display: 'flex' }} onMouseEnter={e => e.currentTarget.style.color = C.danger} onMouseLeave={e => e.currentTarget.style.color = C.textMuted}><Trash2 size={12} /></button>
                        </div>
                      </div>
                  }
                  {deleteWishlistConfirm === w.id && (
                    <div style={{ padding: '10px 14px', background: C.dangerLight, borderTop: `1px solid ${C.dangerBorder}` }}>
                      <div style={{ fontSize: 13, color: C.danger, fontFamily: 'Inter', marginBottom: 8, fontWeight: 500 }}>Delete "{w.name}"?<br /><span style={{ color: C.textMuted, fontWeight: 400, fontSize: 12 }}>Vendors stay in All Vendors</span></div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => deleteWishlist(w.id)} style={{ padding: '4px 12px', background: C.danger, border: 'none', color: '#fff', borderRadius: 6, cursor: 'pointer', fontFamily: 'Inter', fontSize: 13, fontWeight: 600 }}>Delete</button>
                        <button onClick={() => setDeleteWishlistConfirm(null)} style={{ padding: '4px 10px', background: C.surface, border: `1px solid ${C.border}`, color: C.textSecondary, borderRadius: 6, cursor: 'pointer', fontFamily: 'Inter', fontSize: 13 }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <button onClick={() => setShowCSV(true)} style={{ display: 'block', width: '100%', padding: '9px 14px', textAlign: 'left', background: 'transparent', border: 'none', color: C.primary, fontFamily: 'Inter', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>+ Import CSV → New Wishlist</button>
          </div>

          <ThoughtsWidget />

          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '9px 14px', fontSize: 11, color: C.textMuted, fontFamily: 'Inter', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `1px solid ${C.border}`, background: C.bg }}>Actions</div>
            {[
              { label: 'Import CSV', action: () => setShowCSV(true) },
              { label: 'Email Templates', action: () => setShowEmail(true) },
              { label: 'Export Backup', action: () => { const b = new Blob([JSON.stringify(vendors, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'vendors_backup.json'; a.click(); } },
            ].map(({ label, action }) => (
              <button key={label} onClick={action} style={{ display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: `1px solid ${C.border}`, color: C.textSecondary, fontFamily: 'Inter', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = C.surfaceHover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* MAIN */}
        <div>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontFamily: 'Inter', fontSize: 20, color: C.text, fontWeight: 700 }}>
              {activeView === 'all' ? '🌐 All Vendors' : `📋 ${wishlists.find(w => w.id.toString() === activeView)?.name || 'Wishlist'}`}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: C.textMuted, fontFamily: 'Inter' }}>
              {currentVendors.length} vendors · Drag column borders to resize · Select rows for bulk actions
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
          />
        </div>
      </div>

      {(modal === 'add' || modal === 'edit') && <VendorModal vendor={modal === 'edit' ? editingVendor : null} onSave={saveVendor} onClose={() => { setModal(null); setEditingVendor(null); }} />}
      {showEmail && <EmailTemplatesPanel onClose={() => setShowEmail(false)} />}
      {showCSV && <CSVModal onClose={() => setShowCSV(false)} onImport={handleCSVImport} wishlists={wishlists} />}
    </div>
  );
}
