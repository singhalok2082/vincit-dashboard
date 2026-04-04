import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabase';
import { ALL_VENDORS } from './data';
import { Search, Upload, X, Plus, ChevronDown } from 'lucide-react';

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
          {options.map(opt => {
            const st = styleMap[opt] || styleMap[''];
            return <button key={opt} onClick={() => { onChange(opt); setOpen(false); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', background: 'transparent', border: 'none', color: st.text || '#9ca3af', fontSize: 12, fontFamily: 'DM Sans', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#1f2937'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{st.icon} {opt || 'Untagged'}</button>;
          })}
        </div>
      )}
    </div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, sub }) {
  return (
    <div style={{ background: 'linear-gradient(135deg,#0f172a,#1a2744)', border: `1px solid ${color}30`, borderRadius: 18, padding: '16px 20px', position: 'relative', overflow: 'hidden', flex: 1, minWidth: 120, transition: 'transform 0.2s,box-shadow 0.2s', cursor: 'default' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 32px ${color}20`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
      <div style={{ position: 'absolute', top: -20, right: -20, width: 70, height: 70, borderRadius: '50%', background: `${color}15` }} />
      <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: 'Syne', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'DM Sans', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: '#374151', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ─── CSV UPLOAD MODAL ─────────────────────────────────────────────
function CSVModal({ onClose, onImport, wishlists }) {
  const [step, setStep] = useState(1); // 1=upload, 2=preview, 3=options
  const [parsed, setParsed] = useState([]);
  const [fileName, setFileName] = useState('');
  const [addToAll, setAddToAll] = useState(true);
  const [createWishlist, setCreateWishlist] = useState(false);
  const [wishlistName, setWishlistName] = useState('');
  const [existingWishlist, setExistingWishlist] = useState('');
  const [wishlistMode, setWishlistMode] = useState('new'); // 'new' | 'existing'
  const fileRef = useRef(null);

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const obj = {};
      headers.forEach((h, i) => obj[h] = vals[i] || '');
      // Map common CSV column names to our schema
      return {
        name: obj.name || obj['full name'] || obj['contact name'] || '',
        title: obj.title || obj['job title'] || obj.position || '',
        company: obj.company || obj['company name'] || obj.organization || '',
        email: obj.email || obj['email address'] || '',
        phone: obj.phone || obj['phone number'] || obj.mobile || '',
        website: obj.website || obj.url || obj.linkedin || '',
        notes: obj.notes || obj.note || '',
        vendor_type: '', email_sent: '', follow_up: '', call_done: '', resume_role: ''
      };
    }).filter(v => v.name || v.company);
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rows = parseCSV(ev.target.result);
      setParsed(rows);
      setStep(2);
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    const wlName = createWishlist ? (wishlistMode === 'new' ? wishlistName : existingWishlist) : '';
    onImport({ vendors: parsed, addToAll, createWishlist, wishlistName: wlName, existingWishlistId: wishlistMode === 'existing' ? existingWishlist : null });
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000d', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(135deg,#0f172a,#111827)', border: '1px solid #1b998b40', borderRadius: 24, padding: 32, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 32px 80px #000c' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontFamily: 'Syne', color: '#e2e8f0', fontSize: 20, fontWeight: 800 }}>📤 Import CSV</h2>
          <button onClick={onClose} style={{ background: '#1f2937', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 18, borderRadius: 8, width: 32, height: 32 }}>✕</button>
        </div>

        {/* STEP INDICATOR */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {['Upload', 'Preview', 'Options'].map((s, i) => (
            <div key={s} style={{ flex: 1, padding: '6px 0', textAlign: 'center', borderRadius: 8, fontSize: 12, fontFamily: 'DM Sans', fontWeight: 600, background: step === i+1 ? '#1b998b20' : '#0f172a', border: `1px solid ${step === i+1 ? '#1b998b' : '#1f2937'}`, color: step === i+1 ? '#1b998b' : step > i+1 ? '#4ade80' : '#4b5563' }}>
              {step > i+1 ? '✓ ' : ''}{s}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div>
            <div onClick={() => fileRef.current.click()} style={{ border: '2px dashed #1b998b40', borderRadius: 16, padding: 48, textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#1b998b'; e.currentTarget.style.background = '#1b998b08'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1b998b40'; e.currentTarget.style.background = 'transparent'; }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
              <div style={{ fontFamily: 'Syne', color: '#e2e8f0', fontSize: 16, marginBottom: 8 }}>Drop your CSV here or click to browse</div>
              <div style={{ fontFamily: 'DM Sans', color: '#4b5563', fontSize: 13 }}>Supported columns: name, title, company, email, phone, website, notes</div>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />
            </div>
            <div style={{ marginTop: 16, padding: 14, background: '#0f172a', borderRadius: 12, border: '1px solid #1f2937' }}>
              <div style={{ fontSize: 12, color: '#6b7280', fontFamily: 'DM Sans', marginBottom: 6 }}>📋 Expected CSV format:</div>
              <code style={{ fontSize: 11, color: '#94a3b8', display: 'block', lineHeight: 1.8 }}>name,title,company,email,phone,website<br/>John Smith,Recruiter,ABC Corp,john@abc.com,555-1234,abc.com</code>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontFamily: 'DM Sans', color: '#94a3b8', fontSize: 13 }}>Found <span style={{ color: '#1b998b', fontWeight: 700 }}>{parsed.length} vendors</span> in <b style={{ color: '#e2e8f0' }}>{fileName}</b></div>
              <button onClick={() => setStep(3)} style={{ padding: '8px 20px', borderRadius: 10, background: 'linear-gradient(135deg,#1b998b,#0d6e65)', border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700 }}>Continue →</button>
            </div>
            <div style={{ background: '#080e1c', borderRadius: 12, overflow: 'hidden', border: '1px solid #0f2031', maxHeight: 320, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>{['Name', 'Title', 'Company', 'Email', 'Phone'].map(h => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontFamily: 'Syne', color: '#475569', textTransform: 'uppercase', letterSpacing: 1, background: '#060d1a', borderBottom: '1px solid #0f2031' }}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {parsed.map((v, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #0d1829' }}>
                      <td style={{ padding: '8px 12px', fontSize: 12, color: '#e2e8f0', fontWeight: 600 }}>{v.name || '—'}</td>
                      <td style={{ padding: '8px 12px', fontSize: 11, color: '#6b7280', fontStyle: 'italic' }}>{v.title || '—'}</td>
                      <td style={{ padding: '8px 12px', fontSize: 12, color: '#1b998b', fontWeight: 600 }}>{v.company || '—'}</td>
                      <td style={{ padding: '8px 12px', fontSize: 11, color: '#60a5fa' }}>{v.email || '—'}</td>
                      <td style={{ padding: '8px 12px', fontSize: 11, color: '#6b7280' }}>{v.phone || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div style={{ fontSize: 14, color: '#94a3b8', fontFamily: 'DM Sans', marginBottom: 20 }}>
              Choose what to do with <span style={{ color: '#1b998b', fontWeight: 700 }}>{parsed.length} vendors</span>:
            </div>

            {/* OPTION 1: Add to All Vendors */}
            <div onClick={() => setAddToAll(!addToAll)} style={{ padding: 16, background: addToAll ? '#1b998b15' : '#0f172a', border: `2px solid ${addToAll ? '#1b998b' : '#1f2937'}`, borderRadius: 14, marginBottom: 12, cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: addToAll ? '#1b998b' : '#1f2937', border: `2px solid ${addToAll ? '#1b998b' : '#374151'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{addToAll ? '✓' : ''}</div>
              <div>
                <div style={{ fontFamily: 'Syne', color: '#e2e8f0', fontSize: 14, fontWeight: 700 }}>🌐 Add to All Vendors</div>
                <div style={{ fontFamily: 'DM Sans', color: '#6b7280', fontSize: 12, marginTop: 2 }}>These vendors will appear in the main All Vendors view and be visible to everyone</div>
              </div>
            </div>

            {/* OPTION 2: Create Wishlist */}
            <div onClick={() => setCreateWishlist(!createWishlist)} style={{ padding: 16, background: createWishlist ? '#7c3aed15' : '#0f172a', border: `2px solid ${createWishlist ? '#7c3aed' : '#1f2937'}`, borderRadius: 14, marginBottom: createWishlist ? 0 : 0, cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: createWishlist ? '#7c3aed' : '#1f2937', border: `2px solid ${createWishlist ? '#7c3aed' : '#374151'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{createWishlist ? '✓' : ''}</div>
              <div>
                <div style={{ fontFamily: 'Syne', color: '#e2e8f0', fontSize: 14, fontWeight: 700 }}>📋 Save as a Wishlist Sheet</div>
                <div style={{ fontFamily: 'DM Sans', color: '#6b7280', fontSize: 12, marginTop: 2 }}>Create a named sheet for this batch — like "April Outreach" or "Tech Recruiters"</div>
              </div>
            </div>

            {createWishlist && (
              <div style={{ background: '#0f0d1f', border: '1px solid #7c3aed40', borderRadius: '0 0 14px 14px', padding: 16, marginBottom: 0 }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                  {['new', 'existing'].map(m => (
                    <button key={m} onClick={() => setWishlistMode(m)} style={{ padding: '6px 16px', borderRadius: 8, fontFamily: 'DM Sans', fontSize: 12, cursor: 'pointer', background: wishlistMode === m ? '#7c3aed20' : '#0f172a', border: `1px solid ${wishlistMode === m ? '#7c3aed' : '#1f2937'}`, color: wishlistMode === m ? '#c4b5fd' : '#6b7280', fontWeight: wishlistMode === m ? 700 : 400 }}>
                      {m === 'new' ? '+ New Sheet' : 'Add to Existing'}
                    </button>
                  ))}
                </div>
                {wishlistMode === 'new' ? (
                  <input value={wishlistName} onChange={e => setWishlistName(e.target.value)} placeholder="Sheet name (e.g. April Outreach, Tech Batch...)" style={{ width: '100%', padding: '10px 14px', background: '#1e1040', border: '1px solid #4c1d95', borderRadius: 10, color: '#e2e8f0', fontSize: 13, fontFamily: 'DM Sans', outline: 'none', boxSizing: 'border-box' }} />
                ) : (
                  <select value={existingWishlist} onChange={e => setExistingWishlist(e.target.value)} style={{ width: '100%', padding: '10px 14px', background: '#1e1040', border: '1px solid #4c1d95', borderRadius: 10, color: '#e2e8f0', fontSize: 13, fontFamily: 'DM Sans', outline: 'none' }}>
                    <option value="">Select a sheet...</option>
                    {wishlists.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                )}
              </div>
            )}

            <div style={{ marginTop: 20, padding: '12px 16px', background: '#0f172a', borderRadius: 12, border: '1px solid #1f2937', fontSize: 12, color: '#6b7280', fontFamily: 'DM Sans' }}>
              {!addToAll && !createWishlist && <span style={{ color: '#f87171' }}>⚠ Please select at least one option above</span>}
              {addToAll && createWishlist && <span style={{ color: '#4ade80' }}>✓ Vendors will be added to All Vendors AND saved in a named sheet</span>}
              {addToAll && !createWishlist && <span style={{ color: '#4ade80' }}>✓ Vendors will be added to All Vendors only</span>}
              {!addToAll && createWishlist && <span style={{ color: '#c4b5fd' }}>✓ Vendors will be saved in a named sheet only (not in All Vendors)</span>}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'space-between' }}>
              <button onClick={() => setStep(2)} style={{ padding: '10px 20px', borderRadius: 12, background: '#1e293b', border: '1px solid #334155', color: '#9ca3af', cursor: 'pointer', fontFamily: 'DM Sans' }}>← Back</button>
              <button onClick={handleImport} disabled={!addToAll && !createWishlist} style={{ padding: '10px 28px', borderRadius: 12, background: (!addToAll && !createWishlist) ? '#1f2937' : 'linear-gradient(135deg,#1b998b,#0d6e65)', border: 'none', color: (!addToAll && !createWishlist) ? '#4b5563' : '#fff', cursor: (!addToAll && !createWishlist) ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans', fontWeight: 700 }}>
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
      <div onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(135deg,#0f172a,#111827)', border: '1px solid #1b998b40', borderRadius: 24, padding: 32, width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 32px 80px #000c' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontFamily: 'Syne', color: '#e2e8f0', fontSize: 20, fontWeight: 800 }}>{vendor ? '✏️ Edit Vendor' : '➕ Add New Vendor'}</h2>
          <button onClick={onClose} style={{ background: '#1f2937', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 18, borderRadius: 8, width: 32, height: 32 }}>✕</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {fields.map(({ key, label, placeholder }) => (
            <div key={key} style={{ gridColumn: ['notes', 'resumeRole'].includes(key) ? '1/-1' : 'auto' }}>
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
          <button onClick={() => { if (!form.name || !form.company) { alert('Name and Company are required'); return; } onSave(form); }} style={{ padding: '10px 28px', borderRadius: 12, background: 'linear-gradient(135deg,#1b998b,#0d6e65)', border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700, boxShadow: '0 4px 20px #1b998b40' }}>
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
    { id: 2, title: 'Resume Follow-Up', body: `Hi [Name],\n\nFollowing up on the resume I shared for the [Role] position. I wanted to check if you had a chance to review the candidate's profile.\n\nThanks,\nAlok` },
    { id: 3, title: 'Partnership Intro', body: `Hello [Name],\n\nI'm reaching out from ConsultAdd's IT Staffing division. We specialize in placing top IT talent and would love to explore a vendor partnership with [Company].\n\nLet's connect!\n\nBest,\nAlok Kumar Singh\nGTM Automation Engineer, ConsultAdd` },
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
            {editing === t.id ? <textarea value={t.body} onChange={e => sv(templates.map(x => x.id === t.id ? { ...x, body: e.target.value } : x))} rows={7} style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, color: '#e2e8f0', padding: 12, fontFamily: 'DM Sans', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', outline: 'none', lineHeight: 1.6 }} />
              : <pre style={{ margin: 0, fontFamily: 'DM Sans', fontSize: 12, color: '#94a3b8', whiteSpace: 'pre-wrap', lineHeight: 1.7, maxHeight: 100, overflow: 'hidden' }}>{t.body}</pre>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── THOUGHTS ─────────────────────────────────────────────────────
function ThoughtsWidget() {
  const [text, setText] = useState(() => lload('thoughts', ''));
  const [saved, setSaved] = useState(false);
  const [min, setMin] = useState(false);
  const quotes = ["मेहनत कभी बेकार नहीं जाती 💪", "Every lead is an opportunity 🎯", "Build the pipeline, trust the process 🔥", "कड़ी मेहनत का फल मीठा होता है 🌟"];
  const [qi] = useState(() => Math.floor(Math.random() * quotes.length));
  return (
    <div style={{ background: 'linear-gradient(135deg,#0f0d1f,#1a1040)', border: '1px solid #7c3aed40', borderRadius: 20, overflow: 'hidden' }}>
      <div style={{ padding: '12px 18px', background: 'linear-gradient(90deg,#7c3aed20,transparent)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: min ? 'none' : '1px solid #7c3aed20' }}>
        <span style={{ fontFamily: 'Syne', fontSize: 13, fontWeight: 700, color: '#c4b5fd' }}>📝 Thoughts</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {!min && <button onClick={() => { lsave('thoughts', text); setSaved(true); setTimeout(() => setSaved(false), 2000); }} style={{ padding: '4px 12px', borderRadius: 8, background: saved ? '#4ade8020' : '#7c3aed30', border: `1px solid ${saved ? '#4ade80' : '#7c3aed'}`, color: saved ? '#4ade80' : '#c4b5fd', cursor: 'pointer', fontSize: 11, fontFamily: 'DM Sans' }}>{saved ? '✅' : '💾'}</button>}
          <button onClick={() => setMin(!min)} style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', fontSize: 14 }}>{min ? '⬆' : '⬇'}</button>
        </div>
      </div>
      {!min && (
        <div style={{ padding: '12px 18px 18px' }}>
          <div style={{ fontSize: 11, color: '#8b5cf6', fontFamily: 'DM Sans', fontStyle: 'italic', marginBottom: 8, padding: '6px 10px', background: '#7c3aed15', borderRadius: 8, borderLeft: '3px solid #7c3aed' }}>💭 {quotes[qi]}</div>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder={"Thoughts... Hindi mein bhi! 🙏"} style={{ width: '100%', minHeight: 90, background: '#1e1040', border: '1px solid #4c1d95', borderRadius: 10, color: '#e2e8f0', padding: '10px 12px', fontFamily: 'DM Sans', fontSize: 13, resize: 'vertical', outline: 'none', lineHeight: 1.7, boxSizing: 'border-box' }} />
        </div>
      )}
    </div>
  );
}

// ─── VENDOR TABLE ─────────────────────────────────────────────────
function VendorTable({ vendors, onUpdate, onEdit, onDelete, wishlistId }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedRow, setExpandedRow] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [sortCol, setSortCol] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [subView, setSubView] = useState('all');

  const norm = v => ({ ...v, emailSent: v.emailSent || v.email_sent || '', followUp: v.followUp || v.follow_up || '', callDone: v.callDone || v.call_done || '', resumeRole: v.resumeRole || v.resume_role || '', vendorType: v.vendorType || v.vendor_type || '' });

  const allNorm = vendors.map(norm);
  const primeCount = allNorm.filter(v => v.vendorType === 'Prime').length;
  const normalCount = allNorm.filter(v => v.vendorType === 'Normal').length;

  const filtered = allNorm.filter(v => {
    if (subView === 'prime' && v.vendorType !== 'Prime') return false;
    if (subView === 'normal' && v.vendorType !== 'Normal') return false;
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

  const toggleSort = col => { if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortCol(col); setSortDir('asc'); } };

  return (
    <div>
      {/* SUB-VIEW TABS (Normal/Prime) */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[{ key: 'all', label: '🌐 All', count: allNorm.length, color: '#1b998b' }, { key: 'prime', label: '⭐ Prime', count: primeCount, color: '#f59e0b' }, { key: 'normal', label: '🔵 Normal', count: normalCount, color: '#3b82f6' }].map(({ key, label, count, color }) => (
          <button key={key} onClick={() => setSubView(key)} style={{ padding: '7px 16px', borderRadius: 12, fontFamily: 'Syne', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', background: subView === key ? `${color}20` : '#0f172a', border: `2px solid ${subView === key ? color : '#1f2937'}`, color: subView === key ? color : '#6b7280', boxShadow: subView === key ? `0 0 16px ${color}20` : 'none' }}>
            {label} <span style={{ marginLeft: 4, background: subView === key ? `${color}30` : '#1f2937', color: subView === key ? color : '#4b5563', borderRadius: 20, padding: '1px 7px', fontSize: 10 }}>{count}</span>
          </button>
        ))}
      </div>

      {/* SEARCH + FILTERS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#4b5563' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ width: '100%', padding: '8px 12px 8px 32px', background: '#0f172a', border: '1px solid #1f2937', borderRadius: 10, color: '#e2e8f0', fontSize: 12, fontFamily: 'DM Sans', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        {[{ key: 'all', label: 'All' }, { key: 'emailed', label: '✅ Emailed' }, { key: 'not_emailed', label: '❌ Not Emailed' }, { key: 'pending', label: '⏳ Pending' }, { key: 'called', label: '📞 Called' }].map(fi => (
          <button key={fi.key} onClick={() => setStatusFilter(fi.key)} style={{ padding: '6px 12px', borderRadius: 8, fontFamily: 'DM Sans', fontSize: 11, cursor: 'pointer', background: statusFilter === fi.key ? '#1b998b20' : '#0f172a', border: `1px solid ${statusFilter === fi.key ? '#1b998b' : '#1f2937'}`, color: statusFilter === fi.key ? '#1b998b' : '#6b7280', fontWeight: statusFilter === fi.key ? 700 : 400 }}>{fi.label}</button>
        ))}
        <span style={{ fontSize: 11, color: '#374151', marginLeft: 'auto' }}>{filtered.length}/{allNorm.length}</span>
      </div>

      {/* TABLE */}
      <div style={{ background: '#080e1c', borderRadius: 18, overflow: 'hidden', border: '1px solid #0f2031', boxShadow: '0 4px 40px #00000060' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 920 }}>
            <thead>
              <tr>
                {[['#', null], ['Name', 'name'], ['Company', 'company'], ['Contact', null], ['Type', null], ['📨', null], ['🔔', null], ['📞', null], ['Role', null], ['', null]].map(([label, col]) => (
                  <th key={label} onClick={col ? () => toggleSort(col) : undefined} style={{ padding: '11px 12px', textAlign: 'left', fontFamily: 'Syne', fontSize: 9, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 1.2, cursor: col ? 'pointer' : 'default', background: '#060d1a', borderBottom: '1px solid #0f2031', whiteSpace: 'nowrap', userSelect: 'none' }}>
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
                      onMouseLeave={e => e.currentTarget.style.background = rowBg}>
                      <td style={{ padding: '9px 12px', color: '#1f2937', fontSize: 10, fontWeight: 700 }}>{i + 1}</td>
                      <td style={{ padding: '9px 12px' }}>
                        <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 12 }}>{v.name}</div>
                        {v.title && <div style={{ fontSize: 10, color: '#374151', marginTop: 1, fontStyle: 'italic' }}>{v.title}</div>}
                      </td>
                      <td style={{ padding: '9px 12px' }}>
                        <div style={{ fontWeight: 700, color: '#1b998b', fontSize: 12 }}>{v.company}</div>
                        {v.website && <a href={v.website.startsWith('http') ? v.website : `https://${v.website}`} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: '#1e40af', textDecoration: 'none' }}>🔗 {v.website}</a>}
                      </td>
                      <td style={{ padding: '9px 12px' }}>
                        {v.email && <div style={{ fontSize: 11, color: '#60a5fa' }}>✉ {v.email}</div>}
                        {v.phone && <div style={{ fontSize: 10, color: '#4b5563', marginTop: 1 }}>📞 {v.phone}</div>}
                      </td>
                      <td style={{ padding: '9px 12px' }}><Pill value={v.vendorType} onChange={val => onUpdate(v.id, 'vendorType', val)} options={['', 'Normal', 'Prime']} styleMap={VENDOR_TYPE_STYLE} /></td>
                      <td style={{ padding: '9px 12px' }}><Pill value={v.emailSent} onChange={val => onUpdate(v.id, 'emailSent', val)} options={STATUS_OPTIONS} styleMap={STATUS_STYLE} /></td>
                      <td style={{ padding: '9px 12px' }}><Pill value={v.followUp} onChange={val => onUpdate(v.id, 'followUp', val)} options={STATUS_OPTIONS} styleMap={STATUS_STYLE} /></td>
                      <td style={{ padding: '9px 12px' }}><Pill value={v.callDone} onChange={val => onUpdate(v.id, 'callDone', val)} options={STATUS_OPTIONS} styleMap={STATUS_STYLE} /></td>
                      <td style={{ padding: '9px 12px', maxWidth: 120 }}>
                        {editingCell?.id === v.id && editingCell?.field === 'resumeRole'
                          ? <input autoFocus defaultValue={v.resumeRole} onBlur={e => { onUpdate(v.id, 'resumeRole', e.target.value); setEditingCell(null); }} onKeyDown={e => e.key === 'Enter' && e.target.blur()} style={{ width: '100%', background: '#1e293b', border: '1px solid #1b998b', borderRadius: 6, color: '#e2e8f0', padding: '3px 7px', fontSize: 11, outline: 'none', boxSizing: 'border-box' }} />
                          : <div onClick={() => setEditingCell({ id: v.id, field: 'resumeRole' })} style={{ fontSize: 11, color: v.resumeRole ? '#c4b5fd' : '#1f2937', cursor: 'pointer', padding: '2px 5px', borderRadius: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 110 }} title={v.resumeRole || 'Click to add'}>{v.resumeRole || <span style={{ color: '#1f2937' }}>+ Role</span>}</div>
                        }
                      </td>
                      <td style={{ padding: '9px 12px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => setExpandedRow(isExp ? null : v.id)} style={{ background: 'none', border: '1px solid #1f2937', borderRadius: 6, color: '#6b7280', cursor: 'pointer', padding: '3px 6px', fontSize: 9 }}>{isExp ? '▲' : '▼'}</button>
                          <button onClick={() => onEdit(v)} style={{ background: 'none', border: '1px solid #1f2937', borderRadius: 6, color: '#6b7280', cursor: 'pointer', padding: '3px 6px', fontSize: 9 }}>✏️</button>
                          <button onClick={() => setDeleteConfirm(v.id)} style={{ background: 'none', border: 'none', color: '#2d1010', cursor: 'pointer', padding: '3px 4px', fontSize: 11 }} onMouseEnter={e => e.currentTarget.style.color = '#f87171'} onMouseLeave={e => e.currentTarget.style.color = '#2d1010'}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                    {isExp && (
                      <tr style={{ background: '#0a1628', borderBottom: '1px solid #0d1829' }}>
                        <td colSpan={10} style={{ padding: '8px 16px 12px 48px' }}>
                          <div style={{ fontSize: 10, color: '#374151', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Notes</div>
                          <textarea value={v.notes || ''} onChange={e => onUpdate(v.id, 'notes', e.target.value)} placeholder="Add notes..." rows={2} style={{ width: '100%', maxWidth: 500, background: '#0f172a', border: '1px solid #1f2937', borderRadius: 10, color: '#94a3b8', padding: '7px 11px', fontFamily: 'DM Sans', fontSize: 12, resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6 }} />
                        </td>
                      </tr>
                    )}
                    {deleteConfirm === v.id && (
                      <tr style={{ background: '#1a0000' }}>
                        <td colSpan={10} style={{ padding: '9px 16px' }}>
                          <span style={{ color: '#f87171', fontSize: 12 }}>Delete <b>{v.name}</b>? &nbsp;</span>
                          <button onClick={() => { onDelete(v.id); setDeleteConfirm(null); }} style={{ background: '#991b1b', border: 'none', color: '#fff', borderRadius: 7, padding: '4px 12px', cursor: 'pointer', fontSize: 11, marginRight: 7 }}>Yes</button>
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
            {subView === 'prime' ? '⭐ No Prime vendors yet — use the Type dropdown' : subView === 'normal' ? '🔵 No Normal vendors yet — use the Type dropdown' : 'No vendors found'}
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
  const [wishlistVendors, setWishlistVendors] = useState({}); // { wishlistId: [vendorIds] }
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeView, setActiveView] = useState('all'); // 'all' | wishlist id
  const [modal, setModal] = useState(null);
  const [showEmail, setShowEmail] = useState(false);
  const [showCSV, setShowCSV] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [renamingWishlist, setRenamingWishlist] = useState(null);
  const [deleteWishlistConfirm, setDeleteWishlistConfirm] = useState(null);

  const norm = v => ({ ...v, emailSent: v.emailSent || v.email_sent || '', followUp: v.followUp || v.follow_up || '', callDone: v.callDone || v.call_done || '', resumeRole: v.resumeRole || v.resume_role || '', vendorType: v.vendorType || v.vendor_type || '' });

  // ── LOAD DATA ──
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: vData }, { data: wData }, { data: wvData }] = await Promise.all([
        supabase.from('vendors').select('*').order('id'),
        supabase.from('wishlists').select('*').order('created_at'),
        supabase.from('wishlist_vendors').select('*'),
      ]);

      if (vData && vData.length === 0) {
        // Seed vendors
        const seeded = ALL_VENDORS.map(v => ({ name: v.name, title: v.title || '', company: v.company, email: v.email || '', phone: v.phone || '', website: v.website || '', notes: '', vendor_type: '', email_sent: '', follow_up: '', call_done: '', resume_role: '' }));
        const { data: inserted } = await supabase.from('vendors').insert(seeded).select();
        setVendors(inserted || []);
      } else {
        setVendors(vData || []);
      }

      setWishlists(wData || []);

      // Build wishlist → vendor mapping
      const map = {};
      (wvData || []).forEach(({ wishlist_id, vendor_id }) => {
        if (!map[wishlist_id]) map[wishlist_id] = [];
        map[wishlist_id].push(vendor_id);
      });
      setWishlistVendors(map);
    } catch (e) {
      console.error('Load error:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Realtime
  useEffect(() => {
    const ch = supabase.channel('all-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendors' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wishlists' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wishlist_vendors' }, loadAll)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [loadAll]);

  // ── UPDATE VENDOR ──
  const updateVendor = async (id, field, value) => {
    setVendors(v => v.map(x => x.id === id ? { ...x, [field]: value } : x));
    setSyncing(true);
    const dbField = { emailSent: 'email_sent', followUp: 'follow_up', callDone: 'call_done', resumeRole: 'resume_role', vendorType: 'vendor_type' }[field] || field;
    await supabase.from('vendors').update({ [dbField]: value }).eq('id', id);
    setSyncing(false);
  };

  // ── SAVE VENDOR ──
  const saveVendor = async (form) => {
    const dbForm = { name: form.name, title: form.title || '', company: form.company, email: form.email || '', phone: form.phone || '', website: form.website || '', notes: form.notes || '', vendor_type: form.vendorType || '', email_sent: form.emailSent || '', follow_up: form.followUp || '', call_done: form.callDone || '', resume_role: form.resumeRole || '' };
    setSyncing(true);
    if (!editingVendor) {
      const { data } = await supabase.from('vendors').insert([dbForm]).select();
      if (data) {
        setVendors(v => [...v, data[0]]);
        // If in a wishlist view, add to that wishlist too
        if (activeView !== 'all' && data[0]) {
          await supabase.from('wishlist_vendors').insert([{ wishlist_id: parseInt(activeView), vendor_id: data[0].id }]);
        }
      }
    } else {
      await supabase.from('vendors').update(dbForm).eq('id', editingVendor.id);
      setVendors(v => v.map(x => x.id === editingVendor.id ? { ...x, ...dbForm } : x));
    }
    setSyncing(false);
    setEditingVendor(null);
    setModal(null);
  };

  // ── DELETE VENDOR ──
  const deleteVendor = async (id) => {
    await supabase.from('vendors').delete().eq('id', id);
    setVendors(v => v.filter(x => x.id !== id));
  };

  // ── CSV IMPORT ──
  const handleCSVImport = async ({ vendors: csvVendors, addToAll, createWishlist, wishlistName, existingWishlistId }) => {
    setSyncing(true);
    let insertedIds = [];

    if (addToAll) {
      const { data } = await supabase.from('vendors').insert(csvVendors).select();
      if (data) { setVendors(v => [...v, ...data]); insertedIds = data.map(d => d.id); }
    } else {
      // Insert vendors but track them only for wishlist
      const { data } = await supabase.from('vendors').insert(csvVendors).select();
      if (data) { setVendors(v => [...v, ...data]); insertedIds = data.map(d => d.id); }
    }

    if (createWishlist && insertedIds.length > 0) {
      let wlId = existingWishlistId ? parseInt(existingWishlistId) : null;

      if (!wlId && wishlistName) {
        const { data: wl } = await supabase.from('wishlists').insert([{ name: wishlistName }]).select();
        if (wl) { wlId = wl[0].id; setWishlists(w => [...w, wl[0]]); }
      }

      if (wlId) {
        const links = insertedIds.map(vid => ({ wishlist_id: wlId, vendor_id: vid }));
        await supabase.from('wishlist_vendors').insert(links);
        setWishlistVendors(prev => ({ ...prev, [wlId]: [...(prev[wlId] || []), ...insertedIds] }));
        setActiveView(wlId.toString());
      }
    }
    setSyncing(false);
  };

  // ── DELETE WISHLIST ──
  const deleteWishlist = async (id) => {
    await supabase.from('wishlists').delete().eq('id', id);
    setWishlists(w => w.filter(x => x.id !== id));
    if (activeView === id.toString()) setActiveView('all');
    setDeleteWishlistConfirm(null);
  };

  // ── RENAME WISHLIST ──
  const renameWishlist = async (id, name) => {
    await supabase.from('wishlists').update({ name }).eq('id', id);
    setWishlists(w => w.map(x => x.id === id ? { ...x, name } : x));
    setRenamingWishlist(null);
  };

  // Current vendors for active view
  const currentVendors = activeView === 'all'
    ? vendors
    : vendors.filter(v => (wishlistVendors[parseInt(activeView)] || []).includes(v.id));

  const total = vendors.length;
  const primeCount = vendors.filter(v => (v.vendor_type || '') === 'Prime').length;
  const emailsSent = vendors.filter(v => (v.email_sent || '') === 'Yes').length;
  const callsDone = vendors.filter(v => (v.call_done || '') === 'Yes').length;

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#070d1c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 48, height: 48, border: '3px solid #1b998b40', borderTop: '3px solid #1b998b', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <div style={{ fontFamily: 'Syne', color: '#1b998b', fontSize: 16, fontStyle: 'italic' }}>Vincit qui se vincit...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#070d1c', fontFamily: 'DM Sans, sans-serif', backgroundImage: 'radial-gradient(ellipse at 10% 0%,#0d2d3a 0%,transparent 45%),radial-gradient(ellipse at 90% 0%,#1a0d2e 0%,transparent 45%)' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}*{box-sizing:border-box}::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:#0a1120}::-webkit-scrollbar-thumb{background:#1b998b40;border-radius:3px}::-webkit-scrollbar-thumb:hover{background:#1b998b80}`}</style>

      {/* HEADER */}
      <div style={{ padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #0f2031', background: 'linear-gradient(180deg,#060d1a 0%,transparent 100%)', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(16px)' }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: 'Syne', fontSize: 20, fontWeight: 800, color: '#e2e8f0', fontStyle: 'italic' }}>
            <span style={{ color: '#1b998b' }}>Vincit</span> qui se vincit
          </h1>
          <p style={{ margin: 0, fontSize: 10, color: '#374151', letterSpacing: 1, fontFamily: 'DM Sans' }}>
            IT STAFFING · CONSULTADD
            {syncing && <span style={{ color: '#1b998b', marginLeft: 8 }}>● syncing</span>}
            {!syncing && <span style={{ color: '#1b998b', marginLeft: 8 }}>● live</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setShowCSV(true)} style={{ padding: '8px 16px', borderRadius: 12, background: '#0d2d1a', border: '1px solid #1b998b40', color: '#1b998b', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Upload size={13} /> Import CSV
          </button>
          <button onClick={() => setShowEmail(true)} style={{ padding: '8px 16px', borderRadius: 12, background: '#2d1810', border: '1px solid #ff6b3540', color: '#ff6b35', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600 }}>📧 Templates</button>
          <button onClick={() => { setEditingVendor(null); setModal('add'); }} style={{ padding: '8px 20px', borderRadius: 12, background: 'linear-gradient(135deg,#1b998b,#0d6e65)', border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13, fontWeight: 700, boxShadow: '0 4px 20px #1b998b40' }}>+ Add Vendor</button>
        </div>
      </div>

      <div style={{ padding: '18px 28px', maxWidth: 1700, margin: '0 auto' }}>
        {/* STATS */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
          <StatCard label="Total Vendors" value={total} icon="🏢" color="#1b998b" />
          <StatCard label="Prime Vendors" value={primeCount} icon="⭐" color="#f59e0b" sub={`${Math.round(primeCount/total*100)||0}% of total`} />
          <StatCard label="Wishlists" value={wishlists.length} icon="📋" color="#8b5cf6" />
          <StatCard label="Emails Sent" value={emailsSent} icon="📨" color="#3b82f6" sub={`${Math.round(emailsSent/total*100)||0}% contacted`} />
          <StatCard label="Calls Done" value={callsDone} icon="📞" color="#ff6b35" />
        </div>

        {/* MAIN LAYOUT */}
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 18, alignItems: 'start' }}>

          {/* ── LEFT SIDEBAR: NAVIGATION ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, position: 'sticky', top: 80 }}>

            {/* MAIN VIEWS */}
            <div style={{ background: '#0f172a', border: '1px solid #1f2937', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', fontSize: 10, color: '#475569', fontFamily: 'Syne', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid #0f2031' }}>Views</div>
              <button onClick={() => setActiveView('all')} style={{ display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left', background: activeView === 'all' ? '#1b998b15' : 'transparent', border: 'none', borderBottom: '1px solid #0f2031', color: activeView === 'all' ? '#1b998b' : '#94a3b8', fontFamily: 'DM Sans', fontSize: 13, fontWeight: activeView === 'all' ? 700 : 400, cursor: 'pointer' }}>
                🌐 All Vendors <span style={{ float: 'right', fontSize: 11, color: activeView === 'all' ? '#1b998b' : '#374151' }}>{total}</span>
              </button>
            </div>

            {/* WISHLISTS */}
            <div style={{ background: '#0f172a', border: '1px solid #1f2937', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', fontSize: 10, color: '#475569', fontFamily: 'Syne', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid #0f2031', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Wishlists
                <button onClick={() => setShowCSV(true)} style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', fontSize: 16, lineHeight: 1 }} title="Import CSV to create wishlist">+</button>
              </div>
              {wishlists.length === 0 && (
                <div style={{ padding: '12px 14px', fontSize: 12, color: '#374151', fontFamily: 'DM Sans' }}>No wishlists yet.<br />Import a CSV to create one.</div>
              )}
              {wishlists.map(w => {
                const isActive = activeView === w.id.toString();
                const count = (wishlistVendors[w.id] || []).length;
                return (
                  <div key={w.id} style={{ borderBottom: '1px solid #0f2031' }}>
                    {renamingWishlist === w.id ? (
                      <input autoFocus defaultValue={w.name}
                        onBlur={e => renameWishlist(w.id, e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && renameWishlist(w.id, e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', background: '#1e293b', border: 'none', color: '#e2e8f0', fontFamily: 'DM Sans', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button onClick={() => setActiveView(w.id.toString())} style={{ flex: 1, padding: '10px 14px', textAlign: 'left', background: isActive ? '#7c3aed15' : 'transparent', border: 'none', color: isActive ? '#c4b5fd' : '#94a3b8', fontFamily: 'DM Sans', fontSize: 12, fontWeight: isActive ? 700 : 400, cursor: 'pointer' }}>
                          📋 {w.name} <span style={{ float: 'right', fontSize: 10, color: isActive ? '#7c3aed' : '#374151' }}>{count}</span>
                        </button>
                        <div style={{ display: 'flex', gap: 0, paddingRight: 8 }}>
                          <button onClick={() => setRenamingWishlist(w.id)} style={{ background: 'none', border: 'none', color: '#374151', cursor: 'pointer', fontSize: 11, padding: '2px 4px' }} title="Rename">✏️</button>
                          <button onClick={() => setDeleteWishlistConfirm(w.id)} style={{ background: 'none', border: 'none', color: '#374151', cursor: 'pointer', fontSize: 11, padding: '2px 4px' }} title="Delete" onMouseEnter={e => e.currentTarget.style.color = '#f87171'} onMouseLeave={e => e.currentTarget.style.color = '#374151'}>🗑️</button>
                        </div>
                      </div>
                    )}
                    {deleteWishlistConfirm === w.id && (
                      <div style={{ padding: '8px 12px', background: '#1a0000', borderTop: '1px solid #2d0000' }}>
                        <div style={{ fontSize: 11, color: '#f87171', marginBottom: 6 }}>Delete "{w.name}"?</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => deleteWishlist(w.id)} style={{ padding: '4px 10px', background: '#991b1b', border: 'none', color: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}>Delete</button>
                          <button onClick={() => setDeleteWishlistConfirm(null)} style={{ padding: '4px 10px', background: '#1f2937', border: 'none', color: '#9ca3af', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <button onClick={() => setShowCSV(true)} style={{ display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left', background: 'transparent', border: 'none', color: '#7c3aed', fontFamily: 'DM Sans', fontSize: 12, cursor: 'pointer', borderTop: wishlists.length ? '1px solid #0f2031' : 'none' }}>
                + Import CSV →  New Wishlist
              </button>
            </div>

            {/* THOUGHTS */}
            <ThoughtsWidget />

            {/* PROGRESS */}
            <div style={{ background: 'linear-gradient(135deg,#0f172a,#1a2233)', border: '1px solid #1b998b20', borderRadius: 16, padding: 16 }}>
              <div style={{ fontFamily: 'Syne', fontSize: 10, fontWeight: 700, color: '#475569', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>📊 Pipeline</div>
              {[{ label: 'Prime', val: primeCount, color: '#f59e0b' }, { label: 'Emailed', val: emailsSent, color: '#8b5cf6' }, { label: 'Called', val: callsDone, color: '#ff6b35' }].map(({ label, val, color }) => {
                const pct = Math.round(val / total * 100) || 0;
                return (
                  <div key={label} style={{ marginBottom: 10 }}>
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

            {/* QUICK ACTIONS */}
            <div style={{ background: '#0f172a', border: '1px solid #1f2937', borderRadius: 16, padding: 14 }}>
              <div style={{ fontFamily: 'Syne', fontSize: 10, fontWeight: 700, color: '#475569', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>⚡ Actions</div>
              {[
                { label: '📤 Import CSV', color: '#1b998b', bg: '#1b998b10', border: '#1b998b30', action: () => setShowCSV(true) },
                { label: '📧 Email Templates', color: '#ff6b35', bg: '#ff6b3510', border: '#ff6b3530', action: () => setShowEmail(true) },
                { label: '💾 Export Backup', color: '#6b7280', bg: '#1f293710', border: '#334155', action: () => { const blob = new Blob([JSON.stringify(vendors, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'vendors_backup.json'; a.click(); } },
              ].map(({ label, color, bg, border, action }) => (
                <button key={label} onClick={action} style={{ display: 'block', width: '100%', marginBottom: 7, padding: '9px 12px', borderRadius: 10, background: bg, border: `1px solid ${border}`, color, cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 12, textAlign: 'left' }}>{label}</button>
              ))}
            </div>
          </div>

          {/* ── MAIN CONTENT ── */}
          <div>
            {/* VIEW HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h2 style={{ margin: 0, fontFamily: 'Syne', fontSize: 18, color: '#e2e8f0', fontWeight: 800 }}>
                  {activeView === 'all' ? '🌐 All Vendors' : `📋 ${wishlists.find(w => w.id.toString() === activeView)?.name || 'Wishlist'}`}
                </h2>
                <p style={{ margin: 0, fontSize: 12, color: '#4b5563', fontFamily: 'DM Sans' }}>
                  {currentVendors.length} vendors
                  {activeView !== 'all' && ' in this sheet'}
                  {' · '}Normal/Prime applies to all views
                </p>
              </div>
            </div>

            <VendorTable
              vendors={currentVendors}
              onUpdate={updateVendor}
              onEdit={v => { setEditingVendor(norm(v)); setModal('edit'); }}
              onDelete={deleteVendor}
              wishlistId={activeView !== 'all' ? parseInt(activeView) : null}
            />
          </div>
        </div>
      </div>

      {/* MODALS */}
      {(modal === 'add' || modal === 'edit') && (
        <VendorModal vendor={modal === 'edit' ? editingVendor : null} onSave={saveVendor} onClose={() => { setModal(null); setEditingVendor(null); }} />
      )}
      {showEmail && <EmailTemplatesPanel onClose={() => setShowEmail(false)} />}
      {showCSV && <CSVModal onClose={() => setShowCSV(false)} onImport={handleCSVImport} wishlists={wishlists} />}
    </div>
  );
}
