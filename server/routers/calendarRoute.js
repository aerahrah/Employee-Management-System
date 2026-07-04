const express = require("express");
const router = express.Router();

const {
  authenticateToken,
  authorize,
} = require("../middlewares/authMiddleware.js");

// --- CONTROLLERS ---
const {
  getMyEvents,
  getAllEvents,
} = require("../controllers/calendarController.js");

// --- AUTH HELPERS ---
const requirePerm = (perm) => [authenticateToken, authorize(perm)];
const authOnly = [authenticateToken];

/* =========================================
   CALENDAR & SCHEDULING
========================================= */

// ✅ Self-service calendar view (MUST come before generic/wildcard routes)
// Employees see only their own approved/pending dates
router.get("/my-events", ...requirePerm("calendar.view_self"), getMyEvents);

// ✅ Global / HR calendar view
// HR and Admins can see the whole company's leave schedule
router.get("/all", ...requirePerm("calendar.view_all"), getAllEvents);

module.exports = router;
