const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const fs = require("node:fs/promises");
const { localsName } = require('ejs');
const { callbackify } = require('util');
app.set("view engine", "ejs");

app.get('/', (req, res) => {
  res.render("chat")
});

var users = {};
var usernames = [];

async function usernameExists(username) {
  return false;
}

async function correctPassword(username, password) {
  return false;
}

async function correctLogin(username, password) {
  if (await usernameExists(username) === true && await correctPassword(username, password) === true) {
    return true;
  } else {
    return false;
  }
}

async function createAccount(username, password, callback) {
  if (await correctLogin(username, password) === false) {
    await fs.appendFile('/workspaces/express-socketio-chat/savedData/usernames.txt', username);
    callback("OK");
  } else {
    callback("Already Exists");
  }
}

async function changeUsername(newUser, username, password) {
  if (correctLogin(username, password)) {
    
  }
}

io.on('connection', (socket) => {
    socket.on('usernameExists', usernameExists);

    socket.on('createAccount', createAccount);

    socket.on('changeUsername', changeUsername);

    socket.on('login', function(username){
        users[socket.id] = username;
        usernames.push(username);
        io.emit("user joined", username, new Date);
        io.emit('online', usernames);
    });

    socket.on('disconnect', function(){
        io.emit("user left", users[socket.id], new Date());
        usernames.splice(usernames.indexOf(users[socket.id]), usernames.indexOf(users[socket.id]) + 1);
        delete users[socket.id];
        io.emit('online', usernames);
    });

    socket.on('chat message', (user, msg) => {
        io.emit('chat message', user, msg, new Date());
    });
});

server.listen(3000, () => {
  console.log('Server started! Listening on port 3000.');
});