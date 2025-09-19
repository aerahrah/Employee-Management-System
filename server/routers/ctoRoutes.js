const express = require("express");
const router = express.Router();
const {
  addCreditRequest,
  approveOrRejectCredit,
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

// router.get(
//   "/employees/:id",
//   authenticateToken,
//   authorizeRoles("admin", "hr", "supervisor"),
//   getEmployeeById
// );

module.exports = router;
