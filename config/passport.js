const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcryptjs');
const db = require('./database');
require('dotenv').config();

// Local Strategy
passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, async (email, password, done) => {
    try {
        const user = await db.get('SELECT * FROM users WHERE email = $1', [email]);
        
        if (!user) {
            return done(null, false, { message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return done(null, false, { message: 'Invalid email or password' });
        }

        return done(null, user);
    } catch (error) {
        return done(error);
    }
}));

// Google Strategy
console.log('🔍 Google OAuth Configuration:');
console.log('Client ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET');
console.log('Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET');

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    console.log('✅ Configuring Google OAuth Strategy...');
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "http://localhost:8080/auth/google/callback"
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            // Check if user already exists
            let user = await db.get('SELECT * FROM users WHERE google_id = $1', [profile.id]);
            
            if (user) {
                return done(null, user);
            }

            // Check if user exists with same email
            user = await db.get('SELECT * FROM users WHERE email = $1', [profile.emails[0].value]);
            
            if (user) {
                // Link Google account to existing user
                await db.run('UPDATE users SET google_id = $1 WHERE id = $2', [profile.id, user.id]);
                user.google_id = profile.id;
                return done(null, user);
            }

            // Create new user
            const result = await db.run(`
                INSERT INTO users (first_name, last_name, email, google_id)
                VALUES ($1, $2, $3, $4)
            `, [
                profile.name.givenName,
                profile.name.familyName,
                profile.emails[0].value,
                profile.id
            ]);

            user = await db.get('SELECT * FROM users WHERE id = $1', [result.id]);
            return done(null, user);
        } catch (error) {
            return done(error);
        }
    }));
    console.log('✅ Google OAuth Strategy configured successfully!');
} else {
    console.log('❌ Google OAuth not configured - missing credentials');
}

// Serialize user
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user
passport.deserializeUser(async (id, done) => {
    try {
        const user = await db.get('SELECT * FROM users WHERE id = $1', [id]);
        done(null, user);
    } catch (error) {
        done(error);
    }
});

module.exports = passport;
