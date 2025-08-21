/**
 * PostgreSQL Database Configuration with Connection Pooling
 * 
 * This module provides a robust PostgreSQL connection pool for the Elreem Bag Store.
 * It handles connection management, error handling, and provides a clean interface
 * for database operations.
 */

const { Pool } = require('pg');
require('dotenv').config();

class PostgreSQLDatabase {
    constructor() {
        this.pool = null;
        this.isConnected = false;
    }

    /**
     * Initialize the PostgreSQL connection pool
     * @returns {Promise<Pool>} The database pool instance
     */
    async connect() {
        if (this.pool && this.isConnected) {
            return this.pool;
        }

        try {
            // Parse DATABASE_URL or use individual connection parameters
            const connectionConfig = process.env.DATABASE_URL ? {
                connectionString: process.env.DATABASE_URL,
                ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
            } : {
                host: process.env.DB_HOST || 'localhost',
                port: process.env.DB_PORT || 5432,
                database: process.env.DB_NAME || 'elreem_store',
                user: process.env.DB_USER || 'postgres',
                password: process.env.DB_PASSWORD || 'password',
                ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
            };

            this.pool = new Pool({
                ...connectionConfig,
                // Connection pool settings
                max: 20, // Maximum number of clients in the pool
                idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
                connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
                maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
            });

            // Test the connection
            const client = await this.pool.connect();
            await client.query('SELECT NOW()');
            client.release();

            this.isConnected = true;
            console.log('✅ Connected to PostgreSQL database');
            
            // Handle pool errors
            this.pool.on('error', (err) => {
                console.error('❌ Unexpected error on idle client', err);
                this.isConnected = false;
            });

            return this.pool;
        } catch (error) {
            console.error('❌ Error connecting to PostgreSQL database:', error.message);
            throw error;
        }
    }

    /**
     * Close the database connection pool
     * @returns {Promise<void>}
     */
    async close() {
        if (this.pool) {
            await this.pool.end();
            this.isConnected = false;
            console.log('✅ PostgreSQL connection pool closed');
        }
    }

    /**
     * Execute a query that returns no results (INSERT, UPDATE, DELETE)
     * @param {string} sql - The SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise<Object>} Query result with rowCount and insertId
     */
    async run(sql, params = []) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(sql, params);
            return {
                rowCount: result.rowCount,
                insertId: result.rows[0]?.id || null,
                rows: result.rows
            };
        } finally {
            client.release();
        }
    }

    /**
     * Execute a query that returns a single row
     * @param {string} sql - The SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise<Object|null>} Single row or null
     */
    async get(sql, params = []) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(sql, params);
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    /**
     * Execute a query that returns multiple rows
     * @param {string} sql - The SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise<Array>} Array of rows
     */
    async all(sql, params = []) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(sql, params);
            return result.rows;
        } finally {
            client.release();
        }
    }

    /**
     * Execute a transaction
     * @param {Function} callback - Function that receives a client and executes queries
     * @returns {Promise<any>} Result of the transaction
     */
    async transaction(callback) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Check if the database connection is healthy
     * @returns {Promise<boolean>} True if connection is healthy
     */
    async healthCheck() {
        try {
            const client = await this.pool.connect();
            await client.query('SELECT 1');
            client.release();
            return true;
        } catch (error) {
            console.error('Database health check failed:', error.message);
            return false;
        }
    }

    /**
     * Get connection pool statistics
     * @returns {Object} Pool statistics
     */
    getPoolStats() {
        if (!this.pool) return null;
        
        return {
            totalCount: this.pool.totalCount,
            idleCount: this.pool.idleCount,
            waitingCount: this.pool.waitingCount
        };
    }
}

module.exports = new PostgreSQLDatabase();
