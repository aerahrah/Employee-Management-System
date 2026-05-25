// controllers/wellnessDashboardController.js
const wellnessDashboardService = require("../services/wellnessDashboard.service");

function sendError(res, err) {
  const status = err.statusCode || err.status || 500;
  return res
    .status(status)
    .json({ success: false, message: err.message || "Server Error" });
}

const wellnessDashboardController = {
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

      // 1. Personal Wellness summary (Base Dashboard - Employee Level)
      if (
        hasPerm("wellness.dashboard.self_view") ||
        permissions.length === 0 /* Fallback if roles aren't fully seeded yet */
      ) {
        dashboardData =
          await wellnessDashboardService.getEmployeeSummary(employeeId);
      } else {
        dashboardData = { myWellnessSummary: null };
      }

      // 2. Approver Insights: Fetch if they have the specific approver view permission
      if (hasPerm("wellness.view_application")) {
        const approverData =
          await wellnessDashboardService.getSupervisorSummary(employeeId);
        dashboardData = {
          ...dashboardData,
          teamPendingApprovals: approverData.teamPendingApprovals || 0,
          pendingRequests: approverData.pendingRequests || [],
          // ✅ ADDED THIS SO YOUR FRONTEND GETS THE STATS
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

      // 3. HR Insights (Recent Applications & Pending counts)
      if (hasPerm("wellness.dashboard.hr_view")) {
        const hrData = await wellnessDashboardService.getHrSummary(employeeId);
        dashboardData = { ...dashboardData, ...hrData };
      }

      // 4. Global Admin Insights (Organization-wide data)
      if (hasPerm("wellness.dashboard.admin_view")) {
        const adminData =
          await wellnessDashboardService.getAdminSummary(employeeId);
        dashboardData = { ...dashboardData, ...adminData };
      }

      return res.json({ success: true, data: dashboardData });
    } catch (err) {
      console.error("Dashboard Error:", err);
      return sendError(res, err);
    }
  },
};

module.exports = wellnessDashboardController;
