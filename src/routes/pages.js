const express = require('express');
const router = express.Router();

// Root route
router.get('/', (req, res) => {
  if (req.session.userId) {
    console.log("User is authenticated, rendering chat page");
    return res.redirect('/chat');
  } else {
    console.log("User not authenticated, redirecting to login");
    res.redirect('/login');
  }
});

// Chat page
router.get('/chat', (req, res) => {
  if (req.session.userId) {
    console.log("Rendering chat page for user:", req.session.username);
    res.render("chat", { username: req.session.username });
  } else {
    console.log("User not authenticated, redirecting to login");
    res.redirect('/login');
  }
});

// Login page
router.get('/login', (req, res) => {
  if (req.session.userId) {
    console.log("User already authenticated, redirecting to chat");
    return res.redirect('/chat');
  }
  console.log("User not authenticated, rendering login page");
  res.render("login", { error: null });
});

// Signup page
router.get('/signup', (req, res) => {
  if (req.session.userId) {
    console.log("User already authenticated, redirecting to chat");
    return res.redirect('/chat');
  }
  console.log("User not authenticated, rendering signup page");
  res.render("signup", { error: null });
});

// Logout
router.get('/logout', (req, res) => {
  if (req.session) {
    // Destroy session
    req.session.destroy(err => {
      if (err) {
        console.error("Error destroying session:", err);
      } else {
        console.log("Session destroyed, redirecting to login");
        res.redirect('/login');
      }
    });
  } else {
    res.redirect('/login');
  }
});

// 404 handler
router.use((req, res) => {
  console.log("404 Not Found:", req.originalUrl);
  res.status(404).render("404");
});

module.exports = router;