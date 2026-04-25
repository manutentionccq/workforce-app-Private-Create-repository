const { google } = require('googleapis');
const { getDb } = require('./db');

function getGoogleAuth() {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings WHERE key IN (?, ?, ?)').all(
    'google_client_id', 'google_client_secret', 'google_refresh_token'
  );
  const s = {};
  rows.forEach(r => s[r.key] = r.value);

  if (!s.google_client_id) throw new Error('Google API non configurée');

  const auth = new google.auth.OAuth2(s.google_client_id, s.google_client_secret);
  auth.setCredentials({ refresh_token: s.google_refresh_token });
  return auth;
}

/**
 * Read availability responses from a Google Sheet (linked to Google Form)
 * Expected columns: Timestamp, Nom, Prenom, Email, Telephone,
 *   Disponible cette semaine, Limite heures,
 *   Lundi, Mardi, Mercredi, Jeudi, Vendredi, Samedi, Dimanche,
 *   Heure debut, Vehicule, Contraintes
 */
async function fetchFormResponses(sheetId, weekStart) {
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Sheet1!A:R',
  });

  const rows = res.data.values || [];
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.toLowerCase().trim());
  const dataRows = rows.slice(1);

  const DAY_MAP = {
    lundi: 'lundi', mardi: 'mardi', mercredi: 'mercredi',
    jeudi: 'jeudi', vendredi: 'vendredi', samedi: 'samedi', dimanche: 'dimanche'
  };

  const AVAIL_MAP = {
    'matin': 'dispo_matin',
    'soir': 'dispo_soir',
    'journée': 'journee',
    'journee': 'journee',
    'journée complète': 'journee',
    'disponible': 'journee',
    'pas disponible': 'indispo',
    'indisponible': 'indispo',
  };

  function mapAvail(val) {
    if (!val) return 'indispo';
    const v = val.toLowerCase().trim();
    return AVAIL_MAP[v] || (v.includes('matin') ? 'dispo_matin' : v.includes('soir') ? 'dispo_soir' : v.includes('indispo') ? 'indispo' : 'journee');
  }

  function colIdx(name) {
    return headers.findIndex(h => h.includes(name.toLowerCase()));
  }

  const responses = [];
  for (const row of dataRows) {
    const get = (name) => {
      const i = colIdx(name);
      return i >= 0 ? (row[i] || '').trim() : '';
    };

    responses.push({
      nom: get('nom'),
      prenom: get('prenom'),
      email: get('email'),
      telephone: get('telephone'),
      semaine_debut: weekStart,
      disponible: get('disponible').toLowerCase() !== 'non',
      limite_heures: parseInt(get('limite')) || 40,
      lundi: mapAvail(get('lundi')),
      mardi: mapAvail(get('mardi')),
      mercredi: mapAvail(get('mercredi')),
      jeudi: mapAvail(get('jeudi')),
      vendredi: mapAvail(get('vendredi')),
      samedi: mapAvail(get('samedi')),
      dimanche: mapAvail(get('dimanche')),
      heure_debut_pref: get('heure') || '07:00',
      vehicule: get('véhicule').toLowerCase() === 'oui' ? 1 : 0,
      contraintes: get('contraintes'),
    });
  }

  return responses;
}

/**
 * Import form responses into the DB disponibilites table
 */
async function importFormResponses(sheetId, weekStart) {
  const db = getDb();
  const responses = await fetchFormResponses(sheetId, weekStart);
  let imported = 0, skipped = 0;

  for (const r of responses) {
    if (!r.email) { skipped++; continue; }

    // Find employee by email
    const emp = db.prepare('SELECT id FROM employees WHERE LOWER(email) = LOWER(?)').get(r.email);
    if (!emp) { skipped++; continue; }

    db.prepare(`
      INSERT INTO disponibilites
        (employee_id, semaine_debut, lundi, mardi, mercredi, jeudi, vendredi, samedi, dimanche,
         heure_debut_pref, limite_heures, vehicule, contraintes)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(employee_id, semaine_debut) DO UPDATE SET
        lundi=excluded.lundi, mardi=excluded.mardi, mercredi=excluded.mercredi,
        jeudi=excluded.jeudi, vendredi=excluded.vendredi, samedi=excluded.samedi, dimanche=excluded.dimanche,
        heure_debut_pref=excluded.heure_debut_pref, limite_heures=excluded.limite_heures,
        vehicule=excluded.vehicule, contraintes=excluded.contraintes, submitted_at=CURRENT_TIMESTAMP
    `).run(
      emp.id, r.semaine_debut,
      r.lundi, r.mardi, r.mercredi, r.jeudi, r.vendredi, r.samedi, r.dimanche,
      r.heure_debut_pref, r.limite_heures, r.vehicule, r.contraintes
    );
    imported++;
  }

  return { imported, skipped, total: responses.length };
}

module.exports = { fetchFormResponses, importFormResponses };
