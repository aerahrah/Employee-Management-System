const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    unique: true,
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    lowercase: true
  },
  phone: {
    type: String
  },
  position: {
    type: String,
    required: true
  },
  department: {
    type: String
  },
  dateHired: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Resigned', 'Terminated'],
    default: 'Active'
  },
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    province: { type: String, trim: true }
  },
  emergencyContact: {
    name: { type: String, trim: true },
    phone: { type: String },
    relation: { type: String, trim: true }
  }
}, {
  timestamps: true 
});

module.exports = mongoose.model('Employee', employeeSchema);
