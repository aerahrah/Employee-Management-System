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
const { wellnessApprovalEmail } = require("../utils/emailTemplates");

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
  return (
    WellnessApplication.findById(applicationId)
      // ✅ Include middleName, prefix/postfix, extension, and signature for the PDF Generator
      .populate(
        "employee",
        "prefixTitle firstName middleName lastName nameExtension postfixTitle position email employeeId signature",
      )
      .populate({
        path: "approvals",
        populate: {
          path: "approver",
          // ✅ Added extended name fields for the approver
          select:
            "prefixTitle firstName middleName lastName nameExtension postfixTitle position email",
        },
        options: { sort: { level: 1 } },
      })
      .session(session)
  );
};

const cancelApprovalSteps = async (
  { applicationId, approvalIds, reason, afterLevel = 0 },
  session = null,
) => {
  // ✅ Explicitly targets ONLY "PENDING" steps.
  // This protects any "APPROVED" or "REJECTED" steps so the approver keeps their credit!
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

  const fullName = `${employee.firstName} ${employee.lastName}`;

  await NotificationService.createManyNotifications(
    approverIds.map((approverId) => ({
      recipient: approverId,
      actor: employee._id,
      type: "WELLNESS_APPLICATION_CANCELLED",
      title: "Wellness Leave Cancelled",
      message: `${fullName} cancelled a Wellness Leave application.`,
      link: `/app/wellness-approvals`,
      priority: "MEDIUM",
      metadata: {
        wellnessApplicationId: application._id,
        employeeId: employee._id,
      },
    })),
  );
};

/* =========================
   Services
========================= */

