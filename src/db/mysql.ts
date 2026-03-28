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

export function getMySqlPool() {
  if (pool) {
    return pool;
  }

  const {
    MYSQL_HOST,
    MYSQL_PORT,
    MYSQL_USER,
    MYSQL_PASSWORD,
    MYSQL_DATABASE,
  } = process.env;

  if (!MYSQL_HOST || !MYSQL_USER || !MYSQL_DATABASE) {
    return null;
  }

  pool = mysql.createPool({
    host: MYSQL_HOST,
    port: MYSQL_PORT ? Number(MYSQL_PORT) : 3306,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: MYSQL_DATABASE,
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
      const {
        MYSQL_HOST,
        MYSQL_PORT,
        MYSQL_USER,
        MYSQL_PASSWORD,
        MYSQL_DATABASE,
      } = process.env;

      const activePool = getMySqlPool();
      if (!activePool || !MYSQL_HOST || !MYSQL_USER || !MYSQL_DATABASE) {
        return;
      }

      try {
        await activePool.query(schemaSql);
      } catch (error) {
        const mysqlError = error as {code?: string};
        if (mysqlError.code !== 'ER_BAD_DB_ERROR') {
          throw error;
        }

        const bootstrap = await mysql.createConnection({
          host: MYSQL_HOST,
          port: MYSQL_PORT ? Number(MYSQL_PORT) : 3306,
          user: MYSQL_USER,
          password: MYSQL_PASSWORD,
          multipleStatements: true,
        });

        try {
          await bootstrap.query(`CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}\``);
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
