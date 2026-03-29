import mysql from 'mysql2';

type PromisePool = ReturnType<mysql.Pool['promise']>;

let pool: PromisePool | null = null;
let schemaReady: Promise<void> | null = null;

const schemaSql = `
  CREATE TABLE IF NOT EXISTS auth_users (
    id VARCHAR(64) PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    occupation VARCHAR(255) NOT NULL,
    age VARCHAR(32) NOT NULL,
    address TEXT NOT NULL,
    phone_number VARCHAR(32) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS auth_otp_challenges (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    purpose VARCHAR(32) NOT NULL,
    otp VARCHAR(16) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT auth_otp_challenges_user_fk FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS auth_sessions (
    token VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT auth_sessions_user_fk FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
  );
`;

type DbConfig = {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
};

function readDbConfig(): DbConfig | null {
  const host = process.env.MYSQL_HOST || process.env.DB_HOST;
  const user = process.env.MYSQL_USER || process.env.DB_USER;
  const database = process.env.MYSQL_DATABASE || process.env.DB_NAME;
  const password = process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD;
  const port = Number(process.env.MYSQL_PORT || process.env.DB_PORT || 3306);

  if (!host || !user || !database) {
    return null;
  }

  return { host, port, user, password, database };
}

export function getMySqlPool() {
  if (pool) {
    return pool;
  }

  const db = readDbConfig();
  if (!db) {
    return null;
  }

  pool = mysql.createPool({
    host: db.host,
    port: db.port,
    user: db.user,
    password: db.password,
    database: db.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true,
  }).promise();

  return pool;
}

export async function ensureMySqlSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = readDbConfig();
      const activePool = getMySqlPool();
      if (!activePool || !db) {
        return;
      }

      try {
        await activePool.query(schemaSql);
      } catch (error) {
        const mysqlError = error as { code?: string };
        if (mysqlError.code !== 'ER_BAD_DB_ERROR') {
          throw error;
        }

        const bootstrap = await mysql.createConnection({
          host: db.host,
          port: db.port,
          user: db.user,
          password: db.password,
          multipleStatements: true,
        });

        try {
          await bootstrap.query(`CREATE DATABASE IF NOT EXISTS \`${db.database}\``);
        } finally {
          await bootstrap.end();
        }

        pool = null;
        const retriedPool = getMySqlPool();
        if (!retriedPool) {
          return;
        }

        await retriedPool.query(schemaSql);
      }
    })();
  }

  await schemaReady;
}
