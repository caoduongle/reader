/**
 * Database Client & Parameterized Query Wrapper (FR-013)
 * Enforces prepared statements ($1, $2, ...) to prevent SQL Injection attacks.
 */

let poolInstance = null;

/**
 * Executes a parameterized SQL query safely.
 * @param {string} text SQL statement with $1, $2 placeholders
 * @param {Array} params Values to bind to placeholders
 * @returns {Promise<any>} Query result
 */
export async function query(text, params = []) {
  if (!text || typeof text !== 'string') {
    throw new Error('Query text must be a valid SQL string.');
  }

  if (!Array.isArray(params)) {
    throw new Error('Query params must be passed as an Array to prevent SQL injection.');
  }

  // If DATABASE_URL is not configured, warn and return empty result for standalone mode
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    if (process.env.NODE_ENV === 'test') {
      return { rows: [], rowCount: 0 };
    }
    throw new Error('DATABASE_URL is not configured on the server.');
  }

  // Lazy load pg client pool
  if (!poolInstance) {
    try {
      const moduleName = 'pg';
      const { Pool } = await import(/* @vite-ignore */ moduleName);
      poolInstance = new Pool({
        connectionString,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
      });
    } catch {
      throw new Error('PostgreSQL driver (pg) is required when DATABASE_URL is set.');
    }
  }

  const start = Date.now();
  const res = await poolInstance.query(text, params);
  const duration = Date.now() - start;

  if (process.env.NODE_ENV === 'development') {
    console.log('[DB Query Log]:', {
      durationMs: duration,
      rowCount: res.rowCount,
    });
  }

  return res;
}

export function closePool() {
  if (poolInstance) {
    const p = poolInstance;
    poolInstance = null;
    return p.end();
  }
  return Promise.resolve();
}
