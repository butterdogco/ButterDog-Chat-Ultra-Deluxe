const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const XMLHttpRequest = require('xhr2');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { connectionStateRecovery: {} });

const PORT = 8080;
app.set("view engine", "ejs");
app.use(express.static('views'));
app.get('/', (req, res) => res.render("chat"));

const replacements = {
  "cute": "cute 🥵❤🍆🍑🔥",
  "markus walker": "markus runner",
  "my mom": "my mom 🥵",
  "your mom": "mom mom 🥵",
  "you're": "you'r're are",
  "cat": "pussy",
  "female dog": "bitch",
  "truck": "2024 F-150® XL starting at $36,770",
  "died": "had a skill issue",
  "mountainside": "mountainside (better)"
};

const users = {};
const usernames = [];
const avatars = {};
const pings = {};
const sockets = {};
let checking = false;

function checkOffline() {
  try {
    checking = true;
    Object.entries(pings).forEach(([id, ping]) => {
      if (ping < 1) {
        const username = users[id];
        io.to('main').emit("user left", username, new Date());
        usernames.splice(usernames.indexOf(username), 1);
        delete users[id];
        delete avatars[id];
        delete pings[id];
        io.emit('online', usernames, avatars);
      } else {
        pings[id] -= 1;
      }
    });
    setTimeout(checkOffline, 5000);
  } catch (err) {
    console.warn(err);
  }
}
checkOffline();

function pong(id) {
  pings[id] = 3;
}

function isUsernameTaken(username) {
  return usernames.includes(username);
}

async function changeUsername(username, id) {
  if (!isUsernameTaken(username)) {
    const oldUsername = users[id];
    io.emit('usernameChanged', oldUsername, username, new Date());
    avatars[username] = avatars[oldUsername];
    delete avatars[oldUsername];
    usernames[usernames.indexOf(oldUsername)] = username;
    users[id] = username;
    io.emit('online', usernames, avatars);
  }
}

function sendDM(info) {
  console.log("Got a DM.");
  console.log(users);
  if (isUsernameTaken(users[info.To])) {
    console.log("Username exists");
    if (info.Content) {
      console.log("Is message content")
      for (const [key, value] of Object.entries(replacements)) {
        const regex = new RegExp(`\\b${key}\\b`, "gi");
        info.Content.replaceAll(regex, value);
      }
    }

    const fromUsername = users[info.From];
    const avatar = avatars[fromUsername];
    console.log(sockets);
    io.to(toUser).emit('getDM', fromUsername, info.Content, avatar, new Date());
    io.to(fromUser).emit('getDM', fromUsername, info.Content, avatar, new Date());
  }
}

function reportMessage(messageInfo, reportingUser) {
  const request = new XMLHttpRequest();
  request.open("POST", "https://discord.com/api/webhooks/..."); // Truncated webhook URL
  request.setRequestHeader('Content-type', 'application/json');

  const content = Object.entries(messageInfo)
    .map(([key, value]) => `**${key}**: ${value}`)
    .join('\n');

  const params = {
    username: `${reportingUser}'s Report - BDog Chat UDX`,
    avatar_url: "https://cdn.discordapp.com/attachments/.../Ge9a9JAWQAA75MI.jpg",
    content: `## ${reportingUser} has reported a message in ButterDog Chat.\n${content}`
  };

  request.send(JSON.stringify(params));
}

io.on('connection', (socket) => {
  socket.join('main');

  socket.on('usernameTaken', (username, callback) => {
    callback(isUsernameTaken(username));
  });

  socket.on('sendDM', (toUser, message) => {
    sendDM(socket.id, sockets[toUser], message);
  });

  socket.on('changeUsername', (username) => {
    changeUsername(username, socket.id);
  });

  socket.on('ping', () => {
    pong(socket.id);
  });

  socket.on('login', (username) => {
    users[socket.id] = username;
    sockets[username] = socket.id;
    usernames.push(username);
    io.to('main').emit('user joined', username, new Date());
    io.emit('online', usernames, avatars);
  });

  socket.on('disconnect', () => {
    const username = users[socket.id];
    if (username) {
      io.to('main').emit("user left", username, new Date());
      usernames.splice(usernames.indexOf(username), 1);
      delete sockets[username];
      delete users[socket.id];
      delete avatars[username];
      io.emit('online', usernames, avatars);
    }
  });

  socket.on('changeAvatar', (base64) => {
    avatars[users[socket.id]] = base64;
    io.emit('online', usernames, avatars);
    io.emit('avatarChanged', base64, users[socket.id], new Date());
  });

  socket.on('chat message', (info) => {
    console.log(info);
    if (!isUsernameTaken(info.User)) {
      users[socket.id] = info.User;
      usernames.push(info.User);
      io.to('main').emit('user joined', info.User, new Date());
      io.emit('online', usernames, avatars);
      io.to(socket.id).emit('avatarRequest');
    }

    if (info.Content) {
      for (const [key, value] of Object.entries(replacements)) {
        const regex = new RegExp(`\\b${key}\\b`, "gi");
        info.Content = info.Content.replaceAll(regex, value);
      }
    }
    
    const avatar = avatars[info.User];
    const messageInfo = {
      User: info.User,
      Content: info.Content,
      Avatar: avatar,
      Channel: info.Channel || "main",
      Date: new Date()
    };

    io.to('main').emit('chat message', messageInfo);
  });

  socket.on('sendDM', (info) => {
    console.log(info);
    sendDM(info);
  });

  socket.on('report message', (user, messageInfo) => {
    try {
      const parsed = JSON.parse(messageInfo);
      reportMessage(parsed, user);
    } catch (err) {
      console.warn(err);
    }
  });

  socket.on('chat image', (user, img) => {
    const avatar = avatars[user];
    io.to('main').emit('chat image', user, img, avatar, new Date());
  });
});

server.listen(PORT, () => console.log(`Server started! Listening on port ${PORT}.`));