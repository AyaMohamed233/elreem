const express = require('express');
const db = require('../config/database');
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');
const router = express.Router();

// Home page
router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        const bags = await db.all('SELECT * FROM bags WHERE quantity > 0 ORDER BY created_at DESC');
        
        // Parse JSON fields
        bags.forEach(bag => {
            try {
                bag.colors = JSON.parse(bag.colors || '[]');
                bag.image_urls = JSON.parse(bag.image_urls || '[]');
            } catch (e) {
                bag.colors = [];
                bag.image_urls = [];
            }
        });

        res.render('home', {
            title: 'Elreem Bag Store',
            bags: bags
        });
    } catch (error) {
        console.error('Home page error:', error);
        res.render('error', {
            title: 'Error',
            message: 'Unable to load products',
            error: {}
        });
    }
});

// Product detail page
router.get('/product/:id', ensureAuthenticated, async (req, res) => {
    try {
        const bag = await db.get('SELECT * FROM bags WHERE id = $1', [req.params.id]);
        
        if (!bag) {
            return res.status(404).render('error', {
                title: 'Product Not Found',
                message: 'The product you are looking for does not exist.',
                error: {}
            });
        }

        // Parse JSON fields
        try {
            bag.colors = JSON.parse(bag.colors || '[]');
            bag.image_urls = JSON.parse(bag.image_urls || '[]');
        } catch (e) {
            bag.colors = [];
            bag.image_urls = [];
        }

        res.render('product', {
            title: bag.name_en,
            bag: bag
        });
    } catch (error) {
        console.error('Product page error:', error);
        res.render('error', {
            title: 'Error',
            message: 'Unable to load product',
            error: {}
        });
    }
});

// Cart page
router.get('/cart', ensureAuthenticated, async (req, res) => {
    try {
        // Get user's current orders (In Progress status)
        const orders = await db.all(`
            SELECT o.*
            FROM orders o
            WHERE o.user_id = $1 AND o.status = 'In Progress'
            ORDER BY o.created_at DESC
        `, [req.user.id]);

        // Get order items separately to avoid JSON parsing issues
        for (let order of orders) {
            const items = await db.all(`
                SELECT oi.*, b.name_en as bag_name_en, b.name_ar as bag_name_ar, b.image_urls as bag_image
                FROM order_items oi
                JOIN bags b ON oi.bag_id = b.id
                WHERE oi.order_id = $1
            `, [order.id]);

            // Parse image URLs for each item
            items.forEach(item => {
                try {
                    item.bag_image = JSON.parse(item.bag_image || '[]');
                } catch (e) {
                    item.bag_image = [];
                }
            });

            order.items = items;
        }



        res.render('cart', {
            title: 'Shopping Cart',
            orders: orders
        });
    } catch (error) {
        console.error('Cart page error:', error);
        res.render('error', {
            title: 'Error',
            message: 'Unable to load cart',
            error: {}
        });
    }
});

// Order history page
router.get('/orders', ensureAuthenticated, async (req, res) => {
    try {
        // Get orders first
        const orders = await db.all(`
            SELECT * FROM orders
            WHERE user_id = $1
            ORDER BY created_at DESC
        `, [req.user.id]);

        // Get order items for each order
        for (let order of orders) {
            const items = await db.all(`
                SELECT oi.*, b.name_en as bag_name_en, b.name_ar as bag_name_ar
                FROM order_items oi
                JOIN bags b ON oi.bag_id = b.id
                WHERE oi.order_id = $2
            `, [order.id]);

            order.items = items;
        }

        res.render('orders', {
            title: 'Order History',
            orders: orders
        });
    } catch (error) {
        console.error('Orders page error:', error);
        res.render('error', {
            title: 'Error',
            message: 'Unable to load orders',
            error: {}
        });
    }
});

