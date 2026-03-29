import routingConfig from '../data/department-routing.json' with { type: 'json' };
import { getDbPool } from '../db/mysql.js';

const DEFAULT_ROUTING = {
  category: 'civic',
  department: 'Municipal Corporation',
};

export function getDepartmentMappings() {
  return Object.values(routingConfig);
}

export function classifyByKeyword(text) {
  const normalized = (text || '').toLowerCase();
  if (!normalized) {
    return null;
  }

  for (const route of getDepartmentMappings()) {
    const matchedKeyword = route.keywords.find((keyword) => normalized.includes(keyword.toLowerCase()));
    if (matchedKeyword) {
      return {
        category: route.category,
        department: route.department,
        matchedKeyword,
      };
    }
  }

  return null;
}

export function normalizeRoutingResult(result) {
  return {
    category: result?.category || DEFAULT_ROUTING.category,
    department: result?.department || DEFAULT_ROUTING.department,
    matchedKeyword: result?.matchedKeyword || null,
  };
}

export async function createComplaint(payload) {
  const db = await getDbPool();
  const [result] = await db.execute(
    `
      INSERT INTO complaints (
        text_original,
        text_improved,
        category,
        department,
        evidence_text,
        status,
        latitude,
        longitude
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
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
    `
      SELECT id, text_original, text_improved, category, department, evidence_text, status, created_at
      FROM complaints
      ORDER BY created_at DESC
      LIMIT 100
    `,
  );
  return rows;
}

export async function markFollowUpForStaleComplaints() {
  const db = await getDbPool();
  const [result] = await db.execute(
    `
      UPDATE complaints
      SET status = 'follow-up required'
      WHERE status = 'pending'
        AND created_at < DATE_SUB(NOW(), INTERVAL 3 DAY)
    `,
  );

  return result.affectedRows || 0;
}

export async function getDashboardData() {
  const db = await getDbPool();

  const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM complaints');

  const [categoryRows] = await db.query(
    `SELECT COALESCE(category, 'uncategorized') AS category, COUNT(*) AS count FROM complaints GROUP BY category ORDER BY count DESC`,
  );

  const [statusRows] = await db.query(
    `SELECT COALESCE(status, 'pending') AS status, COUNT(*) AS count FROM complaints GROUP BY status ORDER BY count DESC`,
  );

  const [[statusSummary]] = await db.query(`
    SELECT
      SUM(CASE WHEN COALESCE(status, 'pending') = 'pending' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN COALESCE(status, 'pending') = 'resolved' THEN 1 ELSE 0 END) AS resolved,
      SUM(CASE WHEN COALESCE(status, 'pending') = 'follow-up required' THEN 1 ELSE 0 END) AS follow_up_required
    FROM complaints
  `);

  const [mapRows] = await db.query(
    `SELECT id, latitude, longitude, category, status FROM complaints WHERE latitude IS NOT NULL AND longitude IS NOT NULL`,
  );

  const [recentRows] = await db.query(
    `
      SELECT id, COALESCE(category, 'uncategorized') AS category, COALESCE(department, 'Municipal Corporation') AS department,
             COALESCE(status, 'pending') AS status, created_at
      FROM complaints
      ORDER BY created_at DESC
      LIMIT 6
    `,
  );

  return {
    total,
    categories: categoryRows,
    statuses: statusRows,
    summary: {
      pending: Number(statusSummary?.pending || 0),
      resolved: Number(statusSummary?.resolved || 0),
      followUpRequired: Number(statusSummary?.follow_up_required || 0),
    },
    mapPoints: mapRows,
    recentComplaints: recentRows,
  };
}
