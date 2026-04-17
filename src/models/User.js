const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true, }, // bcrypt hash
    colorHue: { type: Number, default: 200 }, // 0 - 360 for profile color
    joinedAt: { type: Date, default: Date.now }, // join/creation date
    online: { type: Boolean, default: false }, // online status
    bot: { type: Boolean, default: false }, // is this user a bot account?
});

module.exports = mongoose.model('User', UserSchema);