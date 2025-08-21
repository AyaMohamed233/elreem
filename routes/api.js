const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const { ensureAuthenticatedAPI, ensureAdmin } = require('../middleware/auth');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../public/uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Add item to cart
router.post('/cart/add', ensureAuthenticatedAPI, async (req, res) => {
    try {
        const { bagId, quantity, selectedColor } = req.body;
        
        // Validate input
        if (!bagId || !quantity || quantity < 1) {
            return res.status(400).json({ error: 'Invalid bag ID or quantity' });
        }

        // Get bag details
        const bag = await db.get('SELECT * FROM bags WHERE id = $1 AND quantity >= $2', [bagId, quantity]);
        if (!bag) {
            return res.status(400).json({ error: 'Bag not available or insufficient quantity' });
        }

        // Check if user has an existing "In Progress" order
        let order = await db.get('SELECT * FROM orders WHERE user_id = $1 AND status = $2', [req.user.id, 'In Progress']);
        
        if (!order) {
            // Create new order
            const result = await db.run(`
                INSERT INTO orders (user_id, total_amount, shipping_fee, customer_name, customer_phone, customer_address, customer_email)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [req.user.id, 0, 0, '', '', '', '']);
            
            order = await db.get('SELECT * FROM orders WHERE id = $1', [result.id]);
        }

        // Check if item already exists in cart
        const existingItem = await db.get('SELECT * FROM order_items WHERE order_id = $1 AND bag_id = $2 AND selected_color = $3',
            [order.id, bagId, selectedColor]);

        if (existingItem) {
            // Update quantity
            await db.run('UPDATE order_items SET quantity = quantity + $1 WHERE id = $2', [quantity, existingItem.id]);
        } else {
            // Add new item
            await db.run(`
                INSERT INTO order_items (order_id, bag_id, quantity, price, selected_color)
                VALUES ($1, $2, $3, $4, $5)
            `, [order.id, bagId, quantity, bag.price, selectedColor]);
        }

        // Update order total (items + shipping fee)
        const orderTotal = await db.get(`
            SELECT SUM(oi.quantity * oi.price) as total
            FROM order_items oi
            WHERE oi.order_id = $1
        `, [order.id]);

        const itemsTotal = orderTotal.total || 0;
        const shippingFee = 40.00; // 40 LE shipping fee
        const finalTotal = itemsTotal + shippingFee;

        await db.run('UPDATE orders SET total_amount = $1, shipping_fee = $2 WHERE id = $3', [finalTotal, shippingFee, order.id]);

        res.json({ success: true, message: 'Item added to cart' });
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({ error: 'Failed to add item to cart' });
    }
});

// Update cart item quantity
router.put('/cart/update/:itemId', ensureAuthenticatedAPI, async (req, res) => {
    try {
        const { quantity } = req.body;
        const itemId = req.params.itemId;

        if (!quantity || quantity < 1) {
            return res.status(400).json({ error: 'Invalid quantity' });
        }

        // Verify item belongs to user
        const item = await db.get(`
            SELECT oi.*, o.user_id
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE oi.id = $1 AND o.user_id = $2 AND o.status = 'In Progress'
        `, [itemId, req.user.id]);

        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        // Update quantity
        await db.run('UPDATE order_items SET quantity = $1 WHERE id = $2', [quantity, itemId]);

        // Update order total (items + shipping fee)
        const orderTotal = await db.get(`
            SELECT SUM(oi.quantity * oi.price) as total
            FROM order_items oi
            WHERE oi.order_id = $1
        `, [item.order_id]);

        const itemsTotal = orderTotal.total || 0;
        const shippingFee = 40.00; // 40 LE shipping fee
        const finalTotal = itemsTotal + shippingFee;

        await db.run('UPDATE orders SET total_amount = $1, shipping_fee = $2 WHERE id = $3', [finalTotal, shippingFee, item.order_id]);

        res.json({ success: true, message: 'Cart updated' });
    } catch (error) {
        console.error('Update cart error:', error);
        res.status(500).json({ error: 'Failed to update cart' });
    }
});

// Remove item from cart
router.delete('/cart/remove/:itemId', ensureAuthenticatedAPI, async (req, res) => {
    try {
        const itemId = req.params.itemId;

        // Verify item belongs to user
        const item = await db.get(`
            SELECT oi.*, o.user_id
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE oi.id = $1 AND o.user_id = $2 AND o.status = 'In Progress'
        `, [itemId, req.user.id]);

        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        // Remove item
        await db.run('DELETE FROM order_items WHERE id = $1', [itemId]);

        // Update order total (items + shipping fee)
        const orderTotal = await db.get(`
            SELECT SUM(oi.quantity * oi.price) as total
            FROM order_items oi
            WHERE oi.order_id = $1
        `, [item.order_id]);

        const itemsTotal = orderTotal.total || 0;
        const shippingFee = itemsTotal > 0 ? 40.00 : 0; // Only add shipping if there are items
        const finalTotal = itemsTotal + shippingFee;

        await db.run('UPDATE orders SET total_amount = $1, shipping_fee = $2 WHERE id = $3', [finalTotal, shippingFee, item.order_id]);

        res.json({ success: true, message: 'Item removed from cart' });
    } catch (error) {
        console.error('Remove from cart error:', error);
        res.status(500).json({ error: 'Failed to remove item from cart' });
    }
});

// Checkout
router.post('/checkout', ensureAuthenticatedAPI, async (req, res) => {
    try {
        const { customerName, customerPhone, customerAddress, customerEmail } = req.body;

        // Validate input
        if (!customerName || !customerPhone || !customerAddress || !customerEmail) {
            return res.status(400).json({ error: 'All customer details are required' });
        }

        // Get user's current order
        const order = await db.get('SELECT * FROM orders WHERE user_id = ? AND status = ?', [req.user.id, 'In Progress']);
        
        if (!order) {
            return res.status(400).json({ error: 'No items in cart' });
        }

        // Get order items
        const items = await db.all('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
        
        if (items.length === 0) {
            return res.status(400).json({ error: 'No items in cart' });
        }

        // Update order with customer details and status
        await db.run(`
            UPDATE orders
            SET customer_name = $1, customer_phone = $2, customer_address = $3, customer_email = $4, status = 'Confirmed'
            WHERE id = $5
        `, [customerName, customerPhone, customerAddress, customerEmail, order.id]);

        // Update bag quantities
        for (const item of items) {
            await db.run('UPDATE bags SET quantity = quantity - $1 WHERE id = $2', [item.quantity, item.bag_id]);
        }

        res.json({ 
            success: true, 
            message: 'Order placed successfully',
            orderId: order.id
        });
    } catch (error) {
        console.error('Checkout error:', error);
        res.status(500).json({ error: 'Failed to process checkout' });
    }
});

// Cancel order
router.post('/order/cancel/:orderId', ensureAuthenticatedAPI, async (req, res) => {
    try {
        const orderId = req.params.orderId;

        // Verify order belongs to user and can be cancelled (only Confirmed orders can be cancelled)
        const order = await db.get('SELECT * FROM orders WHERE id = ? AND user_id = ? AND status = ?',
            [orderId, req.user.id, 'Confirmed']);

        if (!order) {
            return res.status(404).json({ error: 'Order not found or cannot be cancelled' });
        }

        // Restore bag quantities since order was confirmed
        const items = await db.all('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
        for (const item of items) {
            await db.run('UPDATE bags SET quantity = quantity + ? WHERE id = ?', [item.quantity, item.bag_id]);
        }

        // Update order status
        await db.run('UPDATE orders SET status = ? WHERE id = ?', ['Canceled', orderId]);

        res.json({ success: true, message: 'Order cancelled successfully' });
    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(500).json({ error: 'Failed to cancel order' });
    }
});

// Admin routes
// Add new bag
router.post('/admin/bags', ensureAdmin, upload.array('images', 5), async (req, res) => {
    try {
        const { nameEn, nameAr, descriptionEn, descriptionAr, price, colors, quantity } = req.body;

        // Validate input
        if (!nameEn || !nameAr || !price || !colors || !quantity) {
            return res.status(400).json({ error: 'All required fields must be provided' });
        }

        // Process uploaded images
        const imageUrls = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

        // Parse colors
        let parsedColors;
        try {
            parsedColors = typeof colors === 'string' ? JSON.parse(colors) : colors;
        } catch (e) {
            parsedColors = Array.isArray(colors) ? colors : [colors];
        }

        // Insert bag
        await db.run(`
            INSERT INTO bags (name_en, name_ar, description_en, description_ar, price, colors, quantity, image_urls)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [nameEn, nameAr, descriptionEn, descriptionAr, parseFloat(price), JSON.stringify(parsedColors), parseInt(quantity), JSON.stringify(imageUrls)]);

        res.json({ success: true, message: 'Bag added successfully' });
    } catch (error) {
        console.error('Add bag error:', error);
        res.status(500).json({ error: 'Failed to add bag' });
    }
});

// Update bag
router.put('/admin/bags/:id', ensureAdmin, upload.array('images', 5), async (req, res) => {
    try {
        const bagId = req.params.id;
        const { nameEn, nameAr, descriptionEn, descriptionAr, price, colors, quantity, existingImages } = req.body;

        // Get existing bag
        const existingBag = await db.get('SELECT * FROM bags WHERE id = ?', [bagId]);
        if (!existingBag) {
            return res.status(404).json({ error: 'Bag not found' });
        }

        // Process images
        let imageUrls = [];

        // Keep existing images if specified
        if (existingImages) {
            try {
                imageUrls = typeof existingImages === 'string' ? JSON.parse(existingImages) : existingImages;
            } catch (e) {
                imageUrls = [];
            }
        }

        // Add new uploaded images
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => `/uploads/${file.filename}`);
            imageUrls = imageUrls.concat(newImages);
        }

        // Parse colors
        let parsedColors;
        try {
            parsedColors = typeof colors === 'string' ? JSON.parse(colors) : colors;
        } catch (e) {
            parsedColors = Array.isArray(colors) ? colors : [colors];
        }

        // Update bag
        await db.run(`
            UPDATE bags
            SET name_en = $1, name_ar = $2, description_en = $3, description_ar = $4,
                price = $5, colors = $6, quantity = $7, image_urls = $8, updated_at = CURRENT_TIMESTAMP
            WHERE id = $9
        `, [nameEn, nameAr, descriptionEn, descriptionAr, parseFloat(price), JSON.stringify(parsedColors), parseInt(quantity), JSON.stringify(imageUrls), bagId]);

        res.json({ success: true, message: 'Bag updated successfully' });
    } catch (error) {
        console.error('Update bag error:', error);
        res.status(500).json({ error: 'Failed to update bag' });
    }
});

