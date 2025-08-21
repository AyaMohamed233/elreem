const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Connect function
async function connect() {
    try {
        const client = await pool.connect();
        client.release();
        console.log("✅ Database connected successfully");
    } catch (err) {
        console.error("❌ Database connection error:", err.message);
        throw err;
    }
}

// Health check
async function healthCheck() {
    try {
        const result = await pool.query("SELECT 1");
        return result.rowCount > 0;
    } catch (err) {
        console.error("❌ Health check failed:", err.message);
        return false;
    }
}

// Pool stats
function getPoolStats() {
    return {
        totalClients: pool.totalCount,
        idleClients: pool.idleCount,
        waitingClients: pool.waitingCount
    };
}

// Close connection
async function close() {
    await pool.end();
    console.log("✅ Database pool closed");
}

module.exports = {
    query: (text, params) => pool.query(text, params),
    connect,
    healthCheck,
    getPoolStats,
    close
};
