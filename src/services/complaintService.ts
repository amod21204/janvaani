import type {ResultSetHeader, RowDataPacket} from 'mysql2';

import {ensureMySqlSchema, getMySqlPool} from '../db/mysql.ts';

export type ComplaintStatus = 'pending' | 'follow-up required' | 'resolved';

export interface ComplaintRecord extends RowDataPacket {
  id: number;
  text_original: string;
  text_improved: string;
  category: string;
  department: string;
  status: ComplaintStatus;
  evidence_text: string;
  created_at: string;
}

export interface ComplaintDashboard {
  totalComplaints: number;
  pendingComplaints: number;
  resolvedComplaints: number;
  followUpRequiredComplaints: number;
  categoryBreakdown: Array<{category: string; total: number}>;
  recentComplaints: ComplaintRecord[];
}

interface ComplaintSummaryRow extends RowDataPacket {
  totalComplaints: number;
  pendingComplaints: number;
  resolvedComplaints: number;
  followUpRequiredComplaints: number;
}

interface ComplaintCategoryRow extends RowDataPacket {
  category: string;
  total: number;
}

const complaintsSchema = `
  CREATE TABLE IF NOT EXISTS complaints (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    text_original TEXT NOT NULL,
    text_improved LONGTEXT NOT NULL,
    category VARCHAR(64) NOT NULL,
    department VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    evidence_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

async function ensureComplaintTable() {
  await ensureMySqlSchema();
  const pool = getMySqlPool();
  if (!pool) {
    throw new Error('MySQL is not configured. Please set MYSQL_* or DB_* database environment variables.');
  }

  await pool.query(complaintsSchema);
  return pool;
}

export async function createComplaint(input: Omit<ComplaintRecord, 'id' | 'created_at' | 'status'> & {status?: ComplaintStatus}) {
  const pool = await ensureComplaintTable();
  const status = input.status || 'pending';

  const [result] = await pool.execute<ResultSetHeader>(
    `
      INSERT INTO complaints (text_original, text_improved, category, department, status, evidence_text)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [input.text_original, input.text_improved, input.category, input.department, status, input.evidence_text],
  );

  const complaintId = Number((result as {insertId: number}).insertId);
  const [rows] = await pool.execute<ComplaintRecord[]>(
    `
      SELECT id, text_original, text_improved, category, department, status, evidence_text, created_at
      FROM complaints
      WHERE id = ?
      LIMIT 1
    `,
    [complaintId],
  );

  return rows[0];
}

export async function listComplaints(limit = 20) {
  const pool = await ensureComplaintTable();
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const [rows] = await pool.execute<ComplaintRecord[]>(
    `
      SELECT id, text_original, text_improved, category, department, status, evidence_text, created_at
      FROM complaints
      ORDER BY created_at DESC
      LIMIT ${safeLimit}
    `,
  );

  return rows;
}

export async function markComplaintResolved(id: number) {
  const pool = await ensureComplaintTable();
  await pool.execute('UPDATE complaints SET status = ? WHERE id = ?', ['resolved', id]);
}

export async function updateFollowUpStatuses() {
  const pool = await ensureComplaintTable();
  await pool.execute(
    `
      UPDATE complaints
      SET status = 'follow-up required'
      WHERE status = 'pending' AND created_at <= DATE_SUB(NOW(), INTERVAL 3 DAY)
    `,
  );
}

export async function getComplaintDashboard(): Promise<ComplaintDashboard> {
  const pool = await ensureComplaintTable();
  const [countRows] = await pool.query<ComplaintSummaryRow[]>(
    `
      SELECT
        COUNT(*) AS totalComplaints,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pendingComplaints,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolvedComplaints,
        SUM(CASE WHEN status = 'follow-up required' THEN 1 ELSE 0 END) AS followUpRequiredComplaints
      FROM complaints
    `,
  );

  const [categoryRows] = await pool.query<ComplaintCategoryRow[]>(
    `
      SELECT category, COUNT(*) AS total
      FROM complaints
      GROUP BY category
      ORDER BY total DESC, category ASC
    `,
  );

  const recentComplaints = await listComplaints(8);
  const summary = countRows[0] || {
    totalComplaints: 0,
    pendingComplaints: 0,
    resolvedComplaints: 0,
    followUpRequiredComplaints: 0,
  };

  return {
    totalComplaints: Number(summary.totalComplaints || 0),
    pendingComplaints: Number(summary.pendingComplaints || 0),
    resolvedComplaints: Number(summary.resolvedComplaints || 0),
    followUpRequiredComplaints: Number(summary.followUpRequiredComplaints || 0),
    categoryBreakdown: categoryRows.map((row) => ({
      category: row.category,
      total: Number(row.total),
    })),
    recentComplaints,
  };
}
