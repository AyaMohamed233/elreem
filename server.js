const express = require('express');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
const db = require('./config/database');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'keyboardcat',
        resave: false,
        saveUninitialized: false
    })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// Passport config
require('./config/passport')(passport);

// Routes
app.use('/auth', require('./routes/auth'));

// Health Check
app.get('/health', async (req, res) => {
    const dbOk = await db.healthCheck();
    res.json({
        status: dbOk ? "UP" : "DOWN",
        db: dbOk,
        pool: db.getPoolStats()
    });
});

// Start server
const PORT = process.env.PORT || 8080;

db.connect().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`🌐 Visit: http://localhost:${PORT}`);
        console.log(`❤️  Health check: http://localhost:${PORT}/health`);
    });
});
