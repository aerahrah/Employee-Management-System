const express = require("express");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

const {
  createEmployee,
  getEmployees,
  getEmployeeById,
  logoutEmployee,
  signInEmployee,
  updateEmployee,
  getEmployeeCtoMemosById,
  getMyCtoMemos,
  updateRole,
  getMyProfile,
  updateMyProfile,
  resetMyPassword,
  getEmployeeWellnessBalanceById,
  getMyWellnessBalance,
  uploadSignature, // ✅ Imported the new controller
} = require("../controllers/employeeController");

const {
  authenticateToken,
  authorize,
} = require("../middlewares/authMiddleware");

// =============================
// MULTER UPLOAD CONFIGURATION
// =============================
const signatureUploadDir = "uploads/signatures/";

// Ensure the upload directory exists
if (!fs.existsSync(signatureUploadDir)) {
  fs.mkdirSync(signatureUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, signatureUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // e.g., 60f7a9b8b9b5a...-1629812345678-123456789.png
    cb(
      null,
      `${req.user?.id}-${uniqueSuffix}${path.extname(file.originalname)}`,
    );
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPEG and PNG are allowed."), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // Strict 2MB limit
  fileFilter: fileFilter,
});

// =============================
// LOGIN RATE LIMITER
// =============================
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // IMPORTANT: keep low for login security

  standardHeaders: true,
  legacyHeaders: false,

  keyGenerator: (req) => {
    // normalize username so "Admin" and "admin" are same bucket
    return (req.body.username || "unknown").toLowerCase().trim();
  },

  skipSuccessfulRequests: true,

  handler: (req, res) => {
    const retryAfter = Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000);

    const minutes = Math.floor(retryAfter / 60);
    const seconds = retryAfter % 60;

    res.status(429).json({
      message: `Too many login attempts for this account. Try again in ${minutes}m ${seconds}s.`,
      retryAfterSeconds: retryAfter,
    });
  },
});

// =============================
// HELPERS
// =============================
const requirePerm = (perm) => [authenticateToken, authorize(perm)];

/* =======================
   PUBLIC ROUTES
   ======================= */

// Protected login route
router.post("/login", loginLimiter, signInEmployee);

router.post("/logout", authenticateToken, logoutEmployee);

/* =======================
   SELF-SERVICE ROUTES
   ======================= */

// Profile Management
router.get("/my-profile", ...requirePerm("employees.view_self"), getMyProfile);

router.put(
  "/my-profile",
  ...requirePerm("employees.edit_self"),
  updateMyProfile,
);

// ✅ NEW: Dedicated Signature Upload Route
router.post(
  "/my-profile/signature",
  ...requirePerm("employees.edit_self"),
  upload.single("signature"),
  uploadSignature,
);

router.put(
  "/my-profile/reset-password",
  ...requirePerm("employees.reset_password_self"),
  resetMyPassword,
);

// Leaves & Balances (Self)
router.get("/memos/me", ...requirePerm("cto.view_self"), getMyCtoMemos);

router.get(
  "/my-wellness-balance",
  ...requirePerm("wellness.view_self"),
  getMyWellnessBalance,
);

/* =======================
   ADMIN / HR ROUTES
   ======================= */

// Employee Management (CRUD)
router.get("/", ...requirePerm("employees.view"), getEmployees);

router.post("/", ...requirePerm("employees.create"), createEmployee);

router.get("/:id", ...requirePerm("employees.view"), getEmployeeById);

router.put("/:id", ...requirePerm("employees.edit"), updateEmployee);

// Update Employee Role
router.post("/:id/role", ...requirePerm("employees.change_role"), updateRole);

// View Employee Specific Balances & Memos
router.get(
  "/memos/:id",
  ...requirePerm("cto.records_view"),
  getEmployeeCtoMemosById,
);

router.get(
  "/:id/wellness-balance",
  ...requirePerm("employees.view"),
  getEmployeeWellnessBalanceById,
);

module.exports = router;
