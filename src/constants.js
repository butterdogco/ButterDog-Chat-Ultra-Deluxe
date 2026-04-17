const constants = {
    MESSAGE_MAX_LENGTH: 1000, // Characters
    MESSAGE_EDIT_WINDOW: 10, // Minutes
    MESSAGE_DELETE_REPLACEMENT: '[deleted]', // Text to replace deleted messages with

    USER_PUBLIC_PROPERTIES: "username colorHue online bot", // Properties returned for generic user requests
    USER_CONVERSATION_PUBLIC_PROPERTIES: "username colorHue online bot", // Properties returned for user list requests
    USER_MESSAGE_PUBLIC_PROPERTIES: "username colorHue bot", // Properties returned for user message requests

    CONVERSATION_GROUP_ALLOWED_CHARACTERS: /^[a-zA-Z0-9 _-]+$/, // Allowed characters for conversation names (letters, numbers, spaces, underscores, hyphens)
    CONVERSATION_GROUP_MIN_NAME_LENGTH: 2, // Minimum conversation name length
    CONVERSATION_GROUP_MAX_NAME_LENGTH: 20, // Maximum conversation name length

    USERNAME_ALLOWED_CHARACTERS: /^[a-zA-Z0-9_-]+$/, // Allowed characters for usernames (letters, numbers, underscores, hyphens)
    USERNAME_MIN_LENGTH: 3, // Minimum username length
    USERNAME_MAX_LENGTH: 20, // Maximum username length
    PASSWORD_MIN_LENGTH: 8, // Minimum password length
    PASSWORD_MAX_LENGTH: 256, // Maximum password length
};

if (typeof module !== 'undefined' && typeof exports !== 'undefined') {
    module.exports = constants;
} else {
    globalThis.constants = constants;
}