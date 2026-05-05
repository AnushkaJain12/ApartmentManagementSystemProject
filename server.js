const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const Apartment = require('./models/Apartment');
const Inventory = require('./models/Inventory');
const Faculty = require('./models/Faculty');
const Activity = require('./models/Activity');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const path = require('path');

// Serve index.html for root and admin paths
app.get(['/', '/admin'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('Connected to MongoDB');
        // Drop problematic leftover index if it exists
        mongoose.connection.db.collection('apartments').dropIndex('unitId_1')
            .then(() => console.log('Dropped unitId_1 index'))
            .catch(err => {
                if (err.code !== 27) { // IndexNotFound error code
                    console.error('Error dropping index:', err.message);
                }
            });
    })
    .catch(err => console.error('MongoDB connection error:', err));

// Helper for logging activity
async function logActivity(type, description, color = '#3498db', icon = 'https://img.icons8.com/ios-filled/50/3498db/activity.png') {
    try {
        const activity = new Activity({ type, description, color, icon });
        await activity.save();
    } catch (err) {
        console.error('Error logging activity:', err);
    }
}

// Authentication Routes
app.post('/api/login', async (req, res) => {
    const { username, password, role } = req.body;
    try {
        if (role === 'admin') {
            // Static admin login for now (as requested previously)
            if (username === 'admin' && password === 'admin') {
                return res.json({ role: 'admin', user: { name: 'Administrator' } });
            }
            return res.status(401).json({ message: 'Invalid Admin Credentials' });
        }

        // Faculty login
        const faculty = await Faculty.findOne({ facultyId: username });
        if (!faculty) {
            return res.status(401).json({ message: 'Faculty ID not found' });
        }

        const isMatch = await bcrypt.compare(password, faculty.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid Password' });
        }

        res.json({
            role: 'user',
            user: faculty,
            firstLogin: faculty.firstLogin
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Faculty Management (Admin Only)
app.post('/api/faculty', async (req, res) => {
    try {
        const { facultyId, name, role, department } = req.body;
        
        // Check if exists
        const existing = await Faculty.findOne({ facultyId });
        if (existing) return res.status(400).json({ message: 'Faculty ID already exists' });

        // Default password: FacultyID@123
        const defaultPassword = `${facultyId}@123`;
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        const newFaculty = new Faculty({
            facultyId,
            name,
            role,
            department,
            password: hashedPassword,
            firstLogin: true
        });

        await newFaculty.save();
        await logActivity('Faculty Registration', `New faculty registered: ${name}`, '#27ae60', 'https://img.icons8.com/ios-filled/50/27ae60/add-user-group-man-man.png');
        res.status(201).json(newFaculty);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.get('/api/faculty', async (req, res) => {
    try {
        const faculties = await Faculty.find().select('-password');
        res.json(faculties);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.patch('/api/faculty/change-password', async (req, res) => {
    const { facultyId, newPassword } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await Faculty.findOneAndUpdate(
            { facultyId },
            { password: hashedPassword, firstLogin: false }
        );
        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Apartment Routes
app.get('/api/apartments', async (req, res) => {
    try {
        const apartments = await Apartment.find();
        res.json(apartments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add new apartment
app.post('/api/apartments', async (req, res) => {
    try {
        const { apartmentNumber } = req.body;
        const existing = await Apartment.findOne({ apartmentNumber });
        if (existing) {
            return res.status(400).json({ message: `Apartment number ${apartmentNumber} already exists!` });
        }
        
        const apartment = new Apartment(req.body);
        const newApartment = await apartment.save();
        await logActivity('Unit Registration', `New unit registered: Unit ${apartmentNumber} (${req.body.block})`, '#f39c12', 'https://img.icons8.com/ios-filled/50/f39c12/home.png');
        res.status(201).json(newApartment);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update apartment status/details
app.patch('/api/apartments/:id', async (req, res) => {
    try {
        const { facultyId, status } = req.body;
        const apartmentId = req.params.id;
        
        // Fetch current apartment data
        const oldApt = await Apartment.findById(apartmentId);
        if (!oldApt) return res.status(404).json({ message: 'Apartment not found' });

        // VALIDATION: If allotting to a faculty member
        if (status === 'Occupied' && facultyId) {
            // 1. Check for Unique ID (Ensure this ID doesn't already have a house)
            const duplicate = await Apartment.findOne({ facultyId, _id: { $ne: apartmentId }, status: 'Occupied' });
            if (duplicate) {
                return res.status(400).json({ message: `Faculty ID ${facultyId} is already assigned to Unit ${duplicate.apartmentNumber}!` });
            }

            // 2. Role-Based Eligibility Check
            const faculty = await Faculty.findOne({ facultyId });
            if (!faculty) {
                return res.status(400).json({ message: 'No registered faculty account found with this ID.' });
            }

            const role = faculty.role;
            const block = oldApt.block;
            let isEligible = false;

            if (role === 'Professor' && block === 'Professor Housing') isEligible = true;
            else if (role === 'Associate Professor' && block === 'Associate Professor Housing') isEligible = true;
            else if (role === 'Assistant Professor' && block === 'Assistant Professor Housing') isEligible = true;
            else if (role === 'Staff' && (block === 'Grade 3 Housing' || block === 'Grade 4 Housing')) isEligible = true;
            else if (role === 'Other') isEligible = true; // Flexibility for 'Other' role

            if (!isEligible) {
                return res.status(400).json({ 
                    message: `Eligibility Error: A ${role} is not eligible for ${block}. Please check LNMIIT housing policies.` 
                });
            }
            
            // Auto-fill name from faculty account if not provided
            if (!req.body.occupantName) req.body.occupantName = faculty.name;
        }
        
        // Archive to history if the occupant name is changing and the old one wasn't empty
        if (oldApt.occupantName && req.body.occupantName !== oldApt.occupantName) {
            oldApt.allotmentHistory.push({
                occupantName: oldApt.occupantName,
                facultyId: oldApt.facultyId,
                allotmentDate: oldApt.allotmentDate
            });
            
            // If a new person is moving in, update the allotment date to today
            if (req.body.occupantName) {
                req.body.allotmentDate = new Date();
            }
            
            await oldApt.save();
        }

        const updatedApartment = await Apartment.findByIdAndUpdate(apartmentId, req.body, { new: true });
        
        if (status === 'Occupied') {
            await logActivity('Unit Allotment', `Unit ${updatedApartment.apartmentNumber} (${updatedApartment.block}) Allotted to ${updatedApartment.occupantName}`, '#3498db', 'https://img.icons8.com/ios-filled/50/3498db/home.png');
        }

        res.json(updatedApartment);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete apartment
app.delete('/api/apartments/:id', async (req, res) => {
    try {
        await Apartment.findByIdAndDelete(req.params.id);
        res.json({ message: 'Apartment deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Inventory Routes
app.get('/api/inventory', async (req, res) => {
    try {
        const items = await Inventory.find().populate('apartmentId', 'apartmentNumber block');
        res.json(items);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/inventory/:apartmentId', async (req, res) => {
    try {
        const items = await Inventory.find({ apartmentId: req.params.apartmentId });
        res.json(items);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/inventory', async (req, res) => {
    const { itemName } = req.body;
    if (/\d/.test(itemName)) {
        return res.status(400).json({ message: 'Item name cannot contain numbers. Please enter a proper name.' });
    }
    const item = new Inventory(req.body);
    try {
        const newItem = await item.save();
        res.status(201).json(newItem);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.patch('/api/inventory/:id', async (req, res) => {
    try {
        const updatedItem = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedItem);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.delete('/api/inventory/:id', async (req, res) => {
    try {
        await Inventory.findByIdAndDelete(req.params.id);
        res.json({ message: 'Item removed' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Summary Stats
app.get('/api/stats', async (req, res) => {
    try {
        const total = await Apartment.countDocuments();
        const available = await Apartment.countDocuments({ status: 'Available' });
        const occupied = await Apartment.countDocuments({ status: 'Occupied' });
        const maintenance = await Apartment.countDocuments({ status: 'Maintenance' });
        res.json({ total, available, occupied, maintenance });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Activities Route
app.get('/api/activities', async (req, res) => {
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
