const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const XMLHttpRequest = require("xhr2");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { connectionStateRecovery: {} });

const PORT = 8080;
app.set("view engine", "ejs");
app.use(express.static("views"));
app.get("/", (req, res) => res.render("chat"));

const userUploadsDirectory = "userUploads";
const replacements = {
  cute: "cute 🥵❤🍆🍑🔥",
  "markus walker": "markus runner",
  "my mom": "my mom 🥵",
  "your mom": "mom mom 🥵",
  "you're": "you'r're are",
  cat: "pussy",
  "female dog": "bitch",
  truck: "2024 F-150® XL starting at $36,770",
  died: "had a skill issue",
  mountainside: "mountainside (better)",
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
        io.to("main").emit("user left", username, new Date());
        usernames.splice(usernames.indexOf(username), 1);
        delete users[id];
        delete avatars[id];
        delete pings[id];
        io.emit("online", usernames, avatars);
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
    io.emit("usernameChanged", oldUsername, username, new Date());
    avatars[username] = avatars[oldUsername];
    delete avatars[oldUsername];
    usernames[usernames.indexOf(oldUsername)] = username;
    users[id] = username;
    io.emit("online", usernames, avatars);
  }
}

function sendDM(info) {
  console.log("Got a DM.");
  console.log(users);
  if (isUsernameTaken(users[info.To])) {
    console.log("Username exists");
    if (info.Content) {
      console.log("Is message content");
      for (const [key, value] of Object.entries(replacements)) {
        const regex = new RegExp(`\\b${key}\\b`, "gi");
        info.Content.replaceAll(regex, value);
      }
    }

    const fromUsername = users[info.From];
    const avatar = avatars[fromUsername];
    console.log(sockets);
    io.to(toUser).emit("getDM", fromUsername, info.Content, avatar, new Date());
    io.to(fromUser).emit(
      "getDM",
      fromUsername,
      info.Content,
      avatar,
      new Date(),
    );
  }
}

function reportMessage(messageInfo, reportingUser) {
  const request = new XMLHttpRequest();
  request.open("POST", "https://discord.com/api/webhooks/..."); // Truncated webhook URL
  request.setRequestHeader("Content-type", "application/json");

  const content = Object.entries(messageInfo)
    .map(([key, value]) => `**${key}**: ${value}`)
    .join("\n");

  const params = {
    username: `${reportingUser}'s Report - BDog Chat UDX`,
    avatar_url:
      "https://cdn.discordapp.com/attachments/.../Ge9a9JAWQAA75MI.jpg",
    content: `## ${reportingUser} has reported a message in ButterDog Chat.\n${content}`,
  };

  request.send(JSON.stringify(params));
}

async function uploadFileToFolder(file, folder) {
  try {
    // Upload the file to the server
    // Check if the file is above 10MB
    
    const filename = `${Date.now()}.${file.mimetype.split('/')[1]}`;
    const filepath = `${userUploadsDirectory}/${folder}/${filename}`;
    return new Promise((resolve, reject) => {
      fs.writeFileSync(filepath, file.buffer, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(filepath);
        }
      });
    });
  } catch (err) {
    console.warn(`Error during login: ${err}`);
    return `${userUploadsDirectory}/attachments/default.png`;
  }
}

async function uploadAvatar(imageFile) {
  try {
    // Upload the image file to the server
    // Check if the file is above 10MB
    console.log(typeof(imageFile));
    if (imageFile.byteLength > 10 * 1024 * 1024) {
      return null;
    }
    const filename = `${Date.now()}.${imageFile.mimetype.split('/')[1]}`;
    const filepath = `${userUploadsDirectory}/avatars/${filename}`;
    return new Promise((resolve, reject) => {
      fs.writeFileSync(filepath, imageFile.buffer, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(filepath);
        }
      });
    });
  } catch (err) {
    console.warn(`Error during login: ${err}`);
    return `${userUploadsDirectory}/avatars/default.png`;
  }
}

async function login(info, callback, socket) {
  let username = info.Username || "";
  let avatar = info.Avatar || null;
  let silent = info.Silent || true;
  // Remove spaces, and set the username to a default value if it's empty
  if ((typeof(username) == "string" && (!username || username.trim() === "")) || typeof(username) != "string") {
    username = `User${Math.floor(Math.random() * 90000) + 10000}`;
  } else {
    // Trim spaces from the username
    username = username.trim();
  }

  if (isUsernameTaken(username)) {
    callback({
      Success: false,
      Error: "Username is taken!",
    });
    return;
  }

  const avatarURL = await uploadAvatar(avatar);
  if (avatarURL != null) {
    // Avatar is valid, save all info and log in
    users[socket.id] = username;
    sockets[username] = socket.id;
    avatars[users[socket.id]] = avatarURL;
    usernames.push(username);
    io.emit("online", usernames, avatars);
    if (!silent) {
      io.to("main").emit("message", {
        Username: username,
        Date: new Date(),
        SystemMessage: true,
      });
    }
    callback({
      Success: true,
      Username: username,
      Avatar: avatarURL,
    });
  } else {
    callback({
      Success: false,
      Error: "Avatar is cannot be larger than 10MB",
    });
  }
}

io.on("connection", (socket) => {
  socket.join("main");

  socket.on("sendDM", (toUser, message) => {
    sendDM(socket.id, sockets[toUser], message);
  });

  socket.on("changeUsername", (username) => {
    changeUsername(username, socket.id);
  });

  socket.on("ping", () => {
    pong(socket.id);
  });

  socket.on("login", (info, callback) => {
    login(info, callback, socket);
  });

  socket.on("disconnect", () => {
    const username = users[socket.id];
    if (username) {
      io.to("main").emit("user left", username, new Date());
      usernames.splice(usernames.indexOf(username), 1);
      delete sockets[username];
      delete users[socket.id];
      delete avatars[username];
      io.emit("online", usernames, avatars);
    }
  });

  socket.on("changeAvatar", (base64) => {
    avatars[users[socket.id]] = base64;
    io.emit("online", usernames, avatars);
    io.emit("avatarChanged", base64, users[socket.id], new Date());
  });

  socket.on("chatMessage", (info) => {
    console.log(info);
    if (!isUsernameTaken(info.User)) {
      users[socket.id] = info.User;
      usernames.push(info.User);
      // io.to("main").emit("user joined", info.User, new Date());
      io.emit("online", usernames, avatars);
    }

    if (info.Content) {
      for (const [key, value] of Object.entries(replacements)) {
        const regex = new RegExp(`\\b${key}\\b`, "gi");
        info.Content = info.Content.replaceAll(regex, value);
      }
    }

    const avatar = avatars[info.User];
    const messageInfo = {
      Username: info.Username || "Username",
      Content: info.Content,
      Avatar: avatar,
      Channel: info.Channel || "main",
      Date: new Date(),
    };

    io.to("main").emit("chatMessage", messageInfo);
  });

  socket.on("sendDM", (info) => {
    console.log(info);
    sendDM(info);
  });

  socket.on("reportMessage", (user, messageInfo) => {
    try {
      const parsed = JSON.parse(messageInfo);
      reportMessage(parsed, user);
    } catch (err) {
      console.warn(err);
    }
  });

  socket.on("chatImage", (user, img) => {
    const avatar = avatars[user];
    io.to("main").emit("chat image", user, img, avatar, new Date());
  });
});

server.listen(PORT, () =>
  console.log(`Server started! Listening on port ${PORT}.`),
);