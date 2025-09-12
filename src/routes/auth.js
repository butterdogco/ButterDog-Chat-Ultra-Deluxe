const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/User');

// Sign up
router.post('/signup', async (req, res) => {
  // Request validation
  if (!req.body) {
    return res.status(400).render("signup", { error: "Invalid request" });
  }
  if (!req.body.username || !req.body.password) {
    return res.status(400).render("signup", { error: "Username and password are required" });
  }
  if (req.body.username.length > 24) {
    return res.status(400).render("signup", { error: "Username must be 24 characters or less" });
  }
  if (req.body.password.length < 6) {
    return res.status(400).render("signup", { error: "Password must be at least 6 characters" });
  }

  const { username, password } = req.body;

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const uuid = crypto.randomUUID();
    const newUser = new User({ username, password: hashedPassword, createdAt: new Date(), uuid: uuid });
    await newUser.save();
    
    req.session.uuid = uuid; // Store unique user UUID in session
    req.session.userId = newUser._id; // Store user ID in session
    req.session.username = newUser.username; // Store username in session
    res.redirect('/chat');
  } catch (err) {
    console.error("Error during signup:", err);
    if (err.code === 11000) { // Duplicate username error
      return res.status(400).render("signup", { error: "Username already taken" });
    }
    res.status(400).render("signup", { error: "Username already taken" });
  }
});

// Log in
router.post('/login', async (req, res) => {
  // Request validation
  if (!req.body) {
    return res.status(400).render("login", { error: "Invalid request" });
  }
  if (!req.body.username || !req.body.password) {
    return res.status(400).render("login", { error: "Username and password are required" });
  }
  const { username, password } = req.body;
  
  try {
    const user = await User.findOne({ username });

    if (!user) {
      console.log("User not found:", username);
      return res.status(400).render("login", { error: "Invalid username or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("Invalid password for user:", username);
      return res.status(400).render("login", { error: "Invalid username or password" });
    } else {
      req.session.uuid = user.uuid; // Store unique user UUID in session
      req.session.userId = user._id; // Store user ID in session
      req.session.username = user.username; // Store username in session
      console.log(req.session.userId != null ? "Session userId set" : "Session userId not set");
      console.log("User logged in successfully:", username);
      res.redirect('/chat');
    }
  } catch (err) {
    console.error("Error during login:", err);
    res.status(500).render("login", { error: "Server error" });
  }
});

module.exports = router;