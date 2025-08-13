const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/authMiddleware');
const {
  addEmployee,
  getEmployees,
} = require('../controllers/employeeController');

router.post('/', authenticateToken, addEmployee);
router.get('/', authenticateToken, getEmployees);


module.exports = router;