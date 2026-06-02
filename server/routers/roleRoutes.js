const express = require("express");
const router = express.Router();
const Role = require("../models/roleModel"); // ✅ Imported for the security guard

const {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
} = require("../controllers/roleController");

const {
  authenticateToken,
  authorize,
} = require("../middlewares/authMiddleware");

// =============================
// PERMISSION ESCALATION GUARD
// =============================
const preventPermissionEscalation = async (req, res, next) => {
  try {
    const { permissions } = req.body;
    const targetRoleId = req.params.id; // Grabs the ID if this is a PUT or DELETE request

    // 1. Fetch the person making the request to see if they are a Master Admin
    const requesterRoleId = req.user?.role?._id || req.user?.role;
    if (!requesterRoleId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to verify permissions.",
      });
    }

    const requesterRole = await Role.findById(requesterRoleId).lean();
    const requesterIsAdmin =
      requesterRole && requesterRole.permissions.includes("*");

    // 2. ESCALATION GUARD: Stop non-admins from granting the "*" permission
    if (permissions && permissions.includes("*") && !requesterIsAdmin) {
      return res.status(403).json({
        success: false,
        message:
          "Forbidden: You do not have permission to create or grant wildcard (*) access.",
      });
    }

    // 3. MODIFICATION GUARD: Stop non-admins from editing or deleting an existing Admin role
    if (targetRoleId && !requesterIsAdmin) {
      const targetRole = await Role.findById(targetRoleId).lean();

      // If the role they are trying to touch has "*", block them!
      if (targetRole && targetRole.permissions.includes("*")) {
        return res.status(403).json({
          success: false,
          message:
            "Forbidden: You do not have permission to modify or delete an Administrator role.",
        });
      }
    }

    // Safe to proceed!
    next();
  } catch (error) {
    console.error("[PERMISSION ESCALATION GUARD] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during permission validation.",
    });
  }
};

// =============================
// HELPERS
// =============================
const requirePerm = (perm) => [authenticateToken, authorize(perm)];

// =============================
// ROLES ROUTES
// =============================

// View Roles
router.get("/", ...requirePerm("roles.view"), getRoles);
router.get("/:id", ...requirePerm("roles.view"), getRoleById);

// Manage Roles (Create, Update, Delete) with Escalation Guard attached
router.post(
  "/",
  ...requirePerm("roles.manage"),
  preventPermissionEscalation,
  createRole,
);
router.put(
  "/:id",
  ...requirePerm("roles.manage"),
  preventPermissionEscalation,
  updateRole,
);
router.delete(
  "/:id",
  ...requirePerm("roles.manage"),
  preventPermissionEscalation,
  deleteRole,
);

module.exports = router;
