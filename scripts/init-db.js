const db = require('../config/database');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function initializeDatabase() {
    try {
        await db.connect();
        
        // Create Users table
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

        // Create Bags table
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

        // Create Orders table
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

        // Create Order Items table
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

        // Create Reviews table
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

        // Create admin user
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@elreem.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        const existingAdmin = await db.get('SELECT id FROM users WHERE email = $1', [adminEmail]);
        if (!existingAdmin) {
            await db.run(`
                INSERT INTO users (first_name, last_name, email, password, is_admin)
                VALUES ($1, $2, $3, $4, $5)
            `, ['Admin', 'User', adminEmail, hashedPassword, true]);
            console.log('Admin user created successfully');
        }

        // Insert sample bags
        const sampleBags = [
            {
                name_en: 'Classic Leather Handbag',
                name_ar: 'حقيبة يد جلدية كلاسيكية',
                description_en: 'Elegant leather handbag perfect for everyday use',
                description_ar: 'حقيبة يد جلدية أنيقة مثالية للاستخدام اليومي',
                price: 150.00,
                colors: JSON.stringify(['Black', 'Brown', 'Navy']),
                quantity: 25,
                image_urls: JSON.stringify(['/images/bags/classic-leather-1.jpg', '/images/bags/classic-leather-2.jpg'])
            },
            {
                name_en: 'Modern Tote Bag',
                name_ar: 'حقيبة حمل عصرية',
                description_en: 'Spacious tote bag ideal for work and travel',
                description_ar: 'حقيبة حمل واسعة مثالية للعمل والسفر',
                price: 89.99,
                colors: JSON.stringify(['Beige', 'Black', 'Red']),
                quantity: 30,
                image_urls: JSON.stringify(['/images/bags/modern-tote-1.jpg', '/images/bags/modern-tote-2.jpg'])
            }
        ];

        for (const bag of sampleBags) {
            const existing = await db.get('SELECT id FROM bags WHERE name_en = $1', [bag.name_en]);
            if (!existing) {
                await db.run(`
                    INSERT INTO bags (name_en, name_ar, description_en, description_ar, price, colors, quantity, image_urls)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `, [bag.name_en, bag.name_ar, bag.description_en, bag.description_ar, bag.price, bag.colors, bag.quantity, bag.image_urls]);
            }
        }

        console.log('Database initialized successfully');
        console.log(`Admin login: ${adminEmail} / ${adminPassword}`);
        
    } catch (error) {
        console.error('Error initializing database:', error);
    } finally {
        await db.close();
    }
}

if (require.main === module) {
    initializeDatabase();
}

module.exports = initializeDatabase;
