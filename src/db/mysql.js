import mysql from 'mysql2/promise';

let pool;

async function ensureColumn(db, columnName, definition) {
  const [rows] = await db.query(
    `
      SELECT COUNT(*) AS count
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'complaints'
        AND COLUMN_NAME = ?
    `,
    [columnName],
  );

  if (!rows[0]?.count) {
    await db.execute(`ALTER TABLE complaints ADD COLUMN ${columnName} ${definition}`);
  }
}

export async function getDbPool() {
  if (pool) {
    return pool;
  }

  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'janvaani',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  return pool;
}

export async function initComplaintsTable() {
  const db = await getDbPool();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS complaints (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_name VARCHAR(120),
      user_email VARCHAR(255),
      text_original TEXT,
      text_improved TEXT,
      category VARCHAR(120),
      department VARCHAR(255),
      evidence_text TEXT,
      status VARCHAR(50) DEFAULT 'pending',
      latitude FLOAT,
      longitude FLOAT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await ensureColumn(db, 'user_name', 'VARCHAR(120) NULL');
  await ensureColumn(db, 'user_email', 'VARCHAR(255) NULL');
}
