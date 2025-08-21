/**
 * PostgreSQL Connection Test Script
 * 
 * This script tests the PostgreSQL database connection and verifies
 * that all configuration is working correctly.
 */

const db = require('../config/database');
require('dotenv').config();

async function testPostgreSQLConnection() {
    console.log('🔍 Testing PostgreSQL Connection...\n');
    
    try {
        // Test basic connection
        console.log('1. Testing database connection...');
        await db.connect();
        console.log('✅ Database connection successful');

        // Test health check
        console.log('\n2. Running health check...');
        const isHealthy = await db.healthCheck();
        console.log(`✅ Health check: ${isHealthy ? 'PASSED' : 'FAILED'}`);

        // Test basic query
        console.log('\n3. Testing basic query...');
        const result = await db.get('SELECT NOW() as current_time, version() as pg_version');
        console.log('✅ Query successful');
        console.log(`   Current time: ${result.current_time}`);
        console.log(`   PostgreSQL version: ${result.pg_version.split(' ')[0]} ${result.pg_version.split(' ')[1]}`);

        // Test connection pool stats
        console.log('\n4. Connection pool statistics...');
        const poolStats = db.getPoolStats();
        if (poolStats) {
            console.log('✅ Pool stats retrieved');
            console.log(`   Total connections: ${poolStats.totalCount}`);
            console.log(`   Idle connections: ${poolStats.idleCount}`);
            console.log(`   Waiting connections: ${poolStats.waitingCount}`);
        } else {
            console.log('⚠️  Pool stats not available');
        }

        // Test table creation (temporary)
        console.log('\n5. Testing table operations...');
        await db.run(`
            CREATE TABLE IF NOT EXISTS connection_test (
                id SERIAL PRIMARY KEY,
                test_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Test table created');

        // Test insert
        const insertResult = await db.run(
            'INSERT INTO connection_test (test_message) VALUES ($1) RETURNING id',
            ['Connection test successful']
        );
        console.log('✅ Insert operation successful');

        // Test select
        const selectResult = await db.get(
            'SELECT * FROM connection_test WHERE id = $1',
            [insertResult.id]
        );
        console.log('✅ Select operation successful');
        console.log(`   Retrieved message: "${selectResult.test_message}"`);

        // Clean up test table
        await db.run('DROP TABLE IF EXISTS connection_test');
        console.log('✅ Test table cleaned up');

        console.log('\n🎉 All PostgreSQL connection tests PASSED!');
        console.log('\n📋 Connection Summary:');
        console.log(`   Database: ${process.env.DATABASE_URL ? 'Using DATABASE_URL' : 'Using individual parameters'}`);
        console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`   SSL: ${process.env.NODE_ENV === 'production' ? 'Enabled' : 'Disabled'}`);

    } catch (error) {
        console.error('\n❌ PostgreSQL connection test FAILED:');
        console.error(`   Error: ${error.message}`);
        console.error(`   Code: ${error.code || 'N/A'}`);
        
        if (error.code === 'ECONNREFUSED') {
            console.error('\n💡 Troubleshooting tips:');
            console.error('   - Make sure PostgreSQL is running');
            console.error('   - Check your DATABASE_URL or connection parameters');
            console.error('   - Verify the database exists');
            console.error('   - Check firewall settings');
        }
        
        process.exit(1);
    } finally {
        // Close database connection
        await db.close();
        console.log('\n✅ Database connection closed');
    }
}

// Run the test if this script is executed directly
if (require.main === module) {
    testPostgreSQLConnection()
        .then(() => {
            console.log('\n✅ Test completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Test failed:', error.message);
            process.exit(1);
        });
}

module.exports = testPostgreSQLConnection;
