// Type definitions for easy type-checking while editing

/**
 * @typedef {Object} User
 * @property {string} username
 * @property {number} colorHue
 * @property {Date} joinedAt
 * @property {Date} lastSeen
 * @property {boolean} online
 */

/**
 * @typedef {'newConvo' | 'addMembers'} UserSelectMode
 */

const socket = io();
const APP_NAME = 'ButterDog Chat';

// State
let currentConversationId = null;
let conversations = [];
let messages = [];
let typingUsernames = new Set();
let typingTimeout = null;
let lastMessageInputText = null;
let editingMessageId = null;
let refocusQueue = [];
let searchTimeout;
/**
 * @type {UserSelectMode}
 */
let selectSubmitMode = 'newConvo';
let selectedUsers = new Set();
let conversationNotifications = new Map();
let canSendNotifications = "Notification" in window;

// DOM Elements
const mainContainer = document.getElementById('main-container');
const conversationsList = document.getElementById('conversation-list');
const memberList = document.getElementById('member-list');
const messageContainer = document.getElementById('message-container');
const inputForm = document.getElementById('input-form');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const conversationTitle = document.getElementById('conversation-title');
const typingIndicator = document.getElementById('typing-indicator');
const newConversationButton = document.getElementById('new-conversation-button');
const userSelectSubmitButton = document.getElementById('user-select-submit-button');
const userSelectSubmitButtonText = document.getElementById('user-select-submit-button-text');
const userSelectModal = document.getElementById('user-select-modal');
const userSelectTitle = document.getElementById('user-select-title');
const userSearchInput = document.getElementById('user-search-input');
const userSearchResults = document.getElementById('user-search-results');
const userSelectCloseButton = document.getElementById('user-select-close-button');
const userSelectSelectedCount = document.getElementById('user-select-selected-count');
const editGroupNameButton = document.getElementById('edit-group-name-button');
const toggleMemberListButton = document.getElementById('toggle-member-list-button');
const addMemberButton = document.getElementById('add-member-button');
const notificationsContainer = document.getElementById('notifications-container');

// Initialize
async function init() {
    await loadConversations();
    renderConversations();
    renderMemberList();
    setupSocketListeners();
    setupEventListeners();
    setupModalEventListeners();
    updateUserAvatar();
    toggleMemberList();

    messageInput.setAttribute('maxlength', constants.MESSAGE_MAX_LENGTH);

    const activeConversation = getURLParameter('convo');
    if (activeConversation) {
        selectConversation(activeConversation);
    }
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
        const container = document.createElement('button');
        container.className = 'conversation-item';
        container.dataset.id = convo._id;

        if (convo._id === currentConversationId) {
            container.classList.add('active');
        }

        const isDM = convo.type === 'dm';

        // Get another user for DMs
        const otherUser = isDM ? convo.members.find(m => m._id !== currentUser.id) : null;

        const displayName = isDM ? otherUser.username : convo.name || 'Group Chat';

        const lastMessage = convo.lastMessage;
        const lastMessageText = lastMessage
            ? lastMessage.text.substring(0, 30) : 'No messages yet...';

        const previewColor = isDM ? otherUser.colorHue : 200; // temp 200
        const previewText = shortenName(displayName);

        container.innerHTML = `
            <div class="conversation-icon">
                <div class="user-avatar" style="background-color: ${getColorDataWithHue(previewColor)}">${previewText}</div>
            </div>
            <div class="conversation-details">
                <div class="conversation-name">${escapeHtml(displayName)}</div>
                <div class="conversation-preview">${escapeHtml(lastMessageText)}</div>
            </div>
        `;
        container.addEventListener('click', () => selectConversation(convo._id));
        conversationsList.appendChild(container);
    });
}

