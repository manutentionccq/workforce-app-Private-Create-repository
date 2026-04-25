const nodemailer = require('nodemailer');
const { getDb } = require('./db');

function getTransporter() {
  const db = getDb();
  const settings = {};
  const rows = db.prepare('SELECT key, value FROM settings').all();
  for (const r of rows) settings[r.key] = r.value;

  if (!settings.smtp_host || !settings.smtp_user) {
    throw new Error('SMTP non configuré. Allez dans Paramètres pour configurer l\'envoi d\'emails.');
  }

  return nodemailer.createTransport({
    host: settings.smtp_host,
    port: parseInt(settings.smtp_port) || 587,
    secure: parseInt(settings.smtp_port) === 465,
    auth: {
      user: settings.smtp_user,
      pass: settings.smtp_pass,
    },
  });
}

async function sendAvailabilityRequest(employees, weekLabel, formUrl) {
  const db = getDb();
  const transporter = getTransporter();
  const settings = {};
  db.prepare('SELECT key, value FROM settings').all().forEach(r => settings[r.key] = r.value);

  const results = [];

  for (const emp of employees) {
    if (!emp.email) continue;

    const subject = `Disponibilités semaine du ${weekLabel} — Action requise`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #185FA5;">Bonjour ${emp.prenom},</h2>
        <p>Merci de remplir le formulaire de disponibilités pour la semaine du <strong>${weekLabel}</strong>.</p>
        <p>
          <a href="${formUrl}" 
             style="background:#185FA5; color:white; padding:12px 24px; text-decoration:none; border-radius:6px; display:inline-block; margin: 16px 0;">
            Remplir mes disponibilités
          </a>
        </p>
        <p style="color:#666; font-size:13px;">Merci de répondre avant vendredi soir pour que nous puissions planifier les horaires.</p>
        <hr style="border:0.5px solid #eee; margin: 20px 0;">
        <p style="color:#999; font-size:12px;">${settings.company_name || 'Mon Entreprise'}</p>
      </div>
    `;

    try {
      await transporter.sendMail({
        from: settings.smtp_from || settings.smtp_user,
        to: emp.email,
        subject,
        html,
      });

      db.prepare(`INSERT INTO email_log (employee_id, type, destinataire, sujet, statut) VALUES (?, ?, ?, ?, ?)`)
        .run(emp.id, 'disponibilite', emp.email, subject, 'envoye');

      results.push({ employee_id: emp.id, email: emp.email, statut: 'envoye' });
    } catch (err) {
      db.prepare(`INSERT INTO email_log (employee_id, type, destinataire, sujet, statut) VALUES (?, ?, ?, ?, ?)`)
        .run(emp.id, 'disponibilite', emp.email, subject, 'erreur');
      results.push({ employee_id: emp.id, email: emp.email, statut: 'erreur', erreur: err.message });
    }
  }

  return results;
}

async function sendScheduleToEmployee(employee, scheduleText, weekLabel) {
  const db = getDb();
  const transporter = getTransporter();
  const settings = {};
  db.prepare('SELECT key, value FROM settings').all().forEach(r => settings[r.key] = r.value);

  const subject = `Votre horaire — semaine du ${weekLabel}`;
  const htmlBody = scheduleText
    .split('\n')
    .map(line => {
      if (line.startsWith('📅')) return `<h3 style="color:#185FA5;margin:16px 0 4px;">${line}</h3>`;
      if (line.startsWith('   •')) return `<p style="margin:4px 0 0 16px; font-weight:500;">${line.trim()}</p>`;
      if (line.startsWith('     ')) return `<p style="margin:2px 0 0 32px; color:#555; font-size:13px;">${line.trim()}</p>`;
      if (line.startsWith('─')) return `<hr style="border:0.5px solid #ddd; margin:16px 0;">`;
      if (line.startsWith('Total')) return `<p style="font-weight:500; font-size:15px;">${line}</p>`;
      return `<p style="margin:4px 0;">${line}</p>`;
    })
    .join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      ${htmlBody}
      <div style="margin-top:24px; padding:12px; background:#f5f5f5; border-radius:6px; font-size:12px; color:#999;">
        ${settings.company_name || 'Mon Entreprise'}
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: settings.smtp_from || settings.smtp_user,
      to: employee.email,
      subject,
      html,
    });

    db.prepare(`INSERT INTO email_log (employee_id, type, destinataire, sujet, statut) VALUES (?, ?, ?, ?, ?)`)
      .run(employee.id, 'horaire', employee.email, subject, 'envoye');

    return { statut: 'envoye' };
  } catch (err) {
    db.prepare(`INSERT INTO email_log (employee_id, type, destinataire, sujet, statut) VALUES (?, ?, ?, ?, ?)`)
      .run(employee.id, 'horaire', employee.email, subject, 'erreur');
    return { statut: 'erreur', erreur: err.message };
  }
}

module.exports = { sendAvailabilityRequest, sendScheduleToEmployee };
