var socket = io();

function main() {
    // Variables
    var messages = document.getElementById('messages');
    var form = document.getElementById('form');
    var input = document.getElementById('input');
    var uploadImageButton = document.getElementById('imageUploadButton');
    var imagePreview = document.getElementById('imagePreview');
    var submitImageButton = document.getElementById('submitImageButton')
    var uploadInput = document.getElementById('imageUploadInput');
    var activeUsers = document.getElementById('activeUsers');
    var onlineCount = document.getElementById('onlineCount');
    var mainChatButton = document.getElementById('mainChatButton');
    var openChat = "main";

    // Functions
    function reportMessage(messageElement) {
        if (messageElement) {
            let messageInfo = {};
            const avatar = messageElement.getElementsByClassName("avatar")[0];
            if (avatar && avatar.src) {
                messageInfo["Avatar"] = avatar.src;
            }
            const sender = messageElement.getElementsByClassName("username")[0];
            if (sender && sender.innerText) {
                messageInfo["User"] = sender.innerText;
            }
            const content = messageElement.getElementsByClassName("text")[0];
            if (content && content.innerText) {
                messageInfo["Content"] = content.innerText;
            }
            const date = messageElement.getElementsByClassName("sendTime")[0];
            if (date && date.innerText) {
                messageInfo["Date"] = content.innerText;
            }
            const channel = messageElement.getAttribute("data-channel");
            if (channel) {
                messageInfo["Channel"] = channel;
            }

            socket.emit("report message", profileUsernameInput.value, JSON.stringify(messageInfo));
            createNotification("Sent report", "Sent a report to the server.");
        }
    }

    /*
    function createMessage(div, messageInfo) {
        var item = document.createElement('li');
        item.setAttribute("data-channel", messageInfo.Channel || "main");
        const usernameSpan = document.createElement("span");
        var uP = document.createElement('p'); // username
        var tP = document.createElement('p'); // text content
        var timeP = document.createElement('p'); // time
        var avI = document.createElement('img'); // avatar
        const reportButton = document.createElement("button");
        uP.innerText = messageInfo.User;
        tP.innerHTML = processText(messageInfo.Content);
        avI.src = messageInfo.Avatar;
        timeP.innerText = new Date(messageInfo.Date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        item.className = "message";
        uP.className = "username";
        tP.className = "text";
        avI.className = "avatar";
        timeP.className = "sendTime";
        reportButton.innerText = "Report";
        reportButton.classList.add("reportButton");
        usernameSpan.appendChild(uP);
        usernameSpan.appendChild(timeP);
        usernameSpan.appendChild(reportButton);
        item.appendChild(avI);
        item.appendChild(usernameSpan);
        item.appendChild(tP);
        reportButton.onclick = function () { reportMessage(item) };
        div.appendChild(item);
    }

    function createImageMessage(div, u, base64, avatar, date) {
        var item = document.createElement('li');
        var uP = document.createElement('p');
        var iE = document.createElement('img');
        var timeP = document.createElement('p');
        var avI = document.createElement('img');
        uP.innerText = u;
        iE.src = base64;
        iE.title = "Click to enlarge";
        item.className = "message";
        timeP.innerText = new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        avI.src = avatar;
        uP.className = "username";
        iE.className = "chatMessageImage";
        avI.className = "avatar";
        timeP.className = "sendTime";
        uP.appendChild(timeP);
        item.appendChild(avI);
        item.appendChild(uP);
        item.appendChild(iE);
        div.appendChild(item);

        iE.onclick = function () {
            toggleEnlargedImage(base64);
        }
        iE.onload = function () {
            window.scrollTo(0, document.body.scrollHeight);
        }
    }

    function createSystemMessage(div, text, date) {
        var item = document.createElement('li');
        item.innerHTML = text;
        item.className = "message";
        item.title = new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        messages.appendChild(item);
    }
    */

    function processURLs(text) {
        var urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replaceAll(urlRegex, function (url) {
            return '<a target="_blank" href="' + url + '"">' + url + '</a>'
        });
    }

    function processTags(text) {
        var first = text.replaceAll("<", "&lt");
        var second = first.replaceAll(">", "&gt");
        return second;
    }

    function processText(text) {
        var first = processTags(text);
        var second = processURLs(first);
        return second;
    }

    function createDM(user) {
        if (!document.getElementById(user + "-DMs")) {
            var div = document.createElement('div');
            div.id = user + "-DMs";
            div.className = "DM";
            div.style.display = "none";
            document.body.appendChild(div);
        }
    }

    function getDM(user, message, avatar, time) {
        // If it is not from me
        if (profileUsernameInput.value !== user) {
            createDM(user);
            var div = document.getElementById(user + "-DMs");
            createMessage(div, {User: user, Content: message, Avatar: avatar, Date: time});
        } else {
            var div = document.getElementById(openChat + "-DMs");
            createMessage(div, {User: user, Content: message, Avatar: avatar, Date: time});
        }

        // If the chat is open 
        if (openChat === user && user != profileUsernameInput.value) {
            window.scrollTo(0, document.body.scrollHeight);
        } else {
            createNotification(user, message);
        }
    }

    function sendDM(user, message) {
        socket.emit('DM', user, message);
        var div = document.getElementById(user + "-DMs");
        createMessage(div, profileUsernameInput.value, message, avatar, new Date());
    }

    function openDM(user) {
        if (document.getElementById(openChat + "-DMs")) {
            document.getElementById(openChat + "-DMs").style.display = 'none';
        } else if (openChat === 'main') {
            document.getElementById('messages').style.display = 'none';
        }

        createDM(user);
        openChat = user;

        var div = document.getElementById(user + "-DMs");
        if (div) {
            div.style.display = 'block';
            window.scrollTo(0, document.body.scrollHeight);
        }
    }

    function closeDM(user) {
        var div = document.getElementById(user + "-DMs");
        if (div) {
            div.style.display = 'none';
            openChat = 'main';
            document.getElementById('messages').style.display = 'block';
            window.scrollTo(0, document.body.scrollHeight);
        }
    }

    function sendImage(base64) {
        if (base64) {
            socket.emit('chatImage', {});
            toggleUploadDialog();
        }
    }

    const previewImage = async (event) => {
        const file = event.target.files[0];
        if (file.size < 800000) {
            var base64 = await convertBase64(file);
            imagePreview.src = base64;
        } else {
            alert("That image is too large! It must be less than 1MB.");
            uploadInput.value = "";
        }
    };

    function sendMessage(e) {
        e.preventDefault();
        if (input.value) {
            if (openChat === 'main') {
                socket.emit('chatMessage', {Username: username, Content: input.value, Channel: openChat});
            } else {
                socket.emit('sendDM', {From: username, To: openChat, Content: input.value});
            }
            input.value = '';
        }
    }

    // Events
    mainChatButton.addEventListener('click', function () {
        if (openChat !== 'main') {
            closeDM(openChat);
        }
    });

    document.getElementById('chatOverlay').addEventListener('click', function () {
        if (accountSetup === true) {
            if (profileDialogOpen === true) {
                toggleProfileDialog();
            }
            if (uploadDialogOpen === true) {
                toggleUploadDialog();
            }
            if (enlargedImageOpen === true) {
                toggleEnlargedImage();
            }
        }
    });

    form.addEventListener('submit', sendMessage);

    uploadImageButton.addEventListener('click', function (e) {
        e.preventDefault();
        toggleUploadDialog();
    });

    uploadInput.addEventListener("change", (e) => {
        previewImage(e);
    });

    submitImageButton.addEventListener('click', function () {
        sendImage(imagePreview.src);
    });

    // Socket Functions
    socket.on('getDM', function (user, message, avatar, time) {
        getDM(user, message, avatar, time);
    });
    socket.on('avatarRequest', function () {
        socket.emit('avatarChanged', profileAvatarImg.src);
    });
    // socket.on('usernameChanged', function (oldUser, newUser, date) {
    //     createMessage(messages, `<b>${oldUser}</b> has changed their username to <b>${newUser}</b>.`, date);
    // });
    // socket.on('avatarChanged', function (base64, user, date) {
    //     createSystemMessage(messages, `<b>${user}</b> has changed their avatar.`, date);
    // });
    socket.on('chatMessage', function (messageInfo) {
        createMessage(messages, messageInfo);
        window.scrollTo(0, document.body.scrollHeight);
    });
    socket.on('chatImage', function (user, img, avatar, time) {
        // createImageMessage(messages, user, img, avatar, time);
    });
    socket.on('userJoined', function (username, time) {
        // createSystemMessage(messages, "<strong>" + username + "</strong> joined the chat!", time);
        window.scrollTo(0, document.body.scrollHeight);
    });
    socket.on('userLeft', function (username, time) {
        // createSystemMessage(messages, "<strong>" + username + "</strong> has left the chat.", time);
        window.scrollTo(0, document.body.scrollHeight);
    });
    socket.on('online', function (users, avatars) {
        onlineCount.innerHTML = `Online (${users.length})`;
        activeUsers.innerHTML = "";
        users.forEach(user => {
            var item = document.createElement('div');
            var username = document.createElement('p');
            var avatar = document.createElement('img');
            item.id = 'user';
            username.innerText = user;
            username.id = 'username';
            avatar.src = avatars[user];
            avatar.id = 'avatar';
            item.appendChild(avatar);
            item.appendChild(username);
            activeUsers.appendChild(item);

            if (user !== profileUsernameInput.value) {
                var dmButton = document.createElement('button');
                var icon = document.createElement('span');
                // dmButton.innerText = 'Message';
                dmButton.id = 'DMbutton';
                dmButton.onclick = function () {
                    openDM(user);
                }
                icon.innerHTML = "forum";
                icon.className = "material-symbols-rounded";
                dmButton.appendChild(icon);
                item.appendChild(dmButton);
            }
        });
    });
}