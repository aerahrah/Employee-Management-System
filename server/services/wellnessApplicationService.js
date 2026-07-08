const mongoose = require("mongoose");
const WellnessApplication = require("../models/wellnessApplicationModel");
const ApprovalStep = require("../models/approvalStepModel");
const Employee = require("../models/employeeModel");
const { resolveApproversFromRoute } = require("./approvalRoute.service");
const NotificationService = require("./notificationService");
const { APPROVAL_ROLE_VALUES } = require("../constants/approvalRoles");

// ✅ Email Dependencies
const sendEmail = require("../utils/sendEmail");
const EMAIL_KEYS = require("../utils/emailNotificationKeys");
const { isEmailEnabled } = require("../utils/emailNotificationSettings");
const {
  wellnessApprovalEmail,
  wellnessFollowUpEmail,
} = require("../utils/emailTemplates");

/* =========================
   Helpers
========================= */

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

const populateApplicationById = async (applicationId, session = null) => {
  return WellnessApplication.findById(applicationId)
    .populate(
      "employee",
      "prefixTitle firstName middleName lastName nameExtension postfixTitle position email employeeId signature",
    )
    .populate({
      path: "approvals",
      populate: {
        path: "approver",
        select:
          "prefixTitle firstName middleName lastName nameExtension postfixTitle position email",
      },
      options: { sort: { level: 1 } },
    })
    .session(session);
};

const cancelApprovalSteps = async (
  { applicationId, approvalIds, reason, afterLevel = 0 },
  session = null,
) => {
  await ApprovalStep.updateMany(
    {
      _id: { $in: approvalIds },
      status: "PENDING",
      level: { $gt: afterLevel },
      wellnessApplication: applicationId,
    },
    {
      $set: {
        status: "CANCELLED",
        remarks: reason,
        reviewedAt: new Date(),
      },
    },
    { session },
  );
};

const notifyApproversOfCancellation = async ({
  application,
  employee,
  approvalIds = [],
}) => {
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
  ];

  if (!approverIds.length) return;

  try {
    await NotificationService.notifyApproversOnWellnessCancellation({
      approverIds,
      employee,
      wellnessApplication: application,
    });
  } catch (e) {
    console.error(
      "Failed creating Wellness cancellation notifications:",
      e?.message || e,
    );
  }
};

function sanitizeText(str, limit = 1000) {
  return String(str || "")
    .replace(/\0/g, "")
    .trim()
    .slice(0, limit);
}

/* =========================
   Services
========================= */

