// services/wellnessApproval.service.js
const mongoose = require("mongoose");
const ApprovalStep = require("../models/approvalStepModel");
const WellnessApplication = require("../models/wellnessApplicationModel");
const Employee = require("../models/employeeModel");
const NotificationService = require("./notificationService");

const buildAuditDetails = require("../utils/auditActionBuilder");
const auditLogService = require("./auditLog.service");

// ✅ Email Dependencies
const sendEmail = require("../utils/sendEmail");
const EMAIL_KEYS = require("../utils/emailNotificationKeys");
const { isEmailEnabled } = require("../utils/emailNotificationSettings");
const {
  wellnessApprovalEmail,
  wellnessFinalApprovalEmail,
  wellnessRejectionEmail,
} = require("../utils/emailTemplates");

/* =========================
   Helpers
========================= */
function httpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  err.statusCode = status;
  return err;
}

function assertObjectId(id, label = "id") {
  if (!id || !mongoose.Types.ObjectId.isValid(id))
    throw httpError(`Invalid ${label}`, 400);
}

function getClientIp(req) {
  const xf = req?.headers?.["x-forwarded-for"];
  if (typeof xf === "string" && xf.length) return xf.split(",")[0].trim();
  return req?.socket?.remoteAddress || null;
}

const U = (v) => String(v || "").toUpperCase();
const sameId = (a, b) => String(a) === String(b);
const sortByLevel = (steps = []) =>
  [...steps].sort((a, b) => Number(a?.level || 0) - Number(b?.level || 0));

// ✅ The status filter strictly reflects the Approver's personal action
const getEffectiveStatusForApprover = (app, myStep) => {
  const myStatus = U(myStep?.status);
  const overall = U(app?.overallStatus);

  if (myStatus === "APPROVED") return "APPROVED";
  if (myStatus === "REJECTED") return "REJECTED";
  if (myStatus === "CANCELLED" || overall === "CANCELLED") return "CANCELLED";
  if (overall === "REJECTED") return "CANCELLED";

  return myStatus;
};

const clampPage = (v) => Math.max(parseInt(v, 10) || 1, 1);
const clampLimit = (v) => Math.min(Math.max(parseInt(v, 10) || 10, 1), 100);

// ✅ Email Helpers
async function safeSendEmail(to, subject, html) {
  try {
    await sendEmail(to, subject, html);
  } catch (e) {
    console.error("[EMAIL] failed but continuing:", {
      to,
      subject,
      message: e?.message,
    });
  }
}

async function canSend(key) {
  return await isEmailEnabled(key);
}

/* =========================
   Services
========================= */
const fetchPendingWellnessCountService = async (approverId) => {
  if (!approverId) throw httpError("Approver ID is required", 400);

  const approvalSteps = await ApprovalStep.find({
    approver: approverId,
  }).populate({
    path: "wellnessApplication",
    populate: [
      { path: "approvals", populate: { path: "approver", select: "_id" } },
    ],
  });

  const pendingCount = approvalSteps.reduce((count, step) => {
    const app = step.wellnessApplication;
    if (!app || !Array.isArray(app.approvals) || app.approvals.length === 0)
      return count;

    const steps = app.approvals;
    const userStepIndex = steps.findIndex(
      (s) => s.approver?._id?.toString() === approverId.toString(),
    );
    if (userStepIndex === -1) return count;

    const userStep = steps[userStepIndex];

    if (userStep.status === "REJECTED") return count;
    if (userStep.status === "CANCELLED") return count;
    if (app.overallStatus === "REJECTED") return count;
    if (app.overallStatus === "CANCELLED") return count;

    const pendingStep = steps.find((s) => s.status === "PENDING");
    const isTheirTurn =
      pendingStep?.approver?._id?.toString() === approverId.toString();

    if (userStep.status === "PENDING" && isTheirTurn) return count + 1;
    return count;
  }, 0);

  return pendingCount;
};

