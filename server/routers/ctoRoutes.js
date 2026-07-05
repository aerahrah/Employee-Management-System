const express = require("express");
const router = express.Router();

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
  cancelCtoApplicationRequest,
  followUpCtoApplicationRequest, // ✅ Added follow-up controller import
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

// ✅ FIXED: Self-service credit views (MUST come before /:employeeId)
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
   CTO APPLICATIONS (EMPLOYEE / ADMIN VIEW)
========================================= */

// Apply for CTO
router.post(
  "/applications/apply",
  ...requirePerm("cto.create"),
  addCtoApplicationRequest,
);

// Admin View All Applications
router.get(
  "/applications/all",
  ...requirePerm("cto.applications_view"),
  getAllCtoApplicationsRequest,
);

// ✅ FIXED: Self-service application views (MUST come before /employee/:employeeId)
router.get(
  "/applications/my-application",
  ...requirePerm("cto.view_self"),
  getCtoApplicationsByEmployeeRequest,
);

// Admin View Specific Employee Applications
router.get(
  "/applications/employee/:employeeId",
  ...requirePerm("cto.applications_view"),
  getCtoApplicationsByEmployeeRequest,
);

// ✅ FIXED: Updated to :applicationId to match service structure and frontend API
router.patch(
  "/applications/:applicationId/cancel",
  ...requirePerm("cto.view_self"),
  cancelCtoApplicationRequest,
);

// ✅ NEW: Follow-up on a pending CTO application
router.post(
  "/applications/:applicationId/follow-up",
  ...requirePerm("cto.view_self"),
  followUpCtoApplicationRequest,
);

/* =========================================
   ORGANIC LEAVES (WELLNESS, ETC.)
========================================= */

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

// // ✅ FIXED: Self-service organic application views (MUST come before /employee/:employeeId)
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

// // ✅ FIXED: Updated to :applicationId
// router.patch(
//   "/organic-applications/:applicationId/cancel",
//   ...requirePerm("organic_leaves.view_self"),
//   cancelOrganicLeaveRequest,
// );

/* =========================================
   APPROVER FLOW (CTO)
========================================= */
// Kept as authOnly because these rely on the controller verifying
// if req.user._id matches the application's assigned supervisor/HR.

router.get(
  "/applications/pending-count",
  ...authOnly,
  getPendingCountForApproverController,
);

router.get("/applications/approvers", ...authOnly, getApproverOptions);

router.get(
  "/applications/approvers/my-approvals",
  ...requirePerm("cto.view_application"),
  getCtoApplicationsForApprover,
);

// ✅ FIXED: Updated to :applicationId to prevent generic 'id' clashing
router.get(
  "/applications/approvers/my-approvals/:applicationId",
  ...requirePerm("cto.view_application"),
  getCtoApplicationById,
);

router.post(
  "/applications/approver/:applicationId/approve",
  ...requirePerm("cto.manage_application"),
  approveCtoApplication,
);

router.put(
  "/applications/approver/:applicationId/reject",
  ...requirePerm("cto.manage_application"),
  rejectCtoApplication,
);

module.exports = router;
