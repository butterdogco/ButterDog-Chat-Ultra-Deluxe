/**
 * @typedef {Object} User
 * @property {string} username
 * @property {number} colorHue
 * @property {string} about
 * @property {Date} joinedAt
 * @property {Date} lastSeen
 * @property {boolean} online
 */

const socket = io();

// State
let currentConversationId = null;
let conversations = [];
let messages = [];
let typingTimeout = null;

// DOM Elements
const mainContainer = document.getElementById('main-container');
const conversationsList = document.getElementById('conversation-list');
const messageContainer = document.getElementById('message-container');
const inputForm = document.getElementById('input-form');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const conversationTitle = document.getElementById('conversation-title');
const typingIndicator = document.getElementById('typing-indicator');
const newConversationButton = document.getElementById('new-conversation-button');
const newConversationModal = document.getElementById('new-conversation-modal');
const userSearchInput = document.getElementById('user-search-input');
const userSearchResults = document.getElementById('user-search-results');
const closeConversationModalButton = document.getElementById('close-conversation-modal-button');

let searchTimeout;

// Initialize
async function init() {
 await loadConversations();
 renderConversations();
 setupSocketListeners();
 setupEventListeners();
 setupModalEventListeners();
}

// Load conversations
async function loadConversations() {
    try {
        const response = await fetch('/api/conversations');
        conversations = await response.json();
        
    } catch (err) {
        console.error('Failed to load conversations:', err);
    }
}

// Render conversation list
function renderConversations() {
    conversationsList.innerHTML = '';

    conversations.forEach(convo => {
        const div = document.createElement('div');
        div.className = 'conversation-item';
        div.dataset.id = convo._id;

        if (convo._id === currentConversationId) {
            div.classList.add('active');
        }

        const isDM = convo.type === 'dm';

        // Get another user for DMs
        const otherUser = isDM ? convo.members.find(m => m._id !== currentUser.id) : null;

        const displayName = isDM ? otherUser.username : convo.name || 'Group Chat';

        const lastMessage = convo.lastMessage;
        const lastMessageText = lastMessage 
            ? lastMessage.text.substring(0, 30) + (lastMessage.text.length >= 30 ? '...' : '')
            : 'No messages yet...';

        const previewColor = isDM ? otherUser.colorHue : 200; // temp 200
        const previewText = isDM ? otherUser.username.charAt(0).toUpperCase() : 'OK'; // temp
        
        div.innerHTML = `
            <div class="conversation-icon">
                <div class="user-avatar" style="background-color: ${getColorDataWithHue(previewColor)}">${previewText}</div>
            </div>
            <div class="conversation-details">
                <div class="conversation-name">${displayName}</div>
                <div class="conversation-preview">${lastMessageText}</div>
            </div>
        `;
        div.addEventListener('click', () => selectConversation(convo._id));
        conversationsList.appendChild(div);
    });
}

// Select a conversation
async function selectConversation(conversationId) {
    if (currentConversationId === conversationId) {
        return;
    }

    currentConversationId = conversationId;
    renderConversations();

    // Join socket room
    socket.emit('conversation:join', conversationId);

    // Load messages
    await loadMessages(conversationId);

    // Update UI
    const conversation = conversations.find(c => c._id === conversationId);
    if (conversation) {
        const otherUser = conversation.type === 'dm'
            ? conversation.members.find(m => m._id === currentUser.id)
            : null;
        
        conversationTitle.textContent = conversation.type === 'dm'
            ? otherUser.username
            : conversation.name || 'Group Chat';
    }

    mainContainer.classList.toggle('active-conversation', conversation !== null);
}

// Load messages
async function loadMessages(conversationId) {
    try {
        const response = await fetch(`/api/conversations/${conversationId}/messages?limit=50`);
        messages = await response.json();
        console.log(messages);
        renderMessages();
        scrollToBottom();
    } catch (err) {
        console.error('Failed to load messages:', err);
    }
}

/**
 * Searches for users with usernames containing the query
 * @param {string} query 
 */
async function searchUsers(query) {
    if (query.length < 2) {
        userSearchResults.innerHTML = '';
        return;
    }

    try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
        const users = await response.json();
        renderSearchResults(users);
    } catch(err) {
        console.error('Search error:', err);
    }
}

/**
 * Renders user search results in the new conversation modal
 * @param {User[]} users
 */
function renderSearchResults(users) {
    if (users.length === 0) {
        userSearchResults.innerHTML = 'No results found';
        return;
    }

    userSearchResults.innerHTML = '';

    users.forEach(user => {
        const div = document.createElement('div');
        div.className = 'search-result-item user-tile';

        const color = getColorDataWithHue(user.colorHue);
        const statusDot = `<span class="status-dot${user.online ? ' online' : ''}"></span>`;

        div.innerHTML = `
            <div class="user-avatar" style="background-color: ${color}">
                <span class="letter">${user.username.charAt(0).toUpperCase()}</span>
                ${statusDot}
            </div>
            <div class="user-info">
                <span class="username">${user.username}</span>
            </div>
        `;

        div.addEventListener('click', () => createConversation(user));
        userSearchResults.appendChild(div);
    });
}

