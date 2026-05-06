const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 1,
    },
    condition: {
      type: String,
      required: true,
      enum: ["New", "Good", "Damaged", "Needs Replacement"],
      default: "Good",
    },
    apartmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Apartment",
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Inventory", inventorySchema);
