// routes/ctoRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer"); // ✅ Imported multer

// ✅ NEW: Set up specific storage for CTO revocation attachments
const uploadCtoRevocation = multer({
  dest: "upload/cto/revocation/attachments/",
});

const uploadCtoMemo = require("../middlewares/uploadCtoMemo.middleware.js");
const {
  authenticateToken,
  authorize,
} = require("../middlewares/authMiddleware.js");

// --- CONTROLLERS ---
const {
  // Approver-side
  getApproverOptions,
  getPendingCountForApproverController,
  getCtoApplicationsForApprover,
  getCtoApplicationById,
  approveCtoApplication,
  rejectCtoApplication,
} = require("../controllers/ctoApplicationApproverController.js");

const {
  // Credits
  addCtoCreditRequest,
  rollbackCreditedRequest,
  getAllCreditRequests,
  getEmployeeDetails,
  getEmployeeCredits,
} = require("../controllers/ctoCreditController.js");

const {
  // Applications (employee/admin view)
  addCtoApplicationRequest,
  getAllCtoApplicationsRequest,
  getCtoApplicationsByEmployeeRequest,
  getCtoRevocationByIdRequest, // Imported the new controller
  cancelCtoApplicationRequest,
  followUpCtoApplicationRequest,
  getRevocationRequestsController,
  requestRevocationController,
  processRevocationController,
} = require("../controllers/ctoApplicationController.js");

// Organic Leaves Controllers
const {
  addOrganicLeaveRequest,
  getAllOrganicLeavesRequest,
  getOrganicLeavesByEmployeeRequest,
  cancelOrganicLeaveRequest,
} = require("../controllers/organicLeaveController.js");

// --- AUTH HELPERS ---
const requirePerm = (perm) => [authenticateToken, authorize(perm)];
const authOnly = [authenticateToken];

/* =========================================
   CTO CREDITS
========================================= */
// Manage credits
router.post(
  "/credits",
  ...requirePerm("cto.credits_manage"),
  uploadCtoMemo,
  addCtoCreditRequest,
);

// View global credit records
router.get(
  "/credits/all",
  ...requirePerm("cto.credits_view"),
  getAllCreditRequests,
);

// Self-service credit views (MUST come before /:employeeId)
router.get(
  "/credits/my-credits",
  ...requirePerm("cto.view_self"),
  getEmployeeCredits,
);

router.get(
  "/credits/:employeeId/history",
  ...requirePerm("cto.credits_view"),
  getEmployeeCredits,
);

router.patch(
  "/credits/:creditId/rollback",
  ...requirePerm("cto.credits_manage"),
  rollbackCreditedRequest,
);

router.get(
  "/employee/:employeeId/details",
  ...requirePerm("cto.records_view"),
  getEmployeeDetails,
);

/* =========================================
   CTO APPLICATIONS - STATIC GET ROUTES
   (These MUST come before /:applicationId)
========================================= */

// Admin View All Applications
router.get(
  "/applications/all",
  ...requirePerm("cto.applications_view"),
  getAllCtoApplicationsRequest,
);

// HR Dashboard view specifically for Revocations
router.get(
  "/applications/revocations",
  ...requirePerm("revocation.view_application"),
  getRevocationRequestsController,
);

// Self-service application views
router.get(
  "/applications/my-application",
  ...requirePerm("cto.view_self"),
  getCtoApplicationsByEmployeeRequest,
);

// Approver Flow: Pending Count
router.get(
  "/applications/pending-count",
  ...authOnly,
  getPendingCountForApproverController,
);

// Approver Flow: Approver Options
router.get("/applications/approvers", ...authOnly, getApproverOptions);

// Approver Flow: My Approvals List
router.get(
  "/applications/approvers/my-approvals",
  ...requirePerm("cto.view_application"),
  getCtoApplicationsForApprover,
);

/* =========================================
   CTO APPLICATIONS - DYNAMIC GET ROUTES
========================================= */

// Admin View Specific Employee Applications
router.get(
  "/applications/employee/:employeeId",
  ...requirePerm("cto.applications_view"),
  getCtoApplicationsByEmployeeRequest,
);

// Approver Flow: Specific Approval By ID
router.get(
  "/applications/approvers/my-approvals/:applicationId",
  ...requirePerm("cto.view_application"),
  getCtoApplicationById,
);

// Admin View Specific Application By ID
// PLACED DEAD LAST among GET routes so it doesn't hijack static words like "pending-count"
router.get(
  "/applications/:applicationId",
  ...requirePerm("revocation.manage_application"),
  getCtoRevocationByIdRequest,
);

/* =========================================
   CTO APPLICATIONS - POST / PATCH / PUT
========================================= */

// Apply for CTO
router.post(
  "/applications/apply",
  ...requirePerm("cto.create"),
  addCtoApplicationRequest,
);

// Cancel CTO Application
router.patch(
  "/applications/:applicationId/cancel",
  ...requirePerm("cto.view_self"),
  cancelCtoApplicationRequest,
);

// Follow-up on a pending CTO application
router.post(
  "/applications/:applicationId/follow-up",
  ...requirePerm("cto.view_self"),
  followUpCtoApplicationRequest,
);

// Employee requests revocation of an approved leave
router.post(
  "/applications/:applicationId/revoke-request",
  ...requirePerm("revocation.manage_self"),
  uploadCtoRevocation.single("file"), // ✅ Added multer middleware here
  requestRevocationController,
);

// HR processes (approves/rejects) the revocation request
router.patch(
  "/applications/:applicationId/revoke-process",
  ...requirePerm("revocation.manage_application"),
  processRevocationController,
);

// Approver Approves
router.post(
  "/applications/approver/:applicationId/approve",
  ...requirePerm("cto.manage_application"),
  approveCtoApplication,
);

// Approver Rejects
router.put(
  "/applications/approver/:applicationId/reject",
  ...requirePerm("cto.manage_application"),
  rejectCtoApplication,
);

/* =========================================
   ORGANIC LEAVES (WELLNESS, ETC.)
========================================= */
// (Keep this commented out block as it was)
// // Apply for Organic Leave
// router.post(
//   "/organic-applications/apply",
//   ...requirePerm("organic_leaves.create"),
//   addOrganicLeaveRequest,
// );

// // Admin View All Organic Applications
// router.get(
//   "/organic-applications/all",
//   ...requirePerm("organic_leaves.applications_view"),
//   getAllOrganicLeavesRequest,
// );

// // Self-service organic application views (MUST come before /employee/:employeeId)
// router.get(
//   "/organic-applications/my-application",
//   ...requirePerm("organic_leaves.view_self"),
//   getOrganicLeavesByEmployeeRequest,
// );

// // Admin View Specific Employee Organic Applications
// router.get(
//   "/organic-applications/employee/:employeeId",
//   ...requirePerm("organic_leaves.applications_view"),
//   getOrganicLeavesByEmployeeRequest,
// );

// // Updated to :applicationId
// router.patch(
//   "/organic-applications/:applicationId/cancel",
//   ...requirePerm("organic_leaves.view_self"),
//   cancelOrganicLeaveRequest,
// );

module.exports = router;
