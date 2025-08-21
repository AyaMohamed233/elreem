/**
 * Database Configuration - PostgreSQL
 *
 * This module provides the main database interface for the Elreem Bag Store.
 * It uses PostgreSQL with connection pooling for optimal performance and reliability.
 */

const { Pool } = require('pg');
require('dotenv').config();

/**
 * PostgreSQL Pool Setup
 */
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // مهم علشان Railway
});

/**
 * Database wrapper class
 * Provides methods similar to SQLite style (run, get, all) but adapted for PostgreSQL
 */
class Database {
    constructor() {
        this.pool = pool;
    }

    /**
     * Connect to the database
     * @returns {PoolClient}
     */
    async connect() {
        return await this.pool.connect();
    }

    /**
     * Close database connections
     */
    async close() {
        await this.pool.end();
    }

    /**
     * Execute a query that modifies data (INSERT, UPDATE, DELETE)
     * @param {string} sql - SQL query
     * @param {Array} params - Query parameters
     * @returns {Object} Result with id and changes count
     */
    async run(sql, params = []) {
        const result = await this.pool.query(sql, params);
        return {
            id: result.rows[0]?.id || null, // بيرجع id لو فيه
            changes: result.rowCount
        };
    }

    /**
     * Execute a query that returns a single row
     * @param {string} sql - SQL query
     * @param {Array} params - Query parameters
     * @returns {Object|null} Single row or null
     */
    async get(sql, params = []) {
        const result = await this.pool.query(sql, params);
        return result.rows[0] || null;
    }

    /**
     * Execute a query that returns multiple rows
     * @param {string} sql - SQL query
     * @param {Array} params - Query parameters
     * @returns {Array} Array of rows
     */
    async all(sql, params = []) {
        const result = await this.pool.query(sql, params);
        return result.rows;
    }

    /**
     * Execute a transaction
     * @param {Function} callback - Transaction callback
     * @returns {any} Transaction result
     */
    async transaction(callback) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    /**
     * Health check for the database connection
     * @returns {boolean} True if healthy
     */
    async healthCheck() {
        try {
            await this.pool.query('SELECT 1');
            return true;
        } catch (err) {
            return false;
        }
    }

    /**
     * Get connection pool statistics
     * @returns {Object} Pool statistics
     */
    getPoolStats() {
        return {
            total: this.pool.totalCount,
            idle: this.pool.idleCount,
            waiting: this.pool.waitingCount
        };
    }
}

module.exports = new Database();
