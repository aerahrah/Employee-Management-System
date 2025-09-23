const express = require("express");
const router = express.Router();
const {
  addCreditRequest,
  approveOrRejectCredit,
  cancelCreditRequest,
  getRecentCreditRequests,
  getAllCreditRequests,
  getEmployeeById,
} = require("../controllers/ctoController.js");

const {
  authenticateToken,
  authorizeRoles,
} = require("../middlewares/authMiddleware.js");

router.post(
  "/credits",
  authenticateToken,
  authorizeRoles("admin", "hr"),
  addCreditRequest
);

router.patch(
  "/credits/:creditId/decision",
  authenticateToken,
  authorizeRoles("admin", "hr"),
  approveOrRejectCredit
);

router.patch(
  "/credits/:creditId/cancel",
  authenticateToken,
  authorizeRoles("admin", "hr"),
  cancelCreditRequest
);

router.get(
  "/all",
  authenticateToken,
  authorizeRoles("admin", "hr"),
  getAllCreditRequests
);
router.get(
  "/recent",
  authenticateToken,
  authorizeRoles("admin", "hr"),
  getRecentCreditRequests
);

// router.get(
//   "/employees/:id",
//   authenticateToken,
//   authorizeRoles("admin", "hr", "supervisor"),
//   getEmployeeById
// );

module.exports = router;
