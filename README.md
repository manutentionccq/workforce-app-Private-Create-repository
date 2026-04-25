import React, { useContext, useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ApiContext } from '../App';

const S = {
  page: { padding: 24 },
  title: { fontSize: 20, fontWeight: 600, color: '#0f172a', marginBottom: 4 },
  sub: { fontSize: 13, color: '#64748b', marginBottom: 24 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 },
  card: { background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: '16px 18px' },
  kLabel: { fontSize: 12, color: '#64748b', marginBottom: 6 },
  kVal: { fontSize: 26, fontWeight: 600 },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 },
  cardTitle: { fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12 },
  badge: (color) => ({
    display: 'inline-block', fontSize: 11, padding: '2px 8px',
    borderRadius: 20, fontWeight: 500,
    background: color === 'green' ? '#dcfce7' : color === 'red' ? '#fee2e2' : color === 'amber' ? '#fef3c7' : '#dbeafe',
    color: color === 'green' ? '#166534' : color === 'red' ? '#991b1b' : color === 'amber' ? '#92400e' : '#1d4ed8',
  }),
  warnRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 },
};

export default function Dashboard() {
  const api = useContext(ApiContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40, color: '#64748b' }}>Chargement...</div>;
  if (!data) return <div style={{ padding: 40, color: '#ef4444' }}>Erreur de chargement</div>;

  const coveragePct = data.coverage.demanded > 0
    ? Math.round((data.coverage.covered / data.coverage.demanded) * 100) : 0;

  const pieData = [
    { name: 'Couverts', value: data.coverage.covered, color: '#22c55e' },
    { name: 'Manquants', value: data.coverage.missing, color: '#f87171' },
  ];

  return (
    <div style={S.page}>
      <div style={S.title}>Dashboard</div>
      <div style={S.sub}>Vue d'ensemble de la semaine en cours</div>

      <div style={S.grid}>
        <div style={S.card}>
          <div style={S.kLabel}>Employés actifs</div>
          <div style={{ ...S.kVal, color: '#3b82f6' }}>{data.totalEmployees}</div>
        </div>
        <div style={S.card}>
          <div style={S.kLabel}>Taux de couverture</div>
          <div style={{ ...S.kVal, color: coveragePct >= 90 ? '#16a34a' : coveragePct >= 70 ? '#d97706' : '#dc2626' }}>
            {coveragePct}%
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
            {data.coverage.covered}/{data.coverage.demanded} postes
          </div>
        </div>
        <div style={S.card}>
          <div style={S.kLabel}>Postes non couverts</div>
          <div style={{ ...S.kVal, color: data.coverage.missing > 0 ? '#dc2626' : '#16a34a' }}>
            {data.coverage.missing}
          </div>
        </div>
        <div style={S.card}>
          <div style={S.kLabel}>Emails envoyés (7j)</div>
          <div style={{ ...S.kVal, color: '#8b5cf6' }}>{data.recentEmails}</div>
        </div>
      </div>

      <div style={S.row2}>
        <div style={S.card}>
          <div style={S.cardTitle}>Couverture des postes</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <PieChart width={120} height={120}>
              <Pie data={pieData} cx={55} cy={55} innerRadius={35} outerRadius={55} dataKey="value">
                {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
            </PieChart>
            <div>
              {pieData.map((e, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 13 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: e.color, display: 'inline-block' }}></span>
                  {e.name} : <strong>{e.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={S.card}>
          <div style={S.cardTitle}>
            Alertes heures supplémentaires
            {data.overtime.length === 0 && <span style={{ ...S.badge('green'), marginLeft: 8 }}>Tout OK</span>}
          </div>
          {data.overtime.length === 0 && (
            <div style={{ color: '#64748b', fontSize: 13 }}>Aucun employé ne dépasse 40h cette semaine ✓</div>
          )}
          {data.overtime.map((emp, i) => (
            <div key={i} style={S.warnRow}>
              <span>{emp.prenom} {emp.nom}</span>
              <span style={S.badge('red')}>{emp.total.toFixed(1)}h (+{(emp.total - 40).toFixed(1)}h supp.)</span>
            </div>
          ))}
        </div>
      </div>

      <div style={S.card}>
        <div style={S.cardTitle}>Demandes récentes</div>
        {data.demandes.length === 0 && <div style={{ color: '#94a3b8', fontSize: 13 }}>Aucune demande. Importez un fichier Excel client.</div>}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ textAlign: 'left', padding: '6px 0', color: '#64748b', fontWeight: 500 }}>Semaine</th>
              <th style={{ textAlign: 'left', padding: '6px 0', color: '#64748b', fontWeight: 500 }}>Fichier</th>
              <th style={{ textAlign: 'left', padding: '6px 0', color: '#64748b', fontWeight: 500 }}>Statut</th>
            </tr>
          </thead>
          <tbody>
            {data.demandes.map(d => (
              <tr key={d.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                <td style={{ padding: '8px 0' }}>{d.semaine_debut} → {d.semaine_fin}</td>
                <td style={{ padding: '8px 0', color: '#64748b' }}>{d.fichier_nom || '—'}</td>
                <td style={{ padding: '8px 0' }}>
                  <span style={S.badge(d.statut === 'complete' ? 'green' : d.statut === 'en_cours' ? 'amber' : 'blue')}>
                    {d.statut}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.pendingDispos > 0 && (
        <div style={{ marginTop: 14, padding: '12px 16px', background: '#fef3c7', borderRadius: 8, border: '1px solid #fcd34d', fontSize: 13, color: '#92400e' }}>
          ⚠ <strong>{data.pendingDispos} employés</strong> n'ont pas encore soumis leurs disponibilités cette semaine.
          <a href="/emails" style={{ marginLeft: 8, color: '#92400e', fontWeight: 500 }}>Envoyer le formulaire →</a>
        </div>
      )}
    </div>
  );
}
