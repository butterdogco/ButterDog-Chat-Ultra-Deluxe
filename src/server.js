require('dotenv').config();
const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const pageRoutes = require('./routes/pages');
const apiRoutes = require('./routes/api');

const app = express();
const serverInstance = http.createServer(app);
const io = new Server(serverInstance);

// Middleware
app.use(bodyParser.json());
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'SUPERsecurePassword123654',
  resave: false, // Do not save session if unmodified
  saveUninitialized: false, // Do not save uninitialized sessions
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions',
  }),
  cookie: { secure: false } // true if using HTTPS
});
app.use(sessionMiddleware);
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Routes
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/', pageRoutes);

// DB Connection
mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log('Connected to MongoDB');
  serverInstance.listen(process.env.PORT || 3000, () => {
    console.log(`Server running on port ${process.env.PORT || 3000}`);
  });
}).catch(err => {
  console.error('Database connection error:', err);
});

// Socket handler
// Share session with Socket.IO
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});
require('./sockets/chat')(io);