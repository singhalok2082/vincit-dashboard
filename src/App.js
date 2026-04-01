import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabase';
import { ALL_VENDORS } from './data';
import { Search } from 'lucide-react';

const lload = (key, fb) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const lsave = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };

const STATUS_OPTIONS = ['', 'Yes', 'No', 'Pending'];
const STATUS_STYLE = {
  Yes:     { bg: '#0d2e1a', text: '#4ade80', border: '#166534', icon: '✅' },
  No:      { bg: '#2d0f0f', text: '#f87171', border: '#991b1b', icon: '❌' },
  Pending: { bg: '#2d2000', text: '#fbbf24', border: '#92400e', icon: '⏳' },
  '':      { bg: 'transparent', text: '#4b5563', border: '#1f2937', icon: '—' },
};
const VENDOR_TYPE_STYLE = {
  Prime:   { bg: '#1a0d00', text: '#f59e0b', border: '#d97706', icon: '⭐' },
  Normal:  { bg: '#0d1a2e', text: '#60a5fa', border: '#2563eb', icon: '🔵' },
  '':      { bg: '#0f172a', text: '#6b7280', border: '#374151', icon: '○' },
};

function StatusPill({ value, onChange, options, styleMap }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const s = styleMap[value] || styleMap[''];
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{
        background: s.bg, color: s.text, border: `1px solid ${s.border}`,
        borderRadius: 20, padding: '3px 10px', fontSize: 11, fontFamily: 'DM Sans',
        cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4,
      }}>
        {s.icon} {value || '—'}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 9999, background: '#0f172a', border: '1px solid #1f2937', borderRadius: 10, overflow: 'hidden', minWidth: 120, boxShadow: '0 8px 32px #000c' }}>
          {options.map(opt => {
            const st = styleMap[opt] || styleMap[''];
            return (
              <button key={opt} onClick={() => { onChange(opt); setOpen(false); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', background: 'transparent', border: 'none', color: st.text || '#9ca3af', fontSize: 12, fontFamily: 'DM Sans', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = '#1f2937'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >{st.icon} {opt || 'Untagged'}</button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color, sub }) {
  return (
    <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1a2744 100%)', border: `1px solid ${color}30`, borderRadius: 18, padding: '18px 22px', position: 'relative', overflow: 'hidden', flex: 1, minWidth: 130, transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 32px ${color}20`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ position: 'absolute', top: -24, right: -24, width: 80, height: 80, borderRadius: '50%', background: `${color}15` }} />
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 30, fontWeight: 800, color, fontFamily: 'Syne', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#6b7280', fontFamily: 'DM Sans', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#374151', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function VendorModal({ vendor, onSave, onClose }) {
  const [form, setForm] = useState(vendor || { name: '', title: '', company: '', email: '', phone: '', website: '', emailSent: '', followUp: '', callDone: '', resumeRole: '', notes: '', vendorType: '' });
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const fields = [
    { key: 'name', label: 'Full Name *', placeholder: 'John Smith' },
    { key: 'title', label: 'Job Title', placeholder: 'Senior Recruiter' },
    { key: 'company', label: 'Company *', placeholder: 'ABC Staffing' },
    { key: 'email', label: 'Email', placeholder: 'john@company.com' },
    { key: 'phone', label: 'Phone', placeholder: '+1 (555) 000-0000' },
    { key: 'website', label: 'Website', placeholder: 'www.company.com' },
    { key: 'resumeRole', label: 'Resume Sent For Role', placeholder: 'Java Developer...' },
    { key: 'notes', label: 'Notes', placeholder: 'Any notes...' },
  ];
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000d', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(135deg, #0f172a, #111827)', border: '1px solid #1b998b40', borderRadius: 24, padding: 32, width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 32px 80px #000c' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontFamily: 'Syne', color: '#e2e8f0', fontSize: 20, fontWeight: 800 }}>{vendor ? '✏️ Edit Vendor' : '➕ Add New Vendor'}</h2>
          <button onClick={onClose} style={{ background: '#1f2937', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 18, borderRadius: 8, width: 32, height: 32 }}>✕</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {fields.map(({ key, label, placeholder }) => (
            <div key={key} style={{ gridColumn: ['notes', 'resumeRole'].includes(key) ? '1/-1' : 'auto' }}>
              <label style={{ fontSize: 11, color: '#6b7280', fontFamily: 'DM Sans', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</label>
              <input value={form[key] || ''} onChange={e => f(key, e.target.value)} placeholder={placeholder}
                style={{ display: 'block', width: '100%', marginTop: 4, padding: '10px 14px', background: '#1e293b', border: '1px solid #334155', borderRadius: 10, color: '#e2e8f0', fontSize: 13, fontFamily: 'DM Sans', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginTop: 14 }}>
          {[{ key: 'vendorType', label: 'Vendor Type', opts: ['', 'Normal', 'Prime'] }, { key: 'emailSent', label: 'Email Sent?', opts: STATUS_OPTIONS }, { key: 'followUp', label: 'Follow-Up?', opts: STATUS_OPTIONS }, { key: 'callDone', label: 'Call Done?', opts: STATUS_OPTIONS }].map(({ key, label, opts }) => (
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
          <button onClick={() => { if (!form.name || !form.company) { alert('Name and Company are required'); return; } onSave(form); }} style={{ padding: '10px 28px', borderRadius: 12, background: 'linear-gradient(135deg, #1b998b, #0d6e65)', border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700, boxShadow: '0 4px 20px #1b998b40' }}>
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
    { id: 2, title: 'Resume Follow-Up', body: `Hi [Name],\n\nFollowing up on the resume I shared for the [Role] position. I wanted to check if you had a chance to review the candidate's profile.\n\nThanks,\nAlok` },
    { id: 3, title: 'Partnership Intro', body: `Hello [Name],\n\nI'm reaching out from ConsultAdd's IT Staffing division. We specialize in placing top IT talent and would love to explore a vendor partnership with [Company].\n\nLet's connect!\n\nBest,\nAlok Kumar Singh\nGTM Automation Engineer, ConsultAdd` },
  ]));
  const [editing, setEditing] = useState(null);
  const [copied, setCopied] = useState(null);
  const sv = (t) => { setTemplates(t); lsave('emailTemplates', t); };
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000d', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(135deg, #0f172a, #1a0d0a)', border: '1px solid #ff6b3540', borderRadius: 24, padding: 32, width: '100%', maxWidth: 660, maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 32px 80px #000c' }}>
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
            {editing === t.id ? <textarea value={t.body} onChange={e => sv(templates.map(x => x.id === t.id ? { ...x, body: e.target.value } : x))} rows={7} style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, color: '#e2e8f0', padding: 12, fontFamily: 'DM Sans', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', outline: 'none', lineHeight: 1.6 }} />
              : <pre style={{ margin: 0, fontFamily: 'DM Sans', fontSize: 12, color: '#94a3b8', whiteSpace: 'pre-wrap', lineHeight: 1.7, maxHeight: 100, overflow: 'hidden' }}>{t.body}</pre>}
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
    <div style={{ background: 'linear-gradient(135deg, #0f0d1f, #1a1040)', border: '1px solid #7c3aed40', borderRadius: 20, overflow: 'hidden' }}>
      <div style={{ padding: '12px 18px', background: 'linear-gradient(90deg, #7c3aed20, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: min ? 'none' : '1px solid #7c3aed20' }}>
        <span style={{ fontFamily: 'Syne', fontSize: 13, fontWeight: 700, color: '#c4b5fd' }}>📝 Thoughts</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {!min && <button onClick={() => { lsave('thoughts', text); setSaved(true); setTimeout(() => setSaved(false), 2000); }} style={{ padding: '4px 12px', borderRadius: 8, background: saved ? '#4ade8020' : '#7c3aed30', border: `1px solid ${saved ? '#4ade80' : '#7c3aed'}`, color: saved ? '#4ade80' : '#c4b5fd', cursor: 'pointer', fontSize: 11, fontFamily: 'DM Sans' }}>{saved ? '✅' : '💾'}</button>}
          <button onClick={() => setMin(!min)} style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', fontSize: 14 }}>{min ? '⬆' : '⬇'}</button>
        </div>
      </div>
      {!min && (
        <div style={{ padding: '12px 18px 18px' }}>
          <div style={{ fontSize: 11, color: '#8b5cf6', fontFamily: 'DM Sans', fontStyle: 'italic', marginBottom: 8, padding: '6px 10px', background: '#7c3aed15', borderRadius: 8, borderLeft: '3px solid #7c3aed' }}>💭 {quotes[qi]}</div>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder={"Thoughts... Hindi mein bhi! 🙏"} style={{ width: '100%', minHeight: 100, background: '#1e1040', border: '1px solid #4c1d95', borderRadius: 10, color: '#e2e8f0', padding: '10px 12px', fontFamily: 'DM Sans', fontSize: 13, resize: 'vertical', outline: 'none', lineHeight: 1.7, boxSizing: 'border-box' }} />
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [useLocal, setUseLocal] = useState(false);
  const [view, setView] = useState('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [showEmail, setShowEmail] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [sortCol, setSortCol] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  const norm = (v) => ({ ...v, emailSent: v.emailSent || v.email_sent || '', followUp: v.followUp || v.follow_up || '', callDone: v.callDone || v.call_done || '', resumeRole: v.resumeRole || v.resume_role || '', vendorType: v.vendorType || v.vendor_type || '' });

  const loadVendors = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('vendors').select('*').order('id');
      if (error) throw error;
      if (data && data.length > 0) { setVendors(data); setUseLocal(false); }
      else {
        const seeded = ALL_VENDORS.map(v => ({ name: v.name, title: v.title || '', company: v.company, email: v.email || '', phone: v.phone || '', website: v.website || '', notes: '', vendor_type: '', email_sent: '', follow_up: '', call_done: '', resume_role: '' }));
        const { data: d2 } = await supabase.from('vendors').insert(seeded).select();
        if (d2) setVendors(d2);
      }
    } catch (e) {
      setUseLocal(true);
      setVendors(lload('vendors_v2', ALL_VENDORS));
      setError('Offline mode — changes saved locally only');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadVendors(); }, [loadVendors]);

  useEffect(() => {
    if (useLocal) return;
    const ch = supabase.channel('vendors-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'vendors' }, loadVendors).subscribe();
    return () => supabase.removeChannel(ch);
  }, [useLocal, loadVendors]);

  const updateVendor = async (id, field, value) => {
    setVendors(v => v.map(x => x.id === id ? { ...x, [field]: value } : x));
    if (!useLocal) {
      setSyncing(true);
      const dbField = { emailSent: 'email_sent', followUp: 'follow_up', callDone: 'call_done', resumeRole: 'resume_role', vendorType: 'vendor_type' }[field] || field;
      await supabase.from('vendors').update({ [dbField]: value }).eq('id', id);
      setSyncing(false);
    } else { lsave('vendors_v2', vendors.map(x => x.id === id ? { ...x, [field]: value } : x)); }
  };

  const saveVendor = async (form) => {
    const dbForm = { name: form.name, title: form.title || '', company: form.company, email: form.email || '', phone: form.phone || '', website: form.website || '', notes: form.notes || '', vendor_type: form.vendorType || '', email_sent: form.emailSent || '', follow_up: form.followUp || '', call_done: form.callDone || '', resume_role: form.resumeRole || '' };
    if (!useLocal) {
      setSyncing(true);
      if (modal === 'add') { const { data } = await supabase.from('vendors').insert([dbForm]).select(); if (data) setVendors(v => [...v, data[0]]); }
      else { await supabase.from('vendors').update(dbForm).eq('id', modal.id); setVendors(v => v.map(x => x.id === modal.id ? { ...x, ...dbForm } : x)); }
      setSyncing(false);
    } else {
      if (modal === 'add') { const nv = { ...form, id: Date.now() }; const u = [...vendors, nv]; setVendors(u); lsave('vendors_v2', u); }
      else { const u = vendors.map(x => x.id === modal.id ? { ...form, id: modal.id } : x); setVendors(u); lsave('vendors_v2', u); }
    }
    setModal(null);
  };

  const deleteVendor = async (id) => {
    if (!useLocal) await supabase.from('vendors').delete().eq('id', id);
    const u = vendors.filter(x => x.id !== id); setVendors(u);
    if (useLocal) lsave('vendors_v2', u);
    setDeleteConfirm(null);
  };

  const allNorm = vendors.map(norm);
  const total = allNorm.length;
  const primeCount = allNorm.filter(v => v.vendorType === 'Prime').length;
  const normalCount = allNorm.filter(v => v.vendorType === 'Normal').length;
  const emailsSent = allNorm.filter(v => v.emailSent === 'Yes').length;
  const callsDone = allNorm.filter(v => v.callDone === 'Yes').length;

  const filtered = allNorm.filter(v => {
    if (view === 'prime' && v.vendorType !== 'Prime') return false;
    if (view === 'normal' && v.vendorType !== 'Normal') return false;
    const q = search.toLowerCase();
    if (q && !`${v.name} ${v.company} ${v.email} ${v.title}`.toLowerCase().includes(q)) return false;
    if (statusFilter === 'emailed') return v.emailSent === 'Yes';
    if (statusFilter === 'not_emailed') return !v.emailSent || v.emailSent === 'No';
    if (statusFilter === 'pending') return v.emailSent === 'Pending' || v.followUp === 'Pending';
    if (statusFilter === 'called') return v.callDone === 'Yes';
    return true;
  }).sort((a, b) => {
    const av = (a[sortCol] || '').toLowerCase(), bv = (b[sortCol] || '').toLowerCase();
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const toggleSort = (col) => { if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortCol(col); setSortDir('asc'); } };
  const viewConfig = { all: { label: '🌐 All Vendors', color: '#1b998b', count: total }, normal: { label: '🔵 Normal', color: '#3b82f6', count: normalCount }, prime: { label: '⭐ Prime', color: '#f59e0b', count: primeCount } };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#070d1c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 48, height: 48, border: '3px solid #1b998b40', borderTop: '3px solid #1b998b', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <div style={{ fontFamily: 'Syne', color: '#1b998b', fontSize: 16, fontStyle: 'italic' }}>Vincit qui se vincit...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#070d1c', fontFamily: 'DM Sans, sans-serif', backgroundImage: 'radial-gradient(ellipse at 10% 0%, #0d2d3a 0%, transparent 45%), radial-gradient(ellipse at 90% 0%, #1a0d2e 0%, transparent 45%)' }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #0a1120; }
        ::-webkit-scrollbar-thumb { background: #1b998b40; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #1b998b80; }
      `}</style>

      {/* HEADER */}
      <div style={{ padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #0f2031', background: 'linear-gradient(180deg, #060d1a 0%, transparent 100%)', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(16px)' }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: 'Syne', fontSize: 22, fontWeight: 800, color: '#e2e8f0', fontStyle: 'italic' }}>
            <span style={{ color: '#1b998b' }}>Vincit</span> qui se vincit
          </h1>
          <p style={{ margin: 0, fontSize: 11, color: '#374151', letterSpacing: 1, fontFamily: 'DM Sans' }}>
            IT STAFFING · CONSULTADD
            {syncing && <span style={{ color: '#1b998b', marginLeft: 8, animation: 'pulse 1s infinite' }}>● syncing</span>}
            {!useLocal && <span style={{ color: '#1b998b', marginLeft: 8 }}>● live</span>}
            {useLocal && <span style={{ color: '#f59e0b', marginLeft: 8 }}>⚠ offline</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={() => setShowEmail(true)} style={{ padding: '8px 16px', borderRadius: 12, background: '#2d1810', border: '1px solid #ff6b3540', color: '#ff6b35', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600 }}>📧 Templates</button>
          <button onClick={() => setModal('add')} style={{ padding: '9px 22px', borderRadius: 12, background: 'linear-gradient(135deg, #1b998b, #0d6e65)', border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13, fontWeight: 700, boxShadow: '0 4px 20px #1b998b40' }}>+ Add Vendor</button>
        </div>
      </div>

      <div style={{ padding: '20px 28px', maxWidth: 1700, margin: '0 auto' }}>
        {error && <div style={{ background: '#2d2000', border: '1px solid #92400e', borderRadius: 12, padding: '10px 16px', marginBottom: 16, color: '#fbbf24', fontSize: 13 }}>⚠️ {error}</div>}

        {/* STATS */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <StatCard label="Total Vendors" value={total} icon="🏢" color="#1b998b" />
          <StatCard label="Prime Vendors" value={primeCount} icon="⭐" color="#f59e0b" sub={`${Math.round(primeCount/total*100)||0}% of total`} />
          <StatCard label="Normal Vendors" value={normalCount} icon="🔵" color="#3b82f6" />
          <StatCard label="Emails Sent" value={emailsSent} icon="📨" color="#8b5cf6" sub={`${Math.round(emailsSent/total*100)||0}% contacted`} />
          <StatCard label="Calls Done" value={callsDone} icon="📞" color="#ff6b35" />
        </div>

        {/* VIEW TABS */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {Object.entries(viewConfig).map(([key, cfg]) => (
            <button key={key} onClick={() => setView(key)} style={{
              padding: '10px 22px', borderRadius: 14, fontFamily: 'Syne', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
              background: view === key ? `${cfg.color}20` : '#0f172a',
              border: `2px solid ${view === key ? cfg.color : '#1f2937'}`,
              color: view === key ? cfg.color : '#6b7280',
              boxShadow: view === key ? `0 0 24px ${cfg.color}25` : 'none',
            }}>
              {cfg.label} <span style={{ marginLeft: 6, background: view === key ? `${cfg.color}30` : '#1f2937', color: view === key ? cfg.color : '#4b5563', borderRadius: 20, padding: '2px 8px', fontSize: 11 }}>{cfg.count}</span>
            </button>
          ))}
          {view !== 'all' && (
            <div style={{ marginLeft: 12, padding: '10px 16px', borderRadius: 14, background: '#0f172a', border: '1px solid #1f2937', color: '#6b7280', fontSize: 12, fontFamily: 'DM Sans', display: 'flex', alignItems: 'center' }}>
              {view === 'prime' ? '⭐ Showing Prime vendors only — tag more via Type dropdown' : '🔵 Showing Normal vendors only — tag more via Type dropdown'}
            </div>
          )}
        </div>

        {/* MAIN LAYOUT */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 290px', gap: 18, alignItems: 'start' }}>
          <div>
            {/* SEARCH + FILTERS */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#4b5563' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, company, email..."
                  style={{ width: '100%', padding: '9px 14px 9px 36px', background: '#0f172a', border: '1px solid #1f2937', borderRadius: 12, color: '#e2e8f0', fontSize: 13, fontFamily: 'DM Sans', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              {[{ key: 'all', label: 'All' }, { key: 'emailed', label: '✅ Emailed' }, { key: 'not_emailed', label: '❌ Not Emailed' }, { key: 'pending', label: '⏳ Pending' }, { key: 'called', label: '📞 Called' }].map(fi => (
                <button key={fi.key} onClick={() => setStatusFilter(fi.key)} style={{ padding: '7px 14px', borderRadius: 10, fontFamily: 'DM Sans', fontSize: 12, cursor: 'pointer', background: statusFilter === fi.key ? '#1b998b20' : '#0f172a', border: `1px solid ${statusFilter === fi.key ? '#1b998b' : '#1f2937'}`, color: statusFilter === fi.key ? '#1b998b' : '#6b7280', fontWeight: statusFilter === fi.key ? 700 : 400 }}>{fi.label}</button>
              ))}
              <span style={{ fontSize: 12, color: '#374151', marginLeft: 'auto', fontFamily: 'DM Sans' }}>{filtered.length}/{total}</span>
            </div>

            {/* TABLE */}
            <div style={{ background: '#080e1c', borderRadius: 20, overflow: 'hidden', border: '1px solid #0f2031', boxShadow: '0 4px 40px #00000080' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
                  <thead>
                    <tr>
                      {[['#', null], ['Name', 'name'], ['Company', 'company'], ['Contact', null], ['Type ▾', null], ['📨 Email', null], ['🔔 Follow', null], ['📞 Call', null], ['Role', null], ['', null]].map(([label, col]) => (
                        <th key={label} onClick={col ? () => toggleSort(col) : undefined} style={{ padding: '12px 12px', textAlign: 'left', fontFamily: 'Syne', fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 1.2, cursor: col ? 'pointer' : 'default', background: '#060d1a', borderBottom: '1px solid #0f2031', whiteSpace: 'nowrap', userSelect: 'none' }}>
                          {label}{col && sortCol === col && <span style={{ color: '#1b998b', marginLeft: 3 }}>{sortDir === 'asc' ? '▲' : '▼'}</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((v, i) => {
                      const isExp = expandedRow === v.id;
                      const rowBg = i % 2 === 0 ? '#080e1c' : '#070c18';
                      return (
                        <React.Fragment key={v.id}>
                          <tr style={{ background: rowBg, borderBottom: isExp ? 'none' : '1px solid #0d1829', transition: 'background 0.1s' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#0d1829'}
                            onMouseLeave={e => e.currentTarget.style.background = rowBg}
                          >
                            <td style={{ padding: '10px 12px', color: '#1f2937', fontSize: 11, fontWeight: 700 }}>{i + 1}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 13 }}>{v.name}</div>
                              {v.title && <div style={{ fontSize: 10, color: '#374151', marginTop: 1, fontStyle: 'italic' }}>{v.title}</div>}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ fontWeight: 700, color: '#1b998b', fontSize: 13 }}>{v.company}</div>
                              {v.website && <a href={v.website.startsWith('http') ? v.website : `https://${v.website}`} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: '#1e40af', textDecoration: 'none' }}>🔗 {v.website}</a>}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              {v.email && <div style={{ fontSize: 11, color: '#60a5fa' }}>✉ {v.email}</div>}
                              {v.phone && <div style={{ fontSize: 10, color: '#4b5563', marginTop: 2 }}>📞 {v.phone}</div>}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <StatusPill value={v.vendorType} onChange={val => updateVendor(v.id, 'vendorType', val)} options={['', 'Normal', 'Prime']} styleMap={VENDOR_TYPE_STYLE} />
                            </td>
                            <td style={{ padding: '10px 12px' }}><StatusPill value={v.emailSent} onChange={val => updateVendor(v.id, 'emailSent', val)} options={STATUS_OPTIONS} styleMap={STATUS_STYLE} /></td>
                            <td style={{ padding: '10px 12px' }}><StatusPill value={v.followUp} onChange={val => updateVendor(v.id, 'followUp', val)} options={STATUS_OPTIONS} styleMap={STATUS_STYLE} /></td>
                            <td style={{ padding: '10px 12px' }}><StatusPill value={v.callDone} onChange={val => updateVendor(v.id, 'callDone', val)} options={STATUS_OPTIONS} styleMap={STATUS_STYLE} /></td>
                            <td style={{ padding: '10px 12px', maxWidth: 130 }}>
                              {editingCell?.id === v.id && editingCell?.field === 'resumeRole'
                                ? <input autoFocus defaultValue={v.resumeRole} onBlur={e => { updateVendor(v.id, 'resumeRole', e.target.value); setEditingCell(null); }} onKeyDown={e => e.key === 'Enter' && e.target.blur()}
                                    style={{ width: '100%', background: '#1e293b', border: '1px solid #1b998b', borderRadius: 6, color: '#e2e8f0', padding: '4px 8px', fontSize: 11, outline: 'none', boxSizing: 'border-box' }} />
                                : <div onClick={() => setEditingCell({ id: v.id, field: 'resumeRole' })} style={{ fontSize: 11, color: v.resumeRole ? '#c4b5fd' : '#1f2937', cursor: 'pointer', padding: '3px 6px', borderRadius: 6, background: v.resumeRole ? '#4c1d9520' : 'transparent', border: '1px dashed transparent', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }} onMouseEnter={e => e.target.style.borderColor = '#334155'} onMouseLeave={e => e.target.style.borderColor = 'transparent'} title={v.resumeRole || 'Click to add'}>{v.resumeRole || <span style={{ color: '#1f2937' }}>+ Role</span>}</div>
                              }
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button onClick={() => setExpandedRow(isExp ? null : v.id)} style={{ background: 'none', border: '1px solid #1f2937', borderRadius: 6, color: '#6b7280', cursor: 'pointer', padding: '3px 6px', fontSize: 10 }}>{isExp ? '▲' : '▼'}</button>
                                <button onClick={() => setModal(norm(v))} style={{ background: 'none', border: '1px solid #1f2937', borderRadius: 6, color: '#6b7280', cursor: 'pointer', padding: '3px 6px', fontSize: 10 }}>✏️</button>
                                <button onClick={() => setDeleteConfirm(v.id)} style={{ background: 'none', border: 'none', color: '#2d1010', cursor: 'pointer', padding: '3px 4px', fontSize: 12 }} onMouseEnter={e => e.currentTarget.style.color = '#f87171'} onMouseLeave={e => e.currentTarget.style.color = '#2d1010'}>🗑️</button>
                              </div>
                            </td>
                          </tr>
                          {isExp && (
                            <tr style={{ background: '#0a1628', borderBottom: '1px solid #0d1829' }}>
                              <td colSpan={10} style={{ padding: '8px 16px 12px 50px' }}>
                                <div style={{ fontSize: 10, color: '#374151', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Notes</div>
                                <textarea value={v.notes || ''} onChange={e => updateVendor(v.id, 'notes', e.target.value)} placeholder="Add notes..." rows={2}
                                  style={{ width: '100%', maxWidth: 520, background: '#0f172a', border: '1px solid #1f2937', borderRadius: 10, color: '#94a3b8', padding: '8px 12px', fontFamily: 'DM Sans', fontSize: 12, resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6 }} />
                              </td>
                            </tr>
                          )}
                          {deleteConfirm === v.id && (
                            <tr style={{ background: '#1a0000' }}>
                              <td colSpan={10} style={{ padding: '10px 16px' }}>
                                <span style={{ color: '#f87171', fontSize: 13 }}>Delete <b>{v.name}</b>? &nbsp;</span>
                                <button onClick={() => deleteVendor(v.id)} style={{ background: '#991b1b', border: 'none', color: '#fff', borderRadius: 8, padding: '5px 14px', cursor: 'pointer', fontSize: 12, marginRight: 8 }}>Yes</button>
                                <button onClick={() => setDeleteConfirm(null)} style={{ background: '#1f2937', border: 'none', color: '#9ca3af', borderRadius: 8, padding: '5px 14px', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
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
                <div style={{ padding: 48, textAlign: 'center', color: '#374151', fontFamily: 'DM Sans', fontSize: 14 }}>
                  {view === 'prime' ? '⭐ No Prime vendors yet.\nUse the Type dropdown on any vendor row to tag them as Prime.' : view === 'normal' ? '🔵 No Normal vendors yet.\nUse the Type dropdown on any vendor row to tag them as Normal.' : 'No vendors found.'}
                </div>
              )}
            </div>
          </div>

          {/* SIDEBAR */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <ThoughtsWidget />
            <div style={{ background: 'linear-gradient(135deg, #0f172a, #1a2233)', border: '1px solid #1b998b20', borderRadius: 20, padding: 18 }}>
              <div style={{ fontFamily: 'Syne', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 }}>📊 Pipeline</div>
              {[{ label: 'Prime Tagged', val: primeCount, color: '#f59e0b' }, { label: 'Email Coverage', val: emailsSent, color: '#8b5cf6' }, { label: 'Call Coverage', val: callsDone, color: '#ff6b35' }].map(({ label, val, color }) => {
                const pct = Math.round(val / total * 100) || 0;
                return (
                  <div key={label} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: '#6b7280', fontFamily: 'DM Sans' }}>{label}</span>
                      <span style={{ fontSize: 12, color, fontFamily: 'DM Sans', fontWeight: 700 }}>{val}/{total}</span>
                    </div>
                    <div style={{ background: '#0f172a', borderRadius: 20, height: 5, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 20, background: `linear-gradient(90deg, ${color}, ${color}80)`, transition: 'width 0.8s' }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ background: '#0f172a', border: '1px solid #1f2937', borderRadius: 20, padding: 18 }}>
              <div style={{ fontFamily: 'Syne', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 }}>🗂 Views</div>
              {[{ icon: '🌐', label: 'All Vendors', desc: 'Every contact in your CRM', key: 'all' }, { icon: '⭐', label: 'Prime Vendors', desc: 'High-priority partners', key: 'prime' }, { icon: '🔵', label: 'Normal Vendors', desc: 'Standard contacts', key: 'normal' }].map(({ icon, label, desc, key }) => (
                <div key={key} onClick={() => setView(key)} style={{ marginBottom: 8, padding: '10px 12px', background: view === key ? '#1b998b10' : '#0a1120', borderRadius: 12, border: `1px solid ${view === key ? '#1b998b30' : '#0f2031'}`, cursor: 'pointer', transition: 'all 0.15s' }}>
                  <div style={{ fontSize: 13, color: view === key ? '#1b998b' : '#e2e8f0', fontFamily: 'DM Sans', fontWeight: 600 }}>{icon} {label}</div>
                  <div style={{ fontSize: 11, color: '#374151', marginTop: 2 }}>{desc}</div>
                </div>
              ))}
              <div style={{ fontSize: 11, color: '#1b998b', marginTop: 10, padding: '8px 12px', background: '#1b998b10', borderRadius: 10, border: '1px solid #1b998b20', lineHeight: 1.5 }}>
                💡 Use the <b>Type ▾</b> dropdown on any row to tag vendors
              </div>
            </div>
            <div style={{ background: '#0f172a', border: '1px solid #1f2937', borderRadius: 20, padding: 18 }}>
              <div style={{ fontFamily: 'Syne', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>⚡ Actions</div>
              {[
                { label: '+ Add New Vendor', color: '#1b998b', bg: '#1b998b15', border: '#1b998b40', action: () => setModal('add') },
                { label: '📧 Email Templates', color: '#ff6b35', bg: '#ff6b3510', border: '#ff6b3530', action: () => setShowEmail(true) },
                { label: '💾 Export Backup', color: '#6b7280', bg: '#1f293710', border: '#334155', action: () => { const blob = new Blob([JSON.stringify(vendors, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'vendors_backup.json'; a.click(); } },
              ].map(({ label, color, bg, border, action }) => (
                <button key={label} onClick={action} style={{ display: 'block', width: '100%', marginBottom: 8, padding: '10px 14px', borderRadius: 12, background: bg, border: `1px solid ${border}`, color, cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13, textAlign: 'left' }}>{label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {(modal === 'add' || (modal && modal.id)) && <VendorModal vendor={modal === 'add' ? null : modal} onSave={saveVendor} onClose={() => setModal(null)} />}
      {showEmail && <EmailTemplatesPanel onClose={() => setShowEmail(false)} />}
    </div>
  );
}
