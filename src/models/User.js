const { create } = require('connect-mongo');
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  uuid: {
    type: String,
    required: true,
    unique: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  online: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('User', userSchema);