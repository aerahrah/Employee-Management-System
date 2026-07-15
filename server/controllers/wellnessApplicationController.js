const {
  addWellnessApplicationService,
  getAllWellnessApplicationsService,
  getWellnessApplicationsByEmployeeService,
  cancelWellnessApplicationService,
  followUpWellnessApplicationService,
  requestRevocationWellnessApplicationService,
  processRevocationWellnessRequestService,
  getRevocationRequestsService, // ✅ Newly Imported Service
  getWellnessRevocationByIdService, // ✅ Imported the new ID fetcher service
} = require("../services/wellnessApplicationService"); // Adjust path if necessary

// ✅ Import the Revocation Setting model to enforce RBAC visibility
const RevocationSetting = require("../models/revocationSettingModel");

/* =========================
   Controllers
========================= */

const addWellnessApplicationRequest = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const payload = { ...req.body, userId };

    const application = await addWellnessApplicationService(payload);

    res.status(201).json({
      success: true,
      message: "Wellness Leave application submitted successfully",
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

const getAllWellnessApplicationsRequest = async (req, res, next) => {
  try {
    const {
      status,
      from,
      to,
      search,
      employeeId,
      page,
      limit,
      isRevocationInbox,
    } = req.query;
    const userId = req.user.id || req.user._id;

    // ✅ VISIBILITY SHIELD: If this is querying the revocation inbox data, check the global approver
    if (
      status === "REVOCATION_REQUESTED" ||
      status === "REVOKED" ||
      isRevocationInbox === "true"
    ) {
      const setting = await RevocationSetting.findOne();

      // If no setting exists, or the current user is NOT the designated global approver
      if (
        !setting ||
        !setting.globalApprover ||
        String(setting.globalApprover) !== String(userId)
      ) {
        return res.status(200).json({
          success: true,
          message: "Fetched Wellness applications successfully",
          data: [],
          pagination: {
            page: Number(page) || 1,
            limit: Number(limit) || 20,
            total: 0,
            totalPages: 0,
          },
          statusCounts: {
            PENDING: 0,
            APPROVED: 0,
            REJECTED: 0,
            CANCELLED: 0,
            REVOCATION_REQUESTED: 0,
            REVOKED: 0,
            total: 0,
          },
        });
      }
    }

    const result = await getAllWellnessApplicationsService(
      { status, from, to, search, employeeId },
      page,
      limit,
    );

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

const getWellnessApplicationsByEmployeeRequest = async (req, res, next) => {
  try {
    const employeeId = req.params.employeeId || req.user.id || req.user._id;

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

// ✅ NEW: Controller to fetch specific wellness application by ID (Admin/HR)
const getWellnessRevocationByIdRequest = async (req, res, next) => {
  try {
    const applicationId = req.params.id; // Using .id to match your route parameter
    const application = await getWellnessRevocationByIdService(applicationId);

    res.status(200).json({
      success: true,
      message: "Fetched Wellness revocation application successfully",
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

const cancelWellnessApplicationRequest = async (req, res, next) => {
  try {
    const applicationId = req.params.id;
    const userId = req.user.id || req.user._id;

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

const processRevocationWellnessController = async (req, res, next) => {
  try {
    const adminId = req.user.id || req.user._id;
    const applicationId = req.params.id;
    const { action, remarks } = req.body;

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

// ✅ NEW: Controller for the Revocation Dashboard
const getRevocationRequestsController = async (req, res, next) => {
  try {
    const { status, from, to, search, employeeId, page, limit } = req.query;
    const userId = req.user.id || req.user._id;

    // ✅ VISIBILITY SHIELD: Enforce that only the designated global approver can access the dashboard
    const setting = await RevocationSetting.findOne();
    if (
      !setting ||
      !setting.globalApprover ||
      String(setting.globalApprover) !== String(userId)
    ) {
      return res.status(200).json({
        success: true,
        message: "Fetched Revocation requests successfully",
        data: [],
        pagination: {
          page: Number(page) || 1,
          limit: Number(limit) || 20,
          total: 0,
          totalPages: 0,
        },
        statusCounts: {
          REVOCATION_REQUESTED: 0,
          REVOKED: 0,
          total: 0,
        },
      });
    }

    const result = await getRevocationRequestsService(
      { status, from, to, search, employeeId },
      page,
      limit,
    );

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addWellnessApplicationRequest,
  getAllWellnessApplicationsRequest,
  getWellnessApplicationsByEmployeeRequest,
  getWellnessRevocationByIdRequest,
  cancelWellnessApplicationRequest,
  followUpWellnessApplicationRequest,
  requestRevocationWellnessController,
  processRevocationWellnessController,
  getRevocationRequestsController,
};
