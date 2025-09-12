const socket = io();

const messageForm = document.getElementById('message-form');
const msgInput = document.getElementById('message-input');
const chatMessages = document.getElementById('messages-container');

let currentRoom = 'global';
let lastMessageSender = null;

function userLogout() {
  confirm("Are you sure you want to logout?") && (window.location.href = "/logout");
}

function createMessageElement(message, parseDate = true) {
  const div = document.createElement('div');
  div.classList.add('message');
  if (message.sender === lastMessageSender) {
    div.classList.add('child-message');
  }
  div.innerHTML = `
  <p class="meta">${message.sender} <span class="send-time">${new Date(message.time).toLocaleTimeString()}</span></p>
  <p class="content">${message.text}</p>
  `;
  return div;
}

function onFormSubmit(event) {
  event.preventDefault();
  const msg = msgInput.value.trim();
  if (!msg) return;
  const localMessage = createMessageElement({ sender: 'You', text: msg, time: new Date() });
  chatMessages.appendChild(localMessage);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  // Emit message to server
  socket.emit('chatMessage', {
    room: currentRoom,
    sender: 'User',
    text: msg,
  });
  msgInput.value = '';
  msgInput.focus();
}

function fetchMessages(room, limit = 20) {
  fetch(`/api/messages?room=${room}&limit=${limit}`)
    .then(res => res.json())
    .then(messages => {
      chatMessages.innerHTML = '';
      messages.forEach(message => {
        if (message.room !== currentRoom) return;
        console.log(message);
        const messageElement = createMessageElement(message);
        chatMessages.appendChild(messageElement);
        lastMessageSender = message.sender;
      });
      chatMessages.scrollTop = chatMessages.scrollHeight;
    })
    .catch(err => console.error("Error fetching messages:", err));
}

// Initial fetch
fetchMessages(currentRoom);

// Join global chat
socket.emit('joinRoom', currentRoom);

// Connections
socket.on('message', (message) => {
  const messageElement = createMessageElement(message);
  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Message submit
messageForm.addEventListener('submit', onFormSubmit);