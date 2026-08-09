// routes/leaveCreditRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");

// Set up temporary storage for uploaded memos before the controller moves them
const upload = multer({ dest: "uploads/temp/" });

const {
  authenticateToken,
  authorize,
} = require("../middlewares/authMiddleware.js");

// --- CONTROLLERS ---
const {
  addLeaveCreditRequest,
  rollbackLeaveCreditRequest,
  updateLeaveBalances,
  getAllLeaveCreditRequests,
  getEmployeeDetails,
  getEmployeeLeaveCredits,
} = require("../controllers/leaveCreditController.js");

// --- AUTH HELPERS ---
const requirePerm = (perm) => [authenticateToken, authorize(perm)];

/* =========================================
   LEAVE CREDITS (HR / ADMIN FLOW & SELF-SERVICE)
========================================= */

// Get basic details of an employee for the crediting form
router.get(
  "/employee-details/:employeeId",
  ...requirePerm("leave_credits.view_all"),
  getEmployeeDetails,
);

// Add Leave Credits (VL/SL) to employees
router.post(
  "/add",
  ...requirePerm("leave_credits.manage"),
  upload.single("file"), // Matches the frontend FormData field name for the memo upload
  addLeaveCreditRequest,
);

// Rollback a credited memo
router.put(
  "/:creditId/rollback",
  ...requirePerm("leave_credits.manage"),
  rollbackLeaveCreditRequest,
);

// Directly update/initialize leave balances for Organic employees
router.put(
  "/employee/:employeeId/balances",
  ...requirePerm("leave_credits.manage"),
  updateLeaveBalances,
);

// Get a list of all credited memos (Admin/HR view)
router.get(
  "/all",
  ...requirePerm("leave_credits.view_all"),
  getAllLeaveCreditRequests,
);

// Get credit history for a specific employee (Admin/HR view)
router.get(
  "/employee/:employeeId",
  ...requirePerm("leave_credits.view_all"),
  getEmployeeLeaveCredits,
);

// Get personal credit history (Self-service view)
router.get(
  "/my-credits",
  ...requirePerm("leave_credits.view_self"),
  getEmployeeLeaveCredits,
);

module.exports = router;
