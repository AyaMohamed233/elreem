const express = require("express");
const session = require("express-session");
const passport = require("passport");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Connect Passport Config
require("./passport");

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || "supersecret",
  resave: false,
  saveUninitialized: false
}));

// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/auth", require("./routes/auth"));

app.get("/", (req, res) => {
  res.send("🚀 Server is running and Google OAuth is working!");
});

// Start Server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