const addWellnessApplicationService = async ({
  userId,
  inclusiveDates,
  reason,
  routeId,
  approvers,
  employeeType, // Dynamic: "Organic" or "Job Order"
  commutation,
  certificationOfLeaveCredits,
  actionDetails,
  req, // Passed for future Audit Logging
}) => {
  // ✅ Add default fallback for reason to prevent 400 errors if left blank on frontend
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

  // ✅ Populate salary so we can capture the salary grade & amount for the snapshot
  const employee = await Employee.findById(userId).populate("salary").lean();
  if (!employee) {
    throw Object.assign(new Error("Employee not found."), { status: 404 });
  }

  // ==========================================
  // NEW CHECK: PREVENT DUPLICATE DATES
  // ==========================================
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
  // ==========================================

  // ✅ Determine final employee type (fallback to DB value if not provided in payload)
  const finalEmployeeType = employeeType || employee.employeeType || "Organic";
  const isOrganic = finalEmployeeType === "Organic";

  // ✅ ENFORCE CSC FORM 6 RULES ONLY FOR ORGANIC EMPLOYEES
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

    // ✅ Ensure salary amount exists for the snapshot so PDF accurately prints it
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
    // ✅ Safely parse the incoming custom approvers for ID and Role
    finalApprovers = approvers
      .map((a) => {
        if (a && a.approver && mongoose.isValidObjectId(a.approver)) {
          return { approver: a.approver, role: a.role };
        }
        return { approver: a, role: undefined }; // Fallback caught by validation below
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

  // ✅ Validate Roles strictly before proceeding
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

  // ✅ Wrap in transaction to prevent balance desyncs
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Deduct from wellnessDays directly
    const currentWellnessBalance = employee.balances?.wellnessDays || 0;
    if (currentWellnessBalance < totalDays) {
      throw Object.assign(
        new Error(
          `Insufficient Wellness Leave balance. Available: ${currentWellnessBalance}`,
        ),
        { status: 400 },
      );
    }

    // Atomically deduct
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

    // ✅ Base Application Payload with Snapshot
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
        wellnessBalance: currentWellnessBalance, // ✅ Snapshots the balance BEFORE the deduction
      },
      inclusiveDates,
      totalDays,
      reason: finalReason, // ✅ Injected safe fallback reason
      overallStatus: "PENDING",
    };

    // ✅ Append CSC Form 6 specific data ONLY if Organic
    if (isOrganic) {
      applicationPayload.commutation = commutation || "Not Requested";
      applicationPayload.applicantSignatureUrl = employee.signature;

      // ✅ Save BOTH Grade and Amount in the historical snapshot
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

    // ✅ Inject the role into the ApprovalStep
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

                // intentionally blank until approval
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

    // Notify first approver (In-App)
    const firstStep = approvalSteps.find((s) => s.level === 1);
    if (firstStep) {
      await NotificationService.createNotification({
        recipient: firstStep.approver,
        actor: employee._id,
        type: "WELLNESS_APPROVAL_REQUIRED",
        title: "New Wellness Leave Request",
        message: `${employee.firstName} ${employee.lastName} submitted a Wellness Leave request for ${totalDays} day(s).`,
        link: `/app/wellness-approvals/${populatedApp._id}`,
        priority: "HIGH",
      });

      // ✅ Notify first approver (Email)
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

  // ✅ Fetch applications with deep populated approvals mapping to frontend requirements
  const applications = await WellnessApplication.find(query)
    // ✅ Ensure name extensions, middleName, and signature are returned if present
    .populate(
      "employee",
      "prefixTitle firstName middleName lastName nameExtension postfixTitle position email employeeId signature",
    )
    .populate({
      path: "approvals",
      populate: {
        path: "approver",
        // ✅ Added extended name fields for the approver
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

  // ✅ Extract base query without status to calculate overall counts for tabs
  const baseQuery = { ...query };
  delete baseQuery.overallStatus;

  // Execute Status Counts aggregation
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

  // 1. Status Filter
  if (filters.status) {
    pipeline.push({
      $match: { overallStatus: String(filters.status).toUpperCase() },
    });
  }

  // 2. Date Range Filter
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

  // 3. Search Filter
  if (filters.search) {
    pipeline.push({
      $match: {
        reason: { $regex: filters.search, $options: "i" },
      },
    });
  }

  // 4. Lookup Approvals
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
            approverSnapshot: 1, // ✅ ADDED THIS: prevents dropping snapshot data
            approver: {
              _id: "$approver._id",
              prefixTitle: "$approver.prefixTitle",
              firstName: "$approver.firstName",
              middleName: "$approver.middleName",
              lastName: "$approver.lastName",
              nameExtension: "$approver.nameExtension",
              postfixTitle: "$approver.postfixTitle",
              position: "$approver.position",
              email: "$approver.email", // ✅ Added email to match getAll
            },
          },
        },
        { $sort: { level: 1 } },
      ],
      as: "approvals",
    },
  });

  // 5. Lookup Employee Details
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
        email: "$employeeDoc.email", // ✅ Added email to match getAll
        signature: "$employeeDoc.signature",
      },
    },
  });

  pipeline.push({ $project: { employeeDoc: 0 } });

  // 6. Sort, Skip, Limit
  pipeline.push({ $sort: { createdAt: -1 } });
  pipeline.push({ $skip: skip });
  pipeline.push({ $limit: limit });

  // Execute main query
  let applications = await WellnessApplication.aggregate(pipeline);

  // Execute Total Count query
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

  // Execute Status Counts aggregation
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
  req, // Passed for future Audit Logging
}) => {
  // ✅ Wrap in transaction to prevent balance desyncs
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

    // Restore balance safely within the session
    await Employee.updateOne(
      { _id: userId },
      { $inc: { "balances.wellnessDays": application.totalDays } },
      { session },
    );

    application.overallStatus = "CANCELLED";
    await application.save({ session });

    // Ensure only PENDING steps are cancelled
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

module.exports = {
  addWellnessApplicationService,
  getAllWellnessApplicationsService,
  getWellnessApplicationsByEmployeeService,
  cancelWellnessApplicationService,
  populateApplicationById,
};
