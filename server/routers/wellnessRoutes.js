// routes/wellnessRoutes.js
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
  // Approver-side
  getPendingCountForWellnessApproverController,
  getWellnessApplicationsForApprover,
  getWellnessApplicationById,
  approveWellnessApplication,
  rejectWellnessApplication,
} = require("../controllers/wellnessApplicationApprovalController.js");

const {
  // Applications (employee/admin view)
  addWellnessApplicationRequest,
  getAllWellnessApplicationsRequest,
  getWellnessApplicationsByEmployeeRequest,
  cancelWellnessApplicationRequest,
} = require("../controllers/wellnessApplicationController.js");

const {
  // Wellness Credits (HR/Admin management)
  addWellnessCreditRequest,
  rollbackWellnessCreditRequest,
  getAllWellnessCreditRequests,
  getEmployeeDetails,
  getEmployeeWellnessCredits,
} = require("../controllers/wellnessCreditController.js");

// --- AUTH HELPERS ---
const requirePerm = (perm) => [authenticateToken, authorize(perm)];
const authOnly = [authenticateToken];

/* =========================================
   WELLNESS APPLICATIONS (EMPLOYEE / ADMIN VIEW)
========================================= */

// Apply for Wellness Leave
router.post(
  "/applications/apply",
  ...requirePerm("wellness.manage_self"),
  addWellnessApplicationRequest,
);

// Admin View All Wellness Applications
router.get(
  "/applications/all",
  ...requirePerm("wellness.view_all"),
  getAllWellnessApplicationsRequest,
);

// Admin View Specific Employee Applications
router.get(
  "/applications/employee/:employeeId",
  ...requirePerm("wellness.view_all"),
  getWellnessApplicationsByEmployeeRequest,
);

// Self-service application views & actions
router.get(
  "/applications/my-application",
  ...requirePerm("wellness.view_self"),
  getWellnessApplicationsByEmployeeRequest,
);

router.patch(
  "/applications/:id/cancel",
  ...requirePerm("wellness.manage"),
  cancelWellnessApplicationRequest,
);

/* =========================================
   APPROVER FLOW
========================================= */
// Kept as authOnly because these rely on the controller verifying
// if req.user._id matches the application's assigned approver.

router.get(
  "/applications/pending-count",
  ...authOnly,
  getPendingCountForWellnessApproverController,
);

router.get(
  "/applications/approvers/my-approvals",
  ...requirePerm("wellness.view_application"),
  getWellnessApplicationsForApprover,
);

router.get(
  "/applications/approvers/my-approvals/:id",
  ...requirePerm("wellness.view_application"),
  getWellnessApplicationById,
);

router.post(
  "/applications/approver/:applicationId/approve",
  ...requirePerm("wellness.manage_application"),
  approveWellnessApplication,
);

router.put(
  "/applications/approver/:applicationId/reject",
  ...requirePerm("wellness.manage_application"),
  rejectWellnessApplication,
);

/* =========================================
   WELLNESS CREDITS (HR / ADMIN FLOW)
========================================= */

// Get basic details of an employee for the crediting form
router.get(
  "/credits/employee-details/:employeeId",
  ...requirePerm("wellness.view_all"),
  getEmployeeDetails,
);

// Add Wellness Credits to employees
router.post(
  "/credits/add",
  ...requirePerm("wellness.manage"),
  upload.single("file"), // Matches the frontend FormData field name for the memo upload
  addWellnessCreditRequest,
);

// Rollback a credited memo
router.put(
  "/credits/:creditId/rollback",
  ...requirePerm("wellness.manage"),
  rollbackWellnessCreditRequest,
);

// Get a list of all credited memos (Admin/HR view)
router.get(
  "/credits/all",
  ...requirePerm("wellness.view_all"),
  getAllWellnessCreditRequests,
);

// Get credit history for a specific employee (Admin/HR view)
router.get(
  "/credits/employee/:employeeId",
  ...requirePerm("wellness.view_all"),
  getEmployeeWellnessCredits,
);

// Get personal credit history (Self-service view)
router.get(
  "/credits/my-credits",
  ...requirePerm("wellness.view_self"),
  getEmployeeWellnessCredits,
);

module.exports = router;
