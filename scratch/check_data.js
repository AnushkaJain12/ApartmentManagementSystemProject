const mongoose = require("mongoose");
require("dotenv").config();
const Faculty = require("../models/Faculty");
const Apartment = require("../models/Apartment");

// run this script to see what's in the database (for debugging)
async function checkData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const faculties = await Faculty.find();
    const apartments = await Apartment.find();

    console.log("--- FACULTIES ---");
    console.log(JSON.stringify(faculties, null, 2));

    console.log("--- APARTMENTS ---");
    console.log(JSON.stringify(apartments, null, 2));

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkData();
