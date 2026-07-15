const express = require("express");
const router = express.Router();
const {
  authenticateToken,
  authorize,
} = require("../middlewares/authMiddleware");

// Import the updated function names
const {
  getRevocationSettings,
  updateRevocationSettings,
} = require("../controllers/revocationSettingController");

// Require high-level settings access to change this
const requirePerm = (perm) => [authenticateToken, authorize(perm)];

router.get("/", authenticateToken, getRevocationSettings);

router.put(
  "/",
  ...requirePerm("settings.revocation_workflow"),
  updateRevocationSettings,
);

module.exports = router;
