// services/notification.service.js
const mongoose = require("mongoose");
const Notification = require("../models/notificationsModel");

// Freeze arrays to prevent accidental mutation or prototype pollution
const ALLOWED_PAGE_SIZES = Object.freeze([25, 50, 75, 100]);
const DEFAULT_PAGE_SIZE = 25;

// --- HELPER FUNCTIONS ---

function createServiceError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function assertObjectId(id, fieldName = "ID") {
  if (!mongoose.isValidObjectId(id)) {
    throw createServiceError(`Invalid ${fieldName} format.`, 400);
  }
}

// --- SERVICE CLASS ---

class NotificationService {
  static async createNotification(payload) {
    // Note: Ensure the calling controller sanitizes the payload
    // to prevent mass-assignment vulnerabilities.
    return Notification.create(payload);
  }

  static async createManyNotifications(notifications = []) {
    if (!Array.isArray(notifications) || notifications.length === 0) {
      return [];
    }
    return Notification.insertMany(notifications);
  }

  static normalizePagination(options = {}) {
    const page = Math.max(parseInt(options.page, 10) || 1, 1);

    let limit = parseInt(options.limit, 10);
    if (!ALLOWED_PAGE_SIZES.includes(limit)) {
      limit = DEFAULT_PAGE_SIZE;
    }

    const skip = (page - 1) * limit;

    return { page, limit, skip };
  }

  static async getUserNotifications(recipientId, options = {}) {
    assertObjectId(recipientId, "Recipient ID");

    const { page, limit, skip } = this.normalizePagination(options);
    const filter = { recipient: recipientId };

    if (typeof options.isRead !== "undefined") {
      filter.isRead = options.isRead === "true" || options.isRead === true;
    }

    if (options.type) {
      filter.type = options.type;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .populate("actor", "firstName lastName email role")
        .select("-__v") // Exclude internal version key
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({
        recipient: recipientId,
        isRead: false,
      }),
    ]);

    const totalPages = Math.max(Math.ceil(total / limit), 1);

