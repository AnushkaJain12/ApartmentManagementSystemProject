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

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

app.get(["/", "/admin"], (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");

    mongoose.connection.db
      .collection("apartments")
      .dropIndex("unitId_1")
      .then(() => console.log("Dropped unitId_1 index"))
      .catch((err) => {
        if (err.code !== 27) {
          console.error("Error dropping index:", err.message);
        }
      });
  })
  .catch((err) => console.error("MongoDB connection error:", err));

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

app.post("/api/login", async (req, res) => {
  const { username, password, role } = req.body;

  try {
    if (role === "admin") {
      if (username === "admin" && password === "admin") {
        return res.json({ role: "admin", user: { name: "Administrator" } });
      }
      return res.status(401).json({ message: "Invalid Admin Credentials" });
    }

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

app.post("/api/faculty", async (req, res) => {
  try {
    const { facultyId, name, role, department } = req.body;

    const alreadyExists = await Faculty.findOne({ facultyId });
    if (alreadyExists) {
      return res.status(400).json({ message: "Faculty ID already exists" });
    }

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

app.get("/api/faculty", async (req, res) => {
  try {
    const facultyList = await Faculty.find().select("-password");
    res.json(facultyList);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

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

app.get("/api/apartments", async (req, res) => {
  try {
    const apartments = await Apartment.find();
    res.json(apartments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/apartments", async (req, res) => {
  try {
    const { apartmentNumber } = req.body;

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

app.patch("/api/apartments/:id", async (req, res) => {
  try {
    const { facultyId, status } = req.body;
    const apartmentId = req.params.id;

    const currentApt = await Apartment.findById(apartmentId);
    if (!currentApt)
      return res.status(404).json({ message: "Apartment not found" });

    if (status === "Occupied" && facultyId) {
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

      const faculty = await Faculty.findOne({ facultyId });
      if (!faculty) {
        return res
          .status(400)
          .json({
            message: "No registered faculty account found with this ID.",
          });
      }

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
      else if (facultyRole === "Other") eligible = true;

      if (!eligible) {
        return res.status(400).json({
          message: `Eligibility Error: A ${facultyRole} is not eligible for ${blockName}. Please check LNMIIT housing policies.`,
        });
      }

      req.body.occupantName = faculty.name;
    }

    if (status === "Available" || status === "Maintenance") {
      req.body.occupantName = "";
      req.body.facultyId = "";
      req.body.allotmentDate = null;
    }

    if (
      currentApt.occupantName &&
      req.body.occupantName !== currentApt.occupantName
    ) {
      currentApt.allotmentHistory.push({
        occupantName: currentApt.occupantName,
        facultyId: currentApt.facultyId,
        allotmentDate: currentApt.allotmentDate,
      });

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

app.delete("/api/apartments/:id", async (req, res) => {
  try {
    await Apartment.findByIdAndDelete(req.params.id);
    res.json({ message: "Apartment deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

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

app.get("/api/inventory/:apartmentId", async (req, res) => {
  try {
    const items = await Inventory.find({ apartmentId: req.params.apartmentId });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/inventory", async (req, res) => {
  const { itemName } = req.body;

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

app.delete("/api/inventory/:id", async (req, res) => {
  try {
    await Inventory.findByIdAndDelete(req.params.id);
    res.json({ message: "Item removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

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

app.get("/api/activities", async (req, res) => {
  try {
    const activities = await Activity.find().sort({ createdAt: -1 });
    res.json(activities);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
