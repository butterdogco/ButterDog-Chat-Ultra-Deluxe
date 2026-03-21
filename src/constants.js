const constants = {
    MESSAGE_MAX_LENGTH: 1000, // Characters
    MESSAGE_EDIT_WINDOW: 10 // Minutes
};

if (typeof module !== 'undefined' && typeof exports !== 'undefined') {
    module.exports = constants;
} else {
    globalThis.constants = constants;
}