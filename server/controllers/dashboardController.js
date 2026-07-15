// controllers/dashboardController.js
// Adjust the path to your service file if necessary
const dashboardService = require("../services/ctoDashboard.service");

function sendError(res, err) {
  const status = err.statusCode || err.status || 500;
  return res
    .status(status)
    .json({ success: false, message: err.message || "Server Error" });
}

const dashboardController = {
  getDashboard: async (req, res) => {
    try {
      const employeeId = req.user?._id || req.user?.id;

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

      // 1. Personal CTO summary (Base Dashboard - Employee Level)
      // Make sure the permission string matches what you seeded in your DB (e.g., "cto.dashboard.self_view")
      if (
        hasPerm("cto.dashboard.self_view") ||
        permissions.length === 0 /* Fallback if roles aren't fully seeded yet */
      ) {
        dashboardData = await dashboardService.getEmployeeSummary(employeeId);
      } else {
        dashboardData = { myCtoSummary: null };
      }

      // 2. Approver Insights: Fetch if they have the specific approver view permission
      if (hasPerm("cto.view_application")) {
        const approverData =
          await dashboardService.getSupervisorSummary(employeeId);
        dashboardData = {
          ...dashboardData,
          teamPendingApprovals: approverData.teamPendingApprovals || 0,
          pendingRequests: approverData.pendingRequests || [],
          approverStats: approverData.approverStats || {
            all: 0,
            pending: 0,
            approved: 0,
            rejected: 0,
            cancelled: 0,
          },
        };
      } else {
        // Default fallbacks if they aren't an approver
        dashboardData.teamPendingApprovals = 0;
        dashboardData.pendingRequests = [];
        dashboardData.approverStats = {
          all: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          cancelled: 0,
        };
      }

      // 3. HR Insights (Recent Credits & Pending counts)
      if (hasPerm("cto.dashboard.hr_view")) {
        const hrData = await dashboardService.getHrSummary(employeeId);
        dashboardData = { ...dashboardData, ...hrData };
      }

      // 4. Global Admin Insights (Organization-wide data)
      if (hasPerm("cto.dashboard.admin_view")) {
        const adminData = await dashboardService.getAdminSummary(employeeId);
        dashboardData = { ...dashboardData, ...adminData };
      }

      return res.json({ success: true, data: dashboardData });
    } catch (err) {
      console.error("[CTO Dashboard Controller Error]:", err);
      return sendError(res, err);
    }
  },
};

module.exports = dashboardController;
