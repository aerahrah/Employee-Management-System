const Employee = require('../models/employeeModel');

const addEmployee = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      position,
      department,
      dateHired,
      status,
      address,
      emergencyContact,
      employeeId 
    } = req.body;

    const newEmployee = new Employee({
      firstName,
      lastName,
      email,
      phone,
      position,
      department,
      dateHired,
      status,
      address,
      emergencyContact,
      employeeId 
    });

    await newEmployee.save();

    res.status(201).json({
      success: true,
      message: 'Employee added successfully',
      data: newEmployee
    });
  } catch (error) {
    console.error('Error adding employee:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding employee',
      error: error.message
    });
  }
};

const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find();
    res.status(200).json({
      success: true,
      count: employees.length,
      data: employees
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching employees',
      error: error.message
    });
  }
};


module.exports = {
  addEmployee,
  getEmployees
};