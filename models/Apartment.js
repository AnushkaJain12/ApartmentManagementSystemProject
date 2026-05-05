const mongoose = require("mongoose");

// schema for each apartment/housing unit
const apartmentSchema = new mongoose.Schema(
  {
    block: {
      type: String,
      required: true,
      enum: [
        "Associate Professor Housing",
        "Professor Housing",
        "Assistant Professor Housing",
        "Grade 3 Housing",
        "Grade 4 Housing",
      ],
    },
    apartmentNumber: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["1BHK", "2BHK", "3BHK", "Villa"],
    },
    floor: {
      type: Number,
      required: true,
    },
    capacity: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      default: "Available",
      enum: ["Available", "Occupied", "Maintenance"],
    },
    amenities: {
      type: [String],
      default: [],
    },
    // who is currently living here
    occupantName: {
      type: String,
      default: "",
    },
    facultyId: {
      type: String,
      default: null,
    },
    allotmentDate: {
      type: Date,
      default: null,
    },
    // keep a record of past occupants
    allotmentHistory: [
      {
        occupantName: String,
        facultyId: String,
        allotmentDate: Date,
        vacatedDate: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Apartment", apartmentSchema);
