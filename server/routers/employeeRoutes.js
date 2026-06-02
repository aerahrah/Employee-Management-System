const express = require("express");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ✅ Imported Role model for the security guard
const Role = require("../models/roleModel");

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
  uploadSignature,
} = require("../controllers/employeeController");

const {
  authenticateToken,
  authorize,
} = require("../middlewares/authMiddleware");

// =============================
// ROLE ESCALATION GUARD
// =============================
// Prevents users from assigning a role with the "*" (Admin) permission
// unless they themselves already possess the "*" permission.
const preventRoleEscalation = async (req, res, next) => {
  try {
    const targetRoleId = req.body.role;

    // If no role is being assigned/updated in this request, proceed normally
    if (!targetRoleId) return next();

    // Fetch the role they are trying to assign
    const targetRole = await Role.findById(targetRoleId).lean();
    if (!targetRole) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid role selected." });
    }

    // Check if the role being assigned has the wildcard admin permission
    const isTargetAdmin = targetRole.permissions.includes("*");

    if (isTargetAdmin) {
      // Fetch the requester's role to see if THEY are an Admin
      const requesterRoleId = req.user?.role?._id || req.user?.role;
      if (!requesterRoleId) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to verify role permissions.",
        });
      }

      const requesterRole = await Role.findById(requesterRoleId).lean();
      const requesterIsAdmin =
        requesterRole && requesterRole.permissions.includes("*");

      // If the target is Admin but the requester is NOT Admin, block the action!
      if (!requesterIsAdmin) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: Only an Administrator can assign an Admin role.",
        });
      }
    }

    // Safe to proceed
    next();
  } catch (error) {
    console.error("[ROLE ESCALATION GUARD] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during role validation.",
    });
  }
};

// =============================
// MULTER UPLOAD CONFIGURATION
// =============================
// Use process.cwd() to guarantee the path is created relative to your root folder
const signatureUploadDir = path.join(process.cwd(), "uploads", "signatures");

// Ensure the upload directory exists safely
if (!fs.existsSync(signatureUploadDir)) {
  fs.mkdirSync(signatureUploadDir, { recursive: true });
}

// Strictly map valid mimetypes to safe extensions
const allowedMimeTypes = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, signatureUploadDir);
  },
  filename: function (req, file, cb) {
    // This unique suffix guarantees that even if 100 people upload "signature.jpg"
    // at the exact same second, they will all get entirely unique file names on the server.
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);

    // Instead of trusting the original file extension, force the extension based on the validated mimetype
    const safeExtension = allowedMimeTypes[file.mimetype] || ".bin";

    cb(null, `${req.user?.id || "unauth"}-${uniqueSuffix}${safeExtension}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes[file.mimetype]) {
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

// Graceful Error Wrapper for Multer
const handleSignatureUpload = (req, res, next) => {
  upload.single("signature")(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading (e.g., file too large)
      return res
        .status(400)
        .json({ success: false, message: `Upload error: ${err.message}` });
    } else if (err) {
      // An unknown error occurred (e.g., our custom fileFilter error)
      return res.status(400).json({ success: false, message: err.message });
    }
    // Everything went fine, proceed to the controller
    next();
  });
};

// =============================
// LOGIN RATE LIMITER (Original Code)
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

router.post("/login", loginLimiter, signInEmployee);
router.post("/logout", authenticateToken, logoutEmployee);

/* =======================
   SELF-SERVICE ROUTES
   ======================= */

router.get("/my-profile", ...requirePerm("employees.view_self"), getMyProfile);
router.put(
  "/my-profile",
  ...requirePerm("employees.edit_self"),
  updateMyProfile,
);

// ✅ Updated to use the secure error-handling wrapper
router.post(
  "/my-profile/signature",
  ...requirePerm("employees.upload_signature"),
  handleSignatureUpload,
  uploadSignature,
);

router.put(
  "/my-profile/reset-password",
  ...requirePerm("employees.reset_password_self"),
  resetMyPassword,
);

router.get("/memos/me", ...requirePerm("cto.view_self"), getMyCtoMemos);

router.get(
  "/my-wellness-balance",
  ...requirePerm("wellness.view_self"),
  getMyWellnessBalance,
);

/* =======================
   ADMIN / HR ROUTES
   ======================= */

router.get("/", ...requirePerm("employees.view"), getEmployees);

// ✅ Added preventRoleEscalation guard
router.post(
  "/",
  ...requirePerm("employees.create"),
  preventRoleEscalation,
  createEmployee,
);

router.get("/:id", ...requirePerm("employees.view"), getEmployeeById);

// ✅ Added preventRoleEscalation guard
router.put(
  "/:id",
  ...requirePerm("employees.edit"),
  preventRoleEscalation,
  updateEmployee,
);

// ✅ Added preventRoleEscalation guard
router.post(
  "/:id/role",
  ...requirePerm("employees.change_role"),
  preventRoleEscalation,
  updateRole,
);

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