const getWellnessApplicationsForApproverService = async (
  approverId,
  search = "",
  status = "",
  page = 1,
  limit = 10,
) => {
  if (!approverId) throw httpError("Approver ID is required.", 400);

  const safePage = clampPage(page);
  const safeLimit = clampLimit(limit);

  const approvalSteps = await ApprovalStep.find({ approver: approverId })
    .populate({
      path: "wellnessApplication",
      select:
        "employee approvals overallStatus inclusiveDates totalDays reason createdAt employeeType commutation applicantSignatureUrl certificationOfLeaveCredits actionDetails",
      populate: [
        {
          path: "employee",
          select:
            "prefixTitle firstName middleName lastName nameExtension postfixTitle position signature",
        },
        {
          path: "approvals",
          select: "approver status level role approverSnapshot",
          populate: {
            path: "approver",
            select:
              "prefixTitle firstName middleName lastName nameExtension postfixTitle position _id",
          },
        },
      ],
    })
    .sort({ createdAt: -1 })
    .lean();

  const appMap = new Map();
  for (const step of approvalSteps) {
    const app = step?.wellnessApplication;
    if (app?._id) appMap.set(String(app._id), app);
  }

  let apps = Array.from(appMap.values()).filter(Boolean);

  apps = apps.filter((app) => {
    const steps = Array.isArray(app?.approvals) ? app.approvals : [];
    if (!steps.length) return false;

    const ordered = sortByLevel(steps);

    const myStep = ordered.find((s) =>
      sameId(s?.approver?._id || s?.approver, approverId),
    );
    if (!myStep) return false;

    const myStatus = U(myStep.status);
    const overall = U(app.overallStatus);

    if (myStatus !== "PENDING") return true;
    if (overall !== "PENDING") return false;

    const pendingStep = ordered.find((s) => U(s.status) === "PENDING");
    if (!pendingStep) return false;

    const isTheirTurn = sameId(
      pendingStep?.approver?._id || pendingStep?.approver,
      approverId,
    );

    return isTheirTurn;
  });

  const searchText = String(search || "")
    .trim()
    .toLowerCase();
  const appsAfterSearch = !searchText
    ? apps
    : apps.filter((app) => {
        const fullName =
          `${app.employee?.firstName || ""} ${app.employee?.lastName || ""}`.toLowerCase();
        return fullName.includes(searchText);
      });

  const statusCounts = {
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
    CANCELLED: 0,
    total: 0,
  };

  appsAfterSearch.forEach((app) => {
    const ordered = sortByLevel(app.approvals || []);
    const myStep = ordered.find((s) =>
      sameId(s?.approver?._id || s?.approver, approverId),
    );
    const effective = getEffectiveStatusForApprover(app, myStep);

    statusCounts.total++;
    if (effective === "PENDING") statusCounts.PENDING++;
    if (effective === "APPROVED") statusCounts.APPROVED++;
    if (effective === "REJECTED") statusCounts.REJECTED++;
    if (effective === "CANCELLED") statusCounts.CANCELLED++;
  });

  const statusFilter = U(status);
  const appsAfterStatus = !statusFilter
    ? appsAfterSearch
    : appsAfterSearch.filter((app) => {
        const ordered = sortByLevel(app.approvals || []);
        const myStep = ordered.find((s) =>
          sameId(s?.approver?._id || s?.approver, approverId),
        );
        const effective = getEffectiveStatusForApprover(app, myStep);
        return effective === statusFilter;
      });

  const total = appsAfterStatus.length;
  const totalPages = Math.max(Math.ceil(total / safeLimit), 1);
  const startIndex = (safePage - 1) * safeLimit;

  const data = appsAfterStatus.slice(startIndex, startIndex + safeLimit);

  const formattedData = data.map((app) => {
    const appObj = app.toObject ? app.toObject() : { ...app };
    appObj.type = "WELLNESS";
    return appObj;
  });

  return {
    data: formattedData,
    total,
    totalPages,
    statusCounts,
  };
};

