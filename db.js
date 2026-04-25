const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join('/tmp', 'workforce.db');
let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL, prenom TEXT NOT NULL,
      email TEXT UNIQUE, telephone TEXT,
      statut TEXT DEFAULT 'actif',
      heures_garanties INTEGER DEFAULT 0,
      chef_equipe INTEGER DEFAULT 0, sous_chef INTEGER DEFAULT 0,
      chef_elec INTEGER DEFAULT 0, chef_quai INTEGER DEFAULT 0,
      trafic INTEGER DEFAULT 0, cariste INTEGER DEFAULT 0,
      skyjack INTEGER DEFAULT 0, manut INTEGER DEFAULT 0,
      rideaux INTEGER DEFAULT 0, notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS demandes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      semaine_debut DATE, semaine_fin DATE,
      fichier_nom TEXT, statut TEXT DEFAULT 'brouillon',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS demande_lignes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      demande_id INTEGER, date DATE, evenement TEXT,
      role TEXT, quantite INTEGER DEFAULT 1,
      heure_debut TEXT, heure_fin TEXT,
      commentaires TEXT, groupe_equipe TEXT, ordre INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS disponibilites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER, semaine_debut DATE,
      lundi TEXT DEFAULT 'indispo', mardi TEXT DEFAULT 'indispo',
      mercredi TEXT DEFAULT 'indispo', jeudi TEXT DEFAULT 'indispo',
      vendredi TEXT DEFAULT 'indispo', samedi TEXT DEFAULT 'indispo',
      dimanche TEXT DEFAULT 'indispo',
      heure_debut_pref TEXT DEFAULT '07:00',
      limite_heures INTEGER DEFAULT 40,
      vehicule INTEGER DEFAULT 0, contraintes TEXT,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(employee_id, semaine_debut)
    );
    CREATE TABLE IF NOT EXISTS horaires (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      demande_id INTEGER, demande_ligne_id INTEGER,
      employee_id INTEGER, date DATE, evenement TEXT,
      role TEXT, heure_debut TEXT, heure_fin TEXT,
      heures_total REAL, commentaires TEXT,
      statut TEXT DEFAULT 'prevu', notifie INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS email_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER, type TEXT, destinataire TEXT,
      sujet TEXT, statut TEXT, sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY, value TEXT
    );
    INSERT OR IGNORE INTO settings (key,value) VALUES
      ('smtp_host',''),('smtp_port','587'),('smtp_user',''),
      ('smtp_pass',''),('smtp_from',''),('google_form_url',''),
      ('company_name','Mon Entreprise'),('min_shift_hours','6'),
      ('max_weekly_hours','40'),('min_legal_hours','3');
  `);
}

module.exports = { getDb };
