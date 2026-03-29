import { getDbPool } from '../db/mysql.js';

const KEYWORD_ROUTING = {
  water: { category: 'water', department: 'Water Department' },
  electricity: { category: 'electricity', department: 'Electricity Board' },
  power: { category: 'electricity', department: 'Electricity Board' },
  road: { category: 'road', department: 'Municipal Corporation' },
  pothole: { category: 'road', department: 'Municipal Corporation' },
  garbage: { category: 'garbage', department: 'Sanitation Department' },
};

export function classifyByKeyword(text) {
  const normalized = (text || '').toLowerCase();
  const matched = Object.entries(KEYWORD_ROUTING).find(([keyword]) => normalized.includes(keyword));
  return matched ? matched[1] : null;
}

export async function createComplaint(payload) {
  const db = await getDbPool();
  const [result] = await db.execute(
    `INSERT INTO complaints (text_original, text_improved, category, department, evidence_text, status, latitude, longitude)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.text_original || null,
      payload.text_improved || null,
      payload.category || null,
      payload.department || null,
      payload.evidence_text || null,
      payload.status || 'pending',
      payload.latitude ?? null,
      payload.longitude ?? null,
    ],
  );

  return { id: result.insertId };
}

export async function getComplaintStatuses() {
  const db = await getDbPool();
  const [rows] = await db.query(
    `SELECT id, text_original, category, department, status, created_at
     FROM complaints ORDER BY created_at DESC LIMIT 100`,
  );
  return rows;
}

export async function markFollowUpForStaleComplaints() {
  const db = await getDbPool();
  const [result] = await db.execute(
    `UPDATE complaints
     SET status = 'follow-up required'
     WHERE status = 'pending' AND created_at < DATE_SUB(NOW(), INTERVAL 3 DAY)`,
  );
  return result.affectedRows || 0;
}

export async function getDashboardData() {
  const db = await getDbPool();

  const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM complaints');
  const [categories] = await db.query(
    `SELECT COALESCE(category, 'uncategorized') AS category, COUNT(*) AS count
     FROM complaints GROUP BY category ORDER BY count DESC`,
  );
  const [statuses] = await db.query(
    `SELECT COALESCE(status, 'pending') AS status, COUNT(*) AS count
     FROM complaints GROUP BY status ORDER BY count DESC`,
  );
  const [mapPoints] = await db.query(
    `SELECT id, latitude, longitude, category, status
     FROM complaints WHERE latitude IS NOT NULL AND longitude IS NOT NULL`,
  );

  return { total, categories, statuses, mapPoints };
}
