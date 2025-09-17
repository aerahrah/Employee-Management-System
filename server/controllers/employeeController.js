const Employee = require("../models/employeeModel");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const jwt = require("jsonwebtoken");

const createEmployee = async (req, res) => {
  try {
    const { employeeId, username, email, firstName, lastName, position, role } =
      req.body;

    const existing = await Employee.findOne({
      $or: [{ employeeId }, { username }, { email }],
    });
    if (existing) {
      return res.status(400).json({
        message: "Employee with this ID, username, or email already exists",
      });
    }

    const tempPassword = crypto.randomBytes(6).toString("hex");

    const employee = new Employee({
      employeeId,
      username,
      email,
      firstName,
      lastName,
      position,
      role,
      password: tempPassword,
    });

    console.log("Before save:", employee.password);
    await employee.save();
    console.log("After save:", employee.password);

    if (email) {
      await sendEmail(
        email,
        "Your HRMS Account",
        `Hello ${firstName},\n\nYour account has been created.\nUsername: ${username}\nTemporary Password: ${tempPassword}\n\nPlease log in and change your password immediately.`
      );
    }

    res.status(201).json({
      message: "Employee created with temporary password",
      data: {
        id: employee._id,
        username: employee.username,
        email: employee.email,
        tempPassword, // ⚠️ send only if you want admin to see it
      },
    });
  } catch (err) {
    console.error("Error creating employee:", err);
    res.status(500).json({ message: err.message });
  }
};

const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find();
    res.status(200).json({
      success: true,
      count: employees.length,
      data: employees,
    });
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching employees",
      error: error.message,
    });
  }
};

const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findById(id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: `Employee with ID ${id} not found`,
      });
    }

    res.status(200).json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error("Error fetching employee:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching employee",
      error: error.message,
    });
  }
};

const signInEmployee = async (req, res) => {
  try {
    const employee = await Employee.findOne({ username: req.body.username });
    if (!employee)
      return res.status(401).json({ message: "Invalid username or password" });

    const isMatch = await employee.comparePassword(req.body.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid username or password" });

    const payload = {
      id: employee._id,
      username: employee.username,
      role: employee.role,
    };

    // ✅ Use secret key from environment
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || "supersecretkey123",
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "1d",
      }
    );

    return res.json({ message: "Login successful", token, admin: payload });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createEmployee,
  getEmployees,
  getEmployeeById,
  signInEmployee,
};
