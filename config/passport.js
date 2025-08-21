// config/passport.js
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");
const db = require("./database"); // استدعاء صح

module.exports = function(passport) {
    passport.use(
        new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
            try {
                // نجيب اليوزر من قاعدة البيانات
                const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);

                if (result.rows.length === 0) {
                    return done(null, false, { message: "This email is not registered" });
                }

                const user = result.rows[0];

                // نقارن الباسورد
                const isMatch = await bcrypt.compare(password, user.password);

                if (!isMatch) {
                    return done(null, false, { message: "Password incorrect" });
                }

                return done(null, user);
            } catch (err) {
                console.error("❌ Error in LocalStrategy:", err);
                return done(err);
            }
        })
    );

    // تخزين اليوزر في السيشن
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    // استرجاع اليوزر من السيشن
    passport.deserializeUser(async (id, done) => {
        try {
            const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
            done(null, result.rows[0]);
        } catch (err) {
            done(err, null);
        }
    });
};