    return {
      data: notifications,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasPrevPage: page > 1,
        hasNextPage: page < totalPages,
        allowedPageSizes: ALLOWED_PAGE_SIZES,
        defaultPageSize: DEFAULT_PAGE_SIZE,
      },
      unreadCount,
    };
  }

  static async getUnreadCount(recipientId) {
    assertObjectId(recipientId, "Recipient ID");

    return Notification.countDocuments({
      recipient: recipientId,
      isRead: false,
    });
  }

  static async markAsRead(notificationId, recipientId) {
    assertObjectId(notificationId, "Notification ID");
    assertObjectId(recipientId, "Recipient ID");

    const notification = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        recipient: recipientId,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
      { new: true, runValidators: true }, // Added runValidators
    )
      .select("-__v")
      .lean();

    if (!notification) {
      throw createServiceError("Notification not found.", 404);
    }

    return notification;
  }

  static async markAllAsRead(recipientId) {
    assertObjectId(recipientId, "Recipient ID");

    return Notification.updateMany(
      {
        recipient: recipientId,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
      { runValidators: true }, // Added runValidators
    );
  }

  static async deleteNotification(notificationId, recipientId) {
    assertObjectId(notificationId, "Notification ID");
    assertObjectId(recipientId, "Recipient ID");

    const deleted = await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: recipientId,
    })
      .select("_id")
      .lean(); // Only return ID to save memory

    if (!deleted) {
      throw createServiceError("Notification not found.", 404);
    }

    return deleted;
  }

  // =========================
  // CTO-specific helpers
  // =========================

  static async notifyApproversOnCtoSubmission({
    approverIds = [],
    employee,
    ctoApplication,
  }) {
    if (!approverIds.length) return [];

    const fullName = `${employee.firstName} ${employee.lastName}`;

    // Filter for valid ObjectIds and remove duplicates
    const uniqueApproverIds = [...new Set(approverIds.map(String))].filter(
      (id) => mongoose.isValidObjectId(id),
    );

    const notifications = uniqueApproverIds.map((approverId) => ({
      recipient: approverId,
      actor: employee._id,
      type: "CTO_APPROVAL_REQUIRED", // Fixed to match enum
      title: "New CTO Application",
      message: `${fullName} submitted a CTO application for approval.`,
      link: `/app/cto-approvals/${ctoApplication._id}`,
      priority: "HIGH",
      metadata: {
        ctoApplicationId: ctoApplication._id,
        employeeId: employee._id,
        extra: {
          requestedHours: ctoApplication.requestedHours,
          inclusiveDates: ctoApplication.inclusiveDates,
        },
      },
    }));

    return this.createManyNotifications(notifications);
  }

  static async notifyApproverOnCtoRequired({
    approverId,
    employee,
    ctoApplication,
  }) {
    const fullName = employee
      ? `${employee.firstName} ${employee.lastName}`
      : "An employee";

    return this.createNotification({
      recipient: approverId,
      actor: employee?._id || null,
      type: "CTO_APPROVAL_REQUIRED", // Fixed to match enum
      title: "CTO Application Needs Approval",
      message: `${fullName} submitted a CTO application that needs your approval.`,
      link: `/app/cto-approvals/${ctoApplication._id}`,
      priority: "HIGH",
      metadata: {
        ctoApplicationId: ctoApplication._id,
        employeeId: employee?._id,
      },
    });
  }

  static async notifyEmployeeOnCtoSubmissionCreated({
    employee,
    ctoApplication,
  }) {
    return this.createNotification({
      recipient: employee._id,
      actor: employee._id,
      type: "CTO_APPROVAL_REQUIRED", // Fixed to match enum
      title: "CTO Application Submitted",
      message: "Your CTO application was submitted successfully.",
      link: `/app/cto-apply`,
      priority: "MEDIUM",
      metadata: {
        ctoApplicationId: ctoApplication._id,
        employeeId: employee._id,
        extra: {
          requestedHours: ctoApplication.requestedHours,
          inclusiveDates: ctoApplication.inclusiveDates,
          overallStatus: ctoApplication.overallStatus,
        },
      },
    });
  }

  static async notifyEmployeeOnCtoApproval({
    employeeId,
    approver,
    ctoApplication,
    approvalStep = null,
  }) {
    const fullName = approver
      ? `${approver.firstName} ${approver.lastName}`
      : "Approver";

    return this.createNotification({
      recipient: employeeId,
      actor: approver?._id || null,
      type: "CTO_APPLICATION_APPROVED",
      title: "CTO Application Approved",
      message: `${fullName} approved your CTO application.`,
      link: `/app/cto-apply`,
      priority: "HIGH",
      metadata: {
        ctoApplicationId: ctoApplication._id,
        approvalStepId: approvalStep?._id || null,
        employeeId,
        extra: {
          overallStatus: ctoApplication.overallStatus,
        },
      },
    });
  }

  static async notifyEmployeeOnCtoRejection({
    employeeId,
    approver,
    ctoApplication,
    approvalStep = null,
    remarks = "",
  }) {
    const fullName = approver
      ? `${approver.firstName} ${approver.lastName}`
      : "Approver";

    return this.createNotification({
      recipient: employeeId,
      actor: approver?._id || null,
      type: "CTO_APPLICATION_REJECTED",
      title: "CTO Application Rejected",
      message: remarks
        ? `${fullName} rejected your CTO application. Remarks: ${remarks}`
        : `${fullName} rejected your CTO application.`,
      link: `/app/cto-apply`,
      priority: "HIGH",
      metadata: {
        ctoApplicationId: ctoApplication._id,
        approvalStepId: approvalStep?._id || null,
        employeeId,
        extra: {
          overallStatus: ctoApplication.overallStatus,
          remarks,
        },
      },
    });
  }

  static async notifyApproversOnCtoCancellation({
    approverIds = [],
    employee,
    ctoApplication,
  }) {
    if (!approverIds.length) return [];

    const fullName = `${employee.firstName} ${employee.lastName}`;

    const uniqueApproverIds = [...new Set(approverIds.map(String))].filter(
      (id) => mongoose.isValidObjectId(id),
    );

    const notifications = uniqueApproverIds.map((approverId) => ({
      recipient: approverId,
      actor: employee._id,
      type: "CTO_APPLICATION_CANCELLED",
      title: "CTO Application Cancelled",
      message: `${fullName} cancelled a CTO application.`,
      link: `/app/cto-approvals`,
      priority: "MEDIUM",
      metadata: {
        ctoApplicationId: ctoApplication._id,
        employeeId: employee._id,
      },
    }));

    return this.createManyNotifications(notifications);
  }

  static async notifyApproverOnCtoFollowUp({
    approverId,
    employee,
    ctoApplication,
  }) {
    return this.createNotification({
      recipient: approverId,
      actor: employee._id,
      type: "CTO_FOLLOW_UP",
      title: "Reminder: CTO Approval Pending",
      message: `${employee.firstName} has requested a follow-up on their pending CTO application.`,
      link: `/app/cto-approvals/${ctoApplication._id}`,
      priority: "HIGH",
      metadata: {
        ctoApplicationId: ctoApplication._id,
        employeeId: employee._id,
      },
    });
  }

  static async notifyEmployeeOnCtoCredit({
    employeeId,
    hrEmployee,
    ctoCredit,
    creditedHours,
  }) {
    const fullName = hrEmployee
      ? `${hrEmployee.firstName} ${hrEmployee.lastName}`
      : "HR";

    return this.createNotification({
      recipient: employeeId,
      actor: hrEmployee?._id || null,
      type: "CTO_CREDITED",
      title: "CTO Credited",
      message: `${fullName} credited ${creditedHours} CTO hour(s) to your balance.`,
      link: `/app/cto-my-credits`,
      priority: "MEDIUM",
      metadata: {
        ctoCreditId: ctoCredit._id,
        employeeId,
        extra: {
          creditedHours,
          memoNo: ctoCredit.memoNo,
        },
      },
    });
  }

  static async notifyEmployeeOnCtoRollback({
    employeeId,
    hrEmployee,
    ctoCredit,
    rolledBackHours = null,
  }) {
    const fullName = hrEmployee
      ? `${hrEmployee.firstName} ${hrEmployee.lastName}`
      : "HR";

    return this.createNotification({
      recipient: employeeId,
      actor: hrEmployee?._id || null,
      type: "CTO_ROLLEDBACK",
      title: "CTO Rolled Back",
      message:
        rolledBackHours !== null
          ? `${fullName} rolled back ${rolledBackHours} CTO hour(s) from your balance.`
          : `${fullName} rolled back a CTO credit from your balance.`,
      link: `/app/cto-my-credits`,
      priority: "HIGH",
      metadata: {
        ctoCreditId: ctoCredit._id,
        employeeId,
        extra: {
          rolledBackHours,
          memoNo: ctoCredit.memoNo,
        },
      },
    });
  }

  // =========================
  // CTO Revocations (NEW)
  // =========================

  static async notifyHrOnCtoRevocationRequest({
    hrIds = [],
    employee,
    ctoApplication,
  }) {
    if (!hrIds.length) return [];
    const fullName = `${employee.firstName} ${employee.lastName}`;
    const uniqueHrIds = [...new Set(hrIds.map(String))].filter((id) =>
      mongoose.isValidObjectId(id),
    );

    const notifications = uniqueHrIds.map((hrId) => ({
      recipient: hrId,
      actor: employee._id,
      type: "CTO_REVOCATION_REQUESTED",
      title: "CTO Revocation Request",
      message: `${fullName} requested to revoke an approved CTO application.`,
      link: `/app/leave-revocations/${ctoApplication._id}`,
      priority: "HIGH",
      metadata: {
        ctoApplicationId: ctoApplication._id,
        employeeId: employee._id,
      },
    }));
    return this.createManyNotifications(notifications);
  }

  static async notifyHrOnCtoRevocationCancelled({
    hrIds = [],
    employee,
    ctoApplication,
  }) {
    if (!hrIds.length) return [];
    const fullName = `${employee.firstName} ${employee.lastName}`;
    const uniqueHrIds = [...new Set(hrIds.map(String))].filter((id) =>
      mongoose.isValidObjectId(id),
    );

    const notifications = uniqueHrIds.map((hrId) => ({
      recipient: hrId,
      actor: employee._id,
      type: "CTO_REVOCATION_CANCELLED",
      title: "CTO Revocation Withdrawn",
      message: `${fullName} withdrew their CTO revocation request.`,
      link: `/app/leave-revocations`,
      priority: "MEDIUM",
      metadata: {
        ctoApplicationId: ctoApplication._id,
        employeeId: employee._id,
      },
    }));
    return this.createManyNotifications(notifications);
  }

  static async notifyEmployeeOnCtoRevocationApproved({
    employeeId,
    hrEmployee,
    ctoApplication,
    restoredHours,
  }) {
    const hrName = hrEmployee
      ? `${hrEmployee.firstName} ${hrEmployee.lastName}`
      : "HR";
    return this.createNotification({
      recipient: employeeId,
      actor: hrEmployee?._id || null,
      type: "CTO_REVOCATION_APPROVED",
      title: "CTO Revocation Approved",
      message: `${hrName} approved your CTO revocation. ${restoredHours} hour(s) have been restored.`,
      link: `/app/cto-apply`,
      priority: "HIGH",
      metadata: {
        ctoApplicationId: ctoApplication._id,
        employeeId,
      },
    });
  }

  static async notifyEmployeeOnCtoRevocationRejected({
    employeeId,
    hrEmployee,
    ctoApplication,
    remarks,
  }) {
    const hrName = hrEmployee
      ? `${hrEmployee.firstName} ${hrEmployee.lastName}`
      : "HR";
    return this.createNotification({
      recipient: employeeId,
      actor: hrEmployee?._id || null,
      type: "CTO_REVOCATION_REJECTED",
      title: "CTO Revocation Rejected",
      message: remarks
        ? `${hrName} rejected your CTO revocation request. Reason: ${remarks}`
        : `${hrName} rejected your CTO revocation request.`,
      link: `/app/cto-apply`,
      priority: "HIGH",
      metadata: {
        ctoApplicationId: ctoApplication._id,
        employeeId,
      },
    });
  }

  // =========================
  // Wellness-specific helpers
  // =========================

  static async notifyApproverOnWellnessSubmission({
    approverId,
    employee,
    wellnessApplication,
    totalDays,
  }) {
    return this.createNotification({
      recipient: approverId,
      actor: employee._id,
      type: "WELLNESS_APPROVAL_REQUIRED",
      title: "New Wellness Leave Request",
      message: `${employee.firstName} ${employee.lastName} submitted a Wellness Leave request for ${totalDays} day(s).`,
      link: `/app/wellness-approvals/${wellnessApplication._id}`,
      priority: "HIGH",
      metadata: {
        wellnessApplicationId: wellnessApplication._id,
        employeeId: employee._id,
      },
    });
  }

  static async notifyEmployeeOnWellnessApproval({
    employeeId,
    approver,
    wellnessApplication,
    allApproved = false,
  }) {
    const fullName = approver
      ? `${approver.firstName} ${approver.lastName}`
      : "Approver";

    return this.createNotification({
      recipient: employeeId,
      actor: approver?._id || null,
      type: "WELLNESS_APPLICATION_APPROVED",
      title: allApproved
        ? "Wellness Leave Fully Approved"
        : "Wellness Leave Step Approved",
      message: allApproved
        ? `Your Wellness Leave request has been fully approved.`
        : `${fullName} approved your Wellness Leave request.`,
      link: `/app/wellness-apply`,
      priority: "HIGH",
      metadata: {
        wellnessApplicationId: wellnessApplication._id,
        employeeId,
        extra: {
          overallStatus: wellnessApplication.overallStatus,
        },
      },
    });
  }

  static async notifyApproverOnWellnessRequired({
    approverId,
    employee,
    wellnessApplication,
  }) {
    const fullName = employee
      ? `${employee.firstName} ${employee.lastName}`
      : "An employee";

    return this.createNotification({
      recipient: approverId,
      actor: employee?._id || null,
      type: "WELLNESS_APPROVAL_REQUIRED",
      title: "Wellness Leave Request Needs Approval",
      message: `${fullName} submitted a Wellness Leave request that needs your approval.`,
      link: `/app/wellness-approvals/${wellnessApplication._id}`,
      priority: "HIGH",
      metadata: {
        wellnessApplicationId: wellnessApplication._id,
        employeeId: employee?._id,
      },
    });
  }

  static async notifyEmployeeOnWellnessRejection({
    employeeId,
    approver,
    wellnessApplication,
    remarks = "",
  }) {
    const fullName = approver
      ? `${approver.firstName} ${approver.lastName}`
      : "Approver";

    return this.createNotification({
      recipient: employeeId,
      actor: approver?._id || null,
      type: "WELLNESS_APPLICATION_REJECTED",
      title: "Wellness Leave Rejected",
      message: remarks
        ? `${fullName} rejected your Wellness Leave request. Remarks: ${remarks}`
        : `${fullName} rejected your Wellness Leave request.`,
      link: `/app/wellness-apply`,
      priority: "HIGH",
      metadata: {
        wellnessApplicationId: wellnessApplication._id,
        employeeId,
        extra: {
          overallStatus: wellnessApplication.overallStatus,
          remarks,
        },
      },
    });
  }

  static async notifyApproversOnWellnessCancellation({
    approverIds = [],
    employee,
    wellnessApplication,
  }) {
    if (!approverIds.length) return [];

    const fullName = `${employee.firstName} ${employee.lastName}`;

    const uniqueApproverIds = [...new Set(approverIds.map(String))].filter(
      (id) => mongoose.isValidObjectId(id),
    );

    const notifications = uniqueApproverIds.map((approverId) => ({
      recipient: approverId,
      actor: employee._id,
      type: "WELLNESS_APPLICATION_CANCELLED",
      title: "Wellness Leave Cancelled",
      message: `${fullName} cancelled a Wellness Leave application.`,
      link: `/app/wellness-approvals`,
      priority: "MEDIUM",
      metadata: {
        wellnessApplicationId: wellnessApplication._id,
        employeeId: employee._id,
      },
    }));

    return this.createManyNotifications(notifications);
  }

  static async notifyApproverOnWellnessFollowUp({
    approverId,
    employee,
    wellnessApplication,
  }) {
    return this.createNotification({
      recipient: approverId,
      actor: employee._id,
      type: "WELLNESS_FOLLOW_UP",
      title: "Reminder: Wellness Leave Pending Approval",
      message: `${employee.firstName} has requested a follow-up on their pending Wellness Leave application.`,
      link: `/app/wellness-approvals/${wellnessApplication._id}`,
      priority: "HIGH",
      metadata: {
        wellnessApplicationId: wellnessApplication._id,
        employeeId: employee._id,
      },
    });
  }

  static async notifyEmployeeOnWellnessCredit({
    employeeId,
    hrEmployee,
    wellnessCredit,
    creditedDays,
  }) {
    const fullName = hrEmployee
      ? `${hrEmployee.firstName} ${hrEmployee.lastName}`
      : "HR";

    return this.createNotification({
      recipient: employeeId,
      actor: hrEmployee?._id || null,
      type: "WELLNESS_CREDITED",
      title: "Wellness Leave Credited",
      message: `${fullName} credited ${creditedDays} Wellness Leave day(s) to your balance.`,
      link: `/app/wellness-apply`,
      priority: "MEDIUM",
      metadata: {
        wellnessCreditId: wellnessCredit._id,
        employeeId,
        extra: {
          creditedDays,
        },
      },
    });
  }

  static async notifyEmployeeOnWellnessRollback({
    employeeId,
    hrEmployee,
    wellnessCredit,
    rolledBackDays = null,
  }) {
    const fullName = hrEmployee
      ? `${hrEmployee.firstName} ${hrEmployee.lastName}`
      : "HR";

    return this.createNotification({
      recipient: employeeId,
      actor: hrEmployee?._id || null,
      type: "WELLNESS_ROLLEDBACK",
      title: "Wellness Leave Rolled Back",
      message:
        rolledBackDays !== null
          ? `${fullName} rolled back ${rolledBackDays} Wellness Leave day(s) from your balance.`
          : `${fullName} rolled back a Wellness Leave credit from your balance.`,
      link: `/app/wellness-apply`,
      priority: "HIGH",
      metadata: {
        wellnessCreditId: wellnessCredit._id,
        employeeId,
        extra: {
          rolledBackDays,
        },
      },
    });
  }

  // =========================
  // Wellness Revocations (NEW)
  // =========================

  static async notifyHrOnWellnessRevocationRequest({
    hrIds = [],
    employee,
    wellnessApplication,
  }) {
    if (!hrIds.length) return [];
    const fullName = `${employee.firstName} ${employee.lastName}`;
    const uniqueHrIds = [...new Set(hrIds.map(String))].filter((id) =>
      mongoose.isValidObjectId(id),
    );

    const notifications = uniqueHrIds.map((hrId) => ({
      recipient: hrId,
      actor: employee._id,
      type: "WELLNESS_REVOCATION_REQUESTED",
      title: "Wellness Revocation Request",
      message: `${fullName} requested to revoke an approved Wellness Leave.`,
      link: `/app/leave-revocations/${wellnessApplication._id}?type=WELLNESS`,
      priority: "HIGH",
      metadata: {
        wellnessApplicationId: wellnessApplication._id,
        employeeId: employee._id,
      },
    }));
    return this.createManyNotifications(notifications);
  }

  static async notifyHrOnWellnessRevocationCancelled({
    hrIds = [],
    employee,
    wellnessApplication,
  }) {
    if (!hrIds.length) return [];
    const fullName = `${employee.firstName} ${employee.lastName}`;
    const uniqueHrIds = [...new Set(hrIds.map(String))].filter((id) =>
      mongoose.isValidObjectId(id),
    );

    const notifications = uniqueHrIds.map((hrId) => ({
      recipient: hrId,
      actor: employee._id,
      type: "WELLNESS_REVOCATION_CANCELLED",
      title: "Wellness Revocation Withdrawn",
      message: `${fullName} withdrew their Wellness Leave revocation request.`,
      link: `/app/leave-revocations`,
      priority: "MEDIUM",
      metadata: {
        wellnessApplicationId: wellnessApplication._id,
        employeeId: employee._id,
      },
    }));
    return this.createManyNotifications(notifications);
  }

  static async notifyEmployeeOnWellnessRevocationApproved({
    employeeId,
    hrEmployee,
    wellnessApplication,
    restoredDays,
  }) {
    const hrName = hrEmployee
      ? `${hrEmployee.firstName} ${hrEmployee.lastName}`
      : "HR";
    return this.createNotification({
      recipient: employeeId,
      actor: hrEmployee?._id || null,
      type: "WELLNESS_REVOCATION_APPROVED",
      title: "Wellness Revocation Approved",
      message: `${hrName} approved your Wellness revocation. ${restoredDays} day(s) have been restored.`,
      link: `/app/wellness-apply`,
      priority: "HIGH",
      metadata: {
        wellnessApplicationId: wellnessApplication._id,
        employeeId,
      },
    });
  }

  static async notifyEmployeeOnWellnessRevocationRejected({
    employeeId,
    hrEmployee,
    wellnessApplication,
    remarks,
  }) {
    const hrName = hrEmployee
      ? `${hrEmployee.firstName} ${hrEmployee.lastName}`
      : "HR";
    return this.createNotification({
      recipient: employeeId,
      actor: hrEmployee?._id || null,
      type: "WELLNESS_REVOCATION_REJECTED",
      title: "Wellness Revocation Rejected",
      message: remarks
        ? `${hrName} rejected your Wellness revocation request. Reason: ${remarks}`
        : `${hrName} rejected your Wellness revocation request.`,
      link: `/app/wellness-apply`,
      priority: "HIGH",
      metadata: {
        wellnessApplicationId: wellnessApplication._id,
        employeeId,
      },
    });
  }
}

module.exports = NotificationService;
