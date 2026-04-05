import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from './supabase';
import { ALL_VENDORS } from './data';

// ─── UTILS ────────────────────────────────────────────────────────
const lload = (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const lsave = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

function useDebounce(val, ms) {
  const [dv, setDv] = useState(val);
  useEffect(() => { const t = setTimeout(() => setDv(val), ms); return () => clearTimeout(t); }, [val, ms]);
  return dv;
}

function formatDate(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// ─── RESIZABLE COLUMN HOOK ────────────────────────────────────────
function useColumnWidths(defaults) {
  const [widths, setWidths] = useState(() => lload('colWidths', defaults));
  const resize = (key, w) => setWidths(prev => { const next = { ...prev, [key]: Math.max(60, w) }; lsave('colWidths', next); return next; });
  return [widths, resize];
}

// ─── STATUS CONFIG ────────────────────────────────────────────────
const S_OPT = ['', 'Yes', 'No', 'Pending'];
const S_STYLE = {
  Yes:     { bg: '#f0fdf4', color: '#15803d', border: '#86efac' },
  No:      { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
  Pending: { bg: '#fffbeb', color: '#d97706', border: '#fcd34d' },
  '':      { bg: '#f9fafb', color: '#9ca3af', border: '#e5e7eb' },
};
const T_STYLE = {
  Core:    { bg: '#f0fdf4', color: '#065f46', border: '#6ee7b7' },
  Prime:   { bg: '#fffbeb', color: '#92400e', border: '#fcd34d' },
  Normal:  { bg: '#eff6ff', color: '#1d4ed8', border: '#93c5fd' },
  '':      { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' },
};
const T_OPT = ['', 'Normal', 'Prime', 'Core'];

// ─── INLINE SELECT PILL ───────────────────────────────────────────
function SelectPill({ value, onChange, options, styleMap }) {
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
      <button
        onClick={() => setOpen(o => !o)}
        style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: 4, padding: '2px 8px 2px 8px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', fontWeight: 500 }}
      >
        {value || '—'} <span style={{ fontSize: 9, opacity: 0.7 }}>▼</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, zIndex: 1000, background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 110, overflow: 'hidden' }}>
          {options.map(opt => {
            const st = styleMap[opt] || styleMap[''];
            return (
              <button key={opt} onClick={() => { onChange(opt); setOpen(false); }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 12px', border: 'none', background: opt === value ? '#f3f4f6' : '#fff', color: st.color, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: opt === value ? 600 : 400 }}
                onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                onMouseLeave={e => e.currentTarget.style.background = opt === value ? '#f3f4f6' : '#fff'}
              >
                {opt || '— Clear'}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── RESIZE HANDLE ────────────────────────────────────────────────
function ResizeHandle({ onResize }) {
  const startX = useRef(null);
  const onMouseDown = e => {
    e.preventDefault();
    startX.current = e.clientX;
    const onMove = ev => onResize(ev.clientX - startX.current);
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };
  return (
    <div onMouseDown={onMouseDown}
      style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 4, cursor: 'col-resize', userSelect: 'none', zIndex: 10 }}
      onMouseEnter={e => e.currentTarget.style.background = '#3b82f6'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    />
  );
}

// ─── ADVANCED FILTERS ─────────────────────────────────────────────
const F_FIELDS = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'company', label: 'Company', type: 'text' },
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'phone', label: 'Phone', type: 'text' },
  { key: 'website', label: 'Website', type: 'text' },
  { key: 'vendor_type', label: 'Vendor Type', type: 'select', options: ['', 'Normal', 'Prime', 'Core'] },
  { key: 'email_sent', label: 'Email Sent', type: 'select', options: S_OPT },
  { key: 'follow_up', label: 'Follow-Up', type: 'select', options: S_OPT },
  { key: 'call_done', label: 'Call Done', type: 'select', options: S_OPT },
  { key: 'notes', label: 'Notes', type: 'text' },
];
const TEXT_OPS = [
  { k: 'contains', l: 'contains' }, { k: 'not_contains', l: 'does not contain' },
  { k: 'equals', l: 'equals' }, { k: 'not_equals', l: 'is not' },
  { k: 'is_empty', l: 'is empty' }, { k: 'is_not_empty', l: 'is not empty' },
  { k: 'starts_with', l: 'starts with' },
];
const SEL_OPS = [
  { k: 'equals', l: 'is' }, { k: 'not_equals', l: 'is not' },
  { k: 'is_empty', l: 'is empty' }, { k: 'is_not_empty', l: 'is not empty' },
];

function matchFilter(v, f) {
  const raw = (v[f.field] || '').toLowerCase(), fv = (f.value || '').toLowerCase();
  switch (f.op) {
    case 'contains': return raw.includes(fv);
    case 'not_contains': return !raw.includes(fv);
    case 'equals': return raw === fv;
    case 'not_equals': return raw !== fv;
    case 'is_empty': return raw === '';
    case 'is_not_empty': return raw !== '';
    case 'starts_with': return raw.startsWith(fv);
    default: return true;
  }
}

const PRESETS = [
  { l: 'No Email',      f: [{ field: 'email', op: 'is_empty', value: '' }] },
  { l: 'No Phone',      f: [{ field: 'phone', op: 'is_empty', value: '' }] },
  { l: 'Missing Both',  f: [{ field: 'email', op: 'is_empty', value: '' }, { field: 'phone', op: 'is_empty', value: '' }], c: 'AND' },
  { l: 'Has Phone',     f: [{ field: 'phone', op: 'is_not_empty', value: '' }] },
  { l: 'Core Vendors',  f: [{ field: 'vendor_type', op: 'equals', value: 'Core' }] },
  { l: 'Prime Only',    f: [{ field: 'vendor_type', op: 'equals', value: 'Prime' }] },
  { l: 'Emailed',       f: [{ field: 'email_sent', op: 'equals', value: 'Yes' }] },
  { l: 'Not Contacted', f: [{ field: 'email_sent', op: 'is_empty', value: '' }, { field: 'call_done', op: 'is_empty', value: '' }], c: 'AND' },
  { l: 'CSV Imports',   f: [{ field: 'vendor_type', op: 'not_equals', value: 'Core' }] },
];

function FilterPanel({ filters, setFilters, conj, setConj, onClose }) {
  const add = () => setFilters(f => [...f, { id: Date.now(), field: 'email', op: 'is_not_empty', value: '' }]);
  const rem = id => setFilters(f => f.filter(x => x.id !== id));
  const upd = (id, k, v) => setFilters(f => f.map(x => x.id === id ? { ...x, [k]: v } : x));
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>Filters</span>
          <span style={{ fontSize: 12, color: '#6b7280' }}>Match</span>
          <select value={conj} onChange={e => setConj(e.target.value)} style={{ fontSize: 12, padding: '3px 6px', border: '1px solid #d1d5db', borderRadius: 4, outline: 'none', fontFamily: 'inherit' }}>
            <option value="AND">ALL (AND)</option>
            <option value="OR">ANY (OR)</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={add} style={{ padding: '4px 12px', fontSize: 12, border: '1px solid #3b82f6', borderRadius: 4, background: '#eff6ff', color: '#2563eb', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>+ Add Filter</button>
          <button onClick={() => setFilters([])} style={{ padding: '4px 10px', fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 4, background: '#fff', color: '#6b7280', cursor: 'pointer', fontFamily: 'inherit' }}>Clear</button>
          <button onClick={onClose} style={{ padding: '4px 8px', fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 4, background: '#fff', color: '#6b7280', cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
        </div>
      </div>

      {filters.map((f, i) => {
        const fd = F_FIELDS.find(x => x.key === f.field) || F_FIELDS[0];
        const ops = fd.type === 'select' ? SEL_OPS : TEXT_OPS;
        const needsVal = !['is_empty', 'is_not_empty'].includes(f.op);
        const sel = { fontSize: 12, padding: '5px 8px', border: '1px solid #d1d5db', borderRadius: 4, outline: 'none', fontFamily: 'inherit', background: '#fff', color: '#111827' };
        return (
          <div key={f.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, background: '#f9fafb', padding: '8px 10px', borderRadius: 6, border: '1px solid #f0f0f0' }}>
            <span style={{ fontSize: 12, color: '#6b7280', minWidth: 36, fontWeight: 500 }}>{i === 0 ? 'Where' : conj}</span>
            <select value={f.field} onChange={e => upd(f.id, 'field', e.target.value)} style={{ ...sel, minWidth: 120 }}>{F_FIELDS.map(ff => <option key={ff.key} value={ff.key}>{ff.label}</option>)}</select>
            <select value={f.op} onChange={e => upd(f.id, 'op', e.target.value)} style={{ ...sel, minWidth: 140 }}>{ops.map(op => <option key={op.k} value={op.k}>{op.l}</option>)}</select>
            {needsVal && (fd.type === 'select'
              ? <select value={f.value} onChange={e => upd(f.id, 'value', e.target.value)} style={{ ...sel, minWidth: 100 }}>{(fd.options || []).map(o => <option key={o} value={o}>{o || '(empty)'}</option>)}</select>
              : <input value={f.value || ''} onChange={e => upd(f.id, 'value', e.target.value)} placeholder="value..." style={{ ...sel, flex: 1, minWidth: 100 }} />
            )}
            {!needsVal && <div style={{ flex: 1 }} />}
            <button onClick={() => rem(f.id)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 15, padding: '0 4px', lineHeight: 1 }}
              onMouseEnter={e => e.currentTarget.style.color = '#dc2626'} onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'}>✕</button>
          </div>
        );
      })}

      {filters.length === 0 && <div style={{ fontSize: 12, color: '#9ca3af', padding: '4px 0 8px' }}>No filters active. Add a filter or click a preset below.</div>}

      <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 10, marginTop: 4 }}>
        <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 7 }}>Presets</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PRESETS.map(p => (
            <button key={p.l} onClick={() => { setFilters(p.f.map((fi, i) => ({ ...fi, id: Date.now() + i }))); if (p.c) setConj(p.c); }}
              style={{ padding: '4px 10px', borderRadius: 12, background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#374151', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#93c5fd'; e.currentTarget.style.color = '#1d4ed8'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#374151'; }}>
              {p.l}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── CSV ──────────────────────────────────────────────────────────
function parseRow(row) {
  const r = []; let c = '', q = false;
  for (const ch of row) { if (ch === '"') q = !q; else if (ch === ',' && !q) { r.push(c.trim()); c = ''; } else c += ch; }
  r.push(c.trim()); return r;
}
function parseCSV(text) {
  const lines = text.trim().split('\n').filter(l => l.trim());
  const hdrs = parseRow(lines[0]).map(h => h.replace(/"/g, '').trim().toLowerCase());
  const col = (vs) => { for (const v of vs) { const i = hdrs.indexOf(v); if (i !== -1) return i; } return -1; };
  const cols = {
    name: col(['full name','name','contact name']), first: col(['first name','first_name']), last: col(['last name','last_name']),
    title: col(['job title','title','position','role']), company: col(['company name','company','organization','firm']),
    email: col(['contact email address - data','email','email address','work email']),
    phone: col(['contact phone number - data','phone','phone number','mobile']),
    website: col(['company domain','website','url','domain','linkedin profile','linkedin']),
    location: col(['location','city','country']), notes: col(['notes','note','comments']),
  };
  const get = (row, f) => cols[f] >= 0 ? (row[cols[f]] || '').replace(/"/g, '').trim() : '';
  return lines.slice(1).map(line => {
    const row = parseRow(line);
    let name = get(row, 'name') || [get(row, 'first'), get(row, 'last')].filter(Boolean).join(' ');
    const company = get(row, 'company'); if (!name && !company) return null;
    const loc = get(row, 'location'), notes = [get(row, 'notes'), loc].filter(Boolean).join(' | ');
    return { name: name || company, title: get(row, 'title'), company: company || name, email: get(row, 'email'), phone: get(row, 'phone'), website: get(row, 'website'), notes, vendor_type: '', email_sent: '', follow_up: '', call_done: '', resume_role: '' };
  }).filter(Boolean);
}

// ─── MODALS ───────────────────────────────────────────────────────
function Modal({ title, onClose, children, maxW = 560 }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 10, padding: 28, width: '100%', maxWidth: maxW, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: 16 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function VendorModal({ vendor, onSave, onClose }) {
  const [f, setF] = useState(vendor ? {
    name: vendor.name || '', title: vendor.title || '', company: vendor.company || '',
    email: vendor.email || '', phone: vendor.phone || '', website: vendor.website || '',
    resume_role: vendor.resume_role || '', notes: vendor.notes || '',
    vendor_type: vendor.vendor_type || '', email_sent: vendor.email_sent || '',
    follow_up: vendor.follow_up || '', call_done: vendor.call_done || '',
  } : { name: '', title: '', company: '', email: '', phone: '', website: '', resume_role: '', notes: '', vendor_type: '', email_sent: '', follow_up: '', call_done: '' });

  const inp = { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginTop: 4 };
  const lbl = { fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 };
  const up = (k, v) => setF(p => ({ ...p, [k]: v }));

  return (
    <Modal title={vendor ? 'Edit Vendor' : 'Add Vendor'} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {[['name','Full Name *'],['title','Job Title'],['company','Company *'],['email','Email'],['phone','Phone'],['website','Website / LinkedIn']].map(([k, l]) => (
          <div key={k}>
            <label style={lbl}>{l}</label>
            <input value={f[k]} onChange={e => up(k, e.target.value)} style={inp} onFocus={e => e.target.style.borderColor = '#3b82f6'} onBlur={e => e.target.style.borderColor = '#d1d5db'} />
          </div>
        ))}
        <div style={{ gridColumn: '1/-1' }}>
          <label style={lbl}>Resume Role</label>
          <input value={f.resume_role} onChange={e => up('resume_role', e.target.value)} style={inp} />
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={lbl}>Notes</label>
          <textarea value={f.notes} onChange={e => up('notes', e.target.value)} rows={3} style={{ ...inp, resize: 'vertical' }} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginTop: 14 }}>
        {[['vendor_type','Type',T_OPT],['email_sent','Emailed',S_OPT],['follow_up','Follow-Up',S_OPT],['call_done','Called',S_OPT]].map(([k,l,opts]) => (
          <div key={k}>
            <label style={lbl}>{l}</label>
            <select value={f[k]} onChange={e => up(k, e.target.value)} style={{ ...inp, marginTop: 4 }}>{opts.map(o => <option key={o} value={o}>{o || '—'}</option>)}</select>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ padding: '8px 20px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', color: '#374151', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>Cancel</button>
        <button onClick={() => { if (!f.name.trim() || !f.company.trim()) { alert('Name and Company required'); return; } onSave(f); }} style={{ padding: '8px 22px', border: 'none', borderRadius: 6, background: '#2563eb', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>{vendor ? 'Save Changes' : 'Add Vendor'}</button>
      </div>
    </Modal>
  );
}

function CSVModal({ onClose, onImport, wishlists }) {
  const [step, setStep] = useState(1); const [parsed, setParsed] = useState([]); const [fileName, setFileName] = useState('');
  const [addToAll, setAddToAll] = useState(true); const [createWL, setCreateWL] = useState(true);
  const [wlName, setWlName] = useState(''); const [wlMode, setWlMode] = useState('new'); const [existingWl, setExistingWl] = useState('');
  const fileRef = useRef(null);

  const handleFile = e => {
    const file = e.target.files[0]; if (!file) return;
    setFileName(file.name); setWlName(file.name.replace('.csv', '').replace(/_/g, ' '));
    const reader = new FileReader(); reader.onload = ev => { setParsed(parseCSV(ev.target.result)); setStep(2); }; reader.readAsText(file);
  };

  const inp = { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };

  return (
    <Modal title="Import CSV" onClose={onClose} maxW={640}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {['Upload','Preview','Options'].map((s, i) => (
          <div key={s} style={{ flex: 1, textAlign: 'center', padding: '6px 0', borderRadius: 6, fontSize: 12, fontWeight: 600, background: step === i+1 ? '#eff6ff' : '#f9fafb', border: `1px solid ${step === i+1 ? '#93c5fd' : '#e5e7eb'}`, color: step === i+1 ? '#1d4ed8' : step > i+1 ? '#15803d' : '#9ca3af' }}>
            {step > i+1 ? '✓ ' : `${i+1}. `}{s}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div onClick={() => fileRef.current.click()} style={{ border: '2px dashed #d1d5db', borderRadius: 8, padding: 48, textAlign: 'center', cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#d1d5db'}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: '#111827' }}>Click to browse CSV</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>Auto-detects Name, Company, Email, Phone, Title, Location</div>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />
        </div>
      )}

      {step === 2 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: '#374151' }}><b style={{ color: '#1d4ed8' }}>{parsed.length}</b> vendors · <span style={{ color: '#15803d' }}>{parsed.filter(v=>v.email).length} with email</span> · <span style={{ color: '#0891b2' }}>{parsed.filter(v=>v.phone).length} with phone</span></span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setStep(1)} style={{ padding: '5px 12px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 5, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
              <button onClick={() => setStep(3)} style={{ padding: '5px 14px', fontSize: 12, border: 'none', borderRadius: 5, background: '#2563eb', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Continue →</button>
            </div>
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 6 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ background: '#f9fafb', position: 'sticky', top: 0 }}>
                {['Name','Company','Email','Phone'].map(h => <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>{h}</th>)}
              </tr></thead>
              <tbody>{parsed.map((v,i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '7px 10px', color: '#111827', fontWeight: 500 }}>{v.name||'—'}</td>
                  <td style={{ padding: '7px 10px', color: '#2563eb' }}>{v.company||'—'}</td>
                  <td style={{ padding: '7px 10px', color: v.email ? '#0891b2' : '#d1d5db' }}>{v.email||'✗'}</td>
                  <td style={{ padding: '7px 10px', color: v.phone ? '#374151' : '#d1d5db' }}>{v.phone||'✗'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          {[{k:'addToAll',v:addToAll,set:setAddToAll,t:'Add to All Vendors',d:'Vendors appear in the main list. Delete from any view removes from database.'},
            {k:'wishlist',v:createWL,set:setCreateWL,t:'Save as Wishlist Sheet',d:'Group this batch in a named sheet'}
          ].map(({k,v,set,t,d}) => (
            <div key={k} onClick={() => set(!v)} style={{ padding: 14, border: `2px solid ${v ? '#3b82f6' : '#e5e7eb'}`, borderRadius: 8, marginBottom: 10, cursor: 'pointer', background: v ? '#eff6ff' : '#fff', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${v ? '#2563eb' : '#d1d5db'}`, background: v ? '#2563eb' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                {v && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
              </div>
              <div><div style={{ fontWeight: 600, fontSize: 13, color: '#111827', marginBottom: 2 }}>{t}</div><div style={{ fontSize: 12, color: '#6b7280' }}>{d}</div></div>
            </div>
          ))}

          {createWL && (
            <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 8, padding: 14, marginBottom: 4 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {['new','existing'].map(m => <button key={m} onClick={() => setWlMode(m)} style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, background: wlMode===m ? '#7c3aed' : '#fff', border: `1px solid ${wlMode===m ? '#7c3aed' : '#d1d5db'}`, color: wlMode===m ? '#fff' : '#374151' }}>{m==='new' ? '+ New Sheet' : 'Existing Sheet'}</button>)}
              </div>
              {wlMode==='new'
                ? <input value={wlName} onChange={e => setWlName(e.target.value)} placeholder="Sheet name..." style={inp} />
                : <select value={existingWl} onChange={e => setExistingWl(e.target.value)} style={inp}><option value="">Select...</option>{wishlists.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
              }
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18 }}>
            <button onClick={() => setStep(2)} style={{ padding: '8px 18px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>← Back</button>
            <button onClick={() => { onImport({ vendors: parsed, addToAll, createWL, wlName: wlMode==='new' ? wlName : '', existingWlId: wlMode==='existing' ? existingWl : null }); onClose(); }} style={{ padding: '8px 22px', border: 'none', borderRadius: 6, background: '#2563eb', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>Import {parsed.length} Vendors</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function TemplatesModal({ onClose }) {
  const [templates, setTemplates] = useState(() => lload('emailTemplates', [
    { id: 1, title: 'Initial Outreach', body: 'Hi [Name],\n\nI hope you\'re doing well! I\'m Alok, GTM Automation Engineer at ConsultAdd. I came across your profile and wanted to explore potential collaboration.\n\nOpen to a quick 15-min call this week?\n\nBest,\nAlok Kumar Singh' },
    { id: 2, title: 'Resume Follow-Up', body: 'Hi [Name],\n\nFollowing up on the resume I shared for [Role].\n\nThanks,\nAlok' },
    { id: 3, title: 'Partnership Intro', body: 'Hello [Name],\n\nReaching out from ConsultAdd IT Staffing. We\'d love to explore a vendor partnership with [Company].\n\nBest,\nAlok Kumar Singh' },
  ]));
  const [editing, setEditing] = useState(null); const [copied, setCopied] = useState(null);
  const sv = t => { setTemplates(t); lsave('emailTemplates', t); };
  return (
    <Modal title="Email Templates" onClose={onClose} maxW={620}>
      <button onClick={() => { const t = { id: Date.now(), title: 'New Template', body: '' }; sv([...templates, t]); setEditing(t.id); }} style={{ marginBottom: 16, padding: '7px 16px', border: 'none', borderRadius: 6, background: '#2563eb', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>+ New Template</button>
      {templates.map(t => (
        <div key={t.id} style={{ background: '#f9fafb', borderRadius: 8, padding: 16, marginBottom: 12, border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            {editing===t.id
              ? <input value={t.title} onChange={e => sv(templates.map(x => x.id===t.id ? {...x,title:e.target.value} : x))} style={{ border: '1px solid #3b82f6', borderRadius: 5, padding: '4px 8px', fontSize: 14, fontWeight: 600, outline: 'none', fontFamily: 'inherit' }} />
              : <strong style={{ fontSize: 14, color: '#111827' }}>{t.title}</strong>
            }
            <div style={{ display: 'flex', gap: 7 }}>
              <button onClick={() => { navigator.clipboard.writeText(t.body); setCopied(t.id); setTimeout(() => setCopied(null), 2000); }} style={{ padding: '4px 10px', fontSize: 12, border: `1px solid ${copied===t.id ? '#86efac' : '#d1d5db'}`, borderRadius: 5, background: copied===t.id ? '#f0fdf4' : '#fff', color: copied===t.id ? '#15803d' : '#374151', cursor: 'pointer', fontFamily: 'inherit' }}>{copied===t.id ? '✓ Copied' : 'Copy'}</button>
              <button onClick={() => setEditing(editing===t.id ? null : t.id)} style={{ padding: '4px 10px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 5, background: '#fff', color: '#374151', cursor: 'pointer', fontFamily: 'inherit' }}>{editing===t.id ? 'Done' : 'Edit'}</button>
              <button onClick={() => sv(templates.filter(x => x.id!==t.id))} style={{ padding: '4px 8px', fontSize: 12, border: '1px solid #fca5a5', borderRadius: 5, background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontFamily: 'inherit' }}>Del</button>
            </div>
          </div>
          {editing===t.id
            ? <textarea value={t.body} onChange={e => sv(templates.map(x => x.id===t.id ? {...x,body:e.target.value} : x))} rows={6} style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 6, padding: 10, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
            : <pre style={{ margin: 0, fontSize: 12, color: '#6b7280', whiteSpace: 'pre-wrap', lineHeight: 1.6, maxHeight: 80, overflow: 'hidden' }}>{t.body}</pre>
          }
        </div>
      ))}
    </Modal>
  );
}

// ─── NOTES CELL ───────────────────────────────────────────────────
function NotesCell({ value, onSave }) {
  const [local, setLocal] = useState(value || '');
  const debounced = useDebounce(local, 800);
  const mounted = useRef(false);
  useEffect(() => { setLocal(value || ''); }, [value]);
  useEffect(() => { if (!mounted.current) { mounted.current = true; return; } onSave(debounced); }, [debounced]);
  return <textarea value={local} onChange={e => setLocal(e.target.value)} placeholder="Notes..." rows={3}
    style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 6, padding: '7px 9px', fontSize: 12, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
    onFocus={e => e.target.style.borderColor = '#3b82f6'} onBlur={e => e.target.style.borderColor = '#d1d5db'} />;
}

// ─── BULK TAG BAR ─────────────────────────────────────────────────
function BulkBar({ count, filteredCount, allSel, onSelAll, onClear, onBulkTag, onBulkDel }) {
  const [showTag, setShowTag] = useState(false);
  const [field, setField] = useState('vendor_type');
  const [val, setVal] = useState('Prime');
  const [delConf, setDelConf] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setShowTag(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  const FIELDS = [
    { k: 'vendor_type', l: 'Vendor Type', opts: T_OPT },
    { k: 'email_sent',  l: 'Email Sent',  opts: S_OPT },
    { k: 'follow_up',   l: 'Follow-Up',   opts: S_OPT },
    { k: 'call_done',   l: 'Call Done',   opts: S_OPT },
  ];
  const selF = FIELDS.find(f => f.k === field);
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 14px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, flexWrap: 'wrap', marginBottom: 10 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>{count} selected</span>
      {filteredCount > count && !allSel && (
        <button onClick={onSelAll} style={{ fontSize: 12, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontFamily: 'inherit' }}>Select all {filteredCount} filtered</button>
      )}
      {allSel && filteredCount > 1 && <span style={{ fontSize: 12, color: '#15803d', fontWeight: 500 }}>✓ All {filteredCount} selected</span>}

      <div ref={ref} style={{ position: 'relative' }}>
        <button onClick={() => setShowTag(o => !o)} style={{ padding: '5px 12px', fontSize: 12, border: '1px solid #3b82f6', borderRadius: 6, background: '#eff6ff', color: '#2563eb', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
          🏷 Bulk Tag ▼
        </button>
        {showTag && (
          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 100, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, minWidth: 260, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 12 }}>Set field for {count} vendors</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Field</label>
                <select value={field} onChange={e => { setField(e.target.value); setVal(''); }} style={{ width: '100%', padding: '7px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}>
                  {FIELDS.map(f => <option key={f.k} value={f.k}>{f.l}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Value</label>
                <select value={val} onChange={e => setVal(e.target.value)} style={{ width: '100%', padding: '7px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}>
                  {(selF?.opts || []).map(o => <option key={o} value={o}>{o || '(clear)'}</option>)}
                </select>
              </div>
              <button onClick={() => { onBulkTag(field, val); setShowTag(false); }} style={{ padding: '8px', border: 'none', borderRadius: 6, background: '#2563eb', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>Apply to {count} vendors ✓</button>
            </div>
          </div>
        )}
      </div>

      {delConf
        ? <>
            <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>Delete {count} permanently?</span>
            <button onClick={() => { onBulkDel(); setDelConf(false); }} style={{ padding: '5px 12px', fontSize: 12, border: 'none', borderRadius: 5, background: '#dc2626', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Confirm</button>
            <button onClick={() => setDelConf(false)} style={{ padding: '5px 10px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 5, background: '#fff', color: '#374151', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          </>
        : <button onClick={() => setDelConf(true)} style={{ padding: '5px 12px', fontSize: 12, border: '1px solid #fca5a5', borderRadius: 5, background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>🗑 Delete</button>
      }

      <button onClick={onClear} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 16, padding: '0 4px', lineHeight: 1 }}>✕</button>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────
export default function App() {
  const [vendors, setVendors] = useState([]);
  const [wishlists, setWishlists] = useState([]);
  const [wlVendors, setWlVendors] = useState({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeView, setActiveView] = useState('all');
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [showCSV, setShowCSV] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [lastImportIds, setLastImportIds] = useState([]);
  const [toast, setToast] = useState(null);
  // table state
  const [search, setSearch] = useState('');
  const [subTab, setSubTab] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState([]);
  const [conj, setConj] = useState('AND');
  const [selected, setSelected] = useState(new Set());
  const [expanded, setExpanded] = useState(null);
  const [editCell, setEditCell] = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [showTS, setShowTS] = useState(false);
  const [renamingWL, setRenamingWL] = useState(null);
  const [delWL, setDelWL] = useState(null);

  // Resizable columns — stored in localStorage
  const DEFAULTS = { drag: 28, num: 40, name: 170, company: 160, title: 150, email: 200, phone: 145, type: 110, emailed: 95, followup: 95, called: 90, role: 130, created: 160, updated: 160, actions: 85 };
  const [colW, setColW_] = useState(() => ({ ...DEFAULTS, ...lload('colWidths', {}) }));
  const setColW = (k, delta) => setColW_(prev => { const next = { ...prev, [k]: Math.max(60, (prev[k] || 80) + delta) }; lsave('colWidths', next); return next; });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, color: { success: '#15803d', danger: '#dc2626', warning: '#d97706' }[type] || '#2563eb' });
    setTimeout(() => setToast(null), 3000);
  };

  // ─── LOAD DATA ─────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
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
      } else setVendors(vData);
    }
    setWishlists(wData || []);
    const map = {};
    (wvData || []).forEach(({ wishlist_id, vendor_id }) => { if (!map[wishlist_id]) map[wishlist_id] = []; map[wishlist_id].push(vendor_id); });
    setWlVendors(map);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ─── REALTIME — granular updates, no full reload ───────────────
  useEffect(() => {
    const ch = supabase.channel('vendors-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vendors' }, ({ new: row }) => {
        setVendors(v => v.some(x => x.id === row.id) ? v : [...v, row]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'vendors' }, ({ new: row }) => {
        setVendors(v => v.map(x => x.id === row.id ? row : x));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'vendors' }, ({ old: row }) => {
        setVendors(v => v.filter(x => x.id !== row.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wishlists' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wishlist_vendors' }, () => loadAll())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [loadAll]);

  // ─── VENDOR OPERATIONS ─────────────────────────────────────────
  const updateVendor = useCallback(async (id, field, value) => {
    // Optimistic update immediately
    setVendors(v => v.map(x => x.id === id ? { ...x, [field]: value } : x));
    const dbField = { vendor_type: 'vendor_type', email_sent: 'email_sent', follow_up: 'follow_up', call_done: 'call_done', resume_role: 'resume_role', emailSent: 'email_sent', followUp: 'follow_up', callDone: 'call_done', resumeRole: 'resume_role', vendorType: 'vendor_type' }[field] || field;
    await supabase.from('vendors').update({ [dbField]: value }).eq('id', id);
  }, []);

  const bulkTag = async (ids, field, value) => {
    // Optimistic: update locally immediately
    setVendors(v => v.map(x => ids.includes(x.id) ? { ...x, [field]: value } : x));
    setSyncing(true);
    await supabase.from('vendors').update({ [field]: value }).in('id', ids);
    setSyncing(false);
    showToast(`Updated ${ids.length} vendors`);
  };

  const saveVendor = async (form) => {
    const db = { name: form.name, title: form.title || '', company: form.company, email: form.email || '', phone: form.phone || '', website: form.website || '', notes: form.notes || '', vendor_type: form.vendor_type || '', email_sent: form.email_sent || '', follow_up: form.follow_up || '', call_done: form.call_done || '', resume_role: form.resume_role || '' };
    setSyncing(true);
    if (!editingVendor) {
      const { data } = await supabase.from('vendors').insert([db]).select();
      if (data) setVendors(v => [...v, data[0]]);
      showToast('Vendor added');
    } else {
      await supabase.from('vendors').update(db).eq('id', editingVendor.id);
      setVendors(v => v.map(x => x.id === editingVendor.id ? { ...x, ...db } : x));
      showToast('Vendor updated');
    }
    setSyncing(false); setShowVendorModal(false); setEditingVendor(null);
  };

  const deleteVendor = async (id) => {
    setVendors(v => v.filter(x => x.id !== id)); // optimistic
    await supabase.from('vendors').delete().eq('id', id);
    showToast('Deleted', 'warning');
  };

  const bulkDelete = async (ids) => {
    setVendors(v => v.filter(x => !ids.includes(x.id))); // optimistic
    setSyncing(true);
    await supabase.from('vendors').delete().in('id', ids);
    setSyncing(false); setSelected(new Set());
    showToast(`${ids.length} deleted`, 'danger');
  };

  const handleCSVImport = async ({ vendors: csv, addToAll, createWL, wlName, existingWlId }) => {
    setSyncing(true);
    const { data: inserted } = await supabase.from('vendors').insert(csv).select();
    const ids = (inserted || []).map(d => d.id);
    setVendors(v => [...v, ...(inserted || [])]);
    setLastImportIds(ids);
    if (createWL && ids.length > 0) {
      let wlId = existingWlId ? parseInt(existingWlId) : null;
      if (!wlId && wlName) {
        const { data: wl } = await supabase.from('wishlists').insert([{ name: wlName }]).select();
        if (wl) { wlId = wl[0].id; setWishlists(w => [...w, wl[0]]); }
      }
      if (wlId) {
        await supabase.from('wishlist_vendors').insert(ids.map(vid => ({ wishlist_id: wlId, vendor_id: vid })));
        setWlVendors(p => ({ ...p, [wlId]: [...(p[wlId] || []), ...ids] }));
        setActiveView(wlId.toString());
      }
    }
    setSyncing(false); showToast(`Imported ${ids.length} vendors`);
  };

  const handleUndo = async () => {
    if (!lastImportIds.length || !window.confirm(`Delete ${lastImportIds.length} vendors from last import?`)) return;
    await bulkDelete(lastImportIds); setLastImportIds([]);
  };

  const deleteWishlist = async (id) => {
    await supabase.from('wishlists').delete().eq('id', id);
    setWishlists(w => w.filter(x => x.id !== id));
    if (activeView === id.toString()) setActiveView('all');
    setDelWL(null); showToast('Wishlist deleted');
  };

  const renameWishlist = async (id, name) => {
    await supabase.from('wishlists').update({ name }).eq('id', id);
    setWishlists(w => w.map(x => x.id === id ? { ...x, name } : x));
    setRenamingWL(null);
  };

  // ─── TABLE DATA ────────────────────────────────────────────────
  const currentVendors = activeView === 'all' ? vendors : vendors.filter(v => (wlVendors[parseInt(activeView)] || []).includes(v.id));

  const filtered = useMemo(() => {
    let list = currentVendors.filter(v => {
      if (subTab === 'core' && v.vendor_type !== 'Core') return false;
      if (subTab === 'prime' && v.vendor_type !== 'Prime') return false;
      if (subTab === 'normal' && v.vendor_type !== 'Normal') return false;
      const q = search.toLowerCase();
      if (q && !`${v.name} ${v.company} ${v.email} ${v.title} ${v.phone} ${v.notes}`.toLowerCase().includes(q)) return false;
      if (filters.length) {
        const res = filters.map(f => matchFilter(v, f));
        if (conj === 'AND' && !res.every(Boolean)) return false;
        if (conj === 'OR' && !res.some(Boolean)) return false;
      }
      return true;
    });
    if (sortCol) list = [...list].sort((a, b) => {
      const av = (a[sortCol] || '').toString().toLowerCase(), bv = (b[sortCol] || '').toString().toLowerCase();
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return list;
  }, [currentVendors, subTab, search, filters, conj, sortCol, sortDir]);

  const allSel = selected.size === filtered.length && filtered.length > 0;
  const toggleSort = col => { if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortCol(col); setSortDir('asc'); } };
  const toggleSel = id => { const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s); };
  const toggleAll = () => { if (selected.size > 0) setSelected(new Set()); else setSelected(new Set(filtered.map(v => v.id))); };

  const total = vendors.length, coreC = vendors.filter(v => v.vendor_type === 'Core').length,
    primeC = vendors.filter(v => v.vendor_type === 'Prime').length,
    emailsSent = vendors.filter(v => v.email_sent === 'Yes').length,
    withEmail = vendors.filter(v => v.email).length;

  const TH = ({ col, children, wKey }) => {
    const startW = useRef(null);
    return (
      <th onClick={col ? () => toggleSort(col) : undefined}
        style={{ padding: '9px 10px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: sortCol === col ? '#1d4ed8' : '#6b7280', background: '#f9fafb', borderBottom: '2px solid #e5e7eb', whiteSpace: 'nowrap', userSelect: 'none', cursor: col ? 'pointer' : 'default', position: 'relative', width: colW[wKey] || 100, minWidth: colW[wKey] || 60 }}>
        {children}{col && sortCol === col && <span style={{ marginLeft: 4 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>}
        {wKey && <ResizeHandle onResize={delta => setColW(wKey, delta)} />}
      </th>
    );
  };

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, background: '#f9fafb', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ width: 36, height: 36, border: '3px solid #e5e7eb', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ color: '#6b7280', fontSize: 14 }}>Loading vendors...</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, system-ui, -apple-system, sans-serif', background: '#f9fafb', color: '#111827' }}>
      <style>{`*{box-sizing:border-box}@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:#f3f4f6}::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:3px}::-webkit-scrollbar-thumb:hover{background:#9ca3af}`}</style>

      {/* TOAST */}
      {toast && <div style={{ position: 'fixed', bottom: 20, right: 20, background: '#fff', border: `1px solid #e5e7eb`, borderLeft: `4px solid ${toast.color}`, borderRadius: 8, padding: '11px 18px', fontSize: 13, fontWeight: 500, color: '#111827', zIndex: 9999, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', animation: 'fadeIn 0.25s ease' }}>{toast.msg}</div>}

      {/* TOPBAR */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div>
            <span style={{ fontWeight: 800, fontSize: 16, color: '#111827', fontStyle: 'italic' }}>Vincit</span>
            <span style={{ fontWeight: 600, fontSize: 16, color: '#6b7280', fontStyle: 'italic' }}> qui se vincit</span>
          </div>
          <span style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#15803d', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>
            {syncing ? '⟳ saving' : '● live'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {lastImportIds.length > 0 && <button onClick={handleUndo} style={{ padding: '6px 12px', border: '1px solid #fcd34d', borderRadius: 6, background: '#fffbeb', color: '#92400e', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600 }}>↩ Undo Import</button>}
          <button onClick={() => setShowCSV(true)} style={{ padding: '6px 14px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', color: '#374151', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500 }}>↑ Import CSV</button>
          <button onClick={() => setShowTemplates(true)} style={{ padding: '6px 14px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', color: '#374151', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500 }}>Templates</button>
          <button onClick={() => { const b = new Blob([JSON.stringify(vendors, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'vendors_backup.json'; a.click(); }} style={{ padding: '6px 14px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', color: '#374151', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500 }}>↓ Export</button>
          <button onClick={() => { setEditingVendor(null); setShowVendorModal(true); }} style={{ padding: '6px 16px', border: 'none', borderRadius: 6, background: '#2563eb', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>+ Add Vendor</button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* SIDEBAR */}
        <div style={{ width: 200, background: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', overflowY: 'auto', flexShrink: 0 }}>
          {/* STATS */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6' }}>
            {[
              { l: 'Total Vendors', v: total, c: '#2563eb' },
              { l: 'Core (Original 74)', v: coreC, c: '#059669' },
              { l: 'Prime', v: primeC, c: '#d97706' },
              { l: 'Have Email', v: withEmail, c: '#0891b2' },
              { l: 'Emailed', v: emailsSent, c: '#15803d' },
              { l: 'Wishlists', v: wishlists.length, c: '#7c3aed' },
            ].map(s => (
              <div key={s.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f9fafb' }}>
                <span style={{ fontSize: 12, color: '#6b7280' }}>{s.l}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: s.c }}>{s.v}</span>
              </div>
            ))}
          </div>

          {/* VIEWS */}
          <div>
            <div style={{ padding: '10px 16px 4px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8 }}>Views</div>
            <button onClick={() => setActiveView('all')} style={{ display: 'block', width: '100%', padding: '9px 16px', textAlign: 'left', border: 'none', borderBottom: '1px solid #f3f4f6', background: activeView === 'all' ? '#eff6ff' : 'transparent', color: activeView === 'all' ? '#2563eb' : '#374151', fontSize: 13, fontWeight: activeView === 'all' ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit' }}>
              All Vendors <span style={{ float: 'right', fontSize: 12, color: activeView === 'all' ? '#2563eb' : '#9ca3af', fontWeight: 600 }}>{total}</span>
            </button>
          </div>

          {/* WISHLISTS */}
          <div>
            <div style={{ padding: '10px 16px 4px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Wishlists
              <button onClick={() => setShowCSV(true)} style={{ fontSize: 16, background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}>+</button>
            </div>
            {wishlists.map(w => {
              const isAct = activeView === w.id.toString();
              const cnt = (wlVendors[w.id] || []).length;
              return (
                <div key={w.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  {renamingWL === w.id
                    ? <input autoFocus defaultValue={w.name} onBlur={e => renameWishlist(w.id, e.target.value)} onKeyDown={e => e.key === 'Enter' && renameWishlist(w.id, e.target.value)} style={{ width: '100%', padding: '8px 16px', border: 'none', borderBottom: '1px solid #93c5fd', outline: 'none', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', background: '#eff6ff' }} />
                    : <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button onClick={() => setActiveView(w.id.toString())} style={{ flex: 1, padding: '9px 16px', textAlign: 'left', border: 'none', background: isAct ? '#eff6ff' : 'transparent', color: isAct ? '#2563eb' : '#374151', fontSize: 13, fontWeight: isAct ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {w.name.length > 15 ? w.name.substring(0, 15) + '…' : w.name}
                          <span style={{ float: 'right', fontSize: 11, color: isAct ? '#2563eb' : '#9ca3af', fontWeight: 600 }}>{cnt}</span>
                        </button>
                        <div style={{ display: 'flex', gap: 0, paddingRight: 6, flexShrink: 0 }}>
                          <button onClick={() => setRenamingWL(w.id)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 11, padding: '2px 4px' }} title="Rename">✏</button>
                          <button onClick={() => setDelWL(w.id)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 11, padding: '2px 4px' }} title="Delete" onMouseEnter={e => e.currentTarget.style.color = '#dc2626'} onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'}>✕</button>
                        </div>
                      </div>
                  }
                  {delWL === w.id && (
                    <div style={{ padding: '10px 14px', background: '#fef2f2', borderTop: '1px solid #fecaca' }}>
                      <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 8 }}>Delete "{w.name}"? Vendors stay in All.</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => deleteWishlist(w.id)} style={{ padding: '4px 10px', background: '#dc2626', border: 'none', color: '#fff', borderRadius: 5, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', fontWeight: 600 }}>Delete</button>
                        <button onClick={() => setDelWL(null)} style={{ padding: '4px 9px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 5, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {wishlists.length === 0 && <div style={{ padding: '8px 16px', fontSize: 12, color: '#9ca3af' }}>No wishlists yet.<br /><span style={{ color: '#2563eb', cursor: 'pointer' }} onClick={() => setShowCSV(true)}>Import CSV →</span></div>}
            <button onClick={() => setShowCSV(true)} style={{ display: 'block', width: '100%', padding: '8px 16px', textAlign: 'left', border: 'none', background: 'transparent', color: '#2563eb', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>+ New Wishlist</button>
          </div>
        </div>

        {/* MAIN */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* TOOLBAR */}
          <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '10px 20px', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* SUB TABS */}
              {[{ k:'all', l:'All', c: currentVendors.length },{ k:'core', l:'🏠 Core', c: currentVendors.filter(v=>v.vendor_type==='Core').length },{ k:'prime', l:'⭐ Prime', c: currentVendors.filter(v=>v.vendor_type==='Prime').length },{ k:'normal', l:'● Normal', c: currentVendors.filter(v=>v.vendor_type==='Normal').length }].map(t => (
                <button key={t.k} onClick={() => setSubTab(t.k)} style={{ padding: '5px 12px', border: `1px solid ${subTab===t.k ? '#2563eb' : '#e5e7eb'}`, borderRadius: 6, background: subTab===t.k ? '#eff6ff' : '#fff', color: subTab===t.k ? '#2563eb' : '#374151', fontSize: 12, fontWeight: subTab===t.k ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {t.l} <span style={{ marginLeft: 4, background: subTab===t.k ? '#dbeafe' : '#f3f4f6', borderRadius: 10, padding: '1px 6px', fontSize: 11, color: subTab===t.k ? '#1d4ed8' : '#6b7280' }}>{t.c}</span>
                </button>
              ))}

              <div style={{ borderLeft: '1px solid #e5e7eb', height: 24, margin: '0 4px' }} />

              {/* SEARCH */}
              <div style={{ position: 'relative' }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ padding: '6px 10px 6px 30px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', outline: 'none', width: 220 }} onFocus={e => e.target.style.borderColor = '#3b82f6'} onBlur={e => e.target.style.borderColor = '#d1d5db'} />
                <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 13 }}>🔍</span>
              </div>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>{filtered.length}/{currentVendors.length}</span>

              <button onClick={() => setShowFilters(f => !f)} style={{ padding: '5px 12px', border: `1px solid ${showFilters || filters.length > 0 ? '#3b82f6' : '#e5e7eb'}`, borderRadius: 6, background: showFilters || filters.length > 0 ? '#eff6ff' : '#fff', color: showFilters || filters.length > 0 ? '#2563eb' : '#374151', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                ⚙ Filters {filters.length > 0 && <span style={{ background: '#2563eb', color: '#fff', borderRadius: 10, padding: '0 5px', fontSize: 10, marginLeft: 4 }}>{filters.length}</span>}
              </button>
              <button onClick={() => setShowTS(f => !f)} style={{ padding: '5px 12px', border: `1px solid ${showTS ? '#3b82f6' : '#e5e7eb'}`, borderRadius: 6, background: showTS ? '#eff6ff' : '#fff', color: showTS ? '#2563eb' : '#374151', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>🕐 Dates</button>
            </div>
          </div>

          {/* TABLE AREA */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
            {showFilters && <FilterPanel filters={filters} setFilters={setFilters} conj={conj} setConj={setConj} onClose={() => setShowFilters(false)} />}
            {selected.size > 0 && (
              <BulkBar count={selected.size} filteredCount={filtered.length} allSel={allSel}
                onSelAll={() => setSelected(new Set(filtered.map(v => v.id)))}
                onClear={() => setSelected(new Set())}
                onBulkTag={(f, v) => bulkTag([...selected], f, v)}
                onBulkDel={() => bulkDelete([...selected])} />
            )}

            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <thead>
                    <tr>
                      <th style={{ width: colW.drag, padding: '9px 6px', background: '#f9fafb', borderBottom: '2px solid #e5e7eb', position: 'relative' }}><ResizeHandle onResize={d => setColW('drag', d)} /></th>
                      <th style={{ width: colW.num, padding: '9px 8px', background: '#f9fafb', borderBottom: '2px solid #e5e7eb', textAlign: 'center', position: 'relative' }}>
                        <input type="checkbox" checked={allSel} onChange={toggleAll} style={{ cursor: 'pointer', accentColor: '#2563eb' }} />
                        <ResizeHandle onResize={d => setColW('num', d)} />
                      </th>
                      <TH wKey="name" col="name">#  Name</TH>
                      <TH wKey="company" col="company">Company</TH>
                      <TH wKey="title" col="title">Title</TH>
                      <TH wKey="email" col="email">Email</TH>
                      <TH wKey="phone" col="phone">Phone</TH>
                      <TH wKey="type" col="vendor_type">Type</TH>
                      <TH wKey="emailed" col="email_sent">Emailed</TH>
                      <TH wKey="followup" col="follow_up">Follow-Up</TH>
                      <TH wKey="called" col="call_done">Called</TH>
                      <TH wKey="role" col="resume_role">Resume Role</TH>
                      {showTS && <TH wKey="created" col="created_at">Created</TH>}
                      {showTS && <TH wKey="updated" col="updated_at">Updated</TH>}
                      <TH wKey="actions">Actions</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((v, i) => {
                      const isSel = selected.has(v.id), isExp = expanded === v.id;
                      return (
                        <React.Fragment key={v.id}>
                          <tr style={{ background: isSel ? '#eff6ff' : i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: isExp ? 'none' : '1px solid #f3f4f6' }}
                            onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#f0f7ff'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = isSel ? '#eff6ff' : i%2===0 ? '#fff' : '#fafafa'; }}>
                            <td style={{ padding: '8px 6px', textAlign: 'center', color: '#9ca3af', fontSize: 13, cursor: 'grab', width: colW.drag }} title="Drag to reorder">⠿</td>
                            <td style={{ padding: '8px 8px', textAlign: 'center', width: colW.num }}>
                              <input type="checkbox" checked={isSel} onChange={() => toggleSel(v.id)} style={{ cursor: 'pointer', accentColor: '#2563eb' }} />
                            </td>
                            <td style={{ padding: '8px 10px', width: colW.name }}>
                              <span style={{ fontSize: 11, color: '#9ca3af', marginRight: 6 }}>{i+1}</span>
                              <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{v.name}</span>
                            </td>
                            <td style={{ padding: '8px 10px', width: colW.company }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#2563eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.company}</div>
                              {v.website && <a href={v.website.startsWith('http') ? v.website : `https://${v.website}`} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#0891b2', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.website.replace(/https?:\/\/(www\.)?/, '').substring(0, 22)}</a>}
                            </td>
                            <td style={{ padding: '8px 10px', width: colW.title, fontSize: 12, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title || '—'}</td>
                            <td style={{ padding: '8px 10px', width: colW.email }}>
                              {v.email ? <a href={`mailto:${v.email}`} style={{ fontSize: 12, color: '#0891b2', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.email}</a> : <span style={{ color: '#d1d5db', fontSize: 12 }}>—</span>}
                            </td>
                            <td style={{ padding: '8px 10px', width: colW.phone, fontSize: 12, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.phone || <span style={{ color: '#d1d5db' }}>—</span>}</td>
                            <td style={{ padding: '8px 10px', width: colW.type }}><SelectPill value={v.vendor_type || ''} onChange={val => updateVendor(v.id, 'vendor_type', val)} options={T_OPT} styleMap={T_STYLE} /></td>
                            <td style={{ padding: '8px 10px', width: colW.emailed }}><SelectPill value={v.email_sent || ''} onChange={val => updateVendor(v.id, 'email_sent', val)} options={S_OPT} styleMap={S_STYLE} /></td>
                            <td style={{ padding: '8px 10px', width: colW.followup }}><SelectPill value={v.follow_up || ''} onChange={val => updateVendor(v.id, 'follow_up', val)} options={S_OPT} styleMap={S_STYLE} /></td>
                            <td style={{ padding: '8px 10px', width: colW.called }}><SelectPill value={v.call_done || ''} onChange={val => updateVendor(v.id, 'call_done', val)} options={S_OPT} styleMap={S_STYLE} /></td>
                            <td style={{ padding: '8px 10px', width: colW.role }}>
                              {editCell === v.id
                                ? <input autoFocus defaultValue={v.resume_role} onBlur={e => { updateVendor(v.id, 'resume_role', e.target.value); setEditCell(null); }} onKeyDown={e => e.key === 'Enter' && e.target.blur()} style={{ width: '100%', border: '1px solid #3b82f6', borderRadius: 4, padding: '3px 6px', fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                                : <div onClick={() => setEditCell(v.id)} style={{ fontSize: 12, color: v.resume_role ? '#7c3aed' : '#d1d5db', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minHeight: 20 }}>{v.resume_role || '+ Add'}</div>
                              }
                            </td>
                            {showTS && <td style={{ padding: '8px 10px', width: colW.created, fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>{formatDate(v.created_at)}</td>}
                            {showTS && <td style={{ padding: '8px 10px', width: colW.updated, fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>{formatDate(v.updated_at)}</td>}
                            <td style={{ padding: '8px 10px', width: colW.actions }}>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button onClick={() => setExpanded(isExp ? null : v.id)} style={{ border: '1px solid #e5e7eb', borderRadius: 4, background: '#fff', color: '#6b7280', cursor: 'pointer', padding: '3px 6px', fontSize: 11, fontFamily: 'inherit' }}>{isExp ? '▲' : '▼'}</button>
                                <button onClick={() => { setEditingVendor(v); setShowVendorModal(true); }} style={{ border: '1px solid #e5e7eb', borderRadius: 4, background: '#fff', color: '#6b7280', cursor: 'pointer', padding: '3px 6px', fontSize: 11, fontFamily: 'inherit' }}>Edit</button>
                                <button onClick={() => setDelConfirm(v.id)} style={{ border: '1px solid #fca5a5', borderRadius: 4, background: '#fef2f2', color: '#dc2626', cursor: 'pointer', padding: '3px 6px', fontSize: 11, fontFamily: 'inherit' }}>Del</button>
                              </div>
                            </td>
                          </tr>
                          {isExp && (
                            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                              <td colSpan={showTS ? 16 : 14} style={{ padding: '12px 20px 14px 60px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                  <div>
                                    <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Notes</div>
                                    <NotesCell value={v.notes} onSave={val => updateVendor(v.id, 'notes', val)} />
                                  </div>
                                  <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 2 }}>
                                    {v.website && <div>🔗 <a href={v.website.startsWith('http') ? v.website : `https://${v.website}`} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>{v.website}</a></div>}
                                    {v.created_at && <div>📅 Added: <strong style={{ color: '#111827' }}>{formatDate(v.created_at)}</strong></div>}
                                    {v.updated_at && <div>🕐 Updated: <strong style={{ color: '#111827' }}>{formatDate(v.updated_at)}</strong></div>}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                          {delConfirm === v.id && (
                            <tr style={{ background: '#fef2f2' }}>
                              <td colSpan={showTS ? 16 : 14} style={{ padding: '9px 16px' }}>
                                <span style={{ fontSize: 13, color: '#dc2626' }}>Delete <strong>{v.name}</strong>? This removes from all views permanently. &nbsp;</span>
                                <button onClick={() => { deleteVendor(v.id); setDelConfirm(null); }} style={{ border: 'none', borderRadius: 5, background: '#dc2626', color: '#fff', padding: '5px 14px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, marginRight: 8 }}>Yes, Delete</button>
                                <button onClick={() => setDelConfirm(null)} style={{ border: '1px solid #d1d5db', borderRadius: 5, background: '#fff', color: '#374151', padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12 }}>Cancel</button>
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
                <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
                  {filters.length > 0 ? <><div style={{ fontSize: 24, marginBottom: 8 }}>🔍</div>No vendors match these filters.<br /><button onClick={() => setFilters([])} style={{ marginTop: 12, padding: '6px 16px', border: '1px solid #93c5fd', borderRadius: 6, background: '#eff6ff', color: '#2563eb', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', fontWeight: 600 }}>Clear Filters</button></> : 'No vendors found.'}
                </div>
              )}
            </div>

            <div style={{ padding: '10px 0', fontSize: 12, color: '#9ca3af', textAlign: 'right' }}>
              Showing {filtered.length} of {currentVendors.length} vendors · Drag right edge of column header to resize
            </div>
          </div>
        </div>
      </div>

      {showVendorModal && <VendorModal vendor={editingVendor} onSave={saveVendor} onClose={() => { setShowVendorModal(false); setEditingVendor(null); }} />}
      {showCSV && <CSVModal onClose={() => setShowCSV(false)} onImport={handleCSVImport} wishlists={wishlists} />}
      {showTemplates && <TemplatesModal onClose={() => setShowTemplates(false)} />}
    </div>
  );
}
