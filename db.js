/**
 * Scheduling Engine
 * Rules:
 * - Min shift: 3h legal, 6h ideal
 * - Max shift: ~10h → split into 2 with handover
 * - Max weekly hours: 40h (else overtime at 1.5x)
 * - Guaranteed 35h employees get priority assignments
 * - CE can fill CM/CMA roles
 * - Chain consecutive events for same person (if same day, back-to-back)
 * - Employees in same groupe_equipe can be assigned together
 */

const ROLE_SKILLS = {
  'CM':      ['chef_equipe', 'sous_chef', 'chef_elec', 'chargé_projet'],
  'CMA':     ['chef_equipe', 'sous_chef', 'chef_elec', 'chargé_projet'],
  'CE':      ['chef_elec'],
  'R':       ['chef_quai'],
  'MQ':      ['manut', 'chef_quai'],
  'L':       ['cariste'],
  'Trafic':  ['trafic'],
  'Ma':      ['manut', 'chef_equipe', 'sous_chef', 'chef_elec', 'chef_quai', 'trafic', 'cariste'],
  'Ma-elec': ['manut', 'chef_elec'],
  'Ma-rideaux': ['manut', 'rideaux'],
  'Mo':      ['manut', 'chef_equipe', 'sous_chef'],
};

const MIN_SHIFT_IDEAL = 6;
const MAX_SHIFT_SPLIT = 10;
const MAX_WEEKLY_HOURS = 40;
const MIN_LEGAL = 3;

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  // Handle times past midnight (e.g. 27:00 = 3h next day)
  return h * 60 + (m || 0);
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

function shiftHours(debut, fin) {
  const d = timeToMinutes(debut);
  let f = timeToMinutes(fin);
  if (f <= d) f += 24 * 60; // crosses midnight
  return (f - d) / 60;
}

function employeeCanDoRole(employee, role) {
  const requiredSkills = ROLE_SKILLS[role] || ['manut'];
  return requiredSkills.some(skill => employee[skill] === 1);
}

function getWeeklyHours(assignments, employeeId) {
  return assignments
    .filter(a => a.employee_id === employeeId)
    .reduce((sum, a) => sum + (a.heures_total || 0), 0);
}

function findBestEmployee(employees, role, date, debut, fin, assignments, disponibilites, alreadyAssignedIds = new Set()) {
  const duration = shiftHours(debut, fin);

  // Filter candidates
  const candidates = employees.filter(emp => {
    if (emp.statut !== 'actif') return false;
    if (alreadyAssignedIds.has(emp.id)) return false;
    if (!employeeCanDoRole(emp, role)) return false;

    // Check availability
    const dispo = disponibilites.find(d => d.employee_id === emp.id);
    if (dispo) {
      const dayOfWeek = getDayKey(date);
      const dayDispo = dispo[dayOfWeek] || 'indispo';
      if (dayDispo === 'indispo') return false;
      if (dispo.limite_heures && getWeeklyHours(assignments, emp.id) + duration > dispo.limite_heures) return false;
    }

    // Check weekly hours cap
    const weeklyHours = getWeeklyHours(assignments, emp.id);
    if (weeklyHours + duration > MAX_WEEKLY_HOURS) return false;

    // Check no overlap on same day
    const dayAssignments = assignments.filter(a => a.employee_id === emp.id && a.date === date);
    const hasOverlap = dayAssignments.some(a => {
      const aStart = timeToMinutes(a.heure_debut);
      const aEnd = timeToMinutes(a.heure_fin);
      const bStart = timeToMinutes(debut);
      const bEnd = timeToMinutes(fin);
      return !(bEnd <= aStart || bStart >= aEnd);
    });
    if (hasOverlap) return false;

    return true;
  });

  if (candidates.length === 0) return null;

  // Sort: guaranteed 35h first (if under 35h), then by weekly hours ascending
  candidates.sort((a, b) => {
    const aHours = getWeeklyHours(assignments, a.id);
    const bHours = getWeeklyHours(assignments, b.id);

    // Prioritize guaranteed 35h employees who haven't reached 35h yet
    const aNeeds35 = a.heures_garanties === 35 && aHours < 35;
    const bNeeds35 = b.heures_garanties === 35 && bHours < 35;
    if (aNeeds35 && !bNeeds35) return -1;
    if (!aNeeds35 && bNeeds35) return 1;

    // Then by fewest hours assigned (spread the work)
    return aHours - bHours;
  });

  return candidates[0];
}

function getDayKey(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay(); // 0=Sun, 1=Mon...
  const keys = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
  return keys[day];
}

