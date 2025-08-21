/**
 * SQLite to PostgreSQL Migration Script
 * 
 * This script safely migrates data from SQLite to PostgreSQL,
 * creating tables and transferring all existing data.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const db = require('../config/database');
require('dotenv').config();

class SQLiteToPostgreSQLMigrator {
    constructor() {
        this.sqliteDbPath = process.env.DB_PATH || path.join(__dirname, '../database/elreem.db');
        this.sqliteDb = null;
    }

    /**
     * Connect to SQLite database
     */
    async connectSQLite() {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync(this.sqliteDbPath)) {
                reject(new Error(`SQLite database not found at: ${this.sqliteDbPath}`));
                return;
            }

            this.sqliteDb = new sqlite3.Database(this.sqliteDbPath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('✅ Connected to SQLite database');
                    resolve();
                }
            });
        });
    }

    /**
     * Close SQLite connection
     */
    async closeSQLite() {
        return new Promise((resolve) => {
            if (this.sqliteDb) {
                this.sqliteDb.close(() => {
                    console.log('✅ SQLite connection closed');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    /**
     * Get all data from SQLite table
     */
    async getSQLiteData(tableName) {
        return new Promise((resolve, reject) => {
            this.sqliteDb.all(`SELECT * FROM ${tableName}`, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    /**
     * Create PostgreSQL tables with proper schema
     */
    async createPostgreSQLTables() {
        console.log('📋 Creating PostgreSQL tables...');

        // Users table
        await db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                first_name VARCHAR(255) NOT NULL,
                last_name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                phone VARCHAR(50),
                password VARCHAR(255),
                google_id VARCHAR(255),
                is_admin BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Bags table
        await db.run(`
            CREATE TABLE IF NOT EXISTS bags (
                id SERIAL PRIMARY KEY,
                name_en VARCHAR(255) NOT NULL,
                name_ar VARCHAR(255) NOT NULL,
                description_en TEXT,
                description_ar TEXT,
                price DECIMAL(10,2) NOT NULL,
                colors TEXT NOT NULL,
                quantity INTEGER DEFAULT 0,
                image_urls TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Orders table
        await db.run(`
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                status VARCHAR(50) DEFAULT 'In Progress',
                total_amount DECIMAL(10,2) NOT NULL,
                shipping_fee DECIMAL(10,2) DEFAULT 40.00,
                customer_name VARCHAR(255) NOT NULL,
                customer_phone VARCHAR(50) NOT NULL,
                customer_address TEXT NOT NULL,
                customer_email VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `);

        // Order Items table
        await db.run(`
            CREATE TABLE IF NOT EXISTS order_items (
                id SERIAL PRIMARY KEY,
                order_id INTEGER NOT NULL,
                bag_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                selected_color VARCHAR(100),
                FOREIGN KEY (order_id) REFERENCES orders (id),
                FOREIGN KEY (bag_id) REFERENCES bags (id)
            )
        `);

        // Reviews table
        await db.run(`
            CREATE TABLE IF NOT EXISTS reviews (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                bag_id INTEGER NOT NULL,
                rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                review_text TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (bag_id) REFERENCES bags (id),
                UNIQUE(user_id, bag_id)
            )
        `);

        console.log('✅ PostgreSQL tables created');
    }

    /**
     * Migrate data from SQLite to PostgreSQL
     */
    async migrateData() {
        const tables = ['users', 'bags', 'orders', 'order_items', 'reviews'];
        
        for (const tableName of tables) {
            try {
                console.log(`📦 Migrating ${tableName}...`);
                
                // Get data from SQLite
                const data = await this.getSQLiteData(tableName);
                console.log(`   Found ${data.length} records in ${tableName}`);

                if (data.length === 0) {
                    console.log(`   ⚠️  No data to migrate for ${tableName}`);
                    continue;
                }

                // Clear existing data in PostgreSQL (optional - comment out if you want to preserve existing data)
                await db.run(`DELETE FROM ${tableName}`);
                
                // Reset sequence for SERIAL columns
                await db.run(`SELECT setval(pg_get_serial_sequence('${tableName}', 'id'), 1, false)`);

                // Insert data into PostgreSQL
                for (const row of data) {
                    const columns = Object.keys(row).filter(key => key !== 'id'); // Exclude id for SERIAL
                    const values = columns.map(col => row[col]);
                    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
                    
                    const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
                    await db.run(sql, values);
                }

                console.log(`   ✅ Migrated ${data.length} records to ${tableName}`);
            } catch (error) {
                console.error(`   ❌ Error migrating ${tableName}:`, error.message);
                throw error;
            }
        }
    }

    /**
     * Verify migration by comparing record counts
     */
    async verifyMigration() {
        console.log('🔍 Verifying migration...');
        
        const tables = ['users', 'bags', 'orders', 'order_items', 'reviews'];
        
        for (const tableName of tables) {
            // Get SQLite count
            const sqliteCount = await new Promise((resolve, reject) => {
                this.sqliteDb.get(`SELECT COUNT(*) as count FROM ${tableName}`, (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                });
            });

            // Get PostgreSQL count
            const pgResult = await db.get(`SELECT COUNT(*) as count FROM ${tableName}`);
            const pgCount = parseInt(pgResult.count);

            console.log(`   ${tableName}: SQLite=${sqliteCount}, PostgreSQL=${pgCount} ${sqliteCount === pgCount ? '✅' : '❌'}`);
            
            if (sqliteCount !== pgCount) {
                throw new Error(`Migration verification failed for ${tableName}: counts don't match`);
            }
        }

        console.log('✅ Migration verification successful');
    }

    /**
     * Run the complete migration process
     */
    async migrate() {
        try {
            console.log('🚀 Starting SQLite to PostgreSQL migration...\n');

            // Connect to both databases
            await this.connectSQLite();
            await db.connect();

            // Create PostgreSQL tables
            await this.createPostgreSQLTables();

            // Migrate data
            await this.migrateData();

            // Verify migration
            await this.verifyMigration();

            console.log('\n🎉 Migration completed successfully!');
            console.log('\n📋 Next steps:');
            console.log('   1. Test your application with PostgreSQL');
            console.log('   2. Update your .env file to use DATABASE_URL');
            console.log('   3. Remove SQLite dependencies when ready');

        } catch (error) {
            console.error('\n❌ Migration failed:', error.message);
            throw error;
        } finally {
            await this.closeSQLite();
            await db.close();
        }
    }
}

// Run migration if this script is executed directly
if (require.main === module) {
    const migrator = new SQLiteToPostgreSQLMigrator();
    migrator.migrate()
        .then(() => {
            console.log('\n✅ Migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Migration script failed:', error.message);
            process.exit(1);
        });
}

module.exports = SQLiteToPostgreSQLMigrator;
