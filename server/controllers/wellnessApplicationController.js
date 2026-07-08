const {
  addWellnessApplicationService,
  getAllWellnessApplicationsService,
  getWellnessApplicationsByEmployeeService,
  cancelWellnessApplicationService,
  followUpWellnessApplicationService,
  requestRevocationWellnessApplicationService, // ✅ Imported new service
  processRevocationWellnessRequestService, // ✅ Imported new service
} = require("../services/wellnessApplicationService"); // Adjust path if necessary

/* =========================
   Controllers
========================= */

const addWellnessApplicationRequest = async (req, res, next) => {
  try {
    // Assuming authenticateToken middleware attaches user info to req.user
    const userId = req.user.id || req.user._id;
    const payload = { ...req.body, userId };

    const application = await addWellnessApplicationService(payload);

    res.status(201).json({
      success: true,
      message: "Wellness Leave application submitted successfully",
      data: application,
    });
  } catch (error) {
    next(error); // Passes to your global error handler in server.js
  }
};

const getAllWellnessApplicationsRequest = async (req, res, next) => {
  try {
    // Extract query parameters for the advanced aggregation filtering
    const { status, from, to, search, employeeId, page, limit } = req.query;

    const result = await getAllWellnessApplicationsService(
      { status, from, to, search, employeeId },
      page,
      limit,
    );

    res.status(200).json({
      success: true,
      ...result, // Spreads data, pagination, and statusCounts from the service
    });
  } catch (error) {
    next(error);
  }
};

const getWellnessApplicationsByEmployeeRequest = async (req, res, next) => {
  try {
    const employeeId = req.params.employeeId || req.user.id;

    const { page = 1, limit = 20, status, search, from, to } = req.query;

    const result = await getWellnessApplicationsByEmployeeService(
      employeeId,
      page,
      limit,
      {
        status,
        search,
        from,
        to,
      },
    );

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

const cancelWellnessApplicationRequest = async (req, res, next) => {
  try {
    const applicationId = req.params.id;
    const userId = req.user.id || req.user._id; // Ensure only the owner can cancel

    const application = await cancelWellnessApplicationService({
      userId,
      applicationId,
    });

    res.status(200).json({
      success: true,
      message: "Wellness Leave application cancelled successfully",
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

const followUpWellnessApplicationRequest = async (req, res, next) => {
  try {
    const applicationId = req.params.id;
    const userId = req.user.id || req.user._id;

    const result = await followUpWellnessApplicationService({
      userId,
      applicationId,
    });

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

// ✅ NEW: Step 1 - Employee requests revocation
const requestRevocationWellnessController = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const applicationId = req.params.id;
    const { reason, attachmentUrl } = req.body;

    const application = await requestRevocationWellnessApplicationService({
      userId,
      applicationId,
      reason,
      attachmentUrl,
    });

    res.status(200).json({
      success: true,
      message:
        "Revocation request submitted successfully. Awaiting HR approval.",
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

// ✅ NEW: Step 2 - HR approves or rejects the revocation request
const processRevocationWellnessController = async (req, res, next) => {
  try {
    const adminId = req.user.id || req.user._id;
    const applicationId = req.params.id;
    const { action, remarks } = req.body; // action = "APPROVE" or "REJECT"

    const application = await processRevocationWellnessRequestService({
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
      success: true,
      message: msg,
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addWellnessApplicationRequest,
  getAllWellnessApplicationsRequest,
  getWellnessApplicationsByEmployeeRequest,
  cancelWellnessApplicationRequest,
  followUpWellnessApplicationRequest,
  requestRevocationWellnessController,
  processRevocationWellnessController,
};
