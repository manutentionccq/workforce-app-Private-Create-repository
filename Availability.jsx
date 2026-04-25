import React, { useContext, useEffect, useState } from 'react';
import { ApiContext, ToastContext } from '../App';

export default function Settings() {
  const api = useContext(ApiContext);
  const toast = useContext(ToastContext);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => { api.get('/settings').then(r => setForm(r.data)); }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/settings', form);
      toast('Paramètres sauvegardés', 'success');
    } catch { toast('Erreur sauvegarde', 'error'); }
    setSaving(false);
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const S = {
    page: { padding: 24, maxWidth: 700 },
    title: { fontSize: 20, fontWeight: 600, color: '#0f172a', marginBottom: 24 },
    card: { background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: '18px 20px', marginBottom: 16 },
    cardTitle: { fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 16 },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
    label: { fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4, display: 'block' },
    input: { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, boxSizing: 'border-box' },
    btn: (v) => ({ padding: '9px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, background: v==='primary'?'#3b82f6':'#f1f5f9', color: v==='primary'?'#fff':'#374151' }),
    divider: { borderBottom: '1px solid #e2e8f0', marginBottom: 12, paddingBottom: 12 },
  };

  return (
    <div style={S.page}>
      <div style={S.title}>Paramètres</div>

      <div style={S.card}>
        <div style={S.cardTitle}>Entreprise</div>
        <div>
          <label style={S.label}>Nom de l'entreprise</label>
          <input style={S.input} value={form.company_name||''} onChange={e => set('company_name', e.target.value)} />
        </div>
      </div>

      <div style={S.card}>
        <div style={S.cardTitle}>Configuration SMTP (envoi d'emails)</div>
        <div style={S.grid}>
          <div>
            <label style={S.label}>Serveur SMTP</label>
            <input style={S.input} value={form.smtp_host||''} onChange={e => set('smtp_host', e.target.value)} placeholder="smtp.gmail.com" />
          </div>
          <div>
            <label style={S.label}>Port</label>
            <input style={S.input} value={form.smtp_port||'587'} onChange={e => set('smtp_port', e.target.value)} />
          </div>
          <div>
            <label style={S.label}>Utilisateur (votre email)</label>
            <input style={S.input} value={form.smtp_user||''} onChange={e => set('smtp_user', e.target.value)} placeholder="votre@email.com" />
          </div>
          <div>
            <label style={S.label}>Mot de passe</label>
            <input style={S.input} type="password" value={form.smtp_pass||''} onChange={e => set('smtp_pass', e.target.value)} placeholder="Mot de passe ou mot de passe d'app" />
          </div>
          <div>
            <label style={S.label}>Email d'expéditeur (affiché)</label>
            <input style={S.input} value={form.smtp_from||''} onChange={e => set('smtp_from', e.target.value)} placeholder="Nom Entreprise <no-reply@...>" />
          </div>
        </div>
        <div style={{ marginTop: 12, padding: '10px 14px', background: '#f8fafc', borderRadius: 8, fontSize: 12, color: '#64748b' }}>
          <strong>Gmail :</strong> Activez "Accès moins sécurisé" ou créez un "Mot de passe d'application" dans votre compte Google. Port 587 avec TLS.
        </div>
      </div>

      <div style={S.card}>
        <div style={S.cardTitle}>Google Forms / Sheets</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          <div>
            <label style={S.label}>URL du formulaire Google Forms</label>
            <input style={S.input} value={form.google_form_url||''} onChange={e => set('google_form_url', e.target.value)} placeholder="https://docs.google.com/forms/d/.../viewform" />
          </div>
          <div>
            <label style={S.label}>ID du Google Sheet (réponses)</label>
            <input style={S.input} value={form.google_sheet_id||''} onChange={e => set('google_sheet_id', e.target.value)} placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms" />
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              Trouvez l'ID dans l'URL du Google Sheet : docs.google.com/spreadsheets/d/<strong>[ID]</strong>/edit
            </div>
          </div>
        </div>
      </div>

      <div style={S.card}>
        <div style={S.cardTitle}>Règles de planification</div>
        <div style={S.grid}>
          <div>
            <label style={S.label}>Shift minimum idéal (heures)</label>
            <input type="number" style={S.input} value={form.min_shift_hours||6} onChange={e => set('min_shift_hours', e.target.value)} />
          </div>
          <div>
            <label style={S.label}>Maximum hebdomadaire (heures)</label>
            <input type="number" style={S.input} value={form.max_weekly_hours||40} onChange={e => set('max_weekly_hours', e.target.value)} />
          </div>
          <div>
            <label style={S.label}>Minimum légal par shift (heures)</label>
            <input type="number" style={S.input} value={form.min_legal_hours||3} onChange={e => set('min_legal_hours', e.target.value)} />
          </div>
        </div>
      </div>

      <button style={S.btn('primary')} onClick={save} disabled={saving}>
        {saving ? 'Sauvegarde...' : 'Sauvegarder tous les paramètres'}
      </button>
    </div>
  );
}