// Delete bag
router.delete('/admin/bags/:id', ensureAdmin, async (req, res) => {
    try {
        const bagId = req.params.id;

        // Check if bag exists
        const bag = await db.get('SELECT * FROM bags WHERE id = ?', [bagId]);
        if (!bag) {
            return res.status(404).json({ error: 'Bag not found' });
        }

        // Check if bag is in any orders
        const orderItems = await db.get('SELECT COUNT(*) as count FROM order_items WHERE bag_id = ?', [bagId]);
        if (orderItems.count > 0) {
            return res.status(400).json({ error: 'Cannot delete bag that has been ordered' });
        }

        // Delete bag
        await db.run('DELETE FROM bags WHERE id = ?', [bagId]);

        res.json({ success: true, message: 'Bag deleted successfully' });
    } catch (error) {
        console.error('Delete bag error:', error);
        res.status(500).json({ error: 'Failed to delete bag' });
    }
});

// Update order status (admin)
router.put('/admin/orders/:id/status', ensureAdmin, async (req, res) => {
    try {
        const orderId = req.params.id;
        const { status } = req.body;

        const validStatuses = ['Confirmed', 'In Progress', 'Delivered', 'Canceled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Get existing order
        const order = await db.get('SELECT * FROM orders WHERE id = ?', [orderId]);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Validate status transitions
        const currentStatus = order.status;
        const validTransitions = {
            'Confirmed': ['In Progress', 'Delivered', 'Canceled'],
            'In Progress': ['Delivered', 'Canceled'],
            'Delivered': [], // Final status
            'Canceled': []  // Final status
        };

        if (!validTransitions[currentStatus] || !validTransitions[currentStatus].includes(status)) {
            return res.status(400).json({
                error: `Cannot change status from ${currentStatus} to ${status}`
            });
        }

        // Update order status
        await db.run('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, orderId]);

        res.json({ success: true, message: 'Order status updated successfully' });
    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

// Get cart count
router.get('/cart/count', ensureAuthenticatedAPI, async (req, res) => {
    try {
        const result = await db.get(`
            SELECT COUNT(oi.id) as count
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE o.user_id = $1 AND o.status = 'In Progress'
        `, [req.user.id]);

        res.json({ count: result.count || 0 });
    } catch (error) {
        console.error('Get cart count error:', error);
        res.status(500).json({ error: 'Failed to get cart count' });
    }
});

// Get bag details
router.get('/bags/:id', ensureAuthenticatedAPI, async (req, res) => {
    try {
        const bag = await db.get('SELECT * FROM bags WHERE id = ?', [req.params.id]);

        if (!bag) {
            return res.status(404).json({ error: 'Bag not found' });
        }

        // Parse JSON fields
        try {
            bag.colors = JSON.parse(bag.colors || '[]');
            bag.image_urls = JSON.parse(bag.image_urls || '[]');
        } catch (e) {
            bag.colors = [];
            bag.image_urls = [];
        }

        res.json(bag);
    } catch (error) {
        console.error('Get bag details error:', error);
        res.status(500).json({ error: 'Failed to get bag details' });
    }
});

// Get admin statistics
router.get('/admin/stats', ensureAdmin, async (req, res) => {
    try {
        const totalProducts = await db.get('SELECT COUNT(*) as count FROM bags');
        const totalOrders = await db.get('SELECT COUNT(*) as count FROM orders');
        const totalRevenue = await db.get('SELECT SUM(total_amount) as total FROM orders WHERE status != $1', ['Canceled']);
        const pendingOrders = await db.get('SELECT COUNT(*) as count FROM orders WHERE status IN ($1, $2)', ['In Progress', 'Confirmed']);

        res.json({
            success: true,
            data: {
                totalProducts: totalProducts.count || 0,
                totalOrders: totalOrders.count || 0,
                totalRevenue: totalRevenue.total || 0,
                pendingOrders: pendingOrders.count || 0
            }
        });
    } catch (error) {
        console.error('Get admin stats error:', error);
        res.status(500).json({ error: 'Failed to get statistics' });
    }
});

// Get recent activity
router.get('/admin/recent-activity', ensureAdmin, async (req, res) => {
    try {
        const recentOrders = await db.all(`
            SELECT 'New Order' as type,
                   'Order #' || id || ' placed by ' || customer_name as description,
                   created_at
            FROM orders
            ORDER BY created_at DESC
            LIMIT 10
        `);

        res.json({
            success: true,
            data: recentOrders
        });
    } catch (error) {
        console.error('Get recent activity error:', error);
        res.status(500).json({ error: 'Failed to get recent activity' });
    }
});

// Create database backup
router.post('/admin/backup', ensureAdmin, async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');

        const backupDir = path.join(__dirname, '../database/backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFilename = `elreem-backup-${timestamp}.db`;
        const backupPath = path.join(backupDir, backupFilename);
        const sourcePath = path.join(__dirname, '../database/elreem.db');

        // Copy database file
        fs.copyFileSync(sourcePath, backupPath);

        res.json({
            success: true,
            message: 'Database backup created successfully',
            filename: backupFilename,
            downloadUrl: `/api/admin/download-backup/${backupFilename}`
        });
    } catch (error) {
        console.error('Create backup error:', error);
        res.status(500).json({ error: 'Failed to create backup' });
    }
});

// Reviews API endpoints

// Add a review
router.post('/reviews', ensureAuthenticatedAPI, async (req, res) => {
    try {
        const { bagId, rating, reviewText } = req.body;

        // Validate input
        if (!bagId || !rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Valid bag ID and rating (1-5) are required' });
        }

        // Check if bag exists
        const bag = await db.get('SELECT id FROM bags WHERE id = ?', [bagId]);
        if (!bag) {
            return res.status(404).json({ error: 'Bag not found' });
        }

        // Check if user already reviewed this bag
        const existingReview = await db.get('SELECT id FROM reviews WHERE user_id = ? AND bag_id = ?', [req.user.id, bagId]);
        if (existingReview) {
            // Update existing review
            await db.run(`
                UPDATE reviews
                SET rating = $1, review_text = $2, updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
            `, [rating, reviewText || '', existingReview.id]);
        } else {
            // Create new review
            await db.run(`
                INSERT INTO reviews (user_id, bag_id, rating, review_text)
                VALUES ($1, $2, $3, $4)
            `, [req.user.id, bagId, rating, reviewText || '']);
        }

        res.json({ success: true, message: 'Review saved successfully' });
    } catch (error) {
        console.error('Add review error:', error);
        res.status(500).json({ error: 'Failed to save review' });
    }
});

// Get reviews for a specific bag
router.get('/reviews/bag/:bagId', async (req, res) => {
    try {
        const bagId = req.params.bagId;

        const reviews = await db.all(`
            SELECT r.*, u.first_name, u.last_name
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.bag_id = $1
            ORDER BY r.created_at DESC
        `, [bagId]);

        res.json({ success: true, data: reviews });
    } catch (error) {
        console.error('Get bag reviews error:', error);
        res.status(500).json({ error: 'Failed to get reviews' });
    }
});

// Get user's reviews
router.get('/reviews/user', ensureAuthenticatedAPI, async (req, res) => {
    try {
        const reviews = await db.all(`
            SELECT r.*, b.name_en, b.name_ar, b.image_urls
            FROM reviews r
            JOIN bags b ON r.bag_id = b.id
            WHERE r.user_id = $1
            ORDER BY r.created_at DESC
        `, [req.user.id]);

        // Parse image URLs
        reviews.forEach(review => {
            try {
                review.image_urls = JSON.parse(review.image_urls || '[]');
            } catch (e) {
                review.image_urls = [];
            }
        });

        res.json({ success: true, data: reviews });
    } catch (error) {
        console.error('Get user reviews error:', error);
        res.status(500).json({ error: 'Failed to get user reviews' });
    }
});

// Admin: Get all reviews
router.get('/admin/reviews', ensureAdmin, async (req, res) => {
    try {
        const reviews = await db.all(`
            SELECT r.*, u.first_name, u.last_name, u.email, b.name_en, b.name_ar
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            JOIN bags b ON r.bag_id = b.id
            ORDER BY r.created_at DESC
        `);

        res.json({ success: true, data: reviews });
    } catch (error) {
        console.error('Get all reviews error:', error);
        res.status(500).json({ error: 'Failed to get reviews' });
    }
});

// Admin: Delete a review
router.delete('/admin/reviews/:id', ensureAdmin, async (req, res) => {
    try {
        const reviewId = req.params.id;

        const result = await db.run('DELETE FROM reviews WHERE id = $1', [reviewId]);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Review not found' });
        }

        res.json({ success: true, message: 'Review deleted successfully' });
    } catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json({ error: 'Failed to delete review' });
    }
});

module.exports = router;
