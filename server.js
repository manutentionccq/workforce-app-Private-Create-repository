require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const XLSX = require('xlsx');
 
const { getDb } = require('./db');
const { parseDemandExcel } = require('./excelParser');
const { generateSchedule, generateEmployeeScheduleText } = require('./scheduler');
 
const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
 
app.use(cors());
app.use(express.json());
 
const db = getDb();
 
// Simple HTML interface since no frontend build
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Workforce — Gestion des horaires</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; background: #f8fafc; color: #0f172a; }
.header { background: #0f172a; color: white; padding: 16px 24px; display: flex; align-items: center; gap: 12px; }
.header h1 { font-size: 18px; font-weight: 600; }
.header p { font-size: 13px; color: #94a3b8; margin-top: 2px; }
.nav { background: #1e293b; display: flex; gap: 0; padding: 0 24px; }
.nav a { color: #94a3b8; text-decoration: none; padding: 12px 16px; font-size: 13px; display: block; }
.nav a:hover { color: white; background: #334155; }
.container { max-width: 1100px; margin: 32px auto; padding: 0 24px; }
.grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 28px; }
.card { background: white; border-radius: 10px; border: 1px solid #e2e8f0; padding: 16px 18px; }
.card-label { font-size: 12px; color: #64748b; margin-bottom: 6px; }
.card-value { font-size: 26px; font-weight: 600; color: #3b82f6; }
.section { background: white; border-radius: 10px; border: 1px solid #e2e8f0; padding: 20px 24px; margin-bottom: 20px; }
.section h2 { font-size: 15px; font-weight: 600; margin-bottom: 16px; color: #374151; }
.btn { display: inline-block; padding: 9px 18px; background: #3b82f6; color: white; border: none; border-radius: 7px; cursor: pointer; font-size: 13px; font-weight: 500; text-decoration: none; }
.btn-green { background: #16a34a; }
.btn-gray { background: #f1f5f9; color: #374151; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; padding: 8px 12px; color: #64748b; font-weight: 500; font-size: 12px; border-bottom: 1px solid #e2e8f0; }
td { padding: 10px 12px; border-bottom: 1px solid #f8fafc; }
.badge { font-size: 11px; padding: 2px 8px; border-radius: 20px; font-weight: 500; }
.badge-green { background: #dcfce7; color: #166534; }
.badge-blue { background: #dbeafe; color: #1d4ed8; }
.badge-amber { background: #fef3c7; color: #92400e; }
.info-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px 16px; font-size: 13px; color: #1e40af; margin-bottom: 16px; line-height: 1.8; }
input, select { width: 100%; padding: 8px 10px; border-radius: 6px; border: 1px solid #d1d5db; font-size: 13px; margin-bottom: 10px; }
label { font-size: 12px; font-weight: 500; color: #374151; display: block; margin-bottom: 4px; }
</style>
</head>
<body>
<div class="header">
  <div>
    <h1>⚡ Workforce</h1>
    <p>Application de gestion des horaires — API active</p>
  </div>
</div>
<div class="nav">
  <a href="/api/dashboard">📊 Dashboard JSON</a>
  <a href="/api/employees">👥 Employés JSON</a>
  <a href="/api/demandes">📋 Demandes JSON</a>
  <a href="/api/horaires">🗓 Horaires JSON</a>
</div>
<div class="container">
  <div class="info-box">
    ✅ <strong>Votre application est en ligne et fonctionnelle !</strong><br>
    L'API backend tourne correctement. Vous pouvez maintenant :<br>
    • Importer vos employés via <strong>POST /api/employees/import</strong><br>
    • Uploader une demande de service via <strong>POST /api/demandes/upload</strong><br>
    • Générer les horaires via <strong>POST /api/horaires/generate</strong><br><br>
    💡 Pour avoir l'interface graphique complète, utilisez l'application Claude.ai pour générer les horaires directement.
  </div>
 
  <div id="stats" class="grid">
    <div class="card"><div class="card-label">Statut</div><div class="card-value" style="color:#16a34a;font-size:18px;">✓ En ligne</div></div>
    <div class="card"><div class="card-label">Base de données</div><div class="card-value" style="color:#16a34a;font-size:18px;">✓ Active</div></div>
    <div class="card"><div class="card-label">API</div><div class="card-value" style="color:#16a34a;font-size:18px;">✓ Prête</div></div>
    <div class="card"><div class="card-label">Version</div><div class="card-value" style="font-size:18px;">1.0</div></div>
  </div>
 
  <div class="section">
    <h2>🔗 Points d'API disponibles</h2>
    <table>
      <thead><tr><th>Méthode</th><th>URL</th><th>Description</th></tr></thead>
      <tbody>
        <tr><td><span class="badge badge-green">GET</span></td><td>/api/employees</td><td>Liste des employés</td></tr>
        <tr><td><span class="badge badge-blue">POST</span></td><td>/api/employees/import</td><td>Import Excel employés</td></tr>
        <tr><td><span class="badge badge-green">GET</span></td><td>/api/demandes</td><td>Liste des demandes</td></tr>
        <tr><td><span class="badge badge-blue">POST</span></td><td>/api/demandes/upload</td><td>Upload Excel client</td></tr>
        <tr><td><span class="badge badge-blue">POST</span></td><td>/api/horaires/generate</td><td>Générer les horaires</td></tr>
        <tr><td><span class="badge badge-green">GET</span></td><td>/api/horaires/export/:id</td><td>Export Excel horaire</td></tr>
        <tr><td><span class="badge badge-blue">POST</span></td><td>/api/emails/send-availability</td><td>Envoyer formulaire dispos</td></tr>
        <tr><td><span class="badge badge-blue">POST</span></td><td>/api/emails/send-schedules</td><td>Envoyer horaires individuels</td></tr>
        <tr><td><span class="badge badge-green">GET</span></td><td>/api/dashboard</td><td>Données dashboard</td></tr>
        <tr><td><span class="badge badge-green">GET</span></td><td>/api/settings</td><td>Paramètres</td></tr>
        <tr><td><span class="badge badge-amber">PUT</span></td><td>/api/settings</td><td>Modifier paramètres</td></tr>
      </tbody>
    </table>
  </div>
</div>
</body>
</html>`);
});
 
// ── EMPLOYEES ──
app.get('/api/employees', (req, res) => {
  const { statut, skill } = req.query;
  let query = 'SELECT * FROM employees WHERE 1=1';
  const params = [];
  if (statut) { query += ' AND statut = ?'; params.push(statut); }
  if (skill) { query += ` AND ${skill} = 1`; }
  query += ' ORDER BY nom, prenom';
  res.json(db.prepare(query).all(...params));
});
 
app.get('/api/employees/:id', (req, res) => {
  const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
  if (!emp) return res.status(404).json({ error: 'Employé non trouvé' });
  res.json(emp);
});
 
app.post('/api/employees', (req, res) => {
  const { nom, prenom, email, telephone, statut, heures_garanties,
    chef_equipe, sous_chef, chef_elec, chef_quai, trafic,
    cariste, skyjack, manut, rideaux, notes } = req.body;
  const result = db.prepare(`INSERT INTO employees (nom, prenom, email, telephone, statut, heures_garanties,
    chef_equipe, sous_chef, chef_elec, chef_quai, trafic, cariste, skyjack, manut, rideaux, notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(nom, prenom, email||null, telephone||null, statut||'actif', heures_garanties||0,
      chef_equipe||0, sous_chef||0, chef_elec||0, chef_quai||0, trafic||0,
      cariste||0, skyjack||0, manut||0, rideaux||0, notes||'');
  res.json({ id: result.lastInsertRowid });
});
 
app.put('/api/employees/:id', (req, res) => {
  const { nom, prenom, email, telephone, statut, heures_garanties,
    chef_equipe, sous_chef, chef_elec, chef_quai, trafic,
    cariste, skyjack, manut, rideaux, notes } = req.body;
  db.prepare(`UPDATE employees SET nom=?,prenom=?,email=?,telephone=?,statut=?,heures_garanties=?,
    chef_equipe=?,sous_chef=?,chef_elec=?,chef_quai=?,trafic=?,cariste=?,skyjack=?,manut=?,rideaux=?,notes=?,updated_at=CURRENT_TIMESTAMP
    WHERE id=?`)
    .run(nom,prenom,email||null,telephone||null,statut,heures_garanties||0,
      chef_equipe||0,sous_chef||0,chef_elec||0,chef_quai||0,trafic||0,
      cariste||0,skyjack||0,manut||0,rideaux||0,notes||'',req.params.id);
  res.json({ message: 'Mis à jour' });
});
 
app.post('/api/employees/import', upload.single('file'), (req, res) => {
  try {
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
    let imported = 0;
    for (let i = 3; i < rows.length; i++) {
      const row = rows[i];
      if (!row[1]) continue;
      const fullName = String(row[1]).trim().replace(' 35h','').replace('Maternité','').trim();
      if (!fullName || fullName === 'nan') continue;
      const parts = fullName.split(' ');
      const prenom = parts[0] || '';
      const nom = parts.slice(1).join(' ') || '';
      const isMaternite = String(row[1]).includes('Maternité');
      const is35h = String(row[1]).includes('35h');
      const X = (c) => row[c] && String(row[c]).trim().toUpperCase() === 'X' ? 1 : 0;
      try {
        db.prepare(`INSERT OR IGNORE INTO employees (nom,prenom,statut,heures_garanties,chef_equipe,sous_chef,chef_elec,chef_quai,trafic,cariste,skyjack,manut,rideaux)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
          .run(nom,prenom,isMaternite?'maternite':'actif',is35h?35:0,X(3),X(4),X(5),X(6),X(7),X(8),X(9),X(10),X(11));
        imported++;
      } catch(e) {}
    }
    res.json({ imported, message: `${imported} employés importés` });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
 
// ── DEMANDES ──
app.get('/api/demandes', (req, res) => {
  res.json(db.prepare('SELECT * FROM demandes ORDER BY semaine_debut DESC').all());
});
 
app.get('/api/demandes/:id', (req, res) => {
  const demande = db.prepare('SELECT * FROM demandes WHERE id=?').get(req.params.id);
  if (!demande) return res.status(404).json({ error: 'Non trouvé' });
  const lignes = db.prepare('SELECT * FROM demande_lignes WHERE demande_id=? ORDER BY date,ordre').all(req.params.id);
  res.json({ ...demande, lignes });
});
 
app.post('/api/demandes/upload', upload.single('file'), (req, res) => {
  try {
    const { semaine_debut, semaine_fin } = req.body;
    const lignes = parseDemandExcel(req.file.buffer);
    const r = db.prepare(`INSERT INTO demandes (semaine_debut,semaine_fin,fichier_nom,statut) VALUES (?,?,?,'en_cours')`)
      .run(semaine_debut, semaine_fin, req.file.originalname);
    const id = r.lastInsertRowid;
    const ins = db.prepare(`INSERT INTO demande_lignes (demande_id,date,evenement,role,quantite,heure_debut,heure_fin,commentaires,groupe_equipe,ordre) VALUES (?,?,?,?,?,?,?,?,?,?)`);
    db.transaction(ls => ls.forEach(l => ins.run(id,l.date,l.evenement,l.role,l.quantite,l.heure_debut,l.heure_fin,l.commentaires,l.groupe_equipe,l.ordre)))(lignes);
    res.json({ id, lignes_count: lignes.length, lignes });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
 
// ── DISPONIBILITÉS ──
app.get('/api/disponibilites', (req, res) => {
  const { semaine } = req.query;
  let q = 'SELECT d.*,e.nom,e.prenom FROM disponibilites d JOIN employees e ON e.id=d.employee_id WHERE 1=1';
  const p = [];
  if (semaine) { q += ' AND d.semaine_debut=?'; p.push(semaine); }
  res.json(db.prepare(q).all(...p));
});
 
app.post('/api/disponibilites', (req, res) => {
  const { employee_id, semaine_debut, lundi, mardi, mercredi, jeudi, vendredi, samedi, dimanche,
    heure_debut_pref, limite_heures, vehicule, contraintes } = req.body;
  db.prepare(`INSERT INTO disponibilites (employee_id,semaine_debut,lundi,mardi,mercredi,jeudi,vendredi,samedi,dimanche,heure_debut_pref,limite_heures,vehicule,contraintes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(employee_id,semaine_debut) DO UPDATE SET lundi=excluded.lundi,mardi=excluded.mardi,mercredi=excluded.mercredi,
    jeudi=excluded.jeudi,vendredi=excluded.vendredi,samedi=excluded.samedi,dimanche=excluded.dimanche,
    heure_debut_pref=excluded.heure_debut_pref,limite_heures=excluded.limite_heures,vehicule=excluded.vehicule,contraintes=excluded.contraintes`)
    .run(employee_id,semaine_debut,lundi||'indispo',mardi||'indispo',mercredi||'indispo',jeudi||'indispo',
      vendredi||'indispo',samedi||'indispo',dimanche||'indispo',heure_debut_pref||'07:00',limite_heures||40,vehicule||0,contraintes||'');
  res.json({ message: 'Enregistré' });
});
 
app.post('/api/disponibilites/import-file', upload.single('file'), (req, res) => {
  try {
    const { semaine_debut } = req.body;
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
    const AMAP = { 'matin':'dispo_matin','soir':'dispo_soir','journée':'journee','journee':'journee','journée complète':'journee','':'indispo','indisponible':'indispo','pas disponible':'indispo' };
    const mA = v => AMAP[String(v).toLowerCase().trim()] || 'journee';
    let imported = 0;
    for (const row of rows) {
      const email = String(row['Courriel']||row['Email']||row['email']||'').toLowerCase().trim();
      if (!email) continue;
      const emp = db.prepare('SELECT id FROM employees WHERE LOWER(email)=?').get(email);
      if (!emp) continue;
      db.prepare(`INSERT INTO disponibilites (employee_id,semaine_debut,lundi,mardi,mercredi,jeudi,vendredi,samedi,dimanche,heure_debut_pref,limite_heures,vehicule,contraintes)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(employee_id,semaine_debut) DO UPDATE SET lundi=excluded.lundi,mardi=excluded.mardi,mercredi=excluded.mercredi,
        jeudi=excluded.jeudi,vendredi=excluded.vendredi,samedi=excluded.samedi,dimanche=excluded.dimanche`)
        .run(emp.id,semaine_debut,mA(row['Lundi']),mA(row['Mardi']),mA(row['Mercredi']),mA(row['Jeudi']),mA(row['Vendredi']),mA(row['Samedi']),mA(row['Dimanche']),'07:00',40,0,'');
      imported++;
    }
    res.json({ imported });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
 
// ── HORAIRES ──
app.get('/api/horaires', (req, res) => {
  const { demande_id, employee_id } = req.query;
  let q = 'SELECT h.*,e.nom,e.prenom FROM horaires h JOIN employees e ON e.id=h.employee_id WHERE 1=1';
  const p = [];
  if (demande_id) { q += ' AND h.demande_id=?'; p.push(demande_id); }
  if (employee_id) { q += ' AND h.employee_id=?'; p.push(employee_id); }
  q += ' ORDER BY h.date,h.heure_debut';
  res.json(db.prepare(q).all(...p));
});
 
app.post('/api/horaires/generate', (req, res) => {
  try {
    const { demande_id } = req.body;
    const demande = db.prepare('SELECT * FROM demandes WHERE id=?').get(demande_id);
    if (!demande) return res.status(404).json({ error: 'Demande non trouvée' });
    const lignes = db.prepare('SELECT * FROM demande_lignes WHERE demande_id=? ORDER BY date,ordre').all(demande_id);
    const employees = db.prepare("SELECT * FROM employees WHERE statut='actif'").all();
    const dispos = db.prepare('SELECT * FROM disponibilites WHERE semaine_debut=?').all(demande.semaine_debut);
    const { assignments, warnings, empHoursSummary } = generateSchedule(lignes, employees, dispos);
    db.prepare('DELETE FROM horaires WHERE demande_id=?').run(demande_id);
    const ins = db.prepare(`INSERT INTO horaires (demande_id,demande_ligne_id,employee_id,date,evenement,role,heure_debut,heure_fin,heures_total,commentaires,statut) VALUES (?,?,?,?,?,?,?,?,?,?,'prevu')`);
    db.transaction(as => as.forEach(a => ins.run(demande_id,a.demande_ligne_id||null,a.employee_id,a.date,a.evenement,a.role,a.heure_debut,a.heure_fin,a.heures_total,a.commentaires||'')))(assignments);
    db.prepare("UPDATE demandes SET statut='complete' WHERE id=?").run(demande_id);
    res.json({ assignments, warnings, empHoursSummary, count: assignments.length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
 
app.get('/api/horaires/export/:demande_id', (req, res) => {
  try {
    const rows = db.prepare(`SELECT h.date,h.evenement,h.role,e.prenom,e.nom,h.heure_debut,h.heure_fin,h.heures_total,h.commentaires
      FROM horaires h JOIN employees e ON e.id=h.employee_id WHERE h.demande_id=? ORDER BY h.date,h.heure_debut`).all(req.params.demande_id);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Date','Événement','Rôle','Prénom','Nom','Début','Fin','Heures','Commentaires'],
      ...rows.map(r=>[r.date,r.evenement,r.role,r.prenom,r.nom,r.heure_debut,r.heure_fin,r.heures_total,r.commentaires])
    ]), 'Horaire');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename="horaire_${req.params.demande_id}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch(e) { res.status(500).json({ error: e.message }); }
});
 
// ── DASHBOARD ──
app.get('/api/dashboard', (req, res) => {
  const totalEmployees = db.prepare("SELECT COUNT(*) as n FROM employees WHERE statut='actif'").get().n;
  const totalDemandes = db.prepare("SELECT COUNT(*) as n FROM demandes").get().n;
  const demanded = db.prepare("SELECT COALESCE(SUM(quantite),0) as n FROM demande_lignes").get().n;
  const covered = db.prepare("SELECT COUNT(*) as n FROM horaires").get().n;
  const demandes = db.prepare("SELECT * FROM demandes ORDER BY semaine_debut DESC LIMIT 5").all();
  res.json({ totalEmployees, totalDemandes, coverage: { demanded, covered, missing: Math.max(0,demanded-covered) }, demandes });
});
 
// ── SETTINGS ──
app.get('/api/settings', (req, res) => {
  const rows = db.prepare('SELECT key,value FROM settings').all();
  const s = {}; rows.forEach(r => s[r.key]=r.value);
  if (s.smtp_pass) s.smtp_pass = '••••••••';
  res.json(s);
});
 
app.put('/api/settings', (req, res) => {
  const upd = db.prepare('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)');
  db.transaction(s => Object.entries(s).forEach(([k,v]) => { if(k==='smtp_pass'&&v==='••••••••') return; upd.run(k,v); }))(req.body);
  res.json({ message: 'Sauvegardé' });
});
 
// ── EMAILS ──
app.post('/api/emails/send-availability', async (req, res) => {
  try {
    const { sendAvailabilityRequest } = require('./emailService');
    const { weekLabel, formUrl } = req.body;
    const employees = db.prepare("SELECT * FROM employees WHERE statut='actif' AND email IS NOT NULL").all();
    const results = await sendAvailabilityRequest(employees, weekLabel, formUrl);
    res.json({ results, sent: results.filter(r=>r.statut==='envoye').length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
 
app.post('/api/emails/send-schedules', async (req, res) => {
  try {
    const { sendScheduleToEmployee } = require('./emailService');
    const { demande_id, weekLabel } = req.body;
    const emps = db.prepare(`SELECT DISTINCT e.* FROM horaires h JOIN employees e ON e.id=h.employee_id WHERE h.demande_id=? AND e.email IS NOT NULL`).all(demande_id);
    const allA = db.prepare('SELECT * FROM horaires WHERE demande_id=?').all(demande_id);
    const results = [];
    for (const emp of emps) {
      const empA = allA.filter(a=>a.employee_id===emp.id);
      const info = generateEmployeeScheduleText({id:emp.id,prenom:emp.prenom,nom:emp.nom}, empA, weekLabel);
      if (!info) continue;
      const r = await sendScheduleToEmployee(emp, info.text, weekLabel);
      results.push({ employee:`${emp.prenom} ${emp.nom}`, ...r });
    }
    res.json({ results, sent: results.filter(r=>r.statut==='envoye').length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
 
app.get('/api/emails/log', (req, res) => {
  res.json(db.prepare('SELECT l.*,e.nom,e.prenom FROM email_log l LEFT JOIN employees e ON e.id=l.employee_id ORDER BY l.sent_at DESC LIMIT 200').all());
});
 
app.post('/api/form/generate', (req, res) => {
  const { weekLabel } = req.body;
  const days = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
  res.json({ formText: `FORMULAIRE DE DISPONIBILITÉS — ${weekLabel}\n\n1. Prénom *\n2. Nom *\n3. Courriel *\n4. Téléphone\n5. Disponible cette semaine ? (Oui/Non)\n6. Limite d'heures ?\n${days.map((d,i)=>`${7+i}. ${d} * (Journée / Matin / Soir / Indispo)`).join('\n')}\n14. Heure de début préférentielle\n15. Véhicule ? (Oui/Non)\n16. Contraintes particulières` });
});
 
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`\n✅ Workforce démarré sur le port ${PORT}\n`));
module.exports = app;
 
