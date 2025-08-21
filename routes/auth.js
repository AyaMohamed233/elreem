const express = require("express");
const router = express.Router();
const passport = require("passport");

// ✅ Google Login Route
router.get("/google", passport.authenticate("google", {
  scope: ["profile", "email"]
}));

// ✅ Google Callback
router.get("/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    res.redirect("/"); // بعد تسجيل الدخول يرجع للهوم
  }
);

// ✅ Logout
router.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/");
  });
});

module.exports = router;
