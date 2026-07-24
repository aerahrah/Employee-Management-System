// routes/ctoRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");

// ✅ Set up specific storage for CTO revocation attachments
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
  getCtoRevocationByIdRequest,
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
   EMPLOYEE DETAILS
========================================= */
router.get(
  "/employee/:employeeId/details",
  ...requirePerm("cto.records_view"),
  getEmployeeDetails,
);

/* =========================================
   CTO CREDITS
========================================= */
// Static Routes First
router.get(
  "/credits/all",
  ...requirePerm("cto.credits_view"),
  getAllCreditRequests,
);

router.get(
  "/credits/my-credits",
  ...requirePerm("cto.view_self"),
  getEmployeeCredits,
);

router.post(
  "/credits",
  ...requirePerm("cto.credits_manage"),
  uploadCtoMemo,
  addCtoCreditRequest,
);

// Dynamic Routes Last
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

/* =========================================
   CTO APPLICATIONS (Base)
========================================= */
// Static Routes First
router.get(
  "/applications/all",
  ...requirePerm("cto.applications_view"),
  getAllCtoApplicationsRequest,
);

router.get(
  "/applications/revocations",
  ...requirePerm("revocation.view_application"),
  getRevocationRequestsController,
);

router.get(
  "/applications/my-application",
  ...requirePerm("cto.view_self"),
  getCtoApplicationsByEmployeeRequest,
);

router.post(
  "/applications/apply",
  ...requirePerm("cto.create"),
  addCtoApplicationRequest,
);

// Dynamic Routes Last
router.get(
  "/applications/employee/:employeeId",
  ...requirePerm("cto.applications_view"),
  getCtoApplicationsByEmployeeRequest,
);

router.patch(
  "/applications/:applicationId/cancel",
  ...requirePerm("cto.view_self"),
  cancelCtoApplicationRequest,
);

router.post(
  "/applications/:applicationId/follow-up",
  ...requirePerm("cto.view_self"),
  followUpCtoApplicationRequest,
);

/* =========================================
   CTO APPLICATIONS (Approvers Flow)
========================================= */
// Static Routes First
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

// Dynamic Routes Last
router.get(
  "/applications/approvers/my-approvals/:applicationId",
  ...requirePerm("cto.view_application"),
  getCtoApplicationById,
);

router.post(
  "/applications/approvers/my-approvals/:applicationId/approve",
  ...requirePerm("cto.manage_application"),
  approveCtoApplication,
);

router.put(
  "/applications/approvers/my-approvals/:applicationId/reject",
  ...requirePerm("cto.manage_application"),
  rejectCtoApplication,
);

/* =========================================
   CTO REVOCATIONS
========================================= */
// ✅ Fixed missing leading '/'
router.get(
  "/revocation/applications/:applicationId",
  ...requirePerm("revocation.view_application"),
  getCtoRevocationByIdRequest,
);

router.post(
  "/revocation/applications/:applicationId/revoke-request",
  ...requirePerm("revocation.manage_self"),
  uploadCtoRevocation.single("file"),
  requestRevocationController,
);

router.patch(
  "/revocation/applications/:applicationId/revoke-process",
  ...requirePerm("revocation.manage_application"),
  processRevocationController,
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