function splitShift(debut, fin) {
  const startMins = timeToMinutes(debut);
  let endMins = timeToMinutes(fin);
  if (endMins <= startMins) endMins += 24 * 60;
  const midMins = Math.floor((startMins + endMins) / 2);
  return {
    shift1: { debut, fin: minutesToTime(midMins) },
    shift2: { debut: minutesToTime(midMins), fin },
  };
}

function generateSchedule(lignes, employees, disponibilites) {
  const assignments = [];
  const warnings = [];

  // Group lignes by date
  const byDate = {};
  for (const ligne of lignes) {
    if (!byDate[ligne.date]) byDate[ligne.date] = [];
    byDate[ligne.date].push(ligne);
  }

  // Process each date
  for (const date of Object.keys(byDate).sort()) {
    const dayLignes = byDate[date];

    // Group by groupe_equipe to handle chaining
    const groupeEquipes = {};
    for (const l of dayLignes) {
      const g = l.groupe_equipe || 'default';
      if (!groupeEquipes[g]) groupeEquipes[g] = [];
      groupeEquipes[g].push(l);
    }

    for (const [groupe, groupeLignes] of Object.entries(groupeEquipes)) {
      // Track who is assigned in this group for chaining
      const groupAssignedIds = new Set();

      for (const ligne of groupeLignes) {
        const debut = ligne.heure_debut || '08:00';
        const fin = ligne.heure_fin || '17:00';
        const duration = shiftHours(debut, fin);

        for (let qty = 0; qty < ligne.quantite; qty++) {
          // Check if shift needs splitting
          if (duration > MAX_SHIFT_SPLIT) {
            const { shift1, shift2 } = splitShift(debut, fin);

            const emp1 = findBestEmployee(employees, ligne.role, date, shift1.debut, shift1.fin, assignments, disponibilites);
            const emp2 = findBestEmployee(employees, ligne.role, date, shift2.debut, shift2.fin, assignments, disponibilites, emp1 ? new Set([emp1.id]) : new Set());

            if (emp1) {
              const h = shiftHours(shift1.debut, shift1.fin);
              assignments.push({
                demande_ligne_id: ligne.id,
                employee_id: emp1.id,
                employee_nom: `${emp1.prenom} ${emp1.nom}`,
                date,
                evenement: ligne.evenement,
                role: ligne.role,
                heure_debut: shift1.debut,
                heure_fin: shift1.fin,
                heures_total: h,
                commentaires: `${ligne.commentaires || ''} [Ouverture]`.trim(),
                groupe_equipe: groupe,
              });
              groupAssignedIds.add(emp1.id);
            } else {
              warnings.push(`⚠ Aucun employé disponible pour ${ligne.role} ouverture le ${date} (${ligne.evenement})`);
            }

            if (emp2) {
              const h = shiftHours(shift2.debut, shift2.fin);
              assignments.push({
                demande_ligne_id: ligne.id,
                employee_id: emp2.id,
                employee_nom: `${emp2.prenom} ${emp2.nom}`,
                date,
                evenement: ligne.evenement,
                role: ligne.role,
                heure_debut: shift2.debut,
                heure_fin: shift2.fin,
                heures_total: h,
                commentaires: `${ligne.commentaires || ''} [Fermeture]`.trim(),
                groupe_equipe: groupe,
              });
              groupAssignedIds.add(emp2.id);
            } else {
              warnings.push(`⚠ Aucun employé disponible pour ${ligne.role} fermeture le ${date} (${ligne.evenement})`);
            }

          } else {
            // Normal shift
            // Try to chain: prefer someone already in this group who's free
            const chainCandidates = [...groupAssignedIds];
            let assigned = null;

            // First try chain candidates
            for (const empId of chainCandidates) {
              const emp = employees.find(e => e.id === empId);
              if (!emp) continue;
              if (!employeeCanDoRole(emp, ligne.role)) continue;
              const weeklyH = getWeeklyHours(assignments, empId);
              if (weeklyH + duration > MAX_WEEKLY_HOURS) continue;
              const hasOverlap = assignments.filter(a => a.employee_id === empId && a.date === date).some(a => {
                const aStart = timeToMinutes(a.heure_debut);
                const aEnd = timeToMinutes(a.heure_fin);
                const bStart = timeToMinutes(debut);
                const bEnd = timeToMinutes(fin);
                return !(bEnd <= aStart || bStart >= aEnd);
              });
              if (!hasOverlap) { assigned = emp; break; }
            }

            if (!assigned) {
              assigned = findBestEmployee(employees, ligne.role, date, debut, fin, assignments, disponibilites);
            }

            if (assigned) {
              // Check if short shift can be extended by chaining another event
              let finalDebut = debut;
              let finalFin = fin;
              let finalHours = duration;

              if (duration < MIN_SHIFT_IDEAL) {
                // Look for adjacent event same employee could cover
                const adjacentLignes = dayLignes.filter(l2 => {
                  if (l2 === ligne) return false;
                  const l2Debut = timeToMinutes(l2.heure_debut || '08:00');
                  const l2Fin = timeToMinutes(l2.heure_fin || '17:00');
                  const currFin = timeToMinutes(fin);
                  // Adjacent = starts when current ends (within 30 min)
                  return Math.abs(l2Debut - currFin) <= 30 && employeeCanDoRole(assigned, l2.role);
                });
                if (adjacentLignes.length > 0) {
                  // Will be handled when we process adjacent ligne
                }
              }

              assignments.push({
                demande_ligne_id: ligne.id,
                employee_id: assigned.id,
                employee_nom: `${assigned.prenom} ${assigned.nom}`,
                date,
                evenement: ligne.evenement,
                role: ligne.role,
                heure_debut: finalDebut,
                heure_fin: finalFin,
                heures_total: finalHours,
                commentaires: ligne.commentaires || '',
                groupe_equipe: groupe,
              });
              groupAssignedIds.add(assigned.id);

              if (duration < MIN_LEGAL) {
                warnings.push(`⚠ Shift de ${duration}h sous le minimum légal (3h) pour ${assigned.prenom} ${assigned.nom} le ${date}`);
              } else if (duration < MIN_SHIFT_IDEAL) {
                warnings.push(`ℹ Shift court (${duration}h) pour ${assigned.prenom} ${assigned.nom} le ${date} — idéal 6h+`);
              }
            } else {
              warnings.push(`⚠ Poste non comblé : ${ligne.quantite}x ${ligne.role} le ${date} ${debut}-${fin} (${ligne.evenement})`);
            }
          }
        }
      }
    }
  }

  // Weekly hours summary per employee
  const empHoursSummary = {};
  for (const a of assignments) {
    if (!empHoursSummary[a.employee_id]) empHoursSummary[a.employee_id] = 0;
    empHoursSummary[a.employee_id] += a.heures_total || 0;
  }

  for (const [empId, hours] of Object.entries(empHoursSummary)) {
    if (hours > MAX_WEEKLY_HOURS) {
      const emp = employees.find(e => e.id === Number(empId));
      warnings.push(`⚠ HEURES SUPPLÉMENTAIRES: ${emp?.prenom} ${emp?.nom} — ${hours.toFixed(1)}h (max 40h, surtemps 1.5x)`);
    }
  }

  return { assignments, warnings, empHoursSummary };
}

