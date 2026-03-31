const constants = {
    MESSAGE_MAX_LENGTH: 1000, // Characters
    MESSAGE_EDIT_WINDOW: 10, // Minutes
    USER_PUBLIC_PROPERTIES: "username colorHue online", // Properties returned for generic user requests
    USER_CONVERSATION_PUBLIC_PROPERTIES: "username colorHue online", // Properties returned for user list requests
    USER_MESSAGE_PUBLIC_PROPERTIES: "username colorHue" // Properties returned for user message requests
};

if (typeof module !== 'undefined' && typeof exports !== 'undefined') {
    module.exports = constants;
} else {
    globalThis.constants = constants;
}