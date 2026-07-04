// controllers/dashboardController.js
const dashboardService = require("../services/dashboardService");

function sendError(res, err) {
  const status = err.statusCode || err.status || 500;
  return res
    .status(status)
    .json({ success: false, message: err.message || "Server Error" });
}

const dashboardController = {
  getDashboard: async (req, res) => {
    try {
      const { id: employeeId } = req.user || {};

      // Safely extract permissions whether they are at req.user.permissions
      // or populated inside req.user.role.permissions
      const permissions =
        req.user?.permissions || req.user?.role?.permissions || [];

      if (!employeeId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      // Helper function to check if user has a specific permission or the Super Admin wildcard (*)
      const hasPerm = (perm) =>
        permissions.includes("*") || permissions.includes(perm);

      let dashboardData = {};

      // 1. Personal Summary (Base Dashboard - Employee Level)
      // Note: Adjust permission strings if you use unified ones like 'dashboard.self_view'
      if (
        hasPerm("cto.dashboard.self_view") ||
        hasPerm("wellness.dashboard.self_view") ||
        permissions.length === 0 /* Fallback if roles aren't fully seeded yet */
      ) {
        dashboardData = await dashboardService.getEmployeeSummary(employeeId);
      } else {
        dashboardData = { mySummary: { wellness: null, cto: null } };
      }

      // 2. Approver Insights: Fetch if they have the specific approver view permission
      if (
        hasPerm("cto.view_application") ||
        hasPerm("wellness.view_application")
      ) {
        const approverData =
          await dashboardService.getSupervisorSummary(employeeId);
        dashboardData = {
          ...dashboardData,
          wellnessApprovals:
            approverData.wellnessApprovals || getEmptyApproverStats(),
          ctoApprovals: approverData.ctoApprovals || getEmptyApproverStats(),
        };
      } else {
        // Default fallbacks if they aren't an approver
        dashboardData.wellnessApprovals = getEmptyApproverStats();
        dashboardData.ctoApprovals = getEmptyApproverStats();
      }

      // 3. HR Insights (Credit Management & Records)
      if (
        hasPerm("cto.dashboard.hr_view") ||
        hasPerm("wellness.dashboard.hr_view")
      ) {
        const hrData = await dashboardService.getHrSummary(employeeId);
        // Safely merge so we don't overwrite previous properties
        dashboardData.wellness = {
          ...dashboardData.wellness,
          ...hrData.wellness,
        };
        dashboardData.cto = { ...dashboardData.cto, ...hrData.cto };
      }

      // 4. Global Admin Insights (Organization-wide data)
      if (
        hasPerm("cto.dashboard.admin_view") ||
        hasPerm("wellness.dashboard.admin_view")
      ) {
        const adminData = await dashboardService.getAdminSummary(employeeId);
        // Safely merge again to include the macro totals from the admin query
        dashboardData.wellness = {
          ...dashboardData.wellness,
          ...adminData.wellness,
        };
        dashboardData.cto = { ...dashboardData.cto, ...adminData.cto };
      }

      return res.json({ success: true, data: dashboardData });
    } catch (err) {
      console.error("Dashboard Error:", err);
      return sendError(res, err);
    }
  },
};

// --- Helper to keep the fallback data structures clean ---
function getEmptyApproverStats() {
  return {
    teamPendingApprovals: 0,
    pendingRequests: [],
    approverStats: {
      all: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
    },
  };
}

module.exports = dashboardController;
