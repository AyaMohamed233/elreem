const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcryptjs');
const db = require('./database');

module.exports = function (passport) {
    // Local Strategy
    passport.use(
        new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
            try {
                const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
                const user = result.rows[0];

                if (!user) return done(null, false, { message: 'No user found' });

                const isMatch = await bcrypt.compare(password, user.password);
                if (!isMatch) return done(null, false, { message: 'Password incorrect' });

                return done(null, user);
            } catch (err) {
                return done(err);
            }
        })
    );

    // Google OAuth
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: "/auth/google/callback"
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    let result = await db.query("SELECT * FROM users WHERE google_id = $1", [profile.id]);
                    let user = result.rows[0];

                    if (!user) {
                        result = await db.query(
                            "INSERT INTO users (google_id, name, email) VALUES ($1, $2, $3) RETURNING *",
                            [profile.id, profile.displayName, profile.emails[0].value]
                        );
                        user = result.rows[0];
                    }

                    return done(null, user);
                } catch (err) {
                    return done(err);
                }
            }
        )
    );

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
            done(null, result.rows[0]);
        } catch (err) {
            done(err, null);
        }
    });
};
