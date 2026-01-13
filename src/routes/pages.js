const express = require('express');
const router = express.Router();

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
}

const redirectIfAuth = (req, res, next) => {
    if (req.session.userId) {
        return res.redirect('/chat');
    }
    next();
}

// GET / -> Shows login when unauthenticated, otherwise chat
router.get('/', (req, res) => {
    if (req.session.userId) {
        res.redirect('/chat');
    } else {
        res.redirect('/login');
    }
});

// GET /login
router.get('/login', redirectIfAuth, (req, res) => {
    res.render('login');
});

// GET /signup
router.get('/signup', redirectIfAuth, (req, res) => {
    res.render('signup');
});

// GET /chat
router.get('/chat', requireAuth, (req, res) => {
    res.render('chat', {
        user: {
            id: req.session.userId,
            username: req.session.username
        }
    });
});

// 404 handler
router.use((req, res) => {
    res.status(404).render('404');
});

module.exports = router;