// Constants
const PORT = process.env.PORT || 3000;

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true
  }
});

let users = {}; // Store users in memory temporarily

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set("view engine", "ejs");

// Login page
app.get('/login', (req, res) => {
  res.render("login", { error: null });
});
// Login request
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (users[username] && users[username].password === password) {
    res.render("chat", { username });
  } else {
    res.render("login", { error: "Invalid username or password" });
  }
});

// Signup page
app.get('/signup', (req, res) => {
  res.render("signup", { error: null });
});
// Signup request
app.post('/signup', (req, res) => {
  const { username, password } = req.body;
  if (users[username]) {
    res.render("signup", { error: "Username already taken" });
  } else {
    users[username] = { password, online: false };
    res.render("chat", { username });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).render("404");
});

server.listen(PORT, () => {
  console.log(`listening on *:${PORT}`);
});