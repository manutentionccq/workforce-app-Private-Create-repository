const XLSX = require('xlsx');

function parseTime(val) {
  if (!val && val !== 0) return null;
  if (typeof val === 'string') {
    const m = val.match(/(\d+)[h:](\d*)/);
    if (m) return `${m[1].padStart(2,'0')}:${(m[2]||'00').padStart(2,'0')}`;
    return val;
  }
  if (typeof val === 'number') {
    const h = Math.floor(val * 24);
    const min = Math.round((val * 24 - h) * 60);
    return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
  }
  return null;
}

function parseDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().split('T')[0];
  if (typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return d.toISOString().split('T')[0];
  }
  return String(val);
}

function parseDemandExcel(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  let headerRow = 14;
  for (let i = 0; i < Math.min(20, raw.length); i++) {
    const rowStr = raw[i].map(c => String(c||'').toLowerCase()).join('|');
    if (rowStr.includes('chef') && rowStr.includes('man')) { headerRow = i; break; }
  }

  const dataRows = raw.slice(headerRow + 1);
  const lignes = [];
  let currentDate = null;
  let currentEvent = null;
  let groupCounter = 0;
  let currentGroup = 'G1';
  let prevHadContent = false;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (!row || row.every(c => !c)) { prevHadContent = false; continue; }

    if (row[0]) currentDate = parseDate(row[0]);
    if (row[1]) {
      const newEvt = String(row[1]).trim();
      if (newEvt !== currentEvent) {
        currentEvent = newEvt;
        if (!prevHadContent) { groupCounter++; currentGroup = `G${groupCounter}`; }
      }
    }

    const comment = row[8] ? String(row[8]).trim() : '';
    const c = comment.toLowerCase();
    let rowHasContent = false;

    const roleMap = [
      [2, row[2], c.includes('électr')||c.includes('electr') ? 'CE' : c.includes('quai') ? 'R' : 'CM'],
      [3, row[3], 'R'],
      [4, row[4], 'L'],
      [5, row[5], c.includes('électr')||c.includes('electr') ? 'Ma-elec' : c.includes('quai') ? 'MQ' : c.includes('trafic') ? 'Trafic' : 'Ma'],
    ];

    for (const [, qty, role] of roleMap) {
      if (qty && !isNaN(qty) && Number(qty) > 0) {
        rowHasContent = true;
        lignes.push({
          date: currentDate,
          evenement: currentEvent,
          role,
          quantite: Number(qty),
          heure_debut: parseTime(row[6]),
          heure_fin: parseTime(row[7]),
          commentaires: comment,
          groupe_equipe: currentGroup,
          ordre: i,
        });
      }
    }
    prevHadContent = rowHasContent;
  }
  return lignes;
}

module.exports = { parseDemandExcel };
