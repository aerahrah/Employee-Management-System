// routes/wellnessRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");

// Set up temporary storage for uploaded memos before the controller moves them
const upload = multer({ dest: "uploads/temp/" });

// ✅ NEW: Set up specific storage for revocation attachments
const uploadRevocation = multer({
  dest: "upload/wellness/revocation/attachments/",
});

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
  getWellnessRevocationByIdRequest,
  cancelWellnessApplicationRequest,
  followUpWellnessApplicationRequest,
  requestRevocationWellnessController,
  processRevocationWellnessController,
  getRevocationRequestsController,
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
   WELLNESS APPLICATIONS - STATIC GET ROUTES 
   (These MUST come before any dynamic /:id routes)
========================================= */

// Admin View All Wellness Applications
router.get(
  "/applications/all",
  ...requirePerm("wellness.view_all"),
  getAllWellnessApplicationsRequest,
);

// Admin View All Revocation Requests
router.get(
  "/applications/revocations",
  ...requirePerm("revocation.view_application"),
  getRevocationRequestsController,
);

// Self-service application views & actions
router.get(
  "/applications/my-application",
  ...requirePerm("wellness.view_self"),
  getWellnessApplicationsByEmployeeRequest,
);

// Approver pending count
router.get(
  "/applications/pending-count",
  ...authOnly,
  getPendingCountForWellnessApproverController,
);

// Approver list of approvals
router.get(
  "/applications/approvers/my-approvals",
  ...requirePerm("wellness.view_application"),
  getWellnessApplicationsForApprover,
);

/* =========================================
   WELLNESS APPLICATIONS - DYNAMIC GET ROUTES 
   (These catch parameters like IDs)
========================================= */

// Approver specific approval details
router.get(
  "/applications/approvers/my-approvals/:id",
  ...requirePerm("wellness.view_application"),
  getWellnessApplicationById,
);

// Admin View Specific Employee Applications
router.get(
  "/applications/employee/:employeeId",
  ...requirePerm("wellness.view_all"),
  getWellnessApplicationsByEmployeeRequest,
);

// Admin View Specific Application By ID
// Placed DEAD LAST among the GET /applications/... routes
router.get(
  "/applications/:id",
  ...requirePerm("revocation.manage_application"),
  getWellnessRevocationByIdRequest,
);

/* =========================================
   WELLNESS APPLICATIONS - POST / PATCH / PUT
   (Method-specific, order is less strict here)
========================================= */

// Apply for Wellness Leave
router.post(
  "/applications/apply",
  ...requirePerm("wellness.manage_self"),
  addWellnessApplicationRequest,
);

// Cancel Application
router.patch(
  "/applications/:id/cancel",
  ...requirePerm("wellness.manage"),
  cancelWellnessApplicationRequest,
);

// Follow-up Route
router.post(
  "/applications/:id/follow-up",
  ...requirePerm("wellness.manage_self"),
  followUpWellnessApplicationRequest,
);

// Employee requests revocation of an approved leave
router.post(
  "/applications/:id/revoke-request",
  ...requirePerm("revocation.manage_self"),
  uploadRevocation.single("file"), // ✅ Updated to use the new revocation upload directory
  requestRevocationWellnessController,
);

// HR processes (approves/rejects) the revocation request
router.patch(
  "/applications/:id/revoke-process",
  ...requirePerm("revocation.manage_application"),
  processRevocationWellnessController,
);

// Approver Approves
router.post(
  "/applications/approver/:applicationId/approve",
  ...requirePerm("wellness.manage_application"),
  approveWellnessApplication,
);

// Approver Rejects
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
  upload.single("file"), // Kept the original temp storage for credit memos
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
