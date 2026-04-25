const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const Apartment = require('./models/Apartment');
const Inventory = require('./models/Inventory');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Routes

// Get all apartments
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
    const apartment = new Apartment(req.body);
    try {
        const newApartment = await apartment.save();
        res.status(201).json(newApartment);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update apartment status/details
app.patch('/api/apartments/:id', async (req, res) => {
    try {
        const oldApt = await Apartment.findById(req.params.id);
        
        // Archive to history if the occupant name is changing and the old one wasn't empty
        if (oldApt.occupantName && req.body.occupantName !== oldApt.occupantName) {
            oldApt.allotmentHistory.push({
                occupantName: oldApt.occupantName,
                allotmentDate: oldApt.allotmentDate
            });
            
            // If a new person is moving in, update the allotment date to today
            if (req.body.occupantName) {
                req.body.allotmentDate = new Date();
            }
            
            await oldApt.save();
        }

        const updatedApartment = await Apartment.findByIdAndUpdate(req.params.id, req.body, { new: true });
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
app.get('/api/inventory/:apartmentId', async (req, res) => {
    try {
        const items = await Inventory.find({ apartmentId: req.params.apartmentId });
        res.json(items);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/inventory', async (req, res) => {
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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
