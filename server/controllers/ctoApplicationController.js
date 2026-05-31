const {
  addCtoApplicationService,
  getAllCtoApplicationsService,
  getCtoApplicationsByEmployeeService,
  cancelCtoApplicationService,
} = require("../services/ctoApplication.service");

const addCtoApplicationRequest = async (req, res) => {
  try {
    const {
      requestedHours,
      reason,
      routeId,
      approvers, // Ensure frontend sends [{ approver: id, role: "string" }] if custom
      inclusiveDates,
      memos,
      // Merged schema fields
      employeeType,
      commutation,
      certificationOfLeaveCredits,
      actionDetails,
    } = req.body;

    const userId = req.user.id;

    const application = await addCtoApplicationService({
      userId,
      requestedHours,
      reason,
      routeId,
      approvers,
      inclusiveDates,
      memos,
      employeeType,
      commutation,
      certificationOfLeaveCredits,
      actionDetails,
    });

    res.status(201).json({
      message: "CTO application submitted successfully",
      application,
    });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

const getAllCtoApplicationsRequest = async (req, res) => {
  try {
    const { page, limit, status, from, to, search, employeeId, employeeType } =
      req.query;

    const result = await getAllCtoApplicationsService(
      { status, from, to, search, employeeId, employeeType },
      page,
      limit,
    );

    res.status(200).json({
      message: "Fetched CTO applications successfully",
      ...result,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "Server error while fetching CTO applications",
    });
  }
};

const getCtoApplicationsByEmployeeRequest = async (req, res) => {
  try {
    const employeeId = req.params.employeeId || req.user.id;
    const { page, limit, status, from, to, search, employeeType } = req.query;

    const result = await getCtoApplicationsByEmployeeService(
      employeeId,
      page,
      limit,
      { status, from, to, search, employeeType },
    );

    res.status(200).json({
      message: "Fetched CTO applications successfully",
      ...result,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "Server error while fetching CTO applications",
    });
  }
};

/**
 * Cancel CTO application (employee-initiated)
 * Route suggestion: PATCH /cto/applications/:id/cancel
 */
const cancelCtoApplicationRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const applicationId = req.params.id;

    const application = await cancelCtoApplicationService({
      userId,
      applicationId,
    });

    res.status(200).json({
      message: "CTO application cancelled successfully",
      application,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "Server error while cancelling CTO application",
    });
  }
};

module.exports = {
  addCtoApplicationRequest,
  getAllCtoApplicationsRequest,
  getCtoApplicationsByEmployeeRequest,
  cancelCtoApplicationRequest,
};
