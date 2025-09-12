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
  // Format time
  if (message.timestamp) {
    if (parseDate && !(message.timestamp instanceof Date)) {
      message.timestamp = new Date(message.timestamp);
    }
  } else {
    message.timestamp = new Date();
  }

  // If the message is older than 24 hours, show date and time otherwise just show time
  const now = new Date();
  const isOlderThan24Hours = (now - message.timestamp) > 24 * 60 * 60 * 1000;
  const options =
    isOlderThan24Hours ? { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { hour: '2-digit', minute: '2-digit' };
  message.timeString = message.timestamp.toLocaleTimeString([], options);

  // Create message element
  const div = document.createElement('div');
  div.classList.add('message');
  div.setAttribute('data-timestamp', message.timestamp.toISOString());

  // If the sender UUID matches mine, change the sender text
  if (message.senderUUID != null && message.senderUUID == userUUID) {
    message.sender = 'You';
  }

  // If the sender is the same as the last message, add a special class
  if (message.sender === lastMessageSender) {
    div.classList.add('child-message');
  }
  lastMessageSender = message.sender;

  // Set inner HTML
  // div.innerHTML = `
  // <p class="meta">${message.sender} <span class="send-time">${message.timeString}</span></p>
  // <p class="content">${message.text}</p>
  // `;

  const meta = document.createElement('p');
  meta.classList.add('meta');
  meta.innerText = message.sender + ' ';

  const timeSpan = document.createElement('span');
  timeSpan.classList.add('send-time');
  timeSpan.innerText = message.timeString;
  meta.appendChild(timeSpan);

  div.appendChild(meta);

  const content = document.createElement('p');
  content.classList.add('content');
  content.innerText = message.text;
  div.appendChild(content);

  return div;
}

async function appendMessage(messageElement) {
  // Find the correct position to insert based on timestamp
  const messageTimestamp = new Date(messageElement.getAttribute('data-timestamp'));
  const existingMessages = chatMessages.getElementsByClassName('message');
  let inserted = false;
  for (let i = 0; i < existingMessages.length; i++) {
    const existingTimestamp = new Date(existingMessages[i].getAttribute('data-timestamp'));
    if (existingTimestamp != null && messageTimestamp < existingTimestamp) {
      chatMessages.insertBefore(messageElement, existingMessages[i]);
      inserted = true;
      break;
    }
  }
  if (!inserted) {
    chatMessages.appendChild(messageElement);
  }
  // chatMessages.scrollTop = chatMessages.scrollHeight;
}

function onFormSubmit(event) {
  event.preventDefault();
  const msg = msgInput.value.trim();
  if (!msg) return;
  const localMessage = createMessageElement({ sender: 'You', text: msg, timestamp: new Date() }, false);
  // chatMessages.appendChild(localMessage);
  appendMessage(localMessage);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  // Emit message to server
  socket.emit('chatMessage', {
    room: currentRoom,
    text: msg,
  });
  msgInput.value = '';
  msgInput.focus();
}

function fetchMessages(room, limit = 20, offset = 0) {
  fetch(`/api/messages?room=${room}&limit=${limit}&offset=${offset}`)
    .then(res => res.json())
    .then(messages => {
      if (!Array.isArray(messages)) return;
      if (messages.length === 0) return;
      messages.forEach(message => {
        if (message.room !== currentRoom) return;
        const messageElement = createMessageElement(message, true);
        // chatMessages.appendChild(messageElement);
        appendMessage(messageElement);
        // lastMessageSender = message.sender;
      });
      if (offset === 0) { // Only scroll to bottom on initial load
        chatMessages.scrollTop = chatMessages.scrollHeight;
      } else {
        // Maintain scroll position when loading older messages
        const firstNewMessage = chatMessages.getElementsByClassName('message')[offset];
        if (firstNewMessage) {
          firstNewMessage.scrollIntoView();
        }
      }
    })
    .catch(err => console.error("Error fetching messages:", err));
}

function switchRoom(newRoom) {
  if (newRoom === currentRoom) return;
  // Leave current room
  socket.emit('leaveRoom', currentRoom);
  // Clear messages
  chatMessages.innerHTML = '';
  lastMessageSender = null;
  // Join new room
  currentRoom = newRoom;
  socket.emit('joinRoom', currentRoom);
}

// Load more messages on scroll to top
let fetchMessagesDebounce = false;
function onMessageListScroll() {
  if (chatMessages.scrollTop === 0 && !fetchMessagesDebounce) {
    fetchMessagesDebounce = true;
    const messageCount = chatMessages.getElementsByClassName('message').length;
    fetchMessages(currentRoom, 20, messageCount);
    setTimeout(() => { fetchMessagesDebounce = false; }, 1000); // Prevent multiple loads in quick succession
  }
}

// Initial fetch
fetchMessages(currentRoom);

// Join global chat
socket.emit('joinRoom', currentRoom);

// Connections
socket.on('message', (message) => {
  const messageElement = createMessageElement(message, true);
  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Event listeners
messageForm.addEventListener('submit', onFormSubmit);
chatMessages.addEventListener('scroll', onMessageListScroll);