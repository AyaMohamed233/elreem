const express = require('express');
const bcrypt = require('bcryptjs');
const passport = require('../config/passport');
const db = require('../config/database');
const { ensureGuest } = require('../middleware/auth');
const router = express.Router();

// Login page
router.get('/login', ensureGuest, (req, res) => {
    res.render('login', { 
        title: 'Login',
        error: req.flash('error'),
        success: req.flash('success')
    });
});

// Signup page
router.get('/signup', ensureGuest, (req, res) => {
    res.render('signup', { 
        title: 'Sign Up',
        error: req.flash('error')
    });
});

// Login POST
router.post('/login', ensureGuest, (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            req.flash('error', info.message);
            return res.redirect('/login');
        }
        req.logIn(user, (err) => {
            if (err) {
                return next(err);
            }
            return res.redirect('/');
        });
    })(req, res, next);
});

// Signup POST
router.post('/signup', ensureGuest, async (req, res) => {
    try {
        const { firstName, lastName, email, phone, password, confirmPassword } = req.body;

        // Validation
        if (!firstName || !lastName || !email || !password) {
            req.flash('error', 'All fields are required');
            return res.redirect('/signup');
        }

        if (password !== confirmPassword) {
            req.flash('error', 'Passwords do not match');
            return res.redirect('/signup');
        }

        if (password.length < 6) {
            req.flash('error', 'Password must be at least 6 characters long');
            return res.redirect('/signup');
        }

        // Validate English-only characters for password
        const englishOnlyRegex = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~\s]*$/;
        if (!englishOnlyRegex.test(password)) {
            req.flash('error', 'Password must contain only English characters');
            return res.redirect('/signup');
        }

        // Check if user already exists
        const existingUser = await db.get('SELECT id FROM users WHERE email = $1 ', [email]);
        if (existingUser) {
            req.flash('error', 'Email already registered');
            return res.redirect('/signup');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        await db.run(`
            INSERT INTO users (first_name, last_name, email, phone, password)
            VALUES ($1, $2, $3, $4, $5)
        `, [firstName, lastName, email, phone, hashedPassword]);

        req.flash('success', 'Account created successfully. Please login.');
        res.redirect('/login');

    } catch (error) {
        console.error('Signup error:', error);
        req.flash('error', 'An error occurred during signup');
        res.redirect('/signup');
    }
});

// Google OAuth routes
router.get('/auth/google', (req, res, next) => {
    // Check if Google OAuth is configured
    if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === 'your-actual-google-client-id-here') {
        req.flash('error', 'Google OAuth is not configured. Please contact administrator.');
        return res.redirect('/login');
    }
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get('/auth/google/callback',
    passport.authenticate('google', {
        failureRedirect: '/login',
        failureFlash: 'Google authentication failed. Please try again.'
    }),
    (req, res) => {
        req.flash('success', 'Successfully logged in with Google!');
        res.redirect('/');
    }
);

// Logout
router.post('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect('/login');
    });
});

module.exports = router;
