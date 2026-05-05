const mongoose = require("mongoose");
require("dotenv").config();
const Inventory = require("../models/Inventory");

// one-time cleanup script to remove any items with purely numeric names
// (these got in by mistake during early testing)
async function cleanupBadItems() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // delete items where the name is just a number like "123"
    const result = await Inventory.deleteMany({
      itemName: { $regex: /^[0-9]+$/ },
    });

    console.log(`Deleted ${result.deletedCount} items with numeric names.`);

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (err) {
    console.error("Cleanup failed:", err);
    process.exit(1);
  }
}

cleanupBadItems();
