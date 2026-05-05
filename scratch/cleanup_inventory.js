const mongoose = require('mongoose');
require('dotenv').config();
const Inventory = require('../models/Inventory');

async function cleanup() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Delete items where itemName is just a number
        const result = await Inventory.deleteMany({
            itemName: { $regex: /^[0-9]+$/ }
        });

        console.log(`Deleted ${result.deletedCount} items with numeric names.`);
        
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    } catch (err) {
        console.error('Error during cleanup:', err);
        process.exit(1);
    }
}

cleanup();
