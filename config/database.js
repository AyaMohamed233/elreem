/**
 * Database Configuration - PostgreSQL
 *
 * This module provides the main database interface for the Elreem Bag Store.
 * It uses PostgreSQL with connection pooling for optimal performance and reliability.
 */

const postgresDB = require('./postgresql');
require('dotenv').config();

/**
 * Database wrapper that provides a consistent interface
 * Compatible with the existing SQLite-style API while using PostgreSQL
 */
class Database {
    constructor() {
        this.db = postgresDB;
    }

    /**
     * Connect to the database
     * @returns {Promise<Pool>} Database connection pool
     */
    async connect() {
        return await this.db.connect();
    }

    /**
     * Close database connections
     * @returns {Promise<void>}
     */
    async close() {
        return await this.db.close();
    }

    /**
     * Execute a query that modifies data (INSERT, UPDATE, DELETE)
     * @param {string} sql - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise<Object>} Result with id and changes count
     */
    async run(sql, params = []) {
        const result = await this.db.run(sql, params);
        return {
            id: result.insertId,
            changes: result.rowCount
        };
    }

    /**
     * Execute a query that returns a single row
     * @param {string} sql - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise<Object|null>} Single row or null
     */
    async get(sql, params = []) {
        return await this.db.get(sql, params);
    }

    /**
     * Execute a query that returns multiple rows
     * @param {string} sql - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise<Array>} Array of rows
     */
    async all(sql, params = []) {
        return await this.db.all(sql, params);
    }

    /**
     * Execute a transaction
     * @param {Function} callback - Transaction callback
     * @returns {Promise<any>} Transaction result
     */
    async transaction(callback) {
        return await this.db.transaction(callback);
    }

    /**
     * Health check for the database connection
     * @returns {Promise<boolean>} True if healthy
     */
    async healthCheck() {
        return await this.db.healthCheck();
    }

    /**
     * Get connection pool statistics
     * @returns {Object} Pool statistics
     */
    getPoolStats() {
        return this.db.getPoolStats();
    }
}

module.exports = new Database(); 
