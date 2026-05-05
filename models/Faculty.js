const mongoose = require("mongoose");

// each faculty member who can log in to the system
const facultySchema = new mongoose.Schema({
  facultyId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
    enum: [
      "Professor",
      "Associate Professor",
      "Assistant Professor",
      "Staff",
      "Warden",
      "Other",
    ],
  },
  department: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  // true until they change their default password
  firstLogin: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Faculty", facultySchema);
