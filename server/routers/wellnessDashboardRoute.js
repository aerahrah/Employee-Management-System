const express = require("express");
const router = express.Router();
const wellnessDashboardController = require("../controllers/wellnessDashboardController");
const { authenticateToken } = require("../middlewares/authMiddleware");

router.get(
  "/dashboard",
  authenticateToken,
  wellnessDashboardController.getDashboard,
);

module.exports = router;
