import React, { useContext, useEffect, useState } from 'react';
import { ApiContext, ToastContext } from '../App';

const ROLE_COLORS = {
  CM: '#dbeafe', CMA: '#dbeafe', CE: '#ede9fe', R: '#fee2e2',
  MQ: '#fee2e2', L: '#dcfce7', Trafic: '#fce7f3', Ma: '#f0fdf4',
  'Ma-elec': '#ede9fe', 'Ma-rideaux': '#ecfdf5', Mo: '#f0fdf4',
};
const ROLE_TEXT = {
  CM: '#1d4ed8', CMA: '#1d4ed8', CE: '#6d28d9', R: '#991b1b',
  MQ: '#991b1b', L: '#166534', Trafic: '#9d174d', Ma: '#166534',
  'Ma-elec': '#6d28d9', 'Ma-rideaux': '#166534', Mo: '#166534',
};

const roleBadge = (role) => (
  <span style={{
    fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500,
    background: ROLE_COLORS[role] || '#f3f4f6', color: ROLE_TEXT[role] || '#374151',
  }}>{role}</span>
);

export default function Demands() {
  const api = useContext(ApiContext);
  const toast = useContext(ToastContext);
  const [demandes, setDemandes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [weekDebut, setWeekDebut] = useState('');
  const [weekFin, setWeekFin] = useState('');

  const load = () => api.get('/demandes').then(r => setDemandes(r.data));
  useEffect(load, []);

  const loadDetail = (id) => {
    setSelected(id);
    api.get(`/demandes/${id}`).then(r => setDetail(r.data));
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !weekDebut || !weekFin) {
      toast('Sélectionnez les dates de la semaine avant d\'importer', 'error');
      return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('semaine_debut', weekDebut);
    fd.append('semaine_fin', weekFin);
    try {
      const r = await api.post('/demandes/upload', fd);
      toast(`${r.data.lignes_count} lignes importées`, 'success');
      load();
      loadDetail(r.data.id);
    } catch (err) {
      toast(err.response?.data?.error || 'Erreur import', 'error');
    }
    setUploading(false);
  };

  const groupByDate = (lignes) => {
    const g = {};
    for (const l of lignes) {
      if (!g[l.date]) g[l.date] = {};
      if (!g[l.date][l.evenement]) g[l.date][l.evenement] = [];
      g[l.date][l.evenement].push(l);
    }
    return g;
  };

  const S = {
    page: { padding: 24 },
    title: { fontSize: 20, fontWeight: 600, color: '#0f172a', marginBottom: 4 },
    sub: { fontSize: 13, color: '#64748b', marginBottom: 24 },
    layout: { display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 },
    card: { background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0' },
    listItem: (active) => ({
      padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: 13,
      background: active ? '#eff6ff' : 'transparent',
      borderLeft: active ? '3px solid #3b82f6' : '3px solid transparent',
    }),
    btn: (v) => ({
      padding: '8px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
      background: v === 'primary' ? '#3b82f6' : v === 'success' ? '#16a34a' : '#f1f5f9',
      color: v === 'primary' || v === 'success' ? '#fff' : '#374151',
    }),
    input: { padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 },
  };

  return (
    <div style={S.page}>
      <div style={S.title}>Demandes de service</div>
      <div style={S.sub}>Importez le fichier Excel client pour créer une demande</div>

      <div style={{ marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Début de semaine</div>
          <input type="date" style={S.input} value={weekDebut} onChange={e => setWeekDebut(e.target.value)} />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Fin de semaine</div>
          <input type="date" style={S.input} value={weekFin} onChange={e => setWeekFin(e.target.value)} />
        </div>
        <label style={{ ...S.btn('primary'), display: 'inline-block', cursor: 'pointer', opacity: uploading ? 0.6 : 1 }}>
          {uploading ? 'Import en cours...' : '+ Importer Excel client'}
          <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      <div style={S.layout}>
        <div style={S.card}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', fontSize: 12, fontWeight: 600, color: '#64748b' }}>DEMANDES</div>
          {demandes.length === 0 && <div style={{ padding: 20, color: '#94a3b8', fontSize: 13 }}>Aucune demande importée</div>}
          {demandes.map(d => (
            <div key={d.id} style={S.listItem(selected === d.id)} onClick={() => loadDetail(d.id)}>
              <div style={{ fontWeight: 500, marginBottom: 2 }}>{d.semaine_debut}</div>
              <div style={{ color: '#64748b', fontSize: 12 }}>{d.fichier_nom || 'Manuel'}</div>
              <span style={{
                fontSize: 11, padding: '1px 7px', borderRadius: 20,
                background: d.statut === 'complete' ? '#dcfce7' : '#fef3c7',
                color: d.statut === 'complete' ? '#166534' : '#92400e', marginTop: 4, display: 'inline-block'
              }}>{d.statut}</span>
            </div>
          ))}
        </div>

        <div style={S.card}>
          {!detail && <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Sélectionnez une demande pour voir le détail</div>}
          {detail && (
            <>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>Semaine du {detail.semaine_debut} au {detail.semaine_fin}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{detail.lignes?.length} postes · {detail.fichier_nom}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <a href={`/api/horaires/export/${detail.id}`} style={{ ...S.btn('success'), textDecoration: 'none', display: 'inline-block' }}>
                    Export Excel
                  </a>
                  <button style={S.btn('primary')} onClick={() => {
                    if (confirm('Générer l\'horaire automatiquement?')) {
                      api.post('/horaires/generate', { demande_id: detail.id })
                        .then(r => toast(`${r.data.count} assignations créées. ${r.data.warnings.length} alertes.`, 'success'))
                        .catch(e => toast(e.response?.data?.error || 'Erreur', 'error'));
                    }
                  }}>
                    Générer l'horaire →
                  </button>
                </div>
              </div>

              <div style={{ padding: 18, maxHeight: 600, overflowY: 'auto' }}>
                {Object.entries(groupByDate(detail.lignes || [])).sort().map(([date, events]) => (
                  <div key={date} style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid #e2e8f0' }}>
                      {new Date(date + 'T12:00:00').toLocaleDateString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    {Object.entries(events).map(([evt, lignes]) => (
                      <div key={evt} style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#3b82f6', marginBottom: 8 }}>Événement : {evt}</div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead>
                            <tr>
                              {['Rôle', 'Qté', 'Horaire', 'Commentaires'].map(h => (
                                <th key={h} style={{ textAlign: 'left', padding: '4px 8px', color: '#64748b', fontWeight: 500 }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {lignes.map((l, i) => (
                              <tr key={i} style={{ borderTop: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '6px 8px' }}>{roleBadge(l.role)}</td>
                                <td style={{ padding: '6px 8px', fontWeight: 600 }}>{l.quantite}</td>
                                <td style={{ padding: '6px 8px' }}>{l.heure_debut || '?'} – {l.heure_fin || '?'}</td>
                                <td style={{ padding: '6px 8px', color: '#64748b' }}>{l.commentaires || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
