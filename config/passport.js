const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcryptjs');
const db = require('./database'); // PostgreSQL pool
require('dotenv').config();

// =======================
// Local Strategy
// =======================
passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, async (email, password, done) => {
    try {
        // Get user by email
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
            return done(null, false, { message: 'Invalid email or password' });
        }

        // Convert password from Buffer -> string (just in case)
        const dbPassword = user.password.toString();

        const isMatch = await bcrypt.compare(password, dbPassword);
        if (!isMatch) {
            return done(null, false, { message: 'Invalid email or password' });
        }

        return done(null, user);
    } catch (error) {
        console.error("❌ Error in LocalStrategy:", error);
        return done(error);
    }
}));

// =======================
// Google OAuth Strategy
// =======================
console.log('🔍 Google OAuth Configuration:');
console.log('Client ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET');
console.log('Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET');

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:8080/auth/google/callback"
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            // Check if user already exists by google_id
            let result = await db.query('SELECT * FROM users WHERE google_id = $1', [profile.id]);
            let user = result.rows[0];

            if (user) {
                return done(null, user);
            }

            // Check if user exists with same email
            result = await db.query('SELECT * FROM users WHERE email = $1', [profile.emails[0].value]);
            user = result.rows[0];

            if (user) {
                // Link Google account
                await db.query('UPDATE users SET google_id = $1 WHERE id = $2', [profile.id, user.id]);
                user.google_id = profile.id;
                return done(null, user);
            }

            // Create new user
            result = await db.query(
                `INSERT INTO users (first_name, last_name, email, google_id)
                 VALUES ($1, $2, $3, $4)
                 RETURNING *`,
                [
                    profile.name.givenName || '',
                    profile.name.familyName || '',
                    profile.emails[0].value,
                    profile.id
                ]
            );

            user = result.rows[0];
            return done(null, user);
        } catch (error) {
            console.error("❌ Error in GoogleStrategy:", error);
            return done(error);
        }
    }));
    console.log('✅ Google OAuth Strategy configured successfully!');
} else {
    console.log('❌ Google OAuth not configured - missing credentials');
}

// =======================
// Serialize & Deserialize
// =======================
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
        const user = result.rows[0];
        done(null, user);
    } catch (error) {
        done(error);
    }
});

module.exports = passport;