// Select a conversation
async function selectConversation(conversationId) {
    if (currentConversationId === conversationId) {
        return;
    }

    currentConversationId = conversationId;
    renderConversations();
    renderMemberList();

    // Join socket room
    socket.emit('conversation:join', conversationId);

    // Load messages
    await loadMessages(conversationId);

    // Update UI
    const conversation = getCurrentConversationData();
    if (!conversation) {
        console.warn('No conversation data');
        return;
    }

    const isDM = conversation.type === 'dm';
    
    // Only show for groups where the current user is the owner (1st member)
    const groupOnlyButtonStyle = isDM || (conversation.members[0]._id !== currentUser.id) ? 'none' : '';
    addMemberButton.style.display = groupOnlyButtonStyle;
    editGroupNameButton.style.display = groupOnlyButtonStyle; 

    if (conversation) {
        const otherUser = isDM
            ? conversation.members.find(m => m._id !== currentUser.id)
            : null;

        const conversationName = isDM ? otherUser.username : conversation.name || 'Group Chat';
        conversationTitle.textContent = conversationName;
        document.title = conversationName + ' - '  + APP_NAME;
        updateURLParameter('convo', conversationId);

        // Clear notifications
        const notifications = conversationNotifications.get(conversationId);
        if (notifications) {
            notifications.forEach(notif => {
                notif.close();
            });
            conversationNotifications.delete(conversationId);
        }
    } else {
        document.title = APP_NAME;
        updateURLParameter('convo', null);
    }

    if (canSendNotifications) {
        Notification.requestPermission().then((result) => {
            canSendNotifications = result;
        });
    }

    mainContainer.classList.toggle('active-conversation', currentConversationId != null);
}

// Load messages
async function loadMessages(conversationId) {
    try {
        const response = await fetch(`/api/conversations/${conversationId}/messages?limit=50`);
        messages = await response.json();
        renderMessages();
        scrollToBottom();
    } catch (err) {
        console.error('Failed to load messages:', err);
    }
}

