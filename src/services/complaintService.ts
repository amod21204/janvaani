import type {ResultSetHeader, RowDataPacket} from 'mysql2';

import {ensureMySqlSchema, getMySqlPool} from '../db/mysql.ts';

export interface ComplaintRecord extends RowDataPacket {
  id: number;
  user_id: string;
  text_original: string;
  text_improved: string;
  created_at: string;
}

const complaintsSchema = `
  CREATE TABLE IF NOT EXISTS complaints (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    text_original TEXT NOT NULL,
    text_improved LONGTEXT NOT NULL,
    category VARCHAR(64) NOT NULL DEFAULT '',
    department VARCHAR(255) NOT NULL DEFAULT '',
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    evidence_text TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX complaints_user_created_idx (user_id, created_at),
    CONSTRAINT complaints_user_fk FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
  );
`;

async function ensureComplaintTable() {
  await ensureMySqlSchema();
  const pool = getMySqlPool();
  if (!pool) {
    throw new Error('MySQL is not configured. Please set MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, and MYSQL_DATABASE.');
  }

  await pool.query(complaintsSchema);

  try {
    await pool.query('ALTER TABLE complaints ADD COLUMN user_id VARCHAR(64) NULL');
  } catch (error) {
    const mysqlError = error as {code?: string};
    if (mysqlError.code !== 'ER_DUP_FIELDNAME') {
      throw error;
    }
  }

  try {
    await pool.query('ALTER TABLE complaints ADD INDEX complaints_user_created_idx (user_id, created_at)');
  } catch (error) {
    const mysqlError = error as {code?: string};
    if (mysqlError.code !== 'ER_DUP_KEYNAME') {
      throw error;
    }
  }

  return pool;
}

export async function createComplaint(userId: string, input: Pick<ComplaintRecord, 'text_original' | 'text_improved'>) {
  const pool = await ensureComplaintTable();

  const [result] = await pool.execute<ResultSetHeader>(
    `
      INSERT INTO complaints (user_id, text_original, text_improved, category, department, status, evidence_text)
      VALUES (?, ?, ?, '', '', 'pending', '')
    `,
    [userId, input.text_original, input.text_improved],
  );

  const complaintId = Number((result as {insertId: number}).insertId);
  const [rows] = await pool.execute<ComplaintRecord[]>(
    `
      SELECT id, user_id, text_original, text_improved, created_at
      FROM complaints
      WHERE id = ? AND user_id = ?
      LIMIT 1
    `,
    [complaintId, userId],
  );

  return rows[0];
}

export async function listComplaints(userId: string, limit = 20) {
  const pool = await ensureComplaintTable();
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const [rows] = await pool.execute<ComplaintRecord[]>(
    `
      SELECT id, user_id, text_original, text_improved, created_at
      FROM complaints
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `,
    [userId, safeLimit],
  );

  return rows;
}
