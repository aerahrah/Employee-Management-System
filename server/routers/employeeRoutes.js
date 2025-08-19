const express = require("express");
const router = express.Router();
const authenticateToken = require("../middlewares/authMiddleware");
const {
  addEmployee,
  getEmployees,
  getEmployeeById,
} = require("../controllers/employeeController");

router.post("/", authenticateToken, addEmployee);
router.get("/", authenticateToken, getEmployees);
router.get("/:id", authenticateToken, getEmployeeById);

module.exports = router;
