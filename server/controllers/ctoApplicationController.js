// controllers/ctoApplicationController.js
const {
  addCtoApplicationService,
  getAllCtoApplicationsService,
  getCtoApplicationsByEmployeeService,
  cancelCtoApplicationService,
  followUpCtoApplicationService,
  requestRevocationCtoApplicationService,
  processRevocationRequestService,
  getRevocationRequestsService,
  getCtoRevocationByIdService, // ✅ Imported the new service
} = require("../services/ctoApplication.service");

const addCtoApplicationRequest = async (req, res) => {
  try {
    const {
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
    } = req.body;

    const userId = req.user.id || req.user._id;
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
    const employeeId = req.params.employeeId || req.user.id || req.user._id;
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

// ✅ NEW: Dedicated controller to fetch a specific application by ID
const getCtoRevocationByIdRequest = async (req, res) => {
  try {
    const applicationId = req.params.applicationId;
    const application = await getCtoRevocationByIdService(applicationId);

    res.status(200).json({
      message: "Fetched CTO revocation application successfully",
      ...application._doc, // Spreading to match how frontend expects the data object if unwrap expects data fields
      application,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "Server error while fetching CTO application",
    });
  }
};

const cancelCtoApplicationRequest = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const applicationId = req.params.applicationId;

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

const followUpCtoApplicationRequest = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const applicationId = req.params.applicationId;

    const result = await followUpCtoApplicationService({
      userId,
      applicationId,
    });

    res.status(200).json({
      message: result.message,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "Server error while sending follow-up",
    });
  }
};

// ✅ NEW: Dedicated controller for the HR Revocation Dashboard
const getRevocationRequestsController = async (req, res) => {
  try {
    const { page, limit, search, status, from, to, employeeType, employeeId } =
      req.query;

    const filters = { search, status, from, to, employeeType, employeeId };

    const result = await getRevocationRequestsService(filters, page, limit);

    res.status(200).json({
      message: "Revocation requests fetched successfully",
      ...result,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "Server error while fetching revocation requests",
    });
  }
};

const requestRevocationController = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const applicationId = req.params.applicationId;
    const { reason, attachmentUrl } = req.body;

    const application = await requestRevocationCtoApplicationService({
      userId,
      applicationId,
      reason,
      attachmentUrl,
    });

    res.status(200).json({
      message:
        "Revocation request submitted successfully. Awaiting HR approval.",
      application,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "Server error while requesting revocation",
    });
  }
};

const processRevocationController = async (req, res) => {
  try {
    const adminId = req.user.id || req.user._id;
    const applicationId = req.params.applicationId;
    const { action, remarks } = req.body;

    const application = await processRevocationRequestService({
      adminId,
      applicationId,
      action,
      remarks,
    });

    const msg =
      action === "APPROVE"
        ? "Revocation approved. Credits restored."
        : "Revocation rejected. Leave remains approved.";

    res.status(200).json({
      message: msg,
      application,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error:
        error.message || "Server error while processing revocation request",
    });
  }
};

module.exports = {
  addCtoApplicationRequest,
  getAllCtoApplicationsRequest,
  getCtoApplicationsByEmployeeRequest,
  getCtoRevocationByIdRequest, // ✅ Exported the new controller
  cancelCtoApplicationRequest,
  followUpCtoApplicationRequest,
  getRevocationRequestsController,
  requestRevocationController,
  processRevocationController,
};
