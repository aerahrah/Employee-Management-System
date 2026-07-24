// services/ctoApplication.service.js
const mongoose = require("mongoose");
const CtoApplication = require("../models/ctoApplicationModel");
const ApprovalStep = require("../models/approvalStepModel");
const Employee = require("../models/employeeModel");
const CtoCredit = require("../models/ctoCreditModel");
const RevocationSetting = require("../models/revocationSettingModel");

const { resolveApproversFromRoute } = require("./approvalRoute.service");
const sendEmail = require("../utils/sendEmail");
const NotificationService = require("./notificationService");

const EMAIL_KEYS = require("../utils/emailNotificationKeys");
const { isEmailEnabled } = require("../utils/emailNotificationSettings");
const {
  ctoApprovalEmail,
  ctoFollowUpEmail,
  ctoRevocationRequestEmail,
  ctoRevocationApprovedEmail,
  ctoRevocationRejectedEmail,
} = require("../utils/emailTemplates");
const { APPROVAL_ROLE_VALUES } = require("../constants/approvalRoles");

const { getRevocationApproverEmails } = require("../utils/getHrEmails");

/* =========================
   Helpers
========================= */
const AUTO_CANCEL_REMARK_REJECT =
  "Auto-cancelled: A previous approver rejected this request.";

const AUTO_CANCEL_REMARK_EMPLOYEE =
  "Auto-cancelled: The employee cancelled this request.";

function createServiceError(message, statusCode = 400) {
  const err = new Error(message);
  err.status = statusCode;
  err.statusCode = statusCode;
  return err;
}

function assertObjectId(id, label = "ID") {
  if (!mongoose.isValidObjectId(id)) {
    throw createServiceError(`Invalid ${label} format.`, 400);
  }
}

function sanitizeSearch(str, limit = 100) {
  return String(str || "")
    .replace(/\0/g, "")
    .trim()
    .slice(0, limit)
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sanitizeText(str, limit = 1000) {
  return String(str || "")
    .replace(/\0/g, "")
    .trim()
    .slice(0, limit);
}

function strictNumber(val, fallback = 0) {
  const parsed = Number(val);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function safeSendEmail(to, subject, html) {
  try {
    await sendEmail(to, subject, html);
  } catch (e) {
    console.error("[EMAIL] failed but continuing:", {
      to,
      subject,
      message: e?.message,
      code: e?.code,
      response: e?.response,
    });
  }
}

async function canSend(key) {
  return await isEmailEnabled(key);
}

const populateApplicationById = async (applicationId) => {
  assertObjectId(applicationId, "Application ID");

  const app = await CtoApplication.findById(applicationId)
    .populate(
      "employee",
      "prefixTitle firstName middleName lastName nameExtension postfixTitle division position email employeeId signature",
    )
    .populate({
      path: "approvals",
      populate: {
        path: "approver",
        select:
          "prefixTitle firstName middleName lastName nameExtension postfixTitle division position email",
      },
      options: { sort: { level: 1 } },
    })
    .populate("memo.memoId", "memoNo uploadedMemo duration totalHours");

  if (app?.memo && Array.isArray(app.memo)) {
    app.memo.forEach((m) => {
      if (m?.memoId?.uploadedMemo) {
        m.memoId.uploadedMemo = m.memoId.uploadedMemo.replace(/\\/g, "/");
      }
    });
  }

  return app;
};

const cancelApprovalSteps = async ({
  applicationId,
  approvalIds,
  reason,
  afterLevel = 0,
}) => {
  await ApprovalStep.updateMany(
    {
      _id: { $in: approvalIds },
      status: "PENDING",
      level: { $gt: afterLevel },
      ctoApplication: applicationId,
    },
    {
      $set: {
        status: "CANCELLED",
        remarks: reason,
        reviewedAt: new Date(),
      },
    },
  );
};

const restoreMemoHours = async ({ employeeId, memoItems }) => {
  if (!memoItems?.length) return;

  for (const m of memoItems) {
    if (!m?.memoId || !m?.appliedHours) continue;

    const appliedHours = strictNumber(m.appliedHours);
    if (appliedHours <= 0) continue;

    await CtoCredit.updateOne(
      {
        _id: m.memoId,
        employees: { $elemMatch: { employee: employeeId } },
      },
      {
        $inc: {
          "employees.$.reservedHours": -appliedHours,
          "employees.$.remainingHours": appliedHours,
        },
      },
    );
  }
};

async function notifyApproversOfCancellation({
  application,
  employee,
  approvalIds = [],
}) {
  if (!approvalIds.length) return;

  const approvalSteps = await ApprovalStep.find({
    _id: { $in: approvalIds },
  }).select("approver level status");

  const approverIds = [
    ...new Set(
      approvalSteps
        .filter((step) => step?.approver)
        .map((step) => String(step.approver)),
    ),
  ].filter((id) => mongoose.isValidObjectId(id));

  if (!approverIds.length) return;

  try {
    await NotificationService.notifyApproversOnCtoCancellation({
      approverIds,
      employee,
      ctoApplication: application,
    });
  } catch (e) {
    console.error(
      "Failed creating CTO cancellation notifications:",
      e?.message || e,
    );
  }
}

/* =========================
   Services
========================= */
const addCtoApplicationService = async ({
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
}) => {
  console.log("=========================================");
  console.log("[addCtoApplicationService] STARTING...");
  console.log("[addCtoApplicationService] Incoming Payload:", {
    userId,
    requestedHours,
    employeeType,
    commutation,
    inclusiveDatesCount: inclusiveDates?.length,
    memosCount: memos?.length,
  });

  assertObjectId(userId, "User ID");

  const strictReqHours = strictNumber(requestedHours);
  const safeReason = sanitizeText(reason, 1000);

  if (strictReqHours <= 0 || !safeReason || !inclusiveDates?.length) {
    console.error(
      "[addCtoApplicationService] Validation Error: Missing basic requirements",
    );
    throw createServiceError(
      "Requested hours (>0), reason, and inclusive dates are required.",
      400,
    );
  }

  if (!employeeType) {
    console.error(
      "[addCtoApplicationService] Validation Error: Missing employeeType",
    );
    throw createServiceError("Employee type is required.", 400);
  }

  console.log(
    `[addCtoApplicationService] Fetching employee profile for ID: ${userId}`,
  );

  const employee = await Employee.findById(userId).populate("salary").lean();
  if (!employee) {
    console.error("[addCtoApplicationService] Employee not found in DB.");
    throw createServiceError("Employee not found.", 404);
  }

  const isOrganic =
    employee.employeeType === "Organic" ||
    employee.contractType === "Organic" ||
    employeeType === "Organic";

  console.log(
    `[addCtoApplicationService] Employee fetched. Name: ${employee.firstName} ${employee.lastName}, Type: ${employee.employeeType}, isOrganic: ${isOrganic}`,
  );

  console.log(`[addCtoApplicationService] Checking for overlapping dates...`);

  const existingApplications = await CtoApplication.find({
    employee: userId,
    overallStatus: { $in: ["PENDING", "APPROVED"] },
    inclusiveDates: { $in: inclusiveDates },
  });

  if (existingApplications.length > 0) {
    console.error(
      "[addCtoApplicationService] Validation Error: Overlapping dates found.",
    );
    throw createServiceError(
      "You already have a Pending or Approved CTO application for one or more of the selected dates.",
      400,
    );
  }

  if (isOrganic) {
    console.log("[addCtoApplicationService] Running Organic strict checks...");
    if (!commutation || !["Requested", "Not Requested"].includes(commutation)) {
      console.error(
        "[addCtoApplicationService] Validation Error: Invalid Commutation for Organic",
      );
      throw createServiceError(
        "Commutation is required and must be either 'Requested' or 'Not Requested' for Organic employees.",
        400,
      );
    }

    if (!employee.signature) {
      console.error(
        "[addCtoApplicationService] Validation Error: Missing signature for Organic Form 6",
      );
      throw createServiceError(
        "A digital signature is required to process CSC Form 6. Please upload your signature in your profile before applying.",
        403,
      );
    }

    if (!employee.salary || typeof employee.salary.amount !== "number") {
      console.error(
        "[addCtoApplicationService] Validation Error: Missing Salary Amount for Organic employee",
      );
      throw createServiceError(
        "Salary Amount information is missing from your profile. This is required for CSC Form 6. Please contact HR.",
        400,
      );
    }
    console.log(
      `[addCtoApplicationService] Organic checks passed. Salary Amount: ${employee.salary.amount}`,
    );
  }

  let finalApprovers = [];
  console.log("[addCtoApplicationService] Resolving approvers...");
  if (routeId) {
    assertObjectId(routeId, "Route ID");
    finalApprovers = await resolveApproversFromRoute(routeId);
    console.log(
      `[addCtoApplicationService] Approvers resolved from Route ID ${routeId}: found ${finalApprovers.length}`,
    );
  } else if (approvers && Array.isArray(approvers)) {
    finalApprovers = approvers
      .map((a) => {
        if (a && a.approver && mongoose.isValidObjectId(a.approver)) {
          return { approver: a.approver, role: a.role };
        }
        return { approver: a, role: undefined };
      })
      .filter((a) => mongoose.isValidObjectId(a.approver));
    console.log(
      `[addCtoApplicationService] Approvers resolved from custom array: found ${finalApprovers.length}`,
    );
  }

  if (!finalApprovers || finalApprovers.length === 0) {
    console.error(
      "[addCtoApplicationService] Validation Error: No valid approvers found.",
    );
    throw createServiceError(
      "At least one valid approver is required (via route template or custom selection).",
      400,
    );
  }

  for (const fa of finalApprovers) {
    if (!fa.role || !APPROVAL_ROLE_VALUES.includes(fa.role)) {
      console.error(
        `[addCtoApplicationService] Validation Error: Invalid role for approver ${fa.approver}`,
      );
      throw createServiceError(
        `Invalid or missing approval role for approver ID ${fa.approver}. Role must be one of: ${APPROVAL_ROLE_VALUES.join(", ")}`,
        400,
      );
    }
  }

  if (!memos || !Array.isArray(memos) || !memos.length) {
    console.error(
      "[addCtoApplicationService] Validation Error: No memos attached",
    );
    throw createServiceError(
      "At least one memo with applied hours must be provided.",
      400,
    );
  }

  const sanitizedMemos = memos.map((m) => {
    const hours = strictNumber(m.appliedHours);
    if (hours <= 0) {
      throw createServiceError("Applied hours must be a positive number.", 400);
    }
    assertObjectId(m.memoId, "Memo ID");
    return { ...m, appliedHours: hours };
  });

  const memoIds = sanitizedMemos.map((m) => m.memoId);
  console.log(
    `[addCtoApplicationService] Fetching ${memoIds.length} CTO credit memos to validate...`,
  );

  const credits = await CtoCredit.find({
    _id: { $in: memoIds },
    "employees.employee": employee._id,
    status: "CREDITED",
  });

  if (credits.length !== memoIds.length) {
    console.error(
      `[addCtoApplicationService] Validation Error: Memo mismatch. Found ${credits.length}, Expected ${memoIds.length}`,
    );
    throw createServiceError("Some memos are invalid or not credited.", 400);
  }

  let totalAppliedHours = 0;
  const memoUsage = [];
  const rollbackActions = [];

  try {
    console.log(
      "[addCtoApplicationService] Beginning Memo Hours Deduction Loop...",
    );

    for (const input of sanitizedMemos) {
      const credit = credits.find(
        (c) => String(c._id) === String(input.memoId),
      );

      if (!credit)
        throw createServiceError(
          `Credit not found for memoId ${input.memoId}`,
          400,
        );

      const empCredit = credit.employees.find(
        (e) => String(e.employee) === String(employee._id),
      );
      if (!empCredit)
        throw createServiceError(
          `Employee credit record not found for memo ${credit.memoNo}`,
          400,
        );

      const availableHours = strictNumber(empCredit.remainingHours);
      console.log(
        `[addCtoApplicationService] Checking Memo ${credit.memoNo}: Attempting to apply ${input.appliedHours}h (Available: ${availableHours}h)`,
      );

      if (input.appliedHours <= 0 || input.appliedHours > availableHours) {
        throw createServiceError(
          `Invalid applied hours for memo ${credit.memoNo}. Available: ${availableHours}`,
          400,
        );
      }

      const updateResult = await CtoCredit.updateOne(
        {
          _id: credit._id,
          employees: {
            $elemMatch: {
              employee: employee._id,
              remainingHours: { $gte: input.appliedHours },
            },
          },
        },
        {
          $inc: {
            "employees.$.reservedHours": input.appliedHours,
            "employees.$.remainingHours": -input.appliedHours,
          },
          $set: {
            "employees.$.status": empCredit.status || "ACTIVE",
          },
        },
      );

      if (updateResult.modifiedCount === 0) {
        throw createServiceError(
          `Failed to reserve hours for memo ${credit.memoNo}. Concurrency mismatch.`,
          400,
        );
      }

      rollbackActions.push({
        memoId: credit._id,
        appliedHours: input.appliedHours,
      });

      memoUsage.push({
        memoId: credit._id,
        uploadedMemo: (credit.uploadedMemo || "").replace(/\\/g, "/"),
        appliedHours: input.appliedHours,
      });

      totalAppliedHours += input.appliedHours;
      console.log(
        `[addCtoApplicationService] Successfully reserved ${input.appliedHours}h from memo ${credit.memoNo}`,
      );
    }

    console.log(
      `[addCtoApplicationService] Total hours applied from memos: ${totalAppliedHours}, Requested: ${strictReqHours}`,
    );

    if (totalAppliedHours !== strictReqHours) {
      throw createServiceError(
        `Sum of applied hours (${totalAppliedHours}) does not match requested hours (${strictReqHours})`,
        400,
      );
    }

    console.log(
      "[addCtoApplicationService] Constructing Application Payload and Applicant Snapshot...",
    );

    const applicationPayload = {
      employee: employee._id,
      employeeType,
      applicantSnapshot: {
        prefixTitle: employee.prefixTitle || "",
        firstName: employee.firstName || "",
        middleName: employee.middleName || "",
        lastName: employee.lastName || "",
        nameExtension: employee.nameExtension || "",
        postfixTitle: employee.postfixTitle || "",
        division: employee.division || "",
        position: employee.position || "",
      },
      requestedHours: strictReqHours,
      reason: safeReason,
      inclusiveDates,
      memo: memoUsage,
      overallStatus: "PENDING",
      commutation: commutation || "Not Requested",
    };

    if (isOrganic) {
      applicationPayload.applicantSignatureUrl = employee.signature;
      applicationPayload.applicantSnapshot.salaryGrade = employee.salary?.grade;
      applicationPayload.applicantSnapshot.salaryAmount =
        employee.salary?.amount;

      const currentVlDays = employee.balances?.vlDays || 0;
      const currentSlDays = employee.balances?.slDays || 0;

      applicationPayload.certificationOfLeaveCredits = {
        ...(certificationOfLeaveCredits || {}),
        asOfDate: certificationOfLeaveCredits?.asOfDate || new Date(),
        vacationLeave: {
          ...(certificationOfLeaveCredits?.vacationLeave || {}),
          totalEarned: currentVlDays,
          balance: currentVlDays,
        },
        sickLeave: {
          ...(certificationOfLeaveCredits?.sickLeave || {}),
          totalEarned: currentSlDays,
          balance: currentSlDays,
        },
      };

      console.log(
        `[addCtoApplicationService] Attached Organic fields: Signature, SG ${employee.salary?.grade}, Amount: ${employee.salary?.amount}, Leave Credits (VL: ${currentVlDays}, SL: ${currentSlDays})`,
      );
    }

    if (actionDetails) applicationPayload.actionDetails = actionDetails;

    const newApplication = new CtoApplication(applicationPayload);

    const approverIds = finalApprovers.map((a) => a.approver);

    const approverEmployees = await Employee.find({
      _id: { $in: approverIds },
    })
      .select(
        "prefixTitle firstName middleName lastName nameExtension postfixTitle position signature",
      )
      .lean();

    const approverMap = new Map(
      approverEmployees.map((emp) => [String(emp._id), emp]),
    );

    const approvalSteps = finalApprovers.map((approverObj, index) => {
      const approverData = approverMap.get(String(approverObj.approver));

      return new ApprovalStep({
        level: index + 1,
        approver: approverObj.approver,
        role: approverObj.role,
        status: "PENDING",
        ctoApplication: newApplication._id,

        approverSnapshot: {
          prefixTitle: approverData?.prefixTitle || "",
          firstName: approverData?.firstName || "",
          middleName: approverData?.middleName || "",
          lastName: approverData?.lastName || "",
          nameExtension: approverData?.nameExtension || "",
          postfixTitle: approverData?.postfixTitle || "",
          position: approverData?.position || "",
        },
      });
    });

    newApplication.approvals = approvalSteps.map((step) => step._id);

    console.log(
      "[addCtoApplicationService] Saving Application and ApprovalSteps to Database...",
    );
    await newApplication.save();
    await ApprovalStep.insertMany(approvalSteps);
    console.log(
      `[addCtoApplicationService] SAVE SUCCESS. Generated Application ID: ${newApplication._id}`,
    );

    const populatedApp = await populateApplicationById(newApplication._id);
    const justApproverIds = finalApprovers.map((a) => a.approver);

    console.log(
      "[addCtoApplicationService] Dispatching In-App Notifications...",
    );
    try {
      await NotificationService.notifyApproversOnCtoSubmission({
        approverIds: justApproverIds,
        employee,
        ctoApplication: newApplication,
      });
      await NotificationService.notifyEmployeeOnCtoSubmissionCreated({
        employee,
        ctoApplication: newApplication,
      });
      console.log(
        "[addCtoApplicationService] Notifications dispatched successfully.",
      );
    } catch (err) {
      console.error(
        "[addCtoApplicationService] Failed to create CTO submission notifications:",
        err?.message,
      );
    }

    console.log(
      "[addCtoApplicationService] Dispatching Email to Level 1 Approver...",
    );
    try {
      const firstApproval = approvalSteps.find((a) => a.level === 1);
      const approverUser = await Employee.findById(firstApproval.approver)
        .select("firstName lastName email")
        .lean();

      const enabled = await canSend(EMAIL_KEYS.CTO_APPROVAL);

      if (approverUser?.email && enabled) {
        const tpl = ctoApprovalEmail({
          approverName: `${approverUser.firstName} ${approverUser.lastName}`,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          requestedHours: strictReqHours,
          reason: safeReason,
          level: 1,
          link: `${process.env.FRONTEND_URL}/app/cto-approvals/${newApplication._id}`,
        });

        await safeSendEmail(approverUser.email, tpl.subject, tpl.html);
        console.log(
          `[addCtoApplicationService] Email sent to Level 1 Approver: ${approverUser.email}`,
        );
      } else {
        console.log(
          `[addCtoApplicationService] Email skipped. Enabled: ${enabled}, Approver Email exists: ${!!approverUser?.email}`,
        );
      }
    } catch (err) {
      console.error(
        "[addCtoApplicationService] Failed to send CTO approval email:",
        err?.message,
      );
    }

    console.log(
      "=========================================\n[addCtoApplicationService] Application Processed Successfully.\n=========================================",
    );
    return populatedApp;
  } catch (error) {
    console.error(
      "\n=========================================\n[addCtoApplicationService] 🚨 FATAL ERROR ENCOUNTERED! 🚨\nError Message:",
      error.message,
      "\nRolling back memo hours...",
    );

    for (const action of rollbackActions) {
      try {
        await CtoCredit.updateOne(
          {
            _id: action.memoId,
            employees: { $elemMatch: { employee: employee._id } },
          },
          {
            $inc: {
              "employees.$.reservedHours": -action.appliedHours,
              "employees.$.remainingHours": action.appliedHours,
            },
          },
        );
        console.log(
          `[ROLLBACK SUCCESS] Restored ${action.appliedHours}h to memo ${action.memoId}`,
        );
      } catch (rollbackErr) {
        console.error(
          `[ROLLBACK FAILED] Could not restore ${action.appliedHours}h to memo ${action.memoId}. Manual intervention may be required! Error:`,
          rollbackErr.message,
        );
      }
    }
    console.log("=========================================\n");

    throw error;
  }
};

const cancelCtoApplicationService = async ({ userId, applicationId }) => {
  assertObjectId(userId, "User ID");
  assertObjectId(applicationId, "Application ID");

  const app = await CtoApplication.findById(applicationId);
  if (!app) {
    throw createServiceError("Application not found.", 404);
  }

  if (String(app.employee) !== String(userId)) {
    throw createServiceError("Not authorized to cancel this application.", 403);
  }

  if (app.overallStatus !== "PENDING") {
    throw createServiceError(
      "Only PENDING applications can be cancelled.",
      400,
    );
  }

  const employee = await Employee.findById(userId).select(
    "prefixTitle firstName middleName lastName nameExtension postfixTitle email",
  );

  app.overallStatus = "CANCELLED";
  await app.save();

  await cancelApprovalSteps({
    applicationId: app._id,
    approvalIds: app.approvals || [],
    reason: AUTO_CANCEL_REMARK_EMPLOYEE,
    afterLevel: 0,
  });

  await restoreMemoHours({
    employeeId: app.employee,
    memoItems: app.memo || [],
  });

  try {
    if (employee) {
      await notifyApproversOfCancellation({
        application: app,
        employee,
        approvalIds: app.approvals || [],
      });
    }
  } catch (err) {
    console.error(
      "Failed to create CTO cancellation notifications:",
      err?.message || err,
    );
  }

  return populateApplicationById(app._id);
};

const followUpCtoApplicationService = async ({ userId, applicationId }) => {
  assertObjectId(userId, "User ID");
  assertObjectId(applicationId, "Application ID");

  const app = await CtoApplication.findById(applicationId)
    .populate("employee", "firstName lastName")
    .populate({
      path: "approvals",
      populate: {
        path: "approver",
        select: "firstName lastName email",
      },
      options: { sort: { level: 1 } },
    });

  if (!app) {
    throw createServiceError("Application not found.", 404);
  }

  if (String(app.employee._id) !== String(userId)) {
    throw createServiceError(
      "Not authorized to follow up on this application.",
      403,
    );
  }

  if (app.overallStatus !== "PENDING") {
    throw createServiceError(
      "You can only follow up on PENDING applications.",
      400,
    );
  }

  const currentStep = app.approvals.find((step) => step.status === "PENDING");

  if (!currentStep || !currentStep.approver) {
    throw createServiceError(
      "No pending approver found to follow up with.",
      404,
    );
  }

  const approverUser = currentStep.approver;

  if (!approverUser.email) {
    throw createServiceError(
      "The current approver does not have an email address on file.",
      400,
    );
  }

  const enabled = await canSend(EMAIL_KEYS.CTO_APPROVAL);

  if (enabled) {
    const tpl = ctoFollowUpEmail({
      approverName: `${approverUser.firstName} ${approverUser.lastName}`,
      employeeName: `${app.employee.firstName} ${app.employee.lastName}`,
      requestedHours: app.requestedHours,
      level: currentStep.level,
      link: `${process.env.FRONTEND_URL}/app/cto-approvals/${app._id}`,
    });

    await safeSendEmail(approverUser.email, tpl.subject, tpl.html);

    try {
      await NotificationService.notifyApproverOnCtoFollowUp({
        approverId: approverUser._id,
        employee: app.employee,
        ctoApplication: app,
      });
    } catch (e) {
      console.error(
        "Failed creating CTO follow-up notification:",
        e?.message || e,
      );
    }
  } else {
    throw createServiceError(
      "Email notifications are currently disabled in the system settings.",
      400,
    );
  }

  return { message: "Follow-up notification sent successfully." };
};

// ✅ STEP 1: EMPLOYEE REQUESTS REVOCATION
const requestRevocationCtoApplicationService = async ({
  userId,
  applicationId,
  reason,
  attachment,
}) => {
  assertObjectId(userId, "User ID");
  assertObjectId(applicationId, "Application ID");

  const setting = await RevocationSetting.findOne();

  // Check if global revocation is enabled (accounting for schema updates)
  const isEnabled = setting
    ? setting.isEnabled !== false && setting.isRevocationEnabled !== false
    : true;
  if (!isEnabled) {
    throw createServiceError(
      "Revocation requests are currently disabled by HR settings.",
      403,
    );
  }

  // ✅ Check for attachment.url (from multer) OR attachment.fileUrl (fallback)
  const fileUrl = attachment?.url || attachment?.fileUrl;

  const isAttachmentRequired = setting ? setting.isAttachmentRequired : false;
  if (isAttachmentRequired && !fileUrl) {
    throw createServiceError(
      "An attachment (e.g., medical certificate or memo) is required to request a revocation.",
      400,
    );
  }

  const safeReason = sanitizeText(reason, 1000);
  if (!safeReason) {
    throw createServiceError(
      "A reason must be provided to request revocation.",
      400,
    );
  }

  const app = await CtoApplication.findById(applicationId);
  if (!app) {
    throw createServiceError("Application not found.", 404);
  }

  if (String(app.employee) !== String(userId)) {
    throw createServiceError("Not authorized to modify this application.", 403);
  }

  if (app.overallStatus !== "APPROVED") {
    throw createServiceError(
      "Only APPROVED applications can be requested for revocation.",
      400,
    );
  }

  app.overallStatus = "REVOCATION_REQUESTED";
  app.revocationRequest = {
    reason: safeReason,
    requestedAt: new Date(),
  };

  // ✅ Process and store using the multer keys (url, filename, mimetype)
  if (fileUrl) {
    app.revocationRequest.attachment = {
      fileName:
        sanitizeText(attachment.filename || attachment.fileName, 255) ||
        "Revocation_Attachment",
      fileUrl: sanitizeText(fileUrl, 500),
      fileType: attachment.mimetype || attachment.fileType || "application/pdf",
      uploadedAt: new Date(),
    };
  }

  await app.save();

  // ✅ Send Email Notifications to HR
  try {
    const emailEnabled = await canSend(EMAIL_KEYS.CTO_REVOCATION_REQUEST);
    if (emailEnabled) {
      const employee =
        await Employee.findById(userId).select("firstName lastName");
      const hrEmails = await getRevocationApproverEmails();

      if (hrEmails && hrEmails.length > 0) {
        const tpl = ctoRevocationRequestEmail({
          hrName: "HR Team",
          employeeName:
            `${employee?.firstName || ""} ${employee?.lastName || ""}`.trim(),
          requestedHours: app.requestedHours,
          reason: safeReason,
          link: `${process.env.FRONTEND_URL}/dashboard/hr/revocations/${app._id}`,
        });

        // ✅ PRO-TIP: Send all emails concurrently for a faster API response
        const emailPromises = hrEmails.map((hrEmail) =>
          safeSendEmail(hrEmail, tpl.subject, tpl.html),
        );

        await Promise.all(emailPromises);
      }
    }
  } catch (err) {
    console.error("Failed to send CTO revocation request email:", err?.message);
  }

  return populateApplicationById(app._id);
};

// ✅ STEP 2: HR APPROVES OR REJECTS THE REVOCATION REQUEST
const processRevocationRequestService = async ({
  adminId,
  applicationId,
  action,
  remarks,
}) => {
  assertObjectId(adminId, "Admin ID");
  assertObjectId(applicationId, "Application ID");

  const setting = await RevocationSetting.findOne();
  const isEnabled = setting
    ? setting.isEnabled !== false && setting.isRevocationEnabled !== false
    : true;
  if (!isEnabled) {
    throw createServiceError(
      "Revocation requests are currently disabled by HR settings.",
      403,
    );
  }

  const safeAction = String(action).toUpperCase();
  const safeRemarks =
    sanitizeText(remarks, 1000) ||
    (safeAction === "APPROVE"
      ? "Revocation approved by HR."
      : "Revocation rejected by HR.");

  if (!["APPROVE", "REJECT"].includes(safeAction)) {
    throw createServiceError("Action must be either APPROVE or REJECT.", 400);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  let application;

  try {
    application = await CtoApplication.findById(applicationId)
      .populate("employee", "_id firstName lastName email balances")
      .session(session);

    if (!application) {
      throw createServiceError("Application not found.", 404);
    }

    if (application.overallStatus !== "REVOCATION_REQUESTED") {
      throw createServiceError(
        "This application does not have a pending revocation request.",
        400,
      );
    }

    if (safeAction === "APPROVE") {
      const employeeId = application.employee._id;
      const requestedHours = strictNumber(application.requestedHours);

      // Refund Memo Hours Safely Using $elemMatch
      for (const memoItem of application.memo || []) {
        const memoId = memoItem.memoId?._id || memoItem.memoId;
        const appliedHours = strictNumber(memoItem.appliedHours);

        if (!memoId || appliedHours <= 0) continue;

        const creditResult = await CtoCredit.findOneAndUpdate(
          {
            _id: memoId,
            employees: {
              $elemMatch: {
                employee: employeeId,
                usedHours: { $gte: appliedHours }, // Concurrency protection
              },
            },
          },
          {
            $inc: {
              "employees.$.usedHours": -appliedHours,
              "employees.$.remainingHours": appliedHours,
            },
            $set: {
              "employees.$.status": "ACTIVE",
            },
          },
          { session, new: true },
        );

        if (!creditResult) {
          throw createServiceError(
            `Failed to restore credit hours for memo ${memoId}. Data mismatch or insufficient used hours.`,
            400,
          );
        }
      }

      // Restore Employee Balance
      const updatedEmployee = await Employee.findOneAndUpdate(
        { _id: employeeId },
        { $inc: { "balances.ctoHours": requestedHours } },
        { session, new: true },
      );

      if (!updatedEmployee) {
        throw createServiceError(
          "Employee record not found for balance restoration.",
          400,
        );
      }

      application.overallStatus = "REVOKED";
      application.revokedBy = adminId;
      application.revokeReason = safeRemarks; // Note: Updated to match schema revokeReason
      application.revokedAt = new Date();
    } else if (safeAction === "REJECT") {
      // ✅ ADDED: History tracking for rejections so employees can re-apply
      if (!application.revocationHistory) {
        application.revocationHistory = [];
      }

      application.revocationHistory.push({
        reason: application.revocationRequest.reason,
        attachment: application.revocationRequest.attachment,
        requestedAt: application.revocationRequest.requestedAt,
        status: "REJECTED",
        processedBy: adminId,
        remarks: safeRemarks,
        processedAt: new Date(),
      });

      // Revert status to APPROVED and clear active request so they can request again
      application.overallStatus = "APPROVED";
      application.revocationRequest = undefined;
      application.revokedBy = undefined;
      application.revokeReason = undefined;
      application.revokedAt = undefined;
    }

    await application.save({ session });

    await session.commitTransaction();
    session.endSession();
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }

  // ✅ Send Email Notifications to Employee
  try {
    const emp = application.employee;
    if (emp && emp.email) {
      const empName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim();
      const requestedHours = strictNumber(application.requestedHours);

      if (safeAction === "APPROVE") {
        const emailEnabled = await canSend(EMAIL_KEYS.CTO_REVOCATION_APPROVED);
        if (emailEnabled) {
          const tpl = ctoRevocationApprovedEmail({
            employeeName: empName,
            restoredHours: requestedHours,
            remarks: safeRemarks,
          });
          await safeSendEmail(emp.email, tpl.subject, tpl.html);
        }
      } else if (safeAction === "REJECT") {
        const emailEnabled = await canSend(EMAIL_KEYS.CTO_REVOCATION_REJECTED);
        if (emailEnabled) {
          const tpl = ctoRevocationRejectedEmail({
            employeeName: empName,
            remarks: safeRemarks,
          });
          await safeSendEmail(emp.email, tpl.subject, tpl.html);
        }
      }
    }
  } catch (err) {
    console.error("Failed to send CTO revocation process email:", err?.message);
  }

  return application;
};

// ✅ NEW: SEPARATE API FOR REVOCATION DASHBOARD
const getRevocationRequestsService = async (
  filters = {},
  page = 1,
  limit = 20,
) => {
  page = Math.max(parseInt(page) || 1, 1);
  limit = Math.min(parseInt(limit) || 20, 100);
  const skip = (page - 1) * limit;

  const baseQuery = {};

  // Default to showing both pending and processed revocations
  if (filters.status) {
    baseQuery.overallStatus = String(filters.status).toUpperCase();
  } else {
    baseQuery.overallStatus = { $in: ["REVOCATION_REQUESTED", "REVOKED"] };
  }

  if (filters.employeeId) {
    assertObjectId(filters.employeeId, "Employee ID");
    baseQuery.employee = filters.employeeId;
  }

  if (filters.employeeType) {
    baseQuery.employeeType = filters.employeeType;
  }

  if (filters.from && filters.to) {
    baseQuery["revocationRequest.requestedAt"] = {
      $gte: new Date(filters.from),
      $lte: new Date(filters.to),
    };
  }

  if (filters.search) {
    const safeSearch = sanitizeSearch(filters.search, 100);
    baseQuery["memo.memoId.memoNo"] = {
      $regex: safeSearch,
      $options: "i",
    };
  }

  const [applications, total] = await Promise.all([
    CtoApplication.find(baseQuery)
      .select(
        "requestedHours reason overallStatus approvals employee inclusiveDates memo createdAt employeeType commutation applicantSignatureUrl applicantSnapshot certificationOfLeaveCredits revokedBy revokeReason revokedAt revocationRequest",
      )
      .populate({
        path: "approvals",
        options: { sort: { level: 1 } },
        populate: {
          path: "approver",
          select:
            "prefixTitle firstName middleName lastName nameExtension postfixTitle division position _id",
        },
      })
      .populate(
        "employee",
        "prefixTitle firstName middleName lastName nameExtension postfixTitle division position _id signature",
      )
      .populate("memo.memoId", "memoNo uploadedMemo totalHours appliedHours")
      // Sort primarily by when the revocation was requested
      .sort({ "revocationRequest.requestedAt": -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CtoApplication.countDocuments(baseQuery),
  ]);

  const transformed = applications.map((app) => {
    const approvals = app.approvals || [];
    return {
      ...app,
      category: app.employeeType,
      approver1: approvals[0]?.approver || null,
      approver2: approvals[1]?.approver || null,
      approver3: approvals[2]?.approver || null,
    };
  });

  const statusAgg = await CtoApplication.aggregate([
    { $match: { overallStatus: { $in: ["REVOCATION_REQUESTED", "REVOKED"] } } },
    {
      $group: {
        _id: "$overallStatus",
        count: { $sum: 1 },
      },
    },
  ]);

  const statusCounts = {
    REVOCATION_REQUESTED: 0,
    REVOKED: 0,
    total: 0,
  };

  statusAgg.forEach((s) => {
    if (s._id) {
      statusCounts[s._id] = s.count;
      statusCounts.total += s.count;
    }
  });

  return {
    data: transformed,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    statusCounts,
  };
};

const getAllCtoApplicationsService = async (
  filters = {},
  page = 1,
  limit = 20,
) => {
  page = Math.max(parseInt(page) || 1, 1);
  limit = Math.min(parseInt(limit) || 20, 100);
  const skip = (page - 1) * limit;

  const baseQuery = {};

  if (filters.employeeId) {
    assertObjectId(filters.employeeId, "Employee ID");
    baseQuery.employee = filters.employeeId;
  }

  if (filters.employeeType) {
    baseQuery.employeeType = filters.employeeType;
  }

  if (filters.from && filters.to) {
    baseQuery.createdAt = {
      $gte: new Date(filters.from),
      $lte: new Date(filters.to),
    };
  }

  if (filters.search) {
    const safeSearch = sanitizeSearch(filters.search, 100);
    baseQuery["memo.memoId.memoNo"] = {
      $regex: safeSearch,
      $options: "i",
    };
  }

  const query = { ...baseQuery };
  if (filters.status) {
    query.overallStatus = String(filters.status).toUpperCase();
  }

  const [applications, total] = await Promise.all([
    CtoApplication.find(query)
      .select(
        "requestedHours reason overallStatus approvals employee inclusiveDates memo createdAt employeeType commutation applicantSignatureUrl applicantSnapshot certificationOfLeaveCredits revokedBy revokeReason revokedAt revocationRequest",
      )
      .populate({
        path: "approvals",
        options: { sort: { level: 1 } },
        populate: {
          path: "approver",
          select:
            "prefixTitle firstName middleName lastName nameExtension postfixTitle division position _id",
        },
      })
      .populate(
        "employee",
        "prefixTitle firstName middleName lastName nameExtension postfixTitle division position _id signature",
      )
      .populate("memo.memoId", "memoNo uploadedMemo totalHours appliedHours")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CtoApplication.countDocuments(query),
  ]);

  const transformed = applications.map((app) => {
    const approvals = app.approvals || [];
    return {
      ...app,
      category: app.employeeType,
      approver1: approvals[0]?.approver || null,
      approver2: approvals[1]?.approver || null,
      approver3: approvals[2]?.approver || null,
    };
  });

  const statusAgg = await CtoApplication.aggregate([
    { $match: baseQuery },
    {
      $group: {
        _id: "$overallStatus",
        count: { $sum: 1 },
      },
    },
  ]);

  const totalAll = await CtoApplication.countDocuments(baseQuery);

  const statusCounts = {
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
    CANCELLED: 0,
    REVOCATION_REQUESTED: 0,
    REVOKED: 0,
    total: totalAll,
  };

  statusAgg.forEach((s) => {
    if (s._id) statusCounts[s._id] = s.count;
  });

  return {
    data: transformed,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    statusCounts,
  };
};

const getCtoApplicationsByEmployeeService = async (
  employeeId,
  page = 1,
  limit = 20,
  filters = {},
) => {
  assertObjectId(employeeId, "Employee ID");
  const employeeObjectId = new mongoose.Types.ObjectId(employeeId);

  page = Math.max(parseInt(page) || 1, 1);
  limit = Math.min(parseInt(limit) || 20, 100);
  const skip = (page - 1) * limit;

  const pipeline = [{ $match: { employee: employeeObjectId } }];

  if (filters.employeeType) {
    pipeline.push({
      $match: { employeeType: filters.employeeType },
    });
  }

  if (filters.from && filters.to) {
    pipeline.push({
      $match: {
        createdAt: {
          $gte: new Date(filters.from),
          $lte: new Date(filters.to),
        },
      },
    });
  }

  pipeline.push({
    $lookup: {
      from: "ctocredits",
      let: { memoIds: "$memo.memoId", appEmployeeId: "$employee" },
      pipeline: [
        { $match: { $expr: { $in: ["$_id", "$$memoIds"] } } },
        {
          $project: {
            dateApproved: 1,
            createdAt: 1,
            memoNo: 1,
            status: 1,
            employees: 1,
            uploadedMemo: 1,
            duration: 1,
            totalHours: 1,
          },
        },
        {
          $addFields: {
            employee: {
              $first: {
                $filter: {
                  input: "$employees",
                  as: "emp",
                  cond: { $eq: ["$$emp.employee", "$$appEmployeeId"] },
                },
              },
            },
          },
        },
        { $project: { employees: 0 } },
      ],
      as: "memoDetails",
    },
  });

  if (filters.search) {
    const safeSearch = sanitizeSearch(filters.search, 100);
    pipeline.push({
      $match: {
        "memoDetails.memoNo": { $regex: safeSearch, $options: "i" },
      },
    });
  }

  const countPipelineStages = [...pipeline];

  if (filters.status) {
    pipeline.push({
      $match: { overallStatus: String(filters.status).toUpperCase() },
    });
  }

  pipeline.push({
    $lookup: {
      from: "approvalsteps",
      let: { approvalIds: "$approvals" },
      pipeline: [
        { $match: { $expr: { $in: ["$_id", "$$approvalIds"] } } },
        {
          $lookup: {
            from: "employees",
            localField: "approver",
            foreignField: "_id",
            as: "approver",
          },
        },
        { $unwind: { path: "$approver", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            level: 1,
            status: 1,
            reviewedAt: 1,
            remarks: 1,
            role: 1,
            approverSignature: 1,
            approverSnapshot: 1,
            approver: {
              _id: "$approver._id",
              prefixTitle: "$approver.prefixTitle",
              firstName: "$approver.firstName",
              middleName: "$approver.middleName",
              lastName: "$approver.lastName",
              nameExtension: "$approver.nameExtension",
              postfixTitle: "$approver.postfixTitle",
              division: "$approver.division",
              position: "$approver.position",
            },
          },
        },
        { $sort: { level: 1 } },
      ],
      as: "approvals",
    },
  });

  pipeline.push({
    $lookup: {
      from: "employees",
      localField: "employee",
      foreignField: "_id",
      as: "employeeDoc",
    },
  });

  pipeline.push({
    $unwind: { path: "$employeeDoc", preserveNullAndEmptyArrays: true },
  });

  pipeline.push({
    $addFields: {
      employee: {
        _id: "$employeeDoc._id",
        prefixTitle: "$employeeDoc.prefixTitle",
        firstName: "$employeeDoc.firstName",
        middleName: "$employeeDoc.middleName",
        lastName: "$employeeDoc.lastName",
        nameExtension: "$employeeDoc.nameExtension",
        postfixTitle: "$employeeDoc.postfixTitle",
        division: "$employeeDoc.division",
        position: "$employeeDoc.position",
        signature: "$employeeDoc.signature",
      },
    },
  });

  pipeline.push({ $project: { employeeDoc: 0 } });
  pipeline.push({ $sort: { createdAt: -1 } });
  pipeline.push({ $skip: skip });
  pipeline.push({ $limit: limit });

  let applications = await CtoApplication.aggregate(pipeline);

  applications = applications.map((app) => {
    app.category = app.employeeType;

    if (app.memo && Array.isArray(app.memo)) {
      const memoMap = (app.memoDetails || []).reduce((acc, md) => {
        if (md && md._id) acc[md._id.toString()] = md;
        return acc;
      }, {});

      app.memo = app.memo.map((m) => {
        const memoIdStr = m?.memoId ? m.memoId.toString() : null;
        return {
          ...m,
          memoId: memoMap[memoIdStr] || null,
        };
      });
    }

    delete app.memoDetails;
    return app;
  });

  const countPipeline = [
    ...pipeline.filter(
      (stage) =>
        !("$skip" in stage) && !("$limit" in stage) && !("$sort" in stage),
    ),
    { $count: "total" },
  ];

  const totalResult = await CtoApplication.aggregate(countPipeline);
  const total = totalResult[0]?.total || 0;

  countPipelineStages.push({
    $group: {
      _id: "$overallStatus",
      count: { $sum: 1 },
    },
  });

  const statusCountsAgg = await CtoApplication.aggregate(countPipelineStages);
  const totalAll = statusCountsAgg.reduce((acc, curr) => acc + curr.count, 0);

  const statusCounts = {
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
    CANCELLED: 0,
    REVOCATION_REQUESTED: 0,
    REVOKED: 0,
    total: totalAll,
  };

  statusCountsAgg.forEach((s) => {
    if (s._id) statusCounts[s._id] = s.count;
  });

  return {
    data: applications,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    statusCounts,
  };
};

// ✅ NEW: GET APPLICATION BY ID SERVICE
const getCtoRevocationByIdService = async (applicationId) => {
  assertObjectId(applicationId, "Application ID");
  const app = await populateApplicationById(applicationId);
  if (!app) {
    throw createServiceError("Application not found.", 404);
  }
  return app;
};

module.exports = {
  addCtoApplicationService,
  cancelCtoApplicationService,
  getAllCtoApplicationsService,
  getCtoApplicationsByEmployeeService,
  followUpCtoApplicationService,
  requestRevocationCtoApplicationService,
  processRevocationRequestService,
  getRevocationRequestsService,
  getCtoRevocationByIdService,
};
