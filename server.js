const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const Apartment = require("./models/Apartment");
const Inventory = require("./models/Inventory");
const Faculty = require("./models/Faculty");
const Activity = require("./models/Activity");
const bcrypt = require("bcryptjs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

// basic middleware setup
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// serve the main page for both root and /admin
app.get(["/", "/admin"], (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// connect to mongodb
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");

    // drop old index that causes problems
    mongoose.connection.db
      .collection("apartments")
      .dropIndex("unitId_1")
      .then(() => console.log("Dropped unitId_1 index"))
      .catch((err) => {
        // error code 27 means index not found, that's fine
        if (err.code !== 27) {
          console.error("Error dropping index:", err.message);
        }
      });
  })
  .catch((err) => console.error("MongoDB connection error:", err));

// helper to save an activity log entry
async function saveActivity(
  type,
  description,
  color = "#3498db",
  icon = "https://img.icons8.com/ios-filled/50/3498db/activity.png",
) {
  try {
    const newActivity = new Activity({ type, description, color, icon });
    await newActivity.save();
  } catch (err) {
    console.error("Could not save activity:", err);
  }
}

// --- AUTH ROUTES ---

app.post("/api/login", async (req, res) => {
  const { username, password, role } = req.body;

  try {
    if (role === "admin") {
      // simple static admin check for now
      if (username === "admin" && password === "admin") {
        return res.json({ role: "admin", user: { name: "Administrator" } });
      }
      return res.status(401).json({ message: "Invalid Admin Credentials" });
    }

    // faculty login
    const faculty = await Faculty.findOne({ facultyId: username });
    if (!faculty) {
      return res.status(401).json({ message: "Faculty ID not found" });
    }

    const passwordMatch = await bcrypt.compare(password, faculty.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid Password" });
    }

    res.json({
      role: "user",
      user: faculty,
      firstLogin: faculty.firstLogin,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- FACULTY ROUTES ---

// add a new faculty account
app.post("/api/faculty", async (req, res) => {
  try {
    const { facultyId, name, role, department } = req.body;

    // check if this faculty ID already exists
    const alreadyExists = await Faculty.findOne({ facultyId });
    if (alreadyExists) {
      return res.status(400).json({ message: "Faculty ID already exists" });
    }

    // default password is FacultyID@123
    const defaultPassword = `${facultyId}@123`;
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const newFaculty = new Faculty({
      facultyId,
      name,
      role,
      department,
      password: hashedPassword,
      firstLogin: true,
    });

    await newFaculty.save();
    await saveActivity(
      "Faculty Registration",
      `New faculty registered: ${name}`,
      "#27ae60",
      "https://img.icons8.com/ios-filled/50/27ae60/add-user-group-man-man.png",
    );
    res.status(201).json(newFaculty);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// get all faculty (without passwords)
app.get("/api/faculty", async (req, res) => {
  try {
    const facultyList = await Faculty.find().select("-password");
    res.json(facultyList);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// change password (used on first login)
app.patch("/api/faculty/change-password", async (req, res) => {
  const { facultyId, newPassword } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await Faculty.findOneAndUpdate(
      { facultyId },
      { password: hashedPassword, firstLogin: false },
    );
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// --- APARTMENT ROUTES ---

// get all apartments
app.get("/api/apartments", async (req, res) => {
  try {
    const apartments = await Apartment.find();
    res.json(apartments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// register a new apartment unit
app.post("/api/apartments", async (req, res) => {
  try {
    const { apartmentNumber } = req.body;

    // make sure this unit number doesn't already exist
    const duplicate = await Apartment.findOne({ apartmentNumber });
    if (duplicate) {
      return res
        .status(400)
        .json({
          message: `Apartment number ${apartmentNumber} already exists!`,
        });
    }

    const apartment = new Apartment(req.body);
    const savedApartment = await apartment.save();
    await saveActivity(
      "Unit Registration",
      `New unit registered: Unit ${apartmentNumber} (${req.body.block})`,
      "#f39c12",
      "https://img.icons8.com/ios-filled/50/f39c12/home.png",
    );
    res.status(201).json(savedApartment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// update apartment details (allotment, status, etc.)
app.patch("/api/apartments/:id", async (req, res) => {
  try {
    const { facultyId, status } = req.body;
    const apartmentId = req.params.id;

    // get current apartment data first
    const currentApt = await Apartment.findById(apartmentId);
    if (!currentApt)
      return res.status(404).json({ message: "Apartment not found" });

    // if we're assigning this to someone, do some checks
    if (status === "Occupied" && facultyId) {
      // check this faculty isn't already assigned somewhere else
      const alreadyAssigned = await Apartment.findOne({
        facultyId,
        _id: { $ne: apartmentId },
        status: "Occupied",
      });
      if (alreadyAssigned) {
        return res
          .status(400)
          .json({
            message: `Faculty ID ${facultyId} is already assigned to Unit ${alreadyAssigned.apartmentNumber}!`,
          });
      }

      // make sure this faculty account exists
      const faculty = await Faculty.findOne({ facultyId });
      if (!faculty) {
        return res
          .status(400)
          .json({
            message: "No registered faculty account found with this ID.",
          });
      }

      // check if the faculty role matches the block type
      const facultyRole = faculty.role;
      const blockName = currentApt.block;
      let eligible = false;

      if (facultyRole === "Professor" && blockName === "Professor Housing")
        eligible = true;
      else if (
        facultyRole === "Associate Professor" &&
        blockName === "Associate Professor Housing"
      )
        eligible = true;
      else if (
        facultyRole === "Assistant Professor" &&
        blockName === "Assistant Professor Housing"
      )
        eligible = true;
      else if (
        facultyRole === "Staff" &&
        (blockName === "Grade 3 Housing" || blockName === "Grade 4 Housing")
      )
        eligible = true;
      else if (facultyRole === "Other") eligible = true; // other role gets some flexibility

      if (!eligible) {
        return res.status(400).json({
          message: `Eligibility Error: A ${facultyRole} is not eligible for ${blockName}. Please check LNMIIT housing policies.`,
        });
      }

      // use the official name from faculty account
      req.body.occupantName = faculty.name;
    }

    // if making available or maintenance, clear the occupant info
    if (status === "Available" || status === "Maintenance") {
      req.body.occupantName = "";
      req.body.facultyId = "";
      req.body.allotmentDate = null;
    }

    // save old occupant to history if they are being replaced
    if (
      currentApt.occupantName &&
      req.body.occupantName !== currentApt.occupantName
    ) {
      currentApt.allotmentHistory.push({
        occupantName: currentApt.occupantName,
        facultyId: currentApt.facultyId,
        allotmentDate: currentApt.allotmentDate,
      });

      // set today as new allotment date if someone is moving in
      if (req.body.occupantName) {
        req.body.allotmentDate = new Date();
      }

      await currentApt.save();
    }

    const updatedApt = await Apartment.findByIdAndUpdate(
      apartmentId,
      req.body,
      { new: true },
    );

    if (status === "Occupied") {
      await saveActivity(
        "Unit Allotment",
        `Unit ${updatedApt.apartmentNumber} (${updatedApt.block}) Allotted to ${updatedApt.occupantName}`,
        "#3498db",
        "https://img.icons8.com/ios-filled/50/3498db/home.png",
      );
    }

    res.json(updatedApt);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// delete an apartment
app.delete("/api/apartments/:id", async (req, res) => {
  try {
    await Apartment.findByIdAndDelete(req.params.id);
    res.json({ message: "Apartment deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- INVENTORY ROUTES ---

// get all inventory (with apartment info)
app.get("/api/inventory", async (req, res) => {
  try {
    const items = await Inventory.find().populate(
      "apartmentId",
      "apartmentNumber block",
    );
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// get inventory for a specific apartment
app.get("/api/inventory/:apartmentId", async (req, res) => {
  try {
    const items = await Inventory.find({ apartmentId: req.params.apartmentId });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// add a new inventory item
app.post("/api/inventory", async (req, res) => {
  const { itemName } = req.body;

  // item names shouldn't have numbers
  if (/\d/.test(itemName)) {
    return res
      .status(400)
      .json({
        message:
          "Item name cannot contain numbers. Please enter a proper name.",
      });
  }

  const newItem = new Inventory(req.body);
  try {
    const saved = await newItem.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// update an inventory item
app.patch("/api/inventory/:id", async (req, res) => {
  try {
    const updated = await Inventory.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// delete an inventory item
app.delete("/api/inventory/:id", async (req, res) => {
  try {
    await Inventory.findByIdAndDelete(req.params.id);
    res.json({ message: "Item removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- STATS ROUTE ---

app.get("/api/stats", async (req, res) => {
  try {
    const total = await Apartment.countDocuments();
    const available = await Apartment.countDocuments({ status: "Available" });
    const occupied = await Apartment.countDocuments({ status: "Occupied" });
    const maintenance = await Apartment.countDocuments({
      status: "Maintenance",
    });
    res.json({ total, available, occupied, maintenance });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- ACTIVITY ROUTE ---

app.get("/api/activities", async (req, res) => {
  try {
    // newest first
    const activities = await Activity.find().sort({ createdAt: -1 });
    res.json(activities);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