const addWellnessApplicationService = async ({
  userId,
  inclusiveDates,
  reason,
  routeId,
  approvers,
  employeeType,
  commutation,
  certificationOfLeaveCredits,
  actionDetails,
  req,
}) => {
  const finalReason = String(reason || "Availment of Wellness Leave").trim();

  if (
    !inclusiveDates ||
    !Array.isArray(inclusiveDates) ||
    inclusiveDates.length === 0
  ) {
    throw Object.assign(new Error("Inclusive dates array is required."), {
      status: 400,
    });
  }

  const totalDays = inclusiveDates.length;

  const employee = await Employee.findById(userId).populate("salary").lean();
  if (!employee) {
    throw Object.assign(new Error("Employee not found."), { status: 404 });
  }

  const existingApplications = await WellnessApplication.find({
    employee: userId,
    overallStatus: { $in: ["PENDING", "APPROVED"] },
    inclusiveDates: { $in: inclusiveDates },
  });

  if (existingApplications.length > 0) {
    throw Object.assign(
      new Error(
        "You already have a Pending or Approved Wellness Leave application for one or more of the selected dates.",
      ),
      { status: 400 },
    );
  }

  const finalEmployeeType = employeeType || employee.employeeType || "Organic";
  const isOrganic = finalEmployeeType === "Organic";

  if (isOrganic) {
    if (!commutation || !["Requested", "Not Requested"].includes(commutation)) {
      throw Object.assign(
        new Error(
          "Commutation is required and must be either 'Requested' or 'Not Requested' for Organic employees.",
        ),
        { status: 400 },
      );
    }

    if (!employee.signature) {
      throw Object.assign(
        new Error(
          "A digital signature is required to process CSC Form 6. Please upload your signature in your profile before applying.",
        ),
        { status: 403 },
      );
    }

    if (!employee.salary || typeof employee.salary.amount !== "number") {
      throw Object.assign(
        new Error(
          "Salary Amount information is missing from your profile. This is required for CSC Form 6. Please contact HR.",
        ),
        { status: 400 },
      );
    }
  }

  let finalApprovers = [];
  if (routeId) {
    finalApprovers = await resolveApproversFromRoute(routeId);
  } else if (approvers && Array.isArray(approvers)) {
    finalApprovers = approvers
      .map((a) => {
        if (a && a.approver && mongoose.isValidObjectId(a.approver)) {
          return { approver: a.approver, role: a.role };
        }
        return { approver: a, role: undefined };
      })
      .filter((a) => mongoose.isValidObjectId(a.approver));
  }

  if (!finalApprovers || finalApprovers.length === 0) {
    throw Object.assign(
      new Error(
        "At least one valid approver is required (via route template or custom selection).",
      ),
      { status: 400 },
    );
  }

  for (const fa of finalApprovers) {
    if (!fa.role || !APPROVAL_ROLE_VALUES.includes(fa.role)) {
      throw Object.assign(
        new Error(
          `Invalid or missing approval role for approver ID ${fa.approver}. Role must be one of: ${APPROVAL_ROLE_VALUES.join(", ")}`,
        ),
        { status: 400 },
      );
    }
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const currentWellnessBalance = employee.balances?.wellnessDays || 0;
    if (currentWellnessBalance < totalDays) {
      throw Object.assign(
        new Error(
          `Insufficient Wellness Leave balance. Available: ${currentWellnessBalance}`,
        ),
        { status: 400 },
      );
    }

    const updatedEmployee = await Employee.findOneAndUpdate(
      { _id: userId, "balances.wellnessDays": { $gte: totalDays } },
      { $inc: { "balances.wellnessDays": -totalDays } },
      { new: true, session },
    );

    if (!updatedEmployee) {
      throw Object.assign(
        new Error(
          "Failed to deduct Wellness Leave balance. Please try again. Possible concurrency conflict.",
        ),
        { status: 400 },
      );
    }

    const applicationPayload = {
      employee: employee._id,
      employeeType: finalEmployeeType,
      applicantSnapshot: {
        prefixTitle: employee.prefixTitle || "",
        firstName: employee.firstName || "",
        middleName: employee.middleName || "",
        lastName: employee.lastName || "",
        nameExtension: employee.nameExtension || "",
        postfixTitle: employee.postfixTitle || "",
        position: employee.position || "",
        division: employee.division || "",
        wellnessBalance: currentWellnessBalance,
      },
      inclusiveDates,
      totalDays,
      reason: finalReason,
      overallStatus: "PENDING",
    };

    if (isOrganic) {
      applicationPayload.commutation = commutation || "Not Requested";
      applicationPayload.applicantSignatureUrl = employee.signature;

      applicationPayload.applicantSnapshot.salaryGrade = employee.salary?.grade;
      applicationPayload.applicantSnapshot.salaryAmount =
        employee.salary?.amount;

      if (certificationOfLeaveCredits) {
        applicationPayload.certificationOfLeaveCredits =
          certificationOfLeaveCredits;
      }
      if (actionDetails) {
        applicationPayload.actionDetails = actionDetails;
      }
    }

    const newApplication = new WellnessApplication(applicationPayload);
    await newApplication.save({ session });

    const approverProfiles = await Employee.find({
      _id: { $in: finalApprovers.map((a) => a.approver) },
    })
      .select(
        "prefixTitle firstName middleName lastName nameExtension postfixTitle position email",
      )
      .session(session)
      .lean();
    const approverMap = new Map(
      approverProfiles.map((a) => [String(a._id), a]),
    );

    const approvalSteps = await Promise.all(
      finalApprovers.map((approverObj, index) => {
        const approverProfile = approverMap.get(String(approverObj.approver));

        return ApprovalStep.create(
          [
            {
              level: index + 1,
              approver: approverObj.approver,
              role: approverObj.role,
              status: "PENDING",
              wellnessApplication: newApplication._id,

              approverSnapshot: {
                prefixTitle: approverProfile?.prefixTitle || "",
                firstName: approverProfile?.firstName || "",
                middleName: approverProfile?.middleName || "",
                lastName: approverProfile?.lastName || "",
                nameExtension: approverProfile?.nameExtension || "",
                postfixTitle: approverProfile?.postfixTitle || "",
                position: approverProfile?.position || "",

                signatureUrl: null,
                signedAt: null,
              },
            },
          ],
          { session },
        ).then((res) => res[0]);
      }),
    );

    newApplication.approvals = approvalSteps.map((step) => step._id);
    await newApplication.save({ session });

    await session.commitTransaction();
    session.endSession();

    const populatedApp = await populateApplicationById(newApplication._id);

    const firstStep = approvalSteps.find((s) => s.level === 1);
    if (firstStep) {
      try {
        await NotificationService.notifyApproverOnWellnessSubmission({
          approverId: firstStep.approver,
          employee,
          wellnessApplication: populatedApp,
          totalDays,
        });
      } catch (e) {
        console.error(
          "Failed creating Wellness submission notification:",
          e?.message || e,
        );
      }

      try {
        const approverUser = await Employee.findById(firstStep.approver)
          .select("firstName lastName email")
          .lean();

        const enabled = await canSend(EMAIL_KEYS.WELLNESS_APPROVAL);

        if (approverUser?.email && enabled) {
          const tpl = wellnessApprovalEmail({
            approverName: `${approverUser.firstName} ${approverUser.lastName}`,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            requestedDays: totalDays,
            inclusiveDates: inclusiveDates.join(", "),
            reason: finalReason,
            level: 1,
            link: `${process.env.FRONTEND_URL}/app/wellness-approvals/${populatedApp._id}`,
          });

          await safeSendEmail(approverUser.email, tpl.subject, tpl.html);
        }
      } catch (err) {
        console.error("Failed to send Wellness approval email:", err?.message);
      }
    }

    return populatedApp;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};

const followUpWellnessApplicationService = async ({
  userId,
  applicationId,
}) => {
  if (
    !mongoose.isValidObjectId(userId) ||
    !mongoose.isValidObjectId(applicationId)
  ) {
    throw Object.assign(new Error("Invalid ID format."), { status: 400 });
  }

  const app = await WellnessApplication.findById(applicationId)
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
    throw Object.assign(new Error("Application not found."), { status: 404 });
  }

  if (String(app.employee._id) !== String(userId)) {
    throw Object.assign(
      new Error("Not authorized to follow up on this application."),
      { status: 403 },
    );
  }

  if (app.overallStatus !== "PENDING") {
    throw Object.assign(
      new Error("You can only follow up on PENDING applications."),
      { status: 400 },
    );
  }

  const currentStep = app.approvals.find((step) => step.status === "PENDING");

  if (!currentStep || !currentStep.approver) {
    throw Object.assign(
      new Error("No pending approver found to follow up with."),
      { status: 404 },
    );
  }

  const approverUser = currentStep.approver;

  if (!approverUser.email) {
    throw Object.assign(
      new Error("The current approver does not have an email address on file."),
      { status: 400 },
    );
  }

  const enabled = await canSend(EMAIL_KEYS.WELLNESS_APPROVAL);

  if (enabled) {
    const tpl = wellnessFollowUpEmail({
      approverName: `${approverUser.firstName} ${approverUser.lastName}`,
      employeeName: `${app.employee.firstName} ${app.employee.lastName}`,
      requestedDays: app.totalDays,
      level: currentStep.level,
      link: `${process.env.FRONTEND_URL}/app/wellness-approvals/${app._id}`,
    });

    await safeSendEmail(approverUser.email, tpl.subject, tpl.html);

    try {
      await NotificationService.notifyApproverOnWellnessFollowUp({
        approverId: approverUser._id,
        employee: app.employee,
        wellnessApplication: app,
      });
    } catch (e) {
      console.error(
        "Failed creating Wellness follow-up notification:",
        e?.message || e,
      );
    }
  } else {
    throw Object.assign(
      new Error(
        "Email notifications are currently disabled in the system settings.",
      ),
      { status: 400 },
    );
  }

  return { message: "Follow-up notification sent successfully." };
};

