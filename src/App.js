import React, { useState, useEffect, useRef } from 'react';
import { ALL_VENDORS } from './data';
import {
  Search, Plus, X, Check, Phone, Mail, Globe, ChevronDown,
  MoreVertical, Copy, Trash2, Edit3, Save, FileText,
  TrendingUp, Users, CheckCircle, Clock, StickyNote,
  ChevronUp, Download, Upload, Zap, BookOpen, MessageSquare
} from 'lucide-react';

// ─── STORAGE HELPERS ─────────────────────────────────────────────
const load = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
};
const save = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };

// ─── STATUS CONFIG ────────────────────────────────────────────────
const STATUS_OPTIONS = ['', 'Yes', 'No', 'Pending'];
const STATUS_STYLE = {
  Yes:     { bg: '#0d2e1a', text: '#4ade80', border: '#166534', icon: '✅' },
  No:      { bg: '#2d0f0f', text: '#f87171', border: '#991b1b', icon: '❌' },
  Pending: { bg: '#2d2000', text: '#fbbf24', border: '#92400e', icon: '⏳' },
  '':      { bg: 'transparent', text: '#4b5563', border: '#1f2937', icon: '—' },
};

function StatusPill({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const s = STATUS_STYLE[value] || STATUS_STYLE[''];
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{
        background: s.bg, color: s.text, border: `1px solid ${s.border}`,
        borderRadius: 20, padding: '3px 10px', fontSize: 11, fontFamily: 'DM Sans',
        cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4,
        transition: 'all 0.2s'
      }}>
        {s.icon} {value || '—'}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '110%', left: 0, zIndex: 999,
          background: '#111827', border: '1px solid #1f2937', borderRadius: 10,
          overflow: 'hidden', minWidth: 110, boxShadow: '0 8px 32px #000a'
        }}>
          {STATUS_OPTIONS.map(opt => {
            const st = STATUS_STYLE[opt];
            return (
              <button key={opt} onClick={() => { onChange(opt); setOpen(false); }} style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px',
                background: 'transparent', border: 'none', color: st.text || '#9ca3af',
                fontSize: 12, fontFamily: 'DM Sans', cursor: 'pointer',
              }}
                onMouseEnter={e => e.target.style.background = '#1f2937'}
                onMouseLeave={e => e.target.style.background = 'transparent'}
              >
                {st.icon} {opt || 'Clear'}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, sub }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      border: `1px solid ${color}30`, borderRadius: 16, padding: '20px 24px',
      position: 'relative', overflow: 'hidden', flex: 1, minWidth: 140,
    }}>
      <div style={{
        position: 'absolute', top: -20, right: -20, width: 80, height: 80,
        borderRadius: '50%', background: `${color}15`,
      }} />
      <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color, fontFamily: 'Syne' }}>{value}</div>
      <div style={{ fontSize: 12, color: '#6b7280', fontFamily: 'DM Sans', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#374151', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ─── ADD / EDIT MODAL ─────────────────────────────────────────────
function VendorModal({ vendor, onSave, onClose }) {
  const [form, setForm] = useState(vendor || {
    name: '', title: '', company: '', email: '', phone: '',
    website: '', emailSent: '', followUp: '', callDone: '', resumeRole: '', notes: ''
  });
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const fields = [
    { key: 'name', label: 'Full Name *', placeholder: 'John Smith' },
    { key: 'title', label: 'Job Title', placeholder: 'Senior Recruiter' },
    { key: 'company', label: 'Company *', placeholder: 'ABC Staffing' },
    { key: 'email', label: 'Email', placeholder: 'john@company.com' },
    { key: 'phone', label: 'Phone', placeholder: '+1 (555) 000-0000' },
    { key: 'website', label: 'Website', placeholder: 'www.company.com' },
    { key: 'resumeRole', label: 'Resume Sent For Role', placeholder: 'Java Developer, React Engineer...' },
    { key: 'notes', label: 'Notes', placeholder: 'Any notes...' },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000c', zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#0f172a', border: '1px solid #1b998b40', borderRadius: 20,
        padding: 32, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 24px 80px #000'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontFamily: 'Syne', color: '#e2e8f0', fontSize: 20 }}>
            {vendor ? '✏️ Edit Vendor' : '➕ Add New Vendor'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {fields.map(({ key, label, placeholder }) => (
            <div key={key} style={{ gridColumn: ['notes', 'resumeRole'].includes(key) ? '1/-1' : 'auto' }}>
              <label style={{ fontSize: 11, color: '#6b7280', fontFamily: 'DM Sans', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</label>
              <input
                value={form[key] || ''}
                onChange={e => f(key, e.target.value)}
                placeholder={placeholder}
                style={{
                  display: 'block', width: '100%', marginTop: 4, padding: '10px 14px',
                  background: '#1e293b', border: '1px solid #334155', borderRadius: 10,
                  color: '#e2e8f0', fontSize: 13, fontFamily: 'DM Sans', outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginTop: 14 }}>
          {['emailSent', 'followUp', 'callDone'].map(key => {
            const labels = { emailSent: 'Email Sent?', followUp: 'Follow-Up?', callDone: 'Call Done?' };
            return (
              <div key={key}>
                <label style={{ fontSize: 11, color: '#6b7280', fontFamily: 'DM Sans', textTransform: 'uppercase', letterSpacing: 1 }}>{labels[key]}</label>
                <select value={form[key]} onChange={e => f(key, e.target.value)} style={{
                  display: 'block', width: '100%', marginTop: 4, padding: '10px 14px',
                  background: '#1e293b', border: '1px solid #334155', borderRadius: 10,
                  color: '#e2e8f0', fontSize: 13, fontFamily: 'DM Sans', outline: 'none'
                }}>
                  {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o || '—'}</option>)}
                </select>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '10px 24px', borderRadius: 10, background: '#1e293b',
            border: '1px solid #334155', color: '#9ca3af', cursor: 'pointer', fontFamily: 'DM Sans'
          }}>Cancel</button>
          <button onClick={() => onSave(form)} style={{
            padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg, #1b998b, #0d6e65)',
            border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 600
          }}>
            {vendor ? 'Save Changes' : 'Add Vendor'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── EMAIL TEMPLATES PANEL ────────────────────────────────────────
function EmailTemplatesPanel({ onClose }) {
  const [templates, setTemplates] = useState(() => load('emailTemplates', [
    { id: 1, title: 'Initial Outreach', body: `Hi [Name],\n\nI hope you're doing well! I'm Alok, a GTM Automation Engineer specializing in outbound infrastructure and IT staffing. I came across your profile and wanted to reach out to explore potential collaboration opportunities.\n\nWould you be open to a quick 15-minute call this week?\n\nBest regards,\nAlok Kumar Singh` },
    { id: 2, title: 'Resume Follow-Up', body: `Hi [Name],\n\nFollowing up on the resume I shared for the [Role] position. I wanted to check if you had a chance to review the candidate's profile.\n\nPlease let me know if you need any additional information or would like to schedule a call.\n\nThanks,\nAlok` },
    { id: 3, title: 'Partnership Intro', body: `Hello [Name],\n\nI'm reaching out from ConsultAdd's IT Staffing division. We specialize in placing top IT talent and would love to explore a vendor partnership with [Company].\n\nWe have a strong bench of pre-vetted candidates across Java, .NET, React, Cloud, and more.\n\nLet's connect!\n\nBest,\nAlok Kumar Singh\nGTM Automation Engineer, ConsultAdd` },
  ]));
  const [editing, setEditing] = useState(null);
  const [copied, setCopied] = useState(null);

  const saveTemplates = (t) => { setTemplates(t); save('emailTemplates', t); };
  const copyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };
  const addNew = () => {
    const t = { id: Date.now(), title: 'New Template', body: '' };
    const updated = [...templates, t];
    saveTemplates(updated);
    setEditing(t.id);
  };
  const deleteT = (id) => saveTemplates(templates.filter(t => t.id !== id));
  const updateT = (id, field, val) => saveTemplates(templates.map(t => t.id === id ? { ...t, [field]: val } : t));

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000c', zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#0f172a', border: '1px solid #ff6b3540', borderRadius: 20,
        padding: 32, width: '100%', maxWidth: 640, maxHeight: '88vh', overflowY: 'auto',
        boxShadow: '0 24px 80px #000'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontFamily: 'Syne', color: '#e2e8f0', fontSize: 20 }}>
            📧 Email Templates
          </h2>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={addNew} style={{
              padding: '8px 16px', borderRadius: 10, background: '#ff6b35',
              border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13
            }}>+ Add Template</button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 20 }}>✕</button>
          </div>
        </div>

        {templates.map(t => (
          <div key={t.id} style={{
            background: '#1e293b', borderRadius: 14, padding: 20, marginBottom: 16,
            border: '1px solid #334155'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              {editing === t.id ? (
                <input value={t.title} onChange={e => updateT(t.id, 'title', e.target.value)}
                  style={{ background: '#0f172a', border: '1px solid #ff6b35', borderRadius: 8, color: '#e2e8f0', padding: '6px 10px', fontFamily: 'Syne', fontSize: 14, fontWeight: 700 }} />
              ) : (
                <h3 style={{ margin: 0, fontFamily: 'Syne', color: '#e2e8f0', fontSize: 15 }}>{t.title}</h3>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => copyText(t.body, t.id)} style={{
                  padding: '6px 14px', borderRadius: 8,
                  background: copied === t.id ? '#0d2e1a' : '#0f172a',
                  border: `1px solid ${copied === t.id ? '#4ade80' : '#334155'}`,
                  color: copied === t.id ? '#4ade80' : '#9ca3af', cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans'
                }}>
                  {copied === t.id ? '✅ Copied!' : '📋 Copy'}
                </button>
                <button onClick={() => setEditing(editing === t.id ? null : t.id)} style={{
                  background: 'none', border: '1px solid #334155', borderRadius: 8,
                  color: '#9ca3af', cursor: 'pointer', padding: '6px 10px', fontSize: 12
                }}>{editing === t.id ? '✓ Done' : '✏️'}</button>
                <button onClick={() => deleteT(t.id)} style={{
                  background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 16
                }}>🗑️</button>
              </div>
            </div>
            {editing === t.id ? (
              <textarea value={t.body} onChange={e => updateT(t.id, 'body', e.target.value)}
                rows={8} style={{
                  width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 10,
                  color: '#e2e8f0', padding: 12, fontFamily: 'DM Sans', fontSize: 13, resize: 'vertical',
                  boxSizing: 'border-box', outline: 'none', lineHeight: 1.6
                }} />
            ) : (
              <pre style={{
                margin: 0, fontFamily: 'DM Sans', fontSize: 12, color: '#94a3b8',
                whiteSpace: 'pre-wrap', lineHeight: 1.7, maxHeight: 120, overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>{t.body}</pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── THOUGHTS WIDGET ─────────────────────────────────────────────
function ThoughtsWidget() {
  const [text, setText] = useState(() => load('thoughts', ''));
  const [saved, setSaved] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const ta = useRef(null);

  const handleSave = () => {
    save('thoughts', text);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const quotes = [
    "मेहनत कभी बेकार नहीं जाती 💪",
    "Every lead is an opportunity 🎯",
    "Build the pipeline, trust the process 🔥",
    "कड़ी मेहनत का फल मीठा होता है 🌟",
  ];
  const [quoteIdx] = useState(() => Math.floor(Math.random() * quotes.length));

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1a1040 100%)',
      border: '1px solid #7c3aed40', borderRadius: 20, overflow: 'hidden',
      boxShadow: '0 4px 24px #7c3aed15',
      transition: 'all 0.3s'
    }}>
      <div style={{
        padding: '14px 20px', background: 'linear-gradient(90deg, #7c3aed20, #0f172a)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: minimized ? 'none' : '1px solid #7c3aed20'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>📝</span>
          <span style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 700, color: '#c4b5fd' }}>
            Thoughts & Notes
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!minimized && (
            <button onClick={handleSave} style={{
              padding: '5px 14px', borderRadius: 8,
              background: saved ? '#4ade8020' : '#7c3aed30',
              border: `1px solid ${saved ? '#4ade80' : '#7c3aed'}`,
              color: saved ? '#4ade80' : '#c4b5fd',
              cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans'
            }}>
              {saved ? '✅ Saved' : '💾 Save'}
            </button>
          )}
          <button onClick={() => setMinimized(!minimized)} style={{
            background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', fontSize: 16
          }}>{minimized ? '⬆' : '⬇'}</button>
        </div>
      </div>

      {!minimized && (
        <div style={{ padding: '14px 20px 20px' }}>
          <div style={{
            fontSize: 12, color: '#8b5cf6', fontFamily: 'DM Sans', fontStyle: 'italic',
            marginBottom: 10, padding: '8px 12px', background: '#7c3aed15',
            borderRadius: 8, borderLeft: '3px solid #7c3aed'
          }}>
            💭 {quotes[quoteIdx]}
          </div>
          <textarea
            ref={ta}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={"Write your thoughts here... Hindi mein bhi likh sakte ho! 🙏\n\nE.g.:\n- Aaj ke targets\n- Follow-up reminders\n- कोई idea..."}
            style={{
              width: '100%', minHeight: 140, background: '#1e1040',
              border: '1px solid #4c1d95', borderRadius: 12, color: '#e2e8f0',
              padding: '12px 14px', fontFamily: 'DM Sans', fontSize: 13,
              resize: 'vertical', outline: 'none', lineHeight: 1.7,
              boxSizing: 'border-box'
            }}
          />
          <div style={{ fontSize: 11, color: '#4c1d95', marginTop: 6, textAlign: 'right', fontFamily: 'DM Sans' }}>
            {text.length} chars • Auto-saves on Save button
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────
export default function App() {
  const [vendors, setVendors] = useState(() => load('vendors', ALL_VENDORS));
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState(null); // null | 'add' | {vendor}
  const [showEmail, setShowEmail] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [editingCell, setEditingCell] = useState(null); // {id, field}
  const [sortCol, setSortCol] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => { save('vendors', vendors); }, [vendors]);

  const updateVendor = (id, field, value) => {
    setVendors(v => v.map(x => x.id === id ? { ...x, [field]: value } : x));
  };

  const saveVendor = (form) => {
    if (modal === 'add') {
      const newId = Math.max(...vendors.map(v => v.id), 0) + 1;
      setVendors(v => [...v, { ...form, id: newId }]);
    } else {
      setVendors(v => v.map(x => x.id === modal.id ? { ...form, id: modal.id } : x));
    }
    setModal(null);
  };

  const deleteVendor = (id) => {
    setVendors(v => v.filter(x => x.id !== id));
    setDeleteConfirm(null);
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(vendors, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'vendors_backup.json'; a.click();
  };

  // Stats
  const total = vendors.length;
  const emailsSent = vendors.filter(v => v.emailSent === 'Yes').length;
  const callsDone = vendors.filter(v => v.callDone === 'Yes').length;
  const resumesSent = vendors.filter(v => v.resumeRole).length;
  const pending = vendors.filter(v => v.emailSent === 'Pending' || v.followUp === 'Pending').length;

  // Filter + Search + Sort
  const filtered = vendors
    .filter(v => {
      const q = search.toLowerCase();
      if (q && !`${v.name} ${v.company} ${v.email} ${v.title}`.toLowerCase().includes(q)) return false;
      if (filter === 'emailed') return v.emailSent === 'Yes';
      if (filter === 'not_emailed') return v.emailSent === 'No' || v.emailSent === '';
      if (filter === 'pending') return v.emailSent === 'Pending' || v.followUp === 'Pending';
      if (filter === 'called') return v.callDone === 'Yes';
      return true;
    })
    .sort((a, b) => {
      const av = (a[sortCol] || '').toLowerCase();
      const bv = (b[sortCol] || '').toLowerCase();
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const SortIcon = ({ col }) => sortCol === col
    ? <span style={{ color: '#1b998b', fontSize: 10 }}>{sortDir === 'asc' ? ' ▲' : ' ▼'}</span>
    : <span style={{ color: '#374151', fontSize: 10 }}> ⇅</span>;

  const colStyle = (clickable) => ({
    padding: '10px 14px', textAlign: 'left', fontFamily: 'Syne', fontSize: 11,
    fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1,
    cursor: clickable ? 'pointer' : 'default', background: '#060d1a', whiteSpace: 'nowrap',
    userSelect: 'none',
    borderBottom: '1px solid #1f2937',
  });

  return (
    <div style={{
      minHeight: '100vh', background: '#070d1c',
      fontFamily: 'DM Sans, sans-serif',
      backgroundImage: 'radial-gradient(ellipse at 20% 0%, #0d2d3a 0%, transparent 50%), radial-gradient(ellipse at 80% 0%, #1a0d2e 0%, transparent 50%)',
    }}>

      {/* ── HEADER ── */}
      <div style={{
        padding: '22px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid #0f2031',
        background: 'linear-gradient(180deg, #060d1a 0%, transparent 100%)',
        position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(12px)'
      }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: 'Syne', fontSize: 22, fontWeight: 800, color: '#e2e8f0' }}>
            <span style={{ color: '#1b998b', fontStyle: 'italic' }}>Vincit qui se vincit</span>
          </h1>
          <p style={{ margin: 0, fontSize: 12, color: '#4b5563', fontFamily: 'DM Sans', fontStyle: 'italic', letterSpacing: '0.5px' }}>
            He conquers who conquers himself &nbsp;·&nbsp; IT Staffing Division
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={() => setShowEmail(true)} style={{
            padding: '9px 18px', borderRadius: 12, background: '#2d1810',
            border: '1px solid #ff6b3550', color: '#ff6b35', cursor: 'pointer',
            fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6
          }}>
            📧 Email Templates
          </button>
          <button onClick={exportData} style={{
            padding: '9px 14px', borderRadius: 12, background: '#0f172a',
            border: '1px solid #1f2937', color: '#6b7280', cursor: 'pointer', fontSize: 13
          }} title="Export JSON">💾</button>
          <button onClick={() => setModal('add')} style={{
            padding: '9px 20px', borderRadius: 12,
            background: 'linear-gradient(135deg, #1b998b, #0d6e65)',
            border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'DM Sans',
            fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: '0 4px 20px #1b998b40'
          }}>
            + Add Vendor
          </button>
        </div>
      </div>

      <div style={{ padding: '24px 32px', maxWidth: 1600, margin: '0 auto' }}>

        {/* ── STATS ── */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
          <StatCard label="Total Vendors" value={total} icon="🏢" color="#1b998b" />
          <StatCard label="Emails Sent" value={emailsSent} icon="📨" color="#3b82f6" sub={`${Math.round(emailsSent/total*100)||0}% contacted`} />
          <StatCard label="Calls Done" value={callsDone} icon="📞" color="#8b5cf6" />
          <StatCard label="Resumes Sent" value={resumesSent} icon="📄" color="#ff6b35" />
          <StatCard label="Pending Action" value={pending} icon="⏳" color="#fbbf24" />
        </div>

        {/* ── TWO-COLUMN LAYOUT ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

          {/* ── LEFT: TABLE SECTION ── */}
          <div>
            {/* FILTERS */}
            <div style={{
              display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center'
            }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#4b5563' }} />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name, company, email..."
                  style={{
                    width: '100%', padding: '10px 14px 10px 36px', background: '#0f172a',
                    border: '1px solid #1f2937', borderRadius: 12, color: '#e2e8f0',
                    fontSize: 13, fontFamily: 'DM Sans', outline: 'none', boxSizing: 'border-box'
                  }}
                />
              </div>
              {[
                { key: 'all', label: 'All' },
                { key: 'emailed', label: '✅ Emailed' },
                { key: 'not_emailed', label: '❌ Not Emailed' },
                { key: 'pending', label: '⏳ Pending' },
                { key: 'called', label: '📞 Called' },
              ].map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)} style={{
                  padding: '8px 16px', borderRadius: 10, fontFamily: 'DM Sans', fontSize: 12,
                  cursor: 'pointer', transition: 'all 0.2s',
                  background: filter === f.key ? '#1b998b20' : '#0f172a',
                  border: `1px solid ${filter === f.key ? '#1b998b' : '#1f2937'}`,
                  color: filter === f.key ? '#1b998b' : '#6b7280',
                  fontWeight: filter === f.key ? 700 : 400,
                }}>{f.label}</button>
              ))}
              <span style={{ fontSize: 12, color: '#374151', fontFamily: 'DM Sans', marginLeft: 'auto' }}>
                {filtered.length} of {total} vendors
              </span>
            </div>

            {/* TABLE */}
            <div style={{
              background: '#0a1120', borderRadius: 18, overflow: 'hidden',
              border: '1px solid #0f2031', boxShadow: '0 4px 40px #00000080'
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                  <thead>
                    <tr>
                      <th style={colStyle(false)}>#</th>
                      <th style={colStyle(true)} onClick={() => toggleSort('name')}>Name <SortIcon col="name" /></th>
                      <th style={colStyle(true)} onClick={() => toggleSort('company')}>Company <SortIcon col="company" /></th>
                      <th style={colStyle(false)}>Contact</th>
                      <th style={colStyle(false)} title="Email Sent">📨</th>
                      <th style={colStyle(false)} title="Follow-Up">🔔</th>
                      <th style={colStyle(false)} title="Call Done">📞</th>
                      <th style={colStyle(false)}>Role</th>
                      <th style={colStyle(false)}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((v, i) => {
                      const isExpanded = expandedRow === v.id;
                      const rowBg = i % 2 === 0 ? '#0a1120' : '#080e1c';
                      return (
                        <React.Fragment key={v.id}>
                          <tr style={{
                            background: rowBg, transition: 'background 0.15s',
                            borderBottom: isExpanded ? 'none' : '1px solid #0f2031',
                          }}
                            onMouseEnter={e => e.currentTarget.style.background = '#111827'}
                            onMouseLeave={e => e.currentTarget.style.background = rowBg}
                          >
                            <td style={{ padding: '10px 14px', color: '#374151', fontSize: 11, fontFamily: 'DM Sans' }}>{i + 1}</td>
                            <td style={{ padding: '10px 14px' }}>
                              <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 13, fontFamily: 'DM Sans' }}>{v.name}</div>
                              {v.title && <div style={{ fontSize: 11, color: '#4b5563', marginTop: 2, fontStyle: 'italic' }}>{v.title}</div>}
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{
                                color: '#1b998b', fontWeight: 700, fontSize: 13, fontFamily: 'DM Sans'
                              }}>{v.company}</span>
                              {v.website && (
                                <div style={{ fontSize: 11, color: '#374151', marginTop: 2 }}>
                                  <a href={v.website.startsWith('http') ? v.website : `https://${v.website}`}
                                    target="_blank" rel="noreferrer" style={{ color: '#1e40af', textDecoration: 'none' }}>
                                    🔗 {v.website}
                                  </a>
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              {v.email && <div style={{ fontSize: 12, color: '#60a5fa', fontFamily: 'DM Sans' }}>✉ {v.email}</div>}
                              {v.phone && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>📞 {v.phone}</div>}
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <StatusPill value={v.emailSent} onChange={val => updateVendor(v.id, 'emailSent', val)} />
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <StatusPill value={v.followUp} onChange={val => updateVendor(v.id, 'followUp', val)} />
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <StatusPill value={v.callDone} onChange={val => updateVendor(v.id, 'callDone', val)} />
                            </td>
                            <td style={{ padding: '10px 14px', maxWidth: 140 }}>
                              {editingCell?.id === v.id && editingCell?.field === 'resumeRole' ? (
                                <input
                                  autoFocus defaultValue={v.resumeRole}
                                  onBlur={e => { updateVendor(v.id, 'resumeRole', e.target.value); setEditingCell(null); }}
                                  onKeyDown={e => e.key === 'Enter' && e.target.blur()}
                                  style={{
                                    width: '100%', background: '#1e293b', border: '1px solid #1b998b',
                                    borderRadius: 6, color: '#e2e8f0', padding: '4px 8px', fontSize: 12, fontFamily: 'DM Sans', outline: 'none'
                                  }}
                                />
                              ) : (
                                <div onClick={() => setEditingCell({ id: v.id, field: 'resumeRole' })}
                                  style={{
                                    fontSize: 12, color: v.resumeRole ? '#c4b5fd' : '#374151',
                                    cursor: 'pointer', padding: '3px 6px', borderRadius: 6,
                                    background: v.resumeRole ? '#4c1d9520' : 'transparent',
                                    border: '1px dashed transparent',
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130,
                                  }}
                                  onMouseEnter={e => e.target.style.borderColor = '#334155'}
                                  onMouseLeave={e => e.target.style.borderColor = 'transparent'}
                                  title={v.resumeRole || 'Click to add role'}
                                >
                                  {v.resumeRole || <span style={{ color: '#1f2937' }}>+ Role</span>}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <button onClick={() => setExpandedRow(isExpanded ? null : v.id)} style={{
                                  background: 'none', border: '1px solid #1f2937', borderRadius: 7,
                                  color: '#6b7280', cursor: 'pointer', padding: '4px 8px', fontSize: 11
                                }} title="Notes">{isExpanded ? '▲' : '▼'}</button>
                                <button onClick={() => setModal(v)} style={{
                                  background: 'none', border: '1px solid #1f2937', borderRadius: 7,
                                  color: '#6b7280', cursor: 'pointer', padding: '4px 8px', fontSize: 11
                                }} title="Edit">✏️</button>
                                <button onClick={() => setDeleteConfirm(v.id)} style={{
                                  background: 'none', border: 'none',
                                  color: '#374151', cursor: 'pointer', padding: '4px 6px', fontSize: 14
                                }} title="Delete">🗑️</button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr style={{ background: '#0d1a2e', borderBottom: '1px solid #0f2031' }}>
                              <td colSpan={9} style={{ padding: '12px 20px 16px 60px' }}>
                                <div style={{ fontSize: 11, color: '#4b5563', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Notes</div>
                                <textarea
                                  value={v.notes || ''}
                                  onChange={e => updateVendor(v.id, 'notes', e.target.value)}
                                  placeholder="Add notes about this vendor..."
                                  rows={3}
                                  style={{
                                    width: '100%', maxWidth: 600, background: '#0f172a',
                                    border: '1px solid #1f2937', borderRadius: 10,
                                    color: '#94a3b8', padding: '10px 14px',
                                    fontFamily: 'DM Sans', fontSize: 13, resize: 'vertical',
                                    outline: 'none', boxSizing: 'border-box', lineHeight: 1.6
                                  }}
                                />
                              </td>
                            </tr>
                          )}
                          {deleteConfirm === v.id && (
                            <tr style={{ background: '#1a0000' }}>
                              <td colSpan={9} style={{ padding: '10px 20px' }}>
                                <span style={{ color: '#f87171', fontFamily: 'DM Sans', fontSize: 13 }}>
                                  Delete <b>{v.name}</b>? &nbsp;
                                </span>
                                <button onClick={() => deleteVendor(v.id)} style={{
                                  background: '#991b1b', border: 'none', color: '#fff', borderRadius: 8,
                                  padding: '5px 14px', cursor: 'pointer', fontSize: 12, marginRight: 8
                                }}>Yes, Delete</button>
                                <button onClick={() => setDeleteConfirm(null)} style={{
                                  background: '#1f2937', border: 'none', color: '#9ca3af', borderRadius: 8,
                                  padding: '5px 14px', cursor: 'pointer', fontSize: 12
                                }}>Cancel</button>
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
                <div style={{ padding: 48, textAlign: 'center', color: '#374151', fontFamily: 'DM Sans' }}>
                  No vendors found. Try clearing your search.
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT SIDEBAR ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* THOUGHTS */}
            <ThoughtsWidget />

            {/* QUICK STATS */}
            <div style={{
              background: 'linear-gradient(135deg, #0f172a, #1e293b)',
              border: '1px solid #1b998b30', borderRadius: 20, padding: 20,
            }}>
              <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 700, color: '#94a3b8', marginBottom: 14 }}>
                📊 Progress Tracker
              </div>
              {[
                { label: 'Email Coverage', val: emailsSent, total, color: '#3b82f6' },
                { label: 'Call Coverage', val: callsDone, total, color: '#8b5cf6' },
                { label: 'Resume Sent', val: resumesSent, total, color: '#ff6b35' },
              ].map(({ label, val, total, color }) => {
                const pct = Math.round(val / total * 100) || 0;
                return (
                  <div key={label} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, color: '#6b7280', fontFamily: 'DM Sans' }}>{label}</span>
                      <span style={{ fontSize: 12, color, fontFamily: 'DM Sans', fontWeight: 700 }}>{val}/{total}</span>
                    </div>
                    <div style={{ background: '#1f2937', borderRadius: 20, height: 6, overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`, height: '100%', borderRadius: 20,
                        background: `linear-gradient(90deg, ${color}, ${color}aa)`,
                        transition: 'width 0.8s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* QUICK ACTIONS */}
            <div style={{
              background: '#0f172a', border: '1px solid #1f2937', borderRadius: 20, padding: 20
            }}>
              <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 700, color: '#94a3b8', marginBottom: 14 }}>
                ⚡ Quick Actions
              </div>
              <button onClick={() => setModal('add')} style={{
                display: 'block', width: '100%', marginBottom: 10, padding: '10px 16px', borderRadius: 12,
                background: 'linear-gradient(135deg, #1b998b20, #1b998b10)', border: '1px solid #1b998b50',
                color: '#1b998b', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13, textAlign: 'left'
              }}>+ Add New Vendor</button>
              <button onClick={() => setShowEmail(true)} style={{
                display: 'block', width: '100%', marginBottom: 10, padding: '10px 16px', borderRadius: 12,
                background: '#ff6b3510', border: '1px solid #ff6b3540',
                color: '#ff6b35', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13, textAlign: 'left'
              }}>📧 Manage Email Templates</button>
              <button onClick={exportData} style={{
                display: 'block', width: '100%', padding: '10px 16px', borderRadius: 12,
                background: '#1f293710', border: '1px solid #334155',
                color: '#6b7280', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13, textAlign: 'left'
              }}>💾 Export Vendor Data</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODALS ── */}
      {(modal === 'add' || (modal && modal.id)) && (
        <VendorModal vendor={modal === 'add' ? null : modal} onSave={saveVendor} onClose={() => setModal(null)} />
      )}
      {showEmail && <EmailTemplatesPanel onClose={() => setShowEmail(false)} />}
    </div>
  );
}
