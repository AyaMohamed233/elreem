/**
 * PostgreSQL Setup Verification Script
 * 
 * This script verifies that the PostgreSQL conversion is complete
 * and the application is ready for deployment.
 */

const fs = require('fs');
const path = require('path');

class PostgreSQLSetupVerifier {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.success = [];
    }

    /**
     * Check if required files exist
     */
    checkRequiredFiles() {
        console.log('📁 Checking required files...');
        
        const requiredFiles = [
            'config/database.js',
            'config/postgresql.js',
            'scripts/init-db.js',
            'scripts/migrate-to-postgresql.js',
            'scripts/test-postgresql-connection.js',
            'package.json',
            '.env.example',
            'server.js'
        ];

        for (const file of requiredFiles) {
            const filePath = path.join(__dirname, '..', file);
            if (fs.existsSync(filePath)) {
                this.success.push(`✅ ${file} exists`);
            } else {
                this.errors.push(`❌ Missing required file: ${file}`);
            }
        }
    }

    /**
     * Check package.json for correct dependencies
     */
    checkDependencies() {
        console.log('📦 Checking dependencies...');
        
        try {
            const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
            
            // Check for PostgreSQL dependency
            if (packageJson.dependencies && packageJson.dependencies.pg) {
                this.success.push('✅ PostgreSQL dependency (pg) found');
            } else {
                this.errors.push('❌ Missing PostgreSQL dependency (pg)');
            }

            // Check that SQLite is removed
            if (packageJson.dependencies && packageJson.dependencies.sqlite3) {
                this.warnings.push('⚠️  SQLite3 dependency still present - should be removed');
            } else {
                this.success.push('✅ SQLite3 dependency removed');
            }

            // Check scripts
            const requiredScripts = ['start', 'test-db', 'migrate', 'init-db'];
            for (const script of requiredScripts) {
                if (packageJson.scripts && packageJson.scripts[script]) {
                    this.success.push(`✅ Script '${script}' configured`);
                } else {
                    this.errors.push(`❌ Missing script: ${script}`);
                }
            }

        } catch (error) {
            this.errors.push(`❌ Error reading package.json: ${error.message}`);
        }
    }

    /**
     * Check environment configuration
     */
    checkEnvironmentConfig() {
        console.log('🔧 Checking environment configuration...');
        
        // Check .env.example
        try {
            const envExample = fs.readFileSync(path.join(__dirname, '..', '.env.example'), 'utf8');
            
            if (envExample.includes('DATABASE_URL')) {
                this.success.push('✅ .env.example contains DATABASE_URL');
            } else {
                this.errors.push('❌ .env.example missing DATABASE_URL');
            }

            if (envExample.includes('DB_HOST') && envExample.includes('DB_PORT')) {
                this.success.push('✅ .env.example contains individual DB parameters');
            } else {
                this.warnings.push('⚠️  .env.example missing individual DB parameters');
            }

            // Check that SQLite references are removed
            if (envExample.includes('DB_PATH') || envExample.includes('sqlite')) {
                this.warnings.push('⚠️  .env.example still contains SQLite references');
            } else {
                this.success.push('✅ SQLite references removed from .env.example');
            }

        } catch (error) {
            this.errors.push(`❌ Error reading .env.example: ${error.message}`);
        }
    }

    /**
     * Check database configuration files
     */
    checkDatabaseConfig() {
        console.log('🗄️  Checking database configuration...');
        
        try {
            // Check main database.js
            const databaseJs = fs.readFileSync(path.join(__dirname, '..', 'config', 'database.js'), 'utf8');
            
            if (databaseJs.includes('postgresql')) {
                this.success.push('✅ database.js configured for PostgreSQL');
            } else {
                this.errors.push('❌ database.js not configured for PostgreSQL');
            }

            if (databaseJs.includes('sqlite')) {
                this.warnings.push('⚠️  database.js still contains SQLite references');
            }

            // Check postgresql.js
            const postgresqlJs = fs.readFileSync(path.join(__dirname, '..', 'config', 'postgresql.js'), 'utf8');
            
            if (postgresqlJs.includes('Pool') && postgresqlJs.includes('pg')) {
                this.success.push('✅ postgresql.js properly configured with connection pooling');
            } else {
                this.errors.push('❌ postgresql.js not properly configured');
            }

        } catch (error) {
            this.errors.push(`❌ Error checking database configuration: ${error.message}`);
        }
    }

    /**
     * Check for SQLite remnants
     */
    checkSQLiteRemnants() {
        console.log('🔍 Checking for SQLite remnants...');
        
        // Check for SQLite database files
        const sqliteFiles = [
            'database/elreem.db',
            'database/elreem.sqlite',
            'elreem.db'
        ];

        for (const file of sqliteFiles) {
            const filePath = path.join(__dirname, '..', file);
            if (fs.existsSync(filePath)) {
                this.warnings.push(`⚠️  SQLite database file still exists: ${file}`);
            }
        }

        // Check .gitignore
        try {
            const gitignore = fs.readFileSync(path.join(__dirname, '..', '.gitignore'), 'utf8');
            
            if (gitignore.includes('*.db') || gitignore.includes('*.sqlite')) {
                this.success.push('✅ .gitignore updated for PostgreSQL');
            } else {
                this.warnings.push('⚠️  .gitignore should include SQLite file patterns');
            }

        } catch (error) {
            this.warnings.push('⚠️  Could not check .gitignore file');
        }
    }

    /**
     * Check server configuration
     */
    checkServerConfig() {
        console.log('🖥️  Checking server configuration...');
        
        try {
            const serverJs = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
            
            if (serverJs.includes('/health')) {
                this.success.push('✅ Health check endpoint configured');
            } else {
                this.errors.push('❌ Health check endpoint missing');
            }

            if (serverJs.includes('SIGTERM') && serverJs.includes('SIGINT')) {
                this.success.push('✅ Graceful shutdown configured');
            } else {
                this.warnings.push('⚠️  Graceful shutdown not configured');
            }

        } catch (error) {
            this.errors.push(`❌ Error checking server configuration: ${error.message}`);
        }
    }

    /**
     * Run all verification checks
     */
    async verify() {
        console.log('🚀 Verifying PostgreSQL Setup for Elreem Bag Store...\n');

        this.checkRequiredFiles();
        this.checkDependencies();
        this.checkEnvironmentConfig();
        this.checkDatabaseConfig();
        this.checkSQLiteRemnants();
        this.checkServerConfig();

        // Print results
        console.log('\n📊 Verification Results:\n');

        if (this.success.length > 0) {
            console.log('✅ SUCCESS:');
            this.success.forEach(msg => console.log(`   ${msg}`));
            console.log('');
        }

        if (this.warnings.length > 0) {
            console.log('⚠️  WARNINGS:');
            this.warnings.forEach(msg => console.log(`   ${msg}`));
            console.log('');
        }

        if (this.errors.length > 0) {
            console.log('❌ ERRORS:');
            this.errors.forEach(msg => console.log(`   ${msg}`));
            console.log('');
        }

        // Summary
        console.log('📋 SUMMARY:');
        console.log(`   ✅ Success: ${this.success.length}`);
        console.log(`   ⚠️  Warnings: ${this.warnings.length}`);
        console.log(`   ❌ Errors: ${this.errors.length}`);

        if (this.errors.length === 0) {
            console.log('\n🎉 PostgreSQL setup verification PASSED!');
            console.log('   Your application is ready for deployment.');
            console.log('\n📋 Next steps:');
            console.log('   1. Set up a PostgreSQL database');
            console.log('   2. Configure DATABASE_URL in your environment');
            console.log('   3. Run: npm run test-db');
            console.log('   4. Run: npm run init-db');
            console.log('   5. Deploy to your chosen platform');
            return true;
        } else {
            console.log('\n❌ PostgreSQL setup verification FAILED!');
            console.log('   Please fix the errors above before deploying.');
            return false;
        }
    }
}

// Run verification if this script is executed directly
if (require.main === module) {
    const verifier = new PostgreSQLSetupVerifier();
    verifier.verify()
        .then((success) => {
            process.exit(success ? 0 : 1);
        })
        .catch((error) => {
            console.error('❌ Verification failed:', error.message);
            process.exit(1);
        });
}

module.exports = PostgreSQLSetupVerifier;
