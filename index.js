const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
  connectionStateRecovery: {}
});
const fs = require("node:fs/promises");
const { localsName } = require('ejs');
const { callbackify } = require('util');
app.set("view engine", "ejs");

app.get('/', (req, res) => {
  res.render("chat")
});

var users = {};
var usernames = [];
var avatars = {};

function usernameTakenFunc(username) {
  if (usernames.indexOf(`${username}`) > -1) {
    return true;
  } else {
    return false;
  }
}

async function usernameTaken(username, callback) {
  if (usernames.indexOf(`${username}`) > -1) {
    callback(true);
  } else {
    callback(false);
  }
}

async function changeUsername(username, id) {
  if (usernameTakenFunc(username) === false) {
    io.emit('usernameChanged', users[id], username);
    avatars[username] = avatars[users[id]];
    delete avatars[users[id]];
    usernames[usernames.indexOf(users[id])] = username;
    users[id] = username;
    io.emit('online', usernames, avatars);
  }
}

io.on('connection', async (socket) => {
    socket.join('main');

    socket.on('usernameTaken', usernameTaken);

    socket.on('changeUsername', function(username){
        changeUsername(username, socket.id);
    });

    socket.on('login', function(username){
        users[socket.id] = username;
        usernames.push(username);
        io.to('main').emit('user joined', username, new Date());
        io.emit('online', usernames, avatars);
    });

    socket.on('disconnect', function(){
        io.to('main').emit("user left", users[socket.id], new Date());
        usernames.splice(usernames.indexOf(users[socket.id]), usernames.indexOf(users[socket.id]) + 1);
        delete users[socket.id];
        delete avatars[users[socket.id]];
        io.emit('online', usernames, avatars);
    });

    socket.on('changeAvatar', function(base64){
        avatars[users[socket.id]] = base64;
        io.emit('online', usernames, avatars);
        io.emit('avatarChanged', base64, users[socket.id]);
    });

    socket.on('chat message', (user, msg) => {
        var avatar = avatars[user];
        io.to('main').emit('chat message', user, msg, avatar, new Date());
    });

    socket.on('chat image', (user, img) => {
      var avatar = avatars[user];
      io.to('main').emit('chat image', user, img, avatar, new Date());
  });
});

server.listen(3000, () => {
  console.log('Server started! Listening on port 3000.');
});