/**
 * Creates or opens a conversation with the provided User
 * @param {User} user
 */
async function createConversation(user) {
    try {
        const response = await fetch('/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'dm',
                memberIds: [user._id]
            })
        });

        const conversation = await response.json();

        // Check if this conversation already exists
        const existingIndex = conversations.findIndex(c => c._id === conversation._id);
        if (existingIndex !== -1) {
            // New conversation
            conversations.unshift(conversation);
            renderConversations();
        }

        // Select the conversation
        selectConversation(conversation._id);
        setConversationModalVisible(false);
    } catch (err) {
        console.error('Failed to create conversation:', err);
        alert('Failed to create conversation');
    }
}

/**
 * Sets the visible state of the new conversation modal
 * @param {boolean} visible Whether or not the modal will be made visible
 */
function setConversationModalVisible(visible) {
    newConversationModal.classList.toggle('show', visible);

    if (visible) {
        userSearchInput.focus();
    } else {
        userSearchInput.value = '';
        userSearchResults.innerHTML = '';
    }
}


// Render messages
function renderMessages() {
    messageContainer.innerHTML = '';

    messages.forEach(msg => {
        appendMessage(msg);
    });
}

// Append a single message
function appendMessage(msg) {
    const div = document.createElement('div');
    div.className = 'message';
    div.setAttribute("data-id", msg._id);

    if (!msg.sender) {
        console.warn("Message recieved with no sender data:", msg);
        return;
    }

    if (msg.sender.id === currentUser.id) {
        div.classList.add('own-message');
    }

    const hue = msg.sender.colorHue || 200;
    const color = `hsl(${hue}, 60%, 50%)`;

    div.innerHTML = `
        <div class="message-sender user-avatar" style="background-color: ${color}">${msg.sender.username.charAt(0).toUpperCase()}</div>
        <div class="message-details">
            <div class="message-info"><span class="sender">${msg.sender.username}</span> - ${formatTime(msg.createdAt)}${msg.edited ? ' (edited)' : ''}</div>
            <div class="message-text">${escapeHtml(msg.text)}</div>
        </div>
    `;

    messageContainer.appendChild(div);
}

// Send message
function sendMessage() {
    const text = messageInput.value.trim();

    if (!text || !currentConversationId) {
        console.warn('No text or currentConversationId:', text, currentConversationId);
        return;
    }

    socket.emit('message:send', {
        conversationId: currentConversationId,
        text
    });

    messageInput.value = '';
    socket.emit('typing:stop', currentConversationId);
}

// Socket event listeners
function setupSocketListeners() {
    socket.on('message:new', (message) => {
        if (message.conversation === currentConversationId) {
            messages.push(message);
            appendMessage(message);
            scrollToBottom();
        }

        // Update conversation list
        loadConversations();
    });

    socket.on('message:edited', (message) => {
        const index = messages.findIndex(m => m._id === message._id);
        if (index !== -1) {
            messages[index] = message;
            renderMessages();
        }
    });

    socket.on('message:deleted', ({ messageId }) => {
        const msgDiv = document.querySelector(`[data-id="${messageId}]"`);
        if (msgDiv) {
            msgDiv.querySelector('.message-text').textContent = '[deleted]';
            msgDiv.classList.add('deleted');
        }
    });

    socket.on('user:typing', ({ username, conversationId }) => {
        if (conversationId === currentConversationId) {
            updateTypingIndicator(true);
        }
    });

    socket.on('user:stopped-typing', ({ conversationId }) => {
        if (conversationId === currentConversationId) {
            updateTypingIndicator(false);
        }
    });

    socket.on('user:online', ({ userId }) => {
        updateUserStatus(userId, true);
    });

    socket.on('user:offline', ({ userId }) => {
        updateUserStatus(userId, false);
    });
}

// DOM event listeners
function setupEventListeners() {
    inputForm.addEventListener('submit', onFormSubmit)

    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    messageInput.addEventListener('input', () => {
        if (!currentConversationId) return;

        socket.emit('typing:start', currentConversationId);

        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            socket.emit('typing:stop', currentConversationId);
        }, 1000);
    });

    newConversationButton.addEventListener('click', () => setConversationModalVisible(true));
}

function setupModalEventListeners() {
    userSearchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchUsers(e.target.value);
        }, 400);
    });

    // Close modal on background click
    newConversationModal.addEventListener('click', (e) => {
        if (e.target === newConversationModal) {
            setConversationModalVisible(false);
        }
    });

    // Close button
    closeConversationModalButton.addEventListener('click', () => setConversationModalVisible(false));
}

// Utility functions
function getColorDataWithHue(colorHue) {
    return `hsl(${colorHue}, 60%, 50%)`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString([], { hour: '2-digit', minute: '2-digit' });
}

function scrollToBottom() {
    messageContainer.scrollTop = messageContainer.scrollHeight;
}

function updateTypingIndicator(visible) {
    typingIndicator.classList.toggle('visible', visible);
}

function updateUserStatus(userId, online) {
    // Update UI to show online/offline status
    loadConversations();
}

function onFormSubmit(e) {
    e.preventDefault();
    sendMessage();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);