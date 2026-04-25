const mongoose = require('mongoose');

const apartmentSchema = new mongoose.Schema({
    block: {
        type: String,
        required: true,
        enum: [
            'Associate Professor Housing',
            'Professor Housing',
            'Assistant Professor Housing',
            'Director House',
            'Grade 3 Housing',
            'Grade 4 Housing'
        ]
    },
    apartmentNumber: {
        type: String,
        required: true,
        unique: true
    },
    type: {
        type: String,
        required: true,
        enum: ['1BHK', '2BHK', '3BHK', 'Villa']
    },
    floor: {
        type: Number,
        required: true
    },
    capacity: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        default: 'Available',
        enum: ['Available', 'Occupied', 'Maintenance']
    },
    amenities: {
        type: [String],
        default: []
    },
    occupantName: {
        type: String,
        default: ''
    },
    allotmentDate: {
        type: Date,
        default: null
    },
    allotmentHistory: [{
        occupantName: String,
        allotmentDate: Date,
        vacatedDate: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Apartment', apartmentSchema);
