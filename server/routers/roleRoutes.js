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
    const permissions = req.body?.permissions;
    const targetRoleId = req.params.id;

    const requesterRoleId = req.user?.role?._id || req.user?.role;

    if (!requesterRoleId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to verify permissions.",
      });
    }

    const requesterRole = await Role.findById(requesterRoleId).lean();

    if (!requesterRole) {
      return res.status(403).json({
        success: false,
        message: "Role not found.",
      });
    }

    const requesterIsAdmin = requesterRole.permissions?.includes("*");

    // =====================================
    // CREATE / UPDATE GUARD
    // =====================================

    if (
      Array.isArray(permissions) &&
      permissions.includes("*") &&
      !requesterIsAdmin
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Forbidden: Only administrators can grant wildcard (*) access.",
      });
    }

    // =====================================
    // UPDATE / DELETE GUARD
    // =====================================

    if (targetRoleId && !requesterIsAdmin) {
      const targetRole = await Role.findById(targetRoleId).lean();

      if (!targetRole) {
        return res.status(404).json({
          success: false,
          message: "Role not found.",
        });
      }

      // Cannot touch system roles
      if (targetRole.isSystem) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: System roles cannot be modified or deleted.",
        });
      }

      // Cannot touch wildcard admin roles
      if (targetRole.permissions?.includes("*")) {
        return res.status(403).json({
          success: false,
          message:
            "Forbidden: Administrator roles cannot be modified or deleted.",
        });
      }
    }

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
