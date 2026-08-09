// controllers/leaveCreditController.js
const leaveCreditService = require("../services/leaveCredit.service");

const addLeaveCreditRequest = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const { employees, leaveType, days, dateApproved } = req.body;

    let parsedEmployees = [];
    if (employees) {
      try {
        parsedEmployees =
          typeof employees === "string" ? JSON.parse(employees) : employees;
      } catch (e) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid employees format." });
      }
    }

    const credit = await leaveCreditService.addCredit({
      employees: parsedEmployees,
      leaveType,
      days,
      dateApproved,
      userId,
    });

    return res.status(201).json({
      success: true,
      message: "Leave credit added successfully.",
      data: credit,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "An error occurred while adding leave credit.",
    });
  }
};

const rollbackLeaveCreditRequest = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const { creditId } = req.params;

    const rolledBackCredit = await leaveCreditService.rollbackCredit({
      creditId,
      userId,
    });

    return res.status(200).json({
      success: true,
      message: "Leave credit rolled back successfully.",
      data: rolledBackCredit,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message:
        err.message || "An error occurred while rolling back leave credit.",
    });
  }
};

// ✅ NEW CONTROLLER: Handle direct balance updates for Organic employees
const updateLeaveBalances = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const { employeeId } = req.params;
    const { vlDays, slDays } = req.body;

    const updatedEmployee =
      await leaveCreditService.updateEmployeeLeaveBalances({
        employeeId,
        vlDays,
        slDays,
        userId,
      });

    return res.status(200).json({
      success: true,
      message: "Employee leave balances successfully initialized/updated.",
      data: {
        balances: updatedEmployee.balances,
      },
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message:
        err.message || "An error occurred while updating leave balances.",
    });
  }
};

const getAllLeaveCreditRequests = async (req, res) => {
  try {
    const { page, limit, search, status, leaveType } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (leaveType) filters.leaveType = leaveType;

    const result = await leaveCreditService.getAllCredits({
      page,
      limit,
      search,
      filters,
    });

    return res.status(200).json({
      success: true,
      data: result.items,
      totalCount: result.totalCount,
      grandTotals: result.grandTotals,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to fetch leave credits.",
    });
  }
};

const getEmployeeDetails = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const employee = await leaveCreditService.getEmployeeDetails(employeeId);

    return res.status(200).json({
      success: true,
      data: employee,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to fetch employee details.",
    });
  }
};

const getEmployeeLeaveCredits = async (req, res) => {
  try {
    const targetEmployeeId =
      req.params.employeeId || req.user?.id || req.user?._id;

    if (!targetEmployeeId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const { page, limit, search, status, leaveType } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (leaveType) filters.leaveType = leaveType;

    const result = await leaveCreditService.getEmployeeCredits(
      targetEmployeeId,
      {
        page,
        limit,
        search,
        filters,
      },
    );

    return res.status(200).json({
      success: true,
      data: result.credits,
      total: result.total,
      page: result.page,
      limit: result.limit,
      statusCounts: result.statusCounts,
      totals: result.totals,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to fetch employee leave credits.",
    });
  }
};

module.exports = {
  addLeaveCreditRequest,
  rollbackLeaveCreditRequest,
  updateLeaveBalances,
  getAllLeaveCreditRequests,
  getEmployeeDetails,
  getEmployeeLeaveCredits,
};
