function createMessage(div, messageInfo) {
    // Create the main element
    const time = new Date(messageInfo.Date).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });
    const li = document.createElement("li");
    li.classList.add("message");
    li.setAttribute("data-channel", messageInfo.Channel || "main");
    if (!messageInfo.SystemMessage) {
        // Regular message
        const avatar = document.createElement("img");
        avatar.classList.add("avatar");
        avatar.src = messageInfo.Avatar;
        const topSpan = document.createElement("span");
        const username = document.createElement("p");
        username.classList.add("username");
        username.innerText = messageInfo.Username || "User";
        const sendTime = document.createElement("p");
        sendTime.classList.add("sendTime");
        sendTime.innerText = time || "00:00";
        const text = document.createElement("p");
        text.classList.add("text");
        text.innerText = messageInfo.Content;
        li.appendChild(avatar);
        topSpan.appendChild(username);
        topSpan.appendChild(sendTime);
        li.appendChild(topSpan);
        li.appendChild(text);
    } else {
        // System message
        li.innerText = messageInfo.Content;
    }

    if (messageInfo.Image) {
        // Message has an image
        const img = document.createElement("img");
        img.classList.add("chatMessageImage");
        img.src = messageInfo.Image;
        img.title = "Click to enlarge";
        img.onclick = () => {
            toggleEnlargedImage(messageInfo.Image);
        };
    }
    div.appendChild(li);
}

function toggleEnlargedImage(img) {
    if (enlargedImageOpen === false) {
        if (img) {
            var enlargedImageDiv = document.getElementById("enlargedImage");
            var enlargedImageImg =
                enlargedImageDiv.getElementsByTagName("img")[0];
            enlargedImageDiv.style.display = "block";
            enlargedImageImg.src = img;
            setOverlay(true);
            enlargedImageOpen = true;
        }
    } else {
        var enlargedImageDiv = document.getElementById("enlargedImage");
        var enlargedImageImg = enlargedImageDiv.getElementsByTagName("img");
        enlargedImageDiv.style.display = "none";
        enlargedImageImg.src = "";
        setOverlay(false);
        enlargedImageOpen = false;
    }
}

function createNotification(heading, text) {
    var item = document.createElement("div");
    item.id = "notification";
    var head = document.createElement("p");
    head.id = "heading";
    head.innerText = truncateText(heading, 40);
    var main = document.createElement("p");
    main.id = "mainText";
    main.innerText = truncateText(text, 40);

    item.appendChild(head);
    item.appendChild(main);
    document.getElementById("notifications").appendChild(item);

    setTimeout(function () {
        item.remove();
    }, 2500);
}

function toggleUploadDialog() {
    if (document.getElementById('uploadDialog').style.display === 'none') {
        setOverlay(true);
        document.getElementById('uploadDialog').style.display = 'block';
        uploadDialogOpen = true;
    } else {
        setOverlay(false);
        document.getElementById('uploadDialog').style.display = 'none';
        uploadDialogOpen = false;
    }
}