function renderMemberList() {
    if (currentConversationId) {
        let members;
        for (const convo of conversations) {
            if (convo._id === currentConversationId) {
                members = convo.members;
                break;
            }
        }

        if (!members) {
            console.warn('Failed to find active conversation members');
            return;
        }

        memberList.innerHTML = '';

        members.forEach(user => {
            const div = document.createElement('div');
            div.className = 'user-tile';

            const color = getColorDataWithHue(user.colorHue);
            const statusDot = `<span class="status-dot${user.online ? ' online' : ''}"></span>`;

            div.innerHTML = `
                <div class="user-avatar" style="background-color: ${color}">
                    <span class="letter">${shortenName(user.username)}</span>
                    ${statusDot}
                </div>
                <div class="user-info">
                    <span class="username">${user.username}</span>
                </div>
            `;

            memberList.appendChild(div);
        });
    } else {
        memberList.innerHTML = '';
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
    } catch (err) {
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
                <span class="letter">${shortenName(user.username)}</span>
                ${statusDot}
            </div>
            <div class="user-info">
                <span class="username">${user.username}</span>
            </div>
            <div class="select-user">
                <input type="checkbox">
            </div>
        `;

        const checkbox = div.querySelector('input[type=checkbox]');
        if (setIncludesUserId(selectedUsers, user._id)) {
            checkbox.checked = true;
        }

        div.addEventListener('click', () => {
            const checked = !checkbox.checked;
            checkbox.checked = checked;
            if (checked) {
                if (setIncludesUserId(selectedUsers, user._id)) return;
                selectedUsers.add(user);
            } else {
                removeUserFromSet(selectedUsers, user._id);
            }
            userSelectSelectedCount.innerText = selectedUsers.size;
        });

        userSearchResults.appendChild(div);
    });
}

/**
 * Creates or opens a conversation with the provided User
 * @param {User[]} users
 */
async function createConversation(users) {
    try {
        // If users is a Set, convert it to an Array
        if (users instanceof Set) {
            users = Array.from(users);
        }

        const isDM = users.length === 1;

        socket.emit('conversation:new', {
            type: isDM ? 'dm' : 'group',
            memberIds: users.map(u => u._id)
        });

        // const response = await fetch('/api/conversations', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({
        //         type: isDM ? 'dm' : 'group',
        //         memberIds: users.map(u => u._id)
        //     })
        // });

        // const conversation = await response.json();

        // // Check if this conversation already exists
        // const existingIndex = conversations.findIndex(c => c._id === conversation._id);
        // if (existingIndex === -1) {
        //     // New conversation
        //     conversations.unshift(conversation);
        //     renderConversations();
        // }

        // // Select the conversation
        // selectConversation(conversation._id);
    } catch (err) {
        console.error('Failed to create conversation:', err);
        displayNotification('Failed to create conversation', 'An error has occurred');
    }
}

/**
 * Adds or removes the provided members from the current conversation
 * @param {Object[]} users
 * @param {string} users[].userId - A unique user identifier
 * @param {boolean} users[].added - Whether or not the user should be removed
 */
async function updateMembersInConversation(users) {
    try {
        // If users is a Set, convert it to an Array
        if (users instanceof Set) {
            users = Array.from(users);
        }

        socket.emit('conversation:edit', {
            conversationId: currentConversationId,
            newData: users
        });
    } catch (err) {
        console.error('Failed to update members in group:', err);
        displayNotification('Failed to update members in group', 'An error has occurred');
    }
}

/**
 * Sets the visible state of the new conversation modal
 * @param {boolean} visible Whether or not the modal will be made visible
 */
function setConversationModalVisible(visible) {
    userSelectModal.classList.toggle('show', visible);

    if (visible) {
        userSelectSelectedCount.innerText = selectedUsers.size;
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

    const isSystemMessage = msg.sender === 'system';

    const isOwnMessage = !isSystemMessage ? msg.sender._id === currentUser.id : false;
    const canEdit = isOwnMessage ? isDateNewerThan(msg.createdAt, constants.MESSAGE_EDIT_WINDOW) : false;
    if (isOwnMessage) {
        div.dataset.self = 'true';
    }

    const hue = msg.sender.colorHue || 200;
    const color = `hsl(${hue}, 60%, 50%)`;

    div.innerHTML = `
        ${!isSystemMessage ? `
        <div class="message-sender user-avatar" style="background-color: ${color}">${shortenName(msg.sender.username)}</div>
        ` : ''}
        <div class="message-details">
            ${!isSystemMessage ? `
            <div class="message-info"><span class="sender">${msg.sender.username}</span> - ${formatTime(msg.createdAt)}${msg.edited ? ' (edited)' : ''}</div>
            `: ''}
            <div class="message-text">${escapeHtml(msg.text)}</div>
        </div>
        ${isOwnMessage ? `
        <div class="message-actions">
            ${canEdit ? `<button class="text-button edit-button">Edit</button>` : ''}
            <button class="text-button delete-button">Delete</button>
        </div>
        ` : ''}
    `;

    const editButton = div.querySelector('.edit-button');
    const deleteButton = div.querySelector('.delete-button');
    const messageId = msg._id;

    if (editButton) editButton.addEventListener('click', () => {
        editingMessageId = messageId;
        messageInput.value = msg.text;
        messageInput.focus();
    });

    if (deleteButton) deleteButton.addEventListener('click', () => {
        deleteMessage(messageId);
    });

    messageContainer.appendChild(div);
}

// Send message
function sendMessage() {
    const text = messageInput.value.trim();

    if (!text || !currentConversationId) {
        console.warn('No text or currentConversationId:', text, currentConversationId);
        return;
    }

    if (!editingMessageId) {
        socket.emit('message:send', {
            conversationId: currentConversationId,
            text
        });

        socket.emit('typing:stop', currentConversationId);
        messageInput.value = '';
    } else {
        editMessage(editingMessageId, text);
        messageInput.value = lastMessageInputText;
        lastMessageInputText = null;
        editingMessageId = null;
    }

    updateInputSize();
}

async function editMessage(messageId, newContent) {
    socket.emit('message:edit', {
        messageId, text: newContent
    });
}

async function deleteMessage(messageId) {
    if (confirm('Are you sure you want to delete this message?')) {
        socket.emit('message:delete', messageId);
    }
}

function promptNewConversation() {
    // Change state
    selectSubmitMode = 'newConvo';
    selectedUsers.clear(); // Clear existing selections

    // Update UI
    userSelectTitle.innerText = 'New Conversation';
    userSelectSubmitButtonText.innerText = 'Create Conversation';

    // Show prompt
    setConversationModalVisible(true);
}

function promptAddMembers() {
    // Ensure a conversation is active
    if (currentConversationId === null) {
        displayNotification('Cannot add members', 'No active conversation');
        return;
    }

    const currentConversation = getCurrentConversationData();

    // Change state
    selectSubmitMode = 'addMembers';
    selectedUsers.clear();
    if (currentConversation) {
        // Set selectedUsers to current conversation users, excluding ourselves
        currentConversation.members.forEach(user => {
            if (user._id !== currentUser.id) {
                selectedUsers.add(user);
            }
        });
    }

    // Update UI
    userSelectTitle.innerText = 'Edit Members';
    userSelectSubmitButtonText.innerText = 'Update Members';

    // Show prompt
    setConversationModalVisible(true);
}

function editGroupName() {
    if (!currentConversationId) return;

    // Find current conversation and ensure it isn't a DM
    for (const convo in conversations) {
        if (convo._id === currentConversationId) {
            if (convo.type === 'dm') {
                displayNotification('Cannot edit name', 'DM conversation names cannot be edited');
                return;
            } else {
                break;
            }
        }
    }

    // Prompt user for a new name
    const newName = prompt('Enter a name for this group chat');
    if (newName && newName !== '') {
        socket.emit('conversation:edit', {
            conversationId: currentConversationId,
            newData: newName
        });
    }
}

function toggleMemberList() {
    document.body.classList.toggle('member-list-toggled');
}

function updateInputSize() {
    const newlines = messageInput.value.split('\n').length;
    messageInput.style.height = newlines > 1 ? `calc(100% + ${19 * (newlines - 1)}px)` : '';
}

/**
 * Creates a notification with the provided header, details, and showTime
 * @param {string} header 
 * @param {string} [details] 
 * @param {number} [showTime] 
 */
function displayNotification(header, details, showTime) {
    showTime = showTime || 3000;

    const container = document.createElement('article');
    container.className = 'notification';

    const headerElement = document.createElement('p');
    headerElement.innerText = header;
    headerElement.className = 'header';
    container.appendChild(headerElement);

    if (details) {
        const detailsElement = document.createElement('p');
        detailsElement.innerText = details;
        detailsElement.className = 'details';
        container.appendChild(detailsElement);
    }

    const cleanup = () => {
        container.classList.add('hide');
        container.addEventListener('animationend', () => {
            container.remove();
        });
    };

    if (document.hasFocus()) {
        setTimeout(cleanup, showTime);
    } else {
        refocusQueue.push(() => setTimeout(cleanup, showTime));
    }

    notificationsContainer.appendChild(container);
}

function onVisibilityChanged() {
    if (document.visibilityState === 'visible') {
        if (refocusQueue.length > 0) {
            refocusQueue.forEach(func => {
                func();
            });
            refocusQueue = [];
        }
    }

}

// Socket event listeners
function setupSocketListeners() {
    socket.on('message:new', (message) => {
        if (message.conversation === currentConversationId) {
            messages.push(message);
            appendMessage(message);
            scrollToBottom();
        } else {
            const conversation = conversations.find((v => v._id == message.conversation && v.type !== 'dm'));
            displayNotification(message.sender.username + (conversation ? ' - ' + conversation.name : ''), message.text);
            if (canSendNotifications) {
                const notification = new Notification(message.sender.username + (conversation ? ' - ' + conversation.name : ''), { body: message.text });
                const existingNotifications = conversationNotifications.getOrInsert(message.conversation, []);
                existingNotifications.push(notification);
            }
        }

        // Load updated converstions
        loadConversations();
        // Update UI
        renderConversations();
    });

    socket.on('message:edited', (message) => {
        const index = messages.findIndex(m => m._id === message._id);
        if (index !== -1) {
            messages[index] = message;
            renderMessages();
        }
    });

    socket.on('message:deleted', ({ messageId }) => {
        const msgDiv = document.querySelector(`[data-id="${messageId}"]`);
        if (msgDiv) {
            msgDiv.querySelector('.message-text').textContent = '[deleted]';
            msgDiv.classList.add('deleted');
        }
    });

    socket.on('user:typing', ({ username, conversationId }) => {
        if (conversationId === currentConversationId) {
            typingUsernames.add(username);
            updateTypingIndicator();
        }
    });

    socket.on('user:stopped-typing', ({ username, conversationId }) => {
        if (conversationId === currentConversationId) {
            typingUsernames.delete(username);
            updateTypingIndicator();
        }
    });

    socket.on('user:online', ({ userId }) => {
        updateUserStatus(userId, true);
    });

    socket.on('user:offline', ({ userId }) => {
        updateUserStatus(userId, false);
    });

    socket.on('conversation:join', (newConversation) => {
        const existingIndex = conversations.findIndex(c => c._id === newConversation._id);
        if (existingIndex === -1) { // New
            displayNotification('Notice', 'You have been added to a conversation');
            conversations.unshift(newConversation);
        }
        
        selectConversation(newConversation._id);
    });

    socket.on('conversation:edit', (newData) => {
        const { newName, newMembers, conversationId } = newData;

        if (newName) {
            if (conversationId === currentConversationId) {
                conversationTitle.textContent = newName;
                document.title = newName + ' - ' + APP_NAME;
            }

            for (let convo of conversations) {
                if (convo._id === conversationId) {
                    convo.name = newName;
                    break;
                }
            }

            renderConversations();
        } else if (newMembers) {
            for (let convo of conversations) {
                if (convo._id === conversationId) {
                    convo.members = newMembers;
                    break;
                }
            }

            if (conversationId === currentConversationId) {
                renderMemberList();
            }
        } else {
            console.error('Invalid data recieved for conversation edit:', newData);
        }
    });

    socket.on('error', ({ message }) => {
        displayNotification('Error', message);
        console.error('Recieved socket error:', message);
    });

    socket.on('notice', ({ message }) => {
        displayNotification('Notice', message);
    });
}

// DOM event listeners
function setupEventListeners() {
    inputForm.addEventListener('submit', onFormSubmit);

    sendButton.addEventListener('click', sendMessage);

    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    messageInput.addEventListener('input', () => {
        updateInputSize();

        if (!currentConversationId) return;

        socket.emit('typing:start', currentConversationId);

        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            socket.emit('typing:stop', currentConversationId);
        }, 1000);
    });

    newConversationButton.addEventListener('click', promptNewConversation);

    editGroupNameButton.addEventListener('click', editGroupName);

    addMemberButton.addEventListener('click', promptAddMembers);

    toggleMemberListButton.addEventListener('click', toggleMemberList);

    document.addEventListener('visibilitychange', onVisibilityChanged);
}

function setupModalEventListeners() {
    userSearchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchUsers(e.target.value);
        }, 400);
    });

    // Close modal on background click
    userSelectModal.addEventListener('click', (e) => {
        if (e.target === userSelectModal) {
            setConversationModalVisible(false);
        }
    });

    userSelectSubmitButton.addEventListener('click', (e) => {
        if (selectSubmitMode === 'newConvo') {
            if (selectedUsers.size < 1) {
                console.warn('Cannot create new conversation: No users selected');
                displayNotification('Cannot create conversation', 'No users selected');
                return;
            }

            createConversation(selectedUsers);
        } else if (selectSubmitMode === 'addMembers') {
            // Convert selected users to expected array
            const addedArray = [];
            const currentConversation = getCurrentConversationData();
            if (!currentConversation) {
                console.warn('Cannot add members: No conversation selected');
                return;
            }
            
            const currentMembers = currentConversation.members;
            if (!currentMembers) {
                console.error('Cannot add members: No members selected');
                return;
            }

            // Find new users
            selectedUsers.forEach((user) => {
                // Ignore ourselves
                if (user._id === currentUser.id) return;

                // Check f the selected list doesn't include this user
                if (!currentMembers.includes(user)) {
                    addedArray.push({
                        userId: user._id,
                        added: true
                    });
                }
            });

            // Find removed users
            currentMembers.forEach((user) => {
                // Ignore ourselves
                if (user._id === currentUser.id) return;
                
                // Check if the selected list doesn't include this user
                if (!selectedUsers.has(user)) {
                    addedArray.push({
                        userId: user._id,
                        added: false
                    });
                }
            });

            updateMembersInConversation(addedArray);
        }

        setConversationModalVisible(false);
    });

    // Close button
    userSelectCloseButton.addEventListener('click', () => setConversationModalVisible(false));
}

function updateUserAvatar() {
    const userAvatars = document.querySelectorAll('.user-avatar');
    userAvatars.forEach(avatar => {
        if (avatar.dataset.self !== 'true') return;
        avatar.textContent = shortenName(currentUser.username.charAt(0).toUpperCase());
        avatar.style.backgroundColor = getColorDataWithHue(currentUser.colorHue);
    });
}

// Utility functions
function isDateNewerThan(targetDate, hours) {
    // Convert the targetDate to a Date object if it's not already one
    const dateToCheck = new Date(targetDate);

    // Get the current date and time
    const now = new Date();

    // Calculate the date N days ago
    const millisecondsPerHour = 1000 * 60;
    const daysAgoTimestamp = now.getTime() - (hours * millisecondsPerHour);
    const daysAgoDate = new Date(daysAgoTimestamp);

    // Compare the target date's timestamp to the days ago timestamp
    // A newer date has a larger timestamp value
    return dateToCheck.getTime() > daysAgoDate.getTime();
}

function getColorDataWithHue(colorHue) {
    return `hsl(${colorHue}, 60%, 50%)`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function setIncludesUserId(set, searchId) {
    for (const user of set) {
        const userId = user._id;
        if (userId && userId === searchId) {
            return true;
        }
    }

    return false;
}

function removeUserFromSet(set, removingId) {
    for (const user of set) {
        const userId = user._id;
        if (userId && userId === removingId) {
            set.delete(user);
            return;
        }
    }
}

function updateURLParameter(key, value) {
    const queryParams = new URLSearchParams(window.location.search);
    queryParams.set(key, value);

    const newURL = window.location.pathname + '?' + queryParams.toString();
    history.replaceState(null, null, newURL);
}

function getURLParameter(key) {
    const queryParams = new URLSearchParams(window.location.search);
    return queryParams.get(key);
}

/**
 * Returns the initials of a name (max 2 characters)
 * @param {string} name 
 */
function shortenName(name) {
    name = escapeHtml(name);
    if (name.length > 2) {
        const nameParts = name.trim().split(/\s+/); // Seperate by spaces
        return nameParts
            .map(part => part.charAt(0).toUpperCase()) // Get uppercase characters
            .join('') // Join them into the same string
            .slice(0, 2); // Cut off after the second character
    } else {
        return name.toUpperCase();
    }
}

/**
 * Formats a timestamp into an easy-to-read and relevate date string
 * @param {string} timestamp 
 * @returns {string} Formatted date string
 */
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const threeDaysAgo = new Date();
    const withinPast3Days = date.getTime() > threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const wasToday = withinPast3Days ? date.toDateString() === new Date(Date.now()).toDateString() : false;
    return wasToday
        ? 'Today ' + date.toLocaleString([], { hour: 'numeric', minute: 'numeric' }) // Today
        : withinPast3Days ? date.toLocaleString([], { weekday: 'long', hour: 'numeric', minute: 'numeric' }) // Past 3 days
            : date.toLocaleString([], { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' }); // Old
}

function scrollToBottom() {
    messageContainer.scrollTop = messageContainer.scrollHeight;
}

function getCurrentConversationData() {
    if (conversations.length === 0) {
        return null;
    }

    if (!currentConversationId) {
        return null;
    }

    const filtered = conversations.filter(v => v._id === currentConversationId);
    return filtered.length !== 0 ? filtered[0] : null;
}

function updateTypingIndicator() {
    const count = typingUsernames.size;
    if (count === 0) {
        typingIndicator.classList.remove('visible');
        return;
    }

    const usernames = Array.from(typingUsernames)
    typingIndicator.classList.add('visible');
    typingIndicator.textContent = usernames.join(', ') + ' is typing';
}

function updateUserStatus(userId, online) {
    // Update UI to show online/offline status
    loadConversations();
    renderMemberList();
}

function onFormSubmit(e) {
    e.preventDefault();
    // sendMessage();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
