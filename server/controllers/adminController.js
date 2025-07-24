const Admin = require('../models/adminModel');
const jwt = require('jsonwebtoken');

// Register new admin
exports.registerAdmin = async (req, res) => {
  try {
    const existing = await Admin.findOne({ username: req.body.username });
    if (existing) return res.status(400).json({ message: 'Username already exists' });

    const admin = new Admin(req.body);
    await admin.save();
    res.status(201).json({ message: 'Admin registered' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Login admin
exports.loginAdmin = async (req, res) => {
  try {
    const admin = await Admin.findOne({ username: req.body.username });
    if (!admin) return res.status(401).json({ message: 'Invalid username or password' });

    const isMatch = await admin.comparePassword(req.body.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid username or password' });

    const payload = {
      id: admin._id,
      username: admin.username
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d'
    });

    res.json({
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        username: admin.username
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};