function generateEmployeeScheduleText(employee, assignments, weekLabel) {
  const empAssignments = assignments
    .filter(a => a.employee_id === employee.id)
    .sort((a, b) => a.date.localeCompare(b.date) || a.heure_debut.localeCompare(b.heure_debut));

  if (empAssignments.length === 0) return null;

  const totalHours = empAssignments.reduce((s, a) => s + (a.heures_total || 0), 0);

  let text = `Bonjour ${employee.prenom},\n\n`;
  text += `Voici votre horaire pour la semaine du ${weekLabel} :\n\n`;

  let currentDate = '';
  for (const a of empAssignments) {
    if (a.date !== currentDate) {
      currentDate = a.date;
      const dateObj = new Date(a.date + 'T12:00:00');
      const dayStr = dateObj.toLocaleDateString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      text += `📅 ${dayStr.charAt(0).toUpperCase() + dayStr.slice(1)}\n`;
    }
    text += `   • ${a.heure_debut} – ${a.heure_fin} (${a.heures_total?.toFixed(1)}h)\n`;
    text += `     Événement : ${a.evenement}\n`;
    text += `     Rôle : ${a.role}\n`;
    if (a.commentaires) text += `     Note : ${a.commentaires}\n`;
    text += '\n';
  }

  text += `─────────────────────────\n`;
  text += `Total semaine : ${totalHours.toFixed(1)} heures\n\n`;
  text += `Pour toute question, n'hésitez pas à nous contacter.\n\nCordialement,`;

  return { text, totalHours, count: empAssignments.length };
}

module.exports = { generateSchedule, generateEmployeeScheduleText, ROLE_SKILLS, shiftHours };
