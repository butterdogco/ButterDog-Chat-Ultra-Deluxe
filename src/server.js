require('dotenv').config();

const PORT = process.env.PORT || 3000;

const express = require('express');
const session = require('express-session')
const MongoStore = require('connect-mongo').default;
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');

// Routes
const authRoutes = require('./routes/auth');
const pageRoutes = require('./routes/pages');
const apiRoutes = require('./routes/api');

// Socket handlers
const setupChatSocket = require('./sockets/chat');

const app = express();
const serverInstance = http.createServer(app);
const io = socketIO(serverInstance);

async function startServer() {
    // DB Connection
    await mongoose.connect(process.env.MONGO_URI_LOCAL, {
        serverSelectionTimeoutMS: 5000
    });
    
    // Middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(express.static(path.join(__dirname, '../public')));
    
    // View engine
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '../views'));
    
    const sessionMiddleware = session({
        secret: process.env.SESSION_SECRET,
        resave: false, // Do not save session if unmodified
        saveUninitialized: false, // Do not save uninitialized sessions
        store: MongoStore.create({
            client: mongoose.connection.getClient(),
            collectionName: 'session'
        }),
        cookie: { secure: false } // set to true with https
    });
    app.use(sessionMiddleware);
    
    // Share session with socket.io
    io.use((socket, next) => {
        sessionMiddleware(socket.request, {}, next);
    });
    
    // Routes
    app.use('/auth', authRoutes);
    app.use('/api', apiRoutes);
    app.use('/', pageRoutes);
    
    setupChatSocket(io);
    
    serverInstance.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
})