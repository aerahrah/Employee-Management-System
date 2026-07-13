const express = require("express");
const router = express.Router();
const {
  authenticateToken,
  authorize,
} = require("../middlewares/authMiddleware");
const {
  getRevocationApprover,
  setRevocationApprover,
} = require("../controllers/revocationSettingController");

// Require high-level settings access to change this
const requirePerm = (perm) => [authenticateToken, authorize(perm)];

router.get("/", authenticateToken, getRevocationApprover);
router.put(
  "/",
  ...requirePerm("settings.revocation_workflowl"),
  setRevocationApprover,
);

module.exports = router;
