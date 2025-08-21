/**
 * PostgreSQL Client Setup
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // هتكون موجودة في Render/Heroku
  ssl: { rejectUnauthorized: false } // مهم لو على Render
});

// تشغيل query عام
async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result;
  } finally {
    client.release();
  }
}

// محاكاة run زي SQLite
async function run(sql, params = []) {
  const result = await query(sql, params);
  return {
    insertId: result.rows[0]?.id || null, // بيرجع id لو موجود
    rowCount: result.rowCount
  };
}

// محاكاة get (يرجع سطر واحد)
async function get(sql, params = []) {
  const result = await query(sql, params);
  return result.rows[0] || null;
}

// محاكاة all (يرجع كل الصفوف)
async function all(sql, params = []) {
  const result = await query(sql, params);
  return result.rows;
}

// Transaction
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Health Check
async function healthCheck() {
  try {
    await query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

// Pool Stats
function getPoolStats() {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount
  };
}

module.exports = {
  connect: () => pool.connect(),
  close: () => pool.end(),
  query,
  run,
  get,
  all,
  transaction,
  healthCheck,
  getPoolStats
};
