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

const replacements = {
  ["cute"]: "cute 🥵❤🍆🍑🔥",
  ["markus walker"]: "markus runner",
  ["my mom"]: "my mom 🥵",
  ["your mom"]: "mom mom 🥵",
  ["you're"]: "you'r're are",
  ["cat"]: "pussy",
  ["female dog"]: "bitch",
  ["truck"]: "2024 F-150® XL starting at $36,770",
  ["died"]: "had a skill issue",
  ["mountainside"]: "mountainside (mid)",
  ["as"]: "ass",
  ["loved"]: "loved ❤",
};

var users = {};
var usernames = [];
var avatars = {};
var pings = {};
var sockets = {};

var checking = false;

function checkOffline() {
  try {
    checking = true;
    for (var i = 0; i < pings.rows.length; i += 1) {
      console.log('checking');
      if (pings[i] < 1) {
        io.to('main').emit("user left", users[i], new Date());
        usernames.splice(usernames.indexOf(users[i]), usernames.indexOf(users[i]) + 1);
        delete users[i];
        delete avatars[i];
        delete pings[i];
        io.emit('online', usernames, avatars);
      } else {
        pings[i];
      }
    }
    setTimeout(checkOffline, 5000);
  } catch (err) {

  }
}
checkOffline();

function pong(id, username) {
  if (!usernames.indexOf(`${users[id]}`) > -1) {
    users[id];
  }
  pings[id] = 3;
}

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
    io.emit('usernameChanged', users[id], username, new Date());
    avatars[username] = avatars[users[id]];
    delete avatars[users[id]];
    usernames[usernames.indexOf(users[id])] = username;
    users[id] = username;
    io.emit('online', usernames, avatars);
  }
}

function sendDM(fromUser, toUser, message) {
  if (usernameTakenFunc(users[toUser])) {

    for (const key in replacements) {
      const regex = new RegExp("\\b" + key + "\\b", "gi");
      message = message.replaceAll(regex, replacements[key]);
    }

    io.to(toUser).emit('getDM', users[fromUser], message, avatars[users[fromUser]], new Date());
    io.to(fromUser).emit('getDM', users[fromUser], message, avatars[users[fromUser]], new Date());
  }
}

io.on('connection', async (socket) => {
    socket.join('main');

    socket.on('usernameTaken', usernameTaken);

    socket.on('sendDM', function(toUser, message) {
      sendDM(socket.id, sockets[toUser], message);
    });

    socket.on('changeUsername', function(username){
        changeUsername(username, socket.id);
    });

    socket.on('ping', function(username) {
      pong(socket.id, username);
    });

    socket.on('login', function(username){
        users[socket.id] = username;
        sockets[username] = socket.id;
        usernames.push(username);
        io.to('main').emit('user joined', username, new Date());
        io.emit('online', usernames, avatars);
    });

    socket.on('disconnect', function(){
        if (users[socket.id]) {
          io.to('main').emit("user left", users[socket.id], new Date());
          usernames.splice(usernames.indexOf(users[socket.id]), usernames.indexOf(users[socket.id]) + 1);
          delete sockets[users[socket.id]];
          delete users[socket.id];
          delete avatars[users[socket.id]];
          io.emit('online', usernames, avatars);
        }
    });

    socket.on('changeAvatar', function(base64){
        avatars[users[socket.id]] = base64;
        io.emit('online', usernames, avatars);
        io.emit('avatarChanged', base64, users[socket.id], new Date());
    });

    socket.on('chat message', (user, msg) => {
        if (!usernameTakenFunc(user)) {
          users[socket.id] = user;
          usernames.push(user);
          io.to('main').emit('user joined', user, new Date());
          io.emit('online', usernames, avatars);
          io.to(socket.id).emit('avatarRequest');
        }

        var avatar = avatars[user];

        for (const key in replacements) {
          const regex = new RegExp("\\b" + key + "\\b", "gi");
          msg = msg.replaceAll(regex, replacements[key]);
        }

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