const getWellnessApplicationByIdService = async (wellnessApplicationId) => {
  if (!wellnessApplicationId)
    throw httpError("Application ID is required.", 400);

  const application = await WellnessApplication.findById(wellnessApplicationId)
    .populate({
      path: "employee",
      select:
        "prefixTitle firstName middleName lastName nameExtension postfixTitle position department signature employeeId email",
    })
    .populate({
      path: "approvals",
      select: "-__v",
      populate: {
        path: "approver",
        select:
          "prefixTitle firstName middleName lastName nameExtension postfixTitle position email",
      },
    })
    .lean();

  if (!application) throw httpError("Wellness Application not found", 404);

  const appObj = application.toObject ? application.toObject() : application;
  appObj.type = "WELLNESS";

  return appObj;
};

const approveWellnessApplicationService = async ({
  approverId,
  applicationId,
  req,
}) => {
  assertObjectId(approverId, "approverId");
  assertObjectId(applicationId, "applicationId");

  const approver = await Employee.findById(approverId)
    .select(
      "prefixTitle firstName middleName lastName nameExtension postfixTitle position email signature",
    )
    .lean();

  if (!approver) {
    throw httpError("Approver profile not found.", 404);
  }
  if (!approver.signature) {
    throw httpError(
      "Action requires an e-signature. Please upload a signature in your profile.",
      400,
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const application = await WellnessApplication.findById(applicationId)
      .populate("approvals")
      .populate("employee")
      .session(session);

    if (!application) throw httpError("Wellness Application not found.", 404);
    if (application.overallStatus !== "PENDING")
      throw httpError("Application already processed.", 400);

    const currentStep = application.approvals.find(
      (s) => s.approver.toString() === String(approverId),
    );
    if (!currentStep)
      throw httpError("You are not an approver for this application.", 403);

    if (currentStep.status !== "PENDING")
      throw httpError("This step has already been processed.", 400);

    const unapprovedPrevious = application.approvals.find(
      (s) => s.level < currentStep.level && s.status !== "APPROVED",
    );
    if (unapprovedPrevious)
      throw httpError(
        `Level ${unapprovedPrevious.level} must approve first.`,
        400,
      );

    await ApprovalStep.findByIdAndUpdate(
      currentStep._id,
      {
        $set: {
          status: "APPROVED",
          reviewedAt: new Date(),
          approverSnapshot: {
            prefixTitle: approver.prefixTitle || "",
            firstName: approver.firstName || "",
            middleName: approver.middleName || "",
            lastName: approver.lastName || "",
            nameExtension: approver.nameExtension || "",
            postfixTitle: approver.postfixTitle || "",
            position: approver.position || "",
            signatureUrl: approver.signature,
            signedAt: new Date(),
          },
        },
      },
      { session, runValidators: true },
    );

    const updatedSteps = await ApprovalStep.find({
      _id: { $in: application.approvals },
    }).session(session);

    const anyRejected = updatedSteps.some((s) => s.status === "REJECTED");
    if (anyRejected) {
      application.overallStatus = "REJECTED";
      await application.save({ session });
    }

    const allApproved = updatedSteps.every((s) => s.status === "APPROVED");

    if (allApproved) {
      application.overallStatus = "APPROVED";
      await application.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    const auditBody = {
      approverId,
      applicationId,
      level: currentStep.level,
      approverName: `${approver?.email || "unknown"} (id: ${approverId})`,
      approverEmail: approver?.email || "unknown",
      employeeName: `${application.employee.email} (id: ${application.employee._id})`,
    };

    const auditDetails = buildAuditDetails({
      endpoint: "Approve Wellness Application",
      actor: auditBody.approverName,
      targetUser: auditBody.employeeName,
      body: auditBody,
      params: { id: application._id },
      before: { status: currentStep.status },
    });

    await auditLogService.createAuditLog({
      userId: approverId,
      email: auditBody.approverEmail,
      method: "POST",
      endpoint: "Approve Wellness Application",
      url: `/wellness/applications/approver/${application._id}/approve`,
      statusCode: 200,
      ip: getClientIp(req),
      summary: auditDetails.summary,
      timestamp: new Date(),
    });

    try {
      await NotificationService.createNotification({
        recipient: application.employee._id,
        actor: approverId,
        type: "WELLNESS_APPLICATION_APPROVED",
        title: allApproved
          ? "Wellness Leave Fully Approved"
          : "Wellness Leave Step Approved",
        message: allApproved
          ? `Your Wellness Leave request has been fully approved.`
          : `${approver.firstName} ${approver.lastName} approved your Wellness Leave request.`,
        link: `/app/wellness-approvals/${application._id}`,
        priority: "HIGH",
      });
    } catch (e) {
      console.error(
        "Failed creating Wellness approval notification:",
        e?.message || e,
      );
    }

    if (allApproved) {
      try {
        const enabled = await canSend(EMAIL_KEYS.WELLNESS_FINAL_APPROVAL);
        if (application.employee.email && enabled) {
          const tpl = wellnessFinalApprovalEmail({
            employeeName: `${application.employee.firstName} ${application.employee.lastName}`,
            requestedDays: application.totalDays,
            inclusiveDates: (application.inclusiveDates || []).join(", "),
          });
          await safeSendEmail(
            application.employee.email,
            tpl.subject,
            tpl.html,
          );
        }
      } catch (err) {
        console.error(
          "Failed to send Wellness final approval email:",
          err?.message,
        );
      }
    } else {
      const nextStep = updatedSteps.find(
        (s) => s.level === currentStep.level + 1,
      );
      if (nextStep) {
        try {
          await NotificationService.createNotification({
            recipient: nextStep.approver,
            actor: application.employee._id,
            type: "WELLNESS_APPROVAL_REQUIRED",
            title: "Wellness Leave Request Needs Approval",
            message: `${application.employee.firstName} ${application.employee.lastName} submitted a Wellness Leave request that needs your approval.`,
            link: `/app/wellness-approvals/${application._id}`,
            priority: "HIGH",
          });
        } catch (e) {
          console.error(
            "Failed creating next step Wellness notification:",
            e?.message || e,
          );
        }

        try {
          const nextApproverUser = await Employee.findById(nextStep.approver)
            .select("firstName lastName email")
            .lean();

          const enabled = await canSend(EMAIL_KEYS.WELLNESS_APPROVAL);
          if (nextApproverUser?.email && enabled) {
            const tpl = wellnessApprovalEmail({
              approverName: `${nextApproverUser.firstName} ${nextApproverUser.lastName}`,
              employeeName: `${application.employee.firstName} ${application.employee.lastName}`,
              requestedDays: application.totalDays,
              inclusiveDates: (application.inclusiveDates || []).join(", "),
              reason: application.reason,
              level: nextStep.level,
              link: `${process.env.FRONTEND_URL}/app/wellness-approvals/${application._id}`,
            });
            await safeSendEmail(nextApproverUser.email, tpl.subject, tpl.html);
          }
        } catch (err) {
          console.error(
            "Failed to send Wellness next-step approval email:",
            err?.message,
          );
        }
      }
    }

    return getWellnessApplicationByIdService(applicationId);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};

const rejectWellnessApplicationService = async ({
  approverId,
  applicationId,
  remarks,
  req,
}) => {
  assertObjectId(approverId, "approverId");
  assertObjectId(applicationId, "applicationId");

  const approver = await Employee.findById(approverId)
    .select(
      "prefixTitle firstName middleName lastName nameExtension postfixTitle position email signature",
    )
    .lean();

  if (!approver) {
    throw httpError("Approver profile not found.", 404);
  }
  if (!approver.signature) {
    throw httpError(
      "Action requires an e-signature. Please upload a signature in your profile.",
      400,
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const application = await WellnessApplication.findById(applicationId)
      .populate("approvals")
      .populate("employee", "firstName lastName email balances")
      .session(session);

    if (!application) throw httpError("Wellness Application not found.", 404);
    if (application.overallStatus !== "PENDING")
      throw httpError("Application already processed.", 400);

    const currentStep = application.approvals.find(
      (s) => s.approver.toString() === String(approverId),
    );
    if (!currentStep)
      throw httpError(
        "You are not authorized to reject this application.",
        403,
      );

    if (currentStep.status !== "PENDING")
      throw httpError("This step has already been processed.", 400);

    const unapprovedPrevious = application.approvals.find(
      (s) => s.level < currentStep.level && s.status !== "APPROVED",
    );
    if (unapprovedPrevious)
      throw httpError(
        `Level ${unapprovedPrevious.level} must approve first.`,
        400,
      );

    const employeeId = application.employee._id;

    // Refund Wellness Days
    await Employee.updateOne(
      { _id: employeeId },
      { $inc: { "balances.wellnessDays": application.totalDays } },
      { session },
    );

    await ApprovalStep.findByIdAndUpdate(
      currentStep._id,
      {
        $set: {
          status: "REJECTED",
          remarks: remarks || "No remarks provided",
          reviewedAt: new Date(),
          approverSnapshot: {
            prefixTitle: approver.prefixTitle || "",
            firstName: approver.firstName || "",
            middleName: approver.middleName || "",
            lastName: approver.lastName || "",
            nameExtension: approver.nameExtension || "",
            postfixTitle: approver.postfixTitle || "",
            position: approver.position || "",
            signatureUrl: approver.signature,
            signedAt: new Date(),
          },
        },
      },
      { session, runValidators: true },
    );

    const futureStepIds = (application.approvals || [])
      .filter((s) => Number(s.level) > Number(currentStep.level))
      .map((s) => s._id);

    if (futureStepIds.length) {
      await ApprovalStep.updateMany(
        { _id: { $in: futureStepIds }, status: "PENDING" },
        {
          $set: {
            status: "CANCELLED",
            reviewedAt: new Date(),
            remarks:
              "Auto-cancelled due to rejection at an earlier approval level.",
          },
        },
        { session },
      );
    }

    application.overallStatus = "REJECTED";
    await application.save({ session });

    await session.commitTransaction();
    session.endSession();

    // ✅ Switched logging context completely to "email" values
    const auditBody = {
      approverId,
      applicationId,
      level: currentStep.level,
      approverName: `${approver?.email || "unknown"} (id: ${approverId})`,
      approverEmail: approver?.email || "unknown",
      employeeName: `${application.employee.email} (id: ${application.employee._id})`,
    };

    const auditDetails = buildAuditDetails({
      endpoint: "Reject Wellness Application",
      actor: auditBody.approverName,
      targetUser: auditBody.employeeName,
      body: auditBody,
      params: { id: application._id },
      before: { status: currentStep.status },
    });

    await auditLogService.createAuditLog({
      userId: approverId,
      email: auditBody.approverEmail,
      method: "POST",
      endpoint: "Reject Wellness Application",
      url: `/wellness/applications/approver/${application._id}/reject`,
      statusCode: 200,
      ip: getClientIp(req),
      summary: auditDetails.summary,
      timestamp: new Date(),
    });

    try {
      await NotificationService.createNotification({
        recipient: application.employee._id,
        actor: approverId,
        type: "WELLNESS_APPLICATION_REJECTED",
        title: "Wellness Leave Rejected",
        message: `${approver.firstName} ${approver.lastName} rejected your Wellness Leave request.`,
        link: `/app/wellness-approvals/${application._id}`,
        priority: "HIGH",
      });
    } catch (e) {
      console.error(
        "Failed creating Wellness rejection notification:",
        e?.message || e,
      );
    }

    try {
      const enabled = await canSend(EMAIL_KEYS.WELLNESS_REJECTION);
      if (application.employee.email && enabled) {
        const tpl = wellnessRejectionEmail({
          employeeName: `${application.employee.firstName} ${application.employee.lastName}`,
          remarks: remarks || "No remarks provided",
        });
        await safeSendEmail(application.employee.email, tpl.subject, tpl.html);
      }
    } catch (err) {
      console.error("Failed to send Wellness rejection email:", err?.message);
    }

    return getWellnessApplicationByIdService(applicationId);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};

module.exports = {
  fetchPendingWellnessCountService,
  getWellnessApplicationsForApproverService,
  getWellnessApplicationByIdService,
  approveWellnessApplicationService,
  rejectWellnessApplicationService,
};
