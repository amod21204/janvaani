import mysql from 'mysql2/promise';

let pool;

export async function getDbPool() {
  if (pool) {
    return pool;
  }

  pool = mysql.createPool({
    host: process.env.DB_HOST || 'mysql',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root1234',
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
}
