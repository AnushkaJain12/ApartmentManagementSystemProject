const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: [
        "Faculty Registration",
        "Unit Allotment",
        "Unit Registration",
        "Facility Update",
        "Inventory Update",
      ],
    },
    description: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      default: "https://img.icons8.com/ios-filled/50/3498db/activity.png",
    },
    color: {
      type: String,
      default: "#3498db",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Activity", activitySchema);
