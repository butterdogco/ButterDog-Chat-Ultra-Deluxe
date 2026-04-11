const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const constants = require('../constants');

const router = express.Router();

// POST /auth/signup -> 
router.post('/signup', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validation
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Validate password length
        if (password.length < constants.PASSWORD_MIN_LENGTH || password.length > constants.PASSWORD_MAX_LENGTH) {
            return res.status(400).json({ error: `Password must be between ${constants.PASSWORD_MIN_LENGTH} and ${constants.PASSWORD_MAX_LENGTH} characters` });
        }

        // Validate username characters
        if (!constants.USERNAME_ALLOWED_CHARACTERS.test(username)) {
            return res.status(400).json({ error: 'Username can only contain letters, numbers, underscores, and hyphens' });
        }

        // Validate username length
        if (username.length < constants.USERNAME_MIN_LENGTH || username.length > constants.USERNAME_MAX_LENGTH) {
            return res.status(400).json({ error: `Username must be between ${constants.USERNAME_MIN_LENGTH} and ${constants.USERNAME_MAX_LENGTH} characters` });
        }

        // Check if user exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const colorHue = Math.floor(Math.random() * 360);
        const user = new User({ username, passwordHash, colorHue });
        await user.save();

        // Create session
        req.session.userId = user._id;
        req.session.username = user.username;
        req.session.colorHue = user.colorHue;

        res.status(201).json({
            message: 'User created',
            user: {
                id: user._id,
                username: user.username,
                colorHue: user.colorHue
            }
        });
    } catch(err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
});

// POST /auth/login -> 
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validation
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Validate password length
        if (password.length < constants.PASSWORD_MIN_LENGTH || password.length > constants.PASSWORD_MAX_LENGTH) {
            return res.status(400).json({ error: `Password must be between ${constants.PASSWORD_MIN_LENGTH} and ${constants.PASSWORD_MAX_LENGTH} characters` });
        }

        // Validate username characters
        if (!constants.USERNAME_ALLOWED_CHARACTERS.test(username)) {
            return res.status(400).json({ error: 'Username can only contain letters, numbers, underscores, and hyphens' });
        }

        // Validate username length
        if (username.length < constants.USERNAME_MIN_LENGTH || username.length > constants.USERNAME_MAX_LENGTH) {
            return res.status(400).json({ error: `Username must be between ${constants.USERNAME_MIN_LENGTH} and ${constants.USERNAME_MAX_LENGTH} characters` });
        }

        // Find user
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Create session
        req.session.userId = user._id;
        req.session.username = user.username;
        req.session.colorHue = user.colorHue;

        res.json({
            message: 'Login successful',
            user: {
                id: user._id,
                username: user.username,
                colorHue: user.colorHue
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
});

// POST /auth/logout -> Logs a user out of their active session
router.post('/logout', async (req, res) => {
    try {
        if (req.session.userId) {
            // Update user status
            await User.findByIdAndUpdate(req.session.userId, {
                online: false,
                lastSeen: new Date()
            });
        }

        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ error: 'Logout failed. Please try again later.'});
            }
        });
        res.json({ message: 'Logged out successfully' });
    } catch (err) {
        console.error('Logout error', err);
        return res.status(500).json({ error: 'Server error. Please try again later.' });
    }
});

module.exports = router;