const getAllWellnessApplicationsService = async (
  { status, from, to, search, employeeId },
  page = 1,
  limit = 10,
) => {
  const query = {};

  if (status) query.overallStatus = status;
  if (employeeId) query.employee = employeeId;
  if (from || to) {
    query.inclusiveDates = {};
    if (from) query.inclusiveDates.$gte = new Date(from);
    if (to) query.inclusiveDates.$lte = new Date(to);
  }

  if (search) {
    const employeeIds = await Employee.find({
      $or: [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { employeeId: { $regex: search, $options: "i" } },
      ],
    })
      .select("_id")
      .lean();

    query.employee = { $in: employeeIds.map((e) => e._id) };
  }

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.max(1, parseInt(limit));
  const skip = (pageNum - 1) * limitNum;

  const applications = await WellnessApplication.find(query)
    .populate(
      "employee",
      "prefixTitle firstName middleName lastName nameExtension postfixTitle position email employeeId signature",
    )
    .populate({
      path: "approvals",
      populate: {
        path: "approver",
        select:
          "prefixTitle firstName middleName lastName nameExtension postfixTitle position email",
      },
      options: { sort: { level: 1 } },
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

  const total = await WellnessApplication.countDocuments(query);

  const baseQuery = { ...query };
  delete baseQuery.overallStatus;

  const statusCountsAgg = await WellnessApplication.aggregate([
    { $match: baseQuery },
    {
      $group: {
        _id: "$overallStatus",
        count: { $sum: 1 },
      },
    },
  ]);

  const totalAll = await WellnessApplication.countDocuments(baseQuery);

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
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
    statusCounts,
  };
};

const getWellnessApplicationsByEmployeeService = async (
  employeeId,
  page = 1,
  limit = 20,
  filters = {},
) => {
  if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
    const err = new Error("Invalid Employee ID");
    err.status = 400;
    throw err;
  }

  const employeeObjectId = new mongoose.Types.ObjectId(employeeId);
  page = Math.max(parseInt(page) || 1, 1);
  limit = Math.min(parseInt(limit) || 20, 100);
  const skip = (page - 1) * limit;

  const pipeline = [{ $match: { employee: employeeObjectId } }];

  if (filters.status) {
    pipeline.push({
      $match: { overallStatus: String(filters.status).toUpperCase() },
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

  if (filters.search) {
    pipeline.push({
      $match: {
        reason: { $regex: filters.search, $options: "i" },
      },
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
              position: "$approver.position",
              email: "$approver.email",
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
        position: "$employeeDoc.position",
        email: "$employeeDoc.email",
        signature: "$employeeDoc.signature",
      },
    },
  });

  pipeline.push({ $project: { employeeDoc: 0 } });

  pipeline.push({ $sort: { createdAt: -1 } });
  pipeline.push({ $skip: skip });
  pipeline.push({ $limit: limit });

  let applications = await WellnessApplication.aggregate(pipeline);

  const countPipeline = [
    { $match: { employee: employeeObjectId } },
    ...pipeline.filter(
      (stage) =>
        !("$skip" in stage) && !("$limit" in stage) && !("$sort" in stage),
    ),
    { $count: "total" },
  ];

  const totalResult = await WellnessApplication.aggregate(countPipeline);
  const total = totalResult[0]?.total || 0;

  const statusCountsAgg = await WellnessApplication.aggregate([
    { $match: { employee: employeeObjectId } },
    {
      $group: {
        _id: "$overallStatus",
        count: { $sum: 1 },
      },
    },
  ]);

  const totalAll = await WellnessApplication.countDocuments({
    employee: employeeObjectId,
  });

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

const cancelWellnessApplicationService = async ({
  userId,
  applicationId,
  req,
}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const application = await WellnessApplication.findOne({
      _id: applicationId,
      employee: userId,
    }).session(session);

    if (!application) {
      throw Object.assign(new Error("Application not found or unauthorized."), {
        status: 404,
      });
    }

    if (application.overallStatus !== "PENDING") {
      throw Object.assign(
        new Error(`Cannot cancel a ${application.overallStatus} application.`),
        { status: 400 },
      );
    }

    await Employee.updateOne(
      { _id: userId },
      { $inc: { "balances.wellnessDays": application.totalDays } },
      { session },
    );

    application.overallStatus = "CANCELLED";
    await application.save({ session });

    await cancelApprovalSteps(
      {
        applicationId,
        approvalIds: application.approvals,
        reason: "Auto-cancelled: The employee cancelled this request.",
        afterLevel: 0,
      },
      session,
    );

    await session.commitTransaction();
    session.endSession();

    const employee = await Employee.findById(userId);
    await notifyApproversOfCancellation({
      application,
      employee,
      approvalIds: application.approvals,
    });

    return populateApplicationById(applicationId);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};

// ✅ NEW: STEP 1 - Employee requests revocation
const requestRevocationWellnessApplicationService = async ({
  userId,
  applicationId,
  reason,
  attachmentUrl,
}) => {
  if (
    !mongoose.isValidObjectId(userId) ||
    !mongoose.isValidObjectId(applicationId)
  ) {
    throw Object.assign(new Error("Invalid ID format."), { status: 400 });
  }

  const safeReason = sanitizeText(reason, 1000);
  if (!safeReason) {
    throw Object.assign(
      new Error("A reason must be provided to request revocation."),
      { status: 400 },
    );
  }

  const app = await WellnessApplication.findById(applicationId);
  if (!app) {
    throw Object.assign(new Error("Application not found."), { status: 404 });
  }

  if (String(app.employee) !== String(userId)) {
    throw Object.assign(
      new Error("Not authorized to modify this application."),
      { status: 403 },
    );
  }

  if (app.overallStatus !== "APPROVED") {
    throw Object.assign(
      new Error("Only APPROVED applications can be requested for revocation."),
      { status: 400 },
    );
  }

  app.overallStatus = "REVOCATION_REQUESTED";
  app.revocationRequest = {
    reason: safeReason,
    attachmentUrl: sanitizeText(attachmentUrl, 500) || null,
    requestedAt: new Date(),
  };

  await app.save();

  return populateApplicationById(app._id);
};

// ✅ NEW: STEP 2 - HR processes the revocation
const processRevocationWellnessRequestService = async ({
  adminId,
  applicationId,
  action,
  remarks,
}) => {
  if (
    !mongoose.isValidObjectId(adminId) ||
    !mongoose.isValidObjectId(applicationId)
  ) {
    throw Object.assign(new Error("Invalid ID format."), { status: 400 });
  }

  const safeAction = String(action).toUpperCase();
  const safeRemarks =
    sanitizeText(remarks, 1000) ||
    (safeAction === "APPROVE"
      ? "Revocation approved by HR."
      : "Revocation rejected by HR.");

  if (!["APPROVE", "REJECT"].includes(safeAction)) {
    throw Object.assign(new Error("Action must be either APPROVE or REJECT."), {
      status: 400,
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const application = await WellnessApplication.findById(applicationId)
      .populate("employee", "_id firstName lastName email balances")
      .session(session);

    if (!application) {
      throw Object.assign(new Error("Application not found."), { status: 404 });
    }

    if (application.overallStatus !== "REVOCATION_REQUESTED") {
      throw Object.assign(
        new Error(
          "This application does not have a pending revocation request.",
        ),
        { status: 400 },
      );
    }

    if (safeAction === "APPROVE") {
      // ✅ Restore Employee Balance
      const employeeId = application.employee._id;
      const totalDays = application.totalDays;

      const updatedEmployee = await Employee.findOneAndUpdate(
        { _id: employeeId },
        { $inc: { "balances.wellnessDays": totalDays } },
        { session, new: true },
      );

      if (!updatedEmployee) {
        throw Object.assign(
          new Error("Employee record not found for balance restoration."),
          { status: 400 },
        );
      }

      application.overallStatus = "REVOKED";
      application.revokedBy = adminId;
      application.revokeReason = safeRemarks;
      application.revokedAt = new Date();
    } else if (safeAction === "REJECT") {
      // ✅ Keep as approved, log the HR remarks
      application.overallStatus = "APPROVED";
      application.revokedBy = adminId;
      application.revokeReason = safeRemarks;
      application.revokedAt = new Date();
    }

    await application.save({ session });

    await session.commitTransaction();
    session.endSession();

    return application;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};

module.exports = {
  addWellnessApplicationService,
  followUpWellnessApplicationService,
  getAllWellnessApplicationsService,
  getWellnessApplicationsByEmployeeService,
  cancelWellnessApplicationService,
  populateApplicationById,
  requestRevocationWellnessApplicationService,
  processRevocationWellnessRequestService,
};
