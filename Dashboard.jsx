import React, { useContext, useEffect, useState } from 'react';
import { ApiContext, ToastContext } from '../App';

const SKILLS = [
  { key: 'chef_equipe', label: 'Chef équipe (CM/CMA)' },
  { key: 'sous_chef', label: 'Sous-chef' },
  { key: 'chef_elec', label: 'Chef électrique (CE)' },
  { key: 'chef_quai', label: 'Chef de quai (R)' },
  { key: 'trafic', label: 'Trafic' },
  { key: 'cariste', label: 'Cariste (L)' },
  { key: 'skyjack', label: 'Skyjack' },
  { key: 'manut', label: 'Manutentionnaire (Ma/Mo)' },
  { key: 'rideaux', label: 'Rideaux' },
  { key: 'chargé_projet', label: 'Chargé de projet' },
];

const emptyForm = {
  prenom: '', nom: '', email: '', telephone: '', statut: 'actif', heures_garanties: 0,
  chef_equipe: 0, sous_chef: 0, chef_elec: 0, chef_quai: 0, trafic: 0,
  cariste: 0, skyjack: 0, manut: 0, rideaux: 0, chargé_projet: 0, notes: ''
};

const badge = (color, text) => (
  <span style={{
    fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500,
    background: color === 'green' ? '#dcfce7' : color === 'amber' ? '#fef3c7' : color === 'red' ? '#fee2e2' : '#e0e7ff',
    color: color === 'green' ? '#166534' : color === 'amber' ? '#92400e' : color === 'red' ? '#991b1b' : '#3730a3',
  }}>{text}</span>
);

export default function Employees() {
  const api = useContext(ApiContext);
  const toast = useContext(ToastContext);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('actif');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    api.get('/employees', { params: { statut: filterStatut || undefined } }).then(r => setEmployees(r.data));
  };

  useEffect(load, [filterStatut]);

  const filtered = employees.filter(e =>
    `${e.prenom} ${e.nom} ${e.email || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowModal(true); };
  const openEdit = (emp) => { setForm({ ...emp }); setEditId(emp.id); setShowModal(true); };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (editId) {
        await api.put(`/employees/${editId}`, form);
        toast('Employé mis à jour', 'success');
      } else {
        await api.post('/employees', form);
        toast('Employé créé', 'success');
      }
      setShowModal(false);
      load();
    } catch (e) {
      toast(e.response?.data?.error || 'Erreur', 'error');
    }
    setLoading(false);
  };

  const handleDeactivate = async (id) => {
    if (!confirm('Désactiver cet employé ?')) return;
    await api.delete(`/employees/${id}`);
    toast('Employé désactivé', 'info');
    load();
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData(); fd.append('file', file);
    try {
      const r = await api.post('/employees/import', fd);
      toast(`${r.data.imported} employés importés`, 'success');
      load();
    } catch (err) {
      toast('Erreur import', 'error');
    }
  };

  const skillsList = (emp) => SKILLS.filter(s => emp[s.key] === 1).map(s => s.label.split(' ')[0]).join(', ');

  const S = {
    page: { padding: 24 },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 20, fontWeight: 600, color: '#0f172a' },
    btn: (variant) => ({
      padding: '8px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
      background: variant === 'primary' ? '#3b82f6' : variant === 'danger' ? '#ef4444' : '#f1f5f9',
      color: variant === 'primary' ? '#fff' : variant === 'danger' ? '#fff' : '#374151',
    }),
    card: { background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' },
    input: { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, boxSizing: 'border-box' },
    label: { fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4, display: 'block' },
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    modal: { background: '#fff', borderRadius: 12, width: 540, maxHeight: '85vh', overflowY: 'auto', padding: 24 },
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <div style={S.title}>Employés</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>{filtered.length} employé{filtered.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <label style={{ ...S.btn('secondary'), display: 'inline-block', cursor: 'pointer' }}>
            Importer Excel
            <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImport} />
          </label>
          <button style={S.btn('primary')} onClick={openAdd}>+ Ajouter un employé</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom, email..."
          style={{ ...S.input, width: 280 }} />
        <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
          style={{ ...S.input, width: 160 }}>
          <option value="">Tous statuts</option>
          <option value="actif">Actifs</option>
          <option value="inactif">Inactifs</option>
          <option value="maternite">Maternité</option>
        </select>
      </div>

      <div style={S.card}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              {['Nom', 'Email', 'Téléphone', 'Qualifications', 'Garantie', 'Statut', ''].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 500, color: '#64748b', fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(emp => (
              <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 14px', fontWeight: 500 }}>{emp.prenom} {emp.nom}</td>
                <td style={{ padding: '10px 14px', color: '#64748b' }}>{emp.email || '—'}</td>
                <td style={{ padding: '10px 14px', color: '#64748b' }}>{emp.telephone || '—'}</td>
                <td style={{ padding: '10px 14px', color: '#64748b', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {skillsList(emp) || '—'}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  {emp.heures_garanties > 0 ? badge('amber', `${emp.heures_garanties}h`) : '—'}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  {badge(emp.statut === 'actif' ? 'green' : emp.statut === 'maternite' ? 'amber' : 'red', emp.statut)}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={S.btn('secondary')} onClick={() => openEdit(emp)}>Modifier</button>
                    {emp.statut === 'actif' && (
                      <button style={S.btn('danger')} onClick={() => handleDeactivate(emp.id)}>×</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
            Aucun employé trouvé. Importez votre fichier Excel ou ajoutez manuellement.
          </div>
        )}
      </div>

      {showModal && (
        <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={S.modal}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>
              {editId ? 'Modifier l\'employé' : 'Nouvel employé'}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              {[['prenom','Prénom *'], ['nom','Nom *'], ['email','Courriel'], ['telephone','Téléphone']].map(([k, lbl]) => (
                <div key={k}>
                  <label style={S.label}>{lbl}</label>
                  <input style={S.input} value={form[k]||''} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={S.label}>Statut</label>
                <select style={S.input} value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}>
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                  <option value="maternite">Congé maternité</option>
                </select>
              </div>
              <div>
                <label style={S.label}>Heures garanties</label>
                <select style={S.input} value={form.heures_garanties} onChange={e => setForm(f => ({ ...f, heures_garanties: parseInt(e.target.value) }))}>
                  <option value={0}>Aucune garantie</option>
                  <option value={35}>35h garanties</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Qualifications</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {SKILLS.map(s => (
                  <label key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form[s.key] === 1}
                      onChange={e => setForm(f => ({ ...f, [s.key]: e.target.checked ? 1 : 0 }))} />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={S.label}>Notes</label>
              <textarea style={{ ...S.input, height: 60, resize: 'vertical' }}
                value={form.notes||''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button style={S.btn('secondary')} onClick={() => setShowModal(false)}>Annuler</button>
              <button style={S.btn('primary')} onClick={handleSave} disabled={loading}>
                {loading ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