// Reviews page
router.get('/reviews', ensureAuthenticated, async (req, res) => {
    try {
        // Get user's reviews
        const userReviews = await db.all(`
            SELECT r.*, b.name_en, b.name_ar, b.image_urls
            FROM reviews r
            JOIN bags b ON r.bag_id = b.id
            WHERE r.user_id = $1
            ORDER BY r.created_at DESC
        `, [req.user.id]);

        // Parse image URLs
        userReviews.forEach(review => {
            try {
                review.image_urls = JSON.parse(review.image_urls || '[]');
            } catch (e) {
                review.image_urls = [];
            }
        });

        // Get bags that user has ordered but not reviewed yet
        const availableBags = await db.all(`
            SELECT DISTINCT b.id, b.name_en, b.name_ar, b.image_urls
            FROM bags b
            JOIN order_items oi ON b.id = oi.bag_id
            JOIN orders o ON oi.order_id = o.id
            WHERE o.user_id = $1 AND o.status IN ('Delivered', 'Confirmed')
            AND b.id NOT IN (
                SELECT bag_id FROM reviews WHERE user_id = $2
            )
            ORDER BY b.name_en
        `, [req.user.id, req.user.id]);

        // Parse image URLs for available bags
        availableBags.forEach(bag => {
            try {
                bag.image_urls = JSON.parse(bag.image_urls || '[]');
            } catch (e) {
                bag.image_urls = [];
            }
        });

        res.render('reviews', {
            title: 'Reviews',
            userReviews: userReviews,
            availableBags: availableBags,
            isAuthenticated: true,
            isAdmin: req.user && req.user.role === 'admin',
            user: req.user
        });
    } catch (error) {
        console.error('Reviews page error:', error);
        res.render('error', {
            title: 'Error',
            message: 'Unable to load reviews',
            error: {}
        });
    }
});

// Admin routes
router.get('/admin', ensureAdmin, (req, res) => {
    res.render('admin/dashboard', {
        title: 'Admin Dashboard'
    });
});

router.get('/admin/repository', ensureAdmin, async (req, res) => {
    try {
        const bags = await db.all('SELECT * FROM bags ORDER BY created_at DESC');
        
        bags.forEach(bag => {
            try {
                bag.colors = JSON.parse(bag.colors || '[]');
                bag.image_urls = JSON.parse(bag.image_urls || '[]');
            } catch (e) {
                bag.colors = [];
                bag.image_urls = [];
            }
        });

        res.render('admin/repository', {
            title: 'Inventory Management',
            bags: bags
        });
    } catch (error) {
        console.error('Repository page error:', error);
        res.render('error', {
            title: 'Error',
            message: 'Unable to load inventory',
            error: {}
        });
    }
});

router.get('/admin/reports', ensureAdmin, async (req, res) => {
    try {
        const orders = await db.all(`
            SELECT o.*, u.first_name, u.last_name, u.email,
                   GROUP_CONCAT(
                       json_object(
                           'bag_name_en', b.name_en,
                           'quantity', oi.quantity,
                           'price', oi.price,
                           'selected_color', oi.selected_color
                       )
                   ) as items
            FROM orders o
            JOIN users u ON o.user_id = u.id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN bags b ON oi.bag_id = b.id
            GROUP BY o.id
            ORDER BY o.created_at DESC
        `);

        // Parse order items and calculate stats
        let totalOrders = orders.length;
        let totalRevenue = 0;
        
        orders.forEach(order => {
            totalRevenue += parseFloat(order.total_amount);
            try {
                if (order.items) {
                    order.items = order.items.split(',').map(item => JSON.parse(item));
                } else {
                    order.items = [];
                }
            } catch (e) {
                order.items = [];
            }
        });

        res.render('admin/reports', {
            title: 'Order Reports',
            orders: orders,
            stats: {
                totalOrders,
                totalRevenue: totalRevenue.toFixed(2)
            }
        });
    } catch (error) {
        console.error('Reports page error:', error);
        res.render('error', {
            title: 'Error',
            message: 'Unable to load reports',
            error: {}
        });
    }
});

// Admin reviews page
router.get('/admin/reviews', ensureAdmin, async (req, res) => {
    try {
        const reviews = await db.all(`
            SELECT r.*, u.first_name, u.last_name, u.email, b.name_en, b.name_ar
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            JOIN bags b ON r.bag_id = b.id
            ORDER BY r.created_at DESC
        `);

        res.render('admin/reviews', {
            title: 'Reviews Management',
            reviews: reviews,
            isAuthenticated: true,
            isAdmin: true,
            user: req.user
        });
    } catch (error) {
        console.error('Admin reviews page error:', error);
        res.render('error', {
            title: 'Error',
            message: 'Unable to load reviews',
            error: {}
        });
    }
});

module.exports = router;
