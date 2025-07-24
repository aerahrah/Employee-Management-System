const Admin = require('../models/adminModel');

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

    res.json({ message: 'Login